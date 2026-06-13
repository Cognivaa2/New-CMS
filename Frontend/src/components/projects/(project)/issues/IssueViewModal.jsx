"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
    X,
    Calendar,
    Clock,
    AlertTriangle,
    Tag,
    Paperclip,
    ExternalLink,
    MessageSquare,
    Loader2,
    Image as ImageIcon,
    File,
    FileVideo,
    FileAudio,
    Activity,
    Users,
    CheckCircle2,
    XCircle,
    CircleDot,
    User,
    Hash,
    FileText,
    Package,
} from "lucide-react"
import { fetchIssueById } from "@/app/(companyname)/projects/[projectId]/issues/api"

function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDueDate(dateString) {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const due = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24))
    const formatted = date.toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
    })
    let relativeLabel = ""
    let urgency = "normal"
    if (diffDays < 0) {
        relativeLabel = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`
        urgency = "overdue"
    } else if (diffDays === 0) {
        relativeLabel = "Due today"
        urgency = "soon"
    } else if (diffDays <= 7) {
        relativeLabel = `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`
        urgency = "soon"
    } else {
        relativeLabel = `Due in ${diffDays} days`
        urgency = "normal"
    }
    return { formatted, relativeLabel, urgency, diffDays }
}

function getFileIcon(fileType) {
    if (!fileType) return File
    if (fileType.startsWith("image/")) return ImageIcon
    if (fileType.startsWith("video/")) return FileVideo
    if (fileType.startsWith("audio/")) return FileAudio
    return File
}

function isImageFile(fileType) {
    return fileType?.startsWith("image/")
}

function Backdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        />
    )
}

function UserAvatar({ user, size = 28 }) {
    const [imgError, setImgError] = useState(false)
    const hasAvatar = user?.avatar && !imgError

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

    const initials = getInitials(user?.name)

    return (
        <div style={{ width: size, height: size }} className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0">
            {initials}
        </div>
    )
}

function DetailField({ icon: Icon, label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />}
                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                    {label}
                </span>
            </div>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-words">
                {children || "—"}
            </div>
        </div>
    )
}

function StatusBadge({ status }) {
    let Icon = CircleDot
    let filled = false

    switch (status) {
        case "Resolved":
            Icon = CheckCircle2
            filled = true
            break
        case "Blocked":
            Icon = XCircle
            break
        case "In Progress":
            Icon = CircleDot
            break
        default:
            Icon = CircleDot
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-bold whitespace-nowrap tracking-wide ${filled
            ? "bg-[#111] dark:bg-white text-white dark:text-black border-[#111] dark:border-white"
            : "bg-white dark:bg-[#18181b] text-gray-800 dark:text-gray-200 border-gray-300 dark:border-[#333]"
            }`}>
            <Icon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
            {status}
        </span>
    )
}

