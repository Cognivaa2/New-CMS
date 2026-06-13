import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"
import {
  FolderKanban,
  ShoppingCart,
  Hammer,
  PackageCheck,
  FileText,
  AlertCircle,
  Wallet,
  Boxes,
  IndianRupee,
  CheckSquare,
} from "lucide-react"

const BASE = getBaseUrl()

function getDashboardHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatDashboardError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchDashboardKPIs(signal = null) {
  const { data } = await axios.get(`${BASE}/company/dashboard/kpis`, {
    headers: getDashboardHeaders(),
    signal,
  })
  return data.data ?? null
}

export async function fetchProjectCompletionChart(signal = null) {
  const { data } = await axios.get(`${BASE}/company/dashboard/projects`, {
    headers: getDashboardHeaders(),
    signal,
  })
  return data.data ?? null
}

export async function fetchInventoryPieChart(signal = null) {
  const { data } = await axios.get(`${BASE}/company/dashboard/inventory`, {
    headers: getDashboardHeaders(),
    signal,
  })
  return data.data ?? null
}

export async function fetchExpenseChart(signal = null) {
  const { data } = await axios.get(`${BASE}/company/dashboard/expense`, {
    headers: getDashboardHeaders(),
    signal,
  })
  return data.data ?? null
}

export async function fetchTasksFlow(days = 12, signal = null) {
  const { data } = await axios.get(
    `${BASE}/company/dashboard/tasks?days=${days}`,
    { headers: getDashboardHeaders(), signal }
  )
  return data.data ?? null
}

function fmt(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCurrency(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 10_000_000) return `Rs. ${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `Rs. ${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(1)}k`
  return `Rs. ${Number(n).toLocaleString("en-IN")}`
}

export function mapKPIsToStats(kpis) {
  if (!kpis) return []
  return [
    {
      id: "total-projects",
      value: fmt(kpis.totalProjects),
      label: "Total Projects",
      sublabel: "All active projects across the company.",
      icon: FolderKanban,
      trend: kpis.totalProjectsChange,
      trendUp: !kpis.totalProjectsChange?.startsWith("-"),
    },
    {
      id: "total-pos",
      value: fmt(kpis.totalPurchaseOrders),
      label: "Purchase Orders",
      sublabel: "Total POs raised across all projects.",
      icon: ShoppingCart,
      trend: kpis.totalPurchaseOrdersChange,
      trendUp: !kpis.totalPurchaseOrdersChange?.startsWith("-"),
    },
    {
      id: "total-wos",
      value: fmt(kpis.totalWorkOrders),
      label: "Work Orders",
      sublabel: "Total WOs assigned to contractors.",
      icon: Hammer,
      trend: kpis.totalWorkOrdersChange,
      trendUp: !kpis.totalWorkOrdersChange?.startsWith("-"),
    },
    {
      id: "total-grns",
      value: fmt(kpis.totalGRNs),
      label: "GRNs",
      sublabel: "Goods receipt notes recorded.",
      icon: PackageCheck,
      trend: kpis.totalGRNsChange,
      trendUp: !kpis.totalGRNsChange?.startsWith("-"),
    },
    {
      id: "total-mrs",
      value: fmt(kpis.totalMRs),
      label: "Material Requests",
      sublabel: "Total MRs raised across all projects.",
      icon: FileText,
      trend: kpis.totalMRsChange,
      trendUp: !kpis.totalMRsChange?.startsWith("-"),
    },
    {
      id: "total-issues",
      value: fmt(kpis.totalIssues),
      label: "Issues",
      sublabel: "Total issues reported across projects.",
      icon: AlertCircle,
      trend: kpis.totalIssuesChange,
      trendUp: !kpis.totalIssuesChange?.startsWith("-"),
    },
    {
      id: "open-payables",
      value: fmtCurrency(kpis.openPayablesDueAmount),
      label: "Open Payables",
      sublabel: `${fmt(kpis.openPayablesCount)} unpaid/partial payables.`,
      icon: Wallet,
      trend: kpis.openPayablesChange,
      trendUp: !kpis.openPayablesChange?.startsWith("-"),
    },
    {
      id: "total-inventory",
      value: fmt(kpis.totalInventoryItems),
      label: "Inventory Items",
      sublabel: "Total inventory tracked company-wide.",
      icon: Boxes,
      trend: kpis.totalInventoryItemsChange,
      trendUp: !kpis.totalInventoryItemsChange?.startsWith("-"),
    },
    {
      id: "total-expense",
      value: fmtCurrency(kpis.totalExpenseAmount),
      label: "Total Expenses",
      sublabel: "Committed + actual expense amount.",
      icon: IndianRupee,
      trend: kpis.totalExpenseAmountChange,
      trendUp: !kpis.totalExpenseAmountChange?.startsWith("-"),
    },
    {
      id: "total-tasks",
      value: fmt(kpis.totalTasks),
      label: "Total Tasks",
      sublabel: "Tasks tracked across all projects.",
      icon: CheckSquare,
      trend: kpis.totalTasksChange,
      trendUp: !kpis.totalTasksChange?.startsWith("-"),
    },
  ]
}

export function mapProjectCompletionToChart(data) {
  if (!data?.projects?.length) return []
  return data.projects.map((p) => ({
    name: p.name,
    value: p.completionPercent ?? 0,
    status: p.status,
    budget: p.budget,
  }))
}

export function mapInventoryToChart(data) {
  if (!data) return []
  const breakdown = data.stockStatusBreakdown
  return [
    {
      name: "Adequate Stock",
      value: breakdown?.adequateStock ?? 0,
      color: "#22c55e",
    },
    {
      name: "Below Minimum",
      value: breakdown?.belowMinimum ?? 0,
      color: "#f59e0b",
    },
    {
      name: "Zero Stock",
      value: breakdown?.zeroStock ?? 0,
      color: "#ef4444",
    },
  ]
}

export function mapExpenseToChart(data) {
  if (!data?.projects?.length) return []
  return data.projects.slice(0, 12).map((p) => ({
    name: p.name,
    value: p.utilizationPercent ?? 0,
    budget: p.budget,
    totalExpense: p.totalExpense,
    isOverBudget: p.isOverBudget,
  }))
}

export function mapTasksFlowToChart(data) {
  if (!data?.trends?.length) return []
  return data.trends.map((t) => ({
    name: t.formattedDate,
    created: t.created,
    completed: t.completed,
  }))
}