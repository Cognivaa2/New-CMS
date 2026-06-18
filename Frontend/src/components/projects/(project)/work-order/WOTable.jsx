"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
    CheckCircle2, Clock, Send, XCircle,
    Truck, PackageCheck, Ban, FileText,
    Eye, Edit, Trash2, ThumbsUp, ThumbsDown,
    Play, Flag, Loader2, Download, Award,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import { exportWOPdf, exportWCCPdf, fetchSingleWO } from "@/app/(companyname)/projects/[projectId]/work-order/api"
import CancelWOModal from "@/components/ui/CancelModal"
import ViewWOModal from "@/components/projects/(project)/work-order/ViewWOModal"

const STATUS_CONFIG = {
    Draft: { label: "Draft", icon: Clock, color: "#a1a1aa", className: "text-gray-600 bg-gray-100 border border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]" },
    Submitted: { label: "Submitted", icon: Send, color: "#3b82f6", className: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
    Approved: { label: "Approved", icon: CheckCircle2, color: "#22c55e", className: "text-[#16a34a] bg-[#ebfbf1] border border-[#c1f0d0] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400" },
    Rejected: { label: "Rejected", icon: XCircle, color: "#dc2626", className: "text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
    InProgress: { label: "In Progress", icon: Truck, color: "#f59e0b", className: "text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
    Completed: { label: "Completed", icon: PackageCheck, color: "#8b5cf6", className: "text-purple-600 bg-purple-50 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" },
    Cancelled: { label: "Cancelled", icon: Ban, color: "#6b7280", className: "text-gray-500 bg-gray-50 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20" },
}

const PDF_EXPORT_STATUSES = ["Approved", "InProgress", "Completed"]

const HEADERS = [
    "WO ID", "Title", "Vendor", "Work Items",
    "Final Value", "Status", "Progress", "Delivery", "Requested By", "",
]

const EMPTY = <span className="text-[13px] text-gray-400 dark:text-[#52525b] italic">Not provided</span>

function isEmpty(val) {
    return val === null || val === undefined || val === "" || val === 0 || val === "—"
}

function StatusPill({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
    const Icon = config.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {config.label}
        </span>
    )
}

function ProgressBar({ percent = 0 }) {
    return (
        <div className="flex items-center gap-2 min-w-20">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#27272a] overflow-hidden">
                <div
                    className="h-full rounded-full bg-linear-to-r from-violet-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            <span className="text-[11px] font-sfpro-medium text-gray-500 dark:text-[#71717a] shrink-0 w-7 text-right">
                {percent}%
            </span>
        </div>
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
    const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
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
    if (!user) return EMPTY
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar user={user} size={30} />
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                    {user.name || "Not provided"}
                </span>
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
                <FileText className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No work orders yet</p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">Create your first Work Order for this project.</p>
            </div>
        </div>
    )
}

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">{label}</span>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-word">
                {children ?? EMPTY}
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
                    <div className="h-3 w-40 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(n => (
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
            ([entry]) => { if (entry.isIntersecting && !loadingMore) onLoadMore() },
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
                <span className="text-[12px] text-gray-300 dark:text-[#3f3f46] font-sfpro">All records loaded</span>
            )}
        </div>
    )
}

function WOCard({ row, menuItems }) {
    const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
    return (
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
                        {row.woId || "Not provided"}
                    </p>
                    <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">
                        {row.title || "Not provided"}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StatusPill status={row.status} />
                    <div onClick={e => e.stopPropagation()}>
                        <ThreeDotMenu
                            items={menuItems} size="md"
                            header={{ title: row.woId, subtitle: row.vendorName, statusColor: config.color }}
                        />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Vendor">
                    <span className="truncate font-sfpro">
                        {isEmpty(row.vendorName) ? EMPTY : row.vendorName}
                    </span>
                </DetailRow>
                <DetailRow label="Final Value">
                    {isEmpty(row.finalAmount ?? row.totalContractValue)
                        ? EMPTY
                        : <div className="flex flex-col">
                            <span className="font-sfpro-bold text-[#212121] dark:text-white">
                                ₹{(row.finalAmount || row.totalContractValue).toLocaleString("en-IN")}
                            </span>
                            {(row.gst > 0 || row.discount > 0) && (
                                <span className="text-[10px] text-gray-400 dark:text-[#52525b]">
                                    {row.discount > 0 ? `-${row.discount}%` : ""}
                                    {row.discount > 0 && row.gst > 0 ? " · " : ""}
                                    {row.gst > 0 ? `+${row.gst}% GST` : ""}
                                </span>
                            )}
                        </div>
                    }
                </DetailRow>
                <DetailRow label="Work Items">
                    <span className="line-clamp-2 leading-snug font-sfpro text-[12px]">
                        {isEmpty(row.workSummary) ? EMPTY : row.workSummary}
                    </span>
                </DetailRow>
                <DetailRow label="Progress">
                    <ProgressBar percent={row.completionPercent || 0} />
                </DetailRow>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <DetailRow label="Delivery">
                    {isEmpty(row.expectedEndFormatted) ? EMPTY : row.expectedEndFormatted}
                </DetailRow>
                <DetailRow label="Created At">
                    {isEmpty(row.createdAt) ? EMPTY : row.createdAt}
                </DetailRow>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Created By</span>
                    {row.createdBy
                        ? <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                            <UserAvatar user={row.createdBy} size={22} />
                            <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                {row.createdBy?.name || "Not provided"}
                            </span>
                        </div>
                        : <div className="mt-0.5">{EMPTY}</div>
                    }
                </div>
            </div>
        </div>
    )
}

