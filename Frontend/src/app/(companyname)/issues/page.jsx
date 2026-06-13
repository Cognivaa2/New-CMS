"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchIssueSummary,
  fetchAllIssues,
  mapSummaryToStats,
  mapIssueToRow,
  formatIssueError,
  TABLE_HEADERS,
  PAGE_META,
  WORKSPACE_META,
} from "./api"

import PageHeader from "@/components/issues/PageHeader"
import StatsGrid from "@/components/ui/StatsGrid"
import WorkspaceSection from "@/components/issues/WorkspaceSection"

const FILTER_CONFIG = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Submitted", value: "submitted" },
      { label: "Resolved", value: "resolved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
  {
    key: "priority",
    label: "Priority",
    options: [
      { label: "Critical", value: "critical" },
      { label: "High", value: "high" },
      { label: "Medium", value: "medium" },
      { label: "Low", value: "low" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { label: "Created At", value: "createdAt" },
      { label: "Updated At", value: "updatedAt" },
      { label: "Due Date", value: "dueDate" },
      { label: "Priority", value: "priority" },
      { label: "Status", value: "status" },
      { label: "Title", value: "title" },
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

export default function IssuesPage() {
  const [stats, setStats] = useState([])
  const [totalIssues, setTotalIssues] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tableError, setTableError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState(null)
  const [activePriority, setActivePriority] = useState(null)
  const [activeIssueType, setActiveIssueType] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)
  const [sortBy, setSortBy] = useState("createdAt")
  const [order, setOrder] = useState("desc")

  const cursorRef = useRef(null)
  const summaryCtrl = useRef(null)
  const tableCtrl = useRef(null)

  const searchRef = useRef(searchQuery)
  const statusRef = useRef(activeStatus)
  const priorityRef = useRef(activePriority)
  const issueTypeRef = useRef(activeIssueType)
  const projectRef = useRef(selectedProject)
  const dateRangeRef = useRef(dateRange)
  const sortByRef = useRef(sortBy)
  const orderRef = useRef(order)

  searchRef.current = searchQuery
  statusRef.current = activeStatus
  priorityRef.current = activePriority
  issueTypeRef.current = activeIssueType
  projectRef.current = selectedProject
  dateRangeRef.current = dateRange
  sortByRef.current = sortBy
  orderRef.current = order

  const buildParams = useCallback(
    (overrides = {}) => ({
      search: searchRef.current,
      status: statusRef.current,
      priority: priorityRef.current,
      issueType: issueTypeRef.current,
      projectId: projectRef.current?.projectId ?? null,
      dateFrom: dateRangeRef.current?.start ?? null,
      dateTo: dateRangeRef.current?.end ?? null,
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
      const summary = await fetchIssueSummary(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapSummaryToStats(summary))
      setTotalIssues(summary?.totalIssues ?? null)
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Issue] summary failed:", err.message)
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
        const { issues, pagination } = await fetchAllIssues(
          { page: 1, limit: 10, ...params },
          ctrl.signal
        )
        if (ctrl.signal.aborted) return
        setRows(issues.map(mapIssueToRow))
        setHasMore(pagination.hasNextPage)
        cursorRef.current = pagination.nextCursor ?? null
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        const msg = formatIssueError(err)
        setTableError(msg)
        toast.error("Failed to load issues", { description: msg })
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
      const { issues, pagination } = await fetchAllIssues({
        page: 1,
        limit: 10,
        ...params,
        lastId: cursorRef.current,
      })
      setRows((prev) => [...prev, ...issues.map(mapIssueToRow)])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatIssueError(err) })
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, buildParams])

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
        const pick = (key, fallback = null) => {
          const arr = selected?.[key]
          return Array.isArray(arr) && arr.length > 0
            ? arr[arr.length - 1]
            : fallback
        }

        const newStatus = pick("status")
        const newPriority = pick("priority")
        const newIssueType = pick("issueType")
        const newSortBy = pick("sortBy", "createdAt")
        const newOrder = pick("order", "desc")

        setActiveStatus(newStatus)
        setActivePriority(newPriority)
        setActiveIssueType(newIssueType)
        setSortBy(newSortBy)
        setOrder(newOrder)

        loadFresh({
          status: newStatus,
          priority: newPriority,
          issueType: newIssueType,
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
      loadFresh({ dateFrom: range?.start ?? null, dateTo: range?.end ?? null })
    },
    [loadFresh]
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg py-12 px-6 lg:px-12 transition-colors duration-300">
      <div className="max-w-400 mx-auto space-y-10">

        <PageHeader
          title={PAGE_META.title}
          count={totalIssues}
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