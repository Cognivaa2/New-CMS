import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatWOError(error) {
    const desc =
        error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        "Something went wrong"
    return typeof desc === "string" ? desc : "Something went wrong"
}

function getWOHeaders() {
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
    return {
        id: user._id || user.id || "",
        keycloakId: user.keycloakId || "",
        name: user.name || "Unknown",
        email: user.email || "",
        role: user.designation || user.role || "Member",
        avatar: user.avatar || user.avatarUrl || null,
    }
}

function mapWOItem(raw) {
    if (!raw) return null
    return {
        description: raw.description || "",
        unit: raw.unit || "Units",
        quantity: raw.quantity ?? 0,
        unitRate: raw.unitRate ?? 0,
        amount: raw.amount ?? 0,
    }
}

function mapMilestone(raw) {
    if (!raw) return null
    return {
        id: raw._id || "",
        title: raw.title || "",
        description: raw.description || "",
        triggerPercent: raw.triggerPercent ?? 0,
        paymentPercent: raw.paymentPercent ?? 0,
        amount: raw.paymentAmount ?? 0,
        dueDate: raw.dueDate || null,
        dueDateFormatted: formatDate(raw.dueDate),
        status: raw.status || "Pending",
        triggeredAt: raw.triggeredAt || null,
        paidAt: raw.paidAt || null,
    }
}

export function mapWO(raw) {
    if (!raw) return null

    const workItems = Array.isArray(raw.workItems)
        ? raw.workItems.map(mapWOItem)
        : []

    const milestones = Array.isArray(raw.milestones)
        ? raw.milestones.map(mapMilestone)
        : []

    const workDescriptions = workItems.map((i) => i.description).filter(Boolean)
    const workSummary =
        workDescriptions.length === 0
            ? "—"
            : workDescriptions.length <= 2
                ? workDescriptions.join(", ")
                : `${workDescriptions.slice(0, 2).join(", ")}, +${workDescriptions.length - 2} more`

    return {
        id: raw._id,
        woId: raw.woNumber || "—",
        woNumber: raw.woNumber || "—",
        title: raw.title || "—",
        description: raw.description || "",
        vendorId: raw.vendorId || null,
        vendorName: raw.vendorName || "—",
        phaseId: raw.phaseId || null,
        workItems,
        workSummary,
        totalContractValue: raw.totalContractValue ?? 0,
        hasMilestones: raw.hasMilestones ?? false,
        milestones,
        status: raw.status || "Draft",
        startDate: raw.startDate || null,
        expectedEndDate: raw.expectedEndDate || null,
        actualEndDate: raw.actualEndDate || null,
        startDateFormatted: formatDate(raw.startDate),
        expectedEndFormatted: formatDate(raw.expectedEndDate),
        workLocation: raw.workLocation || "",
        paymentTerms: raw.paymentTerms || "",
        specialInstructions: raw.specialInstructions || "",
        completionPercent: raw.completionPercent ?? 0,
        completionRemarks: raw.completionRemarks || "",
        rejectionRemarks: raw.rejectionRemarks || "",
        cancellationRemarks: raw.cancellationRemarks || "",
        createdBy: mapUser(raw.createdBy),
        submittedBy: mapUser(raw.submittedBy),
        approvedBy: mapUser(raw.approvedBy),
        rejectedBy: mapUser(raw.rejectedBy),
        cancelledBy: mapUser(raw.cancelledBy),
        completedBy: mapUser(raw.completedBy),
        inProgressBy: mapUser(raw.inProgressBy),
        submittedAt: raw.submittedAt || null,
        approvedAt: raw.approvedAt || null,
        rejectedAt: raw.rejectedAt || null,
        cancelledAt: raw.cancelledAt || null,
        completedAt: raw.completedAt || null,
        inProgressAt: raw.inProgressAt || null,
        createdAt: formatDate(raw.createdAt),
        updatedAt: raw.updatedAt || "",
    }
}

