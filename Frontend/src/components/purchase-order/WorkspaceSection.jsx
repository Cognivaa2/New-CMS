"use client"

import { useState, useEffect } from "react"
import { Search, AlertCircle, X } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"
import ProjectSelectDropdown from "@/components/ui/ProjectSelectDropdown"
import POTable from "./POTable"

export default function WorkspaceSection({
  meta,
  headers,
  data,
  filters,
  isLoading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  error = null,
  onSearch,
  onFilterChange,
  onProjectChange,
  selectedProject = null,
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
    <div className="mt-12 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-[24px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {meta.title}
          </h2>
          <p className="text-[13px] text-zinc-400 dark:text-zinc-500 max-w-md font-sfpro">
            {meta.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex items-center w-full sm:w-[320px] lg:w-65">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={meta.searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#444444] transition-all duration-300 font-sfpro"
            />
            <div className="absolute right-2.5 flex items-center">
              {showClearButton ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
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

          <div className="flex items-center gap-3">
            <FilterOptions
              filters={filters}
              align="right"
              onChange={(selectedFilters) => onFilterChange?.(selectedFilters)}
            />
            <ProjectSelectDropdown
              align="right"
              value={selectedProject?.projectId ?? null}
              onChange={onProjectChange}
            />
          </div>
        </div>
      </div>

      {error && !isLoading && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-[13px] font-sfpro">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <POTable
        headers={headers}
        data={data}
        isLoading={isLoading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    </div>
  )
}