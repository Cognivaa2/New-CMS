"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Loader2, Clock, CheckCircle2, XCircle, Send,
    ArrowUp, ArrowDown, User, Calendar, Tag, Hash, FileText, Activity,
} from "lucide-react"
import { fetchSingleStockAdjustment } from "@/app/(companyname)/projects/[projectId]/inventory/api"
import { useParams } from "next/navigation"

function NA() {
    return (
        <span className="italic text-[13px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
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

const STATUS_CONFIG = {
    Draft: { icon: Clock, cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]" },
    Submitted: { icon: Send, cls: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
    Approved: { icon: CheckCircle2, cls: "bg-[#ebfbf1] text-[#16a34a] border-[#c1f0d0] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400" },
    Rejected: { icon: XCircle, cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
}

function StatusBadge({ status }) {
    if (!status) return <NA />
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-bold uppercase whitespace-nowrap tracking-wide ${cfg.cls}`}>
            <Icon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
            {status}
        </span>
    )
}

function TypeBadge({ type }) {
    if (!type) return <NA />
    const isAdd = type === "add"
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-bold uppercase whitespace-nowrap tracking-wide ${isAdd
            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
            : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
            }`}>
            {isAdd ? <ArrowUp className="w-3 h-3" strokeWidth={2.5} /> : <ArrowDown className="w-3 h-3" strokeWidth={2.5} />}
            {isAdd ? "Add Stock" : "Remove Stock"}
        </span>
    )
}

function DetailField({ icon: Icon, label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />}
                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">{label}</span>
            </div>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">
                {children ?? <NA />}
            </div>
        </div>
    )
}

function UserAvatar({ user, size = 26 }) {
    const [imgError, setImgError] = useState(false)
    const hasImg = user?.avatar && !imgError
    if (hasImg) {
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

function PersonCard({ label, person, meta }) {
    if (!person) return null
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide px-1">
                {label}
                {meta && <span className="ml-2 normal-case tracking-normal font-sfpro text-[10px]">— {meta}</span>}
            </span>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                <UserAvatar user={person} size={26} />
                <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">{person.name || "Unknown"}</span>
                    {(person.email || person.role) && (
                        <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">{person.email || person.role}</span>
                    )}
                </div>
            </div>
        </div>
    )
}

function Skeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-2.5">
                <div className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
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
        </div>
    )
}

