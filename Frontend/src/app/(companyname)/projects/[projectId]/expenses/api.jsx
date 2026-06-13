import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatExpenseError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

function getExpenseHeaders(isFormData = false) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const base = { ...getAuthHeaders(), "x-company-id": companyId }
  if (isFormData) {
    delete base["Content-Type"]
    delete base["content-type"]
  }
  return base
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return null
  const num = Number(amount)
  if (isNaN(num)) return null
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function mapUser(user) {
  if (!user) return null
  return {
    id: user._id || user.id || "",
    keycloakId: user.keycloakId || "",
    name: user.name || "Unknown",
    email: user.email || "",
    role: user.designation || user.role || "Member",
    avatar: user.avatar || user.avatarUrl || null,
  }
}

export function mapExpense(raw) {
  if (!raw) return null

  const proof = raw.manualEntryDetails?.proof || null

  const mapEnrichedUser = (user) => {
    if (!user || typeof user !== "object" || !user.name) return null
    return {
      name: user.name || "Unknown",
      role: user.designation || user.role || user.jobTitle || "Member",
      img: user.avatarUrl || user.avatar || null,
      email: user.email || "",
    }
  }

  return {
    id: raw._id,
    expenseNumber: raw.expenseNumber || null,
    expenseNo: raw.expenseNumber || null,
    type: raw.type ? raw.type.replace(/_/g, " ") : null,
    typeRaw: raw.type || "Manual",
    category: raw.category || null,
    status: raw.status || null,
    amount: raw.amount ?? 0,
    amountFormatted: formatCurrency(raw.amount),

    vendor: raw.vendorName
      ? {
          name: raw.vendorName,
          role: "Vendor",
          img: null,
        }
      : null,

    date: formatDate(raw.expenseDate),
    expenseDateRaw: raw.expenseDate || null,
    attachment: proof?.fileName || null,
    attachmentUrl: proof?.fileUrl || null,
    attachmentObj: proof,

    createdBy: mapEnrichedUser(raw.createdBy),
    submittedBy: mapEnrichedUser(raw.submittedBy),
    approvedBy: mapEnrichedUser(raw.approvedBy),
    rejectedBy: mapEnrichedUser(raw.rejectedBy),
    paidBy: mapEnrichedUser(raw.paidBy),
    reversedBy: mapEnrichedUser(raw.reversedBy),

    description: raw.description || null,
    sourceModel: raw.sourceModel || null,
    sourceNumber: raw.sourceNumber || null,
    phaseId: raw.phaseId || null,
    vendorId: raw.vendorId || null,
    vendorName: raw.vendorName || null,
    manualEntryDetails: raw.manualEntryDetails || null,
    subType: raw.manualEntryDetails?.subType || null,
    paymentMode: raw.manualEntryDetails?.paymentMode || null,
    referenceNumber: raw.manualEntryDetails?.referenceNumber || null,
    submittedAt: formatDate(raw.submittedAt),
    approvedAt: formatDate(raw.approvedAt),
    rejectedAt: formatDate(raw.rejectedAt),
    rejectionRemarks: raw.rejectionRemarks || null,
    paidAt: formatDate(raw.paidAt),
    paymentRemarks: raw.paymentRemarks || null,
    reversedAt: formatDate(raw.reversedAt),
    reversalReason: raw.reversalReason || null,
    createdAt: formatDate(raw.createdAt),
    updatedAt: raw.updatedAt || null,
  }
}

export function computeExpenseStats(dashboardData) {
  if (!dashboardData) return []
  const { summary, project } = dashboardData
  return [
    {
      id: 1,
      title: "Total Actual",
      value: formatCurrency(summary.totalActual),
      subtitle: "Total Actual",
      colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
    },
    {
      id: 2,
      title: "Total Committed",
      value: formatCurrency(summary.totalCommitted),
      subtitle: "Outstanding obligations",
      colorClass: "bg-[#eef5fc] dark:bg-[#1e1e2e]",
    },
    {
      id: 3,
      title: "Pending Approval",
      value: formatCurrency(summary.totalPending),
      subtitle: "Awaiting review",
      colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
    },
    {
      id: 4,
      title: "Remaining Budget",
      value: formatCurrency(summary.remaining),
      subtitle: `Budget: ${formatCurrency(project.budget)}`,
      colorClass: "bg-[#eef5fc] dark:bg-[#1e1e2e]",
    },
    {
      id: 5,
      title: "Budget Utilization",
      value: `${summary.utilizationPct}%`,
      subtitle: "Actual + Committed",
      colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
    },
  ]
}

