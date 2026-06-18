"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
    fetchAllInspections,
    fetchSingleInspection,
    createInspection,
    editInspection,
    deleteInspection,
    resolveEntry,
    buildInspectionPayload,
    computeSafetyStats,
    formatSafetyError,
} from "./api"

import SafetyHeader from "@/components/projects/(project)/safety/SafetyHeader"
import SafetyTable from "@/components/projects/(project)/safety/SafetyTable"
import AddSafetyModal from "@/components/projects/(project)/safety/AddSafetyModal"
import EditSafetyModal from "@/components/projects/(project)/safety/EditSafetyModal"
import DeleteModal from "@/components/ui/DeleteModal"
import SummaryCard from "@/components/ui/SummaryCard"
import Loading from "./loading"

function debounce(fn, delay = 400) {
    let timer
    const debounced = (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
    debounced.cancel = () => clearTimeout(timer)
    return debounced
}

function getKeycloakId() {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("keycloakId") || ""
}

export default function SafetyPage() {
    const params = useParams()
    const projectId = params?.projectId

    const [inspections, setInspections] = useState([])
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
    const [editingInspection, setEditingInspection] = useState(null)
    const [isEditLoading, setIsEditLoading] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [inspectionToDelete, setInspectionToDelete] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const cursorRef = useRef(null)
    const controllerRef = useRef(null)
    const editFetchRef = useRef(null)
    const searchRef = useRef(searchQuery)
    searchRef.current = searchQuery

    const loadFresh = useCallback(
        async ({ search = "", showRefresh = false } = {}) => {
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
                const { inspections: fetched, projectSummary, pagination } =
                    await fetchAllInspections(projectId, {
                        page: 1,
                        limit: 10,
                        search,
                        sortBy: "createdAt",
                        order: "desc",
                        signal: ctrl.signal,
                    })
                if (ctrl.signal.aborted) {
                    setIsInitialLoad(false)
                    return
                }

                setInspections(fetched)
                setTotal(pagination.total ?? 0)
                setHasMore(pagination.hasNextPage)
                cursorRef.current = pagination.nextCursor ?? null
                setStats(computeSafetyStats(fetched, projectSummary))
            } catch (err) {
                if (err.name === "CanceledError" || err.name === "AbortError") {
                    setIsInitialLoad(false)
                    return
                }
                setError(err.message)
                toast.error("Failed to load inspections", {
                    description: formatSafetyError(err),
                })
            } finally {
                setIsInitialLoad(false)
                setIsRefreshing(false)
            }
        },
        [projectId]
    )

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || !cursorRef.current) return
        if (!projectId) return

        setLoadingMore(true)
        try {
            const cursorValue = cursorRef.current
            const isPageNumber = /^\d+$/.test(cursorValue)

            const { inspections: fetched, pagination } = await fetchAllInspections(
                projectId,
                {
                    page: isPageNumber ? Number(cursorValue) : 1,
                    limit: 10,
                    search: searchRef.current,
                    sortBy: "createdAt",
                    order: "desc",
                }
            )

            setInspections((prev) => [...prev, ...fetched])
            setHasMore(pagination.hasNextPage)
            cursorRef.current = pagination.nextCursor ?? null
        } catch (err) {
            if (err.name === "CanceledError" || err.name === "AbortError") return
            toast.error("Failed to load more", {
                description: formatSafetyError(err),
            })
        } finally {
            setLoadingMore(false)
        }
    }, [projectId, loadingMore, hasMore])

    useEffect(() => {
        if (!projectId) {
            setIsInitialLoad(false)
            return
        }
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
        debounce((q) => {
            loadFresh({ search: q, showRefresh: true })
        }, 400)
    ).current

    const handleSearch = useCallback(
        (query) => {
            setSearchQuery(query)
            debouncedSearch(query)
        },
        [debouncedSearch]
    )

    const handleSaveNewInspection = async (form) => {
        try {
            const userId = getKeycloakId()
            if (!userId) {
                toast.error("Session expired", { description: "Please log in again" })
                return
            }
            const payload = buildInspectionPayload(form, userId)
            const res = await createInspection(projectId, payload)
            toast.success("Inspection Created", {
                description:
                    res.description || "Safety inspection created successfully",
            })
            setIsAddOpen(false)
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Failed to create inspection", {
                description: formatSafetyError(err),
            })
            throw err
        }
    }

    const handleEditClick = useCallback(
        (inspection) => {
            editFetchRef.current?.abort()
            const ctrl = new AbortController()
            editFetchRef.current = ctrl

            setEditingInspection({ ...inspection })
            setIsEditLoading(true)
            setIsEditOpen(true)

            fetchSingleInspection(projectId, inspection.id, ctrl.signal)
                .then((full) => {
                    if (!ctrl.signal.aborted) setEditingInspection(full)
                })
                .catch((err) => {
                    if (err.name !== "CanceledError")
                        toast.error("Warning", {
                            description: "Could not load full inspection details",
                        })
                })
                .finally(() => {
                    if (!ctrl.signal.aborted) setIsEditLoading(false)
                    if (editFetchRef.current === ctrl) editFetchRef.current = null
                })
        },
        [projectId]
    )

    const handleCloseEdit = useCallback(() => {
        editFetchRef.current?.abort()
        editFetchRef.current = null
        setIsEditOpen(false)
        setEditingInspection(null)
        setIsEditLoading(false)
    }, [])

    const handleSaveEditedInspection = async (form) => {
        if (!editingInspection?.id) return
        try {
            const userId = getKeycloakId()
            if (!userId) {
                toast.error("Session expired", { description: "Please log in again" })
                return
            }
            const formData = new FormData()
            formData.append("updatedBy", userId)

            const entries = (form.entries || [])
                .filter((e) => e.title?.trim() && e.inspectedBy?.trim())
                .map((entry) => ({
                    title: entry.title?.trim() || "",
                    category: entry.category || "Safety",
                    status: entry.status || "Observation",
                    severity: entry.severity || "Low",
                    inspectionDate: entry.inspectionDate
                        ? entry.inspectionDate instanceof Date
                            ? entry.inspectionDate.toISOString()
                            : String(entry.inspectionDate)
                        : null,
                    location: entry.location?.trim() || "",
                    description: entry.description?.trim() || "",
                    remarks: entry.remarks?.trim() || "",
                    inspectedBy: entry.inspectedBy?.trim() || "",
                    _id: entry.id || entry._id || undefined,
                }))
            formData.append("entries", JSON.stringify(entries))

                ; (form.entries || []).forEach((entry, index) => {
                    if (entry.attachmentFile instanceof File) {
                        formData.append(`attachment_${index}`, entry.attachmentFile, entry.attachmentFile.name)
                    }
                })

            const res = await editInspection(
                projectId,
                editingInspection.id,
                formData
            )
            toast.success("Inspection Updated", {
                description:
                    res.description || "Safety inspection updated successfully",
            })
            handleCloseEdit()
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Update Failed", { description: formatSafetyError(err) })
            throw err
        }
    }

    const handleResolveEntry = async (inspectionId, entryId, resolutionNote = "") => {
        try {
            const userId = getKeycloakId()
            if (!userId) {
                toast.error("Session expired", { description: "Please log in again" })
                return
            }
            await resolveEntry(projectId, inspectionId, entryId, userId, resolutionNote)
            toast.success("Entry Resolved", {
                description: "Safety entry marked as resolved",
            })
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Resolve Failed", { description: formatSafetyError(err) })
        }
    }

    const handleDeleteClick = useCallback((inspection) => {
        setInspectionToDelete(inspection)
        setIsDeleteOpen(true)
    }, [])

    const handleCloseDelete = useCallback(() => {
        if (isDeleting) return
        setIsDeleteOpen(false)
        setTimeout(() => setInspectionToDelete(null), 250)
    }, [isDeleting])

    const handleConfirmDelete = async () => {
        if (!inspectionToDelete) return
        try {
            setIsDeleting(true)
            await deleteInspection(
                projectId,
                inspectionToDelete.id,
                getKeycloakId()
            )
            toast.success("Inspection Deleted", {
                description: `${inspectionToDelete.inspectionNumber} deleted successfully`,
            })
            setIsDeleteOpen(false)
            setInspectionToDelete(null)
            await loadFresh({ search: searchRef.current, showRefresh: true })
        } catch (err) {
            toast.error("Delete Failed", { description: formatSafetyError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    if (isInitialLoad) return <Loading />

    return (
        <div className="w-full mx-auto p-4 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
            <SafetyHeader
                title="Safety Inspections"
                description={
                    <>
                        Record and track safety & quality inspections
                        <br />
                        across your project site
                    </>
                }
                badgeCount={total}
                onSearch={handleSearch}
                onAction={() => setIsAddOpen(true)}
                isRefreshing={isRefreshing}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                        onClick={() =>
                            loadFresh({ search: searchQuery, showRefresh: true })
                        }
                        className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <SafetyTable
                    data={inspections}
                    isLoading={isRefreshing}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onResolveEntry={handleResolveEntry}
                    projectId={projectId}
                    total={total}
                />
            )}

            <AddSafetyModal
                open={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleSaveNewInspection}
                projectId={projectId}
            />
            <EditSafetyModal
                open={isEditOpen}
                onClose={handleCloseEdit}
                onSave={handleSaveEditedInspection}
                inspection={editingInspection}
                isEditLoading={isEditLoading}
                projectId={projectId}
            />
            <DeleteModal
                isOpen={isDeleteOpen}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Inspection"
                description="This action cannot be undone. This will permanently remove the safety inspection and all associated entries."
                itemName={inspectionToDelete?.inspectionNumber}
                isLoading={isDeleting}
            />
        </div>
    )
}