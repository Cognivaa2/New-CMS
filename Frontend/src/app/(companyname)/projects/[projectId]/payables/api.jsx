"use client"

import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatPayableError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

function getPayableHeaders(isFormData = false) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const base = { ...getAuthHeaders(), "x-company-id": companyId }
  if (isFormData) {
    delete base["Content-Type"]
    delete base["content-type"]
  }
  return base
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return null
  const num = Number(amount)
  if (isNaN(num)) return null
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === "Paid" || status === "Reversed") return false
  return new Date(dueDate) < new Date()
}

export function getSourceLabel(sourceType) {
  switch (sourceType) {
    case "GRN": return "GRN"
    case "WO": return "Work Order"
    case "ManualExpense": return "Manual Expense"
    default: return sourceType || "—"
  }
}

export function getPaymentModeLabel(mode) {
  switch (mode) {
    case "BankTransfer": return "Bank Transfer"
    default: return mode || "—"
  }
}

export function mapTransaction(raw) {
  if (!raw) return null
  return {
    id: raw._id,
    paymentDate: formatDate(raw.paymentDate),
    paymentDateRaw: raw.paymentDate,
    paymentMode: raw.paymentMode,
    paymentModeLabel: getPaymentModeLabel(raw.paymentMode),
    amount: raw.amount ?? 0,
    advanceDeducted: raw.advanceDeducted ?? 0,
    totalSettled: raw.totalSettled ?? (raw.amount ?? 0) + (raw.advanceDeducted ?? 0),
    referenceNumber: raw.referenceNumber || null,
    proofImage: raw.proofImage || null,
    notes: raw.notes || null,
    recordedBy: raw.recordedBy || null,
    createdAt: formatDateTime(raw.createdAt),
    createdAtRaw: raw.createdAt,
  }
}

export function mapPayable(raw) {
  if (!raw) return null
  const payments = (raw.payments || []).map(mapTransaction)
  return {
    id: raw._id,
    payableNumber: raw.payableNumber || null,
    sourceType: raw.sourceType || null,
    sourceRef: raw.sourceNumber || raw.sourceRef || null,
    poRef: raw.poId || raw.poRef || null,
    vendorId: raw.vendorId || null,
    vendorName: raw.vendorName || null,
    totalAmount: raw.totalAmount ?? 0,
    paidAmount: raw.paidAmount ?? 0,
    advanceDeducted: raw.advanceDeducted ?? 0,
    dueAmount: raw.dueAmount ?? 0,
    status: raw.status || "Unpaid",
    dueDate: raw.dueDate || null,
    dueDateFormatted: formatDate(raw.dueDate),
    notes: raw.notes || null,
    reversalReason: raw.reversalReason || null,
    reversedAt: formatDateTime(raw.reversedAt),
    reversedBy: raw.reversedBy || null,
    createdBy: raw.createdBy || null,
    createdAt: formatDateTime(raw.createdAt),
    createdAtRaw: raw.createdAt,
    updatedAt: formatDateTime(raw.updatedAt),
    payments,
  }
}

export function computePayableSummaryCards(summary, statusBreakdown) {
  const unpaidCount = statusBreakdown?.Unpaid?.count ?? 0
  const partialCount = statusBreakdown?.PartiallyPaid?.count ?? 0
  const overdueCount = unpaidCount + partialCount

  return [
    {
      id: 1,
      value: formatCurrency(summary?.totalPayable ?? 0),
      title: "Total Payables",
      subtitle: "All sources combined",
      colorClass: "bg-[#f3f6ff] dark:bg-[#1a1c2e]",
    },
    {
      id: 2,
      value: formatCurrency(summary?.totalPaid ?? 0),
      title: "Total Paid",
      subtitle: "Settled amount",
      colorClass: "bg-[#eff8ff] dark:bg-[#162335]",
    },
    {
      id: 3,
      value: formatCurrency(summary?.totalDue ?? 0),
      title: "Outstanding",
      subtitle: "Remaining dues",
      colorClass: "bg-[#f5f3ff] dark:bg-[#201b35]",
    },
    {
      id: 4,
      value: formatCurrency(summary?.totalAdvanceDeducted ?? 0),
      title: "Advance Deducted",
      subtitle: "From vendor advances",
      colorClass: "bg-[#ebf5ff] dark:bg-[#1a2335]",
    },
    {
      id: 5,
      value: String(overdueCount),
      title: "Overdue",
      subtitle: "Past due date",
      colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
    },
  ]
}

export const PAYABLE_TABS = [
  "All",
  "GRN",
  "WO",
  "Expense",
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Reversed",
]

