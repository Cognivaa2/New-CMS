"use client"

import { useState, useCallback } from "react"
import {
    CheckCircle2,
    Clock,
    XCircle,
    Eye,
    Pencil,
    Trash2,
    MessageSquare,
    UserPlus,
    FileText,
    ImageIcon,
    Paperclip,
    AlertTriangle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import IssueCommentsModal from "./IssueCommentsModal"
import IssueManageMembersModal from "./IssueManageMembersModal"
import IssueViewModal from "@/components/projects/(project)/issues/IssueViewModal"
import IssueAttachmentDrawer from "./IssueAttachmentDrawer"

const HEADERS = [
    "Issue",
    "Type",
    "Priority",
    "Status",
    "Assigned To",
    "Created By",
    "Attachment",
    "Created At",
    "Actions",
    "",
]

function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function StatusPill({ status }) {
    let style = ""
    let Icon = null
    switch (status) {
        case "Resolved":
            style = "text-xs bg-[#ebfbf1] border-[#c1f0d0] text-[#16a34a] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400"
            Icon = CheckCircle2
            break
        case "In Progress":
            style = "text-xs bg-[#fdf8e6] border-[#f5e5a3] text-[#b45309] dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400"
            Icon = Clock
            break
        case "Blocked":
            style = "text-xs bg-[#fdf0f0] border-[#f5c2c2] text-[#dc2626] dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
            Icon = XCircle
            break
        default:
            style = "text-xs bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            Icon = Clock
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] lg:text-xs font-sfpro-bold whitespace-nowrap transition-colors ${style}`}>
            <Icon className="w-2 h-2 lg:w-4 lg:h-4 shrink-0" strokeWidth={2} />
            {status}
        </span>
    )
}

function PriorityPill({ priority }) {
    let style = ""
    let Icon = null
    const label = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : "Medium"
    switch (priority?.toLowerCase()) {
        case "critical":
            style = "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
            Icon = AlertTriangle
            break
        case "high":
            style = "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400"
            Icon = ArrowUp
            break
        case "medium":
            style = "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400"
            Icon = AlertCircle
            break
        case "low":
            style = "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-500/10 dark:border-gray-500/20 dark:text-gray-400"
            Icon = ArrowDown
            break
        default:
            style = "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400"
            Icon = AlertCircle
    }
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] lg:text-[12px] font-sfpro-bold whitespace-nowrap transition-colors ${style}`}>
            <Icon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
            {label}
        </span>
    )
}

function UserAvatar({ user, size = 32 }) {
    const [imgError, setImgError] = useState(false)
    const hasAvatar = user?.avatar && user.avatar.trim() !== "" && !imgError

    if (hasAvatar) {
        return (
            <img
                src={user.avatar}
                alt={user.name || "User"}
                width={size}
                height={size}
                onError={() => setImgError(true)}
                className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
                style={{ width: size, height: size }}
            />
        )
    }
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
        >
            {getInitials(user?.name)}
        </div>
    )
}

function UserCell({ user }) {
    if (!user)
        return (
            <span className="text-[13px] text-gray-400 dark:text-[#52525b]">—</span>
        )
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar user={user} size={30} />
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                    {user.name || "Unknown"}
                </span>
                {user.role && (
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">
                        {user.role || "Team Member"}
                    </span>
                )}
            </div>
        </div>
    )
}

function AssignedToCell({ assignedTo }) {
    if (!assignedTo || assignedTo.length === 0)
        return (
            <span className="text-[13px] text-gray-400 dark:text-[#52525b] italic">Unassigned</span>
        )

    if (assignedTo.length === 1) {
        return <UserCell user={assignedTo[0]} />
    }

    return (
        <div className="flex items-center">
            <div className="flex -space-x-2">
                {assignedTo.slice(0, 3).map((user, idx) => (
                    <UserAvatar key={user.keycloakId || idx} user={user} size={28} />
                ))}
            </div>
            {assignedTo.length > 3 && (
                <span className="ml-2 text-[11px] font-sfpro-bold text-gray-500 dark:text-[#a1a1aa]">
                    +{assignedTo.length - 3}
                </span>
            )}
        </div>
    )
}

