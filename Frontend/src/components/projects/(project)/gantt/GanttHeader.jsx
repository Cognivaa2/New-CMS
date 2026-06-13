"use client"

import { RefreshCw, Calendar, Download, Loader2 } from "lucide-react"
import { formatFullDate } from "@/app/(companyname)/projects/[projectId]/gantt/api"

const VIEW_MODES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

export default function GanttHeader({
  project,
  viewMode,
  onViewModeChange,
  onRefresh,
  totalItems,
  onExport,
  isExporting = false,
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-2">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold text-[#a3a3a3] dark:text-[#a1a1aa] leading-none tracking-tight transition-colors">
            Gantt Chart
          </h1>
          {totalItems > 0 && (
            <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border dark:border-[#353535] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors">
              {totalItems}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Calendar className="w-3.5 h-3.5 text-[#a3a3a3] dark:text-[#71717a]" />
          <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] leading-snug transition-colors font-sfpro">
            {formatFullDate(project?.startDate)} — {formatFullDate(project?.endDate)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#f4f4f5] dark:bg-[#18181b] rounded-xl p-1 border border-gray-200 dark:border-[#27272a]">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[13px] font-sfpro-medium transition-all duration-200 ${
                viewMode === mode.value
                  ? "bg-white dark:bg-[#27272a] text-[#09090b] dark:text-white shadow-sm"
                  : "text-[#71717a] hover:text-[#3f3f46] dark:hover:text-[#a1a1aa]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="cursor-pointer flex items-center gap-2 px-3.5 py-2 bg-[#f4f4f5] dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-[#3f3f46] dark:text-[#a1a1aa] rounded-xl text-[13px] font-sfpro-medium hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {isExporting ? "Exporting..." : "Export"}
        </button>

        <button
          onClick={onRefresh}
          className="cursor-pointer flex items-center gap-2 px-3.5 py-2 bg-[#f4f4f5] dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-[#3f3f46] dark:text-[#a1a1aa] rounded-xl text-[13px] font-sfpro-medium hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    </div>
  )
}

