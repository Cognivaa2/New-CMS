"use client"

import { useState, useCallback } from "react"
import {
  CheckCircle2, Clock, XCircle, RotateCcw, FileText,
  ChevronLeft, ChevronRight, Paperclip, Check, X,
  BadgeCheck, Loader2, ImageIcon,
} from "lucide-react"
import ExpenseViewModal from "@/components/projects/(project)/expenses/ExpenseViewModal"
import ExpenseAttachmentDrawer from "@/components/projects/(project)/expenses/ExpenseAttachmentDrawer"

const TAB_COLUMNS = {
  Manual: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Sub Type", accessor: "subType", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Attachment", accessor: "attachment", type: "attach" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Created By", accessor: "createdBy", type: "person" },
    { label: "Actions", accessor: "_actions", type: "actions" },
  ],
  Committed: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Type", accessor: "type", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Vendor", accessor: "vendor", type: "person" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Source", accessor: "sourceNumber", type: "text" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Created By", accessor: "createdBy", type: "person" },
  ],
  Actual: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Type", accessor: "type", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Vendor", accessor: "vendor", type: "person" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Attachment", accessor: "attachment", type: "attach" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Created By", accessor: "createdBy", type: "person" },
  ],
  Pending: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Sub Type", accessor: "subType", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Attachment", accessor: "attachment", type: "attach" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Submitted By", accessor: "createdBy", type: "person" },
    { label: "Actions", accessor: "_actions", type: "actions" },
  ],
  Approved: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Sub Type", accessor: "subType", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Attachment", accessor: "attachment", type: "attach" },
    { label: "Approved By", accessor: "approvedBy", type: "person" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Actions", accessor: "_actions", type: "actions" },
  ],
  Rejected: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Sub Type", accessor: "subType", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Rejection Remarks", accessor: "rejectionRemarks", type: "text" },
    { label: "Rejected By", accessor: "rejectedBy", type: "person" },
    { label: "Status", accessor: "status", type: "status" },
  ],
  Reversed: [
    { label: "Expense No.", accessor: "expenseNo", type: "title" },
    { label: "Type", accessor: "type", type: "text" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Date", accessor: "date", type: "text" },
    { label: "Reversal Reason", accessor: "reversalReason", type: "text" },
    { label: "Reversed By", accessor: "reversedBy", type: "person" },
    { label: "Status", accessor: "status", type: "status" },
  ],
}

const STATUS_CONFIG = {
  Approved: {
    icon: CheckCircle2,
    class: "bg-[#ebfbf1] text-[#166534] border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  },
  Pending: {
    icon: Clock,
    class: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  Committed: {
    icon: Clock,
    class: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  Actual: {
    icon: CheckCircle2,
    class: "bg-[#ebfbf1] text-[#166534] border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  },
  Completed: {
    icon: CheckCircle2,
    class: "bg-[#ebfbf1] text-[#166534] border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  },
  Rejected: {
    icon: XCircle,
    class: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  Reversed: {
    icon: RotateCcw,
    class: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  },
}

function getInitials(name) {
  if (!name) return "?"
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function getRowActions(row) {
  if (row.typeRaw !== "Manual") return null
  if (row.status === "Pending") return "pending"
  if (row.status === "Approved") return "approved"
  return null
}

function NotProvided() {
  return (
    <span className="italic text-[12px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
      Not Available
    </span>
  )
}

function StatusPill({ status }) {
  if (!status) return <NotProvided />
  const config = STATUS_CONFIG[status]
  const Icon = config?.icon ?? CheckCircle2
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sfpro-medium whitespace-nowrap border ${
        config?.class ??
        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {status}
    </span>
  )
}

function UserAvatar({ name, img, size = 28 }) {
  const [imgError, setImgError] = useState(false)
  const hasImg = img && !imgError

  if (hasImg) {
    return (
      <img
        src={img}
        alt={name || "User"}
        onError={() => setImgError(true)}
        className="rounded-full object-cover shrink-0 ring-1 ring-gray-100 dark:ring-[#27272a]"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center shrink-0 text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa]"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  )
}

function PersonCell({ person }) {
  if (!person) return <NotProvided />
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <UserAvatar name={person.name} img={person.img} size={28} />
      <div className="min-w-0">
        <p className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#d4d4d8] truncate leading-tight">
          {person.name}
        </p>
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] truncate leading-tight">
          {person.role}
        </p>
      </div>
    </div>
  )
}

function AttachmentCell({ row, onViewAttachment }) {
  const hasFile = row.attachment && row.attachmentUrl

  if (!hasFile) return <NotProvided />

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onViewAttachment(row)
      }}
      className="cursor-pointer h-7 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1"
    >
      <ImageIcon className="w-3.5 h-3.5" />
      View
    </button>
  )
}

function ActionButtons({ row, onApprove, onReject, onMarkPaid, loadingId }) {
  const action = getRowActions(row)
  if (!action) return <NotProvided />

  const isLoading = loadingId === row.id

  if (action === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onApprove(row) }}
          disabled={isLoading}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-[#ebfbf1] text-[#166534] border border-[#b7efc5] hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2.5} />}
          Approve
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onReject(row) }}
          disabled={isLoading}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
          Reject
        </button>
      </div>
    )
  }

  if (action === "approved") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onMarkPaid(row) }}
        disabled={isLoading}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11.5px] font-sfpro-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:hover:bg-blue-500/20 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" strokeWidth={2.5} />}
        Mark Paid
      </button>
    )
  }

  return null
}

