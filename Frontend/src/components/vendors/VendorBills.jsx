// components/vendors/VendorBills.js
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Loader2, ChevronLeft, ChevronRight,
  Receipt, FileText, Landmark, AlertCircle,
  ArrowUpRight, Banknote,
  Calendar, Hash, ExternalLink, Wallet,
  CreditCard, Building2, Smartphone, BadgeCheck,
  TrendingUp, TrendingDown, FileStack,
  Package, Briefcase, CircleDollarSign,
} from "lucide-react"
import { toast } from "sonner"
import {
  fetchVendorBills,
  fetchPayableDetailForVendor,
  formatVendorError,
} from "@/app/(companyname)/vendors/api"

function currency(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "₹0.00"
  return `₹${Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function compactCurrency(val) {
  const num = Number(val ?? 0)
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return currency(num)
}

function formatDate(d) {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatShortDate(d) {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
  })
}

function formatDateTime(d) {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function relativeTime(d) {
  if (!d) return null
  const now = new Date()
  const date = new Date(d)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatShortDate(d)
}

function resolveTxnKind(txn) {
  if (!txn) return "Payment"
  const cash = Number(txn.amount ?? 0)
  const advance = Number(txn.advanceDeducted ?? 0)
  if (advance > 0 && cash === 0) return "AdvanceOnly"
  if (advance > 0 && cash > 0) return "Mixed"
  return "Payment"
}
const MODE_ICON = {
  Cash: Wallet,
  BankTransfer: Building2,
  Cheque: BadgeCheck,
  UPI: Smartphone,
  NEFT: Building2,
  RTGS: Building2,
  DD: CreditCard,
  Other: CreditCard,
}

function ModeIcon({ mode, className = "w-3.5 h-3.5" }) {
  const Icon = MODE_ICON[mode] || CreditCard
  return <Icon className={className} />
}
const STATUS_CONFIG = {
  Unpaid: {
    label: "Unpaid",
    dot: "bg-gray-400 dark:bg-gray-500",
    badge: "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400",
  },
  PartiallyPaid: {
    label: "Partial",
    dot: "bg-amber-500",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  Paid: {
    label: "Paid",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Reversed: {
    label: "Reversed",
    dot: "bg-rose-500",
    badge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
}

const SOURCE_CONFIG = {
  GRN: {
    icon: Receipt,
    label: "GRN",
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-100 dark:bg-white/8",
    border: "border-gray-200 dark:border-white/10",
  },
  WO: {
    icon: FileText,
    label: "Work Order",
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-100 dark:bg-white/8",
    border: "border-gray-200 dark:border-white/10",
  },
}
function NA() {
  return (
    <span className="italic text-gray-300 dark:text-white/20 text-[11px]">
      N/A
    </span>
  )
}
const STATUS_OPTS = [
  { value: "", label: "All" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "PartiallyPaid", label: "Partial" },
  { value: "Paid", label: "Paid" },
]

const SOURCE_OPTS = [
  { value: "", label: "All" },
  { value: "GRN", label: "GRN" },
  { value: "WO", label: "WO" },
]

function FilterBar({ filters, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5 p-0.5 bg-gray-100
        dark:bg-white/5 rounded-lg">
        {STATUS_OPTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, status: opt.value, page: 1 })}
            className={`px-2.5 py-1 rounded-md text-[10px] font-sfpro-bold
              transition-all ${
              filters.status === opt.value
                ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5 p-0.5 bg-gray-100
        dark:bg-white/5 rounded-lg">
        {SOURCE_OPTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, sourceType: opt.value, page: 1 })}
            className={`px-2.5 py-1 rounded-md text-[10px] font-sfpro-bold
              transition-all ${
              filters.sourceType === opt.value
                ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
function KpiStrip({ kpi, isLoading }) {
  const metrics = [
    {
      label: "Total Billed",
      value: kpi?.totalAmount,
      icon: CircleDollarSign,
      color: "text-gray-900 dark:text-white",
    },
    {
      label: "Total Paid",
      value: kpi?.totalPaid,
      icon: TrendingUp,
      color: "text-gray-800 dark:text-gray-100",
    },
    {
      label: "Amount Due",
      value: kpi?.totalDue,
      icon: TrendingDown,
      color: "text-gray-700 dark:text-gray-200",
    },
  ]

  const counts = [
    { label: "POs",  value: kpi?.totalPOs  ?? 0, icon: FileStack },
    { label: "GRNs", value: kpi?.totalGRNs ?? 0, icon: Package   },
    { label: "WOs",  value: kpi?.totalWOs  ?? 0, icon: Briefcase },
  ]

  const total = Number(kpi?.totalAmount ?? 0)
  const paid  = Number(kpi?.totalPaid   ?? 0)
  const pct   = total > 0 ? Math.min((paid / total) * 100, 100) : 0

  return (
    <div className="space-y-3 mb-5">
      <div className="grid grid-cols-3 gap-2.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-gray-100 dark:border-[#252525]
              bg-white dark:bg-[#141414] p-4"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center
                justify-center bg-gray-100 dark:bg-white/8">
                <m.icon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="text-[10px] uppercase font-sfpro-bold
                text-gray-400 tracking-wider leading-none">
                {m.label}
              </span>
            </div>
            {isLoading ? (
              <div className="h-6 w-24 bg-gray-100 dark:bg-white/5
                animate-pulse rounded-lg" />
            ) : (
              <p className={`text-[20px] font-sfpro-bold tracking-tight ${m.color}`}>
                {currency(m.value)}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/8
            rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 dark:bg-white rounded-full
                transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-sfpro-bold text-gray-600
            dark:text-gray-300 shrink-0">
            {isLoading ? "—" : `${pct.toFixed(0)}%`}
          </span>
        </div>

        <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

        <div className="flex items-center gap-1.5">
          {counts.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-1 px-2 py-1 rounded-md
                bg-gray-50 dark:bg-white/4"
            >
              <c.icon className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] font-sfpro-bold text-gray-600
                dark:text-gray-300">
                {isLoading ? "—" : c.value}
              </span>
              <span className="text-[9px] text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
function PayableListItem({ bill, isSelected, onClick }) {
  const status  = STATUS_CONFIG[bill.status]     || STATUS_CONFIG.Unpaid
  const source  = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.GRN
  const SrcIcon = source.icon

  return (
    <div
      onClick={() => onClick(bill)}
      className={`group px-4 py-3.5 cursor-pointer transition-all border-b
        border-gray-50 dark:border-[#1a1a1a] last:border-0 border-l-2
        ${
          isSelected
            ? "bg-gray-50 dark:bg-white/4 border-l-gray-900! dark:border-l-white!"
            : "border-l-transparent hover:bg-gray-50/60 dark:hover:bg-white/2"
        }`}
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${source.bg}`}>
            <SrcIcon className={`w-3 h-3 ${source.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-sfpro-bold text-gray-900
              dark:text-white truncate leading-tight">
              {bill.payableNumber || "—"}
            </p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {bill.sourceNumber ?? source.label}
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1 px-2 py-0.5
          rounded-full text-[9px] font-sfpro-bold shrink-0 ${status.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>

      {/* amount + paid/due */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-sfpro-bold text-gray-800
          dark:text-gray-100">
          {currency(bill.totalAmount)}
        </span>
        <div className="flex items-center gap-2.5 text-[10px]">
          <span className="text-gray-500 dark:text-gray-400 font-sfpro-medium">
            Paid {compactCurrency(bill.paidAmount)}
          </span>
          {bill.dueAmount > 0 && (
            <span className="text-gray-400 dark:text-gray-500 font-sfpro-medium">
              Due {compactCurrency(bill.dueAmount)}
            </span>
          )}
        </div>
      </div>

      {/* footer */}
      {(bill.isOverdue || bill.dueDate) && (
        <div className="flex items-center justify-end mt-2">
          {bill.isOverdue ? (
            <div className="flex items-center gap-1 text-rose-500">
              <AlertCircle className="w-3 h-3" />
              <span className="text-[10px] font-sfpro-bold">Overdue</span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">
              Due {formatShortDate(bill.dueDate)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
function ListPagination({ pagination, onPage, isLoading }) {
  if (pagination.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t
      border-gray-100 dark:border-[#1e1e1e] bg-gray-50/50 dark:bg-white/2
      shrink-0">
      <span className="text-[10px] text-gray-400">
        {pagination.total} bills
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={!pagination.hasPrev || isLoading}
          onClick={() => onPage(pagination.page - 1)}
          className="p-0.5 disabled:opacity-30 text-gray-500"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[10px] font-sfpro-bold text-gray-500">
          {pagination.page}/{pagination.totalPages}
        </span>
        <button
          disabled={!pagination.hasNext || isLoading}
          onClick={() => onPage(pagination.page + 1)}
          className="p-0.5 disabled:opacity-30 text-gray-500"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
function TransactionTimelineItem({ txn, isLast }) {
  const kind    = resolveTxnKind(txn)
  const cash    = Number(txn?.amount          ?? 0)
  const advance = Number(txn?.advanceDeducted ?? 0)
  const total   = Number(txn?.totalSettled    ?? cash + advance)
  const mode    = txn?.paymentModeOther || txn?.paymentMode || null

  const labels = {
    Payment:     "Cash Payment",
    AdvanceOnly: "Advance Deducted",
    Mixed:       "Mixed Settlement",
  }
  const label = labels[kind] || "Payment"

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center
          bg-gray-100 dark:bg-white/6">
          <ModeIcon
            mode={txn?.paymentMode}
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
          />
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-1 bg-gray-100 dark:bg-white/8
            min-h-3" />
        )}
      </div>
      <div className={`flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <p className="text-[12px] font-sfpro-bold text-gray-700
              dark:text-gray-200">
              {label}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {formatDateTime(txn?.paymentDate ?? txn?.createdAt)}
              {txn?.createdAt && (
                <span className="ml-1.5 text-gray-300 dark:text-gray-600">
                  · {relativeTime(txn.createdAt)}
                </span>
              )}
            </p>
          </div>
          <p className="text-[15px] font-sfpro-bold shrink-0 text-gray-900
            dark:text-white">
            {currency(total)}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {mode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5
              rounded-md bg-gray-50 dark:bg-white/5 border border-gray-100
              dark:border-white/8 text-[10px] font-sfpro-medium text-gray-500
              dark:text-gray-400">
              <ModeIcon
                mode={txn?.paymentMode}
                className="w-2.5 h-2.5 text-gray-400"
              />
              {mode}
            </span>
          )}

          {cash > 0 && kind !== "Payment" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5
              rounded-md bg-gray-50 dark:bg-white/5 border border-gray-100
              dark:border-white/8 text-[10px] font-sfpro-medium text-gray-500
              dark:text-gray-400">
              <Banknote className="w-2.5 h-2.5" />
              {currency(cash)}
            </span>
          )}

          {advance > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5
              rounded-md bg-gray-50 dark:bg-white/5 border border-gray-100
              dark:border-white/8 text-[10px] font-sfpro-medium text-gray-500
              dark:text-gray-400">
              <ArrowUpRight className="w-2.5 h-2.5" />
              Adv. {currency(advance)}
            </span>
          )}

          {txn?.referenceNumber && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md
              bg-gray-50 dark:bg-white/5 border border-gray-100
              dark:border-white/8 text-[10px] font-mono text-gray-400">
              #{txn.referenceNumber}
            </span>
          )}
        </div>

        {txn?.notes && (
          <p className="text-[10px] text-gray-400 italic mt-1.5 leading-relaxed">
            "{txn.notes}"
          </p>
        )}

        {txn?.proofImage && (
          <a
            href={txn.proofImage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-[10px]
              font-sfpro-medium text-gray-500 hover:text-gray-700
              dark:hover:text-gray-300 hover:underline transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            View Proof
          </a>
        )}
      </div>
    </div>
  )
}

