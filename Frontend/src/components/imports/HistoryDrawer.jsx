"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Loader2, RefreshCw } from "lucide-react"
import { fetchImportHistory, IMPORT_MODULES } from "@/app/(companyname)/imports/api"
import { Select } from "@/components/ui/DropDown"
import HistoryTable from "./HistoryTable"

function Backdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
        />
    )
}

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "partial", label: "Partial" },
    { value: "failed", label: "Failed" },
]

const MODULE_OPTIONS = IMPORT_MODULES.map((m) => ({ value: m.key, label: m.label }))

export default function HistoryDrawer({ open, onClose, onViewJob }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [jobs, setJobs] = useState([])
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
    const [isLoading, setIsLoading] = useState(false)
    const [filterModule, setFilterModule] = useState(null)
    const [filterStatus, setFilterStatus] = useState(null)

    useEffect(() => {
        if (open) {
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setJobs([])
                setFilterModule(null)
                setFilterStatus(null)
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        if (open) document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = "" }
    }, [open])

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && open) onClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose])

    const loadHistory = useCallback(async (page = 1) => {
        setIsLoading(true)
        try {
            const { jobs: fetched, pagination: pag } = await fetchImportHistory({
                page,
                limit: 20,
                module: filterModule || undefined,
                status: filterStatus || undefined,
            })
            if (page === 1) {
                setJobs(fetched)
            } else {
                setJobs((prev) => [...prev, ...fetched])
            }
            setPagination(pag)
        } catch {
        } finally {
            setIsLoading(false)
        }
    }, [filterModule, filterStatus])

    useEffect(() => {
        if (open) loadHistory(1)
    }, [open, filterModule, filterStatus, loadHistory])

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />
            <div
                style={{
                    transitionDuration: "700ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
                    }`}
            >
                <div className="w-full bg-[#FAFAFA] dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-zinc-800 rounded-t-2xl max-h-[92dvh] flex flex-col">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                    </div>

                    <div className="flex items-center justify-between px-6 lg:px-10 pt-5 pb-4 shrink-0">
                        <div>
                            <h2 className="text-xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                                Import History
                            </h2>
                            <p className="text-sm font-sfpro text-gray-400 dark:text-zinc-500 mt-0.5">
                                {pagination.total} total job{pagination.total !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadHistory(1)}
                                disabled={isLoading}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-300 ${isLoading ? "animate-spin" : ""}`} />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-6 lg:px-10 pb-4 shrink-0">
                        <div className="w-48">
                            <Select
                                options={MODULE_OPTIONS}
                                value={filterModule}
                                onChange={setFilterModule}
                                placeholder="All modules"
                                width="w-full"
                            />
                        </div>
                        <div className="w-40">
                            <Select
                                options={STATUS_OPTIONS}
                                value={filterStatus}
                                onChange={setFilterStatus}
                                placeholder="All statuses"
                                width="w-full"
                            />
                        </div>
                        {(filterModule || filterStatus) && (
                            <button
                                onClick={() => { setFilterModule(null); setFilterStatus(null) }}
                                className="text-[12px] font-sfpro-medium text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-zinc-800 shrink-0" />

                    <div
                        className="flex-1 overflow-y-auto px-6 lg:px-10 py-5"
                        style={{ scrollbarWidth: "thin" }}
                    >
                        {isLoading && jobs.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <>
                                <HistoryTable
                                    jobs={jobs}
                                    hasFilters={!!filterModule || !!filterStatus}
                                    onViewJob={(job) => {
                                        onViewJob?.(job)
                                    }}
                                />

                                {pagination.page < pagination.totalPages && (
                                    <div className="flex justify-center mt-6">
                                        <button
                                            onClick={() => loadHistory(pagination.page + 1)}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-sfpro-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            Load more
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}