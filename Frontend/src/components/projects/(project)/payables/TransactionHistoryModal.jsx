"use client"

import { useEffect, useState } from "react"
import { Receipt } from "lucide-react"
import { formatCurrency, getPaymentModeLabel } from "@/app/(companyname)/projects/[projectId]/payables/api"
import ProofImageViewer from "./ProofImageViewer" // ← adjust path as needed
import { FileImage } from "lucide-react"

function NA() {
    return (
        <span className="italic text-[12px] font-sfpro text-[#a1a1aa] dark:text-[#71717a] opacity-70">
            Not Available
        </span>
    )
}

function Backdrop({ visible, onClose, zIndex = 40 }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "350ms", zIndex }}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        />
    )
}

function TransactionSkeleton() {
    return (
        <div className="space-y-4 px-8 lg:px-10 pb-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#0d0d0d] overflow-hidden"
                >
                    <div className="p-5 animate-pulse space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-[#27272a]" />
                                <div className="space-y-2">
                                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-[#27272a]" />
                                    <div className="h-3 w-20 rounded bg-gray-100 dark:bg-[#1e1e1e]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-5 w-28 rounded bg-gray-200 dark:bg-[#27272a]" />
                                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-[#1e1e1e]" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="h-3 w-20 rounded bg-gray-100 dark:bg-[#1e1e1e]" />
                                    <div className="h-4 w-full rounded bg-gray-200 dark:bg-[#27272a]" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function TransactionHistoryModal({
    open,
    onClose,
    payable,
    loading = false,
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [proofViewer, setProofViewer] = useState({
        open: false,
        url: null,
        txnIndex: null,
    })

    useEffect(() => {
        if (open) {
            setMounted(true)
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )
        } else {
            setVisible(false)
            const timer = setTimeout(() => setMounted(false), 420)
            return () => clearTimeout(timer)
        }
    }, [open])

    useEffect(() => {
        const fn = (e) => {
            if (e.key === "Escape" && open && !proofViewer.open) onClose()
        }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [open, onClose, proofViewer.open])

    if (!mounted) return null

    const transactions = payable?.payments ?? []

    const totalCash    = transactions.reduce((s, t) => s + (t.amount ?? 0), 0)
    const totalAdvance = transactions.reduce((s, t) => s + (t.advanceDeducted ?? 0), 0)

    return (
        <>
            <Backdrop visible={visible} onClose={onClose} zIndex={40} />

            <div
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                    zIndex: 50,
                }}
                className={`fixed bottom-0 left-0 right-0 transition-transform ${
                    visible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">

                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                                    Transaction History
                                </h2>
                                {!loading && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide border bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:border-[#3f3f46]">
                                        {transactions.length} Transaction{transactions.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 text-center">
                                {payable?.payableNumber ?? "—"} · {payable?.vendorName || "No Vendor"}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pt-5" style={{ scrollbarWidth: "none" }}>
                        <div className="w-full lg:max-w-5xl xl:max-w-6xl lg:mx-auto">

                            {loading ? (
                                <TransactionSkeleton />
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <Receipt className="w-10 h-10 text-gray-300 dark:text-[#3f3f46] mb-3" />
                                    <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a]">
                                        No transactions found
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-5 px-8 lg:px-10 pb-8">

                                    {transactions.map((txn, idx) => {
                                        const total = (txn.amount ?? 0) + (txn.advanceDeducted ?? 0)
                                        const hasProof = !!txn.proofImage

                                        return (
                                            <div
                                                key={txn.id ?? idx}
                                                className="rounded-2xl border border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#0d0d0d] overflow-hidden"
                                            >
                                                <div className="p-4 sm:p-5">

                                                    <div className="flex items-start justify-between gap-4 mb-5">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center shrink-0">
                                                                <Receipt className="w-4 h-4 text-gray-500 dark:text-[#71717a]" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-sfpro-bold text-[#212121] dark:text-white">
                                                                    Transaction #{idx + 1}
                                                                </p>
                                                                <p className="text-[12px] text-gray-500 dark:text-[#71717a] mt-0.5">
                                                                    {txn.paymentDate || "No Date"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-3 shrink-0">
                                                            {hasProof && (
                                                                <button
                                                                    onClick={() =>
                                                                        setProofViewer({
                                                                            open: true,
                                                                            url: txn.proofImage,
                                                                            txnIndex: idx + 1,
                                                                        })
                                                                    }
                                                                    className="cursor-pointer h-8 px-3 rounded-lg text-[12px] font-sfpro-medium border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1.5"
                                                                >
                                                                    <FileImage className="w-3.5 h-3.5" />
                                                                    View Proof
                                                                </button>
                                                            )}
                                                            <div className="text-right">
                                                                <p className="text-[18px] font-sfpro-bold text-[#212121] dark:text-white">
                                                                    {formatCurrency(total)}
                                                                </p>
                                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold">
                                                                    Total Settled
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                                Cash Amount
                                                            </p>
                                                            <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                                                                {txn.amount > 0 ? formatCurrency(txn.amount) : <NA />}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                                Advance Used
                                                            </p>
                                                            <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                                                                {txn.advanceDeducted > 0 ? formatCurrency(txn.advanceDeducted) : <NA />}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                                Payment Mode
                                                            </p>
                                                            <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                                                                {txn.paymentModeLabel || getPaymentModeLabel(txn.paymentMode)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                                Reference
                                                            </p>
                                                            <p className="text-[12px] font-mono text-gray-700 dark:text-[#d4d4d8] break-all">
                                                                {txn.referenceNumber || <NA />}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {txn.notes && (
                                                        <>
                                                            <div className="h-px bg-gray-100 dark:bg-[#252525] my-4" />
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                                    Notes
                                                                </p>
                                                                <p className="text-[13px] leading-relaxed text-gray-700 dark:text-[#d4d4d8]">
                                                                    {txn.notes}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    <div className="rounded-2xl border border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#0d0d0d] p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                    Cash Total
                                                </p>
                                                <p className="text-[20px] font-sfpro-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(totalCash)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                    Advance Total
                                                </p>
                                                <p className="text-[20px] font-sfpro-bold text-gray-700 dark:text-[#d4d4d8]">
                                                    {formatCurrency(totalAdvance)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#52525b] font-sfpro-bold mb-1">
                                                    Grand Total
                                                </p>
                                                <p className="text-[22px] font-sfpro-bold text-[#212121] dark:text-white">
                                                    {formatCurrency(totalCash + totalAdvance)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1e1e1e]">
                        <button
                            onClick={onClose}
                            className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
            <ProofImageViewer
                open={proofViewer.open}
                onClose={() => setProofViewer((p) => ({ ...p, open: false }))}
                imageUrl={proofViewer.url}
                title="Payment Proof"
                subtitle={`Transaction #${proofViewer.txnIndex}`}
            />
        </>
    )
}