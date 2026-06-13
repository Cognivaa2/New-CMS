import axios from "axios"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"
import {
  Wallet, Receipt, Landmark, BadgeAlert, Users,
  BarChart3, Activity, DollarSign, FileText
} from "lucide-react"

const API_BASE_URL = getBaseUrl()

function handleError(error, fallbackMessage) {
  const message =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    fallbackMessage
  throw new Error(message)
}


export async function fetchFinanceOverview(signal = null) {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/finance/overview`, {
      headers: getAuthHeaders(),
      signal,
    })
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch overview")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch finance overview")
  }
}

export async function fetchCashFlow({ granularity = "monthly", dateFrom, dateTo } = {}, signal = null) {
  try {
    const params = new URLSearchParams()
    params.append("granularity", granularity)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)

    const { data } = await axios.get(`${API_BASE_URL}/finance/cashflow?${params.toString()}`, {
      headers: getAuthHeaders(),
      signal,
    })
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch cash flow")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch cash flow")
  }
}

export async function fetchExpenseBreakdown({ dateFrom, dateTo, projectId } = {}, signal = null) {
  try {
    const params = new URLSearchParams()
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)
    if (projectId) params.append("projectId", projectId)

    const { data } = await axios.get(
      `${API_BASE_URL}/finance/expense-breakdown?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch expense breakdown")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch expense breakdown")
  }
}

export async function fetchFinanceAlerts(signal = null) {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/finance/alerts`, {
      headers: getAuthHeaders(),
      signal,
    })
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch alerts")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch finance alerts")
  }
}

export async function fetchProjectFinancialOverview({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  sortBy = "dueAmount",
  order = "desc",
} = {}, signal = null) {
  try {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)

    const { data } = await axios.get(
      `${API_BASE_URL}/finance/projects?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch projects")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch project financial overview")
  }
}

export async function fetchRecentTransactions({
  page = 1,
  limit = 10,
  tab = "All",
  vendorId = "",
  projectId = "",
  paymentMode = "",
  dateFrom = "",
  dateTo = "",
} = {}, signal = null) {
  try {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("tab", tab)
    if (vendorId) params.append("vendorId", vendorId)
    if (projectId) params.append("projectId", projectId)
    if (paymentMode) params.append("paymentMode", paymentMode)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)

    const { data } = await axios.get(
      `${API_BASE_URL}/finance/transactions?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch transactions")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch recent transactions")
  }
}

export async function fetchAllPayables({
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  order = "desc",
  status = "",
  sourceType = "",
  vendorId = "",
  projectId = "",
  dateFrom = "",
  dateTo = "",
  search = "",
} = {}, signal = null) {
  try {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (status) params.append("status", status)
    if (sourceType) params.append("sourceType", sourceType)
    if (vendorId) params.append("vendorId", vendorId)
    if (projectId) params.append("projectId", projectId)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)
    if (search?.trim()) params.append("search", search.trim())

    const { data } = await axios.get(
      `${API_BASE_URL}/finance/payables?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch payables")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch payables")
  }
}

export async function fetchTopVendors({ limit = 5, sortBy = "outstanding" } = {}, signal = null) {
  try {
    const params = new URLSearchParams()
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)

    const { data } = await axios.get(
      `${API_BASE_URL}/finance/top-vendors?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) throw new Error(data.description || data.message || "Failed to fetch top vendors")
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    handleError(error, "Failed to fetch top vendors")
  }
}


function fmtCurrency(val) {
  const n = parseFloat(val ?? 0)
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toLocaleString()}`
}

function fmtDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}


function getDefaultDateRange() {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}


export function mapOverviewToStats(data) {
  if (!data) return []
  return [
    {
      id: 1,
      value: fmtCurrency(data.totalPayables),
      label: "Total Payables",
      sublabel: "Total payable amount across all projects.",
      icon: Wallet,
    },
    {
      id: 2,
      value: fmtCurrency(data.totalPaid),
      label: "Total Paid",
      sublabel: "Cumulative payments cleared to vendors.",
      icon: Receipt,
    },
    {
      id: 3,
      value: fmtCurrency(data.outstandingDue),
      label: "Outstanding Due",
      sublabel: "Total unpaid or partially paid dues.",
      icon: Landmark,
    },
    {
      id: 4,
      value: fmtCurrency(data.vendorAdvancePool?.totalAvailableBalance ?? 0),
      label: "Vendor Advance Pool",
      sublabel: `${data.vendorAdvancePool?.vendorCount ?? 0} vendors with available balance.`,
      icon: DollarSign,
    },
    {
      id: 5,
      value: String(data.overduePayables ?? 0),
      label: "Overdue Payables",
      sublabel: "Unpaid payables past their due date.",
      icon: BadgeAlert,
    },
    {
      id: 6,
      value: String(data.activeVendors ?? 0),
      label: "Active Vendors",
      sublabel: "Currently active and non-deleted vendors.",
      icon: Users,
    },
    {
      id: 7,
      value: fmtCurrency(data.monthlySpend?.amount ?? 0),
      label: "Monthly Spend",
      sublabel: `${data.monthlySpend?.txnCount ?? 0} transactions this month.`,
      icon: Activity,
    },
    {
      id: 8,
      value: `${data.budgetUtilization?.utilizationPercent ?? 0}%`,
      label: "Budget Utilization",
      sublabel: `${fmtCurrency(data.budgetUtilization?.totalSpent)} of ${fmtCurrency(data.budgetUtilization?.totalBudget)} budget.`,
      icon: BarChart3,
    },
    {
      id: 9,
      value: fmtCurrency(data.budgetUtilization?.totalBudget ?? 0),
      label: "Total Budget",
      sublabel: "Aggregate budget across all active projects.",
      icon: FileText,
    },
    {
      id: 10,
      value: fmtCurrency(data.budgetUtilization?.totalSpent ?? 0),
      label: "Total Spent",
      sublabel: "All-time spend against project budgets.",
      icon: FileText,
    },
  ]
}

