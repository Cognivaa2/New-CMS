"use client"
import { useState } from "react"
import { Edit, AlertTriangle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import BarChartSection from "./BarChartSection"
import ManageMembersModal from "./ManageMembersModal"
import EditProjectDrawer from "./EditProjectDrawer"

function SummaryCard({ item }) {
    return (
        <div className={`p-6 rounded-[2.5rem] transition-all duration-300 font-sfpro flex flex-col justify-center min-h-40 border border-transparent dark:border-white/5 shadow-sm ${item.colorClass}`}>
            <h2 className="text-[34px] font-sfpro-bold leading-none mb-2 text-gray-800 dark:text-gray-100">
                {item.value}
            </h2>
            <p className={`text-[16px] font-sfpro-bold dark:text-gray-200 ${item.highlight ? "text-blue-600 underline underline-offset-4" : "text-gray-800/80"}`}>
                {item.title}
            </p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">
                {item.subtitle}
            </p>
        </div>
    )
}

const ALERT_PRIORITY_COLOR = {
    critical: "bg-red-600",
    warning: "bg-amber-500",
    info: "bg-blue-500",
}

export default function OverviewTab({ data, rawDetails, isLoading = false, phasesLoading = false, alertsLoading = false, projectId, onRefresh }) {
    const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false)
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)

    const kpis = data.kpis
    const metrics = kpis ? [
        {
            title: "Schedule Deviation",
            value: `${Math.abs(kpis.scheduleDeviation?.value || 0).toFixed(1)}%`,
            subtitle: kpis.scheduleDeviation?.label || "On Track",
            colorClass: "bg-[#eef5fc] dark:bg-[#151b23]",
        },
        {
            title: "Overdue Tasks",
            value: String(kpis.overdueTasksCount || 0),
            subtitle: "overdue tasks",
            colorClass: "bg-[#f2f3f9] dark:bg-[#1c1c1e]",
        },
        {
            title: "Critical Issues",
            value: String(kpis.criticalIssuesCount || 0),
            subtitle: "critical issues",
            colorClass: "bg-[#eef5fc] dark:bg-[#151b23]",
        },
        {
            title: "Pending Approvals",
            value: String(kpis.pendingApprovals?.total || 0),
            subtitle: "pending approvals",
            colorClass: "bg-[#f2f3f9] dark:bg-[#1c1c1e]",
        },
        {
            title: "Completion",
            value: `${data.completionPercent || 0}%`,
            subtitle: `${data.remainingDays > 0 ? `${data.remainingDays} days left` : data.isOverdue ? "Overdue" : "On time"}`,
            colorClass: "bg-[#eef5fc] dark:bg-[#151b23]",
        },
    ] : []

    const pct = Math.min(100, Math.max(0, data.completionPercent || 0))

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <div className="lg:col-span-3 flex items-center justify-center">
                    <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-white dark:border-neutral-900 shadow-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
                        {data.coverImage ? (
                            <img
                                src={data.coverImage}
                                className="w-full h-full object-cover"
                                alt="Project"
                            />
                        ) : (
                            <span className="text-[64px] font-sfpro-bold text-gray-400 dark:text-[#52525b] select-none">
                                {(data.title || "P")[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5 bg-white dark:bg-[#0d0d0d] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800/50 relative">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-sfpro-bold text-[#1e1e1e] dark:text-white">Project Details</h3>
                        <Edit
                            onClick={() => setIsProjectDrawerOpen(true)}
                            className="w-5 h-5 text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-4 bg-gray-100 dark:bg-[#1a1a1a] rounded animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm font-sfpro">
                            <div className="flex gap-2"><span className="text-gray-400">Name :</span><span className="font-sfpro-bold dark:text-gray-200">{data.title}</span></div>
                            <div className="flex gap-2"><span className="text-gray-400">Code :</span><span className="font-sfpro-bold dark:text-gray-200">{data.code}</span></div>
                            <div className="flex gap-2">
                                <span className="text-gray-400 shrink-0">Description :</span>
                                <span className="text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{data.description || "—"}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-8 gap-y-3 py-1">
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-2">Start Date :</span>
                                    <span className="bg-[#f3f4f6] dark:bg-neutral-800/50 dark:text-gray-300 px-3 py-1 rounded-lg font-sfpro-bold text-[12px]">{data.startDate}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-2">End Date :</span>
                                    <span className="bg-[#f3f4f6] dark:bg-neutral-800/50 dark:text-gray-300 px-3 py-1 rounded-lg font-sfpro-bold text-[12px]">{data.endDate}</span>
                                </div>
                            </div>
                            <div className="flex gap-2"><span className="text-gray-400">Status :</span><span className="font-sfpro-bold dark:text-gray-200">{data.status}</span></div>
                            <div className="flex gap-2"><span className="text-gray-400">Health :</span><span className="font-sfpro-bold dark:text-gray-200">{data.health}</span></div>
                            <div className="flex gap-2"><span className="text-gray-400">Total Budget :</span><span className="font-sfpro-bold dark:text-gray-200">{data.budgetTotal}</span></div>
                        </div>
                    )}

                    <div className="absolute bottom-8 right-8 w-20 h-20">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{ v: 100 }]} innerRadius={30} outerRadius={38} stroke="none" className="fill-gray-100 dark:fill-white/5" dataKey="v" />
                                <Pie data={[{ v: pct }, { v: 100 - pct }]} innerRadius={30} outerRadius={38} startAngle={90} endAngle={-270} stroke="none" dataKey="v">
                                    <Cell fill="currentColor" className="text-black dark:text-white" />
                                    <Cell fill="transparent" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-sfpro-bold dark:text-white">{pct}%</div>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white dark:bg-[#0d0d0d] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800/50">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-sfpro-bold text-[#1e1e1e] dark:text-white">Assigned Members</h3>
                        <Edit
                            onClick={() => setIsMembersModalOpen(true)}
                            className="w-5 h-5 text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1a1a1a] animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-28 bg-gray-100 dark:bg-[#1a1a1a] rounded animate-pulse" />
                                        <div className="h-2 w-36 bg-gray-100 dark:bg-[#1a1a1a] rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(data.members || []).slice(0, 4).map((m, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden border border-gray-50 dark:border-white/5 shrink-0">
                                            {m.avatar
                                                ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                                                : <span className="w-full h-full flex items-center justify-center text-xs font-sfpro-bold text-gray-500">{(m.name || "U")[0].toUpperCase()}</span>
                                            }
                                        </div>
                                        <div>
                                            <div className="text-sm font-sfpro-bold dark:text-gray-200">{m.name}</div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{m.email}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] text-gray-400 uppercase tracking-tight">assigned as</div>
                                        <div className="text-[11px] font-sfpro-bold dark:text-gray-300">{m.role || "Member"}</div>
                                    </div>
                                </div>
                            ))}
                            {data.members?.length === 0 && (
                                <p className="text-sm text-gray-400 dark:text-[#52525b] font-sfpro text-center py-4">No members assigned</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {metrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {metrics.map((item, i) => (
                        <SummaryCard key={i} item={item} />
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                <div className="lg:col-span-2 bg-white dark:bg-[#0d0d0d] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800/50">
                    {phasesLoading ? (
                        <div className="h-72 bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl animate-pulse" />
                    ) : (
                        <BarChartSection
                            title="Phase Growth"
                            description="Completion progress per phase"
                            data={data.phaseData || []}
                            xAxisKey="name"
                        />
                    )}
                </div>

                <div className="bg-white dark:bg-[#0d0d0d] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800/50">
                    <h3 className="text-xl font-sfpro-bold text-[#1e1e1e] dark:text-white">Alerts</h3>
                    <p className="text-xs text-gray-400 mt-1 mb-6">
                        {data.alertSummary?.total > 0
                            ? `${data.alertSummary.critical} critical · ${data.alertSummary.warning} warning · ${data.alertSummary.info} info`
                            : "All systems healthy"
                        }
                    </p>
                    <div className="space-y-4 overflow-y-auto max-h-72 pr-1" style={{ scrollbarWidth: "thin" }}>
                        {alertsLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-5 bg-gray-100 dark:bg-[#1a1a1a] rounded animate-pulse" />
                            ))
                        ) : (data.alerts || []).length === 0 ? (
                            <p className="text-sm text-gray-400 font-sfpro text-center py-4">No active alerts</p>
                        ) : (
                            data.alerts.map((alert, i) => (
                                <div key={i} className="flex items-center gap-4 text-xs font-sfpro-bold text-gray-700 dark:text-gray-300">
                                    <div className={`rounded p-1 shrink-0 ${ALERT_PRIORITY_COLOR[alert.priority] || "bg-black dark:bg-white"}`}>
                                        <AlertTriangle className="w-3 h-3 text-white" />
                                    </div>
                                    {alert.message}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <EditProjectDrawer
                open={isProjectDrawerOpen}
                onClose={() => setIsProjectDrawerOpen(false)}
                projectData={rawDetails}
                onSaved={onRefresh}
            />

            <ManageMembersModal
                isOpen={isMembersModalOpen}
                onClose={() => setIsMembersModalOpen(false)}
                project={{ id: projectId }}
                onMembersChanged={onRefresh}
            />
        </div>
    )
}