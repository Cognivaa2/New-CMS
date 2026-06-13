"use client"

import { useState } from "react"
import DateRangePicker from "@/components/ui/DateRangePicker"

function getDefaultDateRange() {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

const DEFAULT_RANGE = getDefaultDateRange()

export default function PageHeader({
  title,
  count,
  countLoading = false,
  description,
  onDateChange,
}) {
  const [range, setRange] = useState(DEFAULT_RANGE)

  const handleChange = (newRange) => {
    setRange(newRange)
    onDateChange?.(newRange)
  }

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight transition-colors break-word">
            <span className="text-[#a3a3a3] dark:text-[#858585]">{title}</span>
          </h1>

          <div className="mt-2 min-w-8 px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 rounded text-[12px] font-bold text-zinc-500 bg-white dark:bg-transparent text-center">
            {countLoading ? (
              <span className="inline-block w-6 h-3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            ) : count !== null && count !== undefined ? (
              count
            ) : (
              <span className="opacity-40">—</span>
            )}
          </div>
        </div>

        <p className="text-zinc-400 dark:text-zinc-500 text-[14px] max-w-xl leading-relaxed">
          {description}
        </p>
      </div>

      <div className="self-start mt-2">
        <DateRangePicker value={range} onChange={handleChange} />
      </div>
    </div>
  )
}