export function buildWOPayload(form, createdBy = null, updatedBy = null) {
    const milestones = form.hasMilestones
        ? (form.milestones || [])
            .filter((m) => m.title?.trim())
            .map((m) => ({
                title: m.title || "",
                description: m.description || "",
                triggerPercent: Number(m.triggerPercent) || 0,
                paymentPercent: Number(m.paymentPercent) || 0,
                dueDate: m.dueDate || null,
            }))
        : []

    const workItems = (form.workItems || [])
        .filter((i) => i.description?.trim() && i.quantity > 0)
        .map((item) => ({
            description: item.description || "",
            unit: item.unit || "Units",
            quantity: Number(item.quantity) || 0,
            unitRate: Number(item.unitRate) || 0,
        }))

    const payload = {
        vendorId: form.vendorId || null,
        title: form.title || "",
        description: form.description || null,
        workItems,
        hasMilestones: form.hasMilestones ?? false,
        milestones,
        startDate: form.startDate
            ? form.startDate instanceof Date
                ? form.startDate.toISOString()
                : form.startDate
            : null,
        expectedEndDate: form.expectedEndDate
            ? form.expectedEndDate instanceof Date
                ? form.expectedEndDate.toISOString()
                : form.expectedEndDate
            : null,
        workLocation: form.workLocation || null,
        paymentTerms: form.paymentTerms || null,
        specialInstructions: form.specialInstructions || null,
        phaseId: form.phaseId || null,
    }

    if (createdBy) payload.createdBy = createdBy
    if (updatedBy) payload.updatedBy = updatedBy

    return payload
}

