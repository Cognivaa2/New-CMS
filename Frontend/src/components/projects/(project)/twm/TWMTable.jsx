"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
    Eye, FileText, Package, Receipt, ArrowRightLeft,
    TrendingUp, TrendingDown, Minus,
    CheckCircle2, AlertTriangle, XCircle,
    Clock, AlertCircle, FileQuestion, ShieldCheck,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import {
    MATCH_STATUS_CONFIG,
    fetchTWMDetail,
} from "@/app/(companyname)/projects/[projectId]/twm/api"
import TWMDetailModal from "./TWMDetailModal"

const HEADERS = [
    "PO Number",
    "Vendor",
    "PO Status",
    "Match Status",
    "Ordered",
    "Billed",
    "Contra Adj.",
    "Variance %",
    "Ordered Qty",
    "Received Qty",
    "Fulfilment",
    "GRNs",
    "Payables",
    "Contra Entries",
    "",
]

const MATCH_ICON_MAP = {
    MATCHED: CheckCircle2,
    UNMATCHED: XCircle,
    FULL_MATCH: CheckCircle2,
    PARTIAL_MATCH: AlertTriangle,
    MISMATCH: XCircle,
    QUANTITY_MISMATCH: AlertCircle,
    VALUE_MISMATCH: AlertCircle,
    PENDING_GRN: Clock,
    PENDING_INVOICE: FileQuestion,
    NOT_STARTED: Clock,
    TOLERATED: ShieldCheck,
}

function MatchStatusPill({ status }) {
    const config = MATCH_STATUS_CONFIG[status] || MATCH_STATUS_CONFIG.NOT_STARTED
    const Icon = MATCH_ICON_MAP[status] || Clock
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap border ${config.bg} ${config.border} ${config.text}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {config.label}
        </span>
    )
}

function POStatusText({ poStatusConfig, poStatus }) {
    return (
        <span className="text-[12px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
            {poStatusConfig?.label || poStatus || <NA />}
        </span>
    )
}

function VariancePctCell({ financials }) {
    if (!financials)
        return <NA />
    const {
        variancePct,
        variancePctFormatted,
        varianceAbsFormatted,
        varianceDirection,
        varianceWithinTolerance,
    } = financials

    if (varianceDirection === "exact" || variancePct === 0) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="mx-auto text-sm font-sfpro-medium text-green-600 dark:text-green-400">
                    0%
                </span>
            </div>
        )
    }
    const isOver = varianceDirection === "over"
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
                {isOver
                    ? <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                    : <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                }
                <span className={`text-sm font-sfpro-bold ${isOver
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                    }`}>
                    {isOver ? "+" : "-"}{variancePctFormatted}
                </span>
            </div>
        </div>
    )
}


function OrderedQtyCell({ quantities }) {
    const q = quantities || {}
    const unit = q.unit || "units"
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                {q.orderedQty ?? <NA />}
                <span className="text-[11px] text-gray-400 dark:text-[#52525b] ml-1">{unit}</span>
            </span>
            <span className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
                Rcvd: {q.receivedQty ?? 0} · Pend: {q.pendingQty ?? 0}
            </span>
        </div>
    )
}

function DocCountCell({ icon: Icon, count, label }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0">
                <span className="text-sm font-sfpro-bold text-gray-700 dark:text-[#d4d4d8] leading-tight">
                    {count}
                </span>
                <span className="text-xs font-sfpro-medium text-gray-400 dark:text-[#52525b] leading-tight">
                    {label}
                </span>
            </div>
        </div>
    )
}

function NA() {
    return (
        <span className="text-[12px] font-sfpro italic text-gray-300 dark:text-[#3f3f46]">
            Not Available
        </span>
    )
}

function FulfilmentBar({ rate = 0 }) {
    return (
        <div className="flex items-center gap-0.5 min-w-24">
            <div className="flex-1 h-1.25 rounded-full bg-gray-200 dark:bg-[#525252] overflow-hidden">
                <div className="h-full rounded-full bg-[#212121] dark:bg-white transition-all duration-500"
                    style={{ width: `${Math.min(rate, 100)}%` }}
                />
            </div>
            <span className="text-xs font-sfpro-medium text-[212121] dark:text-white shrink-0 w-10 text-right">
                {rate}%
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
                    No reconciliation records
                </p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Approved Purchase Orders will appear here for three-way matching.
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
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="h-3.5 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
                    <div className="h-3 w-40 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                </div>
                <div className="h-6 w-24 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
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
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                {label}
            </span>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-word">
                {children || <NA />}
            </div>
        </div>
    )
}

