import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()


export function formatTWMError(error) {
    const desc =
        error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        "Something went wrong"
    return typeof desc === "string" ? desc : "Something went wrong"
}

function getTWMHeaders() {
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")
    return { ...getAuthHeaders(), "x-company-id": companyId }
}


export function formatDate(dateStr) {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

export function formatCurrency(val) {
    if (val == null || isNaN(val)) return "₹0"
    return `₹${Number(val).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`
}


export const MATCH_STATUS_CONFIG = {
    MATCHED: {
        label: "Matched",
        color: "#22c55e",
        bg: "bg-green-50 dark:bg-green-500/10",
        border: "border-green-200 dark:border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
    UNMATCHED: {
        label: "Unmatched",
        color: "#ef4444",
        bg: "bg-red-50 dark:bg-red-500/10",
        border: "border-red-200 dark:border-red-500/20",
        text: "text-red-600 dark:text-red-400",
    },
    FULL_MATCH: {
        label: "Full Match",
        color: "#22c55e",
        bg: "bg-green-50 dark:bg-green-500/10",
        border: "border-green-200 dark:border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
    PARTIAL_MATCH: {
        label: "Partial Match",
        color: "#f59e0b",
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
    },
    MISMATCH: {
        label: "Mismatch",
        color: "#ef4444",
        bg: "bg-red-50 dark:bg-red-500/10",
        border: "border-red-200 dark:border-red-500/20",
        text: "text-red-600 dark:text-red-400",
    },
    QUANTITY_MISMATCH: {
        label: "Qty Mismatch",
        color: "#f97316",
        bg: "bg-orange-50 dark:bg-orange-500/10",
        border: "border-orange-200 dark:border-orange-500/20",
        text: "text-orange-600 dark:text-orange-400",
    },
    VALUE_MISMATCH: {
        label: "Value Mismatch",
        color: "#8b5cf6",
        bg: "bg-purple-50 dark:bg-purple-500/10",
        border: "border-purple-200 dark:border-purple-500/20",
        text: "text-purple-600 dark:text-purple-400",
    },
    PENDING_GRN: {
        label: "Pending GRN",
        color: "#6b7280",
        bg: "bg-gray-50 dark:bg-gray-500/10",
        border: "border-gray-200 dark:border-gray-500/20",
        text: "text-gray-500 dark:text-gray-400",
    },
    PENDING_INVOICE: {
        label: "Pending Invoice",
        color: "#3b82f6",
        bg: "bg-blue-50 dark:bg-blue-500/10",
        border: "border-blue-200 dark:border-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
    },
    NOT_STARTED: {
        label: "Not Started",
        color: "#a1a1aa",
        bg: "bg-gray-50 dark:bg-[#27272a]",
        border: "border-gray-200 dark:border-[#3f3f46]",
        text: "text-gray-500 dark:text-[#a1a1aa]",
    },
    TOLERATED: {
        label: "Tolerated",
        color: "#22c55e",
        bg: "bg-green-50 dark:bg-green-500/10",
        border: "border-green-200 dark:border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
}

export const PO_STATUS_CONFIG = {
    Draft: { label: "Draft", color: "text-gray-500 dark:text-[#a1a1aa]" },
    Submitted: { label: "Submitted", color: "text-blue-600 dark:text-blue-400" },
    Approved: { label: "Approved", color: "text-green-600 dark:text-green-400" },
    Rejected: { label: "Rejected", color: "text-red-600 dark:text-red-400" },
    PartiallyDelivered: { label: "Part. Delivered", color: "text-amber-600 dark:text-amber-400" },
    Completed: { label: "Completed", color: "text-purple-600 dark:text-purple-400" },
    Cancelled: { label: "Cancelled", color: "text-gray-500 dark:text-gray-400" },
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

function mapGRNSummary(raw) {
    if (!raw) return null
    return {
        grnId: raw.grnId || raw._id || "",
        grnNumber: raw.grnNumber || null,
        deliveryDate: raw.deliveryDate || null,
        deliveryDateFormatted: formatDate(raw.deliveryDate),
        deliveryChallanNumber: raw.deliveryChallanNumber || null,
        itemCount: raw.itemCount ?? 0,
        createdAt: formatDate(raw.createdAt),
    }
}

function mapPayableSummary(raw) {
    if (!raw) return null
    return {
        payableId: raw.payableId || raw._id || "",
        payableNumber: raw.payableNumber || null,
        sourceNumber: raw.sourceNumber || null,
        totalAmount: raw.totalAmount ?? 0,
        totalAmountFormatted: formatCurrency(raw.totalAmount),
        paidAmount: raw.paidAmount ?? 0,
        paidAmountFormatted: formatCurrency(raw.paidAmount),
        dueAmount: raw.dueAmount ?? 0,
        dueAmountFormatted: formatCurrency(raw.dueAmount),
        advanceDeducted: raw.advanceDeducted ?? 0,
        status: raw.status || "Pending",
        dueDate: raw.dueDate || null,
        dueDateFormatted: formatDate(raw.dueDate),
    }
}

function mapContraEntrySummary(raw) {
    if (!raw) return null
    return {
        ceId: raw.ceId || raw._id || "",
        ceNumber: raw.ceNumber || null,
        type: raw.type || null,
        typeLabel: (raw.type || "").replace(/_/g, " "),
        adjustmentAmount: raw.adjustmentAmount ?? 0,
        adjustmentAmountFormatted: formatCurrency(raw.adjustmentAmount),
        direction: raw.direction || null,
        directionLabel:
            raw.direction === "DEBIT_VENDOR" ? "Debit Vendor" :
                raw.direction === "CREDIT_VENDOR" ? "Credit Vendor" :
                    raw.direction || "—",
        status: raw.status || "Pending",
        createdBy: mapUser(raw.createdBy),
        approvedBy: mapUser(raw.approvedBy),
    }
}

function mapItemLevelMatch(raw) {
    if (!raw) return null
    const ITEM_STATUS_MAP = {
        MATCHED: { label: "Matched", color: "text-green-600 dark:text-green-400" },
        SHORT: { label: "Shortage", color: "text-red-600 dark:text-red-400" },
        EXCESS: { label: "Excess", color: "text-amber-600 dark:text-amber-400" },
    }
    const statusInfo = ITEM_STATUS_MAP[raw.itemStatus] || {
        label: raw.itemStatus || "—", color: "text-gray-500",
    }
    return {
        materialMasterId: raw.materialMasterId || "",
        materialName: raw.materialName || "—",
        unit: raw.unit || "Units",
        orderedQuantity: raw.orderedQuantity ?? 0,
        receivedQuantity: raw.receivedQuantity ?? 0,
        pendingQuantity: raw.pendingQuantity ?? 0,
        unitPrice: raw.unitPrice ?? 0,
        unitPriceFormatted: formatCurrency(raw.unitPrice),
        totalPrice: raw.totalPrice ?? 0,
        totalPriceFormatted: formatCurrency(raw.totalPrice),
        itemStatus: raw.itemStatus || "—",
        statusLabel: statusInfo.label,
        statusColor: statusInfo.color,
        fulfilmentRate:
            raw.orderedQuantity > 0
                ? Math.round((raw.receivedQuantity / raw.orderedQuantity) * 1000) / 10
                : 0,
    }
}


function mapFinancials(raw) {
    if (!raw) return null
    const variancePct = raw.variancePct ?? 0
    const varianceWithinTolerance = raw.varianceWithinTolerance ?? false
    const varianceDirection =
        variancePct === 0 ? "exact" :
            variancePct > 0 ? "over" : "under"
    const orderedValue = raw.orderedValue ?? 0
    const netBilledAfterContra = raw.netBilledAfterContra ?? 0
    const varianceAbs = Math.abs(netBilledAfterContra - orderedValue)
    return {
        orderedValue: orderedValue,
        orderedValueFormatted: formatCurrency(orderedValue),
        billedValue: raw.billedValue ?? 0,
        billedValueFormatted: formatCurrency(raw.billedValue),
        paidValue: raw.paidValue ?? 0,
        paidValueFormatted: formatCurrency(raw.paidValue),
        outstandingValue: raw.outstandingValue ?? 0,
        outstandingValueFormatted: formatCurrency(raw.outstandingValue),
        advanceDeducted: raw.advanceDeducted ?? 0,
        advanceDeductedFormatted: formatCurrency(raw.advanceDeducted),
        contraAdjustment: raw.contraAdjustment ?? 0,
        contraAdjustmentFormatted: formatCurrency(raw.contraAdjustment),
        netBilledAfterContra: netBilledAfterContra,
        netBilledAfterContraFormatted: formatCurrency(netBilledAfterContra),
        variancePct,
        variancePctFormatted: `${Math.abs(variancePct).toFixed(2)}%`,
        varianceAbs,
        varianceAbsFormatted: formatCurrency(varianceAbs),
        varianceDirection,
        varianceWithinTolerance,
    }
}


function mapQuantities(raw) {
    if (!raw) return null
    return {
        orderedQty: raw.orderedQty ?? 0,
        receivedQty: raw.receivedQty ?? 0,
        pendingQty: raw.pendingQty ?? 0,
        fulfilmentRate: raw.fulfilmentRate ?? 0,
        unit: raw.unit || "units",
    }
}


export function mapTWMRecord(raw) {
    if (!raw) return null
    return {
        id: raw.poId || raw._id || "",
        poId: raw.poId || raw._id || "",
        poNumber: raw.poNumber || "—",
        projectId: raw.projectId || "",
        projectName: raw.projectName || "Unknown",
        vendorId: raw.vendorId || "",
        vendorName: raw.vendorName || "—",
        poStatus: raw.poStatus || "—",
        poStatusConfig: PO_STATUS_CONFIG[raw.poStatus] || { label: raw.poStatus || "—", color: "text-gray-500" },
        matchStatus: raw.matchStatus || "NOT_STARTED",
        matchStatusConfig: MATCH_STATUS_CONFIG[raw.matchStatus] || MATCH_STATUS_CONFIG.NOT_STARTED,
        financials: mapFinancials(raw.financials),
        quantities: mapQuantities(raw.quantities),
        grnCount: raw.grnCount ?? 0,
        payableCount: raw.payableCount ?? 0,
        contraEntryCount: raw.contraEntryCount ?? 0,
        grns: Array.isArray(raw.grns) ? raw.grns.map(mapGRNSummary) : [],
        payables: Array.isArray(raw.payables) ? raw.payables.map(mapPayableSummary) : [],
        contraEntries: Array.isArray(raw.contraEntries) ? raw.contraEntries.map(mapContraEntrySummary) : [],
        createdAt: formatDate(raw.createdAt),
        approvedAt: formatDate(raw.approvedAt),
    }
}



export function mapTWMDetail(raw) {
    if (!raw) return null
    const po = raw.po || {}
    const financials = mapFinancials(raw.financials)
    const quantities = mapQuantities(raw.quantities)
    const itemLevelMatch = Array.isArray(raw.itemLevelMatch) ? raw.itemLevelMatch.map(mapItemLevelMatch) : []
    const grns = Array.isArray(raw.grns) ? raw.grns.map(mapGRNSummary) : []
    const payables = Array.isArray(raw.payables) ? raw.payables.map(mapPayableSummary) : []
    const contraEntries = Array.isArray(raw.contraEntries) ? raw.contraEntries.map(mapContraEntrySummary) : []
    return {
        po: {
            poId: po.poId || "",
            poNumber: po.poNumber || "—",
            poStatus: po.poStatus || "—",
            poStatusConfig: PO_STATUS_CONFIG[po.poStatus] || { label: po.poStatus || "—", color: "text-gray-500" },
            vendorId: po.vendorId || "",
            vendorName: po.vendorName || "—",
            projectId: po.projectId || "",
            totalOrderValue: po.totalOrderValue ?? 0,
            totalOrderValueFormatted: formatCurrency(po.totalOrderValue),
            expectedDeliveryDate: po.expectedDeliveryDate || null,
            expectedDeliveryDateFormatted: formatDate(po.expectedDeliveryDate),
            approvedAt: po.approvedAt || null,
            approvedAtFormatted: formatDate(po.approvedAt),
        },
        matchStatus: raw.matchStatus || "NOT_STARTED",
        matchStatusConfig: MATCH_STATUS_CONFIG[raw.matchStatus] || MATCH_STATUS_CONFIG.NOT_STARTED,
        itemLevelMatch,
        financials,
        quantities,
        grns,
        payables,
        contraEntries,
    }
}

function abbreviateCount(num) {
  if (num == null || isNaN(num)) return "0"
  const abs = Math.abs(num)
  const sign = num < 0 ? "-" : ""
  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000
    return sign + (Number.isInteger(v) ? v : +v.toFixed(1)) + "B"
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000
    return sign + (Number.isInteger(v) ? v : +v.toFixed(1)) + "M"
  }
  if (abs >= 1_000) {
    const v = abs / 1_000
    return sign + (Number.isInteger(v) ? v : +v.toFixed(1)) + "K"
  }
  return sign + String(abs)
}

function abbreviateIndianCurrency(num) {
  if (num == null || isNaN(num)) return "₹0"
  const abs = Math.abs(num)
  const sign = num < 0 ? "-" : ""
  if (abs >= 1_00_00_000) {
    const v = abs / 1_00_00_000
    const formatted = +v.toFixed(2) % 1 === 0 ? Math.round(v) : +v.toFixed(2)
    return sign + "₹" + formatted + " Cr"
  }
  if (abs >= 1_00_000) {
    const v = abs / 1_00_000
    const formatted = +v.toFixed(2) % 1 === 0 ? Math.round(v) : +v.toFixed(2)
    return sign + "₹" + formatted + " L"
  }
  if (abs >= 1_000) {
    const v = abs / 1_000
    const formatted = +v.toFixed(1) % 1 === 0 ? Math.round(v) : +v.toFixed(1)
    return sign + "₹" + formatted + "K"
  }
  return sign + "₹" + abs.toLocaleString("en-IN")
}


export function computeTWMStats(records) {
  const matched   = records.filter((r) => r.matchStatus === "MATCHED").length
  const unmatched = records.filter((r) => r.matchStatus === "UNMATCHED").length
  const partial   = records.filter((r) => r.matchStatus === "PARTIAL_MATCH").length
  const pending   = records.filter((r) =>
    r.matchStatus === "PENDING_GRN" ||
    r.matchStatus === "PENDING_INVOICE" ||
    r.matchStatus === "NOT_STARTED"
  ).length
  const tolerated = records.filter((r) => r.matchStatus === "TOLERATED").length

  const totalOrderedValue = records.reduce((s, r) => s + (r.financials?.orderedValue    || 0), 0)
  const totalOutstanding  = records.reduce((s, r) => s + (r.financials?.outstandingValue || 0), 0)

  return {
    cards: [
      {
        id: 1,
        title: "Matched",
        value: abbreviateCount(matched),
        subtitle: "POs fully reconciled",
        colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
      },
      {
        id: 2,
        title: "Unmatched",
        value: abbreviateCount(unmatched),
        subtitle: "POs with discrepancies",
        colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
      },
      {
        id: 3,
        title: "Pending",
        value: abbreviateCount(pending),
        subtitle: "Awaiting GRN / Invoice",
        colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
      },
      {
        id: 4,
        title: "Total Ordered",
        value: abbreviateIndianCurrency(totalOrderedValue),
        subtitle: `Outstanding: ${abbreviateIndianCurrency(totalOutstanding)}`,
        colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
      },
      {
        id: 5,
        title: "Tolerated",
        value: abbreviateCount(tolerated),
        subtitle: "Within 2% variance",
        colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
      },
    ],
  }
}


export async function fetchTWMList({
    page = 1,
    limit = 50,
    search = "",
    matchStatus,
    projectId,
    vendorId,
    sortBy = "createdAt",
    order = "desc",
    dateFrom,
    dateTo,
    signal = null,
} = {}) {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (search?.trim()) params.append("search", search.trim())
    if (matchStatus) params.append("matchStatus", matchStatus)
    if (projectId) params.append("projectId", projectId)
    if (vendorId) params.append("vendorId", vendorId)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/reconciliation/twm?${params.toString()}`,
            { headers: getTWMHeaders(), signal }
        )
        const rawRecords = data.data?.records || []
        const pagination = data.data?.pagination || {
            total: rawRecords.length, page, limit,
            totalPages: 1, hasNext: false, hasPrev: false,
        }
        return { records: rawRecords.map(mapTWMRecord), pagination }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatTWMError(error))
    }
}


export async function fetchTWMDetail(poId, signal = null) {
    if (!poId) throw new Error("poId is required")
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/reconciliation/twm/${poId}`,
            { headers: getTWMHeaders(), signal }
        )
        const raw = data.data
        if (!raw) throw new Error("TWM detail missing in response")
        return mapTWMDetail(raw)
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatTWMError(error))
    }
}