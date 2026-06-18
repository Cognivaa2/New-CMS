"use client"

import { useState, useEffect, useRef } from "react"
import {
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  Loader2,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import DeleteModal from "@/components/ui/DeleteModal"

function RowLabel({ text }) {
  return (
    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sfpro-bold mb-1 tracking-wide block uppercase lg:hidden">
      {text}
    </span>
  )
}

function UserCell({ user, label }) {
  if (!user) {
    return (
      <span className="text-[13px] text-gray-400 dark:text-[#5f5f5f] font-sfpro italic">
        Not Available
      </span>
    )
  }

  const isObject = typeof user === "object" && user !== null
  const name = isObject ? user.name || user.keycloakId || "—" : user
  const role = isObject ? user.role || "" : ""
  const avatar = isObject ? user.avatar || user.avatarUrl || null : null

  return (
    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
      <div className="w-8 h-8 shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-gray-700 shadow-sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#27272a] flex items-center justify-center border border-gray-200 dark:border-gray-700 shrink-0">
            <span className="text-[11px] font-sfpro-bold text-gray-500 dark:text-gray-400">
              {String(name).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        {label && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-sfpro-bold lg:hidden">
            {label}
          </span>
        )}
        <span className="text-[13px] font-sfpro-bold text-gray-900 dark:text-gray-200 truncate">
          {name}
        </span>
        {role && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight">
            {role}
          </span>
        )}
      </div>
    </div>
  )
}

