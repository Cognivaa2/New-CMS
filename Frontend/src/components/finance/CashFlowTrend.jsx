"use client"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts"


function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <p className="text-[13px] font-sfpro-medium text-zinc-400 dark:text-zinc-500">
        No data available
      </p>
    </div>
  )
}


function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-4 py-3 shadow-lg text-[12px] font-sfpro-medium space-y-1.5 min-w-40">
      <p className="text-zinc-500 dark:text-zinc-400 mb-2 font-sfpro-bold">{label}</p>
      <div className="flex justify-between gap-6">
        <span className="text-zinc-400">Total Spend</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-sfpro-bold">
          {yFmt(d?.totalSpend ?? 0)}
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-zinc-400">Settled</span>
        <span className="text-zinc-900 dark:text-zinc-100">
          {yFmt(d?.totalSettled ?? 0)}
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-zinc-400">Transactions</span>
        <span className="text-zinc-900 dark:text-zinc-100">{d?.paymentVolume ?? 0}</span>
      </div>
    </div>
  )
}


function XTick({ x, y, payload }) {
  const raw = payload?.value ?? ""
  let line1 = raw
  let line2 = ""

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw)
    line1 = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
  } else if (/^\d{4}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}-01`)
    line1 = d.toLocaleDateString("en-IN", { month: "short" })
    line2 = String(d.getFullYear())
  } else if (/^W\d{2}-\d{4}$/.test(raw)) {
    const parts = raw.split("-")
    line1 = parts[0]
    line2 = parts[1]
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={10} textAnchor="middle" fontSize={10} fill="#71717a">
        {line1}
      </text>
      {line2 && (
        <text x={0} y={22} textAnchor="middle" fontSize={9} fill="#a1a1aa">
          {line2}
        </text>
      )}
    </g>
  )
}

function yFmt(val) {
  if (val >= 1_000_000) return `₹${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(0)}K`
  return `₹${val}`
}

function CustomLegend() {
  return (
    <div className="flex items-center gap-4 justify-end pr-2 pb-1">
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm bg-zinc-900 dark:bg-zinc-100" />
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sfpro-medium">Total Spend</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sfpro-medium">Settled</span>
      </div>
    </div>
  )
}


export default function CashFlowTrend({ data = [] }) {
  if (!data.length) return <EmptyChart />
  const bottomMargin = data.length > 8 ? 32 : 24

  return (
    <div className="flex flex-col h-full w-full gap-1">
      <CustomLegend />
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 4, bottom: bottomMargin }}
            barCategoryGap="40%"
            barGap={2}
          >
            <CartesianGrid vertical={false} stroke="rgba(113,113,122,0.08)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={<XTick />}
              height={data.length > 8 ? 36 : 28}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={yFmt}
              tick={{ fontSize: 10, fill: "#71717a" }}
              width={52}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(113,113,122,0.05)" }}
            />
            <Bar
              dataKey="totalSpend"
              name="Total Spend"
              radius={[5, 5, 5, 5]}
              maxBarSize={22}
              fill="#18181B"
              className="dark:fill-zinc-300"
            />
            <Bar
              dataKey="totalSettled"
              name="Settled"
              radius={[5, 5, 5, 5]}
              maxBarSize={22}
              fill="#818CF8"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}