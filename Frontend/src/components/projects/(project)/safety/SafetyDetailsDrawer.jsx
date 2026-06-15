"use client"

import { useState, useEffect, useRef } from "react"
import {
    Calendar,
    User,
    Hash,
    ShieldCheck,
    AlertTriangle,
    MapPin,
    Package,
    FileText,
    Paperclip,
    ImageIcon,
    CheckCircle2,
} from "lucide-react"
import { fetchSingleInspection } from "@/app/(companyname)/projects/[projectId]/safety/api"
import SafetyAttachmentDrawer from "./SafetyAttachmentDrawer"

const STATUS_STYLES = {
    Pass: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    Fail: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    Observation:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
}

const SEVERITY_STYLES = {
    High: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    Medium:
        "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    Low: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
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
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
        >
            {initials}
        </div>
    )
}

function DetailField({ icon: Icon, label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                {Icon && (
                    <Icon
                        className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]"
                        strokeWidth={2}
                    />
                )}
                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                    {label}
                </span>
            </div>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-words">
                {children || "Not provided"}
            </div>
        </div>
    )
}

function DetailSkeleton() {
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
            {Array.from({ length: 3 }).map((_, i) => (
                <div
                    key={i}
                    className="h-24 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-xl"
                />
            ))}
        </div>
    )
}

