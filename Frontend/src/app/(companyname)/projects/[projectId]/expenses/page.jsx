// page.jsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  fetchAllExpenses,
  fetchExpenseDashboard,
  createManualExpense,
  exportExpenseReport,
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  buildManualExpensePayload,
  computeExpenseStats,
  computeCategoryData,
  computeTopVendors,
  formatExpenseError,
  getTabFilters,
  EXPENSE_TABS,
} from "./api"

import Loading from "./loading"
import ExpenseHeader from "@/components/projects/(project)/expenses/ExpenseHeader"
import SummaryCard from "@/components/ui/SummaryCard"
import AnalyticsSection from "@/components/projects/(project)/expenses/AnalyticsSection"
import ExpenseTable from "@/components/projects/(project)/expenses/ExpenseTable"
import AddExpenseModal from "@/components/projects/(project)/expenses/AddExpenseModal"
import RejectModal from "@/components/ui/RejectModal"

function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function getKeycloakId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("keycloakId") || ""
}

function formatCompactAmount(value) {
  if (value === null || value === undefined || value === "") return value
  const original = String(value)
  const hasCurrency = original.includes("₹")
  const cleaned = original.replace(/[^0-9.-]/g, "")
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return value
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return value
  const abs = Math.abs(num)
  const compact = (n, suffix) => {
    const formatted = parseFloat(n.toFixed(2)).toString()
    return `${hasCurrency ? "₹" : ""}${formatted}${suffix}`
  }
  if (abs >= 10000000) return compact(num / 10000000, "Cr")
  if (abs >= 100000) return compact(num / 100000, "L")
  if (abs >= 1000) return compact(num / 1000, "K")
  return value
}

function formatExpenseStatsForCards(items) {
  return items.map((item) => ({
    ...item,
    value: formatCompactAmount(item.value),
  }))
}

