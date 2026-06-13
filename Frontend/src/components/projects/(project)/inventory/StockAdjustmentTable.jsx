"use client"

import { useState, useCallback } from "react"
import {
    Clock, CheckCircle2, XCircle, Send, ArrowUp, ArrowDown,
    ThumbsUp, ThumbsDown, Loader2, ChevronLeft, ChevronRight,
    ArrowUpDown, Edit, Eye,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import StockAdjustmentViewModal from "./StockAdjustmentViewModal"

const STATUS_CONFIG = {
    Draft: {
        label: "Draft",
        icon: Clock,
        className: "text-gray-600 bg-gray-100 border border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]",
        color: "#a1a1aa",
    },
    Submitted: {
        label: "Submitted",
        icon: Send,
        className: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        color: "#3b82f6",
    },
    Approved: {
        label: "Approved",
        icon: CheckCircle2,
        className: "text-[#16a34a] bg-[#ebfbf1] border border-[#c1f0d0] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400",
        color: "#22c55e",
    },
    Rejected: {
        label: "Rejected",
        icon: XCircle,
        className: "text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        color: "#dc2626",
    },
}

const HEADERS = [
    { key: "saNumber", label: "SA Number", width: "min-w-[130px]" },
    { key: "materialName", label: "Material", width: "min-w-[160px] max-w-[200px]" },
    { key: "adjustmentType", label: "Type", width: "min-w-[90px]" },
    { key: "quantity", label: "Quantity", width: "min-w-[100px]" },
    { key: "stockBefore", label: "Stock Before", width: "min-w-[110px]" },
    { key: "stockAfter", label: "Stock After", width: "min-w-[110px]" },
    { key: "reason", label: "Reason", width: "min-w-[110px]" },
    { key: "status", label: "Status", width: "min-w-[120px]" },
    { key: "createdBy", label: "Created By", width: "min-w-[150px]" },
    { key: "createdAt", label: "Created At", width: "min-w-[110px]" },
    { key: "action", label: "", width: "min-w-[50px]" },
]

function NA() {
    return (
        <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
            Not Available
        </span>
    )
}

function fmt(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function StatusPill({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${cfg.className}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {cfg.label}
        </span>
    )
}

function TypePill({ type }) {
    if (!type) return <NA />
    const isAdd = type === "add"
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap border ${isAdd
            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
            : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
            }`}>
            {isAdd ? <ArrowUp className="w-3 h-3" strokeWidth={2.5} /> : <ArrowDown className="w-3 h-3" strokeWidth={2.5} />}
            {isAdd ? "Add" : "Remove"}
        </span>
    )
}

function UserAvatar({ user, size = 28 }) {
    const [imgError, setImgError] = useState(false)
    const hasAvatar = user?.avatar && !imgError
    if (hasAvatar) {
        return (
            <img src={user.avatar} alt={user.name || "User"} onError={() => setImgError(true)}
                className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
                style={{ width: size, height: size }}
            />
        )
    }
    const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"
    return (
        <div style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0">
            {initials}
        </div>
    )
}

function UserCell({ user }) {
    if (!user) return <NA />
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar user={user} size={28} />
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</span>
                <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">{user.role || ""}</span>
            </div>
        </div>
    )
}

function ActionButtons({ row, onApprove, onReject, actionLoading }) {
    if (row.status !== "Submitted") return null
    const loading = actionLoading[row._id]
    return (
        <div className="flex items-center gap-1.5">
            <button
                onClick={(e) => { e.stopPropagation(); onApprove(row) }}
                disabled={!!loading}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-[#ebfbf1] text-[#166534] border border-[#b7efc5] hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading === "approving" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" strokeWidth={2.5} />}
                Approve
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onReject(row) }}
                disabled={!!loading}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <XCircle className="w-3 h-3" strokeWidth={2.5} />
                Reject
            </button>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                <ArrowUpDown className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No adjustments yet</p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">Create a stock adjustment to get started.</p>
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

function SkeletonCard() {
    return (
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
                <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="space-y-1.5">
                        <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">{label}</span>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">{children || <NA />}</div>
        </div>
    )
}

function MobileCard({ row, menuItems, onView }) {
    const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
    return (
        <div onClick={() => onView(row)}
            className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3 cursor-pointer">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[15px] font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">{row.saNumber || <NA />}</p>
                    <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate mt-0.5">{row.materialName || ""}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StatusPill status={row.status} />
                    <div onClick={(e) => e.stopPropagation()} className="-mr-1 relative z-10">
                        <ThreeDotMenu items={menuItems} size="md" header={{ title: row.saNumber, subtitle: row.materialName, statusColor: cfg.color }} />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Type"><TypePill type={row.adjustmentType} /></DetailRow>
                <DetailRow label="Quantity">{row.quantity != null ? `${row.quantity} ${row.unit || ""}` : <NA />}</DetailRow>
                <DetailRow label="Stock Before">{row.stockBefore != null ? `${row.stockBefore} ${row.unit || ""}` : <NA />}</DetailRow>
                <DetailRow label="Stock After">{row.stockAfter != null ? `${row.stockAfter} ${row.unit || ""}` : <NA />}</DetailRow>
                <DetailRow label="Reason">{row.reason || <NA />}</DetailRow>
                <DetailRow label="Created At">{fmt(row.createdAt) || <NA />}</DetailRow>
            </div>
            {row.rejectionRemarks && (
                <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3">
                    <p className="text-[11px] font-sfpro-bold text-red-600 dark:text-red-400 mb-0.5">Rejection Remarks</p>
                    <p className="text-[12px] text-red-700 dark:text-red-300 line-clamp-2">{row.rejectionRemarks}</p>
                </div>
            )}
        </div>
    )
}

function TableRow({ row, menuItems, isLast, onView }) {
    const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
    return (
        <tr onClick={() => onView(row)}
            className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 cursor-pointer ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""}`}>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white">{row.saNumber || <NA />}</span>
            </td>
            <td className="px-5 py-4">
                <p className="text-[13px] font-sfpro text-gray-600 dark:text-[#a1a1aa] truncate max-w-50">{row.materialName || <NA />}</p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <TypePill type={row.adjustmentType} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {row.quantity != null
                    ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.quantity} {row.unit || ""}</span>
                    : <NA />}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {row.stockBefore != null
                    ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.stockBefore} {row.unit || ""}</span>
                    : <NA />}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {row.stockAfter != null
                    ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.stockAfter} {row.unit || ""}</span>
                    : <NA />}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {row.reason
                    ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.reason}</span>
                    : <NA />}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <StatusPill status={row.status} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <UserCell user={row.createdBy} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {fmt(row.createdAt)
                    ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{fmt(row.createdAt)}</span>
                    : <NA />}
            </td>
            <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <ThreeDotMenu items={menuItems} size="sm" header={{ title: row.saNumber, subtitle: row.materialName, statusColor: cfg.color }} />
                </div>
            </td>
        </tr>
    )
}