export function computeCategoryData(dashboardData) {
  if (!dashboardData?.byCategory?.length) return []

  const COLORS = [
    "#1e1e1e", "#60a5fa", "#a7f3d0", "#fca5a5",
    "#fcd34d", "#c4b5fd", "#6ee7b7", "#fb923c",
  ]

  return dashboardData.byCategory.map((cat, i) => ({
    name: cat.category,
    value: cat.total,
    color: COLORS[i % COLORS.length],
  }))
}

export function computeTopVendors(dashboardData) {
  if (!dashboardData?.topVendors?.length) return []
  return dashboardData.topVendors.map((v) => ({
    name: v.vendorName || "Unknown Vendor",
    email: null,
    amount: formatCurrency(v.total),
    img: null,
    count: v.count,
  }))
}

export function buildManualExpensePayload(form, createdBy) {
  const formData = new FormData()

  formData.append("createdBy", createdBy)
  formData.append("subType", form.subType)
  formData.append("amount", String(form.amount))
  formData.append("description", form.description?.trim() || "")
  formData.append(
    "expenseDate",
    form.expenseDate instanceof Date
      ? form.expenseDate.toISOString()
      : String(form.expenseDate)
  )

  if (form.category) formData.append("category", form.category)
  if (form.paymentMode) formData.append("paymentMode", form.paymentMode)
  if (form.referenceNumber?.trim())
    formData.append("referenceNumber", form.referenceNumber.trim())
  if (form.phaseId) formData.append("phaseId", form.phaseId)

  if (form.proof instanceof File) {
    formData.append("proof", form.proof, form.proof.name)
  }

  return formData
}

