"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
    X, CheckCircle2, Clock, Send, XCircle, Truck,
    PackageCheck, Ban, FileText, Package, User,
    Calendar, MapPin, CreditCard, ClipboardList,
    ThumbsUp, ThumbsDown, Loader2, Wrench, Hash,
    Building2, AlertCircle, Layers, Timer,
} from "lucide-react"

const STATUS_CONFIG = {
    Draft: { label: "Draft", icon: Clock, className: "text-gray-600 bg-gray-100 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]" },
    Submitted: { label: "Submitted", icon: Send, className: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
    Approved: { label: "Approved", icon: CheckCircle2, className: "text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" },
    Rejected: { label: "Rejected", icon: XCircle, className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
    InProgress: { label: "In Progress", icon: Timer, className: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
    Completed: { label: "Completed", icon: PackageCheck, className: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" },
    Cancelled: { label: "Cancelled", icon: Ban, className: "text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20" },
}

const PRIORITY_CONFIG = {
    Low: { className: "text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" },
    Medium: { className: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
    High: { className: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
    Critical: { className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
}

function Backdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
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

function PriorityPill({ priority }) {
    if (!priority) return null
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide border ${config.className}`}>
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
            {priority}
        </span>
    )
}

function UserAvatar({ user, size = 32 }) {
    const [imgError, setImgError] = useState(false)
    const hasAvatar = user?.avatar && !imgError
    if (hasAvatar) {
        return (
            <img
                src={user.avatar} alt={user.name || "User"}
                width={size} height={size}
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
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide">
                {label}
            </span>
            <div className="flex items-center gap-2">
                <UserAvatar user={user} size={28} />
                <div className="min-w-0">
                    <p className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] truncate">
                        {user.name}
                    </p>
                    {user.role && (
                        <p className="text-[11px] text-gray-400 dark:text-[#52525b] truncate">{user.role}</p>
                    )}
                </div>
            </div>
            {date && (
                <p className="text-[11px] text-gray-400 dark:text-[#52525b] ml-9">{date}</p>
            )}
        </div>
    )
}

function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-[#71717a]" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide mb-0.5">
                    {label}
                </p>
                <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] wrap-break-words">
                    {value}
                </p>
            </div>
        </div>
    )
}

function SectionHeader({ title }) {
    return (
        <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-widest whitespace-nowrap">
                {title}
            </p>
            <div className="flex-1 h-px bg-gray-100 dark:bg-[#27272a]" />
        </div>
    )
}

function ItemsTable({ items }) {
    if (!items?.length) return null

    const grandTotal = items.reduce((sum, i) => sum + (i.amount ?? 0), 0)

    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#27272a] overflow-hidden">
            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                <table className="w-full min-w-135 border-collapse text-[12px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-[#18181b] border-b border-gray-100 dark:border-[#27272a]">
                            {["#", "Description", "Unit", "Qty", "Unit Rate", "Total"].map((h, i) => (
                                <th
                                    key={i}
                                    className={`px-3 py-2.5 text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide whitespace-nowrap ${i === 0 ? "text-center w-8" : i >= 3 ? "text-right" : "text-left"
                                        }`}
                                >
                                    {h}
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
                                    <p className="font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] truncate max-w-40">
                                        {item.description || "—"}
                                    </p>
                                    {item.remarks && (
                                        <p className="text-[10px] text-gray-400 dark:text-[#52525b] mt-0.5 truncate max-w-40">
                                            {item.remarks}
                                        </p>
                                    )}
                                </td>
                                <td className="px-3 py-3 text-gray-500 dark:text-[#71717a]">
                                    {item.unit || "—"}
                                </td>
                                <td className="px-3 py-3 text-right font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                                    {item.quantity ?? 0}
                                </td>
                                <td className="px-3 py-3 text-right text-gray-600 dark:text-[#a1a1aa]">
                                    ₹{(item.unitRate ?? 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-3 py-3 text-right font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                                    ₹{(item.amount ?? 0).toLocaleString("en-IN")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-100 dark:border-[#27272a] bg-gray-50 dark:bg-[#18181b]">
                            <td colSpan={5} className="px-3 py-3 text-right text-[11px] font-sfpro-bold text-gray-500 dark:text-[#71717a] uppercase tracking-wide">
                                Grand Total
                            </td>
                            <td className="px-3 py-3 text-right text-[14px] font-sfpro-bold text-gray-900 dark:text-white">
                                ₹{grandTotal.toLocaleString("en-IN")}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}

export default function ViewWOModal({ open, onClose, wo, isLoading = false }) {
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
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                                    Work Order Details
                                </h2>
                                {!isLoading && wo?.status && (
                                    <StatusPill status={wo.status} />
                                )}
                            </div>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                                View all details of this work order
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pt-5 lg:px-0" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-5xl xl:max-w-6xl lg:mx-auto">
                            {isLoading ? (
                                <div className="animate-pulse flex flex-col gap-5 px-8 lg:px-10 pb-10">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-18 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]"
                                        />
                                    ))}
                                </div>
                            ) : !wo ? (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-sm text-gray-400 font-sfpro">
                                        No Work Order data available
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 px-8 lg:px-10 pb-8">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">
                                                Work Order
                                            </p>
                                            {wo.priority && <PriorityPill priority={wo.priority} />}
                                        </div>
                                        <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                                            {wo.woNumber}
                                        </h3>
                                        {wo.title && (
                                            <p className="text-[14px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                                                {wo.title}
                                            </p>
                                        )}
                                        <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                                            {wo.contractorName || wo.vendorName}
                                            {wo.createdAt ? ` · ${formatDate(wo.createdAt)}` : ""}
                                        </p>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                                        <InfoRow icon={Hash} label="WO Number" value={wo.woNumber} />
                                        <InfoRow icon={Building2} label="Contractor / Vendor" value={wo.contractorName || wo.vendorName} />
                                        <InfoRow icon={Wrench} label="Work Type" value={wo.workType} />
                                        <InfoRow icon={Layers} label="Phase" value={wo.phaseName} />
                                        <InfoRow icon={Calendar} label="Start Date" value={formatDate(wo.startDate)} />
                                        <InfoRow icon={Calendar} label="End Date" value={formatDate(wo.endDate)} />
                                        <InfoRow icon={CreditCard} label="Payment Terms" value={wo.paymentTerms} />
                                        <InfoRow icon={MapPin} label="Work Location" value={wo.workLocation || wo.deliveryAddress} />
                                        <InfoRow icon={ClipboardList} label="Scope of Work" value={wo.scopeOfWork} />
                                        <InfoRow
                                            icon={Package}
                                            label="Items"
                                            value={String(wo.workItems?.length ?? 0)}
                                        />
                                        <InfoRow
                                            icon={CreditCard}
                                            label="Total Contract Value"
                                            value={wo.totalContractValue ? `₹${wo.totalContractValue.toLocaleString("en-IN")}` : null}
                                        />
                                        <InfoRow icon={Calendar} label="Created At" value={formatDate(wo.createdAt)} />
                                    </div>

                                    {wo.description && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                            <div className="flex flex-col gap-2">
                                                <SectionHeader title="Description" />
                                                <p className="text-[13px] text-gray-700 dark:text-[#d4d4d8] font-sfpro leading-relaxed whitespace-pre-wrap">
                                                    {wo.description}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {wo.specialInstructions && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                            <div className="flex flex-col gap-2">
                                                <SectionHeader title="Special Instructions" />
                                                <p className="text-[13px] text-gray-700 dark:text-[#d4d4d8] font-sfpro leading-relaxed whitespace-pre-wrap">
                                                    {wo.specialInstructions}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {wo.status === "Rejected" && wo.rejectionRemarks && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                            <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4">
                                                <div className="flex items-start gap-3">
                                                    <ThumbsDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[12px] font-sfpro-bold text-red-600 dark:text-red-400">
                                                            Rejection Remarks
                                                        </p>
                                                        <p className="text-[13px] mt-1 text-red-700 dark:text-red-300">
                                                            {wo.rejectionRemarks}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {wo.status === "Cancelled" && wo.cancellationRemarks && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                            <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] p-4">
                                                <div className="flex items-start gap-3">
                                                    <Ban className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[12px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa]">
                                                            Cancellation Remarks
                                                        </p>
                                                        <p className="text-[13px] mt-1 text-gray-700 dark:text-[#d4d4d8]">
                                                            {wo.cancellationRemarks}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                    <div className="flex flex-col gap-3">
                                        <SectionHeader title={`Work Items (${wo.workItems?.length ?? 0})`} />
                                        <ItemsTable items={wo.workItems} />
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                    <div className="flex flex-col gap-4">
                                        <SectionHeader title="Activity Timeline" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            <UserBlock
                                                label="Created By"
                                                user={wo.createdBy}
                                                date={formatDate(wo.createdAt)}
                                            />
                                            <UserBlock
                                                label="Submitted By"
                                                user={wo.submittedBy}
                                                date={formatDate(wo.submittedAt)}
                                            />
                                            <UserBlock
                                                label="Approved By"
                                                user={wo.approvedBy}
                                                date={formatDate(wo.approvedAt)}
                                            />
                                            <UserBlock
                                                label="Rejected By"
                                                user={wo.rejectedBy}
                                                date={formatDate(wo.rejectedAt)}
                                            />
                                            <UserBlock
                                                label="Cancelled By"
                                                user={wo.cancelledBy}
                                                date={formatDate(wo.cancelledAt)}
                                            />
                                            <UserBlock
                                                label="Last Updated By"
                                                user={wo.updatedBy}
                                                date={formatDate(wo.updatedAt)}
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

function formatDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}