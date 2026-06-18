"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchGRNSummary,
  fetchAllGRNs,
  mapSummaryToStats,
  mapGRNToRow,
  formatGRNError,
  TABLE_HEADERS,
  PAGE_META,
  WORKSPACE_META,
} from "./api"

import PageHeader from "@/components/grn/PageHeader"
import StatsGrid from "@/components/ui/StatsGrid"
import WorkspaceSection from "@/components/grn/WorkspaceSection"

const FILTER_CONFIG = [
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { label: "Created At", value: "createdAt" },
      { label: "GRN Number", value: "grnNumber" },
      { label: "Delivery Date", value: "deliveryDate" },
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

export default function GoodsReceivedNotesPage() {
  const [stats, setStats] = useState([])
  const [totalGRNs, setTotalGRNs] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tableError, setTableError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)
  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")

  const cursorRef = useRef(null)
  const summaryCtrl = useRef(null)
  const tableCtrl = useRef(null)

  const searchRef = useRef(searchQuery)
  const projectRef = useRef(selectedProject)
  const dateRangeRef = useRef(dateRange)
  const sortByRef = useRef(sortBy)
  const orderRef = useRef(order)

  searchRef.current = searchQuery
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
      const summary = await fetchGRNSummary(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapSummaryToStats(summary))
      setTotalGRNs(summary?.totalGRNs ?? null)
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[GRN] summary failed:", err.message)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadFresh = useCallback(
    async ({
      search = "",
      projectId = null,
      dateFrom = null,
      dateTo = null,
      sort = "createdAt",
      sortOrder = "desc",
    } = {}) => {
      tableCtrl.current?.abort()
      const ctrl = new AbortController()
      tableCtrl.current = ctrl

      cursorRef.current = null
      setTableLoading(true)
      setTableError(null)

      try {
        const { grns, pagination } = await fetchAllGRNs(
          {
            page: 1,
            limit: 10,
            search,
            projectId,
            dateFrom,
            dateTo,
            sortBy: sort,
            order: sortOrder,
          },
          ctrl.signal
        )
        if (ctrl.signal.aborted) return

        setRows(grns.map(mapGRNToRow))
        setHasMore(pagination.hasNextPage)
        cursorRef.current = pagination.nextCursor ?? null
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        const msg = formatGRNError(err)
        setTableError(msg)
        toast.error("Failed to load GRNs", { description: msg })
      } finally {
        setTableLoading(false)
      }
    },
    []
  )

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return
    setLoadingMore(true)

    try {
      const { grns, pagination } = await fetchAllGRNs({
        page: 1,
        limit: 10,
        search: searchRef.current,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
        lastId: cursorRef.current,
        sortBy: sortByRef.current,
        order: orderRef.current,
      })
      setRows((prev) => [...prev, ...grns.map(mapGRNToRow)])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatGRNError(err) })
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore])

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
      loadFresh({
        search: q,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
        sort: sortByRef.current,
        sortOrder: orderRef.current,
      })
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
        const sortByArr = selected?.sortBy
        const orderArr = selected?.order

        const newSortBy =
          Array.isArray(sortByArr) && sortByArr.length > 0
            ? sortByArr[sortByArr.length - 1]
            : "createdAt"
        const newOrder =
          Array.isArray(orderArr) && orderArr.length > 0
            ? orderArr[orderArr.length - 1]
            : "desc"

        setSortBy(newSortBy)
        setOrder(newOrder)

        loadFresh({
          search: searchRef.current,
          projectId: projectRef.current?.projectId ?? null,
          dateFrom: dateRangeRef.current?.start ?? null,
          dateTo: dateRangeRef.current?.end ?? null,
          sort: newSortBy,
          sortOrder: newOrder,
        })
      })
    },
    [loadFresh]
  )

  const handleProjectChange = useCallback(
    (project) => {
      setSelectedProject(project)
      loadFresh({
        search: searchRef.current,
        projectId: project?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
        sort: sortByRef.current,
        sortOrder: orderRef.current,
      })
    },
    [loadFresh]
  )

  const handleDateChange = useCallback(
    (range) => {
      setDateRange(range)
      loadFresh({
        search: searchRef.current,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: range?.start ?? null,
        dateTo: range?.end ?? null,
        sort: sortByRef.current,
        sortOrder: orderRef.current,
      })
    },
    [loadFresh]
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 ">
      <div className="max-w-screen mx-auto space-y-2">
        <PageHeader
          title={PAGE_META.title}
          count={totalGRNs}
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