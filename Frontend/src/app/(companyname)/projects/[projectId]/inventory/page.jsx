"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
  fetchAllInventory,
  deleteInventoryItem,
  formatToastError,
  fetchAllStockAdjustments,
  submitStockAdjustment,
  approveStockAdjustment,
  rejectStockAdjustment,
  getCurrentUserKeycloakId,
} from "./api"

import InventoryPageHeader from "@/components/projects/(project)/inventory/PageHeader"
import InventoryRow from "@/components/projects/(project)/inventory/InventoryRow"
import AddMaterialModal from "@/components/projects/(project)/inventory/AddMaterialModal"
import EditInventoryModal from "@/components/projects/(project)/inventory/EditInventoryModal"
import StockAdjustmentModal from "@/components/projects/(project)/inventory/StockAdjustmentModal"
import StockAdjustmentTable from "@/components/projects/(project)/inventory/StockAdjustmentTable"
import DeleteModal from "@/components/ui/DeleteModal"
import RejectModal from "@/components/ui/RejectModal"
import InventoryLoading from "./loading"
import SummaryCard from "@/components/ui/SummaryCard"

function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const ITEMS_PER_PAGE = 20
const SA_PER_PAGE = 15
const TABS = ["Inventory", "Stock Adjustments"]

export default function InventoryPage() {
  const { projectId } = useParams()

  const [activeTab, setActiveTab] = useState("Inventory")

  const [allItems, setAllItems] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  })
  const [filters, setFilters] = useState({
    search: "",
    stockStatus: undefined,
    sortBy: "createdAt",
    order: "desc",
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [adjustingItem, setAdjustingItem] = useState(null)

  const controllerRef = useRef(null)
  const sentinelRef = useRef(null)
  const isInitialLoadRef = useRef(true)
  const fetchLockRef = useRef(false)
  const hasMoreRef = useRef(false)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const [saList, setSaList] = useState([])
  const [saPagination, setSaPagination] = useState({
    total: 0,
    page: 1,
    limit: SA_PER_PAGE,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })
  const [saIsLoading, setSaIsLoading] = useState(false)
  const [saIsLoadingMore, setSaIsLoadingMore] = useState(false)
  const [saHasMore, setSaHasMore] = useState(false)
  const [saCurrentPage, setSaCurrentPage] = useState(1)
  const saControllerRef = useRef(null)
  const saSentinelRef = useRef(null)
  const saFetchLockRef = useRef(false)

  const [rejectTarget, setRejectTarget] = useState(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const debouncedSetSearch = useRef(
    debounce(
      (query) => setFilters((prev) => ({ ...prev, search: query })),
      400
    )
  ).current

  const summaryCards = useMemo(() => {
    const total = pagination.total
    const critical = allItems.filter((i) => i.stockStatus === "Critical").length
    const low = allItems.filter((i) => i.stockStatus === "Low").length
    const excellent = allItems.filter(
      (i) => i.stockStatus === "Excellent"
    ).length
    return [
      {
        id: 1,
        title: "Total Materials",
        value: String(total),
        subtitle: "In this project",
        colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
      },
      {
        id: 2,
        title: "Critical Stock",
        value: String(critical),
        subtitle: "Needs immediate restock",
        colorClass: "bg-[#eef5fc] dark:bg-[#1e1e2e]",
      },
      {
        id: 3,
        title: "Low Stock",
        value: String(low),
        subtitle: "Below minimum level",
        colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
      },
      {
        id: 4,
        title: "Excellent Stock",
        value: String(excellent),
        subtitle: "Well stocked items",
        colorClass: "bg-[#eef5fc] dark:bg-[#1e1e2e]",
      },
    ]
  }, [allItems, pagination.total])

  const loadInventory = useCallback(
    async (page = 1, append = false) => {
      if (!projectId || fetchLockRef.current) return
      fetchLockRef.current = true
      if (controllerRef.current) controllerRef.current.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const activeFilters = filtersRef.current
      try {
        if (!isInitialLoadRef.current && !append) setIsRefreshing(true)
        if (append) setIsLoadingMore(true)
        const { inventory, pagination: pag } = await fetchAllInventory({
          projectId,
          page,
          limit: ITEMS_PER_PAGE,
          search: activeFilters.search,
          stockStatus: activeFilters.stockStatus,
          sortBy: activeFilters.sortBy,
          order: activeFilters.order,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setAllItems((prev) => (append ? [...prev, ...inventory] : inventory))
        setPagination(pag)
        hasMoreRef.current = pag.page < pag.totalPages
      } catch (err) {
        if (err.name !== "CanceledError") {
          toast.error("Failed to load inventory", {
            description: formatToastError(err),
          })
          if (!append) setAllItems([])
        }
      } finally {
        isInitialLoadRef.current = false
        setIsInitialLoad(false)
        setIsRefreshing(false)
        setIsLoadingMore(false)
        fetchLockRef.current = false
        controllerRef.current = null
      }
    },
    [projectId]
  )

  useEffect(() => {
    if (activeTab === "Inventory") {
      loadInventory(1, false)
    }
    return () => controllerRef.current?.abort()
  }, [activeTab, filters.search, filters.stockStatus, filters.sortBy, filters.order, loadInventory])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasMoreRef.current &&
          !isLoadingMore &&
          !fetchLockRef.current
        ) {
          loadInventory(pagination.page + 1, true)
        }
      },
      { root: null, rootMargin: "100px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadInventory, isLoadingMore, pagination.page])

  const loadAdjustments = useCallback(
    async (page = 1, append = false) => {
      if (!projectId || saFetchLockRef.current) return
      saFetchLockRef.current = true
      if (saControllerRef.current) saControllerRef.current.abort()
      const controller = new AbortController()
      saControllerRef.current = controller
      try {
        if (!append) setSaIsLoading(true)
        else setSaIsLoadingMore(true)
        const { adjustments, pagination: pag } = await fetchAllStockAdjustments({
          projectId,
          page,
          limit: SA_PER_PAGE,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setSaList((prev) => (append ? [...prev, ...adjustments] : adjustments))
        setSaPagination(pag)
        setSaCurrentPage(pag.page)
        setSaHasMore(pag.page < pag.totalPages)
      } catch (err) {
        if (err.name !== "CanceledError") {
          toast.error("Failed to load adjustments", {
            description: formatToastError(err),
          })
          if (!append) setSaList([])
        }
      } finally {
        setSaIsLoading(false)
        setSaIsLoadingMore(false)
        saFetchLockRef.current = false
        saControllerRef.current = null
      }
    },
    [projectId]
  )

  useEffect(() => {
    if (activeTab === "Stock Adjustments") {
      loadAdjustments(1, false)
    }
    return () => saControllerRef.current?.abort()
  }, [activeTab, loadAdjustments])


  useEffect(() => {
    const sentinel = saSentinelRef.current
    if (!sentinel || activeTab !== "Stock Adjustments") return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          saHasMore &&
          !saIsLoadingMore &&
          !saFetchLockRef.current
        ) {
          loadAdjustments(saCurrentPage + 1, true)
        }
      },
      { root: null, rootMargin: "100px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, loadAdjustments, saIsLoadingMore, saCurrentPage, saHasMore])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      saControllerRef.current?.abort()
    }
  }, [])

  const handleSearch = useCallback(
    (query) => debouncedSetSearch(query),
    [debouncedSetSearch]
  )

  const handleFilterChange = useCallback((selectedFilters) => {
    const updates = {}
    if (selectedFilters?.stockStatus?.length > 0) {
      updates.stockStatus =
        selectedFilters.stockStatus[selectedFilters.stockStatus.length - 1]
    } else {
      updates.stockStatus = undefined
    }
    if (selectedFilters?.sortBy?.length > 0)
      updates.sortBy =
        selectedFilters.sortBy[selectedFilters.sortBy.length - 1]
    setFilters((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleAddSuccess = useCallback((newItem) => {
    setAllItems((prev) => [newItem, ...prev])
    setPagination((prev) => ({ ...prev, total: prev.total + 1 }))
  }, [])

  const handleEditSuccess = useCallback((updatedItem) => {
    setAllItems((prev) =>
      prev.map((i) =>
        i.inventoryId === updatedItem.inventoryId ? updatedItem : i
      )
    )
  }, [])

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setIsDeleting(true)
    try {
      await deleteInventoryItem(projectId, deletingItem.inventoryId)
      toast.success("Item Deleted", {
        description: `"${deletingItem.name}" has been removed from inventory.`,
      })
      setAllItems((prev) =>
        prev.filter((i) => i.inventoryId !== deletingItem.inventoryId)
      )
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      setDeletingItem(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAdjustStockSuccess = useCallback(
    (result) => {
      loadInventory(1, false)
      setAdjustingItem(null)
    },
    [loadInventory]
  )

  const handleSubmit = useCallback(
    async (row) => {
      const keycloakId = getCurrentUserKeycloakId()
      if (!keycloakId) {
        toast.error("Auth error", {
          description: "Could not determine current user.",
        })
        return
      }
      setActionLoading((prev) => ({ ...prev, [row._id]: "submitting" }))
      try {
        await submitStockAdjustment(projectId, row._id, keycloakId)
        toast.success("Submitted", {
          description: `${row.saNumber} submitted for approval.`,
        })
        setSaList((prev) =>
          prev.map((sa) =>
            sa._id === row._id ? { ...sa, status: "Submitted" } : sa
          )
        )
      } catch (err) {
        toast.error("Submit Failed", { description: formatToastError(err) })
      } finally {
        setActionLoading((prev) => {
          const n = { ...prev }
          delete n[row._id]
          return n
        })
      }
    },
    [projectId]
  )

  const handleApprove = useCallback(
    async (row) => {
      const keycloakId = getCurrentUserKeycloakId()
      if (!keycloakId) {
        toast.error("Auth error", {
          description: "Could not determine current user.",
        })
        return
      }
      setActionLoading((prev) => ({ ...prev, [row._id]: "approving" }))
      try {
        await approveStockAdjustment(projectId, row._id, keycloakId)
        toast.success("Approved", {
          description: `${row.saNumber} approved. Stock has been updated.`,
        })
        setSaList((prev) =>
          prev.map((sa) =>
            sa._id === row._id ? { ...sa, status: "Approved" } : sa
          )
        )
      } catch (err) {
        toast.error("Approval Failed", { description: formatToastError(err) })
      } finally {
        setActionLoading((prev) => {
          const n = { ...prev }
          delete n[row._id]
          return n
        })
      }
    },
    [projectId]
  )

  const handleRejectOpen = useCallback((row) => setRejectTarget(row), [])

  const handleRejectConfirm = async (remarks) => {
    if (!rejectTarget) return
    const keycloakId = getCurrentUserKeycloakId()
    if (!keycloakId) {
      toast.error("Auth error", {
        description: "Could not determine current user.",
      })
      return
    }
    setIsRejecting(true)
    try {
      await rejectStockAdjustment(
        projectId,
        rejectTarget._id,
        keycloakId,
        remarks
      )
      toast.success("Rejected", {
        description: `${rejectTarget.saNumber} has been rejected.`,
      })
      setSaList((prev) =>
        prev.map((sa) =>
          sa._id === rejectTarget._id
            ? { ...sa, status: "Rejected", rejectionRemarks: remarks }
            : sa
        )
      )
      setRejectTarget(null)
    } catch (err) {
      toast.error("Rejection Failed", { description: formatToastError(err) })
    } finally {
      setIsRejecting(false)
    }
  }

  if (isInitialLoad) return <InventoryLoading />

  return (
    <div className="w-full  mx-auto py-8 px-4 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300">
      <InventoryPageHeader
        total={pagination.total}
        count={allItems.length}
        isRefreshing={isRefreshing}
        onSearch={activeTab === "Inventory" ? handleSearch : undefined}
        onFilterChange={activeTab === "Inventory" ? handleFilterChange : undefined}
        onAddMaterial={activeTab === "Inventory" ? () => setIsAddOpen(true) : undefined}
        activeTab={activeTab}
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide rounded-2xl bg-[#f7f7f7] dark:bg-[#18181b] p-1.5 border border-[#ececec] dark:border-[#252525] w-fit">
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative h-10 px-4 sm:px-5 rounded-xl text-sm font-sfpro-medium transition-all whitespace-nowrap border ${isActive
                ? "bg-[#212121] text-white border-[#212121] shadow-sm dark:bg-white dark:text-black dark:border-white"
                : "bg-white text-[#3f3f46] border-transparent hover:bg-[#fafafa] hover:border-[#e5e7eb] dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:hover:bg-[#262626] dark:hover:border-[#3f3f46]"
                }`}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {activeTab === "Inventory" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.id} item={card} />
            ))}
          </div>
          <div className="space-y-3">
            {allItems.length === 0 && !isRefreshing ? (
              <div className="py-20 text-center">
                <p className="text-[15px] text-gray-400 dark:text-[#71717a] font-sfpro">
                  No inventory items found.
                </p>
                <p className="text-sm text-gray-300 dark:text-[#52525b] mt-1 font-sfpro">
                  Add your first material to get started.
                </p>
              </div>
            ) : (
              allItems.map((item) => (
                <InventoryRow
                  key={item.inventoryId}
                  item={item}
                  onEdit={(i) => setEditingItem(i)}
                  onDelete={(i) => setDeletingItem(i)}
                  onAdjust={(i) => setAdjustingItem(i)}
                />
              ))
            )}
          </div>
          <div
            ref={sentinelRef}
            className="w-full py-4 flex flex-col items-center justify-center"
          >
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-sfpro">Loading more...</span>
              </div>
            )}
            {!isLoadingMore &&
              !hasMoreRef.current &&
              allItems.length > ITEMS_PER_PAGE && (
                <p className="text-sm text-gray-400 dark:text-[#52525b] font-sfpro">
                  All {pagination.total} items loaded
                </p>
              )}
          </div>
        </>
      )}

      {activeTab === "Stock Adjustments" && (
        <>
          <StockAdjustmentTable
            data={saList}
            isLoading={saIsLoading}
            onSubmit={handleSubmit}
            onApprove={handleApprove}
            onReject={handleRejectOpen}
            onEdit={(row) => {
              toast.info("Edit not available", {
                description: "Contact your administrator to edit this adjustment.",
              })
            }}
            actionLoading={actionLoading}
            pagination={saPagination}
            onPageChange={(page) => loadAdjustments(page, false)}
          />
          <div
            ref={saSentinelRef}
            className="w-full py-4 flex flex-col items-center justify-center"
          >
            {saIsLoadingMore && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-sfpro">Loading more...</span>
              </div>
            )}
            {!saIsLoadingMore &&
              !saHasMore &&
              saList.length > SA_PER_PAGE && (
                <p className="text-sm text-gray-400 dark:text-[#52525b] font-sfpro">
                  All {saPagination.total} adjustments loaded
                </p>
              )}
          </div>
        </>
      )}

      <AddMaterialModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditInventoryModal
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSuccess={handleEditSuccess}
      />

      <StockAdjustmentModal
        open={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        item={adjustingItem}
        onSuccess={handleAdjustStockSuccess}
      />

      <DeleteModal
        isOpen={!!deletingItem}
        onClose={() => !isDeleting && setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Inventory Item"
        description="This will permanently remove the item from your inventory. Ensure stock is 0 before deleting."
        itemName={deletingItem?.name}
        isLoading={isDeleting}
      />

      <RejectModal
        isOpen={!!rejectTarget}
        onClose={() => !isRejecting && setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        title="Reject Stock Adjustment"
        description="Please provide a reason for rejecting this adjustment."
        itemName={rejectTarget?.saNumber || ""}
        confirmText="Reject"
        remarkLabel="Rejection Reason"
        remarkPlaceholder="Explain why this adjustment is being rejected..."
        isLoading={isRejecting}
      />
    </div>
  )
}