"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

export default function InventoryBreakdownChart({ title, description, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="w-full">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 mb-4 max-w-xs">
          {description}
        </p>
        <div className="h-72 flex items-center justify-center text-zinc-400 text-sm">
          No inventory data available
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 mb-4 max-w-xs">
        {description}
      </p>

      <div className="h-72 flex flex-col">
        <div className="relative flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${value} items`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">
              {total}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-wider font-medium">
              Total Items
            </span>
          </div>
        </div>

        <div className="space-y-2.5 mt-4">
          {data.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs py-1"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {item.name}
                </span>
              </div>
              <span className="text-zinc-400 dark:text-zinc-500 font-medium tabular-nums">
                {item.value} Items
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}