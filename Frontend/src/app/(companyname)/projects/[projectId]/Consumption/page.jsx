"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
    fetchConsumptionByProject,
    deleteConsumptionRecord,
    computeConsumptionStats,
    formatConsumptionError,
} from "./api"

import ConsumptionHeader from "@/components/projects/(project)/consumption/ConsumptionHeader"
import ConsumptionTable from "@/components/projects/(project)/consumption/ConsumptionTable"
import DeleteModal from "@/components/ui/DeleteModal"
import SummaryCard from "@/components/ui/SummaryCard"
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

export default function ConsumptionPage() {
    const params = useParams()
    const projectId = params?.projectId

    const [records, setRecords] = useState([])
    const [pagination, setPagination] = useState({
        total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false,
    })
    const [stats, setStats] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilters, setActiveFilters] = useState({})

    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState(null)

    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [recordToDelete, setRecordToDelete] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const controllerRef = useRef(null)
    const searchRef = useRef(searchQuery)
    searchRef.current = searchQuery
    const filtersRef = useRef(activeFilters)
    filtersRef.current = activeFilters

    const loadRecords = useCallback(
        async (search = "", filters = {}, showRefresh = false) => {
            if (!projectId || typeof projectId !== "string") {
                setIsInitialLoad(false)
                return
            }

            controllerRef.current?.abort()
            const controller = new AbortController()
            controllerRef.current = controller

            if (showRefresh) setIsRefreshing(true)
            setError(null)

            try {
                const { records: fetched, pagination: pag } = await fetchConsumptionByProject(projectId, {
                    page: 1,
                    limit: 10,
                    search,
                    source: filters.source || undefined,
                    subTaskId: filters.subTaskId || undefined,
                    isWOConsumption: filters.isWOConsumption !== undefined ? filters.isWOConsumption : undefined,
                    sortBy: filters.sortBy || "createdAt",
                    order: "desc",
                    signal: controller.signal,
                })

                if (controller.signal.aborted) {
                    setIsInitialLoad(false)
                    return
                }

                setRecords(fetched)
                setPagination(pag)
                setStats(computeConsumptionStats(fetched))
            } catch (err) {
                if (err.name === "CanceledError" || err.name === "AbortError") {
                    setIsInitialLoad(false)
                    return
                }
                setError(err.message)
                toast.error("Failed to load consumption records", {
                    description: formatConsumptionError(err),
                })
            } finally {
                setIsInitialLoad(false)
                setIsRefreshing(false)
            }
        },
        [projectId]
    )

    useEffect(() => {
        if (!projectId) { setIsInitialLoad(false); return }
        loadRecords("", {}, false)
        return () => controllerRef.current?.abort()
    }, [projectId, loadRecords])

    useEffect(() => {
        return () => controllerRef.current?.abort()
    }, [])

    const debouncedSearch = useRef(
        debounce((q) => loadRecords(q, filtersRef.current, true), 400)
    ).current

    const handleSearch = useCallback(
        (query) => {
            setSearchQuery(query)
            debouncedSearch(query)
        },
        [debouncedSearch]
    )
    const handleFilterChange = useCallback(
        (partialFilters) => {
            setActiveFilters((prev) => {
                const merged = { ...prev, ...partialFilters }
                Object.keys(merged).forEach((k) => {
                    if (merged[k] === null || merged[k] === undefined || merged[k] === "") {
                        delete merged[k]
                    }
                })
                loadRecords(searchRef.current, merged, true)
                return merged
            })
        },
        [loadRecords]
    )
    const handleDeleteClick = useCallback((record) => {
        setRecordToDelete(record)
        setIsDeleteOpen(true)
    }, [])

    const handleCloseDelete = useCallback(() => {
        if (isDeleting) return
        setIsDeleteOpen(false)
        setTimeout(() => setRecordToDelete(null), 250)
    }, [isDeleting])

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return
        try {
            setIsDeleting(true)
            await deleteConsumptionRecord(projectId, recordToDelete.id, getKeycloakId())
            toast.success("Record Deleted", {
                description: `Consumption of "${recordToDelete.materialName}" deleted successfully`,
            })
            setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id))
            setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
            setIsDeleteOpen(false)
            setRecordToDelete(null)
        } catch (err) {
            toast.error("Delete Failed", { description: formatConsumptionError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    if (isInitialLoad) return <Loading />

    return (
        <div className="w-full mx-auto p-4 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
            <ConsumptionHeader
                count={pagination.total}
                projectId={projectId}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {stats.map((stat, index) => (
                    <SummaryCard key={stat.id} item={stat} index={index} />
                ))}
            </div>

            {error && !isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">
                        {error}
                    </p>
                    <button
                        onClick={() => loadRecords(searchQuery, activeFilters, true)}
                        className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <ConsumptionTable
                    data={records}
                    isLoading={isRefreshing}
                    onDelete={handleDeleteClick}
                />
            )}

            <DeleteModal
                isOpen={isDeleteOpen}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Consumption Record"
                description="This action cannot be undone. Inventory stock will be restored for non-WO consumption."
                itemName={recordToDelete?.materialName}
                isLoading={isDeleting}
            />
        </div>
    )
}