export default function ExpensesPage() {
  const params = useParams()
  const projectId = params?.projectId

  const [activeTab, setActiveTab] = useState("Manual")
  const [expenses, setExpenses] = useState([])
  const [pagination, setPagination] = useState({
    total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [dashboardData, setDashboardData] = useState(null)
  const [stats, setStats] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [topVendors, setTopVendors] = useState([])

  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [isDashLoading, setIsDashLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [rejectTarget, setRejectTarget] = useState(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const listControllerRef = useRef(null)
  const dashControllerRef = useRef(null)
  const searchRef = useRef(searchQuery)
  searchRef.current = searchQuery
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  const loadDashboard = useCallback(async () => {
    if (!projectId) return
    dashControllerRef.current?.abort()
    const controller = new AbortController()
    dashControllerRef.current = controller
    setIsDashLoading(true)
    try {
      const data = await fetchExpenseDashboard(projectId, controller.signal)
      if (controller.signal.aborted) return
      setDashboardData(data)
      setStats(formatExpenseStatsForCards(computeExpenseStats(data)))
      setCategoryData(computeCategoryData(data))
      setTopVendors(computeTopVendors(data))
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[ExpensesPage] dashboard load failed:", err.message)
    } finally {
      setIsDashLoading(false)
    }
  }, [projectId])

  const loadExpenses = useCallback(
    async (search = "", page = 1, tab = activeTab, showRefresh = false) => {
      if (!projectId) {
        setIsInitialLoad(false)
        return
      }
      listControllerRef.current?.abort()
      const controller = new AbortController()
      listControllerRef.current = controller
      if (showRefresh) setIsTableLoading(true)
      setError(null)
      try {
        const tabFilters = getTabFilters(tab)
        const { expenses: fetched, pagination: pag } = await fetchAllExpenses(
          projectId,
          { page, limit: 20, search, signal: controller.signal, ...tabFilters }
        )
        if (controller.signal.aborted) return
        setExpenses(fetched)
        setPagination(pag)
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        setError(err.message)
        toast.error("Failed to load expenses", { description: formatExpenseError(err) })
      } finally {
        setIsInitialLoad(false)
        setIsTableLoading(false)
      }
    },
    [projectId]
  )

  useEffect(() => {
    if (!projectId) {
      setIsInitialLoad(false)
      return
    }
    loadDashboard()
    loadExpenses("", 1, "Manual", false)
    return () => {
      listControllerRef.current?.abort()
      dashControllerRef.current?.abort()
    }
  }, [projectId, loadDashboard, loadExpenses])

  useEffect(() => {
    return () => {
      listControllerRef.current?.abort()
      dashControllerRef.current?.abort()
    }
  }, [])

  const refreshAfterAction = () =>
    Promise.all([
      loadExpenses(searchRef.current, currentPage, activeTabRef.current, true),
      loadDashboard(),
    ])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchQuery("")
    loadExpenses("", 1, tab, true)
  }

  const debouncedSearch = useRef(
    debounce((q, tab) => loadExpenses(q, 1, tab, true), 400)
  ).current

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query)
      setCurrentPage(1)
      debouncedSearch(query, activeTab)
    },
    [debouncedSearch, activeTab]
  )

  const handlePageChange = (page) => {
    setCurrentPage(page)
    loadExpenses(searchRef.current, page, activeTab, true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSaveExpense = async (form) => {
    try {
      const keycloakId = getKeycloakId()
      if (!keycloakId) {
        toast.error("Authentication error", { description: "User session not found. Please log in again." })
        throw new Error("No keycloakId")
      }
      const payload = buildManualExpensePayload(form, keycloakId)
      const res = await createManualExpense(projectId, payload)
      toast.success("Expense Submitted", {
        description: res.description || "Manual expense submitted for approval",
      })
      setIsAddOpen(false)
      setActiveTab("Pending")
      setCurrentPage(1)
      await Promise.all([
        loadExpenses("", 1, "Pending", true),
        loadDashboard(),
      ])
    } catch (err) {
      toast.error("Failed to create expense", { description: formatExpenseError(err) })
      throw err
    }
  }

  const handleApprove = async (row) => {
    const keycloakId = getKeycloakId()
    if (!keycloakId) {
      toast.error("Authentication error", { description: "User session not found. Please log in again." })
      return
    }
    if (actionLoadingId) return
    setActionLoadingId(row.id)
    try {
      await approveExpense(projectId, row.id, keycloakId)
      toast.success("Expense Approved", { description: `${row.expenseNo} has been approved` })
      await refreshAfterAction()
    } catch (err) {
      toast.error("Approval Failed", { description: formatExpenseError(err) })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRejectOpen = (row) => {
    if (actionLoadingId) return
    setRejectTarget(row)
  }

  const handleRejectConfirm = async (remarks) => {
    if (!rejectTarget) return
    const keycloakId = getKeycloakId()
    if (!keycloakId) {
      toast.error("Authentication error", { description: "User session not found. Please log in again." })
      return
    }
    setIsRejecting(true)
    try {
      await rejectExpense(projectId, rejectTarget.id, keycloakId, remarks)
      toast.success("Expense Rejected", { description: `${rejectTarget.expenseNo} has been rejected` })
      setRejectTarget(null)
      await refreshAfterAction()
    } catch (err) {
      toast.error("Rejection Failed", { description: formatExpenseError(err) })
    } finally {
      setIsRejecting(false)
    }
  }

  const handleMarkPaid = async (row) => {
    const keycloakId = getKeycloakId()
    if (!keycloakId) {
      toast.error("Authentication error", { description: "User session not found. Please log in again." })
      return
    }
    if (actionLoadingId) return
    setActionLoadingId(row.id)
    try {
      await markExpenseAsPaid(projectId, row.id, keycloakId)
      toast.success("Marked as Paid", {
        description: `${row.expenseNo} recorded as actual expense`,
      })
      await refreshAfterAction()
    } catch (err) {
      toast.error("Failed to Mark as Paid", { description: formatExpenseError(err) })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleExport = async () => {
    if (isExporting) return
    try {
      setIsExporting(true)
      toast.info("Generating report…", { description: "Please wait" })
      await exportExpenseReport(projectId)
      toast.success("Report Downloaded", { description: "Expense Excel report saved" })
    } catch (err) {
      toast.error("Export Failed", { description: formatExpenseError(err) })
    } finally {
      setIsExporting(false)
    }
  }

  if (isInitialLoad) return <Loading />

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg  px-6 pt-8 pb-16 lg:px-10 font-sans">
      <div className="mx-auto space-y-8">

        <ExpenseHeader
          onSearch={handleSearch}
          onAddExpense={() => setIsAddOpen(true)}
          onExport={handleExport}
          isExporting={isExporting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {isDashLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] animate-pulse"
              />
            ))
            : stats.map((stat) => <SummaryCard key={stat.id} item={stat} />)
          }
        </div>

        <AnalyticsSection
          categoryData={categoryData}
          monthlyData={
            dashboardData?.byType?.map((t) => ({
              name: (t.type || "").replace(/_/g, " "),
              value: parseFloat((t.total || 0).toFixed(2)),
            })) || []
          }
          vendors={topVendors}
          isLoading={isDashLoading}
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide rounded-2xl bg-[#f7f7f7] dark:bg-[#18181b] p-1.5 border border-[#ececec] dark:border-[#252525] lg:w-fit">
          {EXPENSE_TABS.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`
                  relative h-10 px-4 sm:px-5 rounded-xl text-sm font-sfpro-medium
                  transition-all whitespace-nowrap border
                  ${isActive
                    ? "bg-[#212121] text-white border-[#212121] shadow-sm dark:bg-white dark:text-black dark:border-white"
                    : "bg-white text-[#3f3f46] border-transparent hover:bg-[#fafafa] hover:border-[#e5e7eb] dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:hover:bg-[#262626] dark:hover:border-[#3f3f46]"
                  }
                `}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {error && !isTableLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">{error}</p>
            <button
              onClick={() => loadExpenses(searchQuery, currentPage, activeTab, true)}
              className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <ExpenseTable
            activeTab={activeTab}
            rows={expenses}
            isLoading={isTableLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onApprove={handleApprove}
            onReject={handleRejectOpen}
            onMarkPaid={handleMarkPaid}
            actionLoadingId={actionLoadingId}
            projectId={projectId}
          />
        )}

      </div>

      <AddExpenseModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveExpense}
      />

      <RejectModal
        isOpen={!!rejectTarget}
        onClose={() => !isRejecting && setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        title="Reject Expense"
        description="Please provide a reason for rejecting this expense. This action cannot be undone."
        itemName={rejectTarget?.expenseNo || ""}
        confirmText="Reject"
        remarkLabel="Rejection Reason"
        remarkPlaceholder="Explain why this expense is being rejected..."
        isLoading={isRejecting}
      />
    </div>
  )
}