function WORow({ row, menuItems, isLast }) {
    const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
    return (
        <tr className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""}`}>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white">
                    {isEmpty(row.woId) ? EMPTY : row.woId}
                </span>
            </td>
            <td className="px-5 py-4">
                <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-45">
                    {isEmpty(row.title) ? EMPTY : row.title}
                </p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {isEmpty(row.vendorName) ? EMPTY : row.vendorName}
                </span>
            </td>
            <td className="px-5 py-4">
                <p className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate max-w-40">
                    {isEmpty(row.workSummary) ? EMPTY : row.workSummary}
                </p>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                {isEmpty(row.finalAmount ?? row.totalContractValue)
                    ? EMPTY
                    : <div className="flex flex-col">
                        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                            ₹{(row.finalAmount || row.totalContractValue).toLocaleString("en-IN")}
                        </span>
                        {row.gst > 0 || row.discount > 0 ? (
                            <span className="text-[10px] text-gray-400 dark:text-[#52525b]">
                                {row.discount > 0 ? `-${row.discount}% disc` : ""}
                                {row.discount > 0 && row.gst > 0 ? " · " : ""}
                                {row.gst > 0 ? `+${row.gst}% GST` : ""}
                            </span>
                        ) : null}
                    </div>
                }
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <StatusPill status={row.status} />
            </td>
            <td className="px-5 py-4">
                <ProgressBar percent={row.completionPercent || 0} />
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {isEmpty(row.expectedEndFormatted) ? EMPTY : row.expectedEndFormatted}
                </span>
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
                <UserCell user={row.createdBy} />
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <div onClick={e => e.stopPropagation()} className="flex justify-center">
                    <ThreeDotMenu
                        items={menuItems} size="sm"
                        header={{ title: row.woId, subtitle: row.vendorName, statusColor: config.color }}
                    />
                </div>
            </td>
        </tr>
    )
}

export default function WOTable({
    data = [],
    isLoading = false,
    loadingMore = false,
    hasMore = false,
    onLoadMore,
    projectId,
    onEdit,
    onDelete,
    onSubmit,
    onApprove,
    onReject,
    onCancel,
    onStart,
    onComplete,
    actionLoading = {},
    total = 0,
}) {
    const [pdfLoading, setPdfLoading] = useState({})
    const [wccLoading, setWccLoading] = useState({})
    const [viewModal, setViewModal] = useState({ open: false, wo: null, isLoading: false })
    const [cancelModal, setCancelModal] = useState({ open: false, wo: null })

    const isCancelling = (wo) => actionLoading[wo?.id] === "cancelling"

    const handleViewClick = async (row) => {
        setViewModal({ open: true, wo: row, isLoading: true })
        try {
            const full = await fetchSingleWO(projectId, row.id)
            setViewModal({ open: true, wo: full, isLoading: false })
        } catch (err) {
            setViewModal(prev => ({ ...prev, isLoading: false }))
            toast.error("Warning", { description: "Could not load full WO details" })
        }
    }

    const handleViewClose = () => setViewModal({ open: false, wo: null, isLoading: false })
    const handleCancelClick = (row) => setCancelModal({ open: true, wo: row })
    const handleCancelClose = () => { if (isCancelling(cancelModal.wo)) return; setCancelModal({ open: false, wo: null }) }
    const handleCancelConfirm = async (wo, remarks) => { await onCancel?.(wo, remarks); setCancelModal({ open: false, wo: null }) }

    const handleExportPdf = async (row) => {
        if (pdfLoading[row.id]) return
        setPdfLoading(p => ({ ...p, [row.id]: true }))
        const id = toast.loading(`Generating PDF for ${row.woNumber}…`, { description: "Please wait" })
        try {
            const result = await exportWOPdf(projectId, row.id, row.woNumber)
            toast.success("PDF Downloaded", { id, description: `${result.filename} saved to your downloads` })
        } catch (err) {
            toast.error("Export Failed", { id, description: err.message || "Could not generate PDF" })
        } finally {
            setPdfLoading(p => ({ ...p, [row.id]: false }))
        }
    }

    const handleExportWCC = async (row) => {
        if (wccLoading[row.id]) return
        setWccLoading(p => ({ ...p, [row.id]: true }))
        const id = toast.loading(`Generating WCC for ${row.woNumber}…`, { description: "Please wait" })
        try {
            const result = await exportWCCPdf(projectId, row.id, row.woNumber)
            toast.success("WCC Downloaded", { id, description: `${result.filename} saved to your downloads` })
        } catch (err) {
            toast.error("WCC Export Failed", { id, description: err.message || "Could not generate Work Completion Certificate" })
        } finally {
            setWccLoading(p => ({ ...p, [row.id]: false }))
        }
    }

    const buildMenuItems = (row) => {
        const loading = actionLoading[row.id]
        const isPdfBusy = !!pdfLoading[row.id]
        const isWccBusy = !!wccLoading[row.id]
        const canExport = PDF_EXPORT_STATUSES.includes(row.status)
        const isCompleted = row.status === "Completed"

        const items = [{ label: "View Details", icon: <Eye className="w-4 h-4" />, onClick: () => handleViewClick(row) }]

        if (canExport) {
            items.push({
                label: isPdfBusy ? "Generating PDF…" : "Download PDF",
                icon: isPdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />,
                onClick: () => handleExportPdf(row),
                disabled: isPdfBusy,
            })
        }
        if (isCompleted) {
            items.push({
                label: isWccBusy ? "Generating WCC…" : "Download WCC",
                icon: isWccBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />,
                onClick: () => handleExportWCC(row),
                disabled: isWccBusy,
            })
        }
        if (["Draft", "Rejected"].includes(row.status)) {
            items.push({ label: "Edit WO", icon: <Edit className="w-4 h-4" />, onClick: () => onEdit?.(row) })
            items.push({
                label: loading === "submitting" ? "Submitting…" : "Submit for Approval",
                icon: loading === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />,
                onClick: () => !loading && onSubmit?.(row),
                disabled: !!loading,
            })
        }
        if (row.status === "Submitted") {
            items.push({
                label: loading === "approving" ? "Approving…" : "Approve",
                icon: loading === "approving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />,
                onClick: () => !loading && onApprove?.(row), disabled: !!loading,
            })
            items.push({
                label: loading === "rejecting" ? "Rejecting…" : "Reject",
                icon: loading === "rejecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />,
                onClick: () => !loading && onReject?.(row), disabled: !!loading, variant: "danger",
            })
        }
        if (row.status === "Approved") {
            items.push({
                label: loading === "starting" ? "Starting…" : "Start Work",
                icon: loading === "starting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />,
                onClick: () => !loading && onStart?.(row), disabled: !!loading,
            })
            items.push({
                label: "Cancel WO",
                icon: loading === "cancelling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />,
                onClick: () => !loading && handleCancelClick(row), disabled: !!loading, variant: "danger",
            })
        }
        if (row.status === "InProgress") {
            items.push({
                label: loading === "completing" ? "Completing…" : "Mark Complete",
                icon: loading === "completing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />,
                onClick: () => !loading && onComplete?.(row), disabled: !!loading,
            })
            items.push({
                label: "Cancel WO",
                icon: loading === "cancelling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />,
                onClick: () => !loading && handleCancelClick(row), disabled: !!loading, variant: "danger",
            })
        }
        if (["Draft", "Rejected"].includes(row.status)) {
            items.push("divider")
            items.push({ label: "Delete", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => onDelete?.(row) })
        }
        return items
    }

    return (
        <>
            <ViewWOModal open={viewModal.open} onClose={handleViewClose} wo={viewModal.wo} isLoading={viewModal.isLoading} />
            <CancelWOModal
                isOpen={cancelModal.open}
                onClose={handleCancelClose}
                onConfirm={handleCancelConfirm}
                wo={cancelModal.wo}
                isLoading={isCancelling(cancelModal.wo)}
            />

            <div className="w-full font-sfpro pb-10">

                <div className="lg:hidden space-y-3">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                        : data.length === 0
                            ? <EmptyState />
                            : <>
                                {data.map(row => <WOCard key={row.id} row={row} menuItems={buildMenuItems(row)} />)}
                                <LoadMoreTrigger onLoadMore={onLoadMore} loadingMore={loadingMore} hasMore={hasMore} />
                            </>
                    }
                </div>

                <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                        <table className="w-full min-w-275 border-collapse">
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
                                        : data.map((row, index) => (
                                            <WORow
                                                key={row.id}
                                                row={row}
                                                menuItems={buildMenuItems(row)}
                                                isLast={index === data.length - 1}
                                            />
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && data.length > 0 && (
                        <LoadMoreTrigger onLoadMore={onLoadMore} loadingMore={loadingMore} hasMore={hasMore} />
                    )}
                </div>

                {!isLoading && data.length > 0 && (
                    <p className="mt-3 px-1 text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
                        {data.length} of {total} work order{total !== 1 ? "s" : ""}
                    </p>
                )}
            </div>
        </>
    )
}