function MobileActionButtons({ row, onApprove, onReject, onMarkPaid, loadingId }) {
  const action = getRowActions(row)
  if (!action) return null
  const isLoading = loadingId === row.id

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-[#f0f0f0] dark:border-[#252525]">
      {action === "pending" && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(row) }}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[12px] font-sfpro-medium bg-[#ebfbf1] text-[#166534] border border-[#b7efc5] hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2.5} />}
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(row) }}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[12px] font-sfpro-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
            Reject
          </button>
        </>
      )}
      {action === "approved" && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkPaid(row) }}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[12px] font-sfpro-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" strokeWidth={2.5} />}
          Mark as Paid
        </button>
      )}
    </div>
  )
}

function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse" />
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
          <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
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
          No {activeTab} expenses found
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Expenses will appear here once they are recorded.
        </p>
      </div>
    </div>
  )
}

function renderCell(row, column, handlers) {
  const value = row[column.accessor]

  switch (column.type) {
    case "actions":
      return (
        <ActionButtons
          row={row}
          onApprove={handlers.onApprove}
          onReject={handlers.onReject}
          onMarkPaid={handlers.onMarkPaid}
          loadingId={handlers.loadingId}
        />
      )
    case "status":
      return <StatusPill status={value} />
    case "currency":
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] whitespace-nowrap">
          ₹{Number(value || 0).toLocaleString("en-IN")}
        </span>
      )
    case "title":
      return value ? (
        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-40 block">
          {value}
        </span>
      ) : <NotProvided />
    case "person":
      return <PersonCell person={value} />
    case "attach":
      return <AttachmentCell row={row} onViewAttachment={handlers.onViewAttachment} />
    default:
      return value ? (
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] whitespace-nowrap">
          {value}
        </span>
      ) : <NotProvided />
  }
}

