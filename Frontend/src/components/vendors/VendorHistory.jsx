"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { fetchVendorHistory, formatVendorError } from "@/app/(companyname)/vendors/api"
import { toast } from "sonner"

function HistoryRow({ row }) {
  return (
    <div className="grid grid-cols-[1.2fr_1.2fr_1.8fr_1fr_60px] items-center
      py-5 border-b border-gray-100 dark:border-[#27272a] last:border-0
      hover:bg-gray-50/50 dark:hover:bg-[#18181b]/50 transition-colors px-2 rounded-xl"
    >
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-400 font-sfpro-medium mb-1.5">
          Requested Module
        </span>
        <span className="text-[15px] font-sfpro-bold text-gray-900 dark:text-white">
          {row.module || "—"}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[11px] text-gray-400 font-sfpro-medium mb-1.5">
          Unique Id
        </span>
        <span className="text-[15px] font-sfpro-bold text-gray-900 dark:text-white">
          #{row.uniqueId || "—"}
        </span>
      </div>

      <div className="flex flex-col min-w-0 pr-4">
        <span className="text-[11px] text-gray-400 font-sfpro-medium mb-1.5">
          Requested for
        </span>
        <span className="text-[15px] font-sfpro-bold text-gray-900 dark:text-white truncate">
          {row.requestedFor || "—"}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[11px] text-gray-400 font-sfpro-medium mb-1.5">
          Status
        </span>
        <span className="text-[15px] font-sfpro-bold text-gray-900 dark:text-white capitalize">
          {row.status || "—"}
        </span>
      </div>

      {/* Avatar */}
      {/* <div className="flex justify-end">
        {row.userAvatar ? (
          <img
            src={row.userAvatar}
            alt="user"
            style={{ width: 42, height: 42, minWidth: 42, minHeight: 42 }}
            className="rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm shrink-0"
            onError={(e) => { e.target.style.display = "none" }}
          />
        ) : (
          <div
            style={{ width: 42, height: 42, minWidth: 42, minHeight: 42 }}
            className="rounded-full bg-gray-200 dark:bg-[#27272a] ring-2 ring-white dark:ring-gray-800 shadow-sm shrink-0"
          />
        )}
      </div> */}
    </div>
  )
}

function FilterBar({ filters, onChange }) {
  const MODULE_OPTIONS = [
    { value: "",   label: "All" },
    { value: "PO", label: "PO"  },
    { value: "MR", label: "MR"  },
  ]

  return (
    <div className="flex items-center justify-end mb-5 shrink-0">
      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1a1a1d] p-1 rounded-xl">
        {MODULE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, module: opt.value, page: 1 })}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-sfpro-bold transition-all ${
              filters.module === opt.value
                ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Pagination({ pagination, onPage }) {
  if (pagination.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-4 shrink-0
      border-t border-gray-50 dark:border-[#27272a] mt-2"
    >
      <p className="text-[12px] text-gray-400 font-sfpro">
        Page {pagination.page} of {pagination.totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(pagination.page - 1)}
          disabled={!pagination.hasPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            border border-gray-200 dark:border-[#27272a]
            text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a]
            disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPage(pagination.page + 1)}
          disabled={!pagination.hasNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            border border-gray-200 dark:border-[#27272a]
            text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a]
            disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function VendorHistory({ vendorId }) {
  const [history,    setHistory]    = useState([])
  const [pagination, setPagination] = useState({
    total: 0, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false,
  })
  const [filters, setFilters] = useState({
    module: "", status: "", sortOrder: "desc", page: 1, limit: 10,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const controllerRef = useRef(null)

  const load = useCallback(async (currentFilters, isInitial = false) => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    if (isInitial) setIsLoading(true)
    else           setIsPageLoading(true)

    try {
      const result = await fetchVendorHistory({
        vendorId,
        ...currentFilters,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      setHistory(result.history)
      setPagination(result.pagination)
    } catch (err) {
      if (err.name === "CanceledError") return
      toast.error("Failed to load history", { description: formatVendorError(err) })
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
        setIsPageLoading(false)
      }
    }
  }, [vendorId])

  useEffect(() => {
    load(filters, true)
    return () => controllerRef.current?.abort()
  }, [vendorId]) 
  useEffect(() => {
    load(filters, false)
  }, [filters]) 

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
  }, [])

  const handlePage = useCallback((newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-sfpro">Loading history...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">

      <FilterBar filters={filters} onChange={handleFilterChange} />

      {/* list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {isPageLoading && (
          <div className="absolute inset-0 flex items-center justify-center
            bg-white/60 dark:bg-[#121212]/60 backdrop-blur-sm z-10 rounded-xl"
          >
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-[14px] font-sfpro-medium text-gray-400 dark:text-[#71717a]">
              No procurement records found
            </p>
            <p className="text-[12px] text-gray-300 dark:text-[#52525b] mt-1">
              Purchase orders and material requisitions will appear here
            </p>
          </div>
        ) : (
          history.map((row, i) => (
            <HistoryRow key={row.refId || `${row.uniqueId}-${i}`} row={row} />
          ))
        )}
      </div>

      <Pagination pagination={pagination} onPage={handlePage} />
    </div>
  )
}