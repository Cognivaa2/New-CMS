"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  CheckCircle2, Clock, Send, XCircle, FileCheck,
  Truck, PackageCheck, Eye, Edit, Trash2,
  ThumbsUp, ThumbsDown, Ban, Loader2, IndianRupee,
  Package, PackageOpen,Download,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import ViewPOModal from "./ViewPOModal"
import { fetchSinglePO } from "@/app/(companyname)/projects/[projectId]/purchase-order/api"

const STATUS_CONFIG = {
  Draft: { label: "Draft", icon: Clock, color: "#a1a1aa", className: "text-gray-600 bg-gray-100 border border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]" },
  Submitted: { label: "Submitted", icon: Send, color: "#3b82f6", className: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  Approved: { label: "Approved", icon: CheckCircle2, color: "#22c55e", className: "text-[#16a34a] bg-[#ebfbf1] border border-[#c1f0d0] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400" },
  Rejected: { label: "Rejected", icon: XCircle, color: "#dc2626", className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  PartiallyDelivered: { label: "Part. Delivered", icon: Truck, color: "#f59e0b", className: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  Completed: { label: "Completed", icon: PackageCheck, color: "#8b5cf6", className: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" },
  Cancelled: { label: "Cancelled", icon: Ban, color: "#6b7280", className: "text-gray-500 bg-gray-50 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20" },
}

const HEADERS = [
  { key: "poId", label: "PO ID", width: "w-36" },
  { key: "vendor", label: "Vendor", width: "w-40" },
  { key: "materials", label: "Materials", width: "w-52" },
  { key: "items", label: "Items", width: "w-16" },
  { key: "orderedQty", label: "Ordered Qty", width: "w-32" },
  { key: "receivedQty", label: "Received Qty", width: "w-32" },
  { key: "value", label: "Order Value", width: "w-32" },
  { key: "status", label: "Status", width: "w-36" },
  { key: "delivery", label: "Exp. Delivery", width: "w-32" },
  { key: "createdBy", label: "Requested By", width: "w-40" },
  { key: "approvedBy", label: "Approved / Rejected By", width: "w-44" },
  { key: "createdAt", label: "Created", width: "w-28" },
  { key: "actions", label: "", width: "w-12" },
]

function NA() {
  return (
    <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
      Not available
    </span>
  )
}

function aggregateQty(items = [], field) {
  if (!items.length) return null
  const byUnit = {}
  for (const item of items) {
    const unit = item.unit || "units"
    byUnit[unit] = (byUnit[unit] || 0) + (item[field] || 0)
  }
  return Object.entries(byUnit)
    .map(([unit, qty]) => ({ qty, unit }))
    .sort((a, b) => b.qty - a.qty)
}

function getActionedBy(row) {
  if (["Approved", "PartiallyDelivered", "Completed"].includes(row.status))
    return { user: row.approvedBy, label: "Approved by" }
  if (row.status === "Rejected")
    return { user: row.rejectedBy, label: "Rejected by" }
  if (row.status === "Cancelled")
    return { user: row.cancelledBy, label: "Cancelled by" }
  return null
}

function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {config.label}
    </span>
  )
}

function UserAvatar({ user, size = 30 }) {
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
  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
    >
      {initials}
    </div>
  )
}

function UserCell({ user, sublabel }) {
  if (!user) return <NA />
  return (
    <div className="flex items-center gap-2 min-w-0">
      <UserAvatar user={user} size={28} />
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</span>
        <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">
          {sublabel || user.role || ""}
        </span>
      </div>
    </div>
  )
}

function QtyCell({ items = [], field, icon: Icon, colorClass }) {
  const lines = aggregateQty(items, field)
  if (!lines || lines.length === 0) return <NA />
  return (
    <div className="flex flex-col gap-0.5">
      {lines.map(({ qty, unit }) => (
        <div key={unit} className="flex items-center gap-1">
          <Icon className={`w-3 h-3 shrink-0 ${colorClass}`} />
          <span className={`text-sm font-sfpro-bold ${colorClass}`}>
            {qty.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#71717a] font-sfpro">{unit}</span>
        </div>
      ))}
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
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No purchase orders yet</p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">Create your first PO from an approved MR.</p>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">{label}</span>
      <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-words">
        {children || <NA />}
      </div>
    </div>
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

function SkeletonRow() {
  return (
    <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
      {HEADERS.map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse" />
        </td>
      ))}
    </tr>
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
export default function POTable({
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
  onCancel,
  onExportPdf,   
  actionLoading = {},
  projectId,
  total = 0,
}) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [viewingPO, setViewingPO] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const viewFetchRef = useRef(null)

  const handleView = useCallback((po) => {
    viewFetchRef.current?.abort()
    const controller = new AbortController()
    viewFetchRef.current = controller

    setViewingPO({ ...po })
    setIsViewLoading(true)
    setIsViewOpen(true)

    fetchSinglePO(projectId, po.id, controller.signal)
      .then((full) => { if (!controller.signal.aborted) setViewingPO(full) })
      .catch((err) => { if (err.name !== "CanceledError") console.warn("Could not load full PO details:", err) })
      .finally(() => {
        if (!controller.signal.aborted) setIsViewLoading(false)
        if (viewFetchRef.current === controller) viewFetchRef.current = null
      })
  }, [projectId])

  const handleCloseView = useCallback(() => {
    viewFetchRef.current?.abort()
    viewFetchRef.current = null
    setIsViewOpen(false)
    setViewingPO(null)
    setIsViewLoading(false)
  }, [])

  useEffect(() => () => { viewFetchRef.current?.abort() }, [])

const buildMenuItems = useCallback((row) => {
  const loading = actionLoading[row.id]
  const items = [
    { 
      label: "View Details", 
      icon: <Eye className="w-4 h-4" />, 
      onClick: () => handleView(row) 
    },
    { 
      label: "Export PDF",
      icon: <Download className="w-4 h-4" />,   
      onClick: () => onExportPdf?.(row),
    },
  ]

  if (["Draft", "Rejected"].includes(row.status)) {
    items.push({ label: "Edit PO", icon: <Edit className="w-4 h-4" />, onClick: () => onEdit?.(row) })
    items.push({
      label: loading === "submitting" ? "Submitting…" : "Submit for Approval",
      icon: loading === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />,
      onClick: () => !loading && onSubmit?.(row),
      disabled: !!loading,
    })
  }
  if (row.status === "Submitted") {
    items.push({
      label: loading === "approving" ? "Approving…" : "Approve",
      icon: loading === "approving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />,
      onClick: () => !loading && onApprove?.(row),
      disabled: !!loading,
    })
    items.push({
      label: loading === "rejecting" ? "Rejecting…" : "Reject",
      icon: loading === "rejecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />,
      onClick: () => !loading && onReject?.(row),
      disabled: !!loading,
      variant: "danger",
    })
  }
  if (row.status === "Approved") {
    items.push({
      label: loading === "cancelling" ? "Cancelling…" : "Cancel PO",
      icon: loading === "cancelling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />,
      onClick: () => !loading && onCancel?.(row),
      disabled: !!loading,
      variant: "danger",
    })
  }
  if (["Draft", "Rejected"].includes(row.status)) {
    items.push("divider")
    items.push({ 
      label: "Delete", 
      icon: <Trash2 className="w-4 h-4" />, 
      variant: "danger", 
      onClick: () => onDelete?.(row) 
    })
  }
  return items
}, [actionLoading, onApprove, onCancel, onDelete, onEdit, onReject, onSubmit, onExportPdf, handleView])

  const POCard = ({ row }) => {
    const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
    const actioned = getActionedBy(row)
    const ordLines = aggregateQty(row.items, "orderedQuantity")
    const recvLines = aggregateQty(row.items, "receivedQuantity")
    const fmtQtyLines = (lines) =>
      lines?.map(({ qty, unit }) => `${qty.toLocaleString("en-IN")} ${unit}`).join(" · ") || null

    return (
      <div
        onClick={() => handleView(row)}
        className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">{row.poId || <NA />}</p>
            <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">{row.vendorName || <NA />}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusPill status={row.status} />
            <div onClick={e => e.stopPropagation()}>
              <ThreeDotMenu
                items={buildMenuItems(row)} size="md"
                header={{ title: row.poId, subtitle: row.vendorName, statusColor: config.color }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <DetailRow label="Materials">
            {row.materials ? <span className="line-clamp-2 leading-snug font-sfpro">{row.materials}</span> : <NA />}
          </DetailRow>
          <DetailRow label="Total Value">
            <span className="font-sfpro-bold text-[#212121] dark:text-white">
              ₹{(row.totalOrderValue || 0).toLocaleString("en-IN")}
            </span>
          </DetailRow>
          <DetailRow label="Items">{row.items?.length ?? 0} item(s)</DetailRow>
          <DetailRow label="Payment Terms">{row.paymentTerms || <NA />}</DetailRow>
          <DetailRow label="Ordered Qty">
            {fmtQtyLines(ordLines) ? <span className="font-sfpro text-gray-700 dark:text-[#d4d4d8]">{fmtQtyLines(ordLines)}</span> : <NA />}
          </DetailRow>
          <DetailRow label="Received Qty">
            {fmtQtyLines(recvLines) ? <span className="font-sfpro text-gray-700 dark:text-[#d4d4d8]">{fmtQtyLines(recvLines)}</span> : <NA />}
          </DetailRow>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
          <DetailRow label="Delivery">{row.expectedDelivery || <NA />}</DetailRow>
          <DetailRow label="Created At">{row.createdAt || <NA />}</DetailRow>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Requested By</span>
            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
              {row.createdBy
                ? <><UserAvatar user={row.createdBy} size={22} /><span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">{row.createdBy.name}</span></>
                : <NA />}
            </div>
          </div>
          {row.submittedBy && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Submitted By</span>
              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                <UserAvatar user={row.submittedBy} size={22} />
                <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">{row.submittedBy.name}</span>
              </div>
            </div>
          )}
          {actioned?.user && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">{actioned.label}</span>
              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                <UserAvatar user={actioned.user} size={22} />
                <span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">{actioned.user.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const PORow = ({ row, isLast }) => {
    const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.Draft
    const actioned = getActionedBy(row)
    return (
      <tr
        onClick={() => handleView(row)}
        className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 cursor-pointer ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""
          }`}
      >
        <td className="px-4 py-4 whitespace-nowrap">
          {row.poId ? <span className="text-[13.5px] font-sfpro-bold text-gray-900 dark:text-white">{row.poId}</span> : <NA />}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          {row.vendorName ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.vendorName}</span> : <NA />}
        </td>
        <td className="px-4 py-4">
          {row.materials ? <p className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate max-w-50">{row.materials}</p> : <NA />}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-center">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#27272a] text-[11px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa]">
            {row.items?.length ?? 0}
          </span>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <QtyCell items={row.items} field="orderedQuantity" icon={Package} colorClass="text-gray-700 dark:text-[#d4d4d8]" />
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <QtyCell items={row.items} field="receivedQuantity" icon={PackageOpen} colorClass="text-emerald-600 dark:text-emerald-400" />
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <IndianRupee className="w-3 h-3 text-gray-400" />
            <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
              {(row.totalOrderValue || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap"><StatusPill status={row.status} /></td>
        <td className="px-4 py-4 whitespace-nowrap">
          {row.expectedDelivery ? <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.expectedDelivery}</span> : <NA />}
        </td>
        <td className="px-4 py-4 whitespace-nowrap"><UserCell user={row.createdBy} /></td>
        <td className="px-4 py-4 whitespace-nowrap">
          {actioned?.user ? <UserCell user={actioned.user} sublabel={actioned.label} /> : <NA />}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          {row.createdAt ? <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">{row.createdAt}</span> : <NA />}
        </td>
        <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex justify-center">
            <ThreeDotMenu
              items={buildMenuItems(row)} size="sm"
              header={{ title: row.poId, subtitle: row.vendorName, statusColor: config.color }}
            />
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="w-full font-sfpro pb-10">

        <div className="lg:hidden space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : data.length === 0
              ? <EmptyState />
              : <>
                {data.map(row => <POCard key={row.id} row={row} />)}
                <LoadMoreTrigger onLoadMore={onLoadMore} loadingMore={loadingMore} hasMore={hasMore} />
              </>
          }
        </div>
        <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
          <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                  {HEADERS.map((h, i) => (
                    <th key={i} className={`px-4 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase ${h.width}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#121212]">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : data.length === 0
                    ? <tr><td colSpan={HEADERS.length}><EmptyState /></td></tr>
                    : data.map((row, index) => (
                      <PORow key={row.id} row={row} isLast={index === data.length - 1} />
                    ))
                }
              </tbody>
            </table>
          </div>
          {!isLoading && data.length > 0 && (
            <LoadMoreTrigger onLoadMore={onLoadMore} loadingMore={loadingMore} hasMore={hasMore} />
          )}
        </div>

        {!isLoading && data.length > 0 && (
          <p className="mt-3 px-1 text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
            {data.length} of {total} order{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <ViewPOModal
        open={isViewOpen}
        onClose={handleCloseView}
        po={viewingPO}
        isLoading={isViewLoading}
      />
    </>
  )
}