function MobileCard({
  row,
  columns,
  onApprove,
  onReject,
  onMarkPaid,
  loadingId,
  onViewAttachment,
  onRowClick,
}) {
  const statusCol = columns.find((c) => c.type === "status")
  const hasAttachment = row.attachment && row.attachmentUrl

  return (
    <div
      onClick={() => onRowClick(row)}
      className="cursor-pointer rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
              {row.expenseNo || "Not Available"}
            </p>
            {hasAttachment && (
              <Paperclip className="w-3.5 h-3.5 text-blue-700 dark:text-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">
            {row.subType || row.type || "Not Available"} · {row.category || "Not Available"}
          </p>
        </div>
        {statusCol && (
          <div className="shrink-0">
            <StatusPill status={row[statusCol.accessor]} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide mb-1">
            {row.vendor ? "Vendor" : "Submitted By"}
          </p>
          <PersonCell person={row.vendor || row.createdBy} />
        </div>
        {row.approvedBy && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide mb-1">
              Approved By
            </p>
            <PersonCell person={row.approvedBy} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
            Amount
          </span>
          <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5]">
            ₹{Number(row.amount || 0).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
            Date
          </span>
          {row.date ? (
            <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
              {row.date}
            </span>
          ) : <NotProvided />}
        </div>
        {row.rejectionRemarks && (
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
              Rejection Remarks
            </span>
            <span className="text-[13px] font-sfpro-medium text-red-600 dark:text-red-400">
              {row.rejectionRemarks}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
            Attachment
          </span>
          {hasAttachment ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewAttachment(row)
              }}
              className="cursor-pointer h-6 px-2 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[11px] font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1 mt-0.5 w-fit"
            >
              <ImageIcon className="w-3 h-3" />
              View
            </button>
          ) : <NotProvided />}
        </div>
      </div>

      <MobileActionButtons
        row={row}
        onApprove={onApprove}
        onReject={onReject}
        onMarkPaid={onMarkPaid}
        loadingId={loadingId}
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
        {total} expense{total !== 1 ? "s" : ""}
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

export default function ExpenseTable({
  activeTab,
  rows = [],
  isLoading = false,
  pagination = {},
  onPageChange,
  onApprove,
  onReject,
  onMarkPaid,
  actionLoadingId = null,
  projectId,
}) {
  const columns = TAB_COLUMNS[activeTab] ?? TAB_COLUMNS.Manual

  const [viewExpense, setViewExpense] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [attachmentRow, setAttachmentRow] = useState(null)
  const [attachmentOpen, setAttachmentOpen] = useState(false)

  const handleRowClick = useCallback((row) => {
    setViewExpense(row)
    setViewOpen(true)
  }, [])

  const handleCloseView = useCallback(() => {
    setViewOpen(false)
    setTimeout(() => setViewExpense(null), 420)
  }, [])

  const handleViewAttachment = useCallback((row) => {
    if (!row?.attachmentUrl) return
    setAttachmentRow(row)
    setAttachmentOpen(true)
  }, [])

  const handleCloseAttachment = useCallback(() => {
    setAttachmentOpen(false)
    setTimeout(() => setAttachmentRow(null), 420)
  }, [])

  const handlers = {
    onApprove,
    onReject,
    onMarkPaid,
    loadingId: actionLoadingId,
    onViewAttachment: handleViewAttachment,
  }

  return (
    <div className="w-full font-sfpro pb-10">
      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : rows.length === 0
          ? <EmptyState activeTab={activeTab} />
          : rows.map((row) => (
              <MobileCard
                key={row.id}
                row={row}
                columns={columns}
                onApprove={onApprove}
                onReject={onReject}
                onMarkPaid={onMarkPaid}
                loadingId={actionLoadingId}
                onViewAttachment={handleViewAttachment}
                onRowClick={handleRowClick}
              />
            ))}
      </div>

      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-275 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                {columns.map((col) => (
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
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length} />
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState activeTab={activeTab} />
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className={`cursor-pointer group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${
                      index !== rows.length - 1
                        ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]"
                        : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.accessor} className="px-5 py-2 align-middle">
                        {renderCell(row, col, handlers)}
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

      <ExpenseViewModal
        isOpen={viewOpen}
        onClose={handleCloseView}
        expense={viewExpense}
        projectId={projectId}
      />

      <ExpenseAttachmentDrawer
        open={attachmentOpen}
        onClose={handleCloseAttachment}
        attachmentUrl={attachmentRow?.attachmentUrl || null}
        attachmentName={attachmentRow?.attachment || null}
        expenseNumber={attachmentRow?.expenseNo || ""}
      />
    </div>
  )
}