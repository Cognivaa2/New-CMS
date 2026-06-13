"use client"

import { useState, useEffect } from "react"
import {
    X,
    Package,
    Receipt,
    ArrowRightLeft,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    ChevronRight,
    Layers,
    DollarSign,
    BarChart3,
    FileText,
    Calendar,
    Building2,
    Hash,
    User,
} from "lucide-react"
import { MATCH_STATUS_CONFIG } from "@/app/(companyname)/twm/api"

const TABS = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "items", label: "Item Match", icon: Layers },
    { key: "financials", label: "Financials", icon: DollarSign },
    { key: "documents", label: "Documents", icon: FileText },
]

const MATCH_ICON_MAP = {
    MATCHED: CheckCircle2,
    UNMATCHED: XCircle,
    FULL_MATCH: CheckCircle2,
    PARTIAL_MATCH: AlertTriangle,
    MISMATCH: XCircle,
    QUANTITY_MISMATCH: AlertTriangle,
    VALUE_MISMATCH: AlertTriangle,
    PENDING_GRN: Clock,
    PENDING_INVOICE: Clock,
    NOT_STARTED: Clock,
}


function NA() {
    return (
        <span className="text-[12px] font-sfpro italic text-gray-300 dark:text-[#3f3f46]">
            Not Available
        </span>
    )
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

function MatchStatusPill({ status }) {
    const config = MATCH_STATUS_CONFIG[status] || MATCH_STATUS_CONFIG.NOT_STARTED
    const Icon = MATCH_ICON_MAP[status] || Clock
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide border ${config.bg} ${config.border} ${config.text}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {config.label}
        </span>
    )
}

function SectionHeader({ title }) {
    return (
        <p className="text-[11px] lg:text-sm font-sfpro-bold text-[#212121] dark:text-white mb-3">
            {title}
        </p>
    )
}

function InfoRow({ icon: Icon, label, value }) {
    if (!value && value !== 0) return null
    return (
        <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-[#adadad]" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 dark:text-[#52525b] font-sfpro-medium mb-0.5">{label}</p>
                <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] wrap-break-words">{value}</p>
            </div>
        </div>
    )
}

function StatTile({ label, value, colorClass = "" }) {
    return (
        <div className={`rounded-xl p-4 ${colorClass}`}>
            <p className="text-xs font-sfpro-medium text-gray-400 dark:text-[#888888] tracking-wide mb-1.5">{label}</p>
            <div className="text-[16px] font-sfpro-bold text-[#212121] dark:text-white leading-tight">{value}</div>
        </div>
    )
}

function FulfilmentBar({ rate = 0 }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#27272a] overflow-hidden">
                <div
                    className="h-full rounded-full bg-[#212121] dark:bg-white transition-all duration-500"
                    style={{ width: `${Math.min(rate, 100)}%` }}
                />
            </div>
            <span className="text-[12px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0 w-10 text-right">
                {rate}%
            </span>
        </div>
    )
}

