"use client"

import { useState } from "react"
import { CheckCircle2, Clock, AlertCircle, CircleDashed, PauseCircle, Eye, Pencil, Trash2, UserPlus, TrendingUp, FolderOpen } from "lucide-react"
import Tooltip from "@/components/ui/Tooltip"
import SubTaskDetailsModal from "./SubTasksDetailsModal"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import SubTaskManageMembersModal from "./SubTaskManageMembersModal"
import SubTaskDocumentsModal from "./SubTaskDocumentsModal"  

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
    const diffMs = e - s
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return "—"
    return `${diffDays} Days`
}

const STATUS_CONFIG = {
    Completed: {
        label: "Completed",
        icon: CheckCircle2,
        className: "text-[#73A464] bg-[#f0faf0] dark:bg-[#1a2e1a] border border-[#73A464]/30",
        color: "#22c55e"
    },
    InProgress: {
        label: "In Progress",
        icon: Clock,
        className: "text-[#3b82f6] bg-[#eff6ff] dark:bg-[#1a2440] border border-[#3b82f6]/30",
        color: "#3b82f6"
    },
    Blocked: {
        label: "Blocked",
        icon: AlertCircle,
        className: "text-[#ef4444] bg-[#fff1f1] dark:bg-[#2e1a1a] border border-[#ef4444]/30",
        color: "#ef4444"
    },
    NotStarted: {
        label: "Not Started",
        icon: CircleDashed,
        className: "text-[#a1a1aa] bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46]",
        color: "#a1a1aa"
    },
    OnHold: {
        label: "On Hold",
        icon: PauseCircle,
        className: "text-[#f59e0b] bg-[#fffbeb] dark:bg-[#2e2310] border border-[#f59e0b]/30",
        color: "#f59e0b"
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

function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function UserAvatar({ user, size = 28 }) {
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
            className="rounded-full bg-gray-200 dark:bg-[#27272a] flex items-center justify-center text-[10px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]"
        >
            {getInitials(user?.name)}
        </div>
    )
}

function AvatarStack({ members = [] }) {
    return (
        <div className="flex -space-x-2 shrink-0">
            {members.slice(0, 3).map((user, i) => (
                <div key={user.id || i} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#121212] overflow-hidden bg-gray-200 dark:bg-[#27272a]">
                    <Tooltip content={user.name || "Unknown"} side="bottom">
                        <div>
                            <UserAvatar user={user} size={28} />
                        </div>
                    </Tooltip>
                </div>
            ))}
            {members.length > 3 && (
                <Tooltip content={`+${members.length - 3} more`} side="bottom">
                    <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#121212] bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center text-[10px] font-sfpro-medium text-[#71717a]">
                        +{members.length - 3}
                    </div>
                </Tooltip>
            )}
        </div>
    )
}

function SubTaskMobileCard({ subtask, onClick, onEdit, onDelete, onManageMembers, onUpdateProgress, onViewDocuments }) {
    const menuItems = [
        { label: "View details", icon: <Eye className="w-4 h-4" />, onClick: () => onClick() },
        { label: "Update progress", icon: <TrendingUp className="w-4 h-4" />, onClick: () => onUpdateProgress?.(subtask) },
        { label: "Edit subtask", icon: <Pencil className="w-4 h-4" />, onClick: () => onEdit?.(subtask) },
        { label: "Manage members", icon: <UserPlus className="w-4 h-4" />, onClick: () => onManageMembers?.(subtask) },
        { label: "View documents", icon: <FolderOpen className="w-4 h-4" />, onClick: () => onViewDocuments?.(subtask) },  // Add this
        "divider",
        { label: "Delete subtask", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => onDelete?.(subtask) },
    ]
    const menuHeader = {
        image: subtask.createdBy?.avatar,
        title: subtask.createdBy?.name || "Unknown",
        subtitle: subtask.title,
        statusColor: STATUS_CONFIG[subtask.status]?.color || "#a1a1aa"
    }
    return (
        <div onClick={onClick} className="cursor-pointer rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar user={subtask.createdBy} size={32} />
                    <div className="min-w-0">
                        <p className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] truncate">{subtask.createdBy?.name || "Unknown"}</p>
                        <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">{subtask.createdBy?.role || "Team Member"}</p>
                    </div>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-2 relative z-10">
                    <ThreeDotMenu items={menuItems} size="md" header={menuHeader} />
                </div>
            </div>
            <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] line-clamp-2">{subtask.title}</p>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <StatusBadge status={subtask.status} />
                <AvatarStack members={subtask.assignedTo} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-sfpro">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[#a1a1aa] dark:text-[#71717a]">Start</span>
                    <span className="text-[#3f3f46] dark:text-[#d4d4d8]">{subtask.startDate || "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[#a1a1aa] dark:text-[#71717a]">End</span>
                    <span className="text-[#3f3f46] dark:text-[#d4d4d8]">{subtask.endDate || "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[#a1a1aa] dark:text-[#71717a]">Duration</span>
                    <span className="text-[#3f3f46] dark:text-[#d4d4d8]">{getDuration(subtask.startDate, subtask.endDate)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[#a1a1aa] dark:text-[#71717a]">Completion</span>
                    <span className={`font-sfpro-medium ${subtask.status === "Completed" ? "text-[#73A464]" : "text-[#71717a] dark:text-[#a1a1aa]"}`}>
                        {subtask.completionPercent}%
                    </span>
                </div>
            </div>
        </div>
    )
}

function SubTaskRow({ subtask, onClick, onEdit, onDelete, onManageMembers, onUpdateProgress, onViewDocuments }) {
    const completionColor = subtask.status === "Completed" ? "text-[#73A464]" : "text-[#71717a] dark:text-[#a1a1aa]"
    const menuItems = [
        { label: "View details", icon: <Eye className="w-4 h-4" />, onClick: () => onClick() },
        { label: "Update progress", icon: <TrendingUp className="w-4 h-4" />, onClick: () => onUpdateProgress?.(subtask) },
        { label: "Edit subtask", icon: <Pencil className="w-4 h-4" />, onClick: () => onEdit?.(subtask) },
        { label: "Manage members", icon: <UserPlus className="w-4 h-4" />, onClick: () => onManageMembers?.(subtask) },
        { label: "View documents", icon: <FolderOpen className="w-4 h-4" />, onClick: () => onViewDocuments?.(subtask) },  // Add this
        "divider",
        { label: "Delete subtask", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => onDelete?.(subtask) },
    ]
    const menuHeader = {
        image: subtask.createdBy?.avatar,
        title: subtask.createdBy?.name || "Unknown",
        subtitle: subtask.title,
        statusColor: STATUS_CONFIG[subtask.status]?.color || "#a1a1aa"
    }
    return (
        <tr onClick={onClick} className="group cursor-pointer border-b border-[#f0f0f0] dark:border-[#1e1e1e] last:border-0 hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150">
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <UserAvatar user={subtask.createdBy} size={32} />
                    <div className="min-w-0">
                        <p className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] truncate max-w-27.5">{subtask.createdBy?.name || "Unknown"}</p>
                        <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate max-w-27.5">{subtask.createdBy?.role || "Team Member"}</p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-4 max-w-60"><p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] line-clamp-2 leading-snug">{subtask.title}</p></td>
            <td className="px-5 py-4 whitespace-nowrap"><AvatarStack members={subtask.assignedTo} /></td>
            <td className="px-5 py-4 whitespace-nowrap"><StatusBadge status={subtask.status} /></td>
            <td className="px-5 py-4 whitespace-nowrap text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">{subtask.startDate || "—"}</td>
            <td className="px-5 py-4 whitespace-nowrap text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">{subtask.endDate || "—"}</td>
            <td className="px-5 py-4 whitespace-nowrap text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">{getDuration(subtask.startDate, subtask.endDate)}</td>
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <div className="w-20 h-1 rounded-full bg-[#f0f0f0] dark:bg-[#27272a] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300 bg-[#212121] dark:bg-white" style={{ width: `${subtask.completionPercent}%` }} />
                    </div>
                    <span className={`text-sm font-sfpro-medium ${completionColor} min-w-9.5`}>{subtask.completionPercent}%</span>
                </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <div onClick={(e) => e.stopPropagation()} className="inline-block relative z-10">
                    <ThreeDotMenu items={menuItems} size="md" header={menuHeader} />
                </div>
            </td>
        </tr>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                    No subtasks yet
                </p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Create your first subtask to start tracking progress.
                </p>
            </div>
        </div>
    )
}

export default function SubTasksTable({
    subtasks = [],
    taskId,  
    projectId, 
    onEdit,
    onDelete,
    projectUsers = [],
    isLoadingUsers = false,
    onAssignMember,
    onUnassignMember,
    onMembersChanged,
    onUpdateProgress,
}) {
    const [selectedSubTask, setSelectedSubTask] = useState(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [membersModalOpen, setMembersModalOpen] = useState(false)
    const [membersSubTask, setMembersSubTask] = useState(null)
    
    const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
    const [documentsSubTask, setDocumentsSubTask] = useState(null)

    const handleRowClick = (subtask) => {
        setSelectedSubTask(subtask)
        setDrawerOpen(true)
    }

    const handleClose = () => {
        setDrawerOpen(false)
        setTimeout(() => setSelectedSubTask(null), 500)
    }

    const handleManageMembers = (subtask) => {
        setMembersSubTask(subtask)
        setMembersModalOpen(true)
    }

    const handleMembersModalClose = () => {
        setMembersModalOpen(false)
        setTimeout(() => setMembersSubTask(null), 300)
        onMembersChanged?.()
    }

    const handleViewDocuments = (subtask) => {
        setDocumentsSubTask(subtask)
        setDocumentsModalOpen(true)
    }

    const handleDocumentsModalClose = () => {
        setDocumentsModalOpen(false)
        setTimeout(() => setDocumentsSubTask(null), 300)
    }

    const handleAssign = async (user) => {
        if (onAssignMember && membersSubTask) {
            await onAssignMember(membersSubTask.id, user)
        }
    }

    const handleUnassign = async (user) => {
        if (onUnassignMember && membersSubTask) {
            await onUnassignMember(membersSubTask.id, user)
        }
    }

    const HEADERS = ["Created By", "Activity", "Assigned", "Status", "Start", "End", "Duration", "Completion", ""]

    return (
        <>
            <div className="hidden md:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full min-w-225 border-collapse">
                        <thead>
                            <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                                {HEADERS.map((h, i) => (
                                    <th key={i} className="px-5 py-3.5 text-left text-xs font-sfpro-medium text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#121212]">
                            {subtasks.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <EmptyState />
                                    </td>
                                </tr>
                            ) : (
                                subtasks.map((s) => (
                                    <SubTaskRow
                                        key={s.id}
                                        subtask={s}
                                        onClick={() => handleRowClick(s)}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onManageMembers={handleManageMembers}
                                        onUpdateProgress={onUpdateProgress}
                                        onViewDocuments={handleViewDocuments}  
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="md:hidden flex flex-col gap-3">
                {subtasks.length === 0 ? (
                    <EmptyState />
                ) : (
                    subtasks.map((s) => (
                        <SubTaskMobileCard
                            key={s.id}
                            subtask={s}
                            onClick={() => handleRowClick(s)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onManageMembers={handleManageMembers}
                            onUpdateProgress={onUpdateProgress}
                            onViewDocuments={handleViewDocuments}  
                        />
                    ))
                )}
            </div>

            <SubTaskDetailsModal
                open={drawerOpen}
                onClose={handleClose}
                subtask={selectedSubTask}
            />

            <SubTaskManageMembersModal
                isOpen={membersModalOpen}
                onClose={handleMembersModalClose}
                subtask={membersSubTask}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
            />

            <SubTaskDocumentsModal
                isOpen={documentsModalOpen}
                onClose={handleDocumentsModalClose}
                subtask={documentsSubTask}
                taskId={taskId}
                projectId={projectId}
            />
        </>
    )
}