
"use client"

import { useState, useEffect } from "react"
import { Search, SlidersHorizontal, PlusSquare, X } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"

export default function MaterialHeader({
  title = "Material Master List",
  badgeCount,
  description,
  searchPlaceholder = "Search materials...",
  actionText = "Add Material",
  ActionIcon = PlusSquare,
  filters,
  onSearch,
  onFilter,
  onAction,
}) {
  const [searchValue, setSearchValue] = useState("")
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(e.target.tagName)
      ) {
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
    <div className="w-full flex flex-col gap-6 mb-8 font-sfpro transition-all">
      <div className="relative z-20 flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full transition-colors duration-300">

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] sm:text-[38px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight transition-colors">
              <span className="text-[#a3a3a3] dark:text-[#858585]">{title}</span>
            </h1>
            {badgeCount !== undefined && (
              <span className="mt-1 flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-[#f4f4f5] dark:bg-[#121212] border border-gray-200 dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-bold transition-colors">
                {badgeCount}
              </span>
            )}
          </div>
          <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full md:max-w-[80%] lg:max-w-[90%] leading-snug transition-colors">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0 mt-1 lg:mt-0">

          <div className="relative flex items-center w-full sm:w-64 md:w-75 lg:w-72 xl:w-[320px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 shrink-0 pointer-events-none" />

            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full h-9 pl-9 pr-10 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-[13.5px] text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#3f3f46] transition-all duration-300 font-sfpro"
            />

            <div className="absolute right-3 flex items-center">
              {showClearButton ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-[10px] rounded-md w-5 h-5 font-sfpro-medium transition-colors shrink-0">
                  /
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {filters && filters.length > 0 ? (
              <div className="shrink-0">
                <FilterOptions
                  filters={filters}
                  onChange={onFilter}
                  align="right"
                />
              </div>
            ) : (
              <button
                onClick={onFilter}
                className="flex items-center justify-center w-11 h-11 border border-gray-200 dark:border-[#27272a] text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-[#f4f4f5] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-xl transition-colors shrink-0"
                aria-label="Filter"
              >
                <SlidersHorizontal className="w-4.5 h-4.5" />
              </button>
            )}

            <button
              onClick={onAction}
              className="flex items-center justify-center gap-2 h-9 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 rounded-xl text-[13.5px] font-sfpro-medium transition-colors duration-300 flex-1 sm:flex-initial shrink-0 cursor-pointer"
            >
              {ActionIcon && (
                <ActionIcon className="w-4.5 h-4.5 shrink-0" strokeWidth={2.5} />
              )}
              <span className="truncate">{actionText}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}