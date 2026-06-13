"use client"
import { useState } from "react"
import DateRangePicker from "@/components/ui/DateRangePicker"

export default function FinanceHeader({ meta, dateRange: externalRange, onDateRangeChange }) {
  const [localRange, setLocalRange] = useState({
    start: meta.dateRange.start instanceof Date
      ? meta.dateRange.start
      : new Date(meta.dateRange.start),
    end: meta.dateRange.end instanceof Date
      ? meta.dateRange.end
      : new Date(meta.dateRange.end),
  })

  const range = externalRange ?? localRange

  const handleChange = (newRange) => {
    setLocalRange(newRange)
    onDateRangeChange?.(newRange)
  }

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-2 font-sfpro">
      <div>
        <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight transition-colors break-word">
          <span className="text-[#a3a3a3] dark:text-[#858585]">{meta.title}</span>
        </h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2 max-w-lg leading-relaxed">
          {meta.description}
        </p>
      </div>

      <div className="self-start">
        <DateRangePicker
          value={range}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}