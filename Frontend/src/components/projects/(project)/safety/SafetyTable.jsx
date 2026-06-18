"use client"

import { useState, useEffect, useRef } from "react"
import {
    ShieldCheck,
    Eye,
    Edit,
    Trash2,
    Paperclip,
    ImageIcon,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import SafetyDetailsDrawer from "./SafetyDetailsDrawer"
import SafetyAttachmentDrawer from "./SafetyAttachmentDrawer"

const HEADERS = [
    "Inspection No.",
    "Status",
    "Category",
    "Entries",
    "Severity",
    "Unresolved",
    "Location",
    "Inspected By",
    "Created At",
    "Actions",
]

const STATUS_STYLES = {
    Pass: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    Fail: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    Observation:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
}

function StatusBadge({ status }) {
    if (!status) return <NotProvided />
    const style = STATUS_STYLES[status] || "bg-gray-50 text-gray-600 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]"
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sfpro-bold uppercase border ${style}`}
        >
            {status}
        </span>
    )
}

function NotProvided() {
    return (
        <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
            Not provided
        </span>
    )
}

function UserAvatar({ user, size = 32 }) {
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
    const initials =
        user?.name
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
        >
            {initials}
        </div>
    )
}

function UserCell({ user }) {
    if (!user) return <NotProvided />
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar user={user} size={30} />
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                    {user.name}
                </span>
                {user.role && (
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">
                        {user.role}
                    </span>
                )}
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                    No inspections yet
                </p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Create your first safety inspection to get started.
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
                {children || <NotProvided />}
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

function LoadMoreTrigger({ onLoadMore, loadingMore, hasMore }) {
    const ref = useRef(null)

    useEffect(() => {
        if (!hasMore || !onLoadMore) return
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !loadingMore) onLoadMore()
            },
            { threshold: 0.1 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [hasMore, onLoadMore, loadingMore])

    return (
        <div ref={ref} className="flex items-center justify-center py-6 min-h-px">
            {hasMore && loadingMore && (
                <div className="flex items-center gap-2 text-gray-400 dark:text-[#52525b]">
                    <div className="w-4 h-4 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                    <span className="text-[13px] font-sfpro">Loading more…</span>
                </div>
            )}
            {!hasMore && !loadingMore && (
                <span className="text-[12px] text-gray-300 dark:text-[#3f3f46] font-sfpro">
                    All records loaded
                </span>
            )}
        </div>
    )
}

function getFirstEntry(row) {
    return row.entries?.[0] || null
}

function getFirstInspector(row) {
    const entry = getFirstEntry(row)
    return entry?.inspectedBy || null
}

function getFirstLocation(row) {
    const locations = (row.entries || []).map((e) => e.location).filter(Boolean)
    if (locations.length === 0) return null
    if (locations.length === 1) return locations[0]
    return `${locations[0]}, +${locations.length - 1} more`
}

function getFirstSeverity(row) {
    const severities = (row.entries || []).map((e) => e.severity).filter(Boolean)
    const hasSev = (s) => severities.includes(s)
    if (hasSev("High")) return "High"
    if (hasSev("Medium")) return "Medium"
    if (hasSev("Low")) return "Low"
    return null
}

function getFirstCategory(row) {
    const categories = (row.entries || []).map((e) => e.category).filter(Boolean)
    const unique = [...new Set(categories)]
    if (unique.length === 0) return null
    if (unique.length === 1) return unique[0]
    return unique.join(", ")
}

function hasAnyAttachment(row) {
    return (row.entries || []).some((e) => e.attachment)
}

function SeverityBadge({ severity }) {
    if (!severity) return <NotProvided />
    const styles = {
        High: "bg-gray-50 text-gray-700 dark:bg-[#27272a] dark:text-[#d4d4d8]",
        Medium: "bg-gray-50 text-gray-700 dark:bg-[#27272a] dark:text-[#d4d4d8]",
        Low: "bg-gray-50 text-gray-700 dark:bg-[#27272a] dark:text-[#d4d4d8]",
    }
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-sfpro-bold ${styles[severity] || "bg-gray-50 text-gray-500 dark:bg-[#27272a] dark:text-[#a1a1aa]"}`}
        >
            {severity}
        </span>
    )
}

