"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchTransferSummary,
  fetchAllTransfers,
  mapSummaryToStats,
  mapTransferToRow,
  formatSTError,
  TABLE_HEADERS,
  TRANSFER_STATUSES,
  PAGE_META,
  WORKSPACE_META,
} from "./api"

import PageHeader from "@/components/stock-transfer/PageHeader"
import StatsGrid from "@/components/ui/StatsGrid"
import WorkspaceSection from "@/components/stock-transfer/WorkspaceSection"

const FILTER_CONFIG = [
  {
    key: "status",
    label: "Status",
    options: TRANSFER_STATUSES.map((s) => ({ label: s, value: s })),
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { label: "Created At", value: "createdAt" },
      { label: "Status", value: "status" },
      { label: "Updated At", value: "updatedAt" },
    ],
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

export default function StockTransfersPage() {
  const [stats, setStats] = useState([])
  const [totalTransfers, setTotalTransfers] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [tableLoading, setTableLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tableError, setTableError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)
  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")

  const summaryCtrl = useRef(null)
  const tableCtrl = useRef(null)
  const pageRef = useRef(1)

  const searchRef = useRef(searchQuery)
  const statusRef = useRef(activeStatus)
  const projectRef = useRef(selectedProject)
  const dateRangeRef = useRef(dateRange)
  const sortByRef = useRef(sortBy)
  const orderRef = useRef(order)

  searchRef.current = searchQuery
  statusRef.current = activeStatus
  projectRef.current = selectedProject
  dateRangeRef.current = dateRange
  sortByRef.current = sortBy
  orderRef.current = order

  const loadSummary = useCallback(async () => {
    summaryCtrl.current?.abort()
    const ctrl = new AbortController()
    summaryCtrl.current = ctrl
    setSummaryLoading(true)

    try {
      const summary = await fetchTransferSummary(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapSummaryToStats(summary))
      setTotalTransfers(summary?.totalTransfers ?? null)
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[ST] summary failed:", err.message)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const buildParams = useCallback(
    (overrides = {}) => ({
      search: searchRef.current,
      status: statusRef.current,
      projectId: projectRef.current?.projectId ?? null,
      dateFrom: dateRangeRef.current?.start ?? null,
      dateTo: dateRangeRef.current?.end ?? null,
      sortBy: sortByRef.current,
      order: orderRef.current,
      ...overrides,
    }),
    []
  )

  const loadFresh = useCallback(
    async (overrides = {}) => {
      tableCtrl.current?.abort()
      const ctrl = new AbortController()
      tableCtrl.current = ctrl

      pageRef.current = 1
      setTableLoading(true)
      setTableError(null)

      const params = buildParams(overrides)

      try {
        const { transfers, pagination: pag } = await fetchAllTransfers(
          {
            page: 1,
            limit: 10,
            ...params,
          },
          ctrl.signal
        )
        if (ctrl.signal.aborted) return

        setRows(transfers.map(mapTransferToRow))
        setPagination(pag)
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        const msg = formatSTError(err)
        setTableError(msg)
        toast.error("Failed to load transfers", { description: msg })
      } finally {
        setTableLoading(false)
      }
    },
    [buildParams]
  )

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasNext) return
    setLoadingMore(true)

    const nextPage = pageRef.current + 1
    const params = buildParams()

    try {
      const { transfers, pagination: pag } = await fetchAllTransfers({
        page: nextPage,
        limit: 10,
        ...params,
      })
      setRows((prev) => [...prev, ...transfers.map(mapTransferToRow)])
      setPagination(pag)
      pageRef.current = nextPage
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatSTError(err) })
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, pagination, buildParams])

  useEffect(() => {
    loadSummary()
    loadFresh({
      dateFrom: DEFAULT_DATE_RANGE.start,
      dateTo: DEFAULT_DATE_RANGE.end,
    })
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
        const statusArr = selected?.status
        const sortByArr = selected?.sortBy
        const orderArr = selected?.order

        const newStatus =
          Array.isArray(statusArr) && statusArr.length > 0
            ? statusArr[statusArr.length - 1]
            : null
        const newSortBy =
          Array.isArray(sortByArr) && sortByArr.length > 0
            ? sortByArr[sortByArr.length - 1]
            : "createdAt"
        const newOrder =
          Array.isArray(orderArr) && orderArr.length > 0
            ? orderArr[orderArr.length - 1]
            : "desc"

        setActiveStatus(newStatus)
        setSortBy(newSortBy)
        setOrder(newOrder)

        loadFresh({
          status: newStatus,
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
      loadFresh({
        dateFrom: range?.start ?? null,
        dateTo: range?.end ?? null,
      })
    },
    [loadFresh]
  )

  const hasMore = pagination?.hasNext ?? false

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg py-12 px-6 lg:px-12 transition-colors duration-300">
      <div className="max-w-400 mx-auto space-y-10">
        <PageHeader
          title={PAGE_META.title}
          count={totalTransfers}
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