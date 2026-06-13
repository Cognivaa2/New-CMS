"use client"

import { memo } from "react"

const BAR_COLORS = {
  phase: {
    bg: "bg-blue-500/20 dark:bg-blue-500/15",
    fill: "bg-blue-500 dark:bg-blue-400",
    border: "border-blue-500/30 dark:border-blue-400/20",
    text: "text-blue-700 dark:text-blue-300",
  },
  task: {
    bg: "bg-violet-500/20 dark:bg-violet-500/15",
    fill: "bg-violet-500 dark:bg-violet-400",
    border: "border-violet-500/30 dark:border-violet-400/20",
    text: "text-violet-700 dark:text-violet-300",
  },
  subtask: {
    bg: "bg-pink-400/20 dark:bg-pink-400/15",
    fill: "bg-pink-400 dark:bg-pink-400",
    border: "border-pink-400/30 dark:border-pink-400/20",
    text: "text-pink-700 dark:text-pink-300",
  },
}

const BAR_HEIGHTS = {
  phase: "h-7",
  task: "h-6",
  subtask: "h-5",
}

const GanttBar = memo(function GanttBar({ row, width, onMouseEnter, onMouseLeave }) {
  const colors = BAR_COLORS[row.type] || BAR_COLORS.subtask
  const barH = BAR_HEIGHTS[row.type] || BAR_HEIGHTS.subtask
  const progress = Math.min(100, Math.max(0, row.progress))
  const showLabel = width > 60

  return (
    <div
      className={`group relative ${barH} rounded-full ${colors.bg} border ${colors.border} overflow-hidden cursor-pointer transition-all duration-200 hover:scale-y-110 hover:shadow-lg`}
      style={{ width }}
      onMouseEnter={(e) => onMouseEnter(e, row)}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${colors.fill} transition-all duration-500 ease-out`}
        style={{ width: `${progress}%` }}
      />
      {showLabel && (
        <div className="absolute inset-0 flex items-center px-2.5 z-10">
          <span
            className={`text-[10px] font-sfpro-bold truncate ${
              progress > 50 ? "text-white" : colors.text
            }`}
          >
            {row.name}
          </span>
        </div>
      )}
      {width > 40 && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-10">
          <span
            className={`text-[9px] font-sfpro-bold ${
              progress > 85 ? "text-white/90" : colors.text
            }`}
          >
            {progress}%
          </span>
        </div>
      )}

      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/10" />
    </div>
  )
})

export default GanttBar
