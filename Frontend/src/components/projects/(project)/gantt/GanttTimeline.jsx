"use client"

import { useMemo } from "react"

export default function GanttTimeline({ columns, colWidth, viewMode, height }) {
  const monthGroups = useMemo(() => {
    const groups = []
    let currentMonth = null

    columns.forEach((col, i) => {
      const key = `${col.date.getFullYear()}-${col.date.getMonth()}`
      if (key !== currentMonth) {
        groups.push({
          label: col.date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
          startIndex: i,
          count: 1,
        })
        currentMonth = key
      } else {
        groups[groups.length - 1].count++
      }
    })

    return groups
  }, [columns])

  return (
    <div className="border-b border-gray-200 dark:border-[#27272a] bg-[#fafafa] dark:bg-[#0f0f0f] sticky top-0 z-10">
      {viewMode !== "month" && (
        <div className="flex border-b border-gray-100 dark:border-[#1a1a1a]" style={{ height: height * 0.6 }}>
          {monthGroups.map((group, i) => (
            <div
              key={i}
              className="flex items-center justify-center border-r border-gray-100 dark:border-[#1a1a1a]"
              style={{ width: group.count * colWidth }}
            >
              <span className="text-[11px] font-sfpro-bold text-[#71717a] dark:text-[#52525b] uppercase tracking-wider">
                {group.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex" style={{ height: viewMode === "month" ? height : height * 0.7 }}>
        {columns.map((col, i) => (
          <div
            key={i}
            className={`flex items-center justify-center border-r border-gray-100 dark:border-[#1a1a1a] ${
              col.isWeekend ? "bg-[#f4f4f5] dark:bg-[#0d0d0d]" : ""
            }`}
            style={{ width: colWidth }}
          >
            <span
              className={`text-[11px] font-sfpro-medium ${
                col.isWeekend
                  ? "text-[#a1a1aa] dark:text-[#3f3f46]"
                  : "text-[#71717a] dark:text-[#52525b]"
              }`}
            >
              {col.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

