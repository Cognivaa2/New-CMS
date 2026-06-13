import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatConsumptionError(error) {
    const desc =
        error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        "Something went wrong"
    return typeof desc === "string" ? desc : "Something went wrong"
}

function getConsumptionHeaders() {
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")
    return { ...getAuthHeaders(), "x-company-id": companyId }
}

function formatDate(dateStr) {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

function mapUser(user) {
    if (!user) return null
    if (typeof user === "string") return { id: user, name: "Unknown", email: "", role: "", avatar: null }
    return {
        id: user.id || user._id || "",
        keycloakId: user.keycloakId || "",
        name: user.name || "Unknown",
        email: user.email || "",
        role: user.role || user.designation || "Member",
        avatar: user.avatar || user.avatarUrl || null,
    }
}

export function mapConsumption(raw) {
    if (!raw) return null
    return {
        id: raw.consumptionId || raw._id,
        consumptionId: raw.consumptionId || raw._id,
        projectId: raw.projectId || null,
        phaseId: raw.phaseId || null,
        phaseName: raw.phaseName || null,
        taskId: raw.taskId || null,
        taskName: raw.taskName || null,
        subTaskId: raw.subTaskId || null,
        subTaskName: raw.subTaskName || null,
        workOrderId: raw.workOrderId || null,
        isWOConsumption: raw.isWOConsumption ?? false,
        inventoryId: raw.inventoryId || null,
        materialMasterId: raw.materialMasterId || null,
        materialName: raw.materialName || "—",
        unit: raw.unit || "—",
        quantityConsumed: raw.quantityConsumed ?? 0,
        pricePerUnit: raw.pricePerUnit ?? 0,
        totalCost: raw.totalCost ?? 0,
        source: raw.source || "StockIssue",
        remarks: raw.remarks || "",
        recordedBy: mapUser(raw.recordedBy),
        createdAt: formatDate(raw.createdAt),
        updatedAt: raw.updatedAt || null,
    }
}

export function buildConsumptionPayload(form, recordedBy) {
    return {
        inventoryId: form.inventoryId || null,
        materialMasterId: form.materialMasterId || null,
        materialName: form.materialName || "",
        unit: form.unit || "Units",
        quantityConsumed: Number(form.quantityConsumed) || 0,
        pricePerUnit: Number(form.pricePerUnit) || 0,
        totalCost: Number(form.totalCost) || 0,
        source: form.source || "StockIssue",
        remarks: form.remarks || null,
        phaseId: form.phaseId || null,
        taskId: form.taskId || null,
        subTaskId: form.subTaskId || null,
        recordedBy,
    }
}

export function computeConsumptionStats(records) {
    const totalCost = records.reduce((sum, r) => sum + (r.totalCost || 0), 0)
    const totalQty = records.reduce((sum, r) => sum + (r.quantityConsumed || 0), 0)
    const uniqueMaterials = new Set(records.map((r) => r.materialName)).size
    const woCount = records.filter((r) => r.isWOConsumption).length
    const stockCount = records.filter((r) => !r.isWOConsumption).length

    return [
        { id: 1, title: "Total Records", value: records.length, subtitle: "Consumption entries", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
        { id: 2, title: "Total Cost", value: `₹${totalCost.toLocaleString("en-IN")}`, subtitle: "Material spend", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
        { id: 3, title: "Total Quantity", value: totalQty.toLocaleString("en-IN"), subtitle: "Units consumed", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
        { id: 4, title: "Unique Materials", value: uniqueMaterials, subtitle: "Distinct materials", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
        { id: 5, title: "WO Consumption", value: woCount, subtitle: `${stockCount} stock issues`, colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    ]
}

export async function fetchConsumptionByProject(projectId, {
    page = 1,
    limit = 10,
    search = "",
    source,
    subTaskId,
    workOrderId,
    isWOConsumption,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
} = {}) {
    if (!projectId) throw new Error("projectId is required")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (search?.trim()) params.append("search", search.trim())
    if (source) params.append("source", source)
    if (subTaskId) params.append("subTaskId", subTaskId)
    if (workOrderId) params.append("workOrderId", workOrderId)
    if (isWOConsumption !== undefined) params.append("isWOConsumption", String(isWOConsumption))

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/consumption/${projectId}?${params.toString()}`,
            { headers: getConsumptionHeaders(), signal }
        )
        const rawRecords = data.data?.consumptionRecords || []
        const pagination = data.data?.pagination || {
            total: rawRecords.length, page, limit,
            totalPages: 1, hasNext: false, hasPrev: false,
        }
        const summary = data.data?.summary || null

        return {
            records: rawRecords.map(mapConsumption),
            pagination,
            summary,
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatConsumptionError(error))
    }
}

export async function recordConsumption(projectId, payload, signal = null) {
    if (!projectId) throw new Error("projectId is required")
    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/consumption/${projectId}`,
            payload,
            { headers: getConsumptionHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatConsumptionError(error))
    }
}

export async function deleteConsumptionRecord(projectId, consumptionId, deletedBy, signal = null) {
    if (!projectId || !consumptionId) throw new Error("projectId and consumptionId are required")
    try {
        const { data } = await axios.delete(
            `${API_BASE_URL}/consumption/${projectId}/${consumptionId}`,
            { headers: getConsumptionHeaders(), data: { deletedBy }, signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatConsumptionError(error))
    }
}

export async function fetchInventoryLookup(projectId, search = "", signal = null) {
    if (!projectId) throw new Error("projectId is required")
    const params = new URLSearchParams()
    params.append("page", "1")
    params.append("limit", "50")
    if (search?.trim()) params.append("search", search.trim())

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/inventory/${projectId}?${params.toString()}`,
            { headers: getConsumptionHeaders(), signal }
        )
        return data.data?.inventoryItems || []
    } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") throw error
        console.error("[fetchInventoryLookup] failed:", error.message)
        return []
    }
}
export async function fetchSubTaskLookup(projectId, search = "", signal = null) {
    const params = new URLSearchParams()
    params.append("page", "1")
    params.append("limit", "200")
    if (search?.trim()) params.append("search", search.trim())

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/subtask/all/lookup?${params.toString()}`,
            { headers: getConsumptionHeaders(), signal }
        )
        const all = data.data?.subTasks || []
        return projectId
            ? all.filter((st) => st.projectId?.toString() === projectId?.toString())
            : all
    } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") throw error
        console.error("[fetchSubTaskLookup] failed:", error.message)
        return []
    }
}