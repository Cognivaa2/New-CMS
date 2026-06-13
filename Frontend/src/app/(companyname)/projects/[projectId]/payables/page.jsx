"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  fetchPayables,
  fetchPayablesSummary,
  recordPayment,
  exportPayablesReport,
  computePayableSummaryCards,
  formatPayableError,
  PAYABLE_TABS,
  exportPayablePdf,   
  TAB_TO_STATUS,
  fetchSinglePayable,
  TAB_TO_SOURCE_TYPE,
} from "./api"

import PayableHeader from "@/components/projects/(project)/payables/PayableHeader"
import SummaryCards from "@/components/projects/(project)/payables/SummaryCards"
import PayableTable from "@/components/projects/(project)/payables/PayableTable"
import PaymentModal from "@/components/projects/(project)/payables/PaymentModal"
import ViewPayableModal from "@/components/projects/(project)/payables/ViewPayableModal"
import TransactionHistoryModal from "@/components/projects/(project)/payables/TransactionHistoryModal"

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
  if (!cleaned || cleaned === "-") return value
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return value
  const abs = Math.abs(num)
  const compact = (n, suffix) =>
    `${hasCurrency ? "₹" : ""}${parseFloat(n.toFixed(2))}${suffix}`
  if (abs >= 10000000) return compact(num / 10000000, "Cr")
  if (abs >= 100000) return compact(num / 100000, "L")
  if (abs >= 1000) return compact(num / 1000, "K")
  return value
}

function formatCardsForDisplay(cards) {
  return cards.map((c) => ({ ...c, value: formatCompactAmount(c.value) }))
}