function CollapsibleSection({ title, icon: Icon, count, children, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    return (
        <div className="overflow-hidden">
            <button onClick={() => setIsOpen((p) => !p)} className="rounded-xl cursor-pointer w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-sfpro-bold text-gray-700 dark:text-[#d4d4d8]">{title}</span>
                    {count != null && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-sfpro-bold bg-gray-200 dark:bg-[#27272a] text-gray-500 dark:text-[#a1a1aa]">{count}</span>
                    )}
                </div>
                {isOpen
                    ? <ChevronDown className="w-6 h-6 text-gray-400" />
                    : <ChevronRight className="w-6 h-6 text-gray-400" />
                }
            </button>
            {isOpen && <div className="p-4">{children}</div>}
        </div>
    )
}


function OverviewTab({ detail }) {
    if (!detail) return null
    const { po, financials, quantities } = detail
    return (
        <div className="flex flex-col gap-6">
            <div>
                <SectionHeader title="Purchase Order Details" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <InfoRow icon={Hash} label="PO Number" value={po.poNumber} />
                    <InfoRow icon={Building2} label="Vendor" value={po.vendorName} />
                    <InfoRow icon={FileText} label="PO Status" value={po.poStatus} />
                    <InfoRow icon={DollarSign} label="Total Order Value" value={po.totalOrderValueFormatted} />
                    <InfoRow icon={Calendar} label="Expected Delivery" value={po.expectedDeliveryDateFormatted} />
                    <InfoRow icon={Calendar} label="Approved At" value={po.approvedAtFormatted} />
                </div>
            </div>

            <div>
                <SectionHeader title="Quantity Summary" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile label="Ordered Qty" value={quantities?.orderedQty ?? 0} colorClass="bg-[#f2f3fa] dark:bg-[#1e1e2e]" />
                    <StatTile label="Received Qty" value={quantities?.receivedQty ?? 0} colorClass="bg-[#eef5fc] dark:bg-[#1a202c]" />
                    <StatTile label="Pending Qty" value={quantities?.pendingQty ?? 0} colorClass="bg-[#f2f3fa] dark:bg-[#1e1e2e]" />
                    <div className="rounded-xl border border-gray-100 dark:border-[#27272a] p-4">
                        <p className="text-xs font-sfpro-medium text-gray-400 dark:text-[#888888] tracking-wide mb-1.5">Fulfilment Rate</p>
                        <FulfilmentBar rate={quantities?.fulfilmentRate ?? 0} />
                    </div>
                </div>
            </div>

            {/* <div>
                <SectionHeader title="Financial Snapshot" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatTile label="Ordered Value" value={financials?.orderedValueFormatted || <NA />} />
                    <StatTile label="Net Billed" value={financials?.netBilledAfterContraFormatted || <NA />} />
                    <StatTile
                        label="Variance"
                        value={
                            <span className={
                                financials?.varianceDirection === "over" ? "text-red-600 dark:text-red-400" :
                                    financials?.varianceDirection === "under" ? "text-amber-600 dark:text-amber-400" :
                                        "text-green-600 dark:text-green-400"
                            }>
                                {financials?.varianceDirection === "over" ? "+" : financials?.varianceDirection === "under" ? "−" : ""}
                                {financials?.varianceFormatted || "₹0"}
                            </span>
                        }
                    />
                    <StatTile label="Paid" value={financials?.paidValueFormatted || <NA />} />
                    <StatTile label="Outstanding" value={financials?.outstandingValueFormatted || <NA />} />
                    <StatTile
                        label="Documents"
                        value={`${detail.grns?.length || 0} GRN · ${detail.payables?.length || 0} Invoices · ${detail.contraEntries?.length || 0} CE`}
                    />
                </div>
            </div> */}
        </div>
    )
}


const ITEM_STATUS_STYLE = {
    MATCHED: "text-green-600 dark:text-green-400",
    QUANTITY_SHORTAGE: "text-amber-600 dark:text-amber-400",
    QUANTITY_EXCESS: "text-red-600 dark:text-red-400",
}

function ItemMatchTab({ items = [] }) {
    if (!items.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center">
                    <Layers className="w-5 h-5 text-gray-400 dark:text-[#52525b]" />
                </div>
                <p className="text-sm font-sfpro text-gray-400 dark:text-[#71717a]">No item-level match data available.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <SectionHeader title={`${items.length} Material${items.length !== 1 ? "s" : ""}`} />
            {items.map((item, i) => (
                <div key={item.materialMasterId || i} className="rounded-xl border border-gray-100 dark:border-[#27272a] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#18181b]">
                        <div className="min-w-0">
                            <p className="text-lg font-sfpro-bold text-[#212121] dark:text-white truncate">
                                {item.materialName || <NA />}
                            </p>
                            <p className="text-[11px] font-sfpro text-[#212121] dark:text-white mt-0.5">
                                {item.unit || <NA />} · {item.unitPriceFormatted} per unit
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 bg-white dark:bg-[#0d0d0d]">
                        <div className="px-4 py-3 flex flex-col gap-0.5">
                            <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b]">Ordered</span>
                            <span className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{item.orderedQuantity ?? <NA />}</span>
                        </div>
                        <div className="px-4 py-3 flex flex-col gap-0.5">
                            <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] ">Received</span>
                            <span className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{item.receivedQuantity ?? <NA />}</span>
                        </div>
                        <div className="px-4 py-3 flex flex-col gap-0.5">
                            <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b]">Pending</span>
                            <span className={`text-[14px] font-sfpro-bold ${(item.pendingQuantity ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-[#f4f4f5]"}`}>
                                {item.pendingQuantity ?? <NA />}
                            </span>
                        </div>
                        <div className="flex flex-col items-start justify-center px-4 py-2.5 bg-white dark:bg-[#0d0d0d]">
                            <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b]">
                                Fulfilment Rate
                            </span>
                            <span className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{item.fulfilmentRate ?? <NA />}%</span>
                        </div>

                        <div className="flex flex-col items-start justify-between px-4 py-2.5 bg-white dark:bg-[#0d0d0d]">
                            <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b]">Total PO Value</span>
                            <span className="text-[13px] font-sfpro-bold text-[#212121] dark:text-white">
                                {item.totalPriceFormatted || <NA />}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}


function FinancialsTab({ financials }) {
    if (!financials) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-gray-400 dark:text-[#52525b]" />
                </div>
                <p className="text-sm font-sfpro text-gray-400 dark:text-[#71717a]">No financial data available.</p>
            </div>
        )
    }

    const groups = [
        {
            title: "Order vs Billing",
            rows: [
                { label: "Ordered Value", value: financials.orderedValueFormatted },
                { label: "Billed Value", value: financials.billedValueFormatted },
                {
                    label: "Contra Adjustment",
                    value: financials.contraAdjustment !== 0
                        ? financials.contraAdjustmentFormatted
                        : null,
                    dimIfNull: true,
                },
                {
                    label: "Net Billed (After Contra)",
                    value: financials.netBilledAfterContraFormatted,
                    bold: true,
                },
            ],
        },
        {
            title: "Payment Status",
            rows: [
                { label: "Paid", value: financials.paidValueFormatted },
                { label: "Advance Deducted", value: financials.advanceDeductedFormatted },
                { label: "Outstanding", value: financials.outstandingValueFormatted, bold: true },
            ],
        },
        {
            title: "Variance",
            rows: [
                {
                    label: "Variance %",
                    value: (
                        <span className={`flex items-center gap-1.5 ${financials.varianceDirection === "over" ? "text-red-600 dark:text-red-400" :
                            financials.varianceDirection === "under" ? "text-amber-600 dark:text-amber-400" :
                                "text-green-600 dark:text-green-400"}`}>
                            {financials.varianceDirection === "over" ? <TrendingUp className="w-3.5 h-3.5" /> :
                                financials.varianceDirection === "under" ? <TrendingDown className="w-3.5 h-3.5" /> :
                                    <Minus className="w-3.5 h-3.5" />}
                            {financials.varianceDirection === "over" ? "+" :
                                financials.varianceDirection === "under" ? "−" : ""}
                            {financials.variancePctFormatted}
                        </span>
                    ),
                },
                {
                    label: "Variance Amount",
                    value: (
                        <span className={financials.varianceDirection === "over" ? "text-red-600 dark:text-red-400" :
                            financials.varianceDirection === "under" ? "text-amber-600 dark:text-amber-400" :
                                "text-green-600 dark:text-green-400"}>
                            {financials.varianceDirection === "over" ? "+" :
                                financials.varianceDirection === "under" ? "−" : ""}
                            {financials.varianceAbsFormatted}
                        </span>
                    ),
                },
                {
                    label: "Within 2% Tolerance",
                    value: (
                        <span className={financials.varianceWithinTolerance
                            ? "text-green-600 dark:text-green-400 font-sfpro-bold"
                            : "text-red-600 dark:text-red-400 font-sfpro-bold"}>
                            {financials.varianceWithinTolerance ? "Yes" : "No"}
                        </span>
                    ),
                },
            ],
        },
    ]

    return (
        <div className="flex flex-col gap-5">
            {groups.map((group) => (
                <div key={group.title}>
                    <SectionHeader title={group.title} />
                    <div className="rounded-xl border border-gray-100 dark:border-[#27272a] overflow-hidden">
                        {group.rows.map((row, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between px-4 py-3.5 ${i < group.rows.length - 1 ? "border-b border-gray-50 dark:border-[#1a1a1a]" : ""} ${row.bold ? "bg-gray-50 dark:bg-[#18181b]" : "bg-white dark:bg-[#0d0d0d]"}`}
                            >
                                <span className={`text-[13px] ${row.bold ? "font-sfpro-bold text-gray-900 dark:text-white" : "font-sfpro-medium text-gray-500 dark:text-[#a1a1aa]"}`}>
                                    {row.label}
                                </span>
                                <span className={`text-[13px] ${row.bold ? "font-sfpro-bold text-gray-900 dark:text-white" : "font-sfpro-medium text-gray-800 dark:text-[#d4d4d8]"}`}>
                                    {row.value ?? (row.dimIfNull ? <NA /> : <NA />)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function UserChip({ user }) {
    if (!user) return <NA />
    return (
        <div className="flex items-center gap-2">
            {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#27272a] flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-gray-400 dark:text-[#71717a]" />
                </div>
            )}
            <span className="text-[12px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] truncate">
                {user.name || <NA />}
            </span>
        </div>
    )
}

function DocCard({ children }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#1e1e1e] bg-white dark:bg-[#0d0d0d] overflow-hidden">
            {children}
        </div>
    )
}

function DocField({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-sfpro-bold text-gray-400 dark:text-[#52525b]">{label}</span>
            <div className="text-xs font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                {value ?? <NA />}
            </div>
        </div>
    )
}

function GRNCard({ g }) {
    return (
        <DocCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-[#1a1a1a]">
                <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{g.grnNumber || <NA />}</p>
                <span className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#52525b]">{g.createdAt || <NA />}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 px-4 py-3">
                <DocField label="Delivery Date" value={g.deliveryDateFormatted || <NA />} />
                <DocField label="Challan No." value={g.deliveryChallanNumber || <NA />} />
                <DocField label="Items" value={g.itemCount != null ? `${g.itemCount} item${g.itemCount !== 1 ? "s" : ""}` : null} />
            </div>
        </DocCard>
    )
}

function PayableCard({ p }) {
    const statusColor =
        p.status === "Paid" ? "text-green-600 dark:text-green-400" :
            p.status === "PartiallyPaid" ? "text-amber-600 dark:text-amber-400" :
                p.status === "Reversed" ? "text-red-600 dark:text-red-400" :
                    "text-gray-500 dark:text-[#a1a1aa]"

    return (
        <DocCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-[#1a1a1a]">
                <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                    {p.payableNumber || <NA />}
                </p>
                <span className={`text-[11px] font-sfpro-bold uppercase tracking-wide ${statusColor}`}>
                    {p.status || <NA />}
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-3 border-b border-gray-50 dark:border-[#1a1a1a]">
                <DocField label="Total" value={p.totalAmountFormatted} />
                <DocField label="Paid" value={p.paidAmountFormatted} />
                <DocField label="Outstanding" value={p.dueAmountFormatted} />
                <DocField label="Advance Deducted" value={p.advanceDeducted ? p.advanceDeductedFormatted : <NA/>} />
            </div>
            <div className="grid grid-cols-2 gap-4 px-4 py-3">
                <DocField label="Source" value={p.sourceNumber} />
                <DocField label="Due Date" value={p.dueDateFormatted} />
            </div>
        </DocCard>
    )
}

function ContraCard({ ce }) {
    const statusColor =
        ce.status === "Approved" ? "text-green-600 dark:text-green-400" :
            ce.status === "Rejected" ? "text-red-600 dark:text-red-400" :
                ce.status === "Submitted" ? "text-blue-600 dark:text-blue-400" :
                    "text-gray-500 dark:text-[#a1a1aa]"

    return (
        <DocCard>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-[#1a1a1a]">
                <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{ce.ceNumber || <NA />}</p>
                <span className={`text-[11px] font-sfpro-bold uppercase tracking-wide ${statusColor}`}>
                    {ce.status || <NA />}
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 py-3 border-b border-gray-50 dark:border-[#1a1a1a]">
                <DocField label="Type" value={ce.typeLabel} />
                <DocField label="Direction" value={ce.directionLabel} />
                <DocField label="Amount" value={ce.adjustmentAmountFormatted} />
            </div>
            <div className="grid grid-cols-2 gap-4 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">Created By</span>
                    <UserChip user={ce.createdBy} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">Approved By</span>
                    <UserChip user={ce.approvedBy} />
                </div>
            </div>
        </DocCard>
    )
}

function EmptyDocState({ label }) {
    return (
        <p className="text-[13px] font-sfpro text-center py-6 text-gray-400 dark:text-[#52525b]">
            No {label} recorded for this PO.
        </p>
    )
}

function DocumentsTab({ grns = [], payables = [], contraEntries = [] }) {
    return (
        <div className="flex flex-col gap-4">
            <CollapsibleSection title="Goods Received Notes" icon={Package} count={grns.length}>
                {grns.length === 0
                    ? <EmptyDocState label="GRNs" />
                    : <div className="flex flex-col gap-2">{grns.map((g) => <GRNCard key={g.grnId} g={g} />)}</div>
                }
            </CollapsibleSection>

            <CollapsibleSection title="Invoices / Payables" icon={Receipt} count={payables.length}>
                {payables.length === 0
                    ? <EmptyDocState label="invoices" />
                    : <div className="flex flex-col gap-2">{payables.map((p) => <PayableCard key={p.payableId} p={p} />)}</div>
                }
            </CollapsibleSection>

            <CollapsibleSection title="Contra Entries" icon={ArrowRightLeft} count={contraEntries.length} defaultOpen={contraEntries.length > 0}>
                {contraEntries.length === 0
                    ? <EmptyDocState label="contra entries" />
                    : <div className="flex flex-col gap-2">{contraEntries.map((ce) => <ContraCard key={ce.ceId} ce={ce} />)}</div>
                }
            </CollapsibleSection>
        </div>
    )
}

// ── Modal shell ───────────────────────────────────────────────────────────────

export default function TWMDetailModal({ open, onClose, record, detail, isLoading = false }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [activeTab, setActiveTab] = useState("overview")

    useEffect(() => {
        if (open) {
            setMounted(true)
            setActiveTab("overview")
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => setMounted(false), 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        const fn = (e) => { if (e.key === "Escape" && open) onClose() }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [open, onClose])

    if (!mounted) return null

    const matchStatus = detail?.matchStatus || record?.matchStatus || "NOT_STARTED"

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />

            <div
                style={{ transitionDuration: "600ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[90dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">

                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="flex items-start justify-between px-6 lg:px-10 pt-5 pb-3 shrink-0">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                                    {record?.poNumber || "Match Details"}
                                </h2>
                                <MatchStatusPill status={matchStatus} />
                            </div>
                            <p className="text-[13px] font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                                {record?.vendorName || <NA />}
                                {record?.projectName ? ` · ${record.projectName}` : ""}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 ml-3 mt-0.5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-0 px-6 lg:px-10 shrink-0 border-b border-gray-100 dark:border-[#1e1e1e] overflow-x-auto"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {TABS.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.key
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`cursor-pointer flex items-center gap-1.5 px-4 py-3 text-[13px] font-sfpro-medium whitespace-nowrap border-b-2 transition-all duration-200 ${isActive
                                        ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                                        : "border-transparent text-gray-400 dark:text-[#71717a] hover:text-gray-600 dark:hover:text-[#a1a1aa]"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-5xl xl:max-w-6xl lg:mx-auto">
                            {isLoading ? (
                                <div className="animate-pulse flex flex-col gap-4 px-6 lg:px-10 py-6">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]" />
                                    ))}
                                </div>
                            ) : !detail ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-gray-400 dark:text-[#52525b]" />
                                    </div>
                                    <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">Could not load match details.</p>
                                </div>
                            ) : (
                                <div className="px-6 lg:px-10 py-6">
                                    {activeTab === "overview" && <OverviewTab detail={detail} />}
                                    {activeTab === "items" && <ItemMatchTab items={detail.itemLevelMatch || []} />}
                                    {activeTab === "financials" && <FinancialsTab financials={detail.financials} />}
                                    {activeTab === "documents" && (
                                        <DocumentsTab
                                            grns={detail.grns || []}
                                            payables={detail.payables || []}
                                            contraEntries={detail.contraEntries || []}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-6 lg:px-10 py-4">
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