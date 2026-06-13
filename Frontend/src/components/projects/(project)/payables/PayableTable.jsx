"use client"
import {
  CheckCircle2, Clock, AlertCircle, RotateCcw,
  FileText, ChevronLeft, ChevronRight,
  Eye, IndianRupee, History, XCircle,Download,  
} from "lucide-react"
import { formatCurrency, formatDate, isOverdue, getSourceLabel } from "@/app/(companyname)/projects/[projectId]/payables/api"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

function NA() {
  return (
    <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
      Not Available
    </span>
  )
}


const STATUS_CONFIG = {
  Unpaid: {
    icon: Clock,
    color: "#ef4444",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  PartiallyPaid: {
    icon: AlertCircle,
    color: "#f59e0b",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  Paid: {
    icon: CheckCircle2,
    color: "#22c55e",
    className:
      "bg-[#ebfbf1] text-[#166534] border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  },
  Reversed: {
    icon: RotateCcw,
    color: "#a1a1aa",
    className:
      "bg-gray-100 text-gray-500 border-gray-200 dark:bg-[#27272a] dark:text-[#71717a] dark:border-[#3f3f46]",
  },
}

function StatusPill({ status }) {
  if (!status) return <NA />
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Unpaid
  const Icon = config.icon
  const label = status === "PartiallyPaid" ? "Partially Paid" : status
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sfpro-medium whitespace-nowrap border ${config.className}`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}

function SourceBadge({ sourceType }) {
  if (!sourceType) return <NA />
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sfpro-bold border whitespace-nowrap bg-gray-50 text-gray-700 border-gray-200 dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:border-[#3f3f46]">
      {getSourceLabel(sourceType)}
    </span>
  )
}

function OverdueTag() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sfpro-bold bg-gray-100 text-gray-700 dark:bg-[#27272a] dark:text-[#d4d4d8] whitespace-nowrap border border-gray-200 dark:border-[#3f3f46]">
      <Clock size={10} />
      Overdue
    </span>
  )
}

function PaymentProgress({ totalAmount, paidAmount, advanceDeducted }) {
  const settled = (paidAmount || 0) + (advanceDeducted || 0)
  const pct = totalAmount > 0 ? Math.min((settled / totalAmount) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-28">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#27272a] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#212121] dark:bg-white transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-sfpro-medium text-gray-500 dark:text-[#a1a1aa] shrink-0 w-10 text-right">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

function ActionMenu({ payable, onAction }) {
  const canPay      = payable.status === "Unpaid" || payable.status === "PartiallyPaid"
  const hasPayments = payable.payments && payable.payments.length > 0

  const items = [
    {
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => onAction("view", payable),
    },
    ...(canPay ? [{
      label: "Record Payment",
      icon: <IndianRupee className="w-4 h-4" />,
      onClick: () => onAction("pay", payable),
    }] : []),
    {
      label: "Transaction History",
      icon: <History className="w-4 h-4" />,
      onClick: () => onAction("history", payable),
    },
    {
      label: "Export Bill",                              
      icon: <Download className="w-4 h-4" />,
      onClick: () => onAction("exportPdf", payable),
    },
  ]

  const menuHeader = {
    title: payable.vendorName || "No Vendor",
    subtitle: payable.payableNumber,
    statusColor: STATUS_CONFIG[payable.status]?.color || "#a1a1aa",
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="inline-block relative z-10">
      <ThreeDotMenu items={items} size="md" header={menuHeader} />
    </div>
  )
}


const COLUMNS = [
  { label: "Payable No.", accessor: "payableNumber", type: "title" },
  { label: "Source", accessor: "sourceType", type: "source" },
  { label: "Ref", accessor: "sourceRef", type: "text" },
  { label: "Vendor", accessor: "vendorName", type: "vendor" },
  { label: "Total", accessor: "totalAmount", type: "currency" },
  { label: "Paid", accessor: "paidAmount", type: "currency" },
  { label: "Advance", accessor: "advanceDeducted", type: "currency" },
  { label: "Due", accessor: "dueAmount", type: "currencyDue" },
  { label: "Progress", accessor: "_progress", type: "progress" },
  { label: "Status", accessor: "status", type: "status" },
  { label: "", accessor: "_actions", type: "actions" },
]

function renderCell(row, column, onAction) {
  const value = row[column.accessor]

  switch (column.type) {
    case "title":
      if (!value) return <NA />
      return (
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] whitespace-nowrap">
          {value}
        </span>
      )

    case "source":
      return <SourceBadge sourceType={value} />

    case "vendor":
      if (!value) return <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">No Vendor</span>
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-36 block">
          {value}
        </span>
      )

    case "currency":
      if (value === null || value === undefined) return <NA />
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] whitespace-nowrap">
          {formatCurrency(value)}
        </span>
      )

    case "currencyDue":
      if (value === null || value === undefined) return <NA />
      return (
        <span
          className={`text-[13px] whitespace-nowrap ${value > 0
            ? "font-sfpro-bold text-gray-900 dark:text-white"
            : "font-sfpro-medium text-gray-400 dark:text-[#52525b]"
            }`}
        >
          {formatCurrency(value)}
        </span>
      )

    case "progress":
      return (
        <PaymentProgress
          totalAmount={row.totalAmount}
          paidAmount={row.paidAmount}
          advanceDeducted={row.advanceDeducted}
        />
      )

    case "status":
      return <StatusPill status={value} />

    case "dueDate": {
      if (!row.dueDateFormatted && !value) return <NA />
      const display = row.dueDateFormatted || formatDate(value)
      const overdue = isOverdue(value, row.status)
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] whitespace-nowrap">
            {display}
          </span>
          {overdue && <OverdueTag />}
        </div>
      )
    }

    case "actions":
      return <ActionMenu payable={row} onAction={onAction} />

    default:
      if (value === null || value === undefined || value === "") return <NA />
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] whitespace-nowrap">
          {value}
        </span>
      )
  }
}


function SkeletonRow() {
  return (
    <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
      {COLUMNS.map((col, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse ${col.type === "actions" ? "w-6" : "w-full"}`} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
          <div className="h-3 w-36 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="space-y-1.5">
            <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
            <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ activeTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <FileText className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No {activeTab === "All" ? "" : activeTab.toLowerCase() + " "}payables found
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Payables will appear here when GRNs, Work Orders, or Expenses are recorded.
        </p>
      </div>
    </div>
  )
}


function MobileCard({ row, onAction }) {
  const overdue = isOverdue(row.dueDate, row.status)
  return (
    <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
              {row.payableNumber || <NA />}
            </p>
            <SourceBadge sourceType={row.sourceType} />
          </div>
          <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">
            {row.vendorName || "No vendor"} • {row.sourceRef || "—"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusPill status={row.status} />
          <ActionMenu payable={row} onAction={onAction} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Total</span>
          <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5]">{formatCurrency(row.totalAmount)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Due</span>
          <span className={`text-[13px] ${row.dueAmount > 0 ? "font-sfpro-bold text-gray-900 dark:text-white" : "font-sfpro-medium text-gray-400 dark:text-[#52525b]"}`}>
            {formatCurrency(row.dueAmount)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Paid</span>
          <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5]">{formatCurrency(row.paidAmount)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Due Date</span>
          <div className="flex items-center gap-1.5">
            {row.dueDateFormatted
              ? <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.dueDateFormatted}</span>
              : <NA />
            }
            {overdue && <OverdueTag />}
          </div>
        </div>
      </div>

      <PaymentProgress
        totalAmount={row.totalAmount}
        paidAmount={row.paidAmount}
        advanceDeducted={row.advanceDeducted}
      />
    </div>
  )
}


function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null
  const { page, totalPages, total, hasNext, hasPrev } = pagination
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
        {total} payable{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => hasPrev && onPageChange(page - 1)}
          disabled={!hasPrev}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] min-w-16 text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => hasNext && onPageChange(page + 1)}
          disabled={!hasNext}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}


export default function PayableTable({
  activeTab,
  rows = [],
  isLoading = false,
  pagination = {},
  onPageChange,
  onAction,
}) {
  return (
    <div className="w-full font-sfpro pb-10">
      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : rows.length === 0
            ? <EmptyState activeTab={activeTab} />
            : rows.map((row) => (
              <MobileCard key={row.id} row={row} onAction={onAction} />
            ))}
      </div>


      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-275 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.accessor}
                    className="px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#121212]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    <EmptyState activeTab={activeTab} />
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${index !== rows.length - 1
                      ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]"
                      : ""
                      }`}
                  >
                    {COLUMNS.map((col) => (
                      <td key={col.accessor} className="px-5 py-4 align-middle">
                        {renderCell(row, col, onAction)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </div>
  )
}