"use client"

import { useState, useEffect } from "react"
import { XCircle } from "lucide-react"

export default function RejectModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Rejection",
    description = "Please provide a reason for rejection. This action cannot be undone.",
    itemName = "",
    confirmText = "Reject",
    remarkLabel = "Rejection Reason",
    remarkPlaceholder = "Explain why this is being rejected...",
    maxLength = 500,
    isLoading = false,
}) {
    const [remark, setRemark] = useState("")
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            setRemark("")
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const timer = setTimeout(() => {
                setMounted(false)
                setRemark("")
            }, 150)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen && !isLoading) onClose()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, onClose, isLoading])

    const handleSubmit = () => {
        if (!remark.trim() || isLoading) return
        onConfirm(remark.trim())
    }

    if (!mounted) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
                onClick={!isLoading ? onClose : undefined}
            />

            <div className={`relative w-full max-w-120 bg-white dark:bg-[#161616] rounded-3xl shadow-2xl p-6 transform transition-all duration-150 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
                <div className="flex items-start gap-4">
                    <div className="shrink-0 text-[#f03e3e] dark:text-red-400 mt-0.5">
                        <XCircle className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[16px] font-sfpro-bold text-gray-900 dark:text-white leading-tight">
                            {itemName ? `${title} : ${itemName}` : title}
                        </h3>
                        <p className="mt-1.5 text-xs text-gray-700 dark:text-[#b6b6b6]">
                            {itemName
                                ? `"${itemName}" will be rejected. This cannot be undone.`
                                : description}
                        </p>
                    </div>
                </div>

                <div className="mt-4 lg:mt-8">
                    <label className="text-[13px] font-sfpro-bold text-gray-700 dark:text-[#d4d4d8] mb-2 block">
                        {remarkLabel} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={remark}
                        onChange={(e) =>
                            setRemark(e.target.value.length <= maxLength ? e.target.value : e.target.value.slice(0, maxLength))
                        }
                        placeholder={remarkPlaceholder}
                        rows={3}
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-2xl border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#1a1a1a] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] font-sfpro focus:outline-none  border-2 dark:focus:border-white/20 transition-all resize-none disabled:opacity-50"
                        autoFocus
                    />
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="cursor-pointer px-4 py-2.5 text-sm font-sfpro-bold rounded-lg text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!remark.trim() || isLoading}
                        className="cursor-pointer px-5 py-2.5 text-sm font-sfpro-bold rounded-lg bg-[#f03e3e] text-white hover:bg-[#e03131] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                {confirmText}ing…
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}