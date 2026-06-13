"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Upload, X, Loader2 } from "lucide-react"
import Tooltip from "@/components/ui/Tooltip"
import FilterOptions from "@/components/ui/FilterOptions"

const EXPENSE_FILTERS = [
  {
    key: "type",
    label: "Type",
    options: [
      { value: "Commitment", label: "Commitment" },
      { value: "Actual",     label: "Actual" },
      { value: "Manual",     label: "Manual Entry" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Pending",  label: "Pending" },
      { value: "Approved", label: "Approved" },
      { value: "Rejected", label: "Rejected" },
      { value: "Paid",     label: "Paid" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { value: "createdAt",   label: "Created Date" },
      { value: "amount",      label: "Amount" },
      { value: "expenseDate", label: "Expense Date" },
    ],
  },
  {
    key: "order",
    label: "Order",
    options: [
      { value: "desc", label: "Newest First" },
      { value: "asc",  label: "Oldest First" },
    ],
  },
]

export default function ExpenseHeader({
  title        = "Expenses",
  description,
  onSearch,
  onFilter,
  onAddExpense,
  onExport,
  isExporting  = false,
  isRefreshing = false,
  total        = 0,
}) {
  const [searchValue, setSearchValue] = useState("")

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault()
        document.querySelector('input[placeholder*="Search"]')?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleClearSearch = () => {
    setSearchValue("")
    onSearch?.("")
    document.querySelector('input[placeholder*="Search"]')?.focus()
  }

  const showClearButton = searchValue.length > 0

  return (
    <div className="relative z-20 flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full mb-8 font-sfpro transition-all duration-300">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors break-word">
            {title}
          </h1>
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-[#71717a] animate-spin mt-1" />
          ) : total > 0 ? (
            <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
              {total}
            </span>
          ) : null}
        </div>
        <p className="text-[13.5px] sm:text-[14.5px] text-gray-400 dark:text-gray-500 mt-3 max-w-lg leading-relaxed">
          {description || "Track all project costs — commitments, actuals, and manual entries."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        <div className="relative w-full sm:w-[320px] lg:w-75">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>

          <input
            type="text"
            placeholder="Search expenses..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#444444] transition-all duration-300 font-sfpro"
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
            {showClearButton ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center justify-center w-5 h-5 rounded-md bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-400 dark:text-[#a1a1aa] text-[11px] font-sfpro-bold transition-colors duration-300">
                /
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="shrink-0">
            <FilterOptions
              filters={EXPENSE_FILTERS}
              align="right"
              onChange={(selectedFilters) => onFilter?.(selectedFilters)}
            />
          </div>

          <div className="flex-1 sm:flex-initial">
            <Tooltip content="Add a new expense" side="bottom">
              <button
                onClick={onAddExpense}
                className="cursor-pointer w-full flex items-center justify-center gap-2 h-11 bg-[#1c1c1c] dark:bg-white text-white dark:text-black px-5 rounded-xl text-[14px] font-sfpro-bold hover:opacity-90 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
                <span className="truncate">Add Expense</span>
              </button>
            </Tooltip>
          </div>

          <div className="shrink-0">
            <Tooltip content="Export expenses" side="left">
              <button
                onClick={onExport}
                disabled={isExporting}
                className="cursor-pointer flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f9f9f9] dark:hover:bg-[#1f1f1f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}