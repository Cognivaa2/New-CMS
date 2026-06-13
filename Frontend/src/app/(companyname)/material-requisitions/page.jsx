// app/(company)/material-requisitions/page.jsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchMRSummary,
  fetchAllMRs,
  mapSummaryToStats,
  mapMRToRow,
  formatMRError,
  TABLE_HEADERS,
  MR_STATUSES,
  PAGE_META,
  WORKSPACE_META,
} from "./api"

import PageHeader from "@/components/material-requisitions/PageHeader"
import StatsGrid from "@/components/ui/StatsGrid"
import WorkspaceSection from "@/components/material-requisitions/WorkspaceSection"

const FILTER_CONFIG = [
  {
    key: "status",
    label: "Status",
    options: MR_STATUSES.map((s) => ({ label: s, value: s })),
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
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
export default function MaterialRequisitionsPage() {

  const [stats, setStats] = useState([])
  const [totalMRs, setTotalMRs] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tableError, setTableError] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)
 
  const cursorRef = useRef(null)

  const summaryCtrl = useRef(null)
  const tableCtrl = useRef(null)

  const searchRef = useRef(searchQuery)
  const statusRef = useRef(activeStatus)
  const projectRef = useRef(selectedProject)
  const dateRangeRef = useRef(dateRange)

  searchRef.current = searchQuery
  statusRef.current = activeStatus
  projectRef.current = selectedProject
  dateRangeRef.current = dateRange

  const loadSummary = useCallback(async () => {
    summaryCtrl.current?.abort()
    const ctrl = new AbortController()
    summaryCtrl.current = ctrl
    setSummaryLoading(true)
    try {
      const summary = await fetchMRSummary(ctrl.signal)
      if (ctrl.signal.aborted) return
      setStats(mapSummaryToStats(summary))
      setTotalMRs(summary?.totalMRs ?? null)
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[MR] summary failed:", err.message)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadFresh = useCallback(async ({
    search = "",
    status = null,
    projectId = null,
    dateFrom = null,
    dateTo = null,
  } = {}) => {
    tableCtrl.current?.abort()
    const ctrl = new AbortController()
    tableCtrl.current = ctrl

    cursorRef.current = null
    setTableLoading(true)
    setTableError(null)

    try {
      const { mrs, pagination } = await fetchAllMRs(
        { page: 1, limit: 10, search, status, projectId, dateFrom, dateTo },
        ctrl.signal
      )
      if (ctrl.signal.aborted) return

      setRows(mrs.map(mapMRToRow))
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      const msg = formatMRError(err)
      setTableError(msg)
      toast.error("Failed to load requisitions", { description: msg })
    } finally {
      setTableLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return
    setLoadingMore(true)
    try {
      const { mrs, pagination } = await fetchAllMRs({
        page: 1,
        limit: 10,
        search: searchRef.current,
        status: statusRef.current,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
        lastId: cursorRef.current,
        sortBy: "createdAt",
        order: "desc",
      })
      setRows((prev) => [...prev, ...mrs.map(mapMRToRow)])
      setHasMore(pagination.hasNextPage)
      cursorRef.current = pagination.nextCursor ?? null
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      toast.error("Failed to load more", { description: formatMRError(err) })
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
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
      })
    }, 400)
  ).current

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    debouncedSearch(q)
  }, [debouncedSearch])

  const handleFilterChange = useCallback((selected) => {
    queueMicrotask(() => {
      const statusArr = selected?.status
      const newStatus = Array.isArray(statusArr) && statusArr.length > 0
        ? statusArr[statusArr.length - 1]
        : null
      setActiveStatus(newStatus)
      loadFresh({
        search: searchRef.current,
        status: newStatus,
        projectId: projectRef.current?.projectId ?? null,
        dateFrom: dateRangeRef.current?.start ?? null,
        dateTo: dateRangeRef.current?.end ?? null,
      })
    })
  }, [loadFresh])

  const handleProjectChange = useCallback((project) => {
    setSelectedProject(project)
    loadFresh({
      search: searchRef.current,
      status: statusRef.current,
      projectId: project?.projectId ?? null,
      dateFrom: dateRangeRef.current?.start ?? null,
      dateTo: dateRangeRef.current?.end ?? null,
    })
  }, [loadFresh])

  const handleDateChange = useCallback((range) => {
    setDateRange(range)
    loadFresh({
      search: searchRef.current,
      status: statusRef.current,
      projectId: projectRef.current?.projectId ?? null,
      dateFrom: range?.start ?? null,
      dateTo: range?.end ?? null,
    })
  }, [loadFresh])

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg py-12 px-6 lg:px-12 transition-colors duration-300">
      <div className="max-w-400 mx-auto space-y-10">

        <PageHeader
          title={PAGE_META.title}
          count={totalMRs}
          countLoading={summaryLoading}
          description={PAGE_META.description}
          onDateChange={handleDateChange}
        />

        <StatsGrid
          stats={stats}
          isLoading={summaryLoading}
        />

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