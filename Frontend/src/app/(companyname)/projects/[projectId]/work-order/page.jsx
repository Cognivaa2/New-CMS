// page.jsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
    fetchAllWOs,
    fetchSingleWO,
    createWO,
    editWO,
    submitWO,
    approveWO,
    rejectWO,
    cancelWO,
    startWO,
    completeWO,
    deleteWO,
    buildWOPayload,
    computeWOStats,
    formatWOError,
} from "./api"

import WOHeader from "@/components/projects/(project)/work-order/WOHeader"
import WOTable from "@/components/projects/(project)/work-order/WOTable"
import AddWOModal from "@/components/projects/(project)/work-order/AddWOModal"
import EditWOModal from "@/components/projects/(project)/work-order/EditWOModal"
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

export default function WorkOrderPage() {
    const params = useParams()
    const projectId = params?.projectId

    const [wos, setWos] = useState([])
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
    const [editingWO, setEditingWO] = useState(null)
    const [isEditLoading, setIsEditLoading] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [woToDelete, setWoToDelete] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)
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
            const { wos: fetched, pagination } = await fetchAllWOs(projectId, {
                page: 1,
                limit: 10,
                search,
                sortBy: "createdAt",
                order: "desc",
                signal: ctrl.signal,
            })
            if (ctrl.signal.aborted) { setIsInitialLoad(false); return }

            setWos(fetched)
            setTotal(pagination.total ?? 0)
            setHasMore(pagination.hasNextPage)
            cursorRef.current = pagination.nextCursor ?? null
            setStats(computeWOStats(fetched))
        } catch (err) {
            if (err.name === "CanceledError" || err.name === "AbortError") {
                setIsInitialLoad(false)
                return
            }
            setError(err.message)
            toast.error("Failed to load work orders", { description: formatWOError(err) })
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

            const { wos: fetched, pagination } = await fetchAllWOs(projectId, {
                page: isPageNumber ? Number(cursorValue) : 1,
                limit: 10,
                search: searchRef.current,
                sortBy: "createdAt",
                order: "desc",
                lastId: isPageNumber ? undefined : cursorValue,
            })

            setWos(prev => [...prev, ...fetched])
            setHasMore(pagination.hasNextPage)
            cursorRef.current = pagination.nextCursor ?? null
        } catch (err) {
            if (err.name === "CanceledError" || err.name === "AbortError") return
            toast.error("Failed to load more", { description: formatWOError(err) })
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
    const handleSaveNewWO = async (form) => {
        try {
            const payload = buildWOPayload(form, getKeycloakId(), null)
            const res = await createWO(projectId, payload)
            toast.success("WO Created", {
                description: res.description || "Work Order created as Draft",
            })
            setIsAddOpen(false)
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Failed to create Work Order", { description: formatWOError(err) })
            throw err
        }
    }

    const handleEditClick = useCallback((wo) => {
        if (!["Draft", "Rejected"].includes(wo.status)) {
            toast.error("Cannot edit", {
                description: "Only Draft or Rejected Work Orders can be edited",
            })
            return
        }
        editFetchRef.current?.abort()
        const ctrl = new AbortController()
        editFetchRef.current = ctrl

        setEditingWO({ ...wo })
        setIsEditLoading(true)
        setIsEditOpen(true)

        fetchSingleWO(projectId, wo.id, ctrl.signal)
            .then((full) => { if (!ctrl.signal.aborted) setEditingWO(full) })
            .catch((err) => {
                if (err.name !== "CanceledError")
                    toast.error("Warning", { description: "Could not load full WO details" })
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
        setEditingWO(null)
        setIsEditLoading(false)
    }, [])

    const handleSaveEditedWO = async (form) => {
        if (!editingWO?.id) return
        try {
            const payload = buildWOPayload(form, null, getKeycloakId())
            const res = await editWO(projectId, editingWO.id, payload)
            toast.success("WO Updated", {
                description: res.description || "Work Order updated successfully",
            })
            handleCloseEdit()
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Update Failed", { description: formatWOError(err) })
            throw err
        }
    }
    const handleSubmit = useCallback(async (wo) => {
        setActionLoading(p => ({ ...p, [wo.id]: "submitting" }))
        try {
            const res = await submitWO(projectId, wo.id, getKeycloakId())
            toast.success("WO Submitted", {
                description: res.description || `${wo.woNumber} submitted for approval`,
            })
            setWos(prev => prev.map(w => w.id === wo.id ? { ...w, status: "Submitted" } : w))
        } catch (err) {
            toast.error("Submit Failed", { description: formatWOError(err) })
        } finally {
            setActionLoading(p => ({ ...p, [wo.id]: null }))
        }
    }, [projectId])

    const handleApprove = useCallback(async (wo) => {
        setActionLoading(p => ({ ...p, [wo.id]: "approving" }))
        try {
            const res = await approveWO(projectId, wo.id, getKeycloakId())
            toast.success("WO Approved", {
                description: res.description || `${wo.woNumber} has been approved`,
            })
            setWos(prev => prev.map(w => w.id === wo.id ? { ...w, status: "Approved" } : w))
        } catch (err) {
            toast.error("Approve Failed", { description: formatWOError(err) })
        } finally {
            setActionLoading(p => ({ ...p, [wo.id]: null }))
        }
    }, [projectId])

    const handleReject = useCallback(async (wo, rejectionRemarks = "") => {
        setActionLoading(p => ({ ...p, [wo.id]: "rejecting" }))
        try {
            const res = await rejectWO(projectId, wo.id, getKeycloakId(), rejectionRemarks)
            toast.success("WO Rejected", {
                description: res.description || `${wo.woNumber} has been rejected`,
            })
            setWos(prev => prev.map(w => w.id === wo.id ? { ...w, status: "Rejected" } : w))
        } catch (err) {
            toast.error("Reject Failed", { description: formatWOError(err) })
        } finally {
            setActionLoading(p => ({ ...p, [wo.id]: null }))
        }
    }, [projectId])

    const handleCancel = useCallback(async (wo, cancellationRemarks = "") => {
        setActionLoading(p => ({ ...p, [wo.id]: "cancelling" }))
        try {
            const res = await cancelWO(projectId, wo.id, getKeycloakId(), cancellationRemarks)
            toast.success("WO Cancelled", {
                description: res.description || `${wo.woNumber} has been cancelled`,
            })
            setWos(prev => prev.map(w => w.id === wo.id ? { ...w, status: "Cancelled" } : w))
        } catch (err) {
            toast.error("Cancel Failed", { description: formatWOError(err) })
        } finally {
            setActionLoading(p => ({ ...p, [wo.id]: null }))
        }
    }, [projectId])

    const handleStart = useCallback(async (wo) => {
        setActionLoading(p => ({ ...p, [wo.id]: "starting" }))
        try {
            const res = await startWO(projectId, wo.id, getKeycloakId())
            toast.success("WO Started", {
                description: res.description || `${wo.woNumber} is now In Progress`,
            })
            setWos(prev => prev.map(w => w.id === wo.id ? { ...w, status: "InProgress" } : w))
        } catch (err) {
            toast.error("Start Failed", { description: formatWOError(err) })
        } finally {
            setActionLoading(p => ({ ...p, [wo.id]: null }))
        }
    }, [projectId])

    const handleComplete = useCallback(async (wo, completionRemarks = "", actualEndDate = null) => {
        setActionLoading(p => ({ ...p, [wo.id]: "completing" }))
        try {
            const res = await completeWO(projectId, wo.id, getKeycloakId(), completionRemarks, actualEndDate)
            toast.success("WO Completed", {
                description: res.description || `${wo.woNumber} marked as completed`,
            })
            setWos(prev =>
                prev.map(w => w.id === wo.id ? { ...w, status: "Completed", completionPercent: 100 } : w)
            )
        } catch (err) {
            toast.error("Complete Failed", { description: formatWOError(err) })
        } finally {
            setActionLoading(p => ({ ...p, [wo.id]: null }))
        }
    }, [projectId])

    const handleDeleteClick = useCallback((wo) => {
        if (!["Draft", "Rejected"].includes(wo.status)) {
            toast.error("Cannot delete", {
                description: "Only Draft or Rejected Work Orders can be deleted",
            })
            return
        }
        setWoToDelete(wo)
        setIsDeleteOpen(true)
    }, [])

    const handleCloseDelete = useCallback(() => {
        if (isDeleting) return
        setIsDeleteOpen(false)
        setTimeout(() => setWoToDelete(null), 250)
    }, [isDeleting])

    const handleConfirmDelete = async () => {
        if (!woToDelete) return
        try {
            setIsDeleting(true)
            await deleteWO(projectId, woToDelete.id, getKeycloakId())
            toast.success("WO Deleted", {
                description: `${woToDelete.woNumber} deleted successfully`,
            })
            setIsDeleteOpen(false)
            setWoToDelete(null)
            // full reset — safest after delete
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Delete Failed", { description: formatWOError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    if (isInitialLoad) return <Loading />

    return (
        <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
            <WOHeader
                title="Work Orders"
                description={<>Manage and track work orders<br />for your project</>}
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
                <WOTable
                    data={wos}
                    isLoading={isRefreshing}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    projectId={projectId}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onSubmit={handleSubmit}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCancel={handleCancel}
                    onStart={handleStart}
                    onComplete={handleComplete}
                    actionLoading={actionLoading}
                    total={total}
                />
            )}

            <AddWOModal
                open={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleSaveNewWO}
                projectId={projectId}
            />
            <EditWOModal
                open={isEditOpen}
                onClose={handleCloseEdit}
                onSave={handleSaveEditedWO}
                wo={editingWO}
                isEditLoading={isEditLoading}
                projectId={projectId}
            />
            <DeleteModal
                isOpen={isDeleteOpen}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Work Order"
                description="This action cannot be undone. This will permanently remove the work order."
                itemName={woToDelete?.woNumber}
                isLoading={isDeleting}
            />
        </div>
    )
}