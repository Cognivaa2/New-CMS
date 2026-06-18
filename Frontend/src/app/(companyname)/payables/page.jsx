"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchPayablesSummary,
  fetchAllPayables,
  mapSummaryToStats,
  mapPayableToRow,
  formatPayablesError,
  TABLE_HEADERS,
  PAYABLES_STATUSES,
  SOURCE_TYPES,
  PAGE_META,
  WORKSPACE_META,
} from "./api"

import PageHeader from "@/components/payables/PageHeader"
import StatsGrid from "@/components/ui/StatsGrid"
import WorkspaceSection from "@/components/payables/WorkspaceSection"

const FILTER_CONFIG = [
  {
    key: "status",
    label: "Status",
    options: PAYABLES_STATUSES.map((s) => ({ label: s, value: s })),
  },
  {
    key: "sourceType",
    label: "Source Type",
    options: SOURCE_TYPES.map((s) => ({ label: s, value: s })),
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

export default function PayablesPage() {
  const [stats, setStats] = useState([])
  const [totalPayables, setTotalPayables] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tableError, setTableError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState(null)
  const [activeSourceType, setActiveSourceType] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)

  const pageRef = useRef(1)
  const summaryCtrl = useRef(null)
  const tableCtrl = useRef(null)

  const searchRef = useRef(searchQuery)
  const statusRef = useRef(activeStatus)
  const sourceTypeRef = useRef(activeSourceType)
  const projectRef = useRef(selectedProject)
  const dateRangeRef = useRef(dateRange)

  searchRef.current = searchQuery
  statusRef.current = activeStatus
  sourceTypeRef.current = activeSourceType
  projectRef.current = selectedProject
  dateRangeRef.current = dateRange

  const loadSummary = useCallback(async () => {
    summaryCtrl.current?.abort()
    const ctrl = new AbortController()
    summaryCtrl.current = ctrl
    setSummaryLoading(true)
    try {
      const summary = await fetchPayablesSummary(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapSummaryToStats(summary))
      setTotalPayables(summary?.totalPayables ?? null)
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[Payables] summary failed:", err.message)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadFresh = useCallback(
    async ({
      search = "",
      status = null,
      sourceType = null,
      projectId = null,
      dateFrom = null,
      dateTo = null,
    } = {}) => {
      tableCtrl.current?.abort()
      const ctrl = new AbortController()
      tableCtrl.current = ctrl

      pageRef.current = 1
      setTableLoading(true)
      setTableError(null)

      try {
        const { payables, pagination } = await fetchAllPayables(
          { page: 1, limit: 10, search, status, sourceType, projectId, dateFrom, dateTo },
          ctrl.signal
        )
        if (ctrl.signal.aborted) return

        setRows(payables.map(mapPayableToRow))
        setHasMore(pagination.hasNext)
        pageRef.current = 1
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        const msg = formatPayablesError(err)
        setTableError(msg)
        toast.error("Failed to load payables", { description: msg })
      } finally {
        setTableLoading(false)
      }
    },
    []
  )

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    try {
      const { payables, pagination } = await fetchAllPayables({
        page: nextPage,
        limit: 10,
        search: searchRef.current,
        status: statusRef.current,
        sourceType: sourceTypeRef.current,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
        sortBy: "createdAt",
        order: "desc",
      })
      setRows((prev) => [...prev, ...payables.map(mapPayableToRow)])
      setHasMore(pagination.hasNext)
      pageRef.current = nextPage
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatPayablesError(err) })
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
        status: statusRef.current,
        sourceType: sourceTypeRef.current,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
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
        const statusArr = selected?.status
        const sourceTypeArr = selected?.sourceType
        const newStatus =
          Array.isArray(statusArr) && statusArr.length > 0
            ? statusArr[statusArr.length - 1]
            : null
        const newSourceType =
          Array.isArray(sourceTypeArr) && sourceTypeArr.length > 0
            ? sourceTypeArr[sourceTypeArr.length - 1]
            : null
        setActiveStatus(newStatus)
        setActiveSourceType(newSourceType)
        loadFresh({
          search: searchRef.current,
          status: newStatus,
          sourceType: newSourceType,
          projectId: projectRef.current?.projectId ?? null,
          dateFrom: dateRangeRef.current?.start ?? null,
          dateTo: dateRangeRef.current?.end ?? null,
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
        status: statusRef.current,
        sourceType: sourceTypeRef.current,
        projectId: project?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
      })
    },
    [loadFresh]
  )

  const handleDateChange = useCallback(
    (range) => {
      setDateRange(range)
      loadFresh({
        search: searchRef.current,
        status: statusRef.current,
        sourceType: sourceTypeRef.current,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: range?.start ?? null,
        dateTo: range?.end ?? null,
      })
    },
    [loadFresh]
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 ">
      <div className="max-w-screen mx-auto space-y-2">
        <PageHeader
          title={PAGE_META.title}
          count={totalPayables}
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