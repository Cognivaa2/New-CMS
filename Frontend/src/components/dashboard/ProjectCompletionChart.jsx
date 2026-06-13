"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-3 min-w-40">
      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 truncate max-w-36">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
          {payload[0].value}
        </span>
        <span className="text-sm font-medium text-zinc-400">%</span>
      </div>
      {item.status && (
        <p className="text-[10px] text-zinc-400 mt-1">{item.status}</p>
      )}
    </div>
  )
}

export default function ProjectCompletionChart({ title, description, data }) {
  const [activeIndex, setActiveIndex] = useState(null)

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
          No project data available
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
            {description}
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#9ca3af" }}
              dy={10}
              interval={0}
              tickFormatter={(v) =>
                v.length > 8 ? `${v.slice(0, 8)}…` : v
              }
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "transparent" }}
            />
            <Bar
              dataKey="value"
              radius={[10, 10, 10, 10]}
              barSize={14}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    activeIndex === index
                      ? "#7c3aed"
                      : entry.value >= 70
                        ? "#a78bfa"
                        : entry.value >= 40
                          ? "#c4b5fd"
                          : "#ddd6fe"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}