"use client"

import { useState, useEffect } from "react"
import { Download, ReceiptText, ChevronLeft, ChevronRight } from "lucide-react"

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

function isImageUrl(url) {
    if (!url) return false
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
}

function getFileName(url) {
    if (!url) return "Document"
    try {
        const parts = url.split("/")
        return decodeURIComponent(parts[parts.length - 1]) || "Document"
    } catch {
        return "Document"
    }
}

export default function IssueAttachmentDrawer({ open, onClose, attachments = [], issueTitle }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)

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
            if (e.key === "ArrowRight") setActiveIndex((i) => Math.min(i + 1, attachments.length - 1))
            if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(i - 1, 0))
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose, attachments.length])

    if (!mounted) return null

    const currentUrl = typeof attachments[activeIndex] === "string"
        ? attachments[activeIndex]
        : attachments[activeIndex]?.fileUrl || attachments[activeIndex]?.url || ""

    const currentIsImage = isImageUrl(currentUrl)
    const currentFileName = getFileName(currentUrl)
    const total = attachments.length

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
                                Attachments
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors text-center">
                                {issueTitle && <span>{issueTitle} · </span>}
                                {total > 1 ? `${activeIndex + 1} of ${total}` : currentFileName}
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto px-8 lg:px-10 pb-4"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto flex flex-col items-center gap-4">
                            {currentIsImage ? (
                                <div className="w-full rounded-xl overflow-hidden border border-gray-100 dark:border-[#252525]">
                                    <img
                                        src={currentUrl}
                                        alt={currentFileName}
                                        className="w-full object-contain max-h-[50dvh]"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-12 w-full rounded-xl border border-gray-100 dark:border-[#252525] bg-gray-50 dark:bg-[#18181b]">
                                    <ReceiptText className="w-10 h-10 text-gray-300 dark:text-[#52525b]" />
                                    <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] text-center px-4 break-all">
                                        {currentFileName}
                                    </p>
                                    <a
                                        href={currentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-sfpro-medium text-blue-600 dark:text-blue-400 underline underline-offset-2"
                                    >
                                        Open file
                                    </a>
                                </div>
                            )}

                            {total > 1 && (
                                <div className="w-full flex items-center justify-between gap-3">
                                    <button
                                        onClick={() => setActiveIndex((i) => Math.max(i - 1, 0))}
                                        disabled={activeIndex === 0}
                                        className="cursor-pointer h-9 px-3 rounded-lg text-[13px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-1.5"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Prev
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        {attachments.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveIndex(idx)}
                                                className={`rounded-full transition-all duration-200 ${idx === activeIndex
                                                        ? "w-4 h-2 bg-blue-600 dark:bg-blue-400"
                                                        : "w-2 h-2 bg-gray-300 dark:bg-[#3f3f46] hover:bg-gray-400 dark:hover:bg-[#52525b]"
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setActiveIndex((i) => Math.min(i + 1, total - 1))}
                                        disabled={activeIndex === total - 1}
                                        className="cursor-pointer h-9 px-3 rounded-lg text-[13px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-1.5"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {total > 1 && (
                                <div className="w-full pt-1">
                                    <p className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide mb-2">
                                        All Attachments
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {attachments.map((att, idx) => {
                                            const url = typeof att === "string" ? att : att?.fileUrl || att?.url || ""
                                            const name = typeof att === "string" ? att : att?.fileName || att?.url || ""
                                            const isImg = isImageUrl(url)
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveIndex(idx)}
                                                    className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-sfpro-medium transition-all duration-150 ${idx === activeIndex
                                                            ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                            : "border-gray-200 dark:border-[#27272a] text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a]"
                                                        }`}
                                                >
                                                    <ReceiptText className={`w-3.5 h-3.5 shrink-0 ${isImg ? "hidden" : ""}`} />
                                                    <span className="truncate max-w-32">{name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e] transition-colors">
                        {currentUrl && (
                            <a
                                href={currentUrl}
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