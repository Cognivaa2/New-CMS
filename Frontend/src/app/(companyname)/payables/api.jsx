import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"
import {
  Files,
  Clock4,
  FileCheck,
  Ban,
  AlertTriangle,
  IndianRupee,
  Building2,
  CalendarClock,
  Receipt,
  DollarSign,
} from "lucide-react"

const BASE = getBaseUrl()

function getPayablesHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatPayablesError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchPayablesSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/payables/summary`, {
    headers: getPayablesHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllPayables(
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    sourceType,
    projectId,
    vendorId,
    sortBy = "createdAt",
    order = "desc",
    dateFrom,
    dateTo,
    overdueOnly,
  } = {},
  signal = null
) {
  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  params.append("sortBy", sortBy)
  params.append("order", order)
  if (search?.trim()) params.append("search", search.trim())
  if (status) params.append("status", status)
  if (sourceType) params.append("sourceType", sourceType)
  if (projectId) params.append("projectId", projectId)
  if (vendorId) params.append("vendorId", vendorId)
  if (overdueOnly) params.append("overdueOnly", overdueOnly)
  if (dateFrom)
    params.append(
      "dateFrom",
      dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom
    )
  if (dateTo)
    params.append(
      "dateTo",
      dateTo instanceof Date ? dateTo.toISOString() : dateTo
    )

  const { data } = await axios.get(
    `${BASE}/payables?${params.toString()}`,
    { headers: getPayablesHeaders(), signal }
  )

  return {
    payables: data.data?.payables ?? [],
    pagination: data.data?.pagination ?? {
      total: 0,
      page,
      limit,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }
}

export function mapSummaryToStats(summary) {
  if (!summary) return []
  return [
    {
      id: "total-payables",
      value: fmt(summary.totalPayables),
      label: "Total Payables",
      sublabel: "All payable records across projects.",
      icon: Files,
    },
    {
      id: "unpaid",
      value: fmt(summary.unpaidCount),
      label: "Unpaid",
      sublabel: "Awaiting payment.",
      icon: Clock4,
    },
    {
      id: "paid",
      value: fmt(summary.paidCount),
      label: "Paid",
      sublabel: "Successfully settled invoices.",
      icon: FileCheck,
    },
    {
      id: "partially-paid",
      value: fmt(summary.partiallyPaidCount),
      label: "Partially Paid",
      sublabel: "Partial payments made.",
      icon: Receipt,
    },
    {
      id: "reversed",
      value: fmt(summary.reversedCount),
      label: "Reversed",
      sublabel: "Reversed transactions.",
      icon: Ban,
    },
    {
      id: "total-payable-amount",
      value: fmtCurrency(summary.totalPayableAmount),
      label: "Total Payable Amount",
      sublabel: "Total amount across all payables.",
      icon: IndianRupee,
    },
    {
      id: "total-due-amount",
      value: fmtCurrency(summary.totalDueAmount),
      label: "Total Due Amount",
      sublabel: "Outstanding payable balance.",
      icon: IndianRupee,
    },
    {
      id: "total-paid-amount",
      value: fmtCurrency(summary.totalPaidAmount),
      label: "Total Paid Amount",
      sublabel: "Cumulative payments made.",
      icon: FileCheck,
    },
    {
      id: "overdue-payables",
      value: fmt(summary.overduePayables),
      label: "Overdue Payables",
      sublabel: "Past due date, unpaid.",
      icon: AlertTriangle,
    },
    {
      id: "avg-days-to-settle",
      value:
        summary.avgDaysToSettle !== null
          ? `${summary.avgDaysToSettle}d`
          : "—",
      label: "Avg Days to Settle",
      sublabel: "Average settlement time.",
      icon: CalendarClock,
    },
  ]
}

function fmt(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
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

const NA = "Not Available"

function fmtDate(raw) {
  if (!raw) return NA
  const d = new Date(raw)
  if (isNaN(d.getTime())) return NA
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function mapPerson(user) {
  if (!user || typeof user !== "object") return null
  return {
    id: user.id || "",
    keycloakId: user.keycloakId || "",
    name: user.name || "Unknown",
    email: user.email || "",
    avatar: user.avatar || null,
    role: user.role || "",
  }
}

export function mapPayableToRow(payable) {
  return {
    id: payable.payableId,
    payableid: payable.payableNumber || NA,
    project:
      payable.projectName && payable.projectName !== "Unknown Project"
        ? payable.projectName
        : NA,
    vendor: payable.vendorName || NA,
    sourcetype: payable.sourceType || NA,
    sourcenumber: payable.sourceNumber || NA,
    totalamount:
      payable.totalAmount != null ? fmtCurrency(payable.totalAmount) : NA,
    paidamount:
      payable.paidAmount != null ? fmtCurrency(payable.paidAmount) : NA,
    dueamount: payable.dueAmount != null ? fmtCurrency(payable.dueAmount) : NA,
    status: payable.status || NA,
    duedate: fmtDate(payable.dueDate),
    isoverdue: payable.isOverdue ?? false,
    createdby: mapPerson(payable.createdBy),
    createdat: fmtDate(payable.createdAt),
    raw: payable,
  }
}

export const TABLE_HEADERS = [
  "Payable ID",
  "Project",
  "Vendor",
  "Source Type",
  "Source Number",
  "Total Amount",
  "Paid Amount",
  "Due Amount",
  "Status",
  "Due Date",
  "Created By",
  "Created At",
]

export const PAYABLES_STATUSES = ["Unpaid", "PartiallyPaid", "Paid", "Reversed"]

export const SOURCE_TYPES = ["GRN", "WO", "ManualExpense"]

export const PAGE_META = {
  title: "Payables",
  description:
    "Track and manage all vendor payments, invoices, and outstanding balances. Monitor due dates and payment reconciliation across projects.",
}

export const WORKSPACE_META = {
  title: "Payables Workspace",
  description:
    "Select a project to manage vendor payables. Track invoices, approve payments, and reconcile balances from individual project workspaces.",
  searchPlaceholder: "Search anything",
}