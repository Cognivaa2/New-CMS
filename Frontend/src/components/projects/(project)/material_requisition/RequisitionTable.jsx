"use client"

import { useState, useEffect, useRef } from "react"
import {
  CheckCircle2, Eye, Edit, Trash2, Send,
  ThumbsUp, ThumbsDown, Clock, XCircle,
  FileCheck, Loader2,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import ViewMRModal from "./ViewMRModal"

const STATUS_CONFIG = {
  Draft: {
    label: "Draft",
    icon: Clock,
    className:
      "text-gray-600 bg-gray-100 border border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]",
    color: "#a1a1aa",
  },
  Submitted: {
    label: "Submitted",
    icon: Send,
    className:
      "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    color: "#3b82f6",
  },
  Approved: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "text-[#16a34a] bg-[#ebfbf1] border border-[#c1f0d0] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400",
    color: "#22c55e",
  },
  Rejected: {
    label: "Rejected",
    icon: XCircle,
    className:
      "text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    color: "#dc2626",
  },
  ConvertedToPO: {
    label: "Converted",
    icon: FileCheck,
    className:
      "text-purple-600 bg-purple-50 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    color: "#a855f7",
  },
}

const HEADERS = [
  { key: "mrNumber", label: "MR Id", width: "min-w-[130px]" },
  { key: "materials", label: "Materials", width: "min-w-[160px] max-w-[220px]" },
  { key: "quantities", label: "Quantities", width: "min-w-[130px] max-w-[180px]" },
  { key: "reason", label: "Reason", width: "min-w-[120px] max-w-[160px]" },
  { key: "remarks", label: "Remarks", width: "min-w-[120px] max-w-[160px]" },
  { key: "status", label: "Status", width: "min-w-[120px]" },
  { key: "neededBy", label: "Needed By", width: "min-w-[100px]" },
  { key: "requestedBy", label: "Requested By", width: "min-w-[160px]" },
  { key: "actionedBy", label: "Approved / Rejected By", width: "min-w-[180px]" },
  { key: "createdAt", label: "Created At", width: "min-w-[110px]" },
  { key: "action", label: "", width: "min-w-[50px]" },
]

function NA() {
  return (
    <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
      Not available
    </span>
  )
}

function formatRawDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function getActionedBy(row) {
  if (["Approved", "ConvertedToPO"].includes(row.status) && row.approvedBy)
    return { user: row.approvedBy, date: formatRawDate(row.approvedAt), label: "Approved" }
  if (row.status === "Rejected" && row.rejectedBy)
    return { user: row.rejectedBy, date: formatRawDate(row.rejectedAt), label: "Rejected" }
  return null
}

function StatusPill({ status, compact = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {!compact && config.label}
    </span>
  )
}

function UserAvatar({ user, size = 32 }) {
  const [imgError, setImgError] = useState(false)
  const hasAvatar = user?.avatar && !imgError
  if (hasAvatar) {
    return (
      <img
        src={user.avatar} alt={user.name || "User"}
        width={size} height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  const initials =
    user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
    >
      {initials}
    </div>
  )
}

function UserCell({ user }) {
  if (!user) return <NA />
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <UserAvatar user={user} size={28} />
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
          {user.name}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">
          {user.role || ""}
        </span>
      </div>
    </div>
  )
}

function TextCell({ text, maxLines = 1 }) {
  if (!text || !String(text).trim()) return <NA />
  return (
    <p
      className={`text-[13px] font-sfpro text-gray-600 dark:text-[#a1a1aa] wrap-break-words ${maxLines > 1 ? "line-clamp-2 leading-snug" : "truncate"
        }`}
      title={text}
    >
      {text}
    </p>
  )
}

function ActionedByCell({ row }) {
  const actioned = getActionedBy(row)
  if (!actioned) return <NA />
  const meta = [actioned.label, actioned.date].filter(Boolean).join(" • ")
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <UserAvatar user={actioned.user} size={28} />
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
          {actioned.user?.name || <NA />}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">
          {meta}
        </span>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <FileCheck className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No requisitions yet
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Create your first material requisition to get started.
        </p>
      </div>
    </div>
  )
}

