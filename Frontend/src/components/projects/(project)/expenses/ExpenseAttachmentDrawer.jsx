// components/projects/(project)/expenses/ExpenseAttachmentDrawer.jsx
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

function getFileName(url, fallback = "Document") {
    if (!url) return fallback
    try {
        const parts = url.split("/")
        return decodeURIComponent(parts[parts.length - 1]) || fallback
    } catch {
        return fallback
    }
}

export default function ExpenseAttachmentDrawer({
    open,
    onClose,
    attachmentUrl = null,
    attachmentName = null,
    expenseNumber = "",
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
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
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose])

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : ""
        return () => {
            document.body.style.overflow = ""
        }
    }, [open])

    if (!mounted) return null

    const currentUrl = attachmentUrl || ""
    const currentIsImage = isImageUrl(currentUrl)
    const currentFileName = attachmentName || getFileName(currentUrl)

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
                    {/* Handle */}
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Attachment
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors text-center">
                                {expenseNumber && <span>{expenseNumber} · </span>}
                                {currentFileName}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        className="flex-1 overflow-y-auto px-8 lg:px-10 pb-4"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="w-full lg:max-w-2xl xl:max-w-3xl lg:mx-auto flex flex-col items-center gap-4">
                            {!currentUrl ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 w-full rounded-xl border border-gray-100 dark:border-[#252525] bg-gray-50 dark:bg-[#18181b]">
                                    <ReceiptText className="w-10 h-10 text-gray-300 dark:text-[#52525b]" />
                                    <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a]">
                                        No attachment available
                                    </p>
                                </div>
                            ) : currentIsImage ? (
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