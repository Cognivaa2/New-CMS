"use client"

import { useState, useEffect, useRef } from "react"
import {
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Star,
} from "lucide-react"

const STOCK_STATUS_CONFIG = {
  Critical: {
    label: "Critical",
    icon: AlertTriangle,
    className:
      "text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  Low: {
    label: "Low",
    icon: AlertCircle,
    className:
      "text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  Good: {
    label: "Good",
    icon: CheckCircle2,
    className:
      "text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  Excellent: {
    label: "Excellent",
    icon: Star,
    className:
      "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
}

const NA = "Not Available"
const getKey = (h) => h.toLowerCase().replace(/\s+/g, "").replace("/", "")

function NACell() {
  return (
    <span className="text-[12px] italic text-zinc-300 dark:text-zinc-600 select-none opacity-50">
      Not Available
    </span>
  )
}

function TextCell({ value, className = "", title }) {
  if (!value || value === NA) return <NACell />
  return (
    <p
      title={title || value}
      className={`text-[13px] font-sfpro text-zinc-700 dark:text-zinc-300 ${className}`}
    >
      {value}
    </p>
  )
}

function NumericCell({ value }) {
  if (!value || value === NA) return <NACell />
  return (
    <span className="text-[13px] font-sfpro-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap tabular-nums">
      {value}
    </span>
  )
}

function StockStatusBadge({ status }) {
  if (!status || status === NA) return <NACell />
  const config = STOCK_STATUS_CONFIG[status]
  if (!config) return <TextCell value={status} />
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
          {user.role || user.email || ""}
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
        if (entries[0].isIntersecting && !loadingMore) onLoadMore()
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
    case "name":
      if (!value || value === NA) return <NACell />
      return (
        <p
          title={value}
          className="text-[13px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 max-w-48 truncate"
        >
          {value}
        </p>
      )

    case "category":
      if (!value || value === NA) return <NACell />
      return (
        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap text-zinc-600 bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
          {value}
        </span>
      )

    case "project":
      return <TextCell value={value} className="max-w-40 truncate" />

    case "unit":
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[12px] font-sfpro-medium text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">
          {value}
        </span>
      )

    case "stockstatus":
      return <StockStatusBadge status={value} />

    case "priceperunit":
    case "stockvalue":
      return <NumericCell value={value} />

    case "currentstock":
    case "minimumlevel":
    case "totalreceived":
    case "totalconsumed":
      return <NumericCell value={value} />

    case "supplier":
      return <TextCell value={value} className="max-w-36 truncate" />

    case "createdby":
      return <UserCell user={value} />

    case "lastrestocked":
    case "createdat":
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[13px] font-sfpro text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
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
    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      {headers.map((h, j) => (
        <td key={j} className="px-6 py-2 align-middle">
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
        <Package className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-sfpro-medium text-zinc-600 dark:text-zinc-400">
          No inventory items found
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
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 truncate">
            {row.name && row.name !== NA ? row.name : <NACell />}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {row.category && row.category !== NA && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-sfpro-bold uppercase tracking-wide text-zinc-500 bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                {row.category}
              </span>
            )}
            {row.unit && row.unit !== NA && (
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                {row.unit}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <StockStatusBadge status={row.stockstatus} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <CardField label="Project">
          {row.project && row.project !== NA ? row.project : <NACell />}
        </CardField>
        <CardField label="Supplier">
          {row.supplier && row.supplier !== NA ? row.supplier : <NACell />}
        </CardField>
        <CardField label="Current Stock">
          {row.currentstock && row.currentstock !== NA
            ? <span className="tabular-nums font-sfpro-medium">{row.currentstock}</span>
            : <NACell />}
        </CardField>
        <CardField label="Min. Level">
          {row.minimumlevel && row.minimumlevel !== NA
            ? <span className="tabular-nums">{row.minimumlevel}</span>
            : <NACell />}
        </CardField>
        <CardField label="Price / Unit">
          {row.priceperunit && row.priceperunit !== NA
            ? <span className="tabular-nums font-sfpro-medium">{row.priceperunit}</span>
            : <NACell />}
        </CardField>
        <CardField label="Stock Value">
          {row.stockvalue && row.stockvalue !== NA
            ? <span className="tabular-nums font-sfpro-medium text-zinc-800 dark:text-zinc-200">{row.stockvalue}</span>
            : <NACell />}
        </CardField>
        <CardField label="Total Received">
          {row.totalreceived && row.totalreceived !== NA
            ? <span className="tabular-nums">{row.totalreceived}</span>
            : <NACell />}
        </CardField>
        <CardField label="Total Consumed">
          {row.totalconsumed && row.totalconsumed !== NA
            ? <span className="tabular-nums">{row.totalconsumed}</span>
            : <NACell />}
        </CardField>
        <CardField label="Last Restocked">
          {row.lastrestocked && row.lastrestocked !== NA
            ? row.lastrestocked
            : <NACell />}
        </CardField>
        <CardField label="Created At">
          {row.createdat && row.createdat !== NA ? row.createdat : <NACell />}
        </CardField>
      </div>

      {/* Created By */}
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
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
            <div className="h-5 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="h-6 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-14 bg-zinc-100 dark:bg-zinc-800 rounded" />
            <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="h-2.5 w-20 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
          <div className="space-y-1">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-2.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InventoryTable({
  headers = [],
  data = [],
  isLoading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}) {
  return (
    <>
      {/* Mobile */}
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
      <div className="hidden lg:block bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-400 border-collapse">
            <TableHeader headers={headers} />
            <tbody>
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