export function computeWOStats(wos) {
    const draft = wos.filter((w) => w.status === "Draft").length
    const submitted = wos.filter((w) => w.status === "Submitted").length
    const approved = wos.filter((w) => w.status === "Approved").length
    const inProgress = wos.filter((w) => w.status === "InProgress").length
    const completed = wos.filter((w) => w.status === "Completed").length
    const totalValue = wos.reduce((sum, w) => sum + (w.totalContractValue || 0), 0)

    return [
        { id: 1, title: "Draft WOs", value: draft, subtitle: "Pending submission", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
        { id: 2, title: "Submitted WOs", value: submitted, subtitle: "Awaiting approval", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
        { id: 3, title: "In Progress", value: inProgress, subtitle: "Active work orders", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
        { id: 4, title: "Completed WOs", value: completed, subtitle: "Finished work orders", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
        { id: 5, title: "Total Value", value: `₹${totalValue.toLocaleString("en-IN")}`, subtitle: "Across all WOs", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    ]
}

export async function fetchAllWOs(projectId, {
    page = 1,
    limit = 10,
    search = "",
    status,
    vendorId,
    sortBy = "createdAt",
    order = "desc",
    lastId,
    signal = null,
} = {}) {
    if (!projectId) throw new Error("projectId is required")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)
    if (vendorId) params.append("vendorId", vendorId)
    if (lastId) params.append("lastId", lastId)

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/wo/${projectId}?${params.toString()}`,
            { headers: getWOHeaders(), signal }
        )
        const rawWOs = data.data?.wos || []
        const raw = data.data?.pagination || {}

        const total = raw.total ?? rawWOs.length
        const totalPages = raw.totalPages ?? 1
        const curPage = raw.page ?? page

        const hasNextPage = raw.hasNextPage ?? raw.hasNext ?? (curPage < totalPages)
        const nextCursor = raw.nextCursor ?? (hasNextPage ? String(curPage + 1) : null)

        return {
            wos: rawWOs.map(mapWO),
            pagination: { ...raw, total, page: curPage, totalPages, hasNextPage, nextCursor },
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function fetchSingleWO(projectId, woId, signal = null) {
    if (!projectId || !woId) throw new Error("projectId and woId are required")
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/wo/${projectId}/${woId}`,
            { headers: getWOHeaders(), signal }
        )
        const raw = data.data?.wo
        if (!raw) throw new Error("WO data missing in response")
        return mapWO(raw)
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function createWO(projectId, payload, signal = null) {
    if (!projectId) throw new Error("projectId is required")
    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/wo/${projectId}`,
            payload,
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function editWO(projectId, woId, payload, signal = null) {
    if (!projectId || !woId) throw new Error("projectId and woId are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/${woId}`,
            payload,
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function submitWO(projectId, woId, updatedBy, signal = null) {
    if (!projectId || !woId || !updatedBy)
        throw new Error("projectId, woId and updatedBy are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/submit/${woId}`,
            { updatedBy },
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function approveWO(projectId, woId, actionBy, signal = null) {
    if (!projectId || !woId || !actionBy)
        throw new Error("projectId, woId and actionBy are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/approve/${woId}`,
            { actionBy },
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function rejectWO(projectId, woId, actionBy, rejectionRemarks = "", signal = null) {
    if (!projectId || !woId || !actionBy)
        throw new Error("projectId, woId and actionBy are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/reject/${woId}`,
            { actionBy, rejectionRemarks },
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function cancelWO(projectId, woId, actionBy, cancellationRemarks = "", signal = null) {
    if (!projectId || !woId || !actionBy)
        throw new Error("projectId, woId and actionBy are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/cancel/${woId}`,
            { actionBy, cancellationRemarks },
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function startWO(projectId, woId, actionBy, signal = null) {
    if (!projectId || !woId || !actionBy)
        throw new Error("projectId, woId and actionBy are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/start/${woId}`,
            { actionBy },
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function completeWO(projectId, woId, actionBy, completionRemarks = "", actualEndDate = null, signal = null) {
    if (!projectId || !woId || !actionBy)
        throw new Error("projectId, woId and actionBy are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/wo/${projectId}/complete/${woId}`,
            { actionBy, completionRemarks, actualEndDate },
            { headers: getWOHeaders(), signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}

export async function deleteWO(projectId, woId, deletedBy, signal = null) {
    if (!projectId || !woId || !deletedBy)
        throw new Error("projectId, woId and deletedBy are required")
    try {
        const { data } = await axios.delete(
            `${API_BASE_URL}/wo/${projectId}/${woId}`,
            { headers: getWOHeaders(), data: { deletedBy }, signal }
        )
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(formatWOError(error))
    }
}


export async function fetchVendorsLookupForWO(search = "", signal = null) {
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")

    const params = new URLSearchParams()
    params.append("isActive", "true")
    if (search?.trim()) params.append("search", search.trim())

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/vendors/lookup?${params.toString()}`,
            {
                headers: { ...getAuthHeaders(), "x-company-id": companyId },
                signal,
                timeout: 10000
            }
        )
        return data.data?.vendors || []
    } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") throw error
        console.error("[fetchVendorsLookupForWO] failed:", error.message)
        return []
    }
}

export async function exportWOPdf(projectId, woId, woNumber, signal = null) {
    if (!projectId || !woId) throw new Error("projectId and woId are required")

    try {
        const response = await axios.get(
            `${API_BASE_URL}/wo/${projectId}/${woId}/export/pdf`,
            {
                headers: getWOHeaders(),
                responseType: "blob",
                signal,
            }
        )
        const disposition = response.headers["content-disposition"]
        let filename = `${woNumber || "WorkOrder"}.pdf`
        if (disposition) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (match?.[1]) {
                filename = match[1].replace(/['"]/g, "").trim()
            }
        }
        const blob = new Blob([response.data], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1500)

        return { success: true, filename }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        if (error.response?.data instanceof Blob) {
            try {
                const text = await error.response.data.text()
                const json = JSON.parse(text)
                throw new Error(
                    json.description || json.message || "Failed to export PDF"
                )
            } catch (parseErr) {
                if (parseErr.message !== "Failed to export PDF") {
                    throw new Error(formatWOError(error))
                }
                throw parseErr
            }
        }

        throw new Error(formatWOError(error))
    }
}

export async function exportWCCPdf(projectId, woId, woNumber, signal = null) {
    if (!projectId || !woId) throw new Error("projectId and woId are required")

    try {
        const response = await axios.get(
            `${API_BASE_URL}/wo/${projectId}/${woId}/export/wcc`,
            {
                headers: getWOHeaders(),
                responseType: "blob",
                signal,
            }
        )

        const disposition = response.headers["content-disposition"]
        let filename = `WCC_${woNumber || "WorkOrder"}.pdf`
        if (disposition) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (match?.[1]) {
                filename = match[1].replace(/['"]/g, "").trim()
            }
        }

        const blob = new Blob([response.data], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1500)

        return { success: true, filename }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        if (error.response?.data instanceof Blob) {
            try {
                const text = await error.response.data.text()
                const json = JSON.parse(text)
                throw new Error(json.description || json.message || "Failed to export WCC PDF")
            } catch (parseErr) {
                if (parseErr.message !== "Failed to export WCC PDF") {
                    throw new Error(formatWOError(error))
                }
                throw parseErr
            }
        }
        throw new Error(formatWOError(error))
    }
}