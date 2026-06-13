"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
    Clock, CheckCircle2, XCircle, Send, ArrowUp, ArrowDown,
    ThumbsUp, ThumbsDown, Loader2, Eye, ArrowRightLeft,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
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
    "Status",
    "Created By",    
    "Actioned By",
    "Created At",
    "",
]

function StatusPill({ status }) {
    const cfg = CE_STATUS_CONFIG[status] || CE_STATUS_CONFIG.Draft
    const ICON = { Draft: Clock, Submitted: Send, Approved: CheckCircle2, Rejected: XCircle }
    const Icon = ICON[status] || Clock
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${cfg.className}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {cfg.label}
        </span>
    )
}

function DirectionPill({ direction, isDebit }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap border ${
            isDebit
                ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                : "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
        }`}>
            {isDebit
                ? <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                : <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
            }
            {isDebit ? "Debit" : "Credit"}
        </span>
    )
}

function UserAvatar({ user, size = 28 }) {
    const [imgError, setImgError] = useState(false)
    if (user?.avatar && !imgError) {
        return (
            <img src={user.avatar} alt={user.name || ""} onError={() => setImgError(true)}
                className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
                style={{ width: size, height: size }} />
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
    if (!user) return <span className="text-[12px] text-gray-400 dark:text-[#52525b]">Not provided</span>
    return (
        <div className="flex items-center gap-2 min-w-0">
            <UserAvatar user={user} size={28} />
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</span>
                {user.role && (
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">{user.role}</span>
                )}
            </div>
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
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No contra entries</p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">Create a contra entry to adjust PO billing.</p>
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
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">{children || "Not provided"}</div>
        </div>
    )
}

function CECard({ row, menuItems, onView }) {
    return (
        <div
            onClick={() => onView(row)}
            className="cursor-pointer rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[15px] font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">{row.ceNumber}</p>
                    <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate mt-0.5">{row.poNumber} · {row.vendorName}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StatusPill status={row.status} />
                    <div onClick={(e) => e.stopPropagation()}>
                        <ThreeDotMenu items={menuItems} size="md"
                            header={{ title: row.ceNumber, subtitle: row.vendorName, statusColor: row.statusConfig.color }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Type">{row.typeLabel}</DetailRow>
                <DetailRow label="Direction">
                    <DirectionPill direction={row.direction} isDebit={row.isDebit} />
                </DetailRow>
                <DetailRow label="Amount">
                    <span className="font-sfpro-bold text-[#212121] dark:text-white">{row.adjustmentAmountFormatted}</span>
                </DetailRow>
                <DetailRow label="Reason">
                    <span className="line-clamp-1">{row.reason}</span>
                </DetailRow>
            </div>

            {row.rejectionRemarks && (
                <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3">
                    <p className="text-[11px] font-sfpro-bold text-red-600 dark:text-red-400 mb-0.5">Rejection Remarks</p>
                    <p className="text-[12px] text-red-700 dark:text-red-300 line-clamp-2">{row.rejectionRemarks}</p>
                </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <UserCell user={row.createdBy} />
                <span className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">{row.createdAt}</span>
            </div>

            {(row.approvedBy || row.rejectedBy) && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#f0f0f0] dark:border-[#252525]">
                    <ActionedByCell row={row} />
                </div>
            )}
        </div>
    )
}

function CERow({ row, menuItems, isLast, onView }) {
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
                <DirectionPill direction={row.direction} isDebit={row.isDebit} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{row.adjustmentAmountFormatted}</span>
            </td>
            <td className="px-5 py-4">
                <p className="text-[13px] font-sfpro text-gray-600 dark:text-[#a1a1aa] truncate max-w-32">{row.reason}</p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <StatusPill status={row.status} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <UserCell user={row.createdBy} />
            </td>

            <td className="px-5 py-4 whitespace-nowrap">
                <ActionedByCell row={row} />
            </td>

            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.createdAt}</span>
            </td>
            <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <ThreeDotMenu items={menuItems} size="sm"
                        header={{ title: row.ceNumber, subtitle: row.vendorName, statusColor: row.statusConfig.color }} />
                </div>
            </td>
        </tr>
    )
}

function ActionedByCell({ row }) {
    if (row.status === "Approved" && row.approvedBy) {
        return <UserCell user={row.approvedBy} />
    }
    if (row.status === "Rejected" && row.rejectedBy) {
        return <UserCell user={row.rejectedBy} />
    }
    return <span className="text-[12px] text-gray-400 dark:text-[#52525b]">Not provided</span>
}

export default function CETable({
    data = [],
    isLoading = false,
    onSubmit,
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

    const buildMenuItems = (row) => {
        const loading = actionLoading[row.id]
        const items = []

        items.push({
            label: "View Details",
            icon: <Eye className="w-4 h-4" />,
            onClick: () => handleView(row),
        })

        if (row.status === "Draft") {
            items.push("divider")
            items.push({
                label: loading === "submitting" ? "Submitting…" : "Submit for Approval",
                icon: loading === "submitting"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />,
                onClick: () => {
                    if (!loading) onSubmit?.(row)
                },
                disabled: !!loading,
            })
        }

        if (row.status === "Submitted") {
            items.push("divider")
            items.push({
                label: loading === "approving" ? "Approving…" : "Approve",
                icon: loading === "approving"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ThumbsUp className="w-4 h-4" />,
                onClick: () => {
                    if (!loading) onApprove?.(row)
                },
                disabled: !!loading,
            })
            items.push({
                label: loading === "rejecting" ? "Rejecting…" : "Reject",
                icon: loading === "rejecting"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ThumbsDown className="w-4 h-4" />,
                onClick: () => {
                    if (!loading) onReject?.(row)
                },
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
                            <CECard key={row.id} row={row} menuItems={buildMenuItems(row)} onView={handleView} />
                        ))
                }
            </div>

            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full min-w-325 border-collapse">
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
                                    ? <tr><td colSpan={HEADERS.length}><EmptyState /></td></tr>
                                    : data.map((row, i) => (
                                        <CERow key={row.id} row={row} menuItems={buildMenuItems(row)} isLast={i === data.length - 1} onView={handleView} />
                                    ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <CEViewModal
                open={viewOpen}
                ce={selectedCE}
                onClose={() => { setViewOpen(false); setSelectedCE(null) }}
            />
        </div>
    )
}