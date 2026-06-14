"use client"

import { useState, useEffect } from "react"
import { ReceiptText, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

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

function AttachmentPreview({ attachment }) {
    const isImage =
        attachment?.fileType?.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment?.fileName || "")

    const isPDF =
        attachment?.fileType === "application/pdf" ||
        /\.pdf$/i.test(attachment?.fileName || "")

    if (isImage) {
        return (
            <div className="w-full rounded-xl overflow-hidden border border-gray-100 dark:border-[#252525]">
                <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="w-full object-contain max-h-[50dvh]"
                />
            </div>
        )
    }

    if (isPDF) {
        return (
            <iframe
                src={attachment.fileUrl}
                className="w-full h-[50dvh] rounded-xl border border-gray-100 dark:border-[#252525]"
                title={attachment.fileName}
            />
        )
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 w-full rounded-xl border border-gray-100 dark:border-[#252525] bg-gray-50 dark:bg-[#18181b]">
            <ReceiptText className="w-10 h-10 text-gray-300 dark:text-[#52525b]" />
            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a]">
                {attachment?.fileName || "Not provided"}
            </p>
            <a
                href={attachment?.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] underline underline-offset-2"
            >
                Open file
            </a>
        </div>
    )
}

function AttachmentMeta({ attachment }) {
    return (
        <div className="w-full grid grid-cols-3 gap-3 pt-2">
            {attachment?.fileName && (
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Name
                    </span>
                    <span className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium truncate">
                        {attachment.fileName}
                    </span>
                </div>
            )}
            {attachment?.fileSize && (
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Size
                    </span>
                    <span className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">
                        {attachment.fileSize >= 1024 * 1024
                            ? `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`
                            : `${(attachment.fileSize / 1024).toFixed(1)} KB`}
                    </span>
                </div>
            )}
            {attachment?.fileType && (
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                        Type
                    </span>
                    <span className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">
                        {attachment.fileType}
                    </span>
                </div>
            )}
        </div>
    )
}

function ThumbnailStrip({ attachments, activeIndex, onSelect }) {
    if (attachments.length <= 1) return null

    return (
        <div className="flex items-center gap-2 pt-3 pb-1 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
            {attachments.map((att, i) => {
                const isImage =
                    att?.fileType?.startsWith("image/") ||
                    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att?.fileName || "")
                const isActive = i === activeIndex

                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onSelect(i)}
                        className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-150 ${isActive
                                ? "border-[#212121] dark:border-white"
                                : "border-gray-200 dark:border-[#333] hover:border-gray-400 dark:hover:border-[#52525b]"
                            }`}
                    >
                        {isImage ? (
                            <img
                                src={att.fileUrl}
                                alt={att.fileName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center">
                                <ReceiptText className="w-5 h-5 text-gray-300 dark:text-[#52525b]" />
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

export default function SafetyAttachmentDrawer({
    open,
    onClose,
    attachment,
    attachments: attachmentsProp,
    inspectionNumber,
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)

    const attachments = (() => {
        if (attachmentsProp && Array.isArray(attachmentsProp) && attachmentsProp.length > 0) {
            return attachmentsProp.filter(Boolean)
        }
        if (attachment) return [attachment]
        return []
    })()

    const currentAttachment = attachments[activeIndex] || null
    const hasMultiple = attachments.length > 1

    useEffect(() => {
        if (open) {
            setMounted(true)
            setActiveIndex(0)
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )
        } else {
            setVisible(false)
            const t = setTimeout(() => setMounted(false), 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        const onKey = (e) => {
            if (!open) return
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowLeft" && activeIndex > 0) {
                setActiveIndex((i) => i - 1)
            }
            if (e.key === "ArrowRight" && activeIndex < attachments.length - 1) {
                setActiveIndex((i) => i + 1)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose, activeIndex, attachments.length])

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
                                {hasMultiple ? "Attachments" : "Attachment"}
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                {inspectionNumber}
                                {hasMultiple && (
                                    <span> · {activeIndex + 1} of {attachments.length}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto px-8 lg:px-10 pb-4"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto flex flex-col items-center gap-4">
                            {currentAttachment ? (
                                <>
                                    {hasMultiple && (
                                        <div className="w-full flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                                                disabled={activeIndex === 0}
                                                className="h-8 w-8 rounded-lg border border-gray-200 dark:border-[#333] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-[#a1a1aa]" />
                                            </button>
                                            <span className="text-[12px] font-sfpro-medium text-gray-400 dark:text-[#52525b]">
                                                {activeIndex + 1} / {attachments.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setActiveIndex((i) => Math.min(attachments.length - 1, i + 1))}
                                                disabled={activeIndex === attachments.length - 1}
                                                className="h-8 w-8 rounded-lg border border-gray-200 dark:border-[#333] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-[#a1a1aa]" />
                                            </button>
                                        </div>
                                    )}

                                    <AttachmentPreview attachment={currentAttachment} />

                                    <ThumbnailStrip
                                        attachments={attachments}
                                        activeIndex={activeIndex}
                                        onSelect={setActiveIndex}
                                    />

                                    {/* Meta info */}
                                    <AttachmentMeta attachment={currentAttachment} />
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-12">
                                    <ImageIcon className="w-10 h-10 text-gray-300 dark:text-[#52525b]" />
                                    <p className="text-sm font-sfpro text-gray-400 dark:text-[#71717a]">
                                        No attachments available
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
        </>
    )
}