function StatusPill({ isActive }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-medium uppercase tracking-wider transition-colors whitespace-nowrap ${isActive
        ? "bg-[#f0faf0] dark:bg-[#1a2e1a] text-[#16a34a] dark:text-[#4ade80] border-[#16a34a]/30"
        : "bg-[#fff1f1] dark:bg-[#2e1a1a] text-[#dc2626] dark:text-[#f87171] border-[#dc2626]/30"
        }`}
    >
      {isActive ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      ) : (
        <XCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      )}
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}

function UnitBadge({ unit }) {
  return (
    <span className="inline-flex items-center justify-center w-fit px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#27272a] text-[12px] font-sfpro-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
      {unit || "—"}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2 w-full">
          <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        </div>
        <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-[#27272a]" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        {[1, 2].map((n) => (
          <div key={n} className="space-y-2">
            <div className="h-3 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-[#27272a] rounded" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div
      className="grid gap-4 px-6 py-4 items-center border-b border-gray-50 dark:border-gray-800/50"
      style={{
        gridTemplateColumns: "1.4fr 2fr 140px 140px 90px 160px 180px 120px 70px",
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <ClipboardList className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No master list items yet
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Add your first item to start managing your master list.
        </p>
      </div>
    </div>
  )
}

function LoadMoreTrigger({ pagination, isLoadingMore, onLoadMore }) {
  const ref = useRef(null)
  const isLoadingMoreRef = useRef(isLoadingMore)
  isLoadingMoreRef.current = isLoadingMore

  const hasMore =
    pagination?.hasNext ||
    (pagination?.page != null &&
      pagination?.totalPages != null &&
      pagination.page < pagination.totalPages)

  useEffect(() => {
    const el = ref.current
    if (!el || !hasMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
          onLoadMore()
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  if (!hasMore && !isLoadingMore) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="text-[12px] text-gray-300 dark:text-[#3f3f46] font-sfpro">
          All materials loaded
        </span>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex items-center justify-center py-6 min-h-px">
      {isLoadingMore && (
        <div className="flex items-center gap-2 text-gray-400 dark:text-[#71717a]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[13px] font-sfpro">Loading more...</span>
        </div>
      )}
    </div>
  )
}

export default function MaterialTable({
  data = [],
  pagination,
  isRefreshing = false,
  isLoadingMore = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onLoadMore,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isInitialLoading = isRefreshing && data.length === 0

  const buildMenu = (row) => [
    {
      label: "Edit Material",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => onEdit?.(row),
    },
    {
      label: row.isActive ? "Deactivate" : "Activate",
      icon: row.isActive ? (
        <ToggleLeft className="w-4 h-4" />
      ) : (
        <ToggleRight className="w-4 h-4" />
      ),
      onClick: () => onToggleStatus?.(row),
    },
    "divider",
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => setDeleteTarget(row),
    },
  ]

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await onDelete?.(deleteTarget)
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (data.length === 0 && !isRefreshing) {
    return (
      <>
        <EmptyState />
        <DeleteModal
          isOpen={!!deleteTarget}
          onClose={() => !isDeleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title="Delete Material"
          description="Are you sure you want to delete this material? This action cannot be undone."
          itemName={deleteTarget?.name}
          isLoading={isDeleting}
        />
      </>
    )
  }

  return (
    <div className="w-full font-sfpro pb-10">

      <div className="lg:hidden space-y-4">
        {isInitialLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {data.map((row) => (
              <div
                key={row.id}
                className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <RowLabel text="Material Name" />
                    <p className="text-[15px] font-sfpro-bold text-gray-900 dark:text-white">
                      {row.name}
                    </p>
                  </div>
                  <ThreeDotMenu items={buildMenu(row)} size="sm" />
                </div>

                {row.description && (
                  <div className="mb-4">
                    <RowLabel text="Description" />
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {row.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <RowLabel text="Category" />
                    <span className="text-[13px] font-sfpro-bold text-gray-700 dark:text-gray-200">
                      {row.category || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <RowLabel text="SAC Number" />
                    <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-gray-200">
                      {row.sacNumber || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <RowLabel text="Unit" />
                    <UnitBadge unit={row.unit} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <UserCell user={row.createdBy} label="Created By" />
                  <StatusPill isActive={row.isActive} />
                </div>
              </div>
            ))}

            <LoadMoreTrigger
              pagination={pagination}
              isLoadingMore={isLoadingMore}
              onLoadMore={onLoadMore}
            />
          </>
        )}
      </div>

      <div className="hidden lg:block w-full rounded-3xl border border-gray-200 dark:border-[#272727] bg-white dark:bg-transparent overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div
              className="grid gap-4 px-6 py-4 bg-gray-50 dark:bg-[#1c1c1f] border-b border-gray-200 dark:border-[#272727] items-center text-[11px] font-sfpro-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              style={{
                gridTemplateColumns:
                  "1.4fr 2fr 140px 140px 90px 160px 180px 120px 70px",
              }}
            >
              <div>Material</div>
              <div>Description</div>
              <div>SAC</div>
              <div>Category</div>
              <div>Unit</div>
              <div>Status</div>
              <div>Created By</div>
              <div>Created At</div>
              <div className="text-center">Action</div>
            </div>

            {/* Rows */}
            <div className="flex flex-col">
              {isInitialLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
              ) : (
                data.map((row, index) => (
                  <div
                    key={row.id}
                    className={`grid gap-4 px-6 py-2 items-center border-b border-gray-50 dark:border-gray-800/50 hover:bg-[#fafafa] dark:hover:bg-[#131313] transition-colors ${index === data.length - 1 ? "border-b-0" : ""
                      }`}
                    style={{
                      gridTemplateColumns:
                        "1.4fr 2fr 140px 140px 90px 160px 180px 120px 70px",
                    }}
                  >
                    <span className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white truncate">
                      {row.name}
                    </span>
                    <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate pr-2">
                      {row.description || "Not provided"}
                    </span>
                    <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
                      {row.sacNumber || "Not provided"}
                    </span>
                    <span className="text-[13px] font-sfpro-bold text-gray-700 dark:text-gray-200">
                      {row.category || "Not provided"}
                    </span>
                    <div className="flex items-center">
                      <UnitBadge unit={row.unit} />
                    </div>
                    <div className="flex items-center">
                      <StatusPill isActive={row.isActive} />
                    </div>
                    <UserCell user={row.createdBy} />
                    <span className="text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "—"}
                    </span>
                    <div className="flex justify-center items-center">
                      <ThreeDotMenu items={buildMenu(row)} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {!isInitialLoading && data.length > 0 && (
          <LoadMoreTrigger
            pagination={pagination}
            isLoadingMore={isLoadingMore}
            onLoadMore={onLoadMore}
          />
        )}
      </div>

      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Material"
        description="Are you sure you want to delete this material? This action cannot be undone."
        itemName={deleteTarget?.name}
        isLoading={isDeleting}
      />
    </div>
  )
}