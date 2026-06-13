// components/projects/(project)/documents/PageHeader.jsx
"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, X } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"
import Tooltip from "@/components/ui/Tooltip"

export default function PageHeader({
  title,
  badge,
  description,
  searchPlaceholder = "Search anything...",
  actionText,
  ActionIcon,
  onSearch,
  filters = [],
  onFilterChange,
  onAction,
  isRefreshing = false,
  actionDisabled = false,
}) {
  const [searchValue, setSearchValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)

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
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 transition-colors duration-300 font-sfpro">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#09090b] dark:text-[#f4f4f5] leading-none tracking-tight transition-colors">
            {title}
          </h1>

          {badge !== undefined && (
            <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border dark:border-[#353535] border-[#dfdfdf] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
              {badge}
            </span>
          )}

          {isRefreshing && (
            <Loader2 className="w-4 h-4 text-[#71717a] animate-spin mt-1" />
          )}
        </div>

        {description && (
          <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full sm:max-w-105 lg:max-w-70 leading-snug transition-colors">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        <div className="relative flex items-center w-full sm:w-[320px] lg:w-65">
          <Search
            className={`w-5 h-5 absolute left-3 pointer-events-none transition-colors duration-200 ${
              isFocused
                ? "text-gray-600 dark:text-gray-300"
                : "text-gray-400 dark:text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#444444] focus:border-gray-300 dark:focus:border-[#444444] transition-all duration-300 font-sfpro"
          />
          <div className="absolute right-2.5 flex items-center">
            {showClearButton ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-xs rounded-md w-6 h-6 font-sfpro-medium transition-colors duration-300">
                /
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {filters.length > 0 && (
            <div className="shrink-0">
              <FilterOptions
                filters={filters}
                align="right"
                onChange={(selectedFilters) => onFilterChange?.(selectedFilters)}
              />
            </div>
          )}

          <div className="flex-1 sm:flex-initial">
            <Tooltip content={actionText} side="left">
              <button
                onClick={onAction}
                disabled={actionDisabled}
                className="cursor-pointer w-full flex items-center justify-center gap-2 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white dark:text-black px-4 py-2.5 rounded-xl text-sm font-sfpro-bold transition-colors duration-300"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span className="truncate">{actionText}</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}