function DetailContent({ sa }) {
    return (
        <div className="flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">Stock Adjustment</p>
                <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                    {sa.saNumber || <NA />}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <TypeBadge type={sa.adjustmentType} />
                    <StatusBadge status={sa.status} />
                </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <DetailField icon={Tag} label="Material">
                    {sa.materialName
                        ? <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-md text-[12px] font-sfpro-bold text-gray-700 dark:text-gray-300">{sa.materialName}</span>
                        : <NA />}
                </DetailField>
                <DetailField icon={Hash} label="Unit">
                    {sa.unit || <NA />}
                </DetailField>
                <DetailField icon={Hash} label="Quantity">
                    {sa.quantity != null ? `${sa.quantity} ${sa.unit || ""}` : <NA />}
                </DetailField>
                <DetailField icon={Activity} label="Stock Before">
                    {sa.stockBefore != null ? `${sa.stockBefore} ${sa.unit || ""}` : <NA />}
                </DetailField>
                <DetailField icon={Activity} label="Stock After">
                    {sa.stockAfter != null
                        ? <span className="font-sfpro-bold text-gray-900 dark:text-[#f4f4f5]">{sa.stockAfter} {sa.unit || ""}</span>
                        : <NA />}
                </DetailField>
                <DetailField icon={Tag} label="Reason">
                    {sa.reason || <NA />}
                </DetailField>
            </div>

            {sa.remarks && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Remarks</span>
                        </div>
                        <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed whitespace-pre-wrap">{sa.remarks}</p>
                    </div>
                </>
            )}

            {sa.rejectionRemarks && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={2} />
                            <span className="text-[10px] text-red-400 uppercase font-sfpro-bold tracking-wide">Rejection Remarks</span>
                        </div>
                        <div className="px-3.5 py-2.5 bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-200 dark:border-red-500/20">
                            <p className="text-[13px] font-sfpro text-red-700 dark:text-red-400 leading-relaxed">{sa.rejectionRemarks}</p>
                        </div>
                    </div>
                </>
            )}

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Timeline</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <DetailField icon={null} label="Created">{fmt(sa.createdAt) || <NA />}</DetailField>
                    {sa.submittedAt && <DetailField icon={null} label="Submitted">{fmt(sa.submittedAt)}</DetailField>}
                    {sa.approvedAt && <DetailField icon={null} label="Approved">{fmt(sa.approvedAt)}</DetailField>}
                    {sa.rejectedAt && <DetailField icon={null} label="Rejected">{fmt(sa.rejectedAt)}</DetailField>}
                </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">People</span>
                </div>
                <div className="flex gap-3">
                    <PersonCard label="Created By" person={sa.createdBy} />
                    <PersonCard label="Submitted By" person={sa.submittedBy} meta={fmt(sa.submittedAt) || undefined} />
                    <PersonCard label="Approved By" person={sa.approvedBy} meta={fmt(sa.approvedAt) || undefined} />
                    <PersonCard label="Rejected By" person={sa.rejectedBy} meta={fmt(sa.rejectedAt) || undefined} />
                </div>
            </div>
        </div>
    )
}

export default function StockAdjustmentViewModal({ open, adjustmentId, onClose }) {
    const { projectId } = useParams()
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [sa, setSa] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const fetchRef = useRef(null)

    const load = useCallback(async () => {
        if (!adjustmentId || !projectId) return
        setIsLoading(true)
        setError(null)
        fetchRef.current?.abort()
        const controller = new AbortController()
        fetchRef.current = controller
        try {
            const result = await fetchSingleStockAdjustment(projectId, adjustmentId, controller.signal)
            if (!controller.signal.aborted) setSa(result)
        } catch (err) {
            if (err.name === "CanceledError" || err.name === "AbortError") return
            setError(err.message || "Failed to load adjustment details")
        } finally {
            if (!controller.signal.aborted) setIsLoading(false)
        }
    }, [adjustmentId, projectId])

    useEffect(() => {
        if (open && adjustmentId) {
            setMounted(true)
            setSa(null)
            setError(null)
            load()
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setSa(null)
                setError(null)
                fetchRef.current?.abort()
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open, adjustmentId, load])

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [open])

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape" && open) onClose?.() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [open, onClose])

    if (!mounted) return null

    return (
        <>
            <div onClick={onClose} style={{ transitionDuration: "400ms" }}
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />
            <div style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}>
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>
                    <div className="flex flex-col items-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                            Adjustment Details
                        </h2>
                        <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                            View all details of this stock adjustment
                        </p>
                        {isLoading && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-sfpro text-[#a1a1aa] dark:text-[#52525b] mt-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading…
                            </span>
                        )}
                    </div>
                    {error && (
                        <div className="mx-8 lg:mx-auto lg:max-w-2xl xl:max-w-3xl mb-2 px-3.5 py-2 rounded-xl bg-[#fafafa] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#252525] shrink-0">
                            <span className="text-[12px] font-sfpro text-[#71717a]">{error}</span>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto pt-5 lg:px-0" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto">
                            {isLoading && !sa ? <Skeleton /> : sa ? <DetailContent sa={sa} /> : (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#fafafa] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#252525] flex items-center justify-center">
                                        <Activity size={22} className="text-[#a1a1aa] dark:text-[#52525b]" />
                                    </div>
                                    <p className="text-[13px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">Failed to load adjustment details</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e]">
                        <button onClick={onClose}
                            className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}