function TWMCard({ row, onView }) {
    const q = row.quantities || {}
    const f = row.financials || {}
    return (
        <div onClick={() => onView?.(row)} className="cursor-pointer rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                        {row.poNumber}
                    </p>
                    <p className="text-xs font-sfpro text-gray-400 dark:text-[#71717a] truncate">
                        {row.vendorName}
                    </p>
                </div>
                <MatchStatusPill status={row.matchStatus} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Ordered">
                    {f.orderedValueFormatted || <NA />}
                </DetailRow>
                <DetailRow label="Net Billed">
                    {f.netBilledAfterContraFormatted || <NA />}
                </DetailRow>
                <DetailRow label="Variance %">
                    <VariancePctCell financials={row.financials} />
                </DetailRow>
                <DetailRow label="Fulfilment">
                    <FulfilmentBar rate={q.fulfilmentRate || 0} />
                </DetailRow>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-[#252525] px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                        Ordered
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {q.orderedQty ?? <NA />}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                        Received
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {q.receivedQty ?? <NA />}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                        Pending
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {q.pendingQty ?? <NA />}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-[#252525] px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                        GRNs
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {row.grnCount ?? 0}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                        Payables
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {row.payableCount ?? 0}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                        Contra
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        {row.contraEntryCount ?? 0}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <POStatusText
                    poStatus={row.poStatus}
                    poStatusConfig={row.poStatusConfig}
                />
                <span className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
                    {row.approvedAt}
                </span>
            </div>
        </div>
    )
}

function TWMRow({ row, isLast, onView }) {
    const config = MATCH_STATUS_CONFIG[row.matchStatus] || MATCH_STATUS_CONFIG.NOT_STARTED
    const q = row.quantities || {}
    const f = row.financials || {}

    return (
        <tr onClick={() => onView?.(row)} className={`cursor-pointer group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""}`}>
            <td className="px-5 py-2 whitespace-nowrap">
                <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                    {row.poNumber}
                </p>
                <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mt-0.5">
                    {row.approvedAt}
                </p>
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
                    {row.vendorName}
                </span>
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <POStatusText
                    poStatus={row.poStatus}
                    poStatusConfig={row.poStatusConfig}
                />
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <MatchStatusPill status={row.matchStatus} />
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {f.orderedValueFormatted || <NA />}
                </span>
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {f.billedValueFormatted || <NA />}
                </span>
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                {(f.contraAdjustment ?? 0) !== 0 ? (
                    <span className={`text-[13px] font-sfpro-medium ${(f.contraAdjustment ?? 0) > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                        }`}>
                        {(f.contraAdjustment ?? 0) > 0 ? "+" : ""}
                        {f.contraAdjustmentFormatted}
                    </span>
                ) : (
                    <NA />
                )}
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <VariancePctCell financials={row.financials} />
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {q.orderedQty ?? <NA />}
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] ml-1">{q.unit || "units"}</span>
                </span>
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {q.receivedQty ?? <NA />}
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] ml-1">{q.unit || "units"}</span>
                </span>
            </td>

            <td className="px-5 py-2">
                <FulfilmentBar rate={q.fulfilmentRate || 0} />
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <DocCountCell
                    icon={Package}
                    count={row.grnCount ?? 0}
                    label={row.grnCount === 1 ? "GRN" : "GRNs"}
                />
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <DocCountCell
                    icon={Receipt}
                    count={row.payableCount ?? 0}
                    label={row.payableCount === 1 ? "Invoice" : "Invoices"}
                />
            </td>

            <td className="px-5 py-2 whitespace-nowrap">
                <DocCountCell
                    icon={ArrowRightLeft}
                    count={row.contraEntryCount ?? 0}
                    label={row.contraEntryCount === 1 ? "Entry" : "Entries"}
                />
            </td>

            {/* Actions */}
            <td className="px-4 py-2 whitespace-nowrap">
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex justify-center"
                >
                    <ThreeDotMenu
                        items={[{
                            label: "View Details",
                            icon: <Eye className="w-4 h-4" />,
                            onClick: () => onView?.(row),
                        }]}
                        size="sm"
                        header={{
                            title: row.poNumber,
                            subtitle: row.vendorName,
                            statusColor: config.color,
                        }}
                    />
                </div>
            </td>
        </tr>
    )
}

export default function TWMTable({
    data = [],
    isLoading = false,
    projectId,
}) {
    const [detailModal, setDetailModal] = useState({
        open: false, record: null, detail: null, isLoading: false,
    })

    const handleView = async (row) => {
        setDetailModal({ open: true, record: row, detail: null, isLoading: true })
        try {
            const detail = await fetchTWMDetail(row.poId)
            setDetailModal((prev) => ({ ...prev, detail, isLoading: false }))
        } catch (err) {
            setDetailModal((prev) => ({ ...prev, isLoading: false }))
            toast.error("Failed to load details", {
                description: err.message || "Could not fetch match details",
            })
        }
    }

    const handleCloseDetail = () => {
        setDetailModal({ open: false, record: null, detail: null, isLoading: false })
    }

    return (
        <>
            <TWMDetailModal
                open={detailModal.open}
                onClose={handleCloseDetail}
                record={detailModal.record}
                detail={detailModal.detail}
                isLoading={detailModal.isLoading}
            />

            <div className="w-full font-sfpro pb-10">

                <div className="lg:hidden space-y-3">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                        : data.length === 0
                            ? <EmptyState />
                            : data.map((row) => (
                                <TWMCard key={row.id} row={row} onView={handleView} />
                            ))
                    }
                </div>

                <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                        <table className="w-full min-w-362.5 border-collapse">
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
                                    : data.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={HEADERS.length}>
                                                    <EmptyState />
                                                </td>
                                            </tr>
                                        )
                                        : data.map((row, index) => (
                                            <TWMRow
                                                key={row.id}
                                                row={row}
                                                isLast={index === data.length - 1}
                                                onView={handleView}
                                            />
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}