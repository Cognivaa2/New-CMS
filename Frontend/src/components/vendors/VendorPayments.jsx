"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Receipt,
  Banknote,
  Eye,
  Loader2,
} from "lucide-react"
import {
  fetchVendorAdvanceSummary,
  fetchVendorFullHistory,
  addVendorAdvanceApi,
  getCurrentUserKeycloakId,
} from "@/app/(companyname)/vendors/api"
import { toast } from "sonner"
import AddAdvanceModal from "./AddAdvanceModal"

const TABS = [
  { key: "All", label: "All", txnType: "" },
  { key: "Payment", label: "Cash Payments", txnType: "Payment" },
  { key: "Credit", label: "Credits", txnType: "Credit" },
  { key: "Debit", label: "Advance Used", txnType: "Debit" },
]

const TABLE_HEADERS = [
  "Type",
  "Date",
  "Total Amount",
  "Cash Paid",
  "Adv. Used",
  "Linked Payable",
  "Mode / Ref",
  "Proof",
]

const DEFAULT_PAGINATION = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
}

const ENTRY_CONFIG = {
  Credit: {
    icon: ArrowDownLeft,
    label: "Credit",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeClass:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Debit: {
    icon: ArrowUpRight,
    label: "Adv. Deducted",
    iconColor: "text-rose-600 dark:text-rose-400",
    badgeClass:
      "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  Refund: {
    icon: RotateCcw,
    label: "Refund",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeClass:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Payment: {
    icon: Banknote,
    label: "Payment",
    iconColor: "text-slate-500 dark:text-slate-400",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  },
}

function currency(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val)))
    return "₹0.00"
  return `₹${Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(d) {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  })
}

function NA() {
  return (
    <span className="text-xs font-sfpro italic text-gray-300 dark:text-[#ffffff] opacity-40">
      N/A
    </span>
  )
}

function ProofLink({ url }) {
  if (!url) return <NA />
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-sfpro-medium
        text-blue-600 dark:text-blue-400 hover:underline"
    >
      <Eye className="w-3 h-3" />
      View
    </a>
  )
}

function TransactionCard({ txn }) {
  const txnType = txn?.txnType || "Payment"
  const entryType = txn?.entryType || "Payment"
  const config = ENTRY_CONFIG[txnType] || ENTRY_CONFIG.Payment
  const Icon = config.icon

  const isPayment = entryType === "Payment"
  const isDebitAdvance = entryType === "AdvanceTxn" && txnType === "Debit"

  const cashAmount = isPayment ? Number(txn?.amount || 0) : 0
  const advanceAmount = isPayment
    ? Number(txn?.advanceDeducted || 0)
    : isDebitAdvance
      ? Number(txn?.amount || 0)
      : 0
  const totalAmount = isPayment
    ? Number(txn?.totalSettled ?? cashAmount + advanceAmount)
    : Number(txn?.amount || 0)

  const mode = txn?.paymentMode || txn?.paymentModeOther || null
  const ref = txn?.referenceNumber || null

  return (
    <div
      className="rounded-xl border border-gray-100 dark:border-[#252525]
      bg-white dark:bg-[#121212] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${config.badgeClass.split(" ")[0]} dark:${config.badgeClass.split(" ")[1]}`}
          >
            <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
          </div>
          <span
            className={`text-[11px] font-sfpro-bold uppercase tracking-tight ${config.iconColor}`}
          >
            {config.label}
          </span>
        </div>
        <span className="text-[11px] text-gray-500 font-sfpro">
          {formatDate(txn?.date) ?? "—"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400 font-sfpro-medium uppercase tracking-wider">
          Total
        </span>
        <span className="text-[15px] font-sfpro-bold text-gray-900 dark:text-white">
          {currency(totalAmount)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-sfpro-bold mb-0.5">
            Cash Paid
          </p>
          <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-gray-200">
            {isPayment ? currency(cashAmount) : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-sfpro-bold mb-0.5">
            Adv. Used
          </p>
          <p
            className={`text-[13px] font-sfpro-bold ${
              advanceAmount > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {advanceAmount > 0 ? currency(advanceAmount) : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="truncate max-w-[45%]">
          {txn?.payableNumber ? (
            <span className="font-sfpro-medium text-gray-700 dark:text-gray-300 truncate block">
              {txn.payableNumber}
            </span>
          ) : (
            <NA />
          )}
        </div>

        <div className="flex items-center gap-3">
          {mode || ref ? (
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-25">
              {mode}
              {ref ? ` #${ref}` : ""}
            </span>
          ) : null}
          <ProofLink url={txn?.proofImage} />
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ txn }) {
  const txnType = txn?.txnType || "Payment"
  const entryType = txn?.entryType || "Payment"
  const config = ENTRY_CONFIG[txnType] || ENTRY_CONFIG.Payment
  const Icon = config.icon

  const isPayment = entryType === "Payment"
  const isDebitAdvance = entryType === "AdvanceTxn" && txnType === "Debit"

  const cashAmount = isPayment ? Number(txn?.amount || 0) : 0
  const advanceAmount = isPayment
    ? Number(txn?.advanceDeducted || 0)
    : isDebitAdvance
      ? Number(txn?.amount || 0)
      : 0
  const totalAmount = isPayment
    ? Number(txn?.totalSettled ?? cashAmount + advanceAmount)
    : Number(txn?.amount || 0)

  const mode = txn?.paymentMode || txn?.paymentModeOther || null
  const ref = txn?.referenceNumber || null

  return (
    <tr
      className="group border-b border-gray-100 dark:border-[#1e1e1e]
      hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${config.badgeClass.split(" ")[0]}`}>
            <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
          </div>
          <span
            className={`text-[11px] font-sfpro-bold uppercase tracking-tight ${config.iconColor}`}
          >
            {config.label}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600 dark:text-gray-400 font-sfpro">
        {formatDate(txn?.date) ?? <NA />}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[12px] font-sfpro-bold text-gray-900 dark:text-white">
        {currency(totalAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600 dark:text-gray-400">
        {isPayment ? currency(cashAmount) : <NA />}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-gray-600 dark:text-gray-400">
        {advanceAmount > 0 ? (
          <span className="text-rose-600 dark:text-rose-400 font-sfpro-medium">
            {currency(advanceAmount)}
          </span>
        ) : (
          <NA />
        )}
      </td>
      <td className="px-4 py-3 max-w-37.5">
        <div className="flex flex-col truncate">
          <span className="text-[12px] font-sfpro-medium text-gray-800 dark:text-gray-200 truncate">
            {txn?.payableNumber || <NA />}
          </span>
          {txn?.sourceNumber && (
            <span className="text-[10px] text-gray-400 truncate">
              {txn.sourceNumber}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 max-w-37.5">
        {!mode && !ref ? (
          <NA />
        ) : (
          <div className="flex flex-col truncate">
            {mode ? (
              <span className="text-[12px] text-gray-600 dark:text-gray-400 truncate">
                {mode}
              </span>
            ) : (
              <NA />
            )}
            {ref && (
              <span className="text-[10px] font-mono text-gray-400 truncate">
                #{ref}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <ProofLink url={txn?.proofImage} />
      </td>
    </tr>
  )
}

function SummaryCards({ summary, advanceSummary, isLoading }) {
  const cards = [
    {
      label: "Available Balance",
      value:
        advanceSummary?.vendor?.availableBalance ??
        advanceSummary?.advance?.availableBalance,
      icon: Wallet,
      color: "text-blue-500",
    },
    {
      label: "Total Advance",
      value: summary?.totalCredited ?? advanceSummary?.advance?.totalCredit,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      label: "Advance Used",
      value: summary?.totalAdvanceUsed ?? advanceSummary?.advance?.totalDebit,
      icon: TrendingDown,
      color: "text-rose-500",
    },
    {
      label: "Cash Paid",
      value: summary?.totalCashPaid,
      icon: Banknote,
      color: "text-slate-500",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-100 dark:border-[#252525]
            bg-white dark:bg-[#121212] p-2.5 sm:p-3"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <card.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${card.color}`} />
            <span className="text-[9px] sm:text-[10px] uppercase font-sfpro-bold text-gray-400 tracking-wider truncate">
              {card.label}
            </span>
          </div>
          {isLoading ? (
            <div className="h-5 w-20 bg-gray-100 dark:bg-white/5 animate-pulse rounded" />
          ) : (
            <p className="text-base sm:text-lg font-sfpro-bold text-gray-900 dark:text-white">
              {currency(card.value)}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function TableSkeletons() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr
      key={i}
      className="animate-pulse border-b border-gray-50 dark:border-white/5"
    >
      {TABLE_HEADERS.map((_, j) => (
        <td key={j} className="px-4 py-4">
          <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-full" />
        </td>
      ))}
    </tr>
  ))
}

function CardSkeletons() {
  return Array.from({ length: 4 }).map((_, i) => (
    <div
      key={i}
      className="animate-pulse rounded-xl border border-gray-100 dark:border-[#252525]
        bg-white dark:bg-[#121212] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 bg-gray-100 dark:bg-white/5 rounded" />
        <div className="h-3 w-16 bg-gray-100 dark:bg-white/5 rounded" />
      </div>
      <div className="h-5 w-24 bg-gray-100 dark:bg-white/5 rounded" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 bg-gray-50 dark:bg-white/5 rounded-lg" />
        <div className="h-12 bg-gray-50 dark:bg-white/5 rounded-lg" />
      </div>
    </div>
  ))
}

function ScrollSentinel({ onIntersect, disabled }) {
  const ref = useRef(null)

  useEffect(() => {
    if (disabled || !ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [onIntersect, disabled])

  return (
    <div ref={ref} className="w-full flex justify-center py-4">
      {!disabled && (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      )}
    </div>
  )
}
export default function VendorPayments({ vendorId }) {
  const [advanceSummary, setAdvanceSummary] = useState(null)
  const [historySummary, setHistorySummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [activeTab, setActiveTab] = useState("All")
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [isTxnLoading, setIsTxnLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const scrollContainerRef = useRef(null)

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchVendorAdvanceSummary(vendorId)
      setAdvanceSummary(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSummaryLoading(false)
    }
  }, [vendorId])

  const loadHistory = useCallback(
    async (tab, page, append = false) => {
      if (!append) {
        setIsTxnLoading(true)
        setTransactions([])
        setPagination(DEFAULT_PAGINATION)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const tabConfig = TABS.find((t) => t.key === tab) || TABS[0]
        const result = await fetchVendorFullHistory({
          vendorId,
          page,
          limit: 20,
          txnType: tabConfig.txnType,
        })

        const newTxns = result?.transactions || []
        const newPagination = result?.pagination || DEFAULT_PAGINATION

        if (append) {
          setTransactions((prev) => [...prev, ...newTxns])
        } else {
          setTransactions(newTxns)
        }

        setPagination(newPagination)
        setHistorySummary(result?.summary || null)
      } catch {
        toast.error("Failed to load transactions")
      } finally {
        setIsTxnLoading(false)
        setIsLoadingMore(false)
      }
    },
    [vendorId]
  )

  const loadNextPage = useCallback(() => {
    if (isLoadingMore || !pagination.hasNext) return
    loadHistory(activeTab, pagination.page + 1, true)
  }, [activeTab, pagination, isLoadingMore, loadHistory])

  useEffect(() => {
    setIsSummaryLoading(true)
    setIsTxnLoading(true)
    setTransactions([])
    setPagination(DEFAULT_PAGINATION)
    setActiveTab("All")
    loadSummary()
    loadHistory("All", 1, false)
  }, [vendorId, loadSummary, loadHistory])

  const handleTabChange = useCallback(
    (key) => {
      setActiveTab(key)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
      loadHistory(key, 1, false)
    },
    [loadHistory]
  )

  const handleAddAdvanceSave = useCallback(
    async (form, file) => {
      const keycloakId = getCurrentUserKeycloakId()
      if (!keycloakId) {
        toast.error("Authentication Error", {
          description: "User session not found. Please log in again.",
        })
        throw new Error("Missing recordedBy")
      }

      const fd = new FormData()
      fd.append("recordedBy", keycloakId)
      fd.append("amount", String(form.amount))
      fd.append("paymentDate", form.paymentDate)
      fd.append("paymentMode", form.paymentMode)
      if (form.referenceNumber?.trim())
        fd.append("referenceNumber", form.referenceNumber.trim())
      if (form.notes?.trim()) fd.append("notes", form.notes.trim())
      if (file) fd.append("proof", file)

      try {
        await addVendorAdvanceApi(vendorId, fd)
        toast.success("Advance Added", {
          description: `₹${Number(form.amount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })} advance recorded successfully`,
        })
        setIsAddOpen(false)
        loadSummary()
        loadHistory(activeTab, 1, false)
      } catch (err) {
        toast.error(err.title || "Failed to Add Advance", {
          description: err.message || "Something went wrong",
        })
        throw err
      }
    },
    [vendorId, activeTab, loadSummary, loadHistory]
  )

  const noData = !isTxnLoading && transactions.length === 0

  return (
    <div className="flex flex-col h-full font-sfpro">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-sfpro-bold text-gray-900 dark:text-white truncate">
            Payments & Advances
          </h3>
          <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
            Manage vendor settlements and advance credits
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="h-8 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-[12px] font-sfpro-bold
            bg-black dark:bg-white text-white dark:text-black hover:opacity-90
            flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 ml-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Add</span> Advance
        </button>
      </div>

      <SummaryCards
        summary={historySummary}
        advanceSummary={advanceSummary}
        isLoading={isSummaryLoading}
      />

      <div
        className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5
        rounded-xl w-full sm:w-fit mb-4 sm:mb-5 overflow-x-auto
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg
              text-[11px] font-sfpro-bold transition-all ${
                activeTab === tab.key
                  ? "bg-white dark:bg-[#27272a] text-black dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="relative flex-1 min-h-0 bg-white dark:bg-[#121212]
          rounded-xl border border-gray-100 dark:border-[#252525]
          overflow-hidden flex flex-col"
      >
        <div
          ref={scrollContainerRef}
          className="hidden md:block overflow-x-auto overflow-y-auto custom-scrollbar flex-1"
        >
          <table className="w-full text-left border-collapse min-w-200">
            <thead
              className="sticky top-0 z-10 bg-gray-50 dark:bg-[#18181b]
              border-b border-gray-100 dark:border-[#252525]"
            >
              <tr>
                {TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-2.5 text-[10px] font-sfpro-bold text-gray-400
                      uppercase tracking-wider whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isTxnLoading ? (
                <TableSkeletons />
              ) : noData ? (
                <tr>
                  <td
                    colSpan={TABLE_HEADERS.length}
                    className="py-20 text-center"
                  >
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-[13px] text-gray-500 font-sfpro-medium">
                      No transactions found
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((txn, idx) => (
                  <TransactionRow key={txn._id || idx} txn={txn} />
                ))
              )}
            </tbody>
          </table>

          {!isTxnLoading && !noData && (
            <ScrollSentinel
              onIntersect={loadNextPage}
              disabled={!pagination.hasNext || isLoadingMore}
            />
          )}

          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <div className="md:hidden overflow-y-auto custom-scrollbar flex-1 p-3 space-y-3">
          {isTxnLoading ? (
            <CardSkeletons />
          ) : noData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-500 font-sfpro-medium">
                No transactions found
              </p>
            </div>
          ) : (
            transactions.map((txn, idx) => (
              <TransactionCard key={txn._id || idx} txn={txn} />
            ))
          )}

          {!isTxnLoading && !noData && (
            <ScrollSentinel
              onIntersect={loadNextPage}
              disabled={!pagination.hasNext || isLoadingMore}
            />
          )}

          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <div
          className="px-3 sm:px-4 py-2 border-t border-gray-100 dark:border-[#252525]
          flex items-center justify-between bg-gray-50/50 dark:bg-white/2 shrink-0"
        >
          <span className="text-[10px] sm:text-[11px] text-gray-500">
            {pagination.total} entries
          </span>
          <span className="text-[10px] sm:text-[11px] text-gray-400">
            Showing {transactions.length} of {pagination.total}
          </span>
        </div>
      </div>

      <AddAdvanceModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddAdvanceSave}
        vendorName={advanceSummary?.vendor?.name}
      />
    </div>
  )
}