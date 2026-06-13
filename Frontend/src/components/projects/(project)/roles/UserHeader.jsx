// src/components/users-and-roles/UserHeader.jsx
"use client"

import { Search, SlidersHorizontal, UserPlus } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"

export default function UserHeader({
  title,
  description,
  filters, 
  onSearch,
  onFilter,
  onAddUser,
}) {
  return (
    <div className="relative z-20 flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 transition-colors duration-300 font-sfpro">
      
      <div className="min-w-0">
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors wrap-break-words">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full sm:max-w-105 lg:max-w-70 leading-snug transition-colors">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        
        <div className="relative flex items-center w-full sm:w-[320px] lg:w-65">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search anything"
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-10 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-[13.5px] text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#3f3f46] transition-all duration-300 font-sfpro"
          />
          <div className="absolute right-2 hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-[10px] rounded-md w-5 h-5 font-sfpro-medium transition-colors duration-300">
            /
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {filters && filters.length > 0 ? (
            <FilterOptions 
              filters={filters} 
              onChange={onFilter} 
              align="right" 
            />
          ) : (
            <button
              onClick={onFilter}
              className="flex items-center justify-center w-9 h-9 text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-[#f4f4f5] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-xl transition-colors duration-300 shrink-0"
              aria-label="Filter"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
          )}

          <button
            onClick={onAddUser}
            className="flex items-center justify-center gap-2 h-9 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 rounded-xl text-[13.5px] font-sfpro-medium transition-colors duration-300 w-full sm:w-auto shrink-0"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span className="truncate">Add User</span>
          </button>
        </div>
      </div>
    </div>
  )
}