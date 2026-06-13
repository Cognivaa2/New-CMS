
"use client"

import { useState, useEffect } from "react"
import {
    CheckCircle2, Clock, Send, XCircle, FileCheck,
    Package, Calendar, ClipboardList, ThumbsDown,
    Hash, Layers, MessageSquare, AlertTriangle,
} from "lucide-react"

const STATUS_CONFIG = {
    Draft: {
        label: "Draft",
        icon: Clock,
        className: "text-gray-600 bg-gray-100 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]",
    },
    Submitted: {
        label: "Submitted",
        icon: Send,
        className: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    },
    Approved: {
        label: "Approved",
        icon: CheckCircle2,
        className: "text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    },
    Rejected: {
        label: "Rejected",
        icon: XCircle,
        className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    },
    ConvertedToPO: {
        label: "Converted to PO",
        icon: FileCheck,
        className: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    },
}

function formatDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

function smartDate(value) {
    if (!value) return null
    if (typeof value === "string" && (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value))) {
        return formatDate(value)
    }
    return value
}

function Backdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        />
    )
}

function StatusPill({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
    const Icon = config.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide border ${config.className}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {config.label}
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
    const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
        >
            {initials}
        </div>
    )
}

function UserBlock({ label, user, date }) {
    if (!user) return null
    return (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-100 dark:border-[#1e1e1e] bg-gray-50/50 dark:bg-[#0d0d0d]">
            <span className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide">
                {label}
            </span>
            <div className="flex items-center gap-2">
                <UserAvatar user={user} size={28} />
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                        {user.name}
                    </p>
                    {user.role && (
                        <p className="text-[11px] text-gray-400 dark:text-[#52525b] truncate">
                            {user.role}
                        </p>
                    )}
                </div>
            </div>
            {date && (
                <p className="text-[11px] text-gray-400 dark:text-[#52525b] pt-1 border-t border-gray-100 dark:border-[#1e1e1e]">
                    {date}
                </p>
            )}
        </div>
    )
}

function InfoRow({ icon: Icon, label, value }) {
    const display = value === null || value === undefined || value === "" ? "—" : value
    const isEmpty = display === "—"
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-[#71717a]" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide mb-0.5">
                    {label}
                </p>
                <p className={`text-[13px] font-sfpro-medium wrap-break-words ${
                    isEmpty
                        ? "text-gray-400 dark:text-[#52525b]"
                        : "text-gray-700 dark:text-[#d4d4d8]"
                }`}>
                    {display}
                </p>
            </div>
        </div>
    )
}

function SectionHeader({ title, count }) {
    return (
        <div className="flex items-center gap-2">
            <p className="text-[11px] font-sfpro-bold text-gray-500 dark:text-[#a1a1aa] uppercase tracking-widest">
                {title}
            </p>
            {count !== undefined && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1e1e1e] text-[10px] font-sfpro-bold text-gray-500 dark:text-[#71717a]">
                    {count}
                </span>
            )}
            <div className="flex-1 h-px bg-gray-100 dark:bg-[#1e1e1e] ml-2" />
        </div>
    )
}

function NoteBlock({ icon: Icon, label, value, variant = "neutral" }) {
    if (!value) return null

    const variants = {
        neutral: {
            container: "border-gray-100 dark:border-[#1e1e1e] bg-gray-50 dark:bg-[#0d0d0d]",
            icon: "text-gray-500 dark:text-[#a1a1aa]",
            label: "text-gray-600 dark:text-[#a1a1aa]",
            text: "text-gray-700 dark:text-[#d4d4d8]",
        },
        warning: {
            container: "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10",
            icon: "text-amber-500",
            label: "text-amber-600 dark:text-amber-400",
            text: "text-amber-700 dark:text-amber-300",
        },
        danger: {
            container: "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10",
            icon: "text-red-500",
            label: "text-red-600 dark:text-red-400",
            text: "text-red-700 dark:text-red-300",
        },
    }

    const v = variants[variant]

    return (
        <div className={`rounded-2xl border ${v.container} p-4`}>
            <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${v.icon}`} />
                <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-sfpro-bold uppercase tracking-wide ${v.label}`}>
                        {label}
                    </p>
                    <p className={`text-[13px] mt-1 font-sfpro wrap-break-words ${v.text}`}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    )
}