function ResolveButton({ entry, inspectionId, onResolve }) {
    const [showInput, setShowInput] = useState(false)
    const [note, setNote] = useState("")
    const [resolving, setResolving] = useState(false)

    if (entry.status === "Pass" || entry.isResolved) return null

    const handleResolve = async () => {
        setResolving(true)
        try {
            await onResolve(inspectionId, entry.id, note.trim())
            setShowInput(false)
            setNote("")
        } catch {
        } finally {
            setResolving(false)
        }
    }

    if (!showInput) {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setShowInput(true)
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sfpro-medium border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
            >
                <CheckCircle2 className="w-3 h-3" />
                Resolve
            </button>
        )
    }

    return (
        <div
            className="flex flex-col gap-2 mt-2"
            onClick={(e) => e.stopPropagation()}
        >
            <input
                type="text"
                placeholder="Resolution note (optional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-7 px-2 rounded-md text-[11px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-300 dark:focus:ring-green-500/40"
            />
            <div className="flex gap-1.5">
                <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="px-2.5 py-1 rounded-md text-[11px] font-sfpro-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                    {resolving ? "Resolving…" : "Confirm"}
                </button>
                <button
                    onClick={() => {
                        setShowInput(false)
                        setNote("")
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-sfpro-medium border border-gray-200 dark:border-[#333] text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}

function DetailContent({
    inspection,
    onViewAttachment,
    onResolveEntry,
}) {
    const infoFields = [
        {
            icon: Hash,
            label: "Inspection Number",
            value: inspection.inspectionNumber,
        },
        {
            icon: ShieldCheck,
            label: "Overall Status",
            value: inspection.overallStatus ? (
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sfpro-bold uppercase border ${STATUS_STYLES[inspection.overallStatus] || ""}`}
                >
                    {inspection.overallStatus}
                </span>
            ) : null,
        },
        {
            icon: Package,
            label: "Total Entries",
            value: String(inspection.entryCount || 0),
        },
        {
            icon: AlertTriangle,
            label: "Unresolved",
            value:
                inspection.unresolvedCount > 0
                    ? String(inspection.unresolvedCount)
                    : "None",
        },
        {
            icon: Calendar,
            label: "Created At",
            value: inspection.createdAtFormatted,
        },
        {
            icon: Calendar,
            label: "Updated At",
            value: inspection.updatedAtFormatted,
        },
    ]

    return (
        <div className="flex flex-col gap-6 px-8 lg:px-10 pt-2 pb-6">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">
                    Safety Inspection
                </p>
                <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                    {inspection.inspectionNumber || "Not provided"}
                </h3>
                <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                    {inspection.entryCount} entr
                    {inspection.entryCount !== 1 ? "ies" : "y"}
                </p>
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {infoFields.map(({ icon, label, value }) => (
                    <DetailField key={label} icon={icon} label={label}>
                        {value || "Not provided"}
                    </DetailField>
                ))}
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                    <User
                        className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]"
                        strokeWidth={2}
                    />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Created By
                    </span>
                </div>
                {inspection.createdBy ? (
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#e4e4e7] dark:border-[#252525] w-fit">
                        <UserAvatar user={inspection.createdBy} size={26} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                                {inspection.createdBy.name}
                            </span>
                            {inspection.createdBy.role && (
                                <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                    {inspection.createdBy.role}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-[13px] text-[#a1a1aa] dark:text-[#71717a]">
                        Not provided
                    </span>
                )}
            </div>

            <div className="h-px bg-gray-100 dark:bg-[#252525]" />

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck
                        className="w-3.5 h-3.5 text-[#a1a1aa] dark:text-[#71717a]"
                        strokeWidth={2}
                    />
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Inspection Entries ({inspection.entries?.length ?? 0})
                    </span>
                </div>
                {inspection.entries?.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {inspection.entries.map((entry, i) => (
                            <div
                                key={entry.id || i}
                                className="rounded-xl border border-[#e4e4e7] dark:border-[#252525] bg-[#fafafa] dark:bg-[#18181b] p-4 flex flex-col gap-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-sfpro-bold text-[#3f3f46] dark:text-[#d4d4d8]">
                                            {entry.title || "Not provided"}
                                        </span>
                                        <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                            {entry.category || "Not provided"} ·{" "}
                                            {entry.location || "Not provided"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sfpro-bold uppercase border ${STATUS_STYLES[entry.status] || "bg-gray-50 text-gray-500 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]"}`}
                                        >
                                            {entry.status || "Not provided"}
                                        </span>
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sfpro-bold ${SEVERITY_STYLES[entry.severity] || "bg-gray-50 text-gray-500 dark:bg-[#27272a] dark:text-[#a1a1aa]"}`}
                                        >
                                            {entry.severity || "Not provided"}
                                        </span>
                                    </div>
                                </div>

                                {entry.description && (
                                    <p className="text-[12px] font-sfpro text-[#71717a] dark:text-[#a1a1aa] leading-relaxed">
                                        {entry.description}
                                    </p>
                                )}

                                {entry.remarks && (
                                    <p className="text-[11px] font-sfpro italic text-[#a1a1aa] dark:text-[#71717a]">
                                        Remarks: {entry.remarks}
                                    </p>
                                )}

                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#f0f0f0] dark:border-[#252525]">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {entry.inspectedBy ? (
                                            <>
                                                <UserAvatar user={entry.inspectedBy} size={22} />
                                                <span className="text-[11px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                                                    {entry.inspectedBy.name}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a]">
                                                Not provided
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {entry.isResolved && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 cursor-pointer rounded-full text-[10px] font-sfpro-bold bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Resolved
                                            </span>
                                        )}
                                        {entry.attachment && (
                                            <button
                                                onClick={() => onViewAttachment(entry.attachment)}
                                                className="flex items-center gap-1 px-2 py-0.5 cursor-pointer rounded-lg text-[10px] font-sfpro-medium border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                            >
                                                <ImageIcon className="w-3 h-3" />
                                                View
                                            </button>
                                        )}
                                        <ResolveButton
                                            entry={entry}
                                            inspectionId={inspection.id}
                                            onResolve={onResolveEntry}
                                        />
                                    </div>
                                </div>

                                {entry.isResolved && (
                                    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-green-50/50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10">
                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-sfpro-bold uppercase">
                                            Resolution
                                        </span>
                                        <span className="text-[12px] font-sfpro text-[#3f3f46] dark:text-[#d4d4d8]">
                                            {entry.resolutionNote || "No notes provided"}
                                        </span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {entry.resolvedBy && (
                                                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a]">
                                                    by {entry.resolvedBy.name}
                                                </span>
                                            )}
                                            {entry.resolvedAtFormatted && (
                                                <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a]">
                                                    · {entry.resolvedAtFormatted}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
                        No entries
                    </p>
                )}
            </div>
        </div>
    )
}

export default function SafetyDetailsDrawer({
    open,
    onClose,
    inspection,
    projectId,
    onResolveEntry,
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [fullInspection, setFullInspection] = useState(null)
    const [loading, setLoading] = useState(false)
    const fetchRef = useRef(null)
    const [attachmentOpen, setAttachmentOpen] = useState(false)
    const [selectedAttachment, setSelectedAttachment] = useState(null)

    useEffect(() => {
        if (open && inspection) {
            setMounted(true)
            setFullInspection(null)
            setLoading(true)

            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )

            const controller = new AbortController()
            fetchRef.current = controller

            fetchSingleInspection(projectId, inspection.id, controller.signal)
                .then((data) => {
                    if (!controller.signal.aborted) setFullInspection(data)
                })
                .catch((err) => {
                    if (err.name !== "CanceledError" && err.name !== "AbortError") {
                        setFullInspection(inspection)
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
                setFullInspection(null)
                setLoading(false)
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open, inspection])

    useEffect(() => {
        return () => fetchRef.current?.abort()
    }, [])

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && open && !attachmentOpen) onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose, attachmentOpen])

    const handleViewAttachment = (attachment) => {
        const allAttachments = (fullInspection?.entries || [])
            .map((e) => e.attachment)
            .filter(Boolean)

        setSelectedAttachment(allAttachments.length > 0 ? allAttachments : [attachment])
        setAttachmentOpen(true)
    }

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
                                Inspection Details
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                View all details of this safety inspection
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto pt-5 lg:px-0"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto">
                            {loading ? (
                                <DetailSkeleton />
                            ) : fullInspection ? (
                                <DetailContent
                                    inspection={fullInspection}
                                    onViewAttachment={handleViewAttachment}
                                    onResolveEntry={onResolveEntry}
                                />
                            ) : null}
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

            <SafetyAttachmentDrawer
                open={attachmentOpen}
                onClose={() => setAttachmentOpen(false)}
                attachments={
                    Array.isArray(selectedAttachment)
                        ? selectedAttachment
                        : selectedAttachment
                            ? [selectedAttachment]
                            : []
                }
                inspectionNumber={
                    fullInspection?.inspectionNumber ||
                    inspection?.inspectionNumber ||
                    ""
                }
            />
        </>
    )
}