"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
    Calendar,
    User,
    Tag,
    Hash,
    Truck,
    Package,
    ReceiptText,
    ImageIcon,
    FileText,
    Paperclip,
} from "lucide-react"
import { fetchSingleGRN } from "@/app/(companyname)/projects/[projectId]/grn/api.jsx"
import GRNAttachmentDrawer from "./GRNAttachmentDrawer"


function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === "—") return "—"
    const num = Number(amount)
    if (isNaN(num)) return "—"
    return `₹${num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
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

function UserAvatar({ user, size = 28 }) {
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

    const initials =
        user?.name
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"

    return (
        <div style={{ width: size, height: size }} className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0">
            {initials}
        </div>
    )
}

function DetailField({ icon: Icon, label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />}
                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                    {label}
                </span>
            </div>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-words">
                {children || "—"}
            </div>
        </div>
    )
}


function GRNDetailSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-2.5">
                <div className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                <div className="h-4 w-1/2 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg" />
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="h-2.5 w-16 bg-gray-100 dark:bg-[#252525] rounded-md" />
                        <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                    </div>
                ))}
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="h-2.5 w-20 bg-gray-100 dark:bg-[#252525] rounded-md" />
                <div className="h-12 w-48 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div className="flex flex-col gap-3">
                <div className="h-2.5 w-24 bg-gray-100 dark:bg-[#252525] rounded-md" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
                ))}
            </div>
        </div>
    )
}


function GRNDetailContent({ grn, onViewAttachment }) {
    const totalQty =
        grn.items?.reduce((s, i) => s + (i.receivedQuantity ?? 0), 0) ?? 0
    const infoFields = [
        { icon: Hash, label: "GRN Number", value: grn.grnNumber },
        { icon: Hash, label: "PO Number", value: grn.poNumber },
        { icon: User, label: "Vendor", value: grn.vendorName },
        { icon: Calendar, label: "Delivery Date", value: grn.deliveryDateFormatted },
        { icon: Tag, label: "Amount", value: formatCurrency(grn.totalAmount) },
        { icon: Package, label: "Total Recv. Qty", value: totalQty > 0 ? String(totalQty) : "—" },
        {
            icon: ReceiptText,
            label: "Challan No.",
            value: grn.deliveryChallanNumber !== "—" ? grn.deliveryChallanNumber : null,
        },
        {
            icon: Calendar,
            label: "Challan Date",
            value:
                grn.deliveryChallanDateFormatted && grn.deliveryChallanDateFormatted !== "—"
                    ? grn.deliveryChallanDateFormatted
                    : null,
        },
        {
            icon: Truck,
            label: "Vehicle No.",
            value: grn.vehicleNumber !== "—" ? grn.vehicleNumber : null,
        },
        { icon: Calendar, label: "Created At", value: grn.createdAt },
    ]

    return (
        <div className="flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">
                    Goods Receipt Note
                </p>
                <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                    {grn.grnNumber}
                </h3>
                <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                    {grn.vendorName} · PO: {grn.poNumber}
                </p>
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {infoFields.map(({ icon, label, value }) => (
                    <DetailField key={label} icon={icon} label={label}>
                        {value || "—"}
                    </DetailField>
                ))}
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Received By
                    </span>
                </div>
                {grn.createdBy ? (
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                        <UserAvatar user={grn.createdBy} size={26} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                {grn.createdBy.name}
                            </span>
                            {grn.createdBy.role && (
                                <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                    {grn.createdBy.role}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-[13px] text-[#a1a1aa] dark:text-[#71717a]">—</span>
                )}
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={2} />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Materials Received ({grn.items?.length ?? 0})
                    </span>
                </div>
                {grn.items?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {grn.items.map((item, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#252525] bg-[#fafafa] dark:bg-[#18181b]"
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                        {item.materialName || "—"}
                                    </span>
                                    <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                        Ordered: {item.orderedQuantity} {item.unit}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                    <span className="text-[13px] font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                                        {item.receivedQuantity} {item.unit}
                                    </span>
                                    <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">received</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a]">No items</p>
                )}
            </div>

            {grn.attachment && (
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
                                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center shrink-0">
                                    <Paperclip className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                        {grn.attachment.fileName}
                                    </span>
                                    {grn.attachment.fileSize && (
                                        <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                            {(grn.attachment.fileSize / 1024).toFixed(1)} KB
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onViewAttachment(grn.attachment)}
                                className="shrink-0 h-8 px-3 rounded-lg text-[12px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150 flex items-center gap-1.5"
                            >
                                <ImageIcon className="w-3 h-3" />
                                View
                            </button>
                        </div>
                    </div>
                </>
            )}

            {grn.remarks && grn.remarks.trim() && (
                <>
                    <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]" strokeWidth={1.75} />
                            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                                Remarks
                            </span>
                        </div>
                        <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed">
                            {grn.remarks}
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}


export default function GRNDetailsDrawer({ open, onClose, grn, projectId }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [fullGRN, setFullGRN] = useState(null)
    const [loading, setLoading] = useState(false)
    const fetchRef = useRef(null)
    const [attachmentOpen, setAttachmentOpen] = useState(false)
    const [selectedAttachment, setSelectedAttachment] = useState(null)

    useEffect(() => {
        if (open && grn) {
            setMounted(true)
            setFullGRN(null)
            setLoading(true)

            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )

            const controller = new AbortController()
            fetchRef.current = controller

            fetchSingleGRN(projectId, grn.id, controller.signal)
                .then((data) => {
                    if (!controller.signal.aborted) setFullGRN(data)
                })
                .catch((err) => {
                    // Fall back to the row-level data already available
                    if (err.name !== "CanceledError" && err.name !== "AbortError") {
                        setFullGRN(grn)
                    }
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false)
                })
        } else {
            setVisible(false)
            fetchRef.current?.abort()
            const t = setTimeout(() => {
                setMounted(false)
                setFullGRN(null)
                setLoading(false)
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open, grn])

    useEffect(() => {
        return () => fetchRef.current?.abort()
    }, [])

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && open && !attachmentOpen) onClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose, attachmentOpen])

    const handleViewAttachment = (attachment) => {
        setSelectedAttachment(attachment)
        setAttachmentOpen(true)
    }

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} />
            <div style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }} className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`} >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[72dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                GRN Details
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                View all details of this goods receipt note
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pt-5 lg:px-0" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto">
                            {loading ? (
                                <GRNDetailSkeleton />
                            ) : fullGRN ? (
                                <GRNDetailContent grn={fullGRN} onViewAttachment={handleViewAttachment} />
                            ) : null}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e] transition-colors">
                        <button
                            onClick={onClose}
                            className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150"
                        >Close</button>
                    </div>
                </div>
            </div>

            <GRNAttachmentDrawer
                open={attachmentOpen}
                onClose={() => setAttachmentOpen(false)}
                attachment={selectedAttachment}
                grnNumber={fullGRN?.grnNumber || grn?.grnNumber || ""}
            />
        </>
    )
}