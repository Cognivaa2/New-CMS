"use client"

import { memo } from "react"
import GanttBar from "./GanttBar"

const GanttRow = memo(function GanttRow({
  row,
  index,
  barLeft,
  barWidth,
  rowHeight,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <div
      className={`relative border-b transition-colors ${
        row.type === "phase"
          ? "bg-[#fafafa]/50 dark:bg-[#111]/50 border-gray-100 dark:border-[#1a1a1a]"
          : "border-gray-100/70 dark:border-[#151515] hover:bg-[#f4f4f5]/30 dark:hover:bg-[#111]/30"
      }`}
      style={{ height: rowHeight }}
    >
      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: barLeft }}>
        <GanttBar
          row={row}
          width={barWidth}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      </div>
    </div>
  )
})

export default GanttRow