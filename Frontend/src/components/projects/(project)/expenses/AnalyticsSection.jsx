"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import BarChartSection from "./BarChartSection"
import TasksBreakdown from "./TasksBreakdown"
import VendorList from "./VendorList"
import DateRangePicker from "@/components/ui/DateRangePicker"
import {
  fetchExpenseTrend,
  computeTrendChartData,
  formatExpenseError,
} from "@/app/(companyname)/projects/[projectId]/expenses/api"
import { useParams } from "next/navigation"

function defaultRange() {
  const end = new Date()
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
  return { start, end }
}

function ChartSkeleton() {
  return (
    <div className="h-72 w-full flex items-end gap-2 px-2 animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-lg bg-gray-100 dark:bg-[#27272a]"
          style={{ height: `${30 + Math.abs(Math.sin(i * 1.3)) * 55}%` }}
        />
      ))}
    </div>
  )
}

export default function AnalyticsSection({
  categoryData = [],
  vendors = [],
  isLoading = false,
}) {
  const params = useParams()
  const projectId = params?.projectId

  const [range, setRange] = useState(defaultRange)

  const [trendData, setTrendData] = useState([])
  const [isTrendLoading, setIsTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState(null)

  const controllerRef = useRef(null)

  const loadTrend = useCallback(
    async (from, to) => {
      if (!projectId || !from || !to) return

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setIsTrendLoading(true)
      setTrendError(null)

      try {
        const { trend } = await fetchExpenseTrend(projectId, {
          dateFrom: from,
          dateTo: to,
          granularity: "day",
          signal: controller.signal,
        })

        if (controller.signal.aborted) return
        setTrendData(computeTrendChartData(trend))
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        setTrendError(formatExpenseError(err))
      } finally {
        if (!controller.signal.aborted) setIsTrendLoading(false)
      }
    },
    [projectId]
  )

  useEffect(() => {
    const r = defaultRange()
    setRange(r)
    loadTrend(r.start, r.end)
    return () => controllerRef.current?.abort()
  }, [projectId])

  const handleRangeChange = (newRange) => {
    if (!newRange?.start || !newRange?.end) return
    setRange(newRange)
    loadTrend(newRange.start, newRange.end)
  }

  const chartDescription = isTrendLoading
    ? "Loading…"
    : trendError
      ? "Could not load data"
      : trendData.length === 0
        ? "No expenses in this period"
        : `Daily spend · ${trendData.length} day${trendData.length !== 1 ? "s" : ""}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-20 items-start py-4">

      <div className="lg:col-span-3">
        <TasksBreakdown
          title="Category Breakdown"
          description="Actual spend by expense category"
          data={categoryData}
          isLoading={isLoading}
        />
      </div>

      <div className="lg:col-span-6 dark:border-[#1e1e1e] px-10">
        <BarChartSection
          title="Daily Expense Trend"
          description={chartDescription}
          data={isTrendLoading ? [] : trendData}
          xAxisKey="name"
          dataKey="value"
        >
          <DateRangePicker
            value={range}
            onChange={handleRangeChange}
          />
        </BarChartSection>

        {isTrendLoading && (
          <div className="-mt-72">
            <ChartSkeleton />
          </div>
        )}

        {!isTrendLoading && !trendError && trendData.length === 0 && (
          <div className="-mt-72 h-72 flex items-center justify-center">
            <p className="text-sm text-[#a1a1aa] dark:text-[#71717a] font-sfpro">
              No expenses recorded in this period
            </p>
          </div>
        )}

        {!isTrendLoading && trendError && (
          <div className="-mt-72 h-72 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-[#a1a1aa] dark:text-[#71717a] font-sfpro">
              {trendError}
            </p>
            <button
              onClick={() => loadTrend(range.start, range.end)}
              className="text-xs font-sfpro-medium text-gray-500 dark:text-gray-400 underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        <VendorList vendors={vendors} isLoading={isLoading} />
      </div>

    </div>
  )
}