function AssignedToCardCell({ assignedTo }) {
    if (!assignedTo || assignedTo.length === 0)
        return (
            <span className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">Unassigned</span>
        )

    if (assignedTo.length === 1) {
        return (
            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                <UserAvatar user={assignedTo[0]} size={22} />
                <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                    {assignedTo[0]?.name || "—"}
                </span>
            </div>
        )
    }

    return (
        <div className="flex items-center mt-0.5">
            <div className="flex -space-x-1.5">
                {assignedTo.slice(0, 3).map((user, idx) => (
                    <UserAvatar key={user.keycloakId || idx} user={user} size={22} />
                ))}
            </div>
            {assignedTo.length > 3 && (
                <span className="ml-1.5 text-[11px] font-sfpro-bold text-gray-500 dark:text-[#a1a1aa]">
                    +{assignedTo.length - 3}
                </span>
            )}
            <span className="ml-1.5 text-[11px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                {assignedTo.length} members
            </span>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                <FileText className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                    No issues found
                </p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Issues will appear here once they are created.
                </p>
            </div>
        </div>
    )
}

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                {label}
            </span>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-word">
                {children || "—"}
            </div>
        </div>
    )
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="h-3.5 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
                    <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                </div>
                <div className="h-6 w-6 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((n) => (
                    <div key={n} className="space-y-1.5">
                        <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

function SkeletonRow() {
    return (
        <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
            {HEADERS.map((_, i) => (
                <td key={i} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse" />
                </td>
            ))}
        </tr>
    )
}

