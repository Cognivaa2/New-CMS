"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, ListTodo } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"
import { fetchSubTaskLookup } from "@/app/(companyname)/projects/[projectId]/Consumption/api"

const CONSUMPTION_FILTERS = [
    {
        key: "source",
        label: "Source",
        options: [
            { value: "StockIssue", label: "Stock Issue" },
            { value: "DPRSync", label: "DPR Sync" },
        ],
    },
    {
        key: "isWOConsumption",
        label: "Type",
        options: [
            { value: "true", label: "WO Consumption" },
            { value: "false", label: "Stock Issue" },
        ],
    },
    {
        key: "sortBy",
        label: "Sort By",
        options: [
            { value: "createdAt", label: "Date" },
            { value: "materialName", label: "Material Name" },
            { value: "quantityConsumed", label: "Quantity" },
            { value: "totalCost", label: "Total Cost" },
        ],
    },
]

function useDebounce(value, delay = 350) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return debounced
}

export default function ConsumptionHeader({
    count = 0,
    projectId,         
    onSearch,
    onFilterChange,
}) {
    const [searchValue, setSearchValue] = useState("")

    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [subTaskSearch, setSubTaskSearch] = useState("")   
    const [subTasks, setSubTasks] = useState([])             
    const [loadingSubTasks, setLoadingSubTasks] = useState(false)
    const [selectedSubTask, setSelectedSubTask] = useState(null)

    const debouncedSubTaskSearch = useDebounce(subTaskSearch, 350)
    const dropdownRef = useRef(null)
    const triggerRef = useRef(null)
    const searchInputRef = useRef(null)
    const abortRef = useRef(null)
    useEffect(() => {
        if (!dropdownOpen) return
        const handler = (e) => {
            if (
                dropdownRef.current?.contains(e.target) ||
                triggerRef.current?.contains(e.target)
            ) return
            setDropdownOpen(false)
            setSubTaskSearch("")
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [dropdownOpen])

    useEffect(() => {
        if (dropdownOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 60)
        }
    }, [dropdownOpen])

    useEffect(() => {
        if (!dropdownOpen || !projectId) return

        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setLoadingSubTasks(true)

        fetchSubTaskLookup(projectId, debouncedSubTaskSearch, controller.signal)
            .then((results) => {
                if (controller.signal.aborted) return
                setSubTasks(
                    results.map((st) => ({
                        value: st.subTaskId || st._id,
                        label: st.title,
                    }))
                )
            })
            .catch((err) => {
                if (err.name === "CanceledError" || err.name === "AbortError") return
                console.error("[ConsumptionHeader] subtask lookup failed:", err.message)
                setSubTasks([])
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoadingSubTasks(false)
            })

        return () => controller.abort()
    }, [dropdownOpen, projectId, debouncedSubTaskSearch])
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

    const handleSelectSubTask = useCallback(
        (opt) => {
            setSelectedSubTask(opt)
            setDropdownOpen(false)
            setSubTaskSearch("")
            onFilterChange?.({ subTaskId: opt.value })
        },
        [onFilterChange]
    )

    const handleClearSubTask = useCallback(
        (e) => {
            e.stopPropagation()
            setSelectedSubTask(null)
            onFilterChange?.({ subTaskId: null })
        },
        [onFilterChange]
    )

    const showClearButton = searchValue.length > 0

    return (
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 transition-colors duration-300 font-sfpro">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors break-word">
                        Consumption
                    </h1>
                    {count > 0 && (
                        <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
                            {count}
                        </span>
                    )}
                </div>
                <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full sm:max-w-105 lg:max-w-70 leading-snug transition-colors">
                    Track and manage material consumption
                    <br />
                    across your project
                </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative flex items-center w-full sm:w-[320px] lg:w-65">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search materials..."
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
                <div className="relative shrink-0" ref={triggerRef}>
                    <button
                        type="button"
                        onClick={() => setDropdownOpen((o) => !o)}
                        className={`inline-flex items-center gap-2 h-10 px-3 rounded-xl border-2 bg-transparent text-sm font-sfpro transition-all duration-200 cursor-pointer
                            ${selectedSubTask
                                ? "border-[#212121] dark:border-[#f4f4f5] text-[#212121] dark:text-[#f4f4f5]"
                                : dropdownOpen
                                    ? "border-[#d4d4d4] dark:border-[#3f3f46] text-[#3f3f46] dark:text-[#d4d4d8]"
                                    : "border-[#EAEAEA] dark:border-[#252525] text-[#a1a1aa] dark:text-[#71717a] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46]"
                            }`}
                    >
                        <ListTodo className="w-4 h-4 shrink-0" />
                        <span className="max-w-35 truncate">
                            {selectedSubTask ? selectedSubTask.label : "Sub Task"}
                        </span>
                        {selectedSubTask ? (
                            <span
                                role="button"
                                tabIndex={0}
                                onMouseDown={handleClearSubTask}
                                className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                            >
                                <X className="w-3 h-3" />
                            </span>
                        ) : null}
                    </button>
                    {dropdownOpen && (
                        <div
                            ref={dropdownRef}
                            className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 bg-white dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg p-2 animate-in fade-in-0 zoom-in-95 duration-100"
                        >
                            <div className="mb-2">
                                <div className="relative flex items-center">
                                    <Search className="w-4 h-4 text-[#a1a1aa] absolute left-2.5 pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search subtasks…"
                                        value={subTaskSearch}
                                        onChange={(e) => setSubTaskSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EAEAEA] dark:border-[#27272a] bg-[#f9f9f9] dark:bg-[#18181b] text-sm text-[#212121] dark:text-[#f4f4f5] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#d4d4d4] dark:focus:ring-[#3f3f46] font-sfpro transition-colors"
                                    />
                                    {subTaskSearch && (
                                        <button
                                            type="button"
                                            onMouseDown={(e) => { e.preventDefault(); setSubTaskSearch("") }}
                                            className="absolute right-2.5 flex items-center justify-center w-5 h-5 rounded-md hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-400 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div
                                className="overflow-y-auto max-h-56 flex flex-col gap-0.5"
                                style={{ scrollbarWidth: "thin" }}
                            >
                                {loadingSubTasks ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-8 rounded-lg bg-[#f4f4f5] dark:bg-[#27272a] animate-pulse"
                                        />
                                    ))
                                ) : subTasks.length === 0 ? (
                                    <p className="py-6 text-center text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                                        {subTaskSearch ? "No matching subtasks" : "No subtasks found"}
                                    </p>
                                ) : (
                                    subTasks.map((opt) => {
                                        const isSelected = selectedSubTask?.value === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleSelectSubTask(opt)}
                                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm text-left transition-colors duration-150 cursor-pointer
                                                    ${isSelected
                                                        ? "bg-[#f4f4f5] dark:bg-[#27272a] font-sfpro-medium text-[#212121] dark:text-[#f4f4f5]"
                                                        : "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"
                                                    }`}
                                            >
                                                <ListTodo className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#212121] dark:text-[#f4f4f5]" : "text-[#a1a1aa] dark:text-[#71717a]"}`} />
                                                <span className="truncate flex-1">{opt.label}</span>
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#212121] dark:bg-[#f4f4f5] shrink-0" />
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="shrink-0">
                    <FilterOptions
                        filters={CONSUMPTION_FILTERS}
                        align="right"
                        onChange={(selectedFilters) => onFilterChange?.(selectedFilters)}
                    />
                </div>
            </div>
        </div>
    )
}