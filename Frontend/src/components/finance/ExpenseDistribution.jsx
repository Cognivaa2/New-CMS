"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

function EmptyPie() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <p className="text-[13px] font-sfpro-medium text-zinc-400 dark:text-zinc-500">
        No data available
      </p>
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-md text-[12px] font-sfpro-medium">
      <p className="text-zinc-500 mb-0.5">{name}</p>
      <p className="text-zinc-900 dark:text-zinc-100 font-sfpro-bold">
        ₹{(value ?? 0).toLocaleString()}
      </p>
    </div>
  )
}

function fmtAmt(val) {
  const n = parseFloat(val ?? 0)
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toLocaleString()}`
}

export default function ExpenseDistribution({ data = [] }) {
  if (!data.length) return <EmptyPie />
  return (
    <div className="flex flex-col w-full font-sfpro">
      <div className="h-52 w-full shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={44}
              outerRadius={78}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={450}
              stroke="none"
              cx="50%"
              cy="50%"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2.5 w-full pl-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex justify-between w-full">
              <span className="text-[13px] font-sfpro-medium text-zinc-900 dark:text-zinc-200 truncate">
                {item.name}
              </span>
              <span className="text-[13px] text-zinc-400 font-sfpro-medium ml-2 shrink-0">
                {fmtAmt(item.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}