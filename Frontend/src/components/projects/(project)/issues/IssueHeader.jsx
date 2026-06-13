// src/components/projects/(project)/issues/IssueHeader.jsx

"use client"

import { useState } from "react"
import { Search, Plus, X, Loader2 } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"

export default function IssueHeader({
    title,
    badgeCount,
    description,
    searchPlaceholder = "Search issues...",
    actionText = "New Issue",
    ActionIcon = Plus,
    filters,
    onSearch,
    onFilter,
    onAction,
    isRefreshing = false,
}) {
    const [searchValue, setSearchValue] = useState("")

    const handleSearchChange = (e) => {
        const value = e.target.value
        setSearchValue(value)
        onSearch?.(value)
    }

    const handleClearSearch = () => {
        setSearchValue("")
        onSearch?.("")
    }

    const showClearButton = searchValue.length > 0

    return (
        <div className="relative z-20 flex flex-col lg:flex-row lg:items-start justify-between gap-6 w-full mb-8 transition-colors duration-300 font-sfpro">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight transition-colors break-word">
                        <span className="text-[#a3a3a3] dark:text-[#858585]">
                            {title}
                        </span>
                    </h1>
                    {badgeCount !== undefined && (
                        <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border border-transparent dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
                            {badgeCount}
                        </span>
                    )}
                    {isRefreshing && (
                        <Loader2 className="w-4 h-4 text-[#71717a] animate-spin mt-1" />
                    )}
                </div>
                <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full md:max-w-[80%] lg:max-w-[90%] leading-snug transition-colors">
                    {description}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 mt-1 lg:mt-0">
                {/* Search */}
                <div className="relative flex items-center w-full sm:w-65 md:w-[320px] lg:w-70 xl:w-[320px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 shrink-0" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={handleSearchChange}
                        className="w-full h-9 pl-9 pr-10 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-[13.5px] text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#3f3f46] transition-all duration-300 font-sfpro"
                    />
                    <div className="absolute right-2 flex items-center">
                        {showClearButton ? (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-[10px] rounded-md w-5 h-5 font-sfpro-medium transition-colors duration-300 shrink-0">
                                /
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter + Action */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {filters && filters.length > 0 && (
                        <div className="shrink-0">
                            <FilterOptions
                                filters={filters}
                                onChange={onFilter}
                                align="right"
                            />
                        </div>
                    )}

                    <button
                        onClick={onAction}
                        className="cursor-pointer flex flex-1 sm:flex-none items-center justify-center gap-2 h-9 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 rounded-xl text-[13.5px] font-sfpro-medium transition-colors duration-300 shrink-0"
                    >
                        {ActionIcon && (
                            <ActionIcon className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{actionText}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}