export default function PayablesPage() {
  const params = useParams()
  const projectId = params?.projectId

  const [activeTab, setActiveTab] = useState("All")
  const [payables, setPayables] = useState([])
  const [pagination, setPagination] = useState({
    total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [summaryCards, setSummaryCards] = useState([])
  const [tabCounts, setTabCounts] = useState({})
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState(null)
  const [paymentModalPayable, setPaymentModalPayable] = useState(null)
  const [viewPayable, setViewPayable] = useState(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [historyPayable, setHistoryPayable] = useState(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const listControllerRef = useRef(null)
  const summaryControllerRef = useRef(null)
  const searchRef = useRef(searchQuery)
  const activeTabRef = useRef(activeTab)
  searchRef.current = searchQuery
  activeTabRef.current = activeTab


  const loadSummary = useCallback(async () => {
    if (!projectId) return
    summaryControllerRef.current?.abort()
    const controller = new AbortController()
    summaryControllerRef.current = controller
    setIsSummaryLoading(true)
    try {
      const data = await fetchPayablesSummary(projectId, controller.signal)
      if (controller.signal.aborted) return
      const cards = computePayableSummaryCards(data?.summary, data?.statusBreakdown)
      setSummaryCards(formatCardsForDisplay(cards))
      const total = Object.values(data?.statusBreakdown || {}).reduce(
        (sum, s) => sum + (s.count ?? 0), 0
      )
      setTabCounts({
        All: total,
        GRN: data?.sourceBreakdown?.GRN?.count ?? 0,
        WO: data?.sourceBreakdown?.WO?.count ?? 0,
        Expense: data?.sourceBreakdown?.ManualExpense?.count ?? 0,
        Unpaid: data?.statusBreakdown?.Unpaid?.count ?? 0,
        "Partially Paid": data?.statusBreakdown?.PartiallyPaid?.count ?? 0,
        Paid: data?.statusBreakdown?.Paid?.count ?? 0,
        Reversed: data?.statusBreakdown?.Reversed?.count ?? 0,
      })
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("[PayablesPage] summary load failed:", err.message)
    } finally {
      setIsSummaryLoading(false)
    }
  }, [projectId])



  const loadPayables = useCallback(
    async (search = "", page = 1, tab = "All", showLoader = false) => {
      if (!projectId) {
        setIsInitialLoad(false)
        return
      }
      listControllerRef.current?.abort()
      const controller = new AbortController()
      listControllerRef.current = controller
      if (showLoader) setIsTableLoading(true)
      setError(null)
      try {
        const statusFilter = TAB_TO_STATUS[tab] || "all"
        const sourceTypeFilter = TAB_TO_SOURCE_TYPE?.[tab]
        const { payables: fetched, pagination: pag } = await fetchPayables(
          projectId,
          {
            page,
            limit: 10,
            search,
            status: statusFilter !== "all" ? statusFilter : undefined,
            sourceType: sourceTypeFilter,
            signal: controller.signal,
          }
        )
        if (controller.signal.aborted) return
        setPayables(fetched)
        setPagination(pag)
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return
        setError(err.message)
        toast.error("Failed to load payables", { description: formatPayableError(err) })
      } finally {
        setIsInitialLoad(false)
        setIsTableLoading(false)
      }
    },
    [projectId]
  )

  const debouncedSearchRef = useRef(null)

  useEffect(() => {
    debouncedSearchRef.current = debounce((q, tab) => {
      loadPayables(q, 1, tab, true)
    }, 400)
  }, [loadPayables])
  useEffect(() => {
    if (!projectId) {
      setIsInitialLoad(false)
      return
    }
    loadSummary()
    loadPayables("", 1, "All", false)
    return () => {
      listControllerRef.current?.abort()
      summaryControllerRef.current?.abort()
    }
  }, [projectId])



  useEffect(() => () => {
    listControllerRef.current?.abort()
    summaryControllerRef.current?.abort()
  }, [])

  const refreshAll = () =>
    Promise.all([
      loadPayables(searchRef.current, currentPage, activeTabRef.current, true),
      loadSummary(),
    ])


  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchQuery("")
    loadPayables("", 1, tab, true)
  }


  const handleSearchChange = useCallback(
    (query) => {
      setSearchQuery(query)
      setCurrentPage(1)
      debouncedSearchRef.current(query, activeTab)
    },
    [debouncedSearchRef, activeTab]
  )

  const handlePageChange = (page) => {
    setCurrentPage(page)
    loadPayables(searchRef.current, page, activeTab, true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }


  const handleAction = useCallback(async (action, payable) => {
  switch (action) {

    case "view":
      setViewPayable(payable)
      setIsViewOpen(true)
      break

    case "history":
      setIsHistoryOpen(true)
      setIsHistoryLoading(true)
      try {
        const detailedPayable = await fetchSinglePayable(projectId, payable.id)
        setHistoryPayable(detailedPayable)
      } catch (err) {
        toast.error("Failed to load transaction history", {
          description: formatPayableError(err),
        })
        setIsHistoryOpen(false)
      } finally {
        setIsHistoryLoading(false)
      }
      break

    case "pay":
      setPaymentModalPayable(payable)
      break

    case "void":
      toast.warning(`Void ${payable.payableNumber}?`, {
        description: "This action cannot be undone.",
      })
      break

    case "exportPdf": {                                        
      const toastId = toast.loading("Generating PDF…", {
        description: `Preparing ${payable.payableNumber}`,
      })
      try {
        await exportPayablePdf(projectId, payable.id, payable.payableNumber)
        toast.success("PDF Downloaded", {
          id: toastId,
          description: `${payable.payableNumber} saved to downloads`,
        })
      } catch (err) {
        toast.error("Export Failed", {
          id: toastId,
          description: formatPayableError(err),
        })
      }
      break
    }

    default:
      break
  }
}, [projectId])


  const handleRecordPayment = async (form) => {
    if (!paymentModalPayable) return
    const keycloakId = getKeycloakId()
    if (!keycloakId) {
      toast.error("Authentication error", { description: "User session not found. Please log in again." })
      throw new Error("No keycloakId")
    }
    try {
      const res = await recordPayment(projectId, paymentModalPayable.id, form, keycloakId)
      toast.success("Payment Recorded", {
        description: res.description || `Payment recorded for ${paymentModalPayable.payableNumber}`,
      })
      setPaymentModalPayable(null)
      await refreshAll()
    } catch (err) {
      toast.error("Payment Failed", { description: formatPayableError(err) })
      throw err
    }
  }


  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    const toastId = toast.loading("Generating payable report…", { description: "This may take a moment" })
    try {
      await exportPayablesReport(projectId)
      toast.success("Export Downloaded", {
        id: toastId,
        description: "Payables_Report.xlsx saved to downloads",
      })
    } catch (err) {
      toast.error("Export Failed", { id: toastId, description: formatPayableError(err) })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="max-w-400 mx-auto">

        <PayableHeader
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          onExport={handleExport}
          isExporting={isExporting}
        />

        <SummaryCards cards={summaryCards} isLoading={isSummaryLoading} />


        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide rounded-2xl bg-[#f7f7f7] dark:bg-[#18181b] p-1.5 border border-[#ececec] dark:border-[#252525] w-fit">
          {PAYABLE_TABS.map((tab) => {
            const count = tabCounts[tab] ?? 0
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative h-10 px-4 sm:px-5 rounded-xl text-sm font-sfpro-medium transition-all whitespace-nowrap border ${activeTab === tab
                  ? "bg-[#212121] text-white border-[#212121] shadow-sm dark:bg-white dark:text-black dark:border-white"
                  : "bg-white text-[#3f3f46] border-transparent hover:bg-[#fafafa] hover:border-[#e5e7eb] dark:bg-[#1f1f1f] dark:text-[#d4d4d8] dark:hover:bg-[#262626] dark:hover:border-[#3f3f46]"
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab}
                  {count > 0 && (
                    <span
                      className={`text-[10px] leading-none font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab
                        ? "bg-white/15 text-white dark:bg-black/10 dark:text-black"
                        : "bg-gray-100 text-gray-500 dark:bg-[#2f2f2f] dark:text-[#a1a1aa]"
                        }`}
                    >
                      {count}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>


        {error && !isTableLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-gray-400 dark:text-[#71717a] font-sfpro">{error}</p>
            <button
              onClick={() => loadPayables(searchQuery, currentPage, activeTab, true)}
              className="text-sm font-sfpro-medium text-gray-600 dark:text-gray-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <PayableTable
            activeTab={activeTab}
            rows={payables}
            isLoading={isInitialLoad || isTableLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onAction={handleAction}
          />
        )}

      </div>


      {paymentModalPayable && (
        <PaymentModal
          payable={paymentModalPayable}
          onClose={() => setPaymentModalPayable(null)}
          onSubmit={handleRecordPayment}
          projectId={projectId}
        />
      )}

      <ViewPayableModal
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false)
          setTimeout(() => setViewPayable(null), 420)
        }}
        payable={viewPayable}
        projectId={projectId}
      />


      <TransactionHistoryModal
        open={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false)
          setTimeout(() => setHistoryPayable(null), 400)
        }}
        payable={historyPayable}
        loading={isHistoryLoading}
      />
    </div>
  )
}