export const TAB_TO_STATUS = {
  All: "all",
  Unpaid: "Unpaid",
  "Partially Paid": "PartiallyPaid",
  Paid: "Paid",
  Reversed: "Reversed",
}
export const TAB_TO_SOURCE_TYPE = {
  GRN: "GRN",
  WO: "WO",
  Expense: "ManualExpense",
}


export async function fetchPayablesSummary(projectId, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/payables/summary/${projectId}`,
      { headers: getPayableHeaders(), signal }
    )
    return data.data || null
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(formatPayableError(error))
  }
}


export async function fetchPayables(
  projectId,
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    sourceType,
    vendorId,
    sortBy = "createdAt",
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
  if (sourceType) params.append("sourceType", sourceType)
  if (vendorId) params.append("vendorId", vendorId)
  if (dateFrom) params.append("dateFrom", dateFrom)
  if (dateTo) params.append("dateTo", dateTo)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/payables/${projectId}?${params.toString()}`,
      { headers: getPayableHeaders(), signal }
    )
    const rawPayables = data.data?.payables || []
    const pagination = data.data?.pagination || {
      total: rawPayables.length, page, limit,
      totalPages: 1, hasNext: false, hasPrev: false,
    }
    return {
      payables: rawPayables.map(mapPayable),
      pagination,
    }
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(formatPayableError(error))
  }
}


export async function fetchSinglePayable(projectId, payableId, signal = null) {
  if (!projectId || !payableId) throw new Error("projectId and payableId are required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/payables/${projectId}/${payableId}`,
      { headers: getPayableHeaders(), signal }
    )
    const raw = data.data?.payable
    const transactions = (data.data?.transactions || []).map(mapTransaction)
    const vendorAdvanceBalance = data.data?.vendorAdvanceBalance ?? null
    if (!raw) throw new Error("Payable data missing in response")
    const payable = mapPayable(raw)
    payable.payments = transactions
    payable.vendorAdvanceBalance = vendorAdvanceBalance
    return payable
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(formatPayableError(error))
  }
}


export async function recordPayment(projectId, payableId, form, recordedBy) {
  if (!projectId || !payableId) {
    throw new Error("projectId and payableId are required")
  }
  if (!recordedBy) {
    throw new Error("recordedBy (keycloakId) is required")
  }
  const formData = new FormData()
  formData.append("recordedBy", recordedBy)
  formData.append(
    "paymentDate",
    form.paymentDate instanceof Date
      ? form.paymentDate.toISOString()
      : String(form.paymentDate)
  )
  formData.append("paymentMode", form.paymentMode)
  formData.append(
    "amount",
    String(Number(form.amount) || 0)
  )
  formData.append(
    "advanceDeducted",
    String(Number(form.advanceDeducted) || 0)
  )
  if (form.paymentMode === "Other" && form.paymentModeOther?.trim()) {
    formData.append(
      "paymentModeOther",
      form.paymentModeOther.trim()
    )
  }
  if (form.referenceNumber?.trim()) {
    formData.append(
      "referenceNumber",
      form.referenceNumber.trim()
    )
  }
  if (form.notes?.trim()) {
    formData.append(
      "notes",
      form.notes.trim()
    )
  }
  if (form.proofFile) {
    formData.append("proof", form.proofFile)
  }
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/payables/payments/${projectId}/${payableId}`,
      formData,
      {
        headers: getAuthHeaders({
          includeContentType: false,
        }),
        transformRequest: [(data) => data],
      }
    )
    return data
  } catch (error) {
    throw new Error(formatPayableError(error))
  }
}


export async function exportPayablesReport(projectId) {
  if (!projectId) throw new Error("projectId is required")
  const { data, headers } = await axios.get(
    `${API_BASE_URL}/payables/${projectId}/export`,
    { headers: getPayableHeaders(), responseType: "blob" }
  )
  const url = window.URL.createObjectURL(new Blob([data]))
  const link = document.createElement("a")
  link.href = url
  const contentDisposition = headers["content-disposition"] || ""
  const match = contentDisposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : `Payables_Report_${projectId}.xlsx`
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}


export async function exportPayablePdf(projectId, payableId, payableNumber) {
  if (!projectId || !payableId) {
    throw new Error("projectId and payableId are required")
  }

  try {
    const { data, headers } = await axios.get(
      `${API_BASE_URL}/payables/pdf/${projectId}/${payableId}`,
      { headers: getPayableHeaders(), responseType: "blob" }
    )

    const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }))

    const contentDisposition = headers["content-disposition"] || ""
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    const filename = match
      ? match[1]
      : `Payable_${payableNumber || payableId}.pdf`

    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error(formatPayableError(error))
  }
}