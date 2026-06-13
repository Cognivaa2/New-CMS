"use client"

import { useState, useCallback } from "react"
import {
    Send, ThumbsUp, ThumbsDown, XCircle,
    Loader2, Eye, ArrowRightLeft, ArrowUp, ArrowDown,
} from "lucide-react"
import { CE_STATUS_CONFIG } from "@/app/(companyname)/contra-entries/api"
import CEViewModal from "./CEViewModal"

const HEADERS = [
    "CE Number",
    "PO Number",
    "Vendor",
    "Type",
    "Direction",
    "Amount",
    "Reason",
    "Submitted By",
    "Submitted At",
    "Actions",
]

function StatusPill() {
    const cfg = CE_STATUS_CONFIG.Submitted
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${cfg.className}`}>
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
            {cfg.label}
        </span>
    )
}

function DirectionPill({ isDebit }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap border ${
            isDebit
                ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                : "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
        }`}>
            {isDebit
                ? <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                : <ArrowDown className="w-3 h-3" strokeWidth={2.5} />}
            {isDebit ? "Debit" : "Credit"}
        </span>
    )
}

function UserCell({ user }) {
    if (!user) return <span className="text-[12px] text-gray-400 dark:text-[#52525b]">—</span>
    const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0">
                {initials}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</span>
                {user.role && (
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">{user.role}</span>
                )}
            </div>
        </div>
    )
}

function ActionButtons({ row, onApprove, onReject, actionLoading }) {
    const loading = actionLoading[row.id]
    return (
        <div className="flex items-center gap-1.5">
            <button
                onClick={(e) => { e.stopPropagation(); onApprove(row) }}
                disabled={!!loading}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-[#ebfbf1] text-[#166534] border border-[#b7efc5] hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading === "approving"
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <ThumbsUp className="w-3 h-3" strokeWidth={2.5} />}
                Approve
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onReject(row) }}
                disabled={!!loading}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading === "rejecting"
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <XCircle className="w-3 h-3" strokeWidth={2.5} />}
                Reject
            </button>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                <ArrowRightLeft className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                    No pending approvals
                </p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Submitted contra entries will appear here for review.
                </p>
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
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 animate-pulse h-40" />
    )
}

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                {label}
            </span>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">
                {children || "—"}
            </div>
        </div>
    )
}

function ApprovalRow({ row, isLast, onView, onApprove, onReject, actionLoading }) {
    return (
        <tr
            onClick={() => onView(row)}
            className={`cursor-pointer group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${
                !isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""
            }`}
        >
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{row.ceNumber}</span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.poNumber}</span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.vendorName}</span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[12px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.typeLabel}</span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <DirectionPill isDebit={row.isDebit} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{row.adjustmentAmountFormatted}</span>
            </td>
            <td className="px-5 py-4">
                <p className="text-[13px] font-sfpro text-gray-600 dark:text-[#a1a1aa] truncate max-w-32">{row.reason}</p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <UserCell user={row.submittedBy || row.createdBy} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.submittedAt}</span>
            </td>
            <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <ActionButtons
                    row={row}
                    onApprove={onApprove}
                    onReject={onReject}
                    actionLoading={actionLoading}
                />
            </td>
        </tr>
    )
}
function ApprovalCard({ row, onView, onApprove, onReject, actionLoading }) {
    return (
        <div
            onClick={() => onView(row)}
            className="cursor-pointer rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all p-4 flex flex-col gap-3"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[15px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                        {row.ceNumber}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-[#71717a] truncate mt-0.5">
                        {row.poNumber} · {row.vendorName}
                    </p>
                </div>
                <StatusPill />
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Type">{row.typeLabel}</DetailRow>
                <DetailRow label="Direction">
                    <DirectionPill isDebit={row.isDebit} />
                </DetailRow>
                <DetailRow label="Amount">
                    <span className="font-sfpro-bold text-gray-800 dark:text-white">{row.adjustmentAmountFormatted}</span>
                </DetailRow>
                <DetailRow label="Reason">
                    <span className="line-clamp-1">{row.reason}</span>
                </DetailRow>
            </div>

            {/* Submitted by */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <UserCell user={row.submittedBy || row.createdBy} />
                <span className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">{row.submittedAt}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-2" onClick={(e) => e.stopPropagation()}>
                <ActionButtons
                    row={row}
                    onApprove={onApprove}
                    onReject={onReject}
                    actionLoading={actionLoading}
                />
            </div>
        </div>
    )
}

export default function CEApprovalTable({
    data = [],
    isLoading = false,
    onApprove,
    onReject,
    actionLoading = {},
}) {
    const [viewOpen, setViewOpen] = useState(false)
    const [selectedCE, setSelectedCE] = useState(null)

    const handleView = useCallback((row) => {
        setSelectedCE(row)
        setViewOpen(true)
    }, [])

    const pendingEntries = data.filter((r) => r.status === "Submitted")

    return (
        <div className="w-full font-sfpro pb-10">
            {!isLoading && pendingEntries.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[13px] font-sfpro-medium text-gray-500 dark:text-[#71717a]">
                        Pending review
                    </span>
                    <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[12px] font-sfpro-bold">
                        {pendingEntries.length}
                    </span>
                </div>
            )}

            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full min-w-312.5 border-collapse">
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
                            {isLoading
                                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                : pendingEntries.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={HEADERS.length}>
                                                <EmptyState />
                                            </td>
                                        </tr>
                                    )
                                    : pendingEntries.map((row, i) => (
                                        <ApprovalRow
                                            key={row.id}
                                            row={row}
                                            isLast={i === pendingEntries.length - 1}
                                            onView={handleView}
                                            onApprove={onApprove}
                                            onReject={onReject}
                                            actionLoading={actionLoading}
                                        />
                                    ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="lg:hidden space-y-3">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : pendingEntries.length === 0
                        ? <EmptyState />
                        : pendingEntries.map((row) => (
                            <ApprovalCard
                                key={row.id}
                                row={row}
                                onView={handleView}
                                onApprove={onApprove}
                                onReject={onReject}
                                actionLoading={actionLoading}
                            />
                        ))
                }
            </div>

            <CEViewModal
                open={viewOpen}
                ce={selectedCE}
                onClose={() => { setViewOpen(false); setSelectedCE(null) }}
            />
        </div>
    )
}