function SafetyCard({ row, menuItems, onClick }) {
    return (
        <div
            onClick={() => onClick?.(row)}
            className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3 cursor-pointer"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
                        {row.inspectionNumber || <NotProvided />}
                    </p>
                    <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">
                        {row.entryCount} entr{row.entryCount !== 1 ? "ies" : "y"} ·{" "}
                        {getFirstCategory(row) || "—"}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={row.overallStatus} />
                    <div onClick={(e) => e.stopPropagation()}>
                        <ThreeDotMenu
                            items={menuItems}
                            size="md"
                            header={{
                                title: row.inspectionNumber,
                                subtitle: `${row.entryCount} entries`,
                                statusColor:
                                    row.overallStatus === "Pass"
                                        ? "#22c55e"
                                        : row.overallStatus === "Fail"
                                            ? "#ef4444"
                                            : "#f59e0b",
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Entries">
                    {row.entrySummary ? (
                        <span className="line-clamp-2 leading-snug font-sfpro">
                            {row.entrySummary}
                        </span>
                    ) : (
                        <NotProvided />
                    )}
                </DetailRow>
                <DetailRow label="Severity">
                    <SeverityBadge severity={getFirstSeverity(row)} />
                </DetailRow>
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <DetailRow label="Location">
                    {getFirstLocation(row) || <NotProvided />}
                </DetailRow>
                <DetailRow label="Created At">
                    {row.createdAtFormatted || <NotProvided />}
                </DetailRow>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Inspector
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                        {getFirstInspector(row) ? (
                            <>
                                <UserAvatar user={getFirstInspector(row)} size={22} />
                                <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                    {getFirstInspector(row).name}
                                </span>
                            </>
                        ) : (
                            <NotProvided />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function SafetyRow({ row, menuItems, isLast, onRowClick }) {
    return (
        <tr
            onClick={() => onRowClick?.(row)}
            className={`cursor-pointer group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""
                }`}
        >
            <td className="px-5 py-2 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    {row.inspectionNumber ? (
                        <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white">
                            {row.inspectionNumber}
                        </span>
                    ) : (
                        <NotProvided />
                    )}
                    {hasAnyAttachment(row) && (
                        <Paperclip className="w-4 h-4 text-blue-700 dark:text-blue-500" />
                    )}
                </div>
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                <StatusBadge status={row.overallStatus} />
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                {getFirstCategory(row) ? (
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {getFirstCategory(row)}
                    </span>
                ) : (
                    <NotProvided />
                )}
            </td>
            <td className="px-5 py-2">
                {row.entrySummary ? (
                    <p className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate max-w-50">
                        {row.entrySummary}
                    </p>
                ) : (
                    <NotProvided />
                )}
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                <SeverityBadge severity={getFirstSeverity(row)} />
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                {row.unresolvedCount > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-[12px] font-sfpro-bold bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-200">
                        {row.unresolvedCount}
                    </span>
                ) : (
                    <span className="text-[13px] font-sfpro text-green-600 dark:text-green-400">
                        All clear
                    </span>
                )}
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                {getFirstLocation(row) ? (
                    <span className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate max-w-32 block">
                        {getFirstLocation(row)}
                    </span>
                ) : (
                    <NotProvided />
                )}
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                <UserCell user={getFirstInspector(row)} />
            </td>
            <td className="px-5 py-2 whitespace-nowrap">
                {row.createdAtFormatted ? (
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {row.createdAtFormatted}
                    </span>
                ) : (
                    <NotProvided />
                )}
            </td>
            <td
                className="px-4 py-2 whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center">
                    <ThreeDotMenu
                        items={menuItems}
                        size="sm"
                        header={{
                            title: row.inspectionNumber,
                            subtitle: `${row.entryCount} entries`,
                            statusColor:
                                row.overallStatus === "Pass"
                                    ? "#22c55e"
                                    : row.overallStatus === "Fail"
                                        ? "#ef4444"
                                        : "#f59e0b",
                        }}
                    />
                </div>
            </td>
        </tr>
    )
}

export default function SafetyTable({
    data = [],
    isLoading = false,
    loadingMore = false,
    hasMore = false,
    onLoadMore,
    onEdit,
    onDelete,
    onResolveEntry,
    projectId,
    total = 0,
}) {
    const [selectedInspection, setSelectedInspection] = useState(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [attachmentOpen, setAttachmentOpen] = useState(false)
    const [selectedAttachment, setSelectedAttachment] = useState(null)

    const handleOpenDetails = (row) => {
        setSelectedInspection(row)
        setDetailsOpen(true)
    }
    const handleCloseDetails = () => {
        setDetailsOpen(false)
        setTimeout(() => setSelectedInspection(null), 300)
    }

    const handleOpenAttachment = (row) => {
        const allAttachments = (row.entries || [])
            .map((e) => e.attachment)
            .filter(Boolean)
        if (allAttachments.length === 0) return
        setSelectedInspection(row)
        setSelectedAttachment(allAttachments)
        setAttachmentOpen(true)
    }

    const buildMenuItems = (row) => {
        const items = [
            {
                label: "View Details",
                icon: <Eye className="w-4 h-4" />,
                onClick: () => handleOpenDetails(row),
            },
            ...(hasAnyAttachment(row)
                ? [
                    {
                        label: "View Attachment",
                        icon: <ImageIcon className="w-4 h-4" />,
                        onClick: () => handleOpenAttachment(row),
                    },
                ]
                : []),
            {
                label: "Edit Inspection",
                icon: <Edit className="w-4 h-4" />,
                onClick: () => onEdit?.(row),
            },
        ]
        items.push("divider")
        items.push({
            label: "Delete",
            icon: <Trash2 className="w-4 h-4" />,
            variant: "danger",
            onClick: () => onDelete?.(row),
        })
        return items
    }

    return (
        <div className="w-full font-sfpro pb-10">
            <div className="lg:hidden space-y-3">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                ) : data.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        {data.map((row) => (
                            <SafetyCard
                                key={row.id}
                                row={row}
                                menuItems={buildMenuItems(row)}
                                onClick={handleOpenDetails}
                            />
                        ))}
                        <LoadMoreTrigger
                            onLoadMore={onLoadMore}
                            loadingMore={loadingMore}
                            hasMore={hasMore}
                        />
                    </>
                )}
            </div>

            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full min-w-250 border-collapse">
                        <thead>
                            <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                                {HEADERS.map((h, i) => (
                                    <th
                                        key={i}
                                        className="px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#121212]">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <SkeletonRow key={i} />
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={HEADERS.length}>
                                        <EmptyState />
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, index) => (
                                    <SafetyRow
                                        key={row.id}
                                        row={row}
                                        menuItems={buildMenuItems(row)}
                                        isLast={index === data.length - 1}
                                        onRowClick={handleOpenDetails}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!isLoading && data.length > 0 && (
                    <LoadMoreTrigger
                        onLoadMore={onLoadMore}
                        loadingMore={loadingMore}
                        hasMore={hasMore}
                    />
                )}
            </div>

            {!isLoading && data.length > 0 && (
                <p className="mt-3 px-1 text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
                    {data.length} of {total} inspection{total !== 1 ? "s" : ""}
                </p>
            )}

            <SafetyDetailsDrawer
                open={detailsOpen}
                onClose={handleCloseDetails}
                inspection={selectedInspection}
                projectId={projectId}
                onResolveEntry={onResolveEntry}
            />

            {selectedAttachment && (
                <SafetyAttachmentDrawer
                    open={attachmentOpen}
                    onClose={() => {
                        setAttachmentOpen(false)
                        setTimeout(() => setSelectedAttachment(null), 300)
                    }}
                    attachments={Array.isArray(selectedAttachment) ? selectedAttachment : [selectedAttachment]}
                    inspectionNumber={selectedInspection?.inspectionNumber || ""}
                />
            )}
        </div>
    )
}