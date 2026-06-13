"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Loader2, AlertTriangle, Activity, Clock,
    CheckCircle2, XCircle, RotateCcw, Paperclip,
    ImageIcon, ReceiptText, Download, User, Calendar,
    Tag, Hash, FileText, CreditCard, Building2, BadgeCheck,
} from "lucide-react"
import { fetchSingleExpense } from "@/app/(companyname)/projects/[projectId]/expenses/api"

function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function isImageUrl(url) {
    if (!url) return false
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
}

function NotProvided() {
    return (
        <span className="italic text-[13px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
            Not Available
        </span>
    )
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

function UserAvatar({ name, img, size = 28 }) {
    const [imgError, setImgError] = useState(false)
    const hasImg = img && !imgError

    if (hasImg) {
        return (
            <img
                src={img}
                alt={name || "User"}
                onError={() => setImgError(true)}
                className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
                style={{ width: size, height: size }}
            />
        )
    }

    return (
        <div
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
            style={{ width: size, height: size }}
        >
            {getInitials(name)}
        </div>
    )
}

function DetailField({ icon: Icon, label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                {Icon && (
                    <Icon className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                )}
                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                    {label}
                </span>
            </div>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-words">
                {children ?? <NotProvided />}
            </div>
        </div>
    )
}

const STATUS_CONFIG = {
    Approved: {
        icon: CheckCircle2,
        cls: "bg-[#ebfbf1] text-[#166534] border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    },
    Pending: {
        icon: Clock,
        cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    },
    Committed: {
        icon: Clock,
        cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    },
    Actual: {
        icon: CheckCircle2,
        cls: "bg-[#ebfbf1] text-[#166534] border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    },
    Rejected: {
        icon: XCircle,
        cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    },
    Reversed: {
        icon: RotateCcw,
        cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    },
}

function StatusBadge({ status }) {
    if (!status) return <NotProvided />
    const config = STATUS_CONFIG[status]
    const Icon = config?.icon ?? Clock
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-bold whitespace-nowrap tracking-wide ${config?.cls ??
                "bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]"
                }`}
        >
            <Icon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
            {status}
        </span>
    )
}

function PersonCard({ label, person, meta }) {
    if (!person) return null
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide px-1">
                {label}
                {meta && (
                    <span className="ml-2 normal-case tracking-normal font-sfpro text-[10px]">
                        — {meta}
                    </span>
                )}
            </span>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                <UserAvatar name={person.name} img={person.img} size={26} />
                <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                        {person.name || "Unknown"}
                    </span>
                    {(person.email || person.role) && (
                        <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                            {person.email || person.role}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function ExpenseSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-2.5">
                <div className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg" />
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
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-14 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
                ))}
            </div>
        </div>
    )
}

function ExpenseDetailContent({ expense, onViewAttachment }) {
    return (
        <div className="flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">
                    Expense
                </p>
                <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                    {expense.expenseNumber || "Not Available"}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(expense.type || expense.subType) && (
                        <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                            {expense.type}
                            {expense.subType ? ` · ${expense.subType}` : ""}
                        </p>
                    )}
                    <StatusBadge status={expense.status} />
                </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <DetailField icon={Tag} label="Category">
                    {expense.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-md text-[12px] font-sfpro-bold text-gray-700 dark:text-gray-300">
                            {expense.category}
                        </span>
                    ) : <NotProvided />}
                </DetailField>

                <DetailField icon={BadgeCheck} label="Amount">
                    {expense.amountFormatted ? (
                        <span className="text-[15px] font-sfpro-bold text-gray-900 dark:text-[#f4f4f5]">
                            {expense.amountFormatted}
                        </span>
                    ) : <NotProvided />}
                </DetailField>

                <DetailField icon={Calendar} label="Expense Date">
                    {expense.date || <NotProvided />}
                </DetailField>

                {expense.paymentMode && (
                    <DetailField icon={CreditCard} label="Payment Mode">
                        {expense.paymentMode}
                    </DetailField>
                )}

                {expense.referenceNumber && (
                    <DetailField icon={Hash} label="Reference No.">
                        {expense.referenceNumber}
                    </DetailField>
                )}

                {expense.sourceNumber && (
                    <DetailField icon={FileText} label="Source">
                        {expense.sourceNumber}
                    </DetailField>
                )}
            </div>

            {expense.description && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Description
                            </span>
                        </div>
                        <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed whitespace-pre-wrap wrap-break-words">
                            {expense.description}
                        </p>
                    </div>
                </>
            )}

            {expense.vendorName && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Vendor
                            </span>
                        </div>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#27272a] flex items-center justify-center shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-[#71717a]" strokeWidth={2} />
                            </div>
                            <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                {expense.vendorName}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {expense.rejectionRemarks && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={2} />
                            <span className="text-[10px] text-red-400 uppercase font-sfpro-bold tracking-wide">
                                Rejection Remarks
                            </span>
                        </div>
                        <div className="px-3.5 py-2.5 bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-200 dark:border-red-500/20">
                            <p className="text-[13px] font-sfpro text-red-700 dark:text-red-400 leading-relaxed wrap-break-words">
                                {expense.rejectionRemarks}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {expense.reversalReason && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-purple-400" strokeWidth={2} />
                            <span className="text-[10px] text-purple-400 uppercase font-sfpro-bold tracking-wide">
                                Reversal Reason
                            </span>
                        </div>
                        <div className="px-3.5 py-2.5 bg-purple-50 dark:bg-purple-500/5 rounded-xl border border-purple-200 dark:border-purple-500/20">
                            <p className="text-[13px] font-sfpro text-purple-700 dark:text-purple-400 leading-relaxed wrap-break-words">
                                {expense.reversalReason}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {expense.paymentRemarks && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Payment Remarks
                            </span>
                        </div>
                        <div className="px-3.5 py-2.5 bg-[#fafafa] dark:bg-[#18181b] rounded-xl border border-[#e4e4e7] dark:border-[#252525]">
                            <p className="text-[13px] font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed wrap-break-words">
                                {expense.paymentRemarks}
                            </p>
                        </div>
                    </div>
                </>
            )}

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Timeline
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <DetailField icon={null} label="Created">
                        {expense.createdAt || <NotProvided />}
                    </DetailField>
                    {expense.submittedAt && (
                        <DetailField icon={null} label="Submitted">
                            {expense.submittedAt}
                        </DetailField>
                    )}
                    {expense.approvedAt && (
                        <DetailField icon={null} label="Approved">
                            {expense.approvedAt}
                        </DetailField>
                    )}
                    {expense.rejectedAt && (
                        <DetailField icon={null} label="Rejected">
                            {expense.rejectedAt}
                        </DetailField>
                    )}
                    {expense.paidAt && (
                        <DetailField icon={null} label="Paid">
                            {expense.paidAt}
                        </DetailField>
                    )}
                    {expense.reversedAt && (
                        <DetailField icon={null} label="Reversed">
                            {expense.reversedAt}
                        </DetailField>
                    )}
                </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        People
                    </span>
                </div>
                <div className="flex flex-col gap-3">
                    <PersonCard label="Created By" person={expense.createdBy} />
                    <PersonCard
                        label="Submitted By"
                        person={expense.submittedBy}
                        meta={expense.submittedAt || undefined}
                    />
                    <PersonCard
                        label="Approved By"
                        person={expense.approvedBy}
                        meta={expense.approvedAt || undefined}
                    />
                    <PersonCard
                        label="Rejected By"
                        person={expense.rejectedBy}
                        meta={expense.rejectedAt || undefined}
                    />
                    <PersonCard
                        label="Paid By"
                        person={expense.paidBy}
                        meta={expense.paidAt || undefined}
                    />
                    <PersonCard
                        label="Reversed By"
                        person={expense.reversedBy}
                        meta={expense.reversedAt || undefined}
                    />
                </div>
            </div>

            {expense.attachmentUrl && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Attachment
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#252525] bg-[#fafafa] dark:bg-[#18181b]">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                    {isImageUrl(expense.attachmentUrl) ? (
                                        <img
                                            src={expense.attachmentUrl}
                                            alt={expense.attachment || "attachment"}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.style.display = "none" }}
                                        />
                                    ) : (
                                        <ReceiptText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                        {expense.attachment || "Attachment"}
                                    </span>
                                    <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                        {isImageUrl(expense.attachmentUrl) ? "Image" : "Document"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => onViewAttachment?.()}
                                className="h-7 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1 shrink-0"
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                View
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function AttachmentBackdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-58 bg-black/50 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
        />
    )
}

function ExpenseAttachmentDrawerInline({ open, onClose, attachmentUrl, attachmentName, expenseNumber }) {
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

    if (!mounted) return null

    const isImage = isImageUrl(attachmentUrl)
    const fileName = attachmentName || attachmentUrl?.split("/").pop() || "Document"

    return (
        <>
            <AttachmentBackdrop visible={visible} onClose={onClose} />
            <div
                style={{
                    transitionDuration: "800ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-59 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
                    }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>
                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                                Attachment
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 text-center">
                                {expenseNumber && <span>{expenseNumber} · </span>}
                                {fileName}
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-8 lg:px-10 pb-4" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto flex flex-col items-center gap-4">
                            {isImage ? (
                                <div className="w-full rounded-xl overflow-hidden border border-gray-100 dark:border-[#252525]">
                                    <img
                                        src={attachmentUrl}
                                        alt={fileName}
                                        className="w-full object-contain max-h-[50dvh]"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-12 w-full rounded-xl border border-gray-100 dark:border-[#252525] bg-gray-50 dark:bg-[#18181b]">
                                    <ReceiptText className="w-10 h-10 text-gray-300 dark:text-[#52525b]" />
                                    <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] text-center px-4 break-all">
                                        {fileName}
                                    </p>
                                    <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-sfpro-medium text-blue-600 dark:text-blue-400 underline underline-offset-2"
                                    >
                                        Open file
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e]">
                        {attachmentUrl && (
                            <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150 flex items-center gap-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download
                            </a>
                        )}
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

export default function ExpenseViewModal({ isOpen, onClose, expense: initialExpense, projectId }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [expense, setExpense] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [attachmentOpen, setAttachmentOpen] = useState(false)
    const fetchRef = useRef(null)

    const loadFullExpense = useCallback(async () => {
        if (!initialExpense?.id || !projectId) return
        setIsLoading(true)
        setError(null)
        fetchRef.current?.abort()
        const controller = new AbortController()
        fetchRef.current = controller
        try {
            const full = await fetchSingleExpense(projectId, initialExpense.id, controller.signal)
            if (!controller.signal.aborted) setExpense(full)
        } catch (err) {
            if (err.name === "CanceledError" || err.name === "AbortError") return
            setError(err.message || "Failed to load expense details")
            setExpense(initialExpense)
        } finally {
            if (!controller.signal.aborted) setIsLoading(false)
        }
    }, [initialExpense, projectId])

    useEffect(() => {
        if (isOpen && initialExpense) {
            setMounted(true)
            setExpense(initialExpense)
            setError(null)
            loadFullExpense()
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            setAttachmentOpen(false)
            const t = setTimeout(() => {
                setMounted(false)
                setExpense(null)
                setError(null)
                fetchRef.current?.abort()
            }, 420)
            return () => clearTimeout(t)
        }
    }, [isOpen, initialExpense, loadFullExpense])

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape" && isOpen) {
                if (attachmentOpen) {
                    setAttachmentOpen(false)
                } else {
                    onClose?.()
                }
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, onClose, attachmentOpen])

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />

            <div
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
                    }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Expense Details
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                View all details of this expense
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
                            {isLoading && !expense ? (
                                <ExpenseSkeleton />
                            ) : expense ? (
                                <ExpenseDetailContent
                                    expense={expense}
                                    onViewAttachment={() => setAttachmentOpen(true)}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#fafafa] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#252525] flex items-center justify-center">
                                        <Activity size={22} className="text-[#a1a1aa] dark:text-[#52525b]" />
                                    </div>
                                    <p className="text-[13px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                                        Failed to load expense details
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

            {expense?.attachmentUrl && (
                <ExpenseAttachmentDrawerInline
                    open={attachmentOpen}
                    onClose={() => setAttachmentOpen(false)}
                    attachmentUrl={expense.attachmentUrl}
                    attachmentName={expense.attachment}
                    expenseNumber={expense.expenseNumber}
                />
            )}
        </>
    )
}