function IssueCard({ row, menuItems, onResolve, onReject, onClick }) {
    const hasAttachments = row.attachments && row.attachments.length > 0

    return (
        <div onClick={() => onClick?.(row)} className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
                            {row.issue || row.title}
                        </p>
                        {hasAttachments && (
                            <Paperclip className="w-3.5 h-3.5 text-blue-700 dark:text-blue-500 shrink-0" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {row.issueType && (
                            <span className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                                {row.issueType}
                            </span>
                        )}
                        {row.issueType && row.priority && (
                            <span className="text-[#d4d4d8] dark:text-[#3f3f46]">·</span>
                        )}
                        {row.priority && <PriorityPill priority={row.priority} />}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StatusPill status={row.status} />
                    <div onClick={(e) => e.stopPropagation()}>
                        <ThreeDotMenu
                            items={menuItems}
                            size="md"
                            header={{
                                image: row.createdBy?.avatar,
                                title: row.issue || row.title,
                                subtitle: row.issueType || "Issue",
                                statusColor: row.status === "Resolved" ? "#22c55e" : row.status === "Blocked" ? "#ef4444" : "#eab308",
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Assigned To
                    </span>
                    <AssignedToCardCell assignedTo={row.assignedTo} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Created By
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                        <UserAvatar user={row.createdBy} size={22} />
                        <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                            {row.createdBy?.name || "—"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <DetailRow label="Created At">{row.createdAt}</DetailRow>
                <DetailRow label="Attachment">
                    {hasAttachments ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                menuItems
                                    .find((i) => i.label === "View Attachment")
                                    ?.onClick?.()
                            }}
                            className="h-6 px-2 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[11px] font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1 mt-0.5"
                        >
                            <ImageIcon className="w-3 h-3" />
                            View
                        </button>
                    ) : (
                        <span className="italic text-[12px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                            Not Provided
                        </span>
                    )}
                </DetailRow>
            </div>

            {row.backendStatus === "submitted" && (
                <div className="flex gap-2 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                    {onResolve && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onResolve(row)
                            }}
                            className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 h-9 bg-green-500/10 hover:bg-green-600 border border-green-500/20 hover:border-green-600 text-green-600 hover:text-white rounded-xl text-[13px] font-sfpro-bold transition-all duration-150"
                        >
                            Resolve
                        </button>
                    )}
                    {onReject && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onReject(row)
                            }}
                            className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 h-9 bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-600 hover:text-white rounded-xl text-[13px] font-sfpro-bold transition-all duration-150"
                        >
                            Reject
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

function IssueRow({ row, menuItems, isLast, onRowClick, onResolve, onReject }) {
    const hasAttachments = row.attachments && row.attachments.length > 0

    return (
        <tr
            onClick={() => onRowClick?.(row)}
            className={`cursor-pointer group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""}`}
        >
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white">
                        {row.issue || row.title}
                    </span>
                    {hasAttachments && (
                        <Paperclip className="w-4 h-4 text-blue-700 dark:text-blue-500" />
                    )}
                </div>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {row.issueType || "—"}
                </span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <PriorityPill priority={row.priority} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <StatusPill status={row.status} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <AssignedToCell assignedTo={row.assignedTo} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <UserCell user={row.createdBy} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {hasAttachments ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            menuItems
                                .find((i) => i.label === "View Attachment")
                                ?.onClick?.()
                        }}
                        className="cursor-pointer h-7 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1"
                    >
                        <ImageIcon className="w-3.5 h-3.5" />
                        View
                    </button>
                ) : (
                    <span className="italic text-[12px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                        Not Provided
                    </span>
                )}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {row.createdAt}
                </span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {row.backendStatus === "submitted" && onResolve && (
                        <button onClick={() => onResolve(row)} title="Resolve"
                            className="cursor-pointer flex items-center gap-1 h-7 px-2.5 rounded-lg hover:bg-green-600 border border-green-500/30 hover:border-green-600 text-green-600 hover:text-white text-xs font-sfpro-bold transition-all duration-150 whitespace-nowrap">
                            Resolve
                        </button>
                    )}
                    {row.backendStatus === "submitted" && onReject && (
                        <button
                            onClick={() => onReject(row)}
                            title="Reject"
                            className="cursor-pointer flex items-center gap-1 h-7 px-2.5 rounded-lg hover:bg-red-600 border border-red-500/30 hover:border-red-600 text-red-700 hover:text-white text-[11.5px] font-sfpro-bold transition-all duration-150 whitespace-nowrap"
                        >
                            Reject
                        </button>
                    )}
                    {row.backendStatus !== "submitted" && (
                        <span className="text-[11.5px] text-gray-400 dark:text-[#52525b] font-sfpro">—</span>
                    )}
                </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
                    <ThreeDotMenu
                        items={menuItems}
                        size="sm"
                        header={{
                            image: row.createdBy?.avatar,
                            title: row.issue || row.title,
                            subtitle: row.issueType || "Issue",
                            statusColor:
                                row.status === "Resolved"
                                    ? "#22c55e"
                                    : row.status === "Blocked"
                                        ? "#ef4444"
                                        : "#eab308",
                        }}
                    />
                </div>
            </td>
        </tr>
    )
}

