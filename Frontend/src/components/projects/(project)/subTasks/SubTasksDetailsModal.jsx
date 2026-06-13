"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, AlertCircle, CircleDashed, PauseCircle, Calendar, Timer, User, Tag, FileText, Layers } from "lucide-react"

function Backdrop({ visible, onClose }) {
    return (
        <div onClick={onClose} style={{ transitionDuration: "400ms" }} className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
    )
}
const STATUS_CONFIG = {
    Completed: {
        label: "Completed",
        icon: CheckCircle2,
        className: "text-[#73A464] bg-[#f0faf0] dark:bg-[#1a2e1a] border border-[#73A464]/30",
    },
    InProgress: {
        label: "In Progress",
        icon: Clock,
        className: "text-[#3b82f6] bg-[#eff6ff] dark:bg-[#1a2440] border border-[#3b82f6]/30",
    },
    Blocked: {
        label: "Blocked",
        icon: AlertCircle,
        className: "text-[#ef4444] bg-[#fff1f1] dark:bg-[#2e1a1a] border border-[#ef4444]/30",
    },
    NotStarted: {
        label: "Not Started",
        icon: CircleDashed,
        className: "text-[#a1a1aa] bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46]",
    },
    OnHold: {
        label: "On Hold",
        icon: PauseCircle,
        className: "text-[#f59e0b] bg-[#fffbeb] dark:bg-[#2e2310] border border-[#f59e0b]/30",
    },
}
function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.NotStarted
    const Icon = config.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sfpro-medium whitespace-nowrap ${config.className}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {config.label}
        </span>
    )
}
function getDuration(start, end) {
    if (!start || !end) return "—"
    const parseDate = (d) => {
        if (!d) return null
        if (d instanceof Date) return d
        const parsed = new Date(d)
        return isNaN(parsed.getTime()) ? null : parsed
    }
    const s = parseDate(start)
    const e = parseDate(end)
    if (!s || !e) return "—"
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return "—"
    return `${diffDays} Days`
}
function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}
function UserAvatar({ user, size = 22 }) {
    const [imageError, setImageError] = useState(false)
    const hasAvatar = user?.avatar && user.avatar.trim() !== "" && !imageError

    if (hasAvatar) {
        return (
            <img
                src={user.avatar}
                alt={user.name || "User"}
                width={size}
                height={size}
                onError={() => setImageError(true)}
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        )
    }
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#27272a] flex items-center justify-center text-[8px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]"
        >
            {getInitials(user?.name)}
        </div>
    )
}
function SubTaskDetailSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-2.5">
                <div className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                <div className="h-5 w-1/2 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
            </div>
            <div className="flex flex-col gap-3">
                <div className="h-7 w-28 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-[#252525] rounded-full" />
                    <div className="h-4 w-10 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                </div>
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="grid grid-cols-2 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="h-3 w-16 bg-gray-100 dark:bg-[#252525] rounded-md" />
                        <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                    </div>
                ))}
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="h-3 w-20 bg-gray-100 dark:bg-[#252525] rounded-md" />
                <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#1e1e1e]">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#27272a]" />
                            <div className="h-3 w-14 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-2.5">
                <div className="h-3 w-20 bg-gray-100 dark:bg-[#252525] rounded-md" />
                <div className="h-3 w-full bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-3 w-5/6 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-3 w-4/6 bg-gray-200 dark:bg-[#27272a] rounded-md" />
            </div>
        </div>
    )
}
function SubTaskDetailContent({ subtask }) {
    const completionTextColor = subtask.status === "Completed" ? "text-[#73A464]" : "text-[#71717a] dark:text-[#a1a1aa]"
    const infoItems = [
        { icon: Calendar, label: "Start Date", value: subtask.startDate || "—" },
        { icon: Calendar, label: "End Date", value: subtask.endDate || "—" },
        { icon: Timer, label: "Duration", value: getDuration(subtask.startDate, subtask.endDate) },
        { icon: Tag, label: "Priority", value: subtask.priority || "Medium" },
        { icon: User, label: "Created By", value: subtask.createdBy?.name || "—" },
        { icon: Layers, label: "Phase", value: subtask.phaseName || "—" },
    ]
    return (
        <div className="flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                {subtask.title}
            </h3>
            <div className="flex items-center gap-3 w-full min-w-45">
                <StatusBadge status={subtask.status} />
                <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#27272a] overflow-hidden">
                    <div className="h-full rounded-full bg-[#222222] dark:bg-white transition-all duration-500" style={{ width: `${subtask.completionPercent}%` }} />
                </div>
                <span className={`text-xs font-sfpro-bold tabular-nums whitespace-nowrap ${completionTextColor}`}>
                    {subtask.completionPercent}%
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {infoItems.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[#a1a1aa] dark:text-[#71717a]">
                            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                            <span className="text-xs font-sfpro-medium">{label}</span>
                        </div>
                        <p className="text-sm font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">{value}</p>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-[#a1a1aa] dark:text-[#71717a]">
                    <User className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="text-xs font-sfpro-medium">Assigned To</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {subtask.assignedTo?.length > 0 ? subtask.assignedTo.map((user, i) => (
                        <div key={user.id || i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent border border-[#e4e4e7] dark:border-[#252525]">
                            <UserAvatar user={user} size={22} />
                            <span className="text-xs font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">{user.name || "Unknown"}</span>
                        </div>
                    )) : (
                        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a]">No members assigned</p>
                    )}
                </div>
            </div>
            {subtask.description && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-[#a1a1aa] dark:text-[#71717a]">
                            <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span className="text-xs font-sfpro">Description</span>
                        </div>
                        <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed">{subtask.description}</p>
                    </div>
                </>
            )}
        </div>
    )
}
export default function SubTaskDetailsModal({ open, onClose, subtask }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        if (open) {
            setMounted(true)
            setLoading(true)
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    setVisible(true)
                    setTimeout(() => setLoading(false), 300)
                })
            )
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setLoading(false)
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open, subtask])
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && open) onClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose])
    if (!mounted) return null
    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />
            <div style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }} className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}>
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>
                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Sub Task Details
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                View all details of this sub task
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pt-5 lg:px-0" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto">
                            {loading ? (
                                <SubTaskDetailSkeleton />
                            ) : subtask ? (
                                <SubTaskDetailContent subtask={subtask} />
                            ) : null}
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
                        <button onClick={onClose} className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}