function PriorityBadge({ priority }) {
    const dotMap = {
        critical: "●●●●",
        high: "●●●○",
        medium: "●●○○",
        low: "●○○○",
    }
    const weightMap = {
        critical: "bg-[#111] dark:bg-white text-white dark:text-black border-[#111] dark:border-white",
        high: "bg-gray-800 dark:bg-gray-200 text-white dark:text-black border-gray-800 dark:border-gray-200",
        medium: "bg-white dark:bg-[#18181b] text-gray-800 dark:text-gray-200 border-gray-300 dark:border-[#333]",
        low: "bg-white dark:bg-[#18181b] text-gray-400 dark:text-[#666] border-gray-200 dark:border-[#2c2c2c]",
    }

    return (
        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-bold capitalize whitespace-nowrap tracking-wide ${weightMap[priority] || weightMap.medium}`}>
            <span className="text-[8px] tracking-[2px]">{dotMap[priority] || dotMap.medium}</span>
            {priority}
        </span>
    )
}

function DueDateDisplay({ dueDate }) {
    const info = formatDueDate(dueDate)
    if (!info) return <span className="text-[#a1a1aa] dark:text-[#71717a]">—</span>

    const urgencyStyle = {
        overdue: "border-black dark:border-white text-black dark:text-white bg-black/5 dark:bg-white/10",
        soon: "border-gray-400 dark:border-[#555] text-gray-600 dark:text-[#999] bg-gray-50 dark:bg-[#18181b]",
        normal: "border-gray-200 dark:border-[#2c2c2c] text-gray-400 dark:text-[#666] bg-transparent",
    }[info.urgency]

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                {info.formatted}
            </span>
            <span className={`inline-flex self-start items-center px-2 py-0.5 rounded-full border text-[10px] font-sfpro-bold ${urgencyStyle}`}>
                {info.urgency === "overdue" && <span className="mr-1">↑</span>}
                {info.relativeLabel}
            </span>
        </div>
    )
}

function IssueSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-2.5">
                <div className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg" />
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-2">
                <div className="h-2.5 w-20 bg-gray-100 dark:bg-[#252525] rounded-md" />
                <div className="h-12 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="h-2.5 w-16 bg-gray-100 dark:bg-[#252525] rounded-md" />
                        <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                    </div>
                ))}
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="h-2.5 w-20 bg-gray-100 dark:bg-[#252525] rounded-md" />
                <div className="h-12 w-48 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="h-2.5 w-24 bg-gray-100 dark:bg-[#252525] rounded-md" />
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-14 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
                ))}
            </div>
        </div>
    )
}

function IssueDetailContent({ issue }) {
    const [previewImage, setPreviewImage] = useState(null)

    return (
        <div className="flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">
                    Issue
                </p>
                <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                    {issue.title || issue.issue || "Issue Details"}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {issue.project && (
                        <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                            {issue.project}
                        </p>
                    )}
                    <div className="flex items-center gap-1.5">
                        <StatusBadge status={issue.status} />
                        {issue.priority && <PriorityBadge priority={issue.priority} />}
                    </div>
                </div>
            </div>

            {issue.description && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Description
                            </span>
                        </div>
                        <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed whitespace-pre-wrap wrap-break-word">
                            {issue.description}
                        </p>
                    </div>
                </>
            )}

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {issue.issueType && (
                    <DetailField icon={Tag} label="Type">
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-md text-[12px] font-sfpro-bold text-gray-700 dark:text-gray-300 capitalize">
                            {issue.issueType.replace(/_/g, " ")}
                        </span>
                    </DetailField>
                )}
                <DetailField icon={Activity} label="Status">
                    <StatusBadge status={issue.status} />
                </DetailField>
                <DetailField icon={AlertTriangle} label="Priority">
                    <PriorityBadge priority={issue.priority} />
                </DetailField>
                <DetailField icon={Calendar} label="Due Date">
                    <DueDateDisplay dueDate={issue.dueDate} />
                </DetailField>
                <DetailField icon={Clock} label="Created">
                    {issue.createdAt}
                </DetailField>
                <DetailField icon={Clock} label="Updated">
                    {issue.updatedAt}
                </DetailField>
            </div>

            {issue.tags && issue.tags.length > 0 && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Tags
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {issue.tags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-[#27272a] text-[11px] font-sfpro-bold text-gray-500 dark:text-[#71717a] bg-gray-50 dark:bg-[#18181b] tracking-wide"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        People
                    </span>
                </div>

                {issue.createdBy && (
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide px-1">
                            Created By
                        </span>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                            <UserAvatar user={issue.createdBy} size={26} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                    {issue.createdBy.name || "Unknown"}
                                </span>
                                {(issue.createdBy.email || issue.createdBy.role) && (
                                    <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                        {issue.createdBy.email || issue.createdBy.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide px-1">
                        Assigned To{issue.assignedTo?.length > 0 && ` (${issue.assignedTo.length})`}
                    </span>
                    {issue.assignedTo && issue.assignedTo.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                            {issue.assignedTo.map((user, i) => (
                                <div key={user.keycloakId || i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                                    <UserAvatar user={user} size={26} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                            {user.name || "Unknown"}
                                        </span>
                                        {(user.email || user.role) && (
                                            <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                                {user.email || user.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[13px] font-sfpro text-[#a1a1aa] dark:text-[#71717a] italic px-1">
                            No one assigned yet
                        </p>
                    )}
                </div>

                {issue.status === "Resolved" && issue.resolvedBy && (
                    <div className="flex flex-col gap-1.5 mt-2">
                        <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide px-1">
                            Resolved By
                            {issue.resolvedAt && (
                                <span className="ml-2 normal-case tracking-normal font-sfpro text-[10px]">
                                    — {issue.resolvedAt}
                                </span>
                            )}
                        </span>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                            <UserAvatar user={issue.resolvedBy} size={26} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                    {issue.resolvedBy.name || "Unknown"}
                                </span>
                                {(issue.resolvedBy.email || issue.resolvedBy.role) && (
                                    <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                        {issue.resolvedBy.email || issue.resolvedBy.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {issue.status === "Blocked" && issue.rejectedBy && (
                    <div className="flex flex-col gap-1.5 mt-2">
                        <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide px-1">
                            Rejected By
                            {issue.rejectedAt && (
                                <span className="ml-2 normal-case tracking-normal font-sfpro text-[10px]">
                                    — {issue.rejectedAt}
                                </span>
                            )}
                        </span>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                            <UserAvatar user={issue.rejectedBy} size={26} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                    {issue.rejectedBy.name || "Unknown"}
                                </span>
                                {(issue.rejectedBy.email || issue.rejectedBy.role) && (
                                    <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                        {issue.rejectedBy.email || issue.rejectedBy.role}
                                    </span>
                                )}
                            </div>
                        </div>
                        {issue.rejectionRemark && (
                            <div className="mt-2 px-3.5 py-2.5 bg-[#fafafa] dark:bg-[#18181b] rounded-xl border border-[#e4e4e7] dark:border-[#252525]">
                                <p className="text-[10px] font-sfpro-bold text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-widest mb-1">
                                    Remark
                                </p>
                                <p className="text-[13px] font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] wrap-break-word leading-relaxed">
                                    {issue.rejectionRemark}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {issue.attachments && issue.attachments.length > 0 && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Attachments ({issue.attachments.length})
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {issue.attachments.map((attachment, i) => {
                                const FileIcon = getFileIcon(attachment.fileType)
                                const isImage = isImageFile(attachment.fileType)
                                return (
                                    <div
                                        key={attachment.fileUrl || i}
                                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#252525] bg-[#fafafa] dark:bg-[#18181b]"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                {isImage ? (
                                                    <img
                                                        src={attachment.fileUrl}
                                                        alt={attachment.fileName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = "none"
                                                            e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600 dark:text-blue-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                                                        }}
                                                    />
                                                ) : (
                                                    <FileIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                                    {attachment.fileName}
                                                </span>
                                                <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                                    {attachment.fileType?.split("/")[1]?.toUpperCase() || "FILE"} · {formatFileSize(attachment.fileSize)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}

            {issue.commentPreview && issue.commentPreview.length > 0 && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Comments · {issue.totalComments || issue.commentPreview.length}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {issue.commentPreview.map((comment, i) => (
                                <div
                                    key={comment.id || i}
                                    className="flex gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#252525] bg-[#fafafa] dark:bg-[#18181b]"
                                >
                                    <UserAvatar user={comment.createdBy} size={24} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                            <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                                {comment.createdBy?.name || "Unknown"}
                                            </span>
                                            {comment.editedAt && (
                                                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] italic shrink-0">
                                                    edited
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] font-sfpro text-[#71717a] dark:text-[#a1a1aa] wrap-break-word leading-relaxed">
                                            {comment.text}
                                        </p>
                                        {comment.image && (
                                            <img
                                                src={comment.image}
                                                alt="Attachment"
                                                className="mt-2 max-w-45 max-h-45 rounded-lg object-cover border border-[#e4e4e7] dark:border-[#252525] cursor-pointer"
                                                onClick={() => window.open(comment.image, "_blank")}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {issue.totalComments > issue.commentPreview.length && (
                                <p className="text-center text-[11px] font-sfpro text-[#a1a1aa] dark:text-[#52525b] py-3 tracking-wide">
                                    +{issue.totalComments - issue.commentPreview.length} more comments
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* {previewImage && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <div
                        className="max-w-[90vw] max-h-[90vh] flex flex-col gap-4 items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewImage.fileUrl}
                            alt={previewImage.fileName}
                            className="max-w-full max-h-[80vh] rounded-2xl object-contain"
                        />
                        <div className="flex items-center gap-3">
                            <p className="text-white/60 text-[12px] font-sfpro">{previewImage.fileName}</p>
                            <a
                                href={previewImage.fileUrl}
                                download={previewImage.fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 text-white text-[12px] font-sfpro-medium transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open
                            </a>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    )
}

export default function IssueViewModal({ isOpen, onClose, issue: initialIssue }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [issue, setIssue] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const fetchRef = useRef(null)

    const loadFullIssue = useCallback(async () => {
        if (!initialIssue?.id) return
        setIsLoading(true)
        setError(null)
        try {
            const fullIssue = await fetchIssueById(initialIssue.id)
            setIssue(fullIssue)
        } catch (err) {
            if (err.name !== "CanceledError") {
                setError(err.message || "Failed to load issue details")
                setIssue(initialIssue)
            }
        } finally {
            setIsLoading(false)
        }
    }, [initialIssue])

    useEffect(() => {
        if (isOpen && initialIssue) {
            setMounted(true)
            setIssue(initialIssue)
            setError(null)
            loadFullIssue()
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setIssue(null)
                setError(null)
            }, 420)
            return () => clearTimeout(t)
        }
    }, [isOpen, initialIssue, loadFullIssue])

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape" && isOpen) onClose?.() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, onClose])

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />
            <div
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Issue Details
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                View all details of this issue
                            </p>
                            {isLoading && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-sfpro text-[#a1a1aa] dark:text-[#52525b] mt-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Loading…
                                </span>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 mx-8 lg:mx-auto lg:max-w-2xl xl:max-w-3xl mb-2 px-3.5 py-2 rounded-xl bg-[#fafafa] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#252525] shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                            <span className="text-[12px] font-sfpro text-[#71717a] dark:text-[#71717a]">{error}</span>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pt-5 lg:px-0" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto">
                            {isLoading && !issue ? (
                                <IssueSkeleton />
                            ) : issue ? (
                                <IssueDetailContent issue={issue} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#fafafa] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#252525] flex items-center justify-center">
                                        <Activity size={22} className="text-[#a1a1aa] dark:text-[#52525b]" />
                                    </div>
                                    <p className="text-[13px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                                        Failed to load issue details
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e] transition-colors">
                        <button
                            onClick={onClose}
                            className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}