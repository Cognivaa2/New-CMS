"use client"
import { useEffect, useState } from "react"
import { X, MapPin, User, CalendarDays, CircleDollarSign, BarChart2, Activity } from "lucide-react"
import { fetchProjectById } from "@/app/(companyname)/projects/api.jsx"
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts"


function fmt(dateStr) {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

function fmtBudget(num) {
    if (!num && num !== 0) return "—"
    if (num >= 1_00_00_000) return `₹${(num / 1_00_00_000).toFixed(2)} Cr`
    if (num >= 1_00_000) return `₹${(num / 1_00_000).toFixed(2)} L`
    return `₹${num.toLocaleString("en-IN")}`
}

const STATUS_LABELS = {
    planned: "Planned",
    active: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
}

const HEALTH_LABELS = {
    on_track: "On Track",
    delayed: "Delayed",
    over_budget: "Over Budget",
}


function InfoBlock({ icon: Icon, label, value }) {
    return (
        <div className="flex gap-4">
            <div className="w-11 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
                <Icon size={18} className="text-zinc-800 dark:text-zinc-200" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col pt-0.5">
                <span className="text-[14px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1.5">
                    {label}
                </span>
                <span className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed pr-4">
                    {value === 0 ? (<span className="italic opacity-60">Not started yet</span>) : value ? (value
                    ) : (
                        <span className="italic opacity-60">Not started yet</span>
                    )}
                </span>
            </div>
        </div>
    )
}

function StatusBlock({ label, value }) {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                <BarChart2 size={16} strokeWidth={2.5} />
                <span className="text-[13px] font-bold">{label}</span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-tight mb-3 max-w-35">
                Current {label.toLowerCase()} of this project
            </p>
            <div className="px-6 py-2 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 text-[13px] font-bold rounded-full w-fit tracking-wide">
                {value}
            </div>
        </div>
    )
}

function ProgressRing({ percentage = 0, isDark = false }) {
    const trackColor = isDark ? "#27272a" : "#f4f4f5"
    const fillColor = isDark ? "#f4f4f5" : "#1A1A1A"
    const textColor = isDark ? "#f4f4f5" : "#18181b"

    const data = [{ value: percentage }]

    return (
        <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
            <RadialBarChart
                width={84}
                height={84}
                cx={42}
                cy={42}
                innerRadius={27}
                outerRadius={40}
                startAngle={90}
                endAngle={-270}
                barSize={7}
                data={data}
            >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                    background={{ fill: trackColor }}
                    dataKey="value"
                    angleAxisId={0}
                    cornerRadius={4}
                    fill={fillColor}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-out"
                />
            </RadialBarChart>
            <span className="absolute text-[17px] font-bold" style={{ color: textColor }}>{percentage}%</span>
        </div>
    )
}

function PreviewSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-start">
                <div className="h-8 w-64 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-8 w-40 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
            </div>
            <div>
                <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded mb-3 animate-pulse" />
                <div className="space-y-2">
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
                        <div className="space-y-2 w-full pt-1">
                            <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                            <div className="h-2 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


export default function ProjectQuickPreviewModal({ isOpen, onClose, projectId }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [project, setProject] = useState(null)
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)")
        setIsDark(document.documentElement.classList.contains("dark") || mq.matches)
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"))
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setProject(null)
                setError(null)
            }, 300)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen || !projectId) return
        const controller = new AbortController()
        setLoading(true)
        setError(null)
        fetchProjectById(projectId, controller.signal)
            .then((data) => {
                setProject(data.project)
                setStats(data.stats)
            })
            .catch((err) => {
                if (err.name !== "CanceledError") setError("Failed to load project details.")
            })
            .finally(() => setLoading(false))

        return () => controller.abort()
    }, [isOpen, projectId])

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape" && isOpen) onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, onClose])

    if (!mounted) return null

    const healthLabel = HEALTH_LABELS[project?.healthStatus] || "On Track"
    const statusLabel = STATUS_LABELS[project?.status] || "Planned"
    const completionPct = Math.min(100, Math.max(0, project?.completionPercent || 0))

    return (
        <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div onClick={onClose} className={`absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"}`} />

            <div className={` w-full max-w-210 bg-[#FAFAFA] dark:bg-[#121212] rounded-4xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-none border border-zinc-200/60 dark:border-zinc-800/80 overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"} max-h-[95dvh] flex flex-col`}>
                <div className="overflow-y-auto overscroll-contain p-8 sm:p-12">

                    {loading && <PreviewSkeleton />}
                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                            <Activity size={32} className="text-zinc-300 dark:text-zinc-700" />
                            <p className="text-sm font-medium text-zinc-500">{error}</p>
                        </div>
                    )}

                    {project && !loading && (
                        <div className="flex flex-col">

                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
                                <h1 className="text-2xl sm:text-[26px] font-sfpro-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight pr-8">
                                    {project.projectName}
                                </h1>
                                {project.projectCode && (
                                    <div className="shrink-0 px-5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1C1C1E]">
                                        <span className="text-[13px] font-sfpro-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                            Project Code : #{project.projectCode}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="mb-8 max-w-2xl">
                                <h3 className="text-[14px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 mb-2.5">Description</h3>
                                <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    {project.description || "No description provided."}
                                </p>
                            </div>

                            <div className="h-px w-full bg-zinc-200/80 dark:bg-zinc-800/80 mb-8" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10 mb-8">
                                <InfoBlock icon={MapPin} label="Location" value={project.location} />
                                <InfoBlock icon={User} label="Client" value={project.clientName} />
                                <InfoBlock icon={CircleDollarSign} label="Budget" value={fmtBudget(project.budget)} />
                                <InfoBlock icon={CalendarDays} label="Start Date" value={fmt(project.startDate)} />
                                <InfoBlock icon={CalendarDays} label="End Date" value={fmt(project.endDate)} />

                                <InfoBlock icon={BarChart2} label="Total Phases" value={stats?.totalPhases} />
                                <InfoBlock icon={BarChart2} label="Total Tasks" value={stats?.totalTasks} />
                                <InfoBlock icon={BarChart2} label="Total Subtasks" value={stats?.totalSubtasks} />
                                <InfoBlock icon={BarChart2} label="Completed Tasks" value={stats?.completedTasks} />
                                <InfoBlock icon={BarChart2} label="Completed Subtasks" value={stats?.completedSubtasks} />
                            </div>

                            <div className="h-px w-full bg-zinc-200/80 dark:bg-zinc-800/80 mb-8" />

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8">
                                <div className="flex flex-wrap gap-x-12 gap-y-6">
                                    <StatusBlock label="Health Status" value={healthLabel} />
                                    <StatusBlock label="Progress Status" value={statusLabel} />
                                </div>
                                <div className="shrink-0 pr-4 pb-2">
                                    <ProgressRing percentage={completionPct} isDark={isDark} />
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}