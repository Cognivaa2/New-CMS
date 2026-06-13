"use client"

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    Legend,
} from "recharts"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const DAY_OPTIONS = [7, 12, 30]

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-3 min-w-36">
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                {label}
            </p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
                    <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-[12px] text-zinc-700 dark:text-zinc-300 capitalize">
                        {entry.dataKey}
                    </span>
                    <span className="text-[12px] font-bold text-zinc-900 dark:text-white tabular-nums ml-auto">
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function TasksFlowChart({
    title,
    description,
    data,
    onDaysChange,
}) {
    const [selectedDays, setSelectedDays] = useState(12)
    const [showDropdown, setShowDropdown] = useState(false)
    const [activeIndex, setActiveIndex] = useState(null)

    const handleDaysSelect = (days) => {
        setSelectedDays(days)
        setShowDropdown(false)
        onDaysChange?.(days)
    }

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
                    No tasks data available
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

                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Last {selectedDays} days
                        <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 top-9 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-lg z-10 overflow-hidden min-w-32">
                            {DAY_OPTIONS.map((days) => (
                                <button
                                    key={days}
                                    onClick={() => handleDaysSelect(days)}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${selectedDays === days
                                            ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    Last {days} days
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                        barCategoryGap={8}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            dy={10}
                            interval={Math.ceil(data.length / 10) - 1}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: "transparent" }}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                        />

                        <Bar
                            dataKey="created"
                            name="Created"
                            radius={[6, 6, 6, 6]}
                            barSize={12}
                            fill="#a78bfa"
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`created-${index}`}
                                    fill={activeIndex === index ? "#7c3aed" : "#a78bfa"}
                                />
                            ))}
                        </Bar>

                        <Bar
                            dataKey="completed"
                            name="Completed"
                            radius={[6, 6, 6, 6]}
                            barSize={12}
                            fill="#34d399"
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`completed-${index}`}
                                    fill={activeIndex === index ? "#059669" : "#34d399"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}