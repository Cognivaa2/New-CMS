"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  fetchAllPOs,
  fetchSinglePO,
  createPO,
  editPO,
  submitPO,
  approvePO,
  rejectPO,
  cancelPO,
  deletePO,
  buildPOPayload,
  computePOStats,
  formatPOError,
  exportPOPdf, 
} from "./api"

import POHeader from "@/components/projects/(project)/purchase-order/POHeader"
import POTable from "@/components/projects/(project)/purchase-order/POTable"
import AddPOModal from "@/components/projects/(project)/purchase-order/AddPOModal"
import EditPOModal from "@/components/projects/(project)/purchase-order/EditPOModal"
import DeleteModal from "@/components/ui/DeleteModal"
import SummaryCard from "@/components/ui/SummaryCard"
import CancelModal from "@/components/ui/CancelModal"
import Loading from "./loading"

function debounce(fn, delay = 400) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

function getKeycloakId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("keycloakId") || ""
}

export default function PurchaseOrderPage() {
  const params = useParams()
  const projectId = params?.projectId

  const [pos, setPos] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [stats, setStats] = useState([])

  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPO, setEditingPO] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [poToCancel, setPoToCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const cursorRef = useRef(null)
  const controllerRef = useRef(null)
  const editFetchRef = useRef(null)
  const searchRef = useRef(searchQuery)
  searchRef.current = searchQuery

  const loadFresh = useCallback(async ({
    search = "",
    showRefresh = false,
  } = {}) => {
    if (!projectId || typeof projectId !== "string") {
      setIsInitialLoad(false)
      return
    }

    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl

    cursorRef.current = null
    if (showRefresh) setIsRefreshing(true)
    setError(null)

    try {
      const { pos: fetched, pagination } = await fetchAllPOs(projectId, {
        page: 1,
        limit: 10,
        search,
        sortBy: "createdAt",
        order: "desc",
        signal: ctrl.signal,
      })
      if (ctrl.signal.aborted) { setIsInitialLoad(false); return }

      setPos(fetched)
      setTotal(pagination.total ?? 0)
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
      setStats(computePOStats(fetched, pagination.total ?? 0))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        setIsInitialLoad(false)
        return
      }
      setError(err.message)
      toast.error("Failed to load purchase orders", { description: formatPOError(err) })
    } finally {
      setIsInitialLoad(false)
      setIsRefreshing(false)
    }
  }, [projectId])

  const handleExportPdf = async (po) => {
  try {
    toast.info("Generating PDF…", { description: "Please wait" })
    await exportPOPdf(projectId, po.id)
    toast.success("PDF Downloaded", {
      description: `${po.poNumber} exported successfully`,
    })
  } catch (err) {
    toast.error("Export Failed", { description: formatPOError(err) })
  }
}

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return
    if (!projectId) return

    setLoadingMore(true)
    try {
      const cursorValue = cursorRef.current
      const isPageNumber = /^\d+$/.test(cursorValue)

      const { pos: fetched, pagination } = await fetchAllPOs(projectId, {
        page: isPageNumber ? Number(cursorValue) : 1,
        limit: 10,
        search: searchRef.current,
        sortBy: "createdAt",
        order: "desc",
        lastId: isPageNumber ? undefined : cursorValue,
      })

      setPos(prev => [...prev, ...fetched])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatPOError(err) })
    } finally {
      setLoadingMore(false)
    }
  }, [projectId, loadingMore, hasMore])

  useEffect(() => {
    if (!projectId) { setIsInitialLoad(false); return }
    loadFresh({ search: "" })
    return () => controllerRef.current?.abort()
  }, [projectId])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      editFetchRef.current?.abort()
    }
  }, [])

  const debouncedSearch = useRef(
    debounce((q) => { loadFresh({ search: q, showRefresh: true }) }, 400)
  ).current

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }, [debouncedSearch])

  const handleSaveNewPO = async (form) => {
    try {
      const payload = buildPOPayload(form, getKeycloakId())
      const res = await createPO(projectId, payload)
      toast.success("PO Created", {
        description: res.description || "Purchase Order created as Draft",
      })
      setIsAddOpen(false)
      await loadFresh({ search: searchRef.current, showRefresh: true })
    } catch (err) {
      toast.error("Failed to create PO", { description: formatPOError(err) })
      throw err
    }
  }

  const handleEditClick = useCallback((po) => {
    if (!["Draft", "Rejected"].includes(po.status)) {
      toast.error("Cannot edit", { description: "Only Draft or Rejected POs can be edited" })
      return
    }
    editFetchRef.current?.abort()
    const ctrl = new AbortController()
    editFetchRef.current = ctrl

    setEditingPO({ ...po })
    setIsEditLoading(true)
    setIsEditOpen(true)

    fetchSinglePO(projectId, po.id, ctrl.signal)
      .then((full) => { if (!ctrl.signal.aborted) setEditingPO(full) })
      .catch((err) => {
        if (err.name !== "CanceledError")
          toast.error("Warning", { description: "Could not load full PO details" })
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsEditLoading(false)
        if (editFetchRef.current === ctrl) editFetchRef.current = null
      })
  }, [projectId])

  const handleCloseEdit = useCallback(() => {
    editFetchRef.current?.abort()
    editFetchRef.current = null
    setIsEditOpen(false)
    setEditingPO(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedPO = async (form) => {
    if (!editingPO?.id) return
    try {
      const payload = {
        updatedBy: getKeycloakId(),
        vendorId: form.vendorId || undefined,
        expectedDeliveryDate: form.expectedDeliveryDate
          ? form.expectedDeliveryDate instanceof Date
            ? form.expectedDeliveryDate.toISOString()
            : form.expectedDeliveryDate
          : undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        paymentTerms: form.paymentTerms || undefined,
        specialInstructions: form.specialInstructions || undefined,
        items: form.items
          .filter((i) => i.materialMasterId && i.orderedQuantity > 0)
          .map((item) => ({
            inventoryId: item.inventoryId || "",
            materialMasterId: item.materialMasterId || "",
            materialName: item.materialName || "",
            unit: item.unit || "Units",
            orderedQuantity: Number(item.orderedQuantity),
            unitPrice: Number(item.unitPrice),
            discountPercent: Number(item.discountPercent) || 0,
            gstPercent: Number(item.gstPercent) || 0,
          })),
      }
      const res = await editPO(projectId, editingPO.id, payload)
      toast.success("PO Updated", {
        description: res.description || "Purchase Order updated successfully",
      })
      handleCloseEdit()
      await loadFresh({ search: searchRef.current, showRefresh: true })
    } catch (err) {
      toast.error("Update Failed", { description: formatPOError(err) })
      throw err
    }
  }

  const handleSubmit = useCallback(async (po) => {
    setActionLoading(p => ({ ...p, [po.id]: "submitting" }))
    try {
      const res = await submitPO(projectId, po.id, getKeycloakId())
      toast.success("PO Submitted", {
        description: res.description || `${po.poNumber} submitted for approval`,
      })
      setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: "Submitted" } : p))
    } catch (err) {
      toast.error("Submit Failed", { description: formatPOError(err) })
    } finally {
      setActionLoading(p => ({ ...p, [po.id]: null }))
    }
  }, [projectId])

  const handleApprove = useCallback(async (po) => {
    setActionLoading(p => ({ ...p, [po.id]: "approving" }))
    try {
      const res = await approvePO(projectId, po.id, getKeycloakId())
      toast.success("PO Approved", {
        description: res.description || `${po.poNumber} has been approved`,
      })
      setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: "Approved" } : p))
    } catch (err) {
      toast.error("Approve Failed", { description: formatPOError(err) })
    } finally {
      setActionLoading(p => ({ ...p, [po.id]: null }))
    }
  }, [projectId])

  const handleReject = useCallback(async (po, rejectionRemarks = "") => {
    setActionLoading(p => ({ ...p, [po.id]: "rejecting" }))
    try {
      const res = await rejectPO(projectId, po.id, getKeycloakId(), rejectionRemarks)
      toast.success("PO Rejected", {
        description: res.description || `${po.poNumber} has been rejected`,
      })
      setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: "Rejected" } : p))
    } catch (err) {
      toast.error("Reject Failed", { description: formatPOError(err) })
    } finally {
      setActionLoading(p => ({ ...p, [po.id]: null }))
    }
  }, [projectId])

  const handleCancel = useCallback((po) => {
    setPoToCancel(po)
    setIsCancelOpen(true)
  }, [])

  const handleConfirmCancel = async (po, cancellationRemarks = "") => {
    if (!po) return
    setIsCancelling(true)
    try {
      const res = await cancelPO(projectId, po.id, getKeycloakId(), cancellationRemarks)
      toast.success("PO Cancelled", {
        description: res.description || `${po.poNumber} has been cancelled`,
      })
      setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: "Cancelled" } : p))
      setIsCancelOpen(false)
      setPoToCancel(null)
    } catch (err) {
      toast.error("Cancel Failed", { description: formatPOError(err) })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleCloseCancelModal = useCallback(() => {
    if (isCancelling) return
    setIsCancelOpen(false)
    setTimeout(() => setPoToCancel(null), 250)
  }, [isCancelling])

  const handleDeleteClick = useCallback((po) => {
    if (!["Draft", "Rejected"].includes(po.status)) {
      toast.error("Cannot delete", { description: "Only Draft or Rejected POs can be deleted" })
      return
    }
    setPoToDelete(po)
    setIsDeleteOpen(true)
  }, [])

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setTimeout(() => setPoToDelete(null), 250)
  }, [isDeleting])

  const handleConfirmDelete = async () => {
    if (!poToDelete) return
    try {
      setIsDeleting(true)
      await deletePO(projectId, poToDelete.id, getKeycloakId())
      toast.success("PO Deleted", {
        description: `${poToDelete.poNumber} deleted successfully`,
      })
      setIsDeleteOpen(false)
      setPoToDelete(null)
      await loadFresh({ search: searchRef.current, showRefresh: true })
    } catch (err) {
      toast.error("Delete Failed", { description: formatPOError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isInitialLoad) return <Loading />

  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
      <POHeader
        title="Purchase Orders"
        description={<>Manage and track purchase orders<br />for your project</>}
        badgeCount={total}
        onSearch={handleSearch}
        onAction={() => setIsAddOpen(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {stats.map((stat) => <SummaryCard key={stat.id} item={stat} />)}
      </div>

      {error && !isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">{error}</p>
          <button
            onClick={() => loadFresh({ search: searchQuery, showRefresh: true })}
            className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      ) : (
        <POTable
          data={pos}
          isLoading={isRefreshing}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onSubmit={handleSubmit}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
          actionLoading={actionLoading}
          projectId={projectId}
          onExportPdf={handleExportPdf} 
          total={total}
        />
      )}

      <AddPOModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewPO}
        projectId={projectId}
      />
      <EditPOModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEditedPO}
        po={editingPO}
        isEditLoading={isEditLoading}
        projectId={projectId}
      />
      <CancelModal
        isOpen={isCancelOpen}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        wo={poToCancel ? { ...poToCancel, woNumber: poToCancel.poNumber } : null}
        isLoading={isCancelling}
      />
      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete PO"
        description="This action cannot be undone. This will permanently remove the purchase order."
        itemName={poToDelete?.poNumber}
        isLoading={isDeleting}
      />
    </div>
  )
}