function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.totalPages <= 1) return null
    const { page, totalPages, total, hasNext, hasPrev } = pagination
    return (
        <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
                {total} adjustment{total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
                <button onClick={() => hasPrev && onPageChange(page - 1)} disabled={!hasPrev}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={15} />
                </button>
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] min-w-16 text-center">
                    {page} / {totalPages}
                </span>
                <button onClick={() => hasNext && onPageChange(page + 1)} disabled={!hasNext}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    )
}

export default function StockAdjustmentTable({
    data = [],
    isLoading = false,
    onSubmit,
    onApprove,
    onReject,
    onEdit,
    actionLoading = {},
    pagination = {},
    onPageChange,
}) {
    const [viewOpen, setViewOpen] = useState(false)
    const [selectedSA, setSelectedSA] = useState(null)

    const handleView = useCallback((row) => {
        setSelectedSA(row)
        setViewOpen(true)
    }, [])

    const buildMenuItems = (row) => {
        const loading = actionLoading[row._id]
        const items = [
            {
                label: "View Details",
                icon: <Eye className="w-4 h-4" />,
                onClick: () => handleView(row),
            },
        ]
        if (row.status === "Draft") {
            items.push({
                label: loading === "submitting" ? "Submitting..." : "Submit for Approval",
                icon: loading === "submitting"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />,
                onClick: () => !loading && onSubmit?.(row),
                disabled: !!loading,
            })
        }
        if (row.status === "Submitted") {
            items.push({
                label: loading === "approving" ? "Approving..." : "Approve",
                icon: loading === "approving"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ThumbsUp className="w-4 h-4" />,
                onClick: () => !loading && onApprove?.(row),
                disabled: !!loading,
            })
            items.push({
                label: loading === "rejecting" ? "Rejecting..." : "Reject",
                icon: loading === "rejecting"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ThumbsDown className="w-4 h-4" />,
                onClick: () => !loading && onReject?.(row),
                disabled: !!loading,
                variant: "danger",
            })
        }
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
                            <MobileCard key={row._id} row={row} menuItems={buildMenuItems(row)} onView={handleView} />
                        ))}
            </div>

            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full min-w-350 border-collapse">
                        <thead>
                            <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                                {HEADERS.map((h) => (
                                    <th key={h.key}
                                        className={`px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase ${h.width}`}>
                                        {h.key !== "action" ? h.label : ""}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#121212]">
                            {isLoading
                                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                : data.length === 0
                                    ? <tr><td colSpan={HEADERS.length}><EmptyState /></td></tr>
                                    : data.map((row, i) => (
                                        <TableRow key={row._id} row={row} menuItems={buildMenuItems(row)} isLast={i === data.length - 1} onView={handleView} />
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination pagination={pagination} onPageChange={onPageChange} />

            <StockAdjustmentViewModal
                open={viewOpen}
                adjustmentId={selectedSA?._id}
                onClose={() => { setViewOpen(false); setSelectedSA(null) }}
            />
        </div>
    )
}