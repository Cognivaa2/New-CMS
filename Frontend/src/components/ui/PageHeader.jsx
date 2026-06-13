import { Search, SlidersHorizontal } from "lucide-react"

export default function PageHeader({
  title,
  description,
  searchPlaceholder = "Search anything",
  actionText,
  ActionIcon,
  onSearch,
  onFilter,
  onAction,
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 transition-colors duration-300 font-sfpro">

      <div className="min-w-0">
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors wrap-break-word">
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
          <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all duration-300 font-sfpro"
          />
          <div className="absolute right-2.5 hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-xs rounded-md w-6 h-6 font-sfpro-medium transition-colors duration-300">
            /
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onFilter}
            className="p-2.5 text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-[#f4f4f5] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-xl transition-colors duration-300 shrink-0"
            aria-label="Filter"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          <button
            onClick={onAction}
            className="flex items-center justify-center gap-2 bg-[#222222] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2.5 rounded-xl text-sm font-sfpro-medium transition-colors duration-300 w-full sm:w-auto"
          >
            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            <span className="truncate">{actionText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
