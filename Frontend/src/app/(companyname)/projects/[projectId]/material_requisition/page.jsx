// page.jsx — full rewrite of state/pagination logic

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import {
  fetchAllMRs,
  fetchSingleMR,
  createMR,
  editMR,
  submitMR,
  approveMR,
  rejectMR,
  deleteMR,
  buildMRPayload,
  computeMRStats,
  formatToastError,
} from "./api"
import RequisitionHeader from "@/components/projects/(project)/material_requisition/RequisitionHeader"
import SummaryCard from "@/components/ui/SummaryCard"
import RequisitionTable from "@/components/projects/(project)/material_requisition/RequisitionTable"
import AddMRModal from "@/components/projects/(project)/material_requisition/AddMRModal"
import EditMRModal from "@/components/projects/(project)/material_requisition/EditMRModal"
import RejectMRModal from "@/components/projects/(project)/material_requisition/RejectMRModal"
import DeleteModal from "@/components/ui/DeleteModal"
import Loading from "./loading"

function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function getKeycloakId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("keycloakId") || ""
}

export default function MaterialRequisitionPage() {
  const { projectId } = useParams()

  const [mrs, setMrs] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [stats, setStats] = useState([])

  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(undefined)
  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingMR, setEditingMR] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [mrToDelete, setMrToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [mrToReject, setMrToReject] = useState(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const cursorRef = useRef(null)
  const controllerRef = useRef(null)
  const editFetchRef = useRef(null)

  const searchRef = useRef(searchQuery)
  const statusRef = useRef(statusFilter)
  const sortByRef = useRef(sortBy)
  const orderRef = useRef(order)
  searchRef.current = searchQuery
  statusRef.current = statusFilter
  sortByRef.current = sortBy
  orderRef.current = order

  const loadFresh = useCallback(async ({
    search = "",
    status = undefined,
    sortBy = "createdAt",
    order = "desc",
    showRefresh = false,
  } = {}) => {
    if (!projectId) return

    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl

    cursorRef.current = null
    if (showRefresh) setIsRefreshing(true)
    setError(null)

    try {
      const { mrs: fetched, pagination } = await fetchAllMRs(projectId, {
        page: 1,
        limit: 10,
        search,
        status,
        sortBy,
        order,
        signal: ctrl.signal,
      })
      if (ctrl.signal.aborted) return

      setMrs(fetched)
      setTotal(pagination.total ?? 0)
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
      setStats(computeMRStats(fetched, pagination.total ?? 0))
    } catch (err) {
      if (err.name === "CanceledError") return
      setError(err.message)
      toast.error("Failed to load requisitions", {
        description: formatToastError(err),
      })
    } finally {
      setIsInitialLoad(false)
      setIsRefreshing(false)
    }
  }, [projectId])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return

    setLoadingMore(true)
    try {
      const { mrs: fetched, pagination } = await fetchAllMRs(projectId, {
        page: 1,
        limit: 10,
        search: searchRef.current,
        status: statusRef.current,
        sortBy: sortByRef.current,
        order: orderRef.current,
        lastId: cursorRef.current,
      })

      setMrs(prev => [...prev, ...fetched])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError") return
      toast.error("Failed to load more", { description: formatToastError(err) })
    } finally {
      setLoadingMore(false)
    }
  }, [projectId, loadingMore, hasMore])
  useEffect(() => {
    loadFresh({ search: "", status: statusFilter, sortBy, order })
    return () => {
      controllerRef.current?.abort()
      editFetchRef.current?.abort()
    }
  }, [])
  const isFirstFilterRender = useRef(true)
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false
      return
    }
    loadFresh({
      search: searchRef.current,
      status: statusFilter,
      sortBy,
      order,
      showRefresh: true,
    })
  }, [statusFilter, sortBy, order, loadFresh])
  const debouncedSearch = useRef(
    debounce((q) => {
      loadFresh({
        search: q,
        status: statusRef.current,
        sortBy: sortByRef.current,
        order: orderRef.current,
        showRefresh: true,
      })
    }, 400)
  ).current

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    debouncedSearch(q)
  }, [debouncedSearch])

  const handleFilter = useCallback((selectedFilters) => {
    const newStatus =
      Array.isArray(selectedFilters?.status) && selectedFilters.status.length > 0
        ? selectedFilters.status[selectedFilters.status.length - 1]
        : undefined

    const newSortBy =
      Array.isArray(selectedFilters?.sortBy) && selectedFilters.sortBy.length > 0
        ? selectedFilters.sortBy[selectedFilters.sortBy.length - 1]
        : "createdAt"

    const newOrder =
      Array.isArray(selectedFilters?.order) && selectedFilters.order.length > 0
        ? selectedFilters.order[selectedFilters.order.length - 1]
        : "desc"

    setStatusFilter(newStatus)
    setSortBy(newSortBy)
    setOrder(newOrder)
  }, [])

  const handleSaveNewMR = async (form) => {
    try {
      const payload = buildMRPayload(form, getKeycloakId(), "create")
      const res = await createMR(projectId, payload)
      toast.success("MR Created", {
        description: res.description || "Material Requisition created as Draft",
      })
      setIsAddOpen(false)
      await loadFresh({
        search: searchRef.current,
        status: statusRef.current,
        sortBy: sortByRef.current,
        order: orderRef.current,
        showRefresh: true,
      })
    } catch (err) {
      toast.error("Failed to create MR", { description: formatToastError(err) })
      throw err
    }
  }

  const handleEditClick = useCallback((mr) => {
    if (!["Draft", "Rejected"].includes(mr.status)) {
      toast.error("Cannot edit", {
        description: "Only Draft or Rejected MRs can be edited",
      })
      return
    }
    editFetchRef.current?.abort()
    const ctrl = new AbortController()
    editFetchRef.current = ctrl

    setEditingMR({ ...mr })
    setIsEditLoading(true)
    setIsEditOpen(true)

    fetchSingleMR(projectId, mr.id, ctrl.signal)
      .then((fullMR) => { if (!ctrl.signal.aborted) setEditingMR(fullMR) })
      .catch((err) => {
        if (err.name !== "CanceledError")
          toast.error("Warning", { description: "Could not load full MR details" })
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
    setEditingMR(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedMR = async (form) => {
    if (!editingMR?.id) return
    try {
      const payload = buildMRPayload(form, getKeycloakId(), "edit")
      const res = await editMR(projectId, editingMR.id, payload)
      toast.success("MR Updated", {
        description: res.description || "Material Requisition updated successfully",
      })
      handleCloseEdit()
      await loadFresh({
        search: searchRef.current,
        status: statusRef.current,
        sortBy: sortByRef.current,
        order: orderRef.current,
        showRefresh: true,
      })
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleSubmit = useCallback(async (mr) => {
    setActionLoading(p => ({ ...p, [mr.id]: "submitting" }))
    try {
      const res = await submitMR(projectId, mr.id, getKeycloakId())
      toast.success("MR Submitted", {
        description: res.description || `${mr.mrNumber} submitted for approval`,
      })
      setMrs(prev =>
        prev.map(m => m.id === mr.id ? { ...m, status: "Submitted" } : m)
      )
    } catch (err) {
      toast.error("Submit Failed", { description: formatToastError(err) })
    } finally {
      setActionLoading(p => ({ ...p, [mr.id]: null }))
    }
  }, [projectId])

  const handleApprove = useCallback(async (mr) => {
    setActionLoading(p => ({ ...p, [mr.id]: "approving" }))
    try {
      const res = await approveMR(projectId, mr.id, getKeycloakId())
      toast.success("MR Approved", {
        description: res.description || `${mr.mrNumber} has been approved`,
      })
      setMrs(prev =>
        prev.map(m => m.id === mr.id ? { ...m, status: "Approved" } : m)
      )
    } catch (err) {
      toast.error("Approve Failed", { description: formatToastError(err) })
    } finally {
      setActionLoading(p => ({ ...p, [mr.id]: null }))
    }
  }, [projectId])

  const handleRejectClick = useCallback((mr) => {
    setMrToReject(mr)
    setIsRejectOpen(true)
  }, [])

  const handleConfirmReject = async (remarks) => {
    if (!mrToReject) return
    const targetId = mrToReject.id
    setIsRejecting(true)
    setActionLoading(p => ({ ...p, [targetId]: "rejecting" }))
    try {
      const res = await rejectMR(projectId, targetId, getKeycloakId(), remarks)
      toast.success("MR Rejected", {
        description: res.description || `${mrToReject.mrNumber} has been rejected`,
      })
      setMrs(prev =>
        prev.map(m =>
          m.id === targetId ? { ...m, status: "Rejected", rejectionRemarks: remarks } : m
        )
      )
      setIsRejectOpen(false)
      setMrToReject(null)
    } catch (err) {
      toast.error("Reject Failed", { description: formatToastError(err) })
    } finally {
      setIsRejecting(false)
      setActionLoading(p => ({ ...p, [targetId]: null }))
    }
  }

  const handleCloseReject = useCallback(() => {
    if (isRejecting) return
    setIsRejectOpen(false)
    setTimeout(() => setMrToReject(null), 250)
  }, [isRejecting])

  const handleDeleteClick = useCallback((mr) => {
    if (["Approved", "ConvertedToPO"].includes(mr.status)) {
      toast.error("Cannot delete", {
        description: "Approved or Converted MRs cannot be deleted",
      })
      return
    }
    setMrToDelete(mr)
    setIsDeleteOpen(true)
  }, [])

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setTimeout(() => setMrToDelete(null), 250)
  }, [isDeleting])

  const handleConfirmDelete = async () => {
    if (!mrToDelete) return
    try {
      setIsDeleting(true)
      await deleteMR(projectId, mrToDelete.id, getKeycloakId())
      toast.success("MR Deleted", {
        description: `${mrToDelete.mrNumber} deleted successfully`,
      })
      setIsDeleteOpen(false)
      setMrToDelete(null)
      await loadFresh({
        search: searchRef.current,
        status: statusRef.current,
        sortBy: sortByRef.current,
        order: orderRef.current,
        showRefresh: true,
      })
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isInitialLoad) return <Loading />

  return (
    <div className="w-full mx-auto p-4 flex flex-col gap-4 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
      <RequisitionHeader
        title="Material Requisition"
        description={
          <>
            Manage and track material requests
            <br />
            for your project
          </>
        }
        onSearch={handleSearch}
        onFilter={handleFilter}
        onAction={() => setIsAddOpen(true)}
        isRefreshing={isRefreshing}
        total={total}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 ">
        {stats.map((stat) => (
          <SummaryCard key={stat.id} item={stat} />
        ))}
      </div>

      {error && !isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">
            {error}
          </p>
          <button
            onClick={() => loadFresh({
              search: searchQuery,
              status: statusFilter,
              sortBy,
              order,
              showRefresh: true,
            })}
            className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      ) : (
        <RequisitionTable
          data={mrs}
          isLoading={isRefreshing}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onSubmit={handleSubmit}
          onApprove={handleApprove}
          onReject={handleRejectClick}
          actionLoading={actionLoading}
          total={total}
        />
      )}

      <AddMRModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewMR}
        projectId={projectId}
      />
      <EditMRModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEditedMR}
        mr={editingMR}
        isEditLoading={isEditLoading}
        projectId={projectId}
      />
      <RejectMRModal
        open={isRejectOpen}
        onClose={handleCloseReject}
        onConfirm={handleConfirmReject}
        mr={mrToReject}
        isLoading={isRejecting}
      />
      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete MR"
        description="This action cannot be undone. This will permanently remove the material requisition."
        itemName={mrToDelete?.mrNumber}
        isLoading={isDeleting}
      />
    </div>
  )
}