"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  CheckCircle2, Clock, AlertCircle, RotateCcw,
  FileText, Package, User, Calendar, IndianRupee,
  ArrowDownCircle, Receipt, Hash, Building2,
  Wallet, TrendingDown, History, Loader2, AlertTriangle,
} from "lucide-react"
import {
  fetchSinglePayable, formatCurrency, formatDate, formatDateTime,
  getSourceLabel, getPaymentModeLabel,
} from "@/app/(companyname)/projects/[projectId]/payables/api"

// ─── Not-available placeholder ────────────────────────────────────────────────
function NA() {
  return (
    <span className="italic text-[12px] font-sfpro text-[#a1a1aa] dark:text-[#71717a] opacity-70">
      Not Available
    </span>
  )
}

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Unpaid: {
    label: "Unpaid",
    icon: Clock,
    className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  PartiallyPaid: {
    label: "Partially Paid",
    icon: AlertCircle,
    className: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  Paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  },
  Reversed: {
    label: "Reversed",
    icon: RotateCcw,
    className: "text-gray-500 bg-gray-100 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]",
  },
}

function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Unpaid
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide border ${config.className}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {config.label}
    </span>
  )
}

// ─── Backdrop ─────────────────────────────────────────────────────────────────
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

// ─── Amount summary bar ───────────────────────────────────────────────────────
function AmountSummary({ payable }) {
  const settled = (payable.paidAmount || 0) + (payable.advanceDeducted || 0)
  const pct = payable.totalAmount > 0
    ? Math.min((settled / payable.totalAmount) * 100, 100)
    : 0

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#0d0d0d] p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Total Amount", value: payable.totalAmount, color: "text-gray-900 dark:text-white" },
          { label: "Paid (Cash)", value: payable.paidAmount, color: "text-green-600 dark:text-green-400" },
          { label: "Advance Used", value: payable.advanceDeducted, color: "text-gray-700 dark:text-[#d4d4d8]" },
          {
            label: "Outstanding", value: payable.dueAmount,
            color: payable.dueAmount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-[#52525b]"
          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide mb-1">
              {label}
            </p>
            <p className={`text-[18px] font-sfpro-bold ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-[#27272a] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#212121] dark:bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[12px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0">
          {Math.round(pct)}% Settled
        </span>
      </div>
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-[#71717a]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] wrap-break-words">
          {value}
        </p>
      </div>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <p className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-widest mb-3">
      {title}
    </p>
  )
}

// ─── Payments table ───────────────────────────────────────────────────────────
function PaymentsTable({ payments }) {
  if (!payments?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#27272a] p-8 text-center">
        <Receipt className="w-8 h-8 text-gray-300 dark:text-[#3f3f46] mx-auto mb-2" />
        <p className="text-[13px] font-sfpro-medium text-gray-400 dark:text-[#71717a]">
          No payment transactions yet
        </p>
      </div>
    )
  }

  const totalCash = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalAdvance = payments.reduce((s, p) => s + (p.advanceDeducted || 0), 0)
  const grandTotal = totalCash + totalAdvance

  return (
    <div className="rounded-xl border border-gray-100 dark:border-[#27272a] overflow-hidden">
      <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
        <table className="w-full min-w-175 border-collapse text-[12px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#18181b] border-b border-gray-100 dark:border-[#27272a]">
              {["#", "Date", "Mode", "Reference", "Amount", "Advance", "Total", "Recorded By"].map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-2.5 text-[10px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide whitespace-nowrap ${i === 0 ? "text-center w-8" : i >= 4 && i <= 6 ? "text-right" : "text-left"
                    }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#0d0d0d]">
            {payments.map((txn, idx) => {
              const total = (txn.amount || 0) + (txn.advanceDeducted || 0)
              return (
                <tr
                  key={txn.id || idx}
                  className={`${idx < payments.length - 1 ? "border-b border-gray-50 dark:border-[#1a1a1a]" : ""} hover:bg-gray-50/50 dark:hover:bg-[#111] transition-colors`}
                >
                  <td className="px-3 py-3 text-center">
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-[#27272a] text-[10px] font-sfpro-bold text-gray-500 dark:text-[#71717a] flex items-center justify-center mx-auto">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] whitespace-nowrap">
                    {txn.paymentDate || <NA />}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sfpro-bold bg-gray-100 text-gray-700 dark:bg-[#1f1f1f] dark:text-[#d4d4d8] whitespace-nowrap">
                      {getPaymentModeLabel(txn.paymentMode)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-[#71717a]">
                    {txn.referenceNumber
                      ? <span className="font-mono text-[11px]">{txn.referenceNumber}</span>
                      : <NA />}
                  </td>
                  <td className="px-3 py-3 text-right font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    {txn.amount > 0 ? formatCurrency(txn.amount) : <NA />}
                  </td>
                  <td className="px-3 py-3 text-right font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
                    {txn.advanceDeducted > 0 ? formatCurrency(txn.advanceDeducted) : <NA />}
                  </td>
                  <td className="px-3 py-3 text-right font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                    {formatCurrency(total)}
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-[#71717a] whitespace-nowrap">
                    {txn.recordedBy || <NA />}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-100 dark:border-[#27272a] bg-gray-50 dark:bg-[#18181b]">
              <td colSpan={4} className="px-3 py-3 text-right text-[11px] font-sfpro-bold text-gray-500 dark:text-[#71717a] uppercase tracking-wide">
                Totals
              </td>
              <td className="px-3 py-3 text-right text-[13px] font-sfpro-bold text-green-700 dark:text-green-400">
                {formatCurrency(totalCash)}
              </td>
              <td className="px-3 py-3 text-right text-[13px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa]">
                {formatCurrency(totalAdvance)}
              </td>
              <td className="px-3 py-3 text-right text-[14px] font-sfpro-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Payment notes ────────────────────────────────────────────────────────────
function PaymentNotes({ payments }) {
  const withNotes = payments?.filter((p) => p.notes?.trim()) || []
  if (!withNotes.length) return null
  return (
    <div className="rounded-xl border border-gray-100 dark:border-[#27272a] p-4 space-y-3">
      {withNotes.map((p, idx) => (
        <div
          key={p.id || idx}
          className={`flex items-start gap-3 ${idx < withNotes.length - 1 ? "pb-3 border-b border-gray-50 dark:border-[#1a1a1a]" : ""}`}
        >
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#27272a] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-sfpro-bold text-gray-500 dark:text-[#71717a]">#{idx + 1}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-sfpro-bold text-gray-500 dark:text-[#71717a] mb-0.5">
              {p.paymentDate} · {getPaymentModeLabel(p.paymentMode)}
            </p>
            <p className="text-[13px] text-gray-700 dark:text-[#d4d4d8] font-sfpro-medium">{p.notes}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-5 px-8 lg:px-10 pb-10">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]" />
      ))}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ViewPayableModal({ open, onClose, payable: initialPayable, projectId }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [payable, setPayable] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchRef = useRef(null)
  const isMountedRef = useRef(true)


  const loadFullPayable = useCallback(async () => {
    if (!initialPayable?.id || !projectId) return
    setIsLoading(true)
    setError(null)
    fetchRef.current?.abort()
    const controller = new AbortController()
    fetchRef.current = controller
    try {
      const full = await fetchSinglePayable(projectId, initialPayable.id, controller.signal)
      if (!controller.signal.aborted && isMountedRef.current) {
        setPayable(full)
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      setError(err.message || "Failed to load payable details")
      // Fall back to list-level data so UI isn't empty
      setPayable(initialPayable)
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [initialPayable, projectId])

  useEffect(() => {
    if (open && initialPayable) {
      setMounted(true)
      setPayable(initialPayable)   // show skeleton data immediately
      setError(null)
      loadFullPayable()
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setPayable(null)
        setError(null)
        fetchRef.current?.abort()
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open, initialPayable, loadFullPayable])

  useEffect(() => {
    isMountedRef.current = true
    const fn = (e) => {
      if (e.key === "Escape" && open) {
        onClose()
      }
    }
    window.addEventListener("keydown", fn)
    return () => {
      isMountedRef.current = false
      window.removeEventListener("keydown", fn)
    }
  }, [open, onClose])

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
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">

          {/* Handle */}
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-center px-8 lg:px-10 pt-5 pb-4 shrink-0">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <h2 className="text-lg lg:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                  Payable Details
                </h2>
                {!isLoading && payable?.status && <StatusPill status={payable.status} />}
              </div>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 text-center">
                View payable information, payment history and activity
              </p>
              {isLoading && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-sfpro text-[#a1a1aa] dark:text-[#52525b] mt-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading details…
                </span>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 mx-8 lg:mx-auto lg:max-w-5xl mb-2 px-3.5 py-2 rounded-xl bg-[#fafafa] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#252525] shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
              <span className="text-[12px] font-sfpro text-[#71717a]">{error}</span>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto pt-5 lg:px-0" style={{ scrollbarWidth: "none" }}>
            <div className="w-full lg:max-w-5xl xl:max-w-6xl lg:mx-auto">
              {isLoading && !payable ? (
                <Skeleton />
              ) : !payable ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm text-gray-400 font-sfpro">No payable data available</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 px-8 lg:px-10 pb-8">

                  {/* Title block */}
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] font-sfpro-bold uppercase tracking-wide">Payable</p>
                    <h3 className="text-[15px] sm:text-base font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] leading-snug">
                      {payable.payableNumber || <NA />}
                    </h3>
                    <p className="text-[13px] text-[#71717a] dark:text-[#a1a1aa] font-sfpro">
                      {payable.vendorName || "No vendor"} · {getSourceLabel(payable.sourceType)} · {payable.sourceRef || "—"}
                    </p>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-[#252525]" />

                  <AmountSummary payable={payable} />

                  <div className="h-px bg-gray-100 dark:bg-[#252525]" />

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <InfoRow icon={Hash} label="Payable Number" value={payable.payableNumber} />
                    <InfoRow icon={FileText} label="Source Type" value={getSourceLabel(payable.sourceType)} />
                    <InfoRow icon={Package} label="Source Reference" value={payable.sourceRef} />
                    {payable.poRef && <InfoRow icon={FileText} label="Linked PO" value={payable.poRef} />}
                    <InfoRow icon={Building2} label="Vendor" value={payable.vendorName || undefined} />
                    <InfoRow icon={Calendar} label="Due Date" value={payable.dueDateFormatted} />
                    <InfoRow icon={Wallet} label="Total Amount" value={formatCurrency(payable.totalAmount)} />
                    <InfoRow icon={CheckCircle2} label="Paid (Cash)" value={formatCurrency(payable.paidAmount)} />
                    <InfoRow icon={ArrowDownCircle} label="Advance Deducted" value={formatCurrency(payable.advanceDeducted)} />
                    <InfoRow icon={TrendingDown} label="Outstanding Due" value={formatCurrency(payable.dueAmount)} />
                    <InfoRow icon={User} label="Created By" value={typeof payable.createdBy === "object" ? payable.createdBy?.name : payable.createdBy} />
                    <InfoRow icon={Calendar} label="Created At" value={payable.createdAt} />
                  </div>

                  {/* Notes */}
                  {payable.notes && (
                    <>
                      <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                      <div className="rounded-2xl border border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#0d0d0d] p-4">
                        <p className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide mb-1.5">
                          Notes
                        </p>
                        <p className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] leading-relaxed">
                          {payable.notes}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Reversal info */}
                  {payable.status === "Reversed" && (
                    <>
                      <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                      <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] p-4">
                        <div className="flex items-start gap-3">
                          <RotateCcw className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-[12px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa]">
                              Reversal Information
                            </p>
                            {payable.reversalReason && (
                              <p className="text-[13px] mt-1 text-gray-700 dark:text-[#d4d4d8]">
                                {payable.reversalReason}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500 dark:text-[#71717a]">
                              {payable.reversedBy && (
                                <span>By: <span className="font-sfpro-medium">{typeof payable.reversedBy === "object" ? payable.reversedBy?.name : payable.reversedBy}</span></span>
                              )}
                              {payable.reversedAt && (
                                <span>On: <span className="font-sfpro-medium">{payable.reversedAt}</span></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-gray-100 dark:bg-[#252525]" />

                  {/* Payment transactions */}
                  <div className="flex flex-col gap-3">
                    <SectionHeader title={`Payment Transactions (${payable.payments?.length ?? 0})`} />
                    <PaymentsTable payments={payable.payments} />
                  </div>

                  {/* Payment notes */}
                  {payable.payments?.some((p) => p.notes?.trim()) && (
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Payment Remarks" />
                      <PaymentNotes payments={payable.payments} />
                    </div>
                  )}

                  {/* Activity */}
                  <div className="h-px bg-gray-100 dark:bg-[#252525]" />
                  <div className="flex flex-col gap-4">
                    <SectionHeader title="Activity Timeline" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: "Created At", value: payable.createdAt },
                        { label: "Last Updated", value: payable.updatedAt },
                        ...(payable.payments?.length > 0 ? [{
                          label: "Last Payment",
                          value: payable.payments[payable.payments.length - 1].paymentDate,
                        }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#0d0d0d]">
                          <span className="text-[10px] text-gray-400 dark:text-[#52525b] uppercase font-sfpro-bold tracking-wide">
                            {label}
                          </span>
                          <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                            {value || <NA />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Footer */}
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
    </>
  )
}