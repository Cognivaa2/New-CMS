"use client"

import { Search, SlidersHorizontal, X, Loader2, Plus } from "lucide-react"
import { useState } from "react"
import FilterOptions from "@/components/ui/FilterOptions"
import  Tooltip  from "@/components/ui/Tooltip"

const INVENTORY_FILTERS = [
  {
    key: "stockStatus",
    label: "Stock Status",
    options: [
      { value: "Critical", label: "Critical" },
      { value: "Low", label: "Low" },
      { value: "Good", label: "Good" },
      { value: "Excellent", label: "Excellent" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { value: "createdAt", label: "Date Added" },
      { value: "name", label: "Name" },
      { value: "category", label: "Category" },
      { value: "currentStock", label: "Stock" },
      { value: "pricePerUnit", label: "Price" },
    ],
  },
]

export default function InventoryPageHeader({
  count = 0,
  total = 0,
  isRefreshing = false,
  onSearch,
  onFilterChange,
  onAddMaterial,
  activeTab,
}) {
  const [searchValue, setSearchValue] = useState("")
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchValue(val)
    onSearch?.(val)
  }

  const handleClearSearch = () => {
    setSearchValue("")
    onSearch?.("")
  }


  const showInventoryControls = activeTab === "Inventory"

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 font-sfpro">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight">
            <span className="text-[#a3a3a3] dark:text-[#858585]">Project / </span>
            <span className="text-[#09090b] dark:text-[#f4f4f5]">Inventory</span>
          </h1>
          {total > 0 && (
            <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border dark:border-[#353535] border-[#dfdfdf] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium">
              {total}
            </span>
          )}
          {isRefreshing && (
            <Loader2 className="w-4 h-4 text-[#71717a] animate-spin mt-1" />
          )}
        </div>
        <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full sm:max-w-105 lg:max-w-70 leading-snug">
          {activeTab === "Inventory"
            ? "Manage materials and track stock levels for this project"
            : "Review and manage stock adjustment requests"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        {showInventoryControls && (
          <div className="relative flex items-center w-full sm:w-[320px] lg:w-65">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#444444] transition-all duration-300 font-sfpro"
            />
            <div className="absolute right-2.5 flex items-center">
              {searchValue ? (
                <button
                  onClick={handleClearSearch}
                  className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-xs rounded-md w-6 h-6 font-sfpro-medium">
                  /
                </div>
              )}
            </div>
          </div>
        )}

        {showInventoryControls && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="shrink-0">
              <FilterOptions
                filters={INVENTORY_FILTERS}
                align="right"
                onChange={(selected) => onFilterChange?.(selected)}
              />
            </div>
            <Tooltip content="Add Materials to This Project" side="left">
            <button
              onClick={onAddMaterial}
              className="cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 rounded-xl text-sm font-sfpro-bold transition-colors duration-300"
            >
              <Plus className="w-4 h-4" />
              <span>Add Material</span>
            </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}