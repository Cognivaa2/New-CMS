// page.jsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  fetchAllGRNs,
  fetchSingleGRN,
  createGRN,
  editGRN,
  deleteGRN,
  buildGRNPayload,
  computeGRNStats,
  formatGRNError,
  exportGRNPdf,
} from "./api"

import GRNHeader from "@/components/projects/(project)/grn/GRNHeader"
import GRNTable from "@/components/projects/(project)/grn/GRNTable"
import AddGRNModal from "@/components/projects/(project)/grn/AddGRNModal"
import EditGRNModal from "@/components/projects/(project)/grn/EditGRNModal"
import DeleteModal from "@/components/ui/DeleteModal"
import SummaryCard from "@/components/ui/SummaryCard"
import Loading from "./loading"

function debounce(fn, delay = 400) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

function getKeycloakId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("keycloakId") || ""
}

export default function GRNPage() {
  const params = useParams()
  const projectId = params?.projectId

  const [grns, setGrns] = useState([])
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
  const [editingGRN, setEditingGRN] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [grnToDelete, setGrnToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
      const { grns: fetched, pagination } = await fetchAllGRNs(projectId, {
        page: 1,
        limit: 10,
        search,
        sortBy: "createdAt",
        order: "desc",
        signal: ctrl.signal,
      })
      if (ctrl.signal.aborted) { setIsInitialLoad(false); return }

      setGrns(fetched)
      setTotal(pagination.total ?? 0)
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
      setStats(computeGRNStats(fetched, pagination.total ?? 0))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        setIsInitialLoad(false)
        return
      }
      setError(err.message)
      toast.error("Failed to load GRNs", { description: formatGRNError(err) })
    } finally {
      setIsInitialLoad(false)
      setIsRefreshing(false)
    }
  }, [projectId])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return
    if (!projectId) return

    setLoadingMore(true)
    try {
      const cursorValue = cursorRef.current
      const isPageNumber = /^\d+$/.test(cursorValue)

      const { grns: fetched, pagination } = await fetchAllGRNs(projectId, {
        page: isPageNumber ? Number(cursorValue) : 1,
        limit: 10,
        search: searchRef.current,
        sortBy: "createdAt",
        order: "desc",
        lastId: isPageNumber ? undefined : cursorValue,
      })

      setGrns(prev => [...prev, ...fetched])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatGRNError(err) })
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

  const handleSaveNewGRN = async (form) => {
    try {
      const payload = buildGRNPayload(form, getKeycloakId())
      const res = await createGRN(projectId, form.poId, payload)
      toast.success("GRN Created", {
        description: res.description || "Goods Receipt Note created successfully",
      })
      setIsAddOpen(false)
      await loadFresh({ search: searchRef.current, showRefresh: true })
    } catch (err) {
      toast.error("Failed to create GRN", { description: formatGRNError(err) })
      throw err
    }
  }

  const handleEditClick = useCallback((grn) => {
    editFetchRef.current?.abort()
    const ctrl = new AbortController()
    editFetchRef.current = ctrl

    setEditingGRN({ ...grn })
    setIsEditLoading(true)
    setIsEditOpen(true)

    fetchSingleGRN(projectId, grn.id, ctrl.signal)
      .then((full) => { if (!ctrl.signal.aborted) setEditingGRN(full) })
      .catch((err) => {
        if (err.name !== "CanceledError")
          toast.error("Warning", { description: "Could not load full GRN details" })
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
    setEditingGRN(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedGRN = async (form) => {
    if (!editingGRN?.id) return
    try {
      const formData = new FormData()
      formData.append("updatedBy", getKeycloakId())

      if (form.deliveryDate)
        formData.append("deliveryDate",
          form.deliveryDate instanceof Date
            ? form.deliveryDate.toISOString()
            : form.deliveryDate
        )
      if (form.vehicleNumber !== undefined)
        formData.append("vehicleNumber", form.vehicleNumber?.trim() || "")
      if (form.deliveryChallanNumber !== undefined)
        formData.append("deliveryChallanNumber", form.deliveryChallanNumber?.trim() || "")
      if (form.deliveryChallanDate)
        formData.append("deliveryChallanDate",
          form.deliveryChallanDate instanceof Date
            ? form.deliveryChallanDate.toISOString()
            : form.deliveryChallanDate
        )
      if (form.remarks !== undefined)
        formData.append("remarks", form.remarks?.trim() || "")

      const items = (form.items || [])
        .filter((i) => i.inventoryId && i.receivedQuantity > 0)
        .map((item) => ({
          inventoryId: item.inventoryId || "",
          materialMasterId: item.materialMasterId || "",
          materialName: item.materialName || "",
          unit: item.unit || "Units",
          orderedQuantity: Number(item.orderedQuantity) || 0,
          receivedQuantity: Number(item.receivedQuantity) || 0,
          remarks: item.remarks || "",
        }))
      formData.append("items", JSON.stringify(items))

      if (form.attachment instanceof File)
        formData.append("attachment", form.attachment)

      const res = await editGRN(projectId, editingGRN.id, formData)
      toast.success("GRN Updated", {
        description: res.description || "Goods Receipt Note updated successfully",
      })
      handleCloseEdit()
      await loadFresh({ search: searchRef.current, showRefresh: true })
    } catch (err) {
      toast.error("Update Failed", { description: formatGRNError(err) })
      throw err
    }
  }

  const handleDeleteClick = useCallback((grn) => {
    setGrnToDelete(grn)
    setIsDeleteOpen(true)
  }, [])

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setTimeout(() => setGrnToDelete(null), 250)
  }, [isDeleting])

  const handleConfirmDelete = async () => {
    if (!grnToDelete) return
    try {
      setIsDeleting(true)
      await deleteGRN(projectId, grnToDelete.id, getKeycloakId())
      toast.success("GRN Deleted", {
        description: `${grnToDelete.grnNumber} deleted successfully`,
      })
      setIsDeleteOpen(false)
      setGrnToDelete(null)
      await loadFresh({ search: searchRef.current, showRefresh: true })
    } catch (err) {
      toast.error("Delete Failed", { description: formatGRNError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportPdf = async (grn) => {
    try {
      toast.info("Generating PDF…", { description: "Please wait" })
      await exportGRNPdf(projectId, grn.id)
      toast.success("PDF Downloaded", {
        description: `${grn.grnNumber} exported successfully`,
      })
    } catch (err) {
      toast.error("Export Failed", { description: formatGRNError(err) })
    }
  }

  if (isInitialLoad) return <Loading />

  return (
    <div className="w-full mx-auto p-4 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
      <GRNHeader
        title="Goods Receipt Notes"
        description={
          <>
            Record and track all material deliveries
            <br />
            against approved purchase orders
          </>
        }
        badgeCount={total}
        onSearch={handleSearch}
        onAction={() => setIsAddOpen(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
        <GRNTable
          data={grns}
          isLoading={isRefreshing}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onExportPdf={handleExportPdf}
          projectId={projectId}
          total={total}
        />
      )}

      <AddGRNModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewGRN}
        projectId={projectId}
      />
      <EditGRNModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEditedGRN}
        grn={editingGRN}
        isEditLoading={isEditLoading}
        projectId={projectId}
      />
      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete GRN"
        description="This action cannot be undone. This will permanently remove the goods receipt note and rollback inventory stock."
        itemName={grnToDelete?.grnNumber}
        isLoading={isDeleting}
      />
    </div>
  )
}