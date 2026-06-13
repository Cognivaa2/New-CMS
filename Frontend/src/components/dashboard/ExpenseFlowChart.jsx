"use client"

import { useState, useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from "recharts"
import { TrendingUp, ArrowUpDown, Sparkles } from "lucide-react"

const getGradientId = (value) => {
  if (value >= 70) return "barGradientHigh"
  if (value >= 40) return "barGradientMid"
  return "barGradientLow"
}

const getStatusLabel = (value) => {
  if (value >= 100)
    return {
      text: "Over Budget",
      color:
        "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
    }
  if (value >= 70)
    return {
      text: "High Usage",
      color:
        "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
    }
  if (value >= 40)
    return {
      text: "In Progress",
      color:
        "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10",
    }
  return {
    text: "Early Stage",
    color:
      "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
  }
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload
  const status = getStatusLabel(item.value)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-3 min-w-44">
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate max-w-28">
          {item.name}
        </p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${status.color}`}>
          {status.text}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
          {item.value}
        </span>
        <span className="text-sm font-medium text-zinc-400">%</span>
      </div>
      <div className="mt-2 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-violet-500 to-violet-600 rounded-full transition-all"
          style={{ width: `${Math.min(item.value, 100)}%` }}
        />
      </div>
    </div>
  )
}

function ValueLabel({ x, y, width, height, value }) {
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dy={3}
      fill="#71717a"
      fontSize={10}
      fontWeight={600}
      className="tabular-nums"
    >
      {value}%
    </text>
  )
}

export default function ExpenseFlowChart({ title, description, data }) {
  const [sortDesc, setSortDesc] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) =>
      sortDesc ? b.value - a.value : a.value - b.value
    )
  }, [data, sortDesc])

  const avgUtilization = useMemo(() => {
    if (!data.length) return 0
    return Math.round(
      data.reduce((acc, item) => acc + item.value, 0) / data.length
    )
  }, [data])

  const overBudgetCount = data.filter((d) => d.isOverBudget).length

  if (!data || data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
          {description}
        </p>
        <div className="h-72 flex items-center justify-center text-zinc-400 text-sm">
          No expense data available
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              <Sparkles className="w-2.5 h-2.5" strokeWidth={2.5} />
              LIVE
            </span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
            {description}
          </p>
        </div>

        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="group flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 px-3 py-1.5 rounded-lg transition-all"
        >
          <ArrowUpDown
            className="w-3 h-3 group-hover:rotate-180 transition-transform duration-300"
            strokeWidth={2.5}
          />
          Sort
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
          <TrendingUp className="w-3 h-3 text-violet-500" strokeWidth={2.5} />
          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Avg</span>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white tabular-nums">
            {avgUtilization}%
          </span>
        </div>

        {overBudgetCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">Over Budget</span>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 tabular-nums">
              {overBudgetCount}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Projects</span>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white tabular-nums">
            {data.length}
          </span>
        </div>
      </div>

      <div className="h-72 w-full -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sortedData}
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            barCategoryGap={6}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="barGradientHigh" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="barGradientMid" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                <stop offset="100%" stopColor="#c4b5fd" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="barGradientLow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                <stop offset="100%" stopColor="#ddd6fe" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="barGradientHover" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6d28d9" stopOpacity={1} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
              </linearGradient>
            </defs>

            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload, index }) => (
                <text
                  x={x}
                  y={y}
                  dy={3}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight={hoveredIndex === index ? 700 : 500}
                  fill={hoveredIndex === index ? "#7c3aed" : "#9ca3af"}
                >
                  {payload.value.length > 14
                    ? `${payload.value.slice(0, 14)}…`
                    : payload.value}
                </text>
              )}
              width={110}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />

            <Bar
              dataKey="value"
              radius={[0, 10, 10, 0]}
              barSize={10}
              background={{ fill: "#f4f4f5", radius: 10 }}
              animationDuration={900}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setHoveredIndex(index)}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    hoveredIndex === index
                      ? "url(#barGradientHover)"
                      : `url(#${getGradientId(entry.value)})`
                  }
                  style={{
                    filter:
                      hoveredIndex === index
                        ? "drop-shadow(0 2px 6px rgba(124, 58, 237, 0.35))"
                        : "none",
                    transition: "filter 0.2s ease",
                  }}
                />
              ))}
              <LabelList dataKey="value" content={<ValueLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-600" />
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">70%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">40–69%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-200" />
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">&lt;40%</span>
        </div>
      </div>
    </div>
  )
}