function LoadMoreTrigger({ onLoadMore, loadingMore, hasMore }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!hasMore || !onLoadMore) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loadingMore) onLoadMore() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, loadingMore])

  return (
    <div ref={ref} className="flex items-center justify-center py-6 min-h-px">
      {hasMore && loadingMore && (
        <div className="flex items-center gap-2 text-gray-400 dark:text-[#52525b]">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
          <span className="text-[13px] font-sfpro">Loading more…</span>
        </div>
      )}
      {!hasMore && !loadingMore && (
        <span className="text-[12px] text-gray-300 dark:text-[#3f3f46] font-sfpro">
          All records loaded
        </span>
      )}
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
        {label}
      </span>
      <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium">
        {children || <NA />}
      </div>
    </div>
  )
}

function RequisitionCard({ row, menuItems, onView }) {
  const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
  const actioned = getActionedBy(row)

  return (
    <div
      onClick={() => onView(row)}
      className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
            {row.mrNumber || <NA />}
          </p>
          <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate mt-0.5">
            {row.requestedBy?.name || ""}
            {row.requestedBy?.role ? ` · ${row.requestedBy.role}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusPill status={row.status} compact />
          <div onClick={e => e.stopPropagation()} className="-mr-1 relative z-10">
            <ThreeDotMenu
              items={menuItems}
              size="md"
              header={{ title: row.mrNumber, subtitle: row.materials, statusColor: config.color }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <DetailRow label="Materials">
          {row.materials
            ? <span className="line-clamp-2 leading-snug font-sfpro">{row.materials}</span>
            : <NA />}
        </DetailRow>
        <DetailRow label="Quantities">
          {row.quantities
            ? <span className="font-sfpro">{row.quantities}</span>
            : <NA />}
        </DetailRow>
        <DetailRow label="Reason">
          {row.reason
            ? <span className="line-clamp-2 font-sfpro">{row.reason}</span>
            : <NA />}
        </DetailRow>
        <DetailRow label="Remarks">
          {row.remarks
            ? <span className="line-clamp-2 font-sfpro">{row.remarks}</span>
            : <NA />}
        </DetailRow>
      </div>

      {row.status === "Rejected" && row.rejectionRemarks && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3">
          <p className="text-[11px] font-sfpro-bold text-red-600 dark:text-red-400 mb-0.5">
            Rejection Remarks
          </p>
          <p className="text-[12px] text-red-700 dark:text-red-300 line-clamp-2">
            {row.rejectionRemarks}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
        <DetailRow label="Needed By">{row.neededBy || <NA />}</DetailRow>
        <DetailRow label="Created At">{row.createdAt || <NA />}</DetailRow>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
            Requested By
          </span>
          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            {row.requestedBy
              ? <>
                <UserAvatar user={row.requestedBy} size={20} />
                <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                  {row.requestedBy.name}
                </span>
              </>
              : <NA />}
          </div>
        </div>

        {actioned && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
              {actioned.label} By
            </span>
            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
              <UserAvatar user={actioned.user} size={20} />
              <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">
                {actioned.user?.name}
              </span>
              {actioned.date && (
                <span className="text-[11px] text-[#a1a1aa] dark:text-[#71717a] shrink-0">
                  · {actioned.date}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RequisitionRow({ row, menuItems, isLast, onView }) {
  const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
  return (
    <tr
      onClick={() => onView(row)}
      className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 cursor-pointer ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""
        }`}
    >
      <td className="px-5 py-4 whitespace-nowrap">
        {row.mrNumber
          ? <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white">{row.mrNumber}</span>
          : <NA />}
      </td>
      <td className="px-5 py-4">
        {row.materials
          ? <p className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] line-clamp-2 max-w-55">{row.materials}</p>
          : <NA />}
      </td>
      <td className="px-5 py-4">
        {row.quantities
          ? <p className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate max-w-45">{row.quantities}</p>
          : <NA />}
      </td>
      <td className="px-5 py-4"><TextCell text={row.reason} maxLines={2} /></td>
      <td className="px-5 py-4"><TextCell text={row.remarks} maxLines={2} /></td>
      <td className="px-5 py-4 whitespace-nowrap"><StatusPill status={row.status} /></td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.neededBy
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.neededBy}</span>
          : <NA />}
      </td>
      <td className="px-5 py-4 whitespace-nowrap"><UserCell user={row.requestedBy} /></td>
      <td className="px-5 py-4"><ActionedByCell row={row} /></td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.createdAt
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.createdAt}</span>
          : <NA />}
      </td>
      <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center">
          <ThreeDotMenu
            items={menuItems} size="sm"
            header={{ title: row.mrNumber, subtitle: row.materials, statusColor: config.color }}
          />
        </div>
      </td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
      {HEADERS.map((_, i) => (
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
          <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="space-y-1.5">
            <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
            <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RequisitionTable({
  data = [],
  isLoading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  actionLoading = {},
  total = 0,
}) {
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedMR, setSelectedMR] = useState(null)

  const handleView = (row) => { setSelectedMR(row); setViewOpen(true) }

  const buildMenuItems = (row) => {
    const loading = actionLoading[row.id]
    const items = [
      { label: "View Details", icon: <Eye className="w-4 h-4" />, onClick: () => handleView(row) },
    ]

    if (["Draft", "Rejected"].includes(row.status)) {
      items.push({
        label: "Edit MR",
        icon: <Edit className="w-4 h-4" />,
        onClick: () => onEdit?.(row),
      })
      items.push({
        label: loading === "submitting" ? "Submitting…" : "Submit for Approval",
        icon: loading === "submitting"
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Send className="w-4 h-4" />,
        onClick: () => !loading && onSubmit?.(row),
        disabled: !!loading,
      })
    }

    if (row.status === "Submitted") {
      items.push({
        label: loading === "approving" ? "Approving…" : "Approve",
        icon: loading === "approving"
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ThumbsUp className="w-4 h-4" />,
        onClick: () => !loading && onApprove?.(row),
        disabled: !!loading,
      })
      items.push({
        label: loading === "rejecting" ? "Rejecting…" : "Reject",
        icon: loading === "rejecting"
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ThumbsDown className="w-4 h-4" />,
        onClick: () => !loading && onReject?.(row),
        disabled: !!loading,
        variant: "danger",
      })
    }

    if (!["Approved", "ConvertedToPO"].includes(row.status)) {
      items.push("divider")
      items.push({
        label: "Delete",
        icon: <Trash2 className="w-4 h-4" />,
        variant: "danger",
        onClick: () => onDelete?.(row),
      })
    }

    return items
  }

  return (
    <div className="w-full font-sfpro pb-10">

      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {data.map(row => (
              <RequisitionCard
                key={row.id}
                row={row}
                menuItems={buildMenuItems(row)}
                onView={handleView}
              />
            ))}
            <LoadMoreTrigger
              onLoadMore={onLoadMore}
              loadingMore={loadingMore}
              hasMore={hasMore}
            />
          </>
        )}
      </div>

      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-350 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                {HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={`px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase ${h.width}`}
                  >
                    {h.key === "action" ? "" : h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#121212]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data.length === 0 ? (
                <tr><td colSpan={HEADERS.length}><EmptyState /></td></tr>
              ) : (
                data.map((row, index) => (
                  <RequisitionRow
                    key={row.id}
                    row={row}
                    menuItems={buildMenuItems(row)}
                    isLast={index === data.length - 1}
                    onView={handleView}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && data.length > 0 && (
          <LoadMoreTrigger
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
          />
        )}
      </div>
      {!isLoading && data.length > 0 && (
        <p className="mt-3 px-1 text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
          {data.length} of {total} requisition{total !== 1 ? "s" : ""}
        </p>
      )}

      <ViewMRModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setSelectedMR(null) }}
        mr={selectedMR}
        isLoading={false}
      />
    </div>
  )
}