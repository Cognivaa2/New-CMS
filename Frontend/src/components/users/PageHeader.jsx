"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"

const DEBOUNCE_DELAY = 300

export default function PageHeader({
  title,
  badgeCount,
  description,
  searchPlaceholder = "Search anything",
  actionText,
  ActionIcon,
  filters,
  onSearch,
  onFilter,
  onAction,
  isRefreshing,
}) {
  const [searchValue, setSearchValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const fireSearch = useCallback(
    (query) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      onSearch?.(query)
    },
    [onSearch]
  )

  const scheduleSearch = useCallback(
    (query) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        onSearch?.(query)
      }, DEBOUNCE_DELAY)
    },
    [onSearch]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchValue(value)
    scheduleSearch(value)
  }

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      fireSearch(searchValue)
    }
    if (e.key === "Escape") {
      e.preventDefault()
      if (searchValue) {
        setSearchValue("")
        fireSearch("")
      } else {
        inputRef.current?.blur()
      }
    }
  }

  const handleClearSearch = () => {
    setSearchValue("")
    fireSearch("")
    inputRef.current?.focus()
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (
        e.key === "/" &&
        !isFocused &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT" &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [isFocused])

  return (
    <div className="relative z-20 flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 transition-colors duration-300 font-sfpro">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors wrap-break-words">
            {title}
          </h1>

          {badgeCount !== undefined && (
            <span className="mt-1 flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-[#f4f4f5] dark:bg-[#121212] border border-gray-200 dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-bold transition-colors">
              {badgeCount}
            </span>
          )}
        </div>

        {description && (
          <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full sm:max-w-105 lg:max-w-70 leading-snug transition-colors">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
        {/* Search */}
        <div className="relative flex items-center w-full sm:w-[320px] lg:w-65 shrink-0">
          <Search
            className={`w-4 h-4 absolute left-3 transition-colors duration-200 ${isFocused ? "text-gray-700 dark:text-[#f4f4f5]" : "text-gray-400"
              }`}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full h-9 pl-9 pr-10 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-[13.5px] text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#3f3f46] transition-all duration-300 font-sfpro"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {searchValue ? (
              <button
                onClick={handleClearSearch}
                className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-[#d4d4d8] rounded-md transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div
                className={`hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-[10px] rounded-md w-5 h-5 font-sfpro-medium transition-all duration-200 ${isFocused ? "opacity-0 scale-75" : "opacity-100 scale-100"
                  }`}
              >
                /
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {filters && filters.length > 0 ? (
            <FilterOptions
              filters={filters}
              onChange={onFilter}
              align={isMobile ? "left" : "right"}
            />
          ) : (
            <button
              onClick={onFilter}
              className="flex items-center justify-center w-9 h-9 text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-[#f4f4f5] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-xl transition-colors duration-300 shrink-0 cursor-pointer"
              aria-label="Filter"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
          )}

          <button
            onClick={onAction}
            className="flex items-center justify-center gap-2 h-9 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 rounded-xl text-[13.5px] font-sfpro-medium transition-colors duration-300 flex-1 sm:flex-initial shrink-0 cursor-pointer"
          >
            {ActionIcon && <ActionIcon className="w-4 h-4 shrink-0" />}
            <span className="truncate">{actionText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}