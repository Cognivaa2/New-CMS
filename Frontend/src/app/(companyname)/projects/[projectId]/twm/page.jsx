"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
    fetchTWMList,
    fetchTWMDetail,
    computeTWMStats,
    formatTWMError,
} from "./api"

import TWMHeader from "@/components/projects/(project)/twm/TWMHeader"
import TWMStats from "@/components/projects/(project)/twm/TWMStats"
import TWMTable from "@/components/projects/(project)/twm/TWMTable"
import Loading from "./loading"

function debounce(fn, delay = 400) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

export default function ThreeWayMatchPage() {
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
    const controllerRef = useRef(null)
    const searchRef = useRef(searchQuery)
    const filtersRef = useRef(activeFilters)
    searchRef.current = searchQuery
    filtersRef.current = activeFilters

    const loadRecords = useCallback(
        async (search = "", filters = {}, showRefresh = false) => {
            if (!projectId) {
                setIsInitialLoad(false)
                return
            }
            controllerRef.current?.abort()
            const controller = new AbortController()
            controllerRef.current = controller
            if (showRefresh) setIsRefreshing(true)
            setError(null)
            try {
                const { records: fetched, pagination: pag } =
                    await fetchTWMList({
                        projectId,
                        page: 1,
                        limit: 50,
                        search,
                        matchStatus: filters.matchStatus || undefined,
                        sortBy: filters.sortBy || "createdAt",
                        order: filters.order || "desc",
                        signal: controller.signal,
                    })
                if (controller.signal.aborted) {
                    setIsInitialLoad(false)
                    return
                }
                setRecords(fetched)
                setPagination(pag)
                const { cards } = computeTWMStats(fetched)
                setStats(cards)
            } catch (err) {
                if (err.name === "CanceledError" || err.name === "AbortError") {
                    setIsInitialLoad(false)
                    return
                }
                setError(err.message)
                toast.error("Failed to load reconciliation data", {
                    description: formatTWMError(err),
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
        (selectedFilters = {}) => {
            setActiveFilters(selectedFilters)
            loadRecords(searchRef.current, selectedFilters, true)
        },
        [loadRecords]
    )

    if (isInitialLoad) return <Loading />

    return (
        <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
            <TWMHeader
                title="Three Way Match"
                description={
                    <>
                        Compare Purchase Orders, GRNs, and Invoices to identify discrepancies and reconcile
                    </>
                }
                total={pagination.total}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                isRefreshing={isRefreshing}
            />

            <TWMStats stats={stats} />

            {error && !isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">
                        {error}
                    </p>
                    <button
                        onClick={() =>
                            loadRecords(searchQuery, activeFilters, true)
                        }
                        className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <TWMTable
                    data={records}
                    isLoading={isRefreshing}
                    projectId={projectId}   // ← passed down so TWMTable can call fetchTWMDetail
                />
            )}
        </div>
    )
}