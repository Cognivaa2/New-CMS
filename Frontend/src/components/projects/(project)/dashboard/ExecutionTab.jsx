"use client"
import { useState } from "react"
import BarChartSection from "./BarChartSection"
import TasksBreakdown from "./TasksBreakdown"
import DateRangePicker from "@/components/ui/DateRangePicker"

const TASK_COLORS = {
    Completed: "#22c55e",
    InProgress: "#3b82f6",
    NotStarted: "#a1a1aa",
    Blocked: "#ef4444",
    OnHold: "#f59e0b",
}

export default function ExecutionTab({ data, isLoading = false }) {
    const [dateRange, setDateRange] = useState({
        start: new Date(),
        end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    })

    const kpis = data.kpis
    const taskStatus = data.taskStatusSummary || {}

    const stats = kpis ? [
        { v: String(data.totalTasks || 0), l: "Total Tasks", s: "across all phases" },
        { v: String(taskStatus.Completed || 0), l: "Completed Tasks", s: "fully done" },
        { v: String(taskStatus.InProgress || 0), l: "In Progress", s: "currently active" },
        { v: String(data.overdueTasksCount || 0), l: "Overdue Tasks", s: "past due date" },
        { v: String(taskStatus.Blocked || 0), l: "Blocked Tasks", s: "need attention" },
        { v: String(taskStatus.OnHold || 0), l: "On Hold", s: "paused tasks" },
        { v: String(taskStatus.NotStarted || 0), l: "Not Started", s: "pending start" },
        { v: String(data.criticalIssuesCount || 0), l: "Critical Issues", s: "high/critical priority" },
        { v: String(data.pendingApprovals?.total || 0), l: "Pending Approvals", s: "MR + PO + Transfers" },
        { v: `${Math.abs(kpis.scheduleDeviation?.value || 0).toFixed(1)}%`, l: "Schedule Deviation", s: kpis.scheduleDeviation?.label || "On Track" },
    ] : []

    const breakdownData = Object.entries(taskStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
            name: status,
            value: count,
            color: TASK_COLORS[status] || "#a1a1aa",
        }))

    const flowData = [
        { day: "Mon", value: 0 }, { day: "Tue", value: 0 }, { day: "Wed", value: 0 },
        { day: "Thu", value: 0 }, { day: "Fri", value: 0 }, { day: "Sat", value: 0 },
        { day: "Sun", value: 0 },
    ]

    return (
        <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {isLoading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-[1.8rem] border border-gray-100 dark:border-neutral-800 h-28 animate-pulse" />
                    ))
                    : stats.map((card, i) => (
                        <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-[1.8rem] border border-gray-100 dark:border-neutral-800 shadow-sm transition-colors">
                            <div className="text-3xl font-sfpro-bold mb-1 text-black dark:text-white">{card.v}</div>
                            <div className="text-sm font-sfpro-medium text-gray-800 dark:text-gray-300">{card.l}</div>
                            <div className="text-[11px] text-gray-400 font-sfpro">{card.s}</div>
                        </div>
                    ))
                }
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 pt-6">
                <BarChartSection
                    title="Tasks Flow"
                    description="Daily task activity"
                    data={flowData}
                    xAxisKey="day"
                    dataKey="value"
                >
                    <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                    />
                </BarChartSection>

                <TasksBreakdown
                    title="Tasks Breakdown"
                    description="Distribution by status"
                    data={breakdownData.length > 0 ? breakdownData : [
                        { name: "No Data", value: 1, color: "#e5e7eb" }
                    ]}
                />
            </div>
        </div>
    )
}