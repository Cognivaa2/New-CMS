"use client"

import { Search, SlidersHorizontal, CheckSquare } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"

export default function ApprovalHeader({
  title,
  badgeCount,
  description,
  searchPlaceholder = "Search anything",
  actionText = "New proposal",
  ActionIcon = CheckSquare,
  filters,
  onSearch,
  onFilter,
  onAction,
}) {
  return (
    <div className="relative z-20 flex flex-col lg:flex-row lg:items-start justify-between gap-6 w-full mb-8 transition-colors duration-300 font-sfpro">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight transition-colors break-word">
            <span className="text-[#a3a3a3] dark:text-[#858585]">{title}</span>
          </h1>
          {badgeCount !== undefined && (
            <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border border-transparent dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
              {badgeCount}
            </span>
          )}
        </div>
        <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full md:max-w-[80%] lg:max-w-[90%] leading-snug transition-colors">
          {description}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 mt-1 lg:mt-0">
        <div className="relative flex items-center w-full sm:w-65 md:w-[320px] lg:w-70 xl:w-[320px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-10 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-full text-[13.5px] text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#3f3f46] transition-all duration-300 font-sfpro"
          />
          <div className="absolute right-2 hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-[10px] rounded-md w-5 h-5 font-sfpro-medium transition-colors duration-300 shrink-0">
            /
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
              className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-[#f4f4f5] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-xl transition-colors duration-300 shrink-0"
              aria-label="Filter"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
          )}

          <button
            onClick={onAction} 
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 h-10 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-5 rounded-xl text-[13.5px] font-sfpro-medium transition-colors duration-300 shrink-0"
          >
            {ActionIcon && <ActionIcon className="w-4 h-4 shrink-0" />}
            <span className="truncate">{actionText}</span>
          </button>

        </div>
      </div>
    </div>
  )
}