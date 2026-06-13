"use client"

import { useState, useEffect, useRef } from "react"
import {
  FileText,
  CheckCircle2,
  Send,
  XCircle,
  Clock,
  Ban,
  Hammer,
  Flag,
} from "lucide-react"

const STATUS_CONFIG = {
  Draft: {
    label: "Draft",
    icon: Clock,
    className:
      "text-zinc-600 bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  },
  Submitted: {
    label: "Submitted",
    icon: Send,
    className:
      "text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  Approved: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  Rejected: {
    label: "Rejected",
    icon: XCircle,
    className:
      "text-rose-600 bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  },
  InProgress: {
    label: "In Progress",
    icon: Hammer,
    className:
      "text-orange-600 bg-orange-50 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  },
  Completed: {
    label: "Completed",
    icon: Flag,
    className:
      "text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  Cancelled: {
    label: "Cancelled",
    icon: Ban,
    className:
      "text-zinc-600 bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  },
}

const NA = "Not Available"
const getKey = (h) => h.toLowerCase().replace(/\s+/g, "")

function NACell() {
  return (
    <span className="text-[12px] italic text-zinc-400 dark:text-zinc-600 opacity-60">
      Not Available
    </span>
  )
}

function TextCell({ value, className = "" }) {
  if (!value || value === NA) return <NACell />
  return (
    <p
      title={value}
      className={`text-[13px] font-sfpro text-zinc-700 dark:text-zinc-300 ${className}`}
    >
      {value}
    </p>
  )
}

function StatusBadge({ status }) {
  if (!status || status === NA) return <NACell />
  const config = STATUS_CONFIG[status]
  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold whitespace-nowrap text-zinc-600 bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
        {status}
      </span>
    )
  }
  const Icon = config.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {config.label}
    </span>
  )
}

function UserAvatar({ user, size = 28 }) {
  const [imgError, setImgError] = useState(false)
  const hasAvatar = user?.avatar && !imgError
  if (hasAvatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || "User"}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-sfpro-bold text-zinc-600 dark:text-zinc-300 shrink-0"
    >
      {initials}
    </div>
  )
}

function UserCell({ user }) {
  if (!user || typeof user !== "object") return <NACell />
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <UserAvatar user={user} size={28} />
      <div className="min-w-0">
        <p className="text-[13px] font-sfpro-medium text-zinc-800 dark:text-zinc-100 truncate">
          {user.name || "Not Available"}
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
          {user.role || user.email || "Not Available"}
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
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, loadingMore])

  return (
    <div ref={ref} className="flex items-center justify-center py-6 min-h-px">
      {hasMore && loadingMore && (
        <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
          <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
          <span className="text-[13px] font-sfpro">Loading more…</span>
        </div>
      )}
      {!hasMore && !loadingMore && (
        <span className="text-[12px] text-zinc-300 dark:text-zinc-700 font-sfpro">
          All records loaded
        </span>
      )}
    </div>
  )
}

function TableHeader({ headers }) {
  return (
    <thead>
      <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        {headers.map((h, i) => (
          <th
            key={i}
            className="text-left px-6 py-4 text-[11px] font-sfpro-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function renderCell(row, header) {
  const key = getKey(header)
  const value = row[key]

  switch (key) {
    case "status":
      return <StatusBadge status={value} />
    case "createdby":
    case "approvedby":
      return <UserCell user={value} />
    case "title":
      return (
        <TextCell value={value} className="max-w-60 line-clamp-2 leading-snug" />
      )
    case "project":
    case "vendor":
      return <TextCell value={value} className="max-w-45 truncate" />
    case "woid":
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[13px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
          {value}
        </span>
      )
    default:
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[13px] font-sfpro text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
          {value}
        </span>
      )
  }
}

function TableRow({ row, headers }) {
  return (
    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
      {headers.map((h, j) => (
        <td key={j} className="px-6 py-4 align-middle">
          {renderCell(row, h)}
        </td>
      ))}
    </tr>
  )
}

function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center">
        <FileText className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-sfpro-medium text-zinc-600 dark:text-zinc-400">
          No work orders found
        </p>
        <p className="text-sm font-sfpro text-zinc-400 dark:text-zinc-500">
          Try adjusting your filters or search query
        </p>
      </div>
    </div>
  )
}

function CardField({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider font-sfpro-bold text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <div className="text-[13px] font-sfpro text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </div>
  )
}

function MobileCard({ row }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 truncate">
            {row.woid || "Not Available"}
          </p>
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
            {row.title && row.title !== NA ? row.title : "Not Available"}
          </p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={row.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <CardField label="Project">
          {row.project && row.project !== NA ? row.project : <NACell />}
        </CardField>
        <CardField label="Vendor">
          {row.vendor && row.vendor !== NA ? row.vendor : <NACell />}
        </CardField>
        <CardField label="Contract Value">
          {row.contractvalue && row.contractvalue !== NA ? row.contractvalue : <NACell />}
        </CardField>
        <CardField label="Completion">
          {row.completion && row.completion !== NA ? row.completion : <NACell />}
        </CardField>
        <CardField label="Start Date">
          {row.startdate && row.startdate !== NA ? row.startdate : <NACell />}
        </CardField>
        <CardField label="Expected End">
          {row.expectedenddate && row.expectedenddate !== NA ? row.expectedenddate : <NACell />}
        </CardField>
        <CardField label="Created At">
          {row.createdat && row.createdat !== NA ? row.createdat : <NACell />}
        </CardField>
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px] uppercase tracking-wider font-sfpro-bold text-zinc-400 dark:text-zinc-500">
          Created By
        </span>
        <div className="mt-1.5">
          <UserCell user={row.createdby} />
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-14 bg-zinc-100 dark:bg-zinc-800 rounded" />
            <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WOTable({
  headers = [],
  data = [],
  isLoading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}) {
  return (
    <>
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : !data.length ? (
          <EmptyState />
        ) : (
          <>
            {data.map((row) => (
              <MobileCard key={row.id} row={row} />
            ))}
            <LoadMoreTrigger
              onLoadMore={onLoadMore}
              loadingMore={loadingMore}
              hasMore={hasMore}
            />
          </>
        )}
      </div>

      <div className="hidden lg:block bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-300 border-collapse">
            <TableHeader headers={headers} />
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={headers.length} />
                ))
              ) : !data.length ? (
                <tr>
                  <td colSpan={headers.length}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} row={row} headers={headers} />
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
    </>
  )
}