export async function fetchExpenseDashboard(projectId, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/expenses/${projectId}/dashboard`,
      { headers: getExpenseHeaders(), signal }
    )
    return data.data || null
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function fetchAllExpenses(
  projectId,
  {
    page = 1,
    limit = 20,
    search = "",
    status,
    type,
    category,
    vendorId,
    sortBy = "expenseDate",
    order = "desc",
    dateFrom,
    dateTo,
    signal = null,
  } = {}
) {
  if (!projectId) throw new Error("projectId is required")
  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  params.append("sortBy", sortBy)
  params.append("order", order)
  if (search?.trim()) params.append("search", search.trim())
  if (status) params.append("status", status)
  if (type) params.append("type", type)
  if (category) params.append("category", category)
  if (vendorId) params.append("vendorId", vendorId)
  if (dateFrom) params.append("dateFrom", dateFrom)
  if (dateTo) params.append("dateTo", dateTo)
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/expenses/${projectId}?${params.toString()}`,
      { headers: getExpenseHeaders(), signal }
    )
    const rawExpenses = data.data?.expenses || []
    const pagination = data.data?.pagination || {
      total: rawExpenses.length,
      page,
      limit,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }
    const totals = data.data?.totals || {}
    return {
      expenses: rawExpenses.map(mapExpense),
      pagination,
      totals,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function fetchSingleExpense(projectId, expenseId, signal = null) {
  if (!projectId || !expenseId) throw new Error("projectId and expenseId are required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/expenses/${projectId}/${expenseId}`,
      { headers: getExpenseHeaders(), signal }
    )
    const raw = data.data?.expense
    if (!raw) throw new Error("Expense data missing in response")
    return mapExpense(raw)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function fetchCommittedCosts(
  projectId,
  { type, vendorId, signal = null } = {}
) {
  if (!projectId) throw new Error("projectId is required")
  const params = new URLSearchParams()
  if (type) params.append("type", type)
  if (vendorId) params.append("vendorId", vendorId)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/expenses/${projectId}/committed?${params.toString()}`,
      { headers: getExpenseHeaders(), signal }
    )
    return {
      expenses: (data.data?.expenses || []).map(mapExpense),
      totalCommitted: data.data?.totalCommitted ?? 0,
      count: data.data?.count ?? 0,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function createManualExpense(projectId, payload, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  const isFormData = payload instanceof FormData
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/expenses/${projectId}`,
      payload,
      { headers: getExpenseHeaders(isFormData), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function approveExpense(projectId, expenseId, actionBy, signal = null) {
  if (!projectId || !expenseId || !actionBy)
    throw new Error("projectId, expenseId and actionBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/expenses/${projectId}/approve/${expenseId}`,
      { actionBy },
      { headers: getExpenseHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function rejectExpense(
  projectId,
  expenseId,
  actionBy,
  rejectionRemarks = "",
  signal = null
) {
  if (!projectId || !expenseId || !actionBy)
    throw new Error("projectId, expenseId and actionBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/expenses/${projectId}/reject/${expenseId}`,
      { actionBy, rejectionRemarks },
      { headers: getExpenseHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function markExpenseAsPaid(
  projectId,
  expenseId,
  actionBy,
  paymentRemarks = "",
  signal = null
) {
  if (!projectId || !expenseId || !actionBy)
    throw new Error("projectId, expenseId and actionBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/expenses/${projectId}/paid/${expenseId}`,
      { actionBy, paymentRemarks },
      { headers: getExpenseHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export async function exportExpenseReport(projectId) {
  if (!projectId) throw new Error("projectId is required")
  try {
    const { data, headers } = await axios.get(
      `${API_BASE_URL}/expenses/${projectId}/export`,
      {
        headers: getExpenseHeaders(),
        responseType: "blob",
      }
    )
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement("a")
    link.href = url
    const contentDisposition = headers["content-disposition"] || ""
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    const filename = match ? match[1] : `Expense_Report_${projectId}.xlsx`
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error(formatExpenseError(error))
  }
}

export async function fetchExpenseTrend(
  projectId,
  { dateFrom, dateTo, granularity = "day", signal = null } = {}
) {
  if (!projectId) throw new Error("projectId is required")
  const params = new URLSearchParams()
  if (dateFrom) params.append("dateFrom", dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom)
  if (dateTo) params.append("dateTo", dateTo instanceof Date ? dateTo.toISOString() : dateTo)
  params.append("granularity", granularity)
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/expenses/${projectId}/trend?${params.toString()}`,
      { headers: getExpenseHeaders(), signal }
    )
    return {
      trend: data.data?.trend || [],
      meta: data.data?.meta || {},
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatExpenseError(error))
  }
}

export function computeTrendChartData(trend = []) {
  return trend.map((bucket) => {
    const d = new Date(bucket.label + "T00:00:00Z")
    const name = isNaN(d.getTime())
      ? bucket.label
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
    return {
      name,
      value: bucket.total,
      actual: bucket.actualTotal,
      committed: bucket.committedTotal,
      count: bucket.count,
    }
  })
}

export function getTabFilters(activeTab) {
  switch (activeTab) {
    case "Manual":
      return { type: "Manual" }
    case "Committed":
      return { status: "Committed" }
    case "Actual":
      return { status: "Actual" }
    case "Pending":
      return { status: "Pending" }
    case "Approved":
      return { status: "Approved" }
    case "Rejected":
      return { status: "Rejected" }
    case "Reversed":
      return { status: "Reversed" }
    default:
      return {}
  }
}

export const EXPENSE_TABS = [
  "Manual", "Committed", "Actual", "Pending", "Approved", "Rejected", "Reversed",
]

export const VALID_SUB_TYPES = ["Petty Cash", "Miscellaneous", "Labour", "Other"]
export const VALID_PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "Other"]
export const VALID_CATEGORIES = [
  "Material", "Labour", "Contractor", "Transfer", "Petty Cash", "Miscellaneous", "Other",
]