function ItemsTable({ items }) {
    if (!items?.length) {
        return (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#27272a] py-10 text-center">
                <Package className="w-6 h-6 text-gray-300 dark:text-[#3f3f46] mx-auto mb-2" />
                <p className="text-[13px] text-gray-400 dark:text-[#52525b] font-sfpro">
                    No items added to this requisition
                </p>
            </div>
        )
    }

    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)

    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#27272a] overflow-hidden">
            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                <table className="w-full min-w-150 border-collapse text-[12px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-[#18181b] border-b border-gray-100 dark:border-[#27272a]">
                            {[
                                { label: "#",              align: "text-center w-10" },
                                { label: "Material",       align: "text-left" },
                                { label: "Unit",           align: "text-left" },
                                { label: "Required Qty",   align: "text-right" },
                                { label: "Stock at MR",    align: "text-right" },
                            ].map((h, i) => (
                                <th
                                    key={i}
                                    className={`px-3 py-2.5 text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide whitespace-nowrap ${h.align}`}
                                >
                                    {h.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#0d0d0d]">
                        {items.map((item, idx) => (
                            <tr
                                key={idx}
                                className={`${idx < items.length - 1 ? "border-b border-gray-50 dark:border-[#1a1a1a]" : ""} hover:bg-gray-50/50 dark:hover:bg-[#111] transition-colors`}
                            >
                                <td className="px-3 py-3 text-center">
                                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-[#27272a] text-[10px] font-sfpro-bold text-gray-500 dark:text-[#71717a] flex items-center justify-center mx-auto">
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-3 py-3">
                                    <p className="font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate max-w-50">
                                        {item.materialName || "—"}
                                    </p>
                                </td>
                                <td className="px-3 py-3 text-gray-500 dark:text-[#71717a]">
                                    {item.unit || "—"}
                                </td>
                                <td className="px-3 py-3 text-right font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                                    {Number(item.quantity ?? 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-3 py-3 text-right text-gray-500 dark:text-[#71717a] font-sfpro-medium">
                                    {Number(item.currentStock ?? 0).toLocaleString("en-IN")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-100 dark:border-[#27272a] bg-gray-50 dark:bg-[#18181b]">
                            <td colSpan={3} className="px-3 py-3 text-right text-[11px] font-sfpro-bold text-gray-500 dark:text-[#71717a] uppercase tracking-wide">
                                Total
                            </td>
                            <td className="px-3 py-3 text-right text-[14px] font-sfpro-bold text-gray-900 dark:text-white">
                                {totalQty.toLocaleString("en-IN")}
                            </td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}
export default function ViewMRModal({ open, onClose, mr, isLoading = false }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
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

    const hasReason  = !!mr?.reason
    const hasRemarks = !!mr?.remarks
    const hasRejection = mr?.status === "Rejected" && !!mr?.rejectionRemarks

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />

            <div
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
                    visible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[78dvh] flex flex-col transition-colors duration-300">

                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                                    MR Details
                                </h2>
                                {!isLoading && mr?.status && <StatusPill status={mr.status} />}
                            </div>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                                View all details of this material requisition
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-5xl xl:max-w-6xl lg:mx-auto">

                            {isLoading ? (
                                <div className="animate-pulse flex flex-col gap-5 px-8 lg:px-10 py-6">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-18 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]" />
                                    ))}
                                </div>
                            ) : !mr ? (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-sm text-gray-400 font-sfpro">
                                        No MR data available
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-7 px-8 lg:px-10 py-6 pb-10">

                                    <div className="flex flex-col gap-1">
                                        <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">
                                            Material Requisition
                                        </p>
                                        <h3 className="text-[18px] lg:text-[20px] font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-snug">
                                            {mr.mrNumber || "—"}
                                        </h3>
                                        <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                                            Requested by{" "}
                                            <span className="font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                                                {mr.requestedBy?.name || "Unknown"}
                                            </span>
                                            {mr.createdAt && (
                                                <> · {smartDate(mr.createdAt) || mr.createdAt}</>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <SectionHeader title="Overview" />
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pt-1">
                                            <InfoRow
                                                icon={Hash}
                                                label="MR Number"
                                                value={mr.mrNumber}
                                            />
                                            <InfoRow
                                                icon={Layers}
                                                label="Total Items"
                                                value={String(mr.items?.length ?? 0)}
                                            />
                                            <InfoRow
                                                icon={Package}
                                                label="Total Quantity"
                                                value={
                                                    mr.totalQuantity
                                                        ? Number(mr.totalQuantity).toLocaleString("en-IN")
                                                        : null
                                                }
                                            />
                                            <InfoRow
                                                icon={Calendar}
                                                label="Needed By"
                                                value={smartDate(mr.requiredByDate) || mr.neededBy}
                                            />
                                            <InfoRow
                                                icon={Calendar}
                                                label="Created At"
                                                value={smartDate(mr.createdAt) || mr.createdAt}
                                            />
                                            <InfoRow
                                                icon={FileCheck}
                                                label="Status"
                                                value={STATUS_CONFIG[mr.status]?.label || mr.status}
                                            />
                                        </div>
                                    </div>

                                    {(hasReason || hasRemarks || hasRejection) && (
                                        <div className="flex flex-col gap-3">
                                            <SectionHeader title="Notes" />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <NoteBlock
                                                    icon={AlertTriangle}
                                                    label="Reason"
                                                    value={mr.reason}
                                                    // variant="warning"
                                                    variant="neutral"
                                                />
                                                <NoteBlock
                                                    icon={MessageSquare}
                                                    label="Remarks"
                                                    value={mr.remarks}
                                                    variant="neutral"
                                                />
                                                {hasRejection && (
                                                    <div className="md:col-span-2">
                                                        <NoteBlock
                                                            icon={ThumbsDown}
                                                            label="Rejection Remarks"
                                                            value={mr.rejectionRemarks}
                                                            variant="danger"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        <SectionHeader
                                            title="Requested Materials"
                                            count={mr.items?.length ?? 0}
                                        />
                                        <ItemsTable items={mr.items} />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <SectionHeader title="Activity Timeline" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            <UserBlock
                                                label="Requested By"
                                                user={mr.requestedBy}
                                                date={smartDate(mr.createdAt) || mr.createdAt}
                                            />
                                            <UserBlock
                                                label="Submitted By"
                                                user={mr.submittedBy}
                                                date={smartDate(mr.submittedAt)}
                                            />
                                            <UserBlock
                                                label="Approved By"
                                                user={mr.approvedBy}
                                                date={smartDate(mr.approvedAt)}
                                            />
                                            <UserBlock
                                                label="Rejected By"
                                                user={mr.rejectedBy}
                                                date={smartDate(mr.rejectedAt)}
                                            />
                                            <UserBlock
                                                label="Last Updated By"
                                                user={mr.updatedBy}
                                                date={smartDate(mr.updatedAt)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e]">
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