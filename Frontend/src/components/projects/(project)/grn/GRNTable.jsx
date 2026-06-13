// GRNTable.jsx — Pagination → LoadMoreTrigger
"use client"

import { useState, useEffect, useRef } from "react"
import {
  FileText, Eye, Edit, Trash2, Download,
  Paperclip, ImageIcon,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import GRNDetailsDrawer from "./GRNDetailsDrawer"
import GRNAttachmentDrawer from "./GRNAttachmentDrawer"

const HEADERS = [
  "GRN No.", "PO No.", "Vendor", "Materials", "Amount",
  "Recv. Qty", "Attachment", "Delivery Date", "Challan No.",
  "Received By", "Created At", "Actions",
]

function NA() {
  return (
    <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
      Not available
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

function UserCell({ user }) {
  if (!user) return <NA />
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <UserAvatar user={user} size={30} />
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</span>
        {user.role && (
          <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">{user.role}</span>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <FileText className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No goods received yet</p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">Create your first GRN for an approved PO.</p>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">{label}</span>
      <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-word">
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
        <div className="h-6 w-6 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(n => (
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
        <td key={i} className="px-5 py-4">
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
function GRNCard({ row, menuItems, onClick }) {
  return (
    <div
      onClick={() => onClick?.(row)}
      className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">{row.grnNumber || <NA />}</p>
          <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">
            {row.vendorName || "—"} · PO: {row.poNumber || "—"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {row.attachment && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                menuItems.find(i => i.label === "View Attachment")?.onClick?.()
              }}
              className="h-7 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[11px] font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all duration-150 flex items-center gap-1"
            >
              <ImageIcon className="w-3 h-3" />
              View Image
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <ThreeDotMenu
              items={menuItems} size="md"
              header={{ title: row.grnNumber, subtitle: row.vendorName, statusColor: "#22c55e" }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <DetailRow label="Materials">
          {row.materials ? <span className="line-clamp-2 leading-snug font-sfpro">{row.materials}</span> : <NA />}
        </DetailRow>
        <DetailRow label="Delivery Date">{row.deliveryDateFormatted || <NA />}</DetailRow>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
        <DetailRow label="Challan">{row.deliveryChallanNumber || <NA />}</DetailRow>
        <DetailRow label="Created At">{row.createdAt || <NA />}</DetailRow>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">Received By</span>
          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            {row.createdBy
              ? <><UserAvatar user={row.createdBy} size={22} /><span className="text-[12px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8] truncate">{row.createdBy.name}</span></>
              : <NA />}
          </div>
        </div>
      </div>
    </div>
  )
}

function GRNRow({ row, menuItems, isLast, onRowClick }) {
  return (
    <tr
      onClick={() => onRowClick?.(row)}
      className={`cursor-pointer group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""
        }`}
    >
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {row.grnNumber
            ? <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white">{row.grnNumber}</span>
            : <NA />}
          {row.attachment && <Paperclip className="w-4 h-4 text-blue-700 dark:text-blue-500" />}
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.poNumber
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.poNumber}</span>
          : <NA />}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.vendorName
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.vendorName}</span>
          : <NA />}
      </td>
      <td className="px-5 py-4">
        {row.materials
          ? <p className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate max-w-50">{row.materials}</p>
          : <NA />}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.totalAmount !== null && row.totalAmount !== undefined
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
            ₹{Number(row.totalAmount).toLocaleString("en-IN")}
          </span>
          : <NA />}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
          {row.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
        </span>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.attachment ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              menuItems.find(i => i.label === "View Attachment")?.onClick?.()
            }}
            className="cursor-pointer h-7 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-sfpro-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all flex items-center gap-1"
          >
            View Image
          </button>
        ) : (
          <span className="italic text-[12px] font-sfpro text-[#a1a1aa] dark:text-[#71717a]">No Attachment</span>
        )}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.deliveryDateFormatted
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.deliveryDateFormatted}</span>
          : <NA />}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.deliveryChallanNumber
          ? <span className="text-[13px] font-sfpro text-gray-500 dark:text-[#a1a1aa]">{row.deliveryChallanNumber}</span>
          : <NA />}
      </td>
      <td className="px-5 py-4 whitespace-nowrap"><UserCell user={row.createdBy} /></td>
      <td className="px-5 py-4 whitespace-nowrap">
        {row.createdAt
          ? <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">{row.createdAt}</span>
          : <NA />}
      </td>
      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <ThreeDotMenu
            items={menuItems} size="sm"
            header={{ title: row.grnNumber, subtitle: row.vendorName, statusColor: "#22c55e" }}
          />
        </div>
      </td>
    </tr>
  )
}

export default function GRNTable({
  data = [],
  isLoading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onEdit,
  onDelete,
  onExportPdf,
  projectId,
  total = 0,
}) {
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState(null)

  const handleOpenDetails = (row) => { setSelectedGRN(row); setDetailsOpen(true) }
  const handleCloseDetails = () => { setDetailsOpen(false); setTimeout(() => setSelectedGRN(null), 300) }

  const handleOpenAttachment = (row) => {
    if (!row?.attachment) return
    setSelectedGRN(row)
    setSelectedAttachment(row.attachment)
    setAttachmentOpen(true)
  }

  const buildMenuItems = (row) => {
    const items = [
      { label: "View Details", icon: <Eye className="w-4 h-4" />, onClick: () => handleOpenDetails(row) },
      ...(row.attachment ? [{ label: "View Attachment", icon: <ImageIcon className="w-4 h-4" />, onClick: () => handleOpenAttachment(row) }] : []),
      { label: "Edit GRN", icon: <Edit className="w-4 h-4" />, onClick: () => onEdit?.(row) },
      { label: "Export PDF", icon: <Download className="w-4 h-4" />, onClick: () => onExportPdf?.(row) },
    ]
    items.push("divider")
    items.push({ label: "Delete", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => onDelete?.(row) })
    return items
  }

  return (
    <div className="w-full font-sfpro pb-10">
      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : data.length === 0
            ? <EmptyState />
            : <>
              {data.map(row => (
                <GRNCard
                  key={row.id}
                  row={row}
                  menuItems={buildMenuItems(row)}
                  onClick={handleOpenDetails}
                />
              ))}
              <LoadMoreTrigger
                onLoadMore={onLoadMore}
                loadingMore={loadingMore}
                hasMore={hasMore}
              />
            </>
        }
      </div>

      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-250 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                {HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className="px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase"
                  >
                    {h}
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
                    <GRNRow
                      key={row.id}
                      row={row}
                      menuItems={buildMenuItems(row)}
                      isLast={index === data.length - 1}
                      onRowClick={handleOpenDetails}
                    />
                  ))
              }
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
          {data.length} of {total} GRN{total !== 1 ? "s" : ""}
        </p>
      )}

      <GRNDetailsDrawer
        open={detailsOpen}
        onClose={handleCloseDetails}
        grn={selectedGRN}
        projectId={projectId}
      />

      {selectedAttachment && (
        <GRNAttachmentDrawer
          open={attachmentOpen}
          onClose={() => { setAttachmentOpen(false); setTimeout(() => setSelectedAttachment(null), 300) }}
          attachment={selectedAttachment}
          grnNumber={selectedGRN?.grnNumber || ""}
        />
      )}
    </div>
  )
}