export default function IssueTable({
    data = [],
    isLoading = false,
    onDelete,
    onEdit,
    onRefresh,
    pagination,
    onPageChange,
    projectUsers = [],
    isLoadingUsers = false,
    onAssignMember,
    onUnassignMember,
    onResolve,
    onReject,
}) {
    const [commentsIssue, setCommentsIssue] = useState(null)
    const [membersIssue, setMembersIssue] = useState(null)
    const [viewIssue, setViewIssue] = useState(null)
    const [attachmentIssue, setAttachmentIssue] = useState(null)
    const [attachmentOpen, setAttachmentOpen] = useState(false)

    const handleAssign = async (user) => {
        if (onAssignMember && membersIssue) {
            await onAssignMember(membersIssue.id, user)
        }
    }

    const handleUnassign = async (user) => {
        if (onUnassignMember && membersIssue) {
            await onUnassignMember(membersIssue.id, user)
        }
    }

    const handleViewClick = useCallback((row) => {
        setViewIssue(row)
    }, [])

    const handleCloseView = useCallback(() => {
        setViewIssue(null)
    }, [])

    const handleOpenAttachment = useCallback((row) => {
        if (!row?.attachments || row.attachments.length === 0) return
        setAttachmentIssue(row)
        setAttachmentOpen(true)
    }, [])

    const handleCloseAttachment = useCallback(() => {
        setAttachmentOpen(false)
        setTimeout(() => {
            setAttachmentIssue(null)
        }, 300)
    }, [])

    const buildMenuItems = (row) => {
        const hasAttachments = row.attachments && row.attachments.length > 0
        const items = [
            {
                label: "View details",
                icon: <Eye className="w-4 h-4" />,
                onClick: () => handleViewClick(row),
            },
            ...(hasAttachments
                ? [
                    {
                        label: "View Attachment",
                        icon: <ImageIcon className="w-4 h-4" />,
                        onClick: () => handleOpenAttachment(row),
                    },
                ]
                : []),
            {
                label: "Comments",
                icon: <MessageSquare className="w-4 h-4" />,
                onClick: () => setCommentsIssue(row),
            },
            {
                label: "Manage members",
                icon: <UserPlus className="w-4 h-4" />,
                onClick: () => setMembersIssue(row),
            },
            {
                label: "Edit issue",
                icon: <Pencil className="w-4 h-4" />,
                onClick: () => onEdit?.(row),
            },
            "divider",
            {
                label: "Delete issue",
                icon: <Trash2 className="w-4 h-4" />,
                variant: "danger",
                onClick: () => onDelete?.(row),
            },
        ]
        return items
    }

    return (
        <div className="w-full font-sfpro pb-10">
            <div className="lg:hidden space-y-3">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : data.length === 0
                        ? <EmptyState />
                        : data.map((row) => (
                            <IssueCard
                                key={row.id}
                                row={row}
                                menuItems={buildMenuItems(row)}
                                onResolve={onResolve}
                                onReject={onReject}
                                onClick={handleViewClick}
                            />
                        ))}
            </div>

            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full min-w-300 border-collapse">
                        <thead>
                            <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                                {HEADERS.map((h, i) => (
                                    <th key={i} className="px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#121212]">
                            {isLoading
                                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                : data.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={HEADERS.length}>
                                                <EmptyState />
                                            </td>
                                        </tr>
                                    )
                                    : data.map((row, index) => (
                                        <IssueRow
                                            key={row.id}
                                            row={row}
                                            menuItems={buildMenuItems(row)}
                                            isLast={index === data.length - 1}
                                            onRowClick={handleViewClick}
                                            onResolve={onResolve}
                                            onReject={onReject}
                                        />
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-2 gap-3">
                    <p className="text-[13px] sm:text-sm font-sfpro text-gray-500 dark:text-[#71717a] text-center sm:text-left">
                        Showing{" "}
                        {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                        {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange?.(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-[13px] sm:text-sm font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-[13px] sm:text-sm font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] px-2 whitespace-nowrap">
                            {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange?.(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-[13px] sm:text-sm font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <IssueCommentsModal
                isOpen={!!commentsIssue}
                onClose={() => setCommentsIssue(null)}
                issueId={commentsIssue?.id}
                issueTitle={commentsIssue?.title || commentsIssue?.issue}
            />

            <IssueManageMembersModal
                isOpen={!!membersIssue}
                onClose={() => setMembersIssue(null)}
                issue={membersIssue}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
            />

            <IssueViewModal
                isOpen={!!viewIssue}
                onClose={handleCloseView}
                issue={viewIssue}
            />

            <IssueAttachmentDrawer
                open={attachmentOpen}
                onClose={handleCloseAttachment}
                attachments={attachmentIssue?.attachments || []}
                issueTitle={attachmentIssue?.title || attachmentIssue?.issue || ""}
            />
        </div>
    )
}