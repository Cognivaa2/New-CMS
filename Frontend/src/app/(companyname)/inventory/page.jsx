"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchInventorySummary,
  fetchAllInventory,
  mapSummaryToStats,
  mapInventoryToRow,
  formatInventoryError,
  TABLE_HEADERS,
  STOCK_STATUSES,
  SORT_FIELDS,
  PAGE_META,
  WORKSPACE_META,
} from "./api"

import PageHeader from "@/components/inventory/PageHeader"
import StatsGrid from "@/components/ui/StatsGrid"
import WorkspaceSection from "@/components/inventory/WorkspaceSection"

const FILTER_CONFIG = [
  {
    key: "stockStatus",
    label: "Stock Status",
    options: STOCK_STATUSES.map((s) => ({ label: s, value: s })),
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: SORT_FIELDS,
  },
  {
    key: "order",
    label: "Order",
    options: [
      { label: "Newest First", value: "desc" },
      { label: "Oldest First", value: "asc" },
    ],
  },
]

function getDefaultDateRange() {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

const DEFAULT_DATE_RANGE = getDefaultDateRange()

function debounce(fn, ms = 400) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export default function InventoryPage() {
  const [stats, setStats] = useState([])
  const [totalItems, setTotalItems] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tableError, setTableError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeStockStatus, setActiveStockStatus] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)
  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")

  const cursorRef = useRef(null)
  const summaryCtrl = useRef(null)
  const tableCtrl = useRef(null)

  const searchRef = useRef(searchQuery)
  const stockStatusRef = useRef(activeStockStatus)
  const projectRef = useRef(selectedProject)
  const dateRangeRef = useRef(dateRange)
  const sortByRef = useRef(sortBy)
  const orderRef = useRef(order)

  searchRef.current = searchQuery
  stockStatusRef.current = activeStockStatus
  projectRef.current = selectedProject
  dateRangeRef.current = dateRange
  sortByRef.current = sortBy
  orderRef.current = order

  const buildParams = useCallback(
    (overrides = {}) => ({
      search: searchRef.current,
      stockStatus: stockStatusRef.current,
      projectId: projectRef.current?.projectId ?? null,
      sortBy: sortByRef.current,
      order: orderRef.current,
      ...overrides,
    }),
    []
  )

  const loadSummary = useCallback(async () => {
    summaryCtrl.current?.abort()
    const ctrl = new AbortController()
    summaryCtrl.current = ctrl
    setSummaryLoading(true)
    try {
      const summary = await fetchInventorySummary(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapSummaryToStats(summary))
      setTotalItems(summary?.totalItems ?? null)
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Inventory] summary failed:", err.message)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadFresh = useCallback(
    async (overrides = {}) => {
      tableCtrl.current?.abort()
      const ctrl = new AbortController()
      tableCtrl.current = ctrl

      cursorRef.current = null
      setTableLoading(true)
      setTableError(null)

      const params = buildParams(overrides)

      try {
        const { inventory, pagination } = await fetchAllInventory(
          { page: 1, limit: 10, ...params },
          ctrl.signal
        )
        if (ctrl.signal.aborted) return
        setRows(inventory.map(mapInventoryToRow))
        setHasMore(pagination.hasNextPage)
        cursorRef.current = pagination.nextCursor ?? null
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        const msg = formatInventoryError(err)
        setTableError(msg)
        toast.error("Failed to load inventory", { description: msg })
      } finally {
        setTableLoading(false)
      }
    },
    [buildParams]
  )

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return
    setLoadingMore(true)
    const params = buildParams()
    try {
      const { inventory, pagination } = await fetchAllInventory({
        page: 1,
        limit: 10,
        ...params,
        lastId: cursorRef.current,
      })
      setRows((prev) => [...prev, ...inventory.map(mapInventoryToRow)])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", {
        description: formatInventoryError(err),
      })
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, buildParams])

  useEffect(() => {
    loadSummary()
    loadFresh()
    return () => {
      summaryCtrl.current?.abort()
      tableCtrl.current?.abort()
    }
  }, [loadSummary, loadFresh])

  const debouncedSearch = useRef(
    debounce((q) => {
      loadFresh({ search: q })
    }, 400)
  ).current

  const handleSearch = useCallback(
    (q) => {
      setSearchQuery(q)
      debouncedSearch(q)
    },
    [debouncedSearch]
  )
  const handleFilterChange = useCallback(
    (selected) => {
      queueMicrotask(() => {
        const pick = (key, fallback = null) => {
          const arr = selected?.[key]
          return Array.isArray(arr) && arr.length > 0
            ? arr[arr.length - 1]
            : fallback
        }

        const newStockStatus = pick("stockStatus")
        const newSortBy = pick("sortBy", "createdAt")
        const newOrder = pick("order", "desc")

        setActiveStockStatus(newStockStatus)
        setSortBy(newSortBy)
        setOrder(newOrder)

        loadFresh({
          stockStatus: newStockStatus,
          sortBy: newSortBy,
          order: newOrder,
        })
      })
    },
    [loadFresh]
  )

  const handleProjectChange = useCallback(
    (project) => {
      setSelectedProject(project)
      loadFresh({ projectId: project?.projectId ?? null })
    },
    [loadFresh]
  )

  const handleDateChange = useCallback(
    (range) => {
      setDateRange(range)
    },
    []
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 ">
      <div className="max-w-400 mx-auto space-y-2">

        <PageHeader
          title={PAGE_META.title}
          count={totalItems}
          countLoading={summaryLoading}
          description={PAGE_META.description}
          onDateChange={handleDateChange}
        />

        <StatsGrid stats={stats} isLoading={summaryLoading} />

        <WorkspaceSection
          meta={WORKSPACE_META}
          headers={TABLE_HEADERS}
          data={rows}
          filters={FILTER_CONFIG}
          isLoading={tableLoading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          error={tableError}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onProjectChange={handleProjectChange}
          selectedProject={selectedProject}
        />

      </div>
    </div>
  )
}