function DetailPanel({ bill, vendorId }) {
  const [data,      setData]      = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState(null)
  const controllerRef = useRef(null)

  useEffect(() => {
    if (!bill?.payableId || !vendorId) {
      setData(null)
      return
    }

    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setIsLoading(true)
    setData(null)
    setError(null)

    fetchPayableDetailForVendor(vendorId, bill.payableId, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setData(res)
      })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          setError(err.message)
          toast.error("Failed to load details")
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [bill?.payableId, vendorId])

  if (!bill) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center
        text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/4
          flex items-center justify-center mb-4">
          <Receipt className="w-6 h-6 text-gray-300 dark:text-white/15" />
        </div>
        <p className="text-[14px] font-sfpro-medium text-gray-400
          dark:text-gray-500">
          Select a payable
        </p>
        <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1
          max-w-50">
          Click any bill from the list to view its payment history
        </p>
      </div>
    )
  }
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2
        text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px] font-sfpro">Loading details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center
        gap-2 p-8">
        <AlertCircle className="w-6 h-6 text-gray-400" />
        <p className="text-[12px] text-gray-500 text-center max-w-50">
          {error}
        </p>
      </div>
    )
  }

  const payable      = data?.payable
  const transactions = data?.transactions ?? []
  const advBal       = data?.vendorAdvanceBalance

  const status  = STATUS_CONFIG[payable?.status ?? bill?.status] || STATUS_CONFIG.Unpaid
  const source  = SOURCE_CONFIG[bill?.sourceType] || SOURCE_CONFIG.GRN
  const SrcIcon = source.icon

  const totalAmt = payable?.totalAmount    ?? bill?.totalAmount ?? 0
  const paidAmt  = payable?.paidAmount     ?? bill?.paidAmount  ?? 0
  const advAmt   = payable?.advanceDeducted ?? 0
  const dueAmt   = payable?.dueAmount      ?? bill?.dueAmount   ?? 0
  const paidPct  = totalAmt > 0
    ? Math.min(((paidAmt + advAmt) / totalAmt) * 100, 100)
    : 0

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-5 border-b border-gray-50 dark:border-[#1a1a1a]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${source.bg} border ${source.border}`}>
              <SrcIcon className={`w-4 h-4 ${source.color}`} />
            </div>
            <div>
              <h4 className="text-[15px] font-sfpro-bold text-gray-900
                dark:text-white leading-tight">
                {payable?.payableNumber ?? bill?.payableNumber}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {payable?.sourceNumber ?? bill?.sourceNumber ?? source.label}
              </p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1
            rounded-full text-[10px] font-sfpro-bold ${status.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            {
              label: "Total",
              value: currency(totalAmt),
              color: "text-gray-900 dark:text-white",
            },
            {
              label: "Settled",
              value: currency(paidAmt + advAmt),
              color: "text-gray-700 dark:text-gray-200",
            },
            {
              label: "Due",
              value: currency(dueAmt),
              color: "text-gray-500 dark:text-gray-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="text-center py-2.5 rounded-xl bg-gray-50
                dark:bg-white/4"
            >
              <p className="text-[9px] uppercase font-sfpro-bold text-gray-400
                tracking-wider mb-0.5">
                {item.label}
              </p>
              <p className={`text-[14px] font-sfpro-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/8
            rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 dark:bg-white rounded-full
                transition-all duration-700"
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <span className="text-[10px] font-sfpro-bold text-gray-600
            dark:text-gray-300 shrink-0">
            {paidPct.toFixed(0)}%
          </span>
        </div>

        {advAmt > 0 && (
          <div className="flex items-center gap-3 mt-2.5 text-[10px]">
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-700
                dark:bg-gray-200" />
              Cash {currency(paidAmt)}
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Advance {currency(advAmt)}
            </div>
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-b border-gray-50 dark:border-[#1a1a1a]">
        {[
          { icon: Hash,     label: "Payable No.", value: payable?.payableNumber },
          { icon: SrcIcon,  label: "Source",      value: payable?.sourceNumber ?? bill?.sourceNumber },
          { icon: Calendar, label: "Due Date",    value: formatDate(payable?.dueDate ?? bill?.dueDate) },
          { icon: Calendar, label: "Created",     value: formatDate(payable?.createdAt) },
        ].map(({ icon: Ic, label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between py-2 border-b
              border-gray-50 dark:border-white/4 last:border-0"
          >
            <div className="flex items-center gap-2 text-gray-400">
              <Ic className="w-3 h-3" />
              <span className="text-[11px]">{label}</span>
            </div>
            <span className="text-[11px] font-sfpro-medium text-gray-700
              dark:text-gray-200">
              {value ?? <NA />}
            </span>
          </div>
        ))}
      </div>
      {advBal !== null && advBal !== undefined && (
        <div className="mx-5 my-3 flex items-center justify-between px-3.5
          py-2.5 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100
          dark:border-white/8">
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] font-sfpro-medium text-gray-600
              dark:text-gray-300">
              Vendor Advance Balance
            </span>
          </div>
          <span className="text-[13px] font-sfpro-bold text-gray-800
            dark:text-gray-100">
            {currency(advBal)}
          </span>
        </div>
      )}

      <div className="px-5 pb-5 pt-3">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[11px] font-sfpro-bold text-gray-400
            uppercase tracking-wider">
            Payment Timeline
          </h4>
          {transactions.length > 0 && (
            <span className="text-[10px] font-sfpro-bold text-gray-400
              bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              {transactions.length}
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center
            py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/4
              flex items-center justify-center mb-3">
              <Landmark className="w-4 h-4 text-gray-300 dark:text-white/15" />
            </div>
            <p className="text-[12px] font-sfpro-medium text-gray-400">
              No payments yet
            </p>
            <p className="text-[10px] text-gray-300 dark:text-white/15 mt-0.5">
              Payments will appear once recorded
            </p>
          </div>
        ) : (
          <div>
            {transactions.map((txn, idx) => (
              <TransactionTimelineItem
                key={txn._id || idx}
                txn={txn}
                isLast={idx === transactions.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
const DEFAULT_PAGINATION = {
  total: 0, page: 1, limit: 10,
  totalPages: 1, hasNext: false, hasPrev: false,
}

export default function VendorBills({ vendorId }) {
  const [kpi,          setKpi]          = useState(null)
  const [bills,        setBills]        = useState([])
  const [pagination,   setPagination]   = useState(DEFAULT_PAGINATION)
  const [filters,      setFilters]      = useState({
    status: "", sourceType: "", sortBy: "createdAt",
    order: "desc", page: 1, limit: 10,
  })
  const [isLoading,     setIsLoading]     = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [selectedBill,  setSelectedBill]  = useState(null)
  const controllerRef = useRef(null)
  const isFirstLoad   = useRef(true)

  const load = useCallback(async (currentFilters, isInitial = false) => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    if (isInitial) setIsLoading(true)
    else           setIsPageLoading(true)

    try {
      const result = await fetchVendorBills({
        vendorId,
        ...currentFilters,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setKpi(result.kpi)
      setBills(result.bills)
      setPagination(result.pagination)
      if (isInitial && result.bills.length > 0) {
        setSelectedBill(result.bills[0])
      }
    } catch (err) {
      if (err.name === "CanceledError") return
      toast.error("Failed to load bills", { description: formatVendorError(err) })
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
        setIsPageLoading(false)
      }
    }
  }, [vendorId])

  useEffect(() => {
    isFirstLoad.current = true
    setSelectedBill(null)
    load(filters, true)
    return () => controllerRef.current?.abort()
  }, [vendorId]) 

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    load(filters, false)
  }, [filters]) 

  const handleFilterChange = useCallback((f) => setFilters(f), [])
  const handlePage = useCallback(
    (p) => setFilters((prev) => ({ ...prev, page: p })), []
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-sfpro">Loading bills...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full font-sfpro animate-in fade-in duration-400">

      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-[17px] font-sfpro-bold text-gray-900 dark:text-white">
            Bills & Payables
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            GRN and Work Order settlement tracker
          </p>
        </div>
        <FilterBar filters={filters} onChange={handleFilterChange} />
      </div>

      <KpiStrip kpi={kpi} isLoading={false} />

      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        <div className="w-70 shrink-0 bg-white dark:bg-[#121212]
          rounded-2xl border border-gray-100 dark:border-[#252525]
          flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100
            dark:border-[#1e1e1e] shrink-0">
            <p className="text-[11px] font-sfpro-bold text-gray-400
              uppercase tracking-wider">
              All Payables
              {pagination.total > 0 && (
                <span className="ml-1.5 text-gray-300 dark:text-gray-600">
                  ({pagination.total})
                </span>
              )}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {isPageLoading && (
              <div className="absolute inset-0 flex items-center
                justify-center bg-white/60 dark:bg-[#121212]/60
                backdrop-blur-sm z-10">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}

            {bills.length === 0 ? (
              <div className="flex flex-col items-center justify-center
                py-14 text-center px-6">
                <Receipt className="w-7 h-7 text-gray-300
                  dark:text-white/10 mb-2" />
                <p className="text-[12px] text-gray-400 font-sfpro-medium">
                  No bills found
                </p>
                <p className="text-[10px] text-gray-300 dark:text-white/15 mt-0.5">
                  Bills appear once GRNs or WOs are created
                </p>
              </div>
            ) : (
              bills.map((bill, idx) => (
                <PayableListItem
                  key={bill.payableId || idx}
                  bill={bill}
                  isSelected={selectedBill?.payableId === bill.payableId}
                  onClick={setSelectedBill}
                />
              ))
            )}
          </div>

          <ListPagination
            pagination={pagination}
            onPage={handlePage}
            isLoading={isPageLoading}
          />
        </div>

        <div className="flex-1 bg-white dark:bg-[#121212] rounded-2xl border
          border-gray-100 dark:border-[#252525] flex flex-col overflow-hidden">
          <DetailPanel bill={selectedBill} vendorId={vendorId} />
        </div>
      </div>
    </div>
  )
}