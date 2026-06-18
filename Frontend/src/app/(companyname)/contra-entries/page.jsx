"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
    fetchAllCEs,
    submitCE,
    approveCE,
    rejectCE,
    computeCEStats,
    formatCEError,
    getKeycloakId,
} from "./api"

import CEHeader from "@/components/contra-entries/CEHeader"
import CETable from "@/components/contra-entries/CETable"
import CEApprovalTable from "@/components/contra-entries/CEApprovalTable"
import AddCEModal from "@/components/contra-entries/AddCEModal"
import RejectModal from "@/components/ui/RejectModal"
import SummaryCard from "@/components/ui/SummaryCard"
import Loading from "./loading"

function debounce(fn, delay = 400) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

const PER_PAGE = 20
const TABS = ["All Entries", "Approvals"]

export default function ContraEntriesPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const routeProjectId = params?.projectId || searchParams?.get("projectId") || null
    const isInsideProjectRoute = !!params?.projectId

    const [selectedProject, setSelectedProject] = useState(
        routeProjectId ? { projectId: routeProjectId } : null
    )

    const projectId = routeProjectId || selectedProject?.projectId || null

    const [activeTab, setActiveTab] = useState("All Entries")
    const [allCEs, setAllCEs] = useState([])
    const [pagination, setPagination] = useState({
        total: 0, page: 1, limit: PER_PAGE,
        totalPages: 1, hasNext: false, hasPrev: false,
    })
    const [stats, setStats] = useState([])
    const [filters, setFilters] = useState({})

    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [rejectTarget, setRejectTarget] = useState(null)
    const [isRejecting, setIsRejecting] = useState(false)
    const [actionLoading, setActionLoading] = useState({})

    const controllerRef = useRef(null)
    const sentinelRef = useRef(null)
    const hasMoreRef = useRef(false)
    const allCEsRef = useRef([])
    const isBusyRef = useRef(false)
    const filtersRef = useRef(filters)
    const projectIdRef = useRef(projectId)
    const paginationRef = useRef(pagination)

    allCEsRef.current = allCEs
    filtersRef.current = filters
    projectIdRef.current = projectId
    paginationRef.current = pagination

    const fetchCEs = useCallback(async (page = 1, append = false, overrideFilters) => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        isBusyRef.current = true

        const f = overrideFilters ?? filtersRef.current
        const getVal = (key, fallback) => {
            const v = f[key]
            if (!v) return fallback
            return Array.isArray(v) ? v[v.length - 1] : v
        }

        try {
            if (!append) setIsRefreshing(true)
            else setIsLoadingMore(true)

            const { contraEntries, pagination: pag } = await fetchAllCEs({
                projectId: projectIdRef.current || undefined,
                page,
                limit: PER_PAGE,
                status: getVal("status", undefined),
                type: getVal("type", undefined),
                sortBy: getVal("sortBy", "createdAt"),
                order: getVal("order", "desc"),
                signal: controller.signal,
            })

            if (controller.signal.aborted) return

            const merged = append
                ? [...allCEsRef.current, ...contraEntries]
                : contraEntries

            setAllCEs(merged)
            setStats(computeCEStats(merged))
            setPagination(pag)
            hasMoreRef.current = pag.page < pag.totalPages

        } catch (err) {
            if (err.name === "CanceledError" || err.name === "AbortError") return
            toast.error("Failed to load contra entries", { description: formatCEError(err) })
            if (!append) { setAllCEs([]); setStats([]) }
        } finally {
            if (!controller.signal.aborted) {
                setIsInitialLoad(false)
                setIsRefreshing(false)
                setIsLoadingMore(false)
            }
            isBusyRef.current = false
        }
    }, [])

    useEffect(() => {
        fetchCEs(1, false, {})
    }, [])

    const prevProjectIdRef = useRef(projectId)
    useEffect(() => {
        if (prevProjectIdRef.current === projectId) return
        prevProjectIdRef.current = projectId
        fetchCEs(1, false, filtersRef.current)
    }, [projectId])

    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return }
        fetchCEs(1, false, filters)
    }, [filters])
    useEffect(() => {
        return () => controllerRef.current?.abort()
    }, [])
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel || activeTab !== "All Entries") return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMoreRef.current && !isBusyRef.current) {
                    fetchCEs(paginationRef.current.page + 1, true, filtersRef.current)
                }
            },
            { rootMargin: "100px", threshold: 0 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [activeTab])

    const reload = useCallback(() => fetchCEs(1, false, filtersRef.current), [fetchCEs])

    const debouncedReload = useRef(
        debounce(() => fetchCEs(1, false, filtersRef.current), 400)
    ).current

    const handleSearch = useCallback(() => debouncedReload(), [debouncedReload])
    const handleFilterChange = useCallback((selected) => setFilters(selected || {}), [])

    const handleProjectChange = useCallback((project) => {
        setSelectedProject(project || null)
    }, [])

    const patchCE = useCallback((id, updates) => {
        setAllCEs((prev) => {
            const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
            setStats(computeCEStats(next))
            return next
        })
    }, [])

    const handleSubmit = useCallback(async (row) => {
        const keycloakId = getKeycloakId()
        if (!keycloakId) { toast.error("Auth Error", { description: "Could not determine current user" }); return }
        setActionLoading((p) => ({ ...p, [row.id]: "submitting" }))
        try {
            await submitCE(row.id, keycloakId)
            toast.success("Submitted", { description: `${row.ceNumber} submitted for approval` })
            patchCE(row.id, { status: "Submitted" })
        } catch (err) {
            toast.error("Submit Failed", { description: formatCEError(err) })
        } finally {
            setActionLoading((p) => { const n = { ...p }; delete n[row.id]; return n })
        }
    }, [patchCE])

    const handleApprove = useCallback(async (row) => {
        const keycloakId = getKeycloakId()
        if (!keycloakId) { toast.error("Auth Error", { description: "Could not determine current user" }); return }
        setActionLoading((p) => ({ ...p, [row.id]: "approving" }))
        try {
            await approveCE(row.id, keycloakId)
            toast.success("Approved", { description: `${row.ceNumber} has been approved` })
            patchCE(row.id, { status: "Approved" })
        } catch (err) {
            toast.error("Approve Failed", { description: formatCEError(err) })
        } finally {
            setActionLoading((p) => { const n = { ...p }; delete n[row.id]; return n })
        }
    }, [patchCE])

    const handleRejectOpen = useCallback((row) => setRejectTarget(row), [])
    const handleRejectConfirm = useCallback(async (remarks) => {
        if (!rejectTarget) return
        const keycloakId = getKeycloakId()
        if (!keycloakId) { toast.error("Auth Error", { description: "Could not determine current user" }); return }
        setIsRejecting(true)
        try {
            await rejectCE(rejectTarget.id, keycloakId, remarks)
            toast.success("Rejected", { description: `${rejectTarget.ceNumber} has been rejected` })
            patchCE(rejectTarget.id, { status: "Rejected", rejectionRemarks: remarks })
            setRejectTarget(null)
        } catch (err) {
            toast.error("Reject Failed", { description: formatCEError(err) })
        } finally {
            setIsRejecting(false)
        }
    }, [rejectTarget, patchCE])

    const pendingCount = allCEs.filter((c) => c.status === "Submitted").length

    if (isInitialLoad) return <Loading />

    return (
        <div className="w-full mx-auto p-4  flex flex-col gap-2 bg-white dark:bg-[#121212] min-h-screen transition-colors duration-300 font-sfpro">

            <CEHeader
                title="Contra Entries"
                total={pagination.total}
                onSearch={activeTab === "All Entries" ? handleSearch : undefined}
                onFilterChange={activeTab === "All Entries" ? handleFilterChange : undefined}
                onAction={() => setIsAddOpen(true)}
                isRefreshing={isRefreshing}
                activeTab={activeTab}
                onProjectChange={!isInsideProjectRoute ? handleProjectChange : undefined}
                selectedProject={!isInsideProjectRoute ? selectedProject : undefined}
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-1 rounded-2xl bg-[#f7f7f7] dark:bg-[#18181b] p-1.5 border border-[#ececec] dark:border-[#252525] w-fit">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab
                    const showBadge = tab === "Approvals" && pendingCount > 0
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative h-10 px-4 sm:px-5 rounded-xl text-sm font-sfpro-medium transition-all whitespace-nowrap border flex items-center gap-2 ${isActive
                                    ? "bg-[#212121] text-white border-[#212121] shadow-sm dark:bg-white dark:text-black dark:border-white"
                                    : "bg-white text-[#3f3f46] border-transparent hover:bg-[#fafafa] hover:border-[#e5e7eb] dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:hover:bg-[#262626] dark:hover:border-[#3f3f46]"
                                }`}
                        >
                            {tab}
                            {showBadge && (
                                <span className={`flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] font-sfpro-bold ${isActive
                                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                    }`}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {activeTab === "All Entries" && stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 ">
                    {stats.map((stat, index) => (
                        <SummaryCard key={stat.id} item={stat} index={index} />
                    ))}
                </div>
            )}

            {activeTab === "All Entries" && (
                <>
                    <CETable
                        data={allCEs}
                        isLoading={isRefreshing}
                        onSubmit={handleSubmit}
                        onApprove={handleApprove}
                        onReject={handleRejectOpen}
                        actionLoading={actionLoading}
                    />
                    <div ref={sentinelRef} className="w-full py-4 flex flex-col items-center justify-center">
                        {isLoadingMore && (
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-sfpro">Loading more...</span>
                            </div>
                        )}
                        {!isLoadingMore && !hasMoreRef.current && allCEs.length > PER_PAGE && (
                            <p className="text-sm text-gray-400 dark:text-[#52525b] font-sfpro">
                                All {pagination.total} entries loaded
                            </p>
                        )}
                    </div>
                </>
            )}

            {activeTab === "Approvals" && (
                <CEApprovalTable
                    data={allCEs}
                    isLoading={isRefreshing}
                    onApprove={handleApprove}
                    onReject={handleRejectOpen}
                    actionLoading={actionLoading}
                />
            )}

            <AddCEModal
                open={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={() => { setIsAddOpen(false); reload() }}
                projectId={projectId}
            />

            <RejectModal
                isOpen={!!rejectTarget}
                onClose={() => { if (!isRejecting) setRejectTarget(null) }}
                onConfirm={handleRejectConfirm}
                title="Reject Contra Entry"
                description="Please provide a reason for rejecting this contra entry."
                itemName={rejectTarget?.ceNumber || ""}
                confirmText="Reject"
                remarkLabel="Rejection Reason"
                remarkPlaceholder="Explain why this entry is being rejected..."
                isLoading={isRejecting}
            />
        </div>
    )
}