// Backend trend item shape:
// { label, totalSpend, totalSettled, advanceDeducted, paymentVolume, periodStart, periodEnd }
export function mapCashFlowToChart(trend = []) {
  return trend.map((item) => ({
    name: item.label ?? item.periodStart ?? "",
    totalSpend: item.totalSpend ?? 0,
    totalSettled: item.totalSettled ?? 0,
    advanceDeducted: item.advanceDeducted ?? 0,
    paymentVolume: item.paymentVolume ?? 0,
  }))
}

const EXPENSE_COLORS = ["#18181B", "#60A5FA", "#4ADE80", "#F87171", "#FBBF24", "#A78BFA"]

export function mapExpenseBreakdown(categoryBreakdown = []) {
  return categoryBreakdown.slice(0, 6).map((item, idx) => ({
    name: item.label,
    value: item.totalAmount,
    color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
  }))
}

export function mapAlertsToPanel(alertData = {}) {
  const items = []

    ; (alertData.overduePayables?.records ?? []).forEach((p) => {
      items.push(
        `Overdue: ${p.vendorName || "Unknown Vendor"} — ${fmtCurrency(p.dueAmount)} past due since ${fmtDate(p.dueDate) ?? "N/A"}`
      )
    })
    ; (alertData.upcomingDues?.records ?? []).forEach((p) => {
      items.push(
        `Due soon: ${p.vendorName || "Unknown Vendor"} — ${fmtCurrency(p.dueAmount)} due on ${fmtDate(p.dueDate) ?? "N/A"}`
      )
    })
    ; (alertData.highRiskVendors?.records ?? []).forEach((v) => {
      items.push(
        `High risk: ${v.vendorName} — ${v.overdueCount} overdue payables totalling ${fmtCurrency(v.totalOverdue)}`
      )
    })

  return {
    title: "Alerts",
    description: `${alertData.overduePayables?.count ?? 0} overdue · ${alertData.upcomingDues?.count ?? 0} due within 7 days`,
    items,
  }
}

const PROJECT_STATUS_MAP = {
  Active: "On Track",
  Completed: "On Track",
  OnHold: "Delayed",
  Delayed: "Delayed",
  Cancelled: "Over Budget",
  Critical: "Over Budget",
}

export function mapProjectsToTable(projects = []) {
  return projects.map((p) => ({
    name: p.projectName || null,
    budget: fmtCurrency(p.budget),
    spent: fmtCurrency(p.actualSpend),
    outstanding: fmtCurrency(p.outstanding),
    paid: fmtCurrency(p.totalPaid),
    utilized: `${p.utilizationPercent}%`,
    status:
      PROJECT_STATUS_MAP[p.status] ??
      (p.utilizationPercent > 90
        ? "Over Budget"
        : p.utilizationPercent > 60
          ? "On Track"
          : "Delayed"),
  }))
}

const TXN_CATEGORY_STATUS = {
  Payment: "Completed",
  Advance: "Completed",
  AdvanceDebit: "Completed",
  Refund: "Completed",
}

export function mapTransactionsToTable(transactions = []) {
  return transactions.map((t) => ({
    project: t.projectName || null,
    vendor: t.vendorName || null,
    amount: fmtCurrency(t.amount),
    mode: t.paymentMode || t.txnType || null,
    date: fmtDate(t.paymentDate || t.createdAt),
    status: TXN_CATEGORY_STATUS[t.txnCategory] || "Completed",
  }))
}

const PAYABLE_STATUS_MAP = {
  Paid: "Cleared",
  PartiallyPaid: "Partial",
  Unpaid: "Overdue",
  Reversed: "Overdue",
}

export function mapPayablesToTable(payables = []) {
  return payables.map((p) => ({
    payId: p.payableNumber || null,
    budget: p.sourceNumber || null,
    invoice: p.sourceNumber ? `#${p.sourceNumber}` : null,
    source: p.sourceType || null,
    total: fmtCurrency(p.totalAmount),
    paid: fmtCurrency(p.paidAmount),
    due: fmtDate(p.dueDate),
    status: PAYABLE_STATUS_MAP[p.status] || "Overdue",
  }))
}

export function mapTopVendorsToCards(vendors = []) {
  return vendors.map((v) => ({
    id: v.vendorId?.toString(),
    name: v.vendorName,
    role: v.vendorType || "Vendor",
    totalPayable: fmtCurrency(v.totalPayable),
    outstanding: fmtCurrency(v.outstanding),
    advanceBalance: fmtCurrency(v.advanceBalance),
    // photo: real URL from backend vendor.photo field, or null → falls back to initials
    photo: v.photo ?? null,
  }))
}

// ─── Page meta ─────────────────────────────────────────────────────────────────
const _defaultRange = getDefaultDateRange()

export const PAGE_META = {
  title: "Finance",
  description: "Monitor company-wide financial operations, liabilities, payments and spending analytics.",
  dateRange: {
    start: _defaultRange.start,
    end: _defaultRange.end,
  },
}