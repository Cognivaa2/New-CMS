"use client"

import { useState, useEffect } from "react"
import {
    X, Clock, Send, CheckCircle2, XCircle,
    ArrowUp, ArrowDown, ThumbsDown, Ban,
    Hash, Building2, FileText, DollarSign, Calendar,
    MessageSquare, ArrowRightLeft,
} from "lucide-react"
import { CE_STATUS_CONFIG } from "@/app/(companyname)/contra-entries/api"

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
    const cfg = CE_STATUS_CONFIG[status] || CE_STATUS_CONFIG.Draft
    const ICON = { Draft: Clock, Submitted: Send, Approved: CheckCircle2, Rejected: XCircle }
    const Icon = ICON[status] || Clock
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide border ${cfg.className}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {cfg.label}
        </span>
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
                <p className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide mb-0.5">{label}</p>
                <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] wrap-break-words">{value}</p>
            </div>
        </div>
    )
}

function SectionHeader({ title }) {
    return (
        <p className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-widest mb-3">{title}</p>
    )
}

function UserBlock({ label, user, date }) {
    if (!user) return null
    const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide">{label}</span>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0">
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</p>
                    {user.role && <p className="text-[11px] text-gray-400 dark:text-[#52525b] truncate">{user.role}</p>}
                </div>
            </div>
            {date && date !== "—" && (
                <p className="text-[11px] text-gray-400 dark:text-[#52525b] ml-9">{date}</p>
            )}
        </div>
    )
}

export default function CEViewModal({ open, onClose, ce }) {
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
                    transitionDuration: "600ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
                    visible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="flex items-start justify-between px-6 lg:px-10 pt-5 pb-3 shrink-0">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                                    {ce?.ceNumber || "Contra Entry"}
                                </h2>
                                {ce?.status && <StatusPill status={ce.status} />}
                            </div>
                            <p className="text-[13px] font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                                {ce?.poNumber || "—"} · {ce?.vendorName || "—"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-5xl lg:mx-auto px-6 lg:px-10 py-6">
                            {!ce ? (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-sm text-gray-400 font-sfpro">No data available</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                                        <InfoRow icon={Hash} label="CE Number" value={ce.ceNumber} />
                                        <InfoRow icon={FileText} label="PO Number" value={ce.poNumber} />
                                        <InfoRow icon={Building2} label="Vendor" value={ce.vendorName} />
                                        <InfoRow icon={ArrowRightLeft} label="Type" value={ce.typeLabel} />
                                        <InfoRow
                                            icon={ce.isDebit ? ArrowUp : ArrowDown}
                                            label="Direction"
                                            value={ce.directionLabel}
                                        />
                                        <InfoRow icon={DollarSign} label="Amount" value={ce.adjustmentAmountFormatted} />
                                        <InfoRow icon={MessageSquare} label="Reason" value={ce.reason} />
                                        {ce.remarks && <InfoRow icon={MessageSquare} label="Remarks" value={ce.remarks} />}
                                        <InfoRow icon={Calendar} label="Created At" value={ce.createdAt} />
                                    </div>

                                    {ce.status === "Rejected" && ce.rejectionRemarks && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                            <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4">
                                                <div className="flex items-start gap-3">
                                                    <ThumbsDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[12px] font-sfpro-bold text-red-600 dark:text-red-400">Rejection Remarks</p>
                                                        <p className="text-[13px] mt-1 text-red-700 dark:text-red-300">{ce.rejectionRemarks}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                                    <div className="flex flex-col gap-4">
                                        <SectionHeader title="Activity Timeline" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            <UserBlock label="Created By" user={ce.createdBy} date={ce.createdAt} />
                                            <UserBlock label="Submitted By" user={ce.submittedBy} date={ce.submittedAt} />
                                            <UserBlock label="Approved By" user={ce.approvedBy} date={ce.approvedAt} />
                                            <UserBlock label="Rejected By" user={ce.rejectedBy} date={ce.rejectedAt} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-6 lg:px-10 py-4 border-t border-gray-100 dark:border-[#1e1e1e]">
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