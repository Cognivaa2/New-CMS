"use client"

import { useState } from "react"
import { AlertTriangle, Ban, Loader2 } from "lucide-react"

export default function CancelModal({ isOpen, onClose, onConfirm, wo, isLoading }) {
    const [remarks, setRemarks] = useState("")

    if (!isOpen || !wo) return null

    const handleConfirm = async () => {
        await onConfirm(wo, remarks.trim())
    }

    const handleClose = () => {
        if (isLoading) return
        setRemarks("")
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-[#e4e4e7] dark:border-[#27272a] overflow-hidden">

                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5  text-[#f03e3e] dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[15px] font-sfpro-bold text-[#09090b] dark:text-[#fafafa]">
                            Cancel Work Order
                        </h2>
                        <p className="text-[13px] text-[#71717a] dark:text-[#52525b] mt-0.5 font-sfpro">
                            You are about to cancel{" "}
                            <span className="font-sfpro-bold text-[#3f3f46] dark:text-[#d4d4d8]">
                                {wo.woNumber}
                            </span>
                            . This action cannot be undone.
                        </p>
                    </div>
                </div>

                <div className="px-6 pb-4">
                    <label className="block text-[11px] font-sfpro-bold uppercase tracking-wide text-[#a1a1aa] dark:text-[#71717a] mb-2">
                        Cancellation Remarks{" "}
                        <span className="normal-case font-sfpro text-[#a1a1aa]">(optional)</span>
                    </label>
                    <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter reason for cancellation…"
                        rows={3}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#09090b] px-3.5 py-2.5 text-[13px] font-sfpro text-[#09090b] dark:text-[#fafafa] placeholder:text-[#a1a1aa] dark:placeholder:text-[#52525b] focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 dark:focus:border-red-500 resize-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#f0f0f0] dark:border-[#27272a]">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl text-[13px] font-sfpro-medium text-[#3f3f46] dark:text-[#a1a1aa] bg-[#f4f4f5] dark:bg-[#27272a] hover:bg-[#e4e4e7] dark:hover:bg-[#3f3f46] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Keep WO
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-sfpro-bold text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Cancelling…
                            </>
                        ) : (
                            <>
                                <Ban className="w-3.5 h-3.5" />
                                Cancel WO
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}