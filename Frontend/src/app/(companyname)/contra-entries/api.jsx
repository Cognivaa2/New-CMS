import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()
export function formatCEError(error) {
    const desc =
        error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        "Something went wrong"
    return typeof desc === "string" ? desc : "Something went wrong"
}

function getCEHeaders() {
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")
    return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function getKeycloakId() {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("keycloakId") || localStorage.getItem("userId") || ""
}

export function formatDate(dateStr) {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

export function formatCurrency(val) {
    if (val == null || isNaN(val)) return "₹0"
    return `₹${Number(val).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`
}

export function formatCompactNumber(val) {
    if (val == null || isNaN(val)) return "0"

    const num = Number(val)
    const abs = Math.abs(num)
    const sign = num < 0 ? "-" : ""
    const short = (n) => Number(n.toFixed(1)).toString()

    if (abs >= 1e7) return `${sign}${short(abs / 1e7)}Cr`
    if (abs >= 1e5) return `${sign}${short(abs / 1e5)}L`
    if (abs >= 1e3) return `${sign}${short(abs / 1e3)}K`

    return `${num}`
}

export function formatCompactCurrency(val) {
    if (val == null || isNaN(val)) return "₹0"

    const num = Number(val)
    const abs = Math.abs(num)
    const sign = num < 0 ? "-" : ""
    const short = (n) => Number(n.toFixed(1)).toString()

    if (abs >= 1e7) return `${sign}₹${short(abs / 1e7)}Cr`
    if (abs >= 1e5) return `${sign}₹${short(abs / 1e5)}L`
    if (abs >= 1e3) return `${sign}₹${short(abs / 1e3)}K`

    return `${sign}₹${abs.toLocaleString("en-IN")}`
}

export const CE_STATUS_CONFIG = {
    Draft: {
        label: "Draft",
        color: "#a1a1aa",
        className:
            "text-gray-600 bg-gray-100 border border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]",
    },
    Submitted: {
        label: "Submitted",
        color: "#3b82f6",
        className:
            "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    },
    Approved: {
        label: "Approved",
        color: "#22c55e",
        className:
            "text-[#16a34a] bg-[#ebfbf1] border border-[#c1f0d0] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400",
    },
    Rejected: {
        label: "Rejected",
        color: "#dc2626",
        className:
            "text-red-600 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    },
}
export const CE_TYPE_CONFIG = {
    QUANTITY_CORRECTION: { label: "Qty Correction", short: "QTY" },
    PRICE_CORRECTION: { label: "Price Correction", short: "PRICE" },
    OVERBILLING_ADJUSTMENT: { label: "Overbilling Adj.", short: "OVER" },
    OTHER: { label: "Other", short: "OTHER" },
}

export const CE_DIRECTION_CONFIG = {
    DEBIT_VENDOR: { label: "Debit Vendor", short: "Debit", isDebit: true },
    CREDIT_VENDOR: { label: "Credit Vendor", short: "Credit", isDebit: false },
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

export function mapCE(raw) {
    if (!raw) return null

    const typeConfig = CE_TYPE_CONFIG[raw.type] || { label: raw.type || "—", short: "—" }
    const dirConfig = CE_DIRECTION_CONFIG[raw.direction] || {
        label: raw.direction || "—", short: "—", isDebit: false,
    }

    return {
        id: raw._id || "",
        ceNumber: raw.ceNumber || "—",
        poId: raw.poId || "",
        poNumber: raw.poNumber || "—",
        projectId: raw.projectId || "",
        vendorId: raw.vendorId || "",
        vendorName: raw.vendorName || "—",
        payableId: raw.payableId || null,
        type: raw.type || "—",
        typeLabel: typeConfig.label,
        typeShort: typeConfig.short,
        adjustmentAmount: raw.adjustmentAmount ?? 0,
        adjustmentAmountFormatted: formatCurrency(raw.adjustmentAmount),
        direction: raw.direction || "—",
        directionLabel: dirConfig.label,
        directionShort: dirConfig.short,
        isDebit: dirConfig.isDebit,
        reason: raw.reason || "—",
        remarks: raw.remarks || "",
        rejectionRemarks: raw.rejectionRemarks || "",
        status: raw.status || "Draft",
        statusConfig: CE_STATUS_CONFIG[raw.status] || CE_STATUS_CONFIG.Draft,
        createdBy: mapUser(raw.createdBy),
        updatedBy: mapUser(raw.updatedBy),
        submittedBy: mapUser(raw.submittedBy),
        approvedBy: mapUser(raw.approvedBy),
        rejectedBy: mapUser(raw.rejectedBy),
        createdAt: formatDate(raw.createdAt),
        submittedAt: formatDate(raw.submittedAt),
        approvedAt: formatDate(raw.approvedAt),
        rejectedAt: formatDate(raw.rejectedAt),
        rawCreatedAt: raw.createdAt || "",
    }
}
export function computeCEStats(records) {
    const draft     = records.filter((r) => r.status === "Draft").length
    const submitted = records.filter((r) => r.status === "Submitted").length
    const approved  = records.filter((r) => r.status === "Approved").length
    const rejected  = records.filter((r) => r.status === "Rejected").length

    const totalAmount = records.reduce((s, r) => s + (r.adjustmentAmount || 0), 0)
    const approvedAmount = records
        .filter((r) => r.status === "Approved")
        .reduce((s, r) => s + (r.adjustmentAmount || 0), 0)

    return [
        {
            id: 1,
            title: "Draft",
            value: formatCompactNumber(draft),
            subtitle: "Pending submission",
            colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
        },
        {
            id: 2,
            title: "Submitted",
            value: formatCompactNumber(submitted),
            subtitle: "Awaiting approval",
            colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
        },
        {
            id: 3,
            title: "Approved",
            value: formatCompactNumber(approved),
            subtitle: "Applied to POs",
            colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
        },
        {
            id: 4,
            title: "Rejected",
            value: formatCompactNumber(rejected),
            subtitle: "Declined entries",
            colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
        },
        {
            id: 5,
            title: "Approved Amt",
            value: formatCompactCurrency(approvedAmount),
            subtitle: `Total: ${formatCompactCurrency(totalAmount)}`,
            colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
        },
    ]
}

export async function fetchAllCEs({
    projectId,
    page = 1,
    limit = 20,
    status,
    type,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
} = {}) {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (projectId) params.append("projectId", projectId)
    if (status) params.append("status", status)
    if (type) params.append("type", type)

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/reconciliation/contra?${params.toString()}`,
            { headers: getCEHeaders(), signal }
        )
        const rawCEs = data.data?.contraEntries || []
        const pagination = data.data?.pagination || {
            total: rawCEs.length, page, limit,
            totalPages: 1, hasNext: false, hasPrev: false,
        }
        return { contraEntries: rawCEs.map(mapCE), pagination }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatCEError(error))
    }
}

export async function createCE(payload, signal = null) {
    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/reconciliation/contra`,
            payload,
            { headers: getCEHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatCEError(error))
    }
}

export async function submitCE(ceId, updatedBy, signal = null) {
    if (!ceId) throw new Error("ceId is required")
    if (!updatedBy) throw new Error("updatedBy (keycloakId) is required — check localStorage")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/reconciliation/contra/submit/${ceId}`,
            { updatedBy },
            { headers: getCEHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatCEError(error))
    }
}

export async function approveCE(ceId, actionBy, signal = null) {
    if (!ceId) throw new Error("ceId is required")
    if (!actionBy) throw new Error("actionBy (keycloakId) is required — check localStorage")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/reconciliation/contra/approve/${ceId}`,
            { actionBy },
            { headers: getCEHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatCEError(error))
    }
}
export async function rejectCE(ceId, actionBy, rejectionRemarks = "", signal = null) {
    if (!ceId) throw new Error("ceId is required")
    if (!actionBy) throw new Error("actionBy (keycloakId) is required — check localStorage")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/reconciliation/contra/reject/${ceId}`,
            { actionBy, rejectionRemarks },
            { headers: getCEHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatCEError(error))
    }
}
export async function fetchGlobalPOLookup({
    search = "",
    projectId,
    vendorId,
    signal = null,
} = {}) {
    const params = new URLSearchParams()
    if (search?.trim()) params.append("search", search.trim())
    if (projectId) params.append("projectId", projectId)
    if (vendorId) params.append("vendorId", vendorId)

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/po/lookup?${params.toString()}`,
            { headers: getCEHeaders(), signal }
        )
        return data.data?.pos || []
    } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") throw error
        throw new Error(formatCEError(error))
    }
}