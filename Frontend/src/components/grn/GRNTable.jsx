"use client"

import { useState, useEffect, useRef } from "react"
import { FileText } from "lucide-react"

const NA = "Not Available"

const getKey = (h) => h.toLowerCase().replace(/\s+/g, "")


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

function AmountCell({ value }) {
  if (!value || value === NA) return <NACell />
  return (
    <span className="text-[13px] font-sfpro-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap tabular-nums">
      {value}
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
    case "grnid":
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[13px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
          {value}
        </span>
      )

    case "ponumber":
    case "mrnumber":
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[13px] font-sfpro text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
          {value}
        </span>
      )

    case "project":
    case "vendor":
      return <TextCell value={value} className="max-w-45 truncate" />

    case "totalamount":
      return <AmountCell value={value} />

    case "challannumber":
      if (!value || value === NA) return <NACell />
      return (
        <span className="text-[13px] font-sfpro text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-mono">
          {value}
        </span>
      )

    case "requestedby":
      return <UserCell user={value} />

    case "remarks":
      if (!value || value === NA) return <NACell />
      return (
        <p
          title={value}
          className="text-[12px] font-sfpro text-zinc-500 dark:text-zinc-400 max-w-48 line-clamp-2 leading-relaxed"
        >
          {value}
        </p>
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
        <FileText className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-sfpro-medium text-zinc-600 dark:text-zinc-400">
          No GRN records found
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
            {row.grnid && row.grnid !== NA ? row.grnid : <NACell />}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {row.ponumber && row.ponumber !== NA ? (
              <span className="text-[12px] font-sfpro text-zinc-500 dark:text-zinc-400">
                {row.ponumber}
              </span>
            ) : null}
            {row.mrnumber && row.mrnumber !== NA ? (
              <span className="text-[12px] font-sfpro text-zinc-400 dark:text-zinc-500">
                • {row.mrnumber}
              </span>
            ) : null}
          </div>
        </div>
        {row.totalamount && row.totalamount !== NA ? (
          <span className="text-[14px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap tabular-nums shrink-0">
            {row.totalamount}
          </span>
        ) : (
          <NACell />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <CardField label="Project">
          {row.project && row.project !== NA ? row.project : <NACell />}
        </CardField>
        <CardField label="Vendor">
          {row.vendor && row.vendor !== NA ? row.vendor : <NACell />}
        </CardField>
        <CardField label="Total Items">
          {row.totalitems && row.totalitems !== NA ? row.totalitems : <NACell />}
        </CardField>
        <CardField label="Total Quantity">
          {row.totalquantity && row.totalquantity !== NA
            ? row.totalquantity
            : <NACell />}
        </CardField>
        <CardField label="Delivery Date">
          {row.deliverydate && row.deliverydate !== NA
            ? row.deliverydate
            : <NACell />}
        </CardField>
        <CardField label="Challan No.">
          {row.challannumber && row.challannumber !== NA ? (
            <span className="font-mono text-zinc-600 dark:text-zinc-400">
              {row.challannumber}
            </span>
          ) : (
            <NACell />
          )}
        </CardField>
        <CardField label="Created At">
          {row.createdat && row.createdat !== NA ? row.createdat : <NACell />}
        </CardField>
      </div>
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px] uppercase tracking-wider font-sfpro-bold text-zinc-400 dark:text-zinc-500">
          Requested By
        </span>
        <div className="mt-1.5">
          <UserCell user={row.requestedby} />
        </div>
      </div>

      {/* Remarks */}
      {row.remarks && row.remarks !== NA && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] uppercase tracking-wider font-sfpro-bold text-zinc-400 dark:text-zinc-500">
            Remarks
          </span>
          <p className="mt-1 text-[12px] font-sfpro text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
            {row.remarks}
          </p>
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {Array.from({ length: 7 }).map((_, i) => (
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
export default function GRNTable({
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

      <div className="hidden lg:block bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-350 border-collapse">
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