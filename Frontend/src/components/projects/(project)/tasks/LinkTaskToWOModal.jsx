"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    X, Link2, Search, Loader2, CheckCircle2,
    Building2, CalendarDays, AlertCircle,
} from "lucide-react"
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts"
import { fetchWOLookup, linkTaskToWO } from "@/app/(companyname)/projects/[projectId]/phases/[phaseId]/api"

function formatDate(dateStr) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

function debounce(fn, delay = 350) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

const STATUS_CONFIG = {
    Approved: {
        label: "Approved",
        className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30",
    },
    InProgress: {
        label: "In Progress",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",
    },
}
function StatusPill({ status }) {
    const config = STATUS_CONFIG[status] || {
        label: status,
        className: "bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-[#888] border border-gray-200 dark:border-[#333]",
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-sfpro-bold uppercase tracking-wide ${config.className}`}>
            {config.label}
        </span>
    )
}
function ProgressRing({ percent = 0 }) {
    const clamped = Math.min(Math.max(percent, 0), 100)
    const data = [{ value: clamped }]

    return (
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        data={data}
                        barSize={4}
                    >
                        {/* track */}
                        <RadialBar
                            dataKey="value"
                            cornerRadius={4}
                            background={{ fill: "transparent" }}
                            fill="url(#progressGrad)"
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-out"
                            max={100}
                        />
                        <defs>
                            <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>
            <span className="text-[11px] font-sfpro-medium text-gray-600 dark:text-[#aaa]">
                {clamped}% complete
            </span>
        </div>
    )
}
function WOCard({ wo, isSelected, onSelect }) {
    const percent = wo.completionPercent || 0
    const clamped = Math.min(Math.max(percent, 0), 100)
    const isDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches

    return (
        <button
            type="button"
            onClick={() => onSelect(wo)}
            style={{
                backgroundColor: isSelected
                    ? undefined
                    : "var(--card-bg)",
            }}
            className={[
                "w-full text-left p-4 rounded-2xl border-2",
                "transition-all duration-200 group",
                isSelected
                    ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-[#242424]"
                    : "border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e]!",
                !isSelected && "hover:border-gray-300 dark:hover:border-[#3a3a3a] hover:bg-gray-50 dark:hover:bg-[#242424]",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#666] uppercase tracking-wider">
                            {wo.woNumber}
                        </span>
                        <StatusPill status={wo.status} />
                    </div>
                    <p className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white leading-snug truncate">
                        {wo.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        {wo.vendorName && (
                            <span className="flex items-center gap-1.5 text-[11px] font-sfpro text-gray-500 dark:text-[#777]">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-30">{wo.vendorName}</span>
                            </span>
                        )}
                        {wo.expectedEndDate && (
                            <span className="flex items-center gap-1.5 text-[11px] font-sfpro text-gray-500 dark:text-[#777]">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                                {formatDate(wo.expectedEndDate)}
                            </span>
                        )}
                        {wo.totalContractValue > 0 && (
                            <span className="text-[11px] font-sfpro-medium text-gray-600 dark:text-[#aaa]">
                                ₹{wo.totalContractValue.toLocaleString("en-IN")}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <div className="relative flex-1 min-w-0 h-2 rounded-full bg-gray-200 dark:bg-[#333] overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{
                                    width: `${clamped}%`,
                                     background: isDark
                            ? "linear-gradient(to right, #c0c0c0, #c0c0c0)"
                            : "linear-gradient(to right, #404040, #111111)",
                                    transition: "width 0.5s ease-out",
                                }}
                            />
                        </div>
                        {/* label */}
                        <span className="shrink-0 text-[11px] font-sfpro-medium text-gray-500 dark:text-[#888] w-8 text-right">
                            {clamped}%
                        </span>
                    </div>

                </div>
                <div className="shrink-0 pt-1">
                    {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-gray-900 dark:text-white" strokeWidth={2} />
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-[#555] group-hover:border-gray-400 dark:group-hover:border-[#777] transition-colors" />
                    )}
                </div>
            </div>
        </button>
    )
}
function EmptyState({ query }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1f1f1f] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-gray-400 dark:text-[#555]" />
            </div>
            <div>
                <p className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#aaa]">
                    {query?.trim()
                        ? `No work orders matching "${query}"`
                        : "No active work orders found"
                    }
                </p>
                <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#555] mt-0.5">
                    Only Approved or In Progress work orders can be linked
                </p>
            </div>
        </div>
    )
}
function SkeletonCard() {
    return (
        <div className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-[#252525] dark:bg-[#1e1e1e] animate-pulse">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-16 bg-gray-200 dark:bg-[#2a2a2a] rounded" />
                        <div className="h-4 w-20 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                    </div>
                    <div className="h-4 w-2/3 bg-gray-200 dark:bg-[#2a2a2a] rounded" />
                    <div className="flex gap-3">
                        <div className="h-3 w-20 bg-gray-100 dark:bg-[#252525] rounded" />
                        <div className="h-3 w-24 bg-gray-100 dark:bg-[#252525] rounded" />
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-[#252525] rounded-full" />
                </div>
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2a2a2a] shrink-0" />
            </div>
        </div>
    )
}
export default function LinkTaskToWOModal({
    isOpen,
    onClose,
    projectId,
    phaseId,
    task,
    onSuccess,
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [wos, setWos] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [selectedWO, setSelectedWO] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const fetchAbort = useRef(null)
    const searchInputRef = useRef(null)
    

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    setVisible(true)
                    setTimeout(() => searchInputRef.current?.focus(), 100)
                })
            )
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setSearch("")
                setSelectedWO(null)
                setWos([])
                setError(null)
            }, 300)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    useEffect(() => {
        const fn = (e) => {
            if (e.key === "Escape" && isOpen && !submitting) onClose()
        }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [isOpen, submitting, onClose])

    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden"
        else document.body.style.overflow = ""
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    const doFetch = useCallback(async (q) => {
        if (!projectId || !isOpen) return
        fetchAbort.current?.abort()
        const ctrl = new AbortController()
        fetchAbort.current = ctrl
        setIsLoading(true)
        setError(null)
        try {
            const result = await fetchWOLookup(projectId, q, ctrl.signal)
            if (!ctrl.signal.aborted) setWos(result)
        } catch (err) {
            if (err.name !== "CanceledError" && err.name !== "AbortError") {
                setError("Failed to load work orders")
            }
        } finally {
            if (!ctrl.signal.aborted) setIsLoading(false)
        }
    }, [projectId, isOpen])

    useEffect(() => {
        if (isOpen && projectId) doFetch("")
        return () => fetchAbort.current?.abort()
    }, [isOpen, projectId, doFetch])

    const debouncedFetch = useRef(debounce((q) => doFetch(q), 350)).current

    const handleSearchChange = (e) => {
        const q = e.target.value
        setSearch(q)
        setSelectedWO(null)
        debouncedFetch(q)
    }

    const handleSubmit = async () => {
        if (!selectedWO || !task?.id || submitting) return
        setSubmitting(true)
        setError(null)
        try {
            await linkTaskToWO(projectId, phaseId, task.id, selectedWO.woId, "link")
            onSuccess?.({ task, wo: selectedWO })
            onClose()
        } catch (err) {
            setError(err.message || "Failed to link task to work order")
        } finally {
            setSubmitting(false)
        }
    }

    if (!mounted) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className={`absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm
                    transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
                onClick={!submitting ? onClose : undefined}
            />
            <div
                className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden
                    transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                    bg-white dark:bg-[#141414]
                    ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"}`}
            >
                <div className="flex items-start justify-between gap-4 p-6 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-[#222] flex items-center justify-center shrink-0">
                            <Link2 className="w-4 h-4 text-gray-900 dark:text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-sfpro-bold text-gray-900 dark:text-white leading-tight">
                                Link to Work Order
                            </h2>
                            <p className="text-[12px] font-sfpro text-gray-400 dark:text-[#666] mt-0.5 truncate max-w-57.5">
                                {task?.taskName || "Task"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={!submitting ? onClose : undefined}
                        disabled={submitting}
                        className="p-1 rounded-full bg-[#212121] dark:bg-white flex items-center justify-center
                            hover:scale-90 transition-transform duration-200 cursor-pointer
                            disabled:opacity-40 shrink-0 mt-0.5"
                    >
                        <X className="w-4 h-4 text-white dark:text-black" strokeWidth={2.5} />
                    </button>
                </div>

                <div className="h-px bg-gray-100 dark:bg-[#222]" />
                <div className="px-6 pt-4 pb-3">
                    <div className="relative flex items-center">
                        <Search
                            className="absolute left-3 w-3.5 h-3.5 text-gray-400 dark:text-[#555] pointer-events-none"
                            strokeWidth={2}
                        />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search by WO number, title or vendor…"
                            value={search}
                            onChange={handleSearchChange}
                            disabled={submitting}
                            className="w-full h-9 pl-9 pr-3 rounded-xl text-[13px] font-sfpro
                                bg-gray-50 dark:bg-[#1e1e1e]
                                border border-gray-200 dark:border-[#2a2a2a]
                                text-gray-900 dark:text-white
                                placeholder:text-gray-400 dark:placeholder:text-[#555]
                                focus:outline-none focus:ring-2
                                focus:ring-gray-200 dark:focus:ring-[#333]
                                transition-all disabled:opacity-50"
                        />
                    </div>
                    {!isLoading && wos.length > 0 && (
                        <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#555] mt-2">
                            {wos.length} work order{wos.length !== 1 ? "s" : ""} available
                        </p>
                    )}
                </div>
                <div
                    className="px-6 pb-3 overflow-y-auto flex flex-col gap-2"
                    style={{ maxHeight: "340px", scrollbarWidth: "thin" }}
                >
                    {isLoading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : wos.length === 0 ? (
                        <EmptyState query={search} />
                    ) : (
                        wos.map((wo) => (
                            <WOCard
                                key={wo.woId}
                                wo={wo}
                                isSelected={selectedWO?.woId === wo.woId}
                                onSelect={setSelectedWO}
                            />
                        ))
                    )}
                </div>
                {error && (
                    <div className="px-6 pb-3">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                            bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <p className="text-[12px] font-sfpro text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    </div>
                )}

                <div className="h-px bg-gray-100 dark:bg-[#222]" />
                <div className="flex items-center justify-between gap-3 px-6 py-4">
                    <div className="flex-1 min-w-0">
                        {selectedWO ? (
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                <span className="text-[12px] font-sfpro text-gray-500 dark:text-[#888] truncate">
                                    <span className="font-sfpro-medium text-gray-900 dark:text-white">
                                        {selectedWO.woNumber}
                                    </span>{" "}selected
                                </span>
                            </div>
                        ) : (
                            <p className="text-[12px] font-sfpro text-gray-400 dark:text-[#555]">
                                Select a work order above
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={!submitting ? onClose : undefined}
                            disabled={submitting}
                            className="px-4 py-2.5 text-[13px] font-sfpro-medium rounded-xl
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-[#1e1e1e]
                                transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedWO || submitting}
                            className="px-5 py-2.5 text-[13px] font-sfpro-medium rounded-xl
                                bg-gray-900 dark:bg-white text-white dark:text-black
                                hover:bg-black dark:hover:bg-gray-200
                                transition-colors disabled:opacity-40
                                flex items-center gap-2 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Linking…
                                </>
                            ) : (
                                <>
                                    <Link2 className="w-3.5 h-3.5" />
                                    Link
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}