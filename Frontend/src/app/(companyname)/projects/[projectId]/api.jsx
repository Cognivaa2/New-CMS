// app/(companyname)/projects/[projectId]/dashboard/api.js

import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const BASE = getBaseUrl()
const DASHBOARD_BASE = `${BASE}/project/dashboard/overview` // ✅ correct base

function getHeaders() {
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

// GET /api/v1/project/dashboard/overview/:projectId/details
export async function fetchProjectDetails(projectId, signal = null) {
    const { data } = await axios.get(
        `${DASHBOARD_BASE}/${projectId}/details`,
        { headers: getHeaders(), signal }
    )
    return data.data
}

// GET /api/v1/project/dashboard/overview/:projectId/members
export async function fetchDashboardMembers(projectId, signal = null) {
    const { data } = await axios.get(
        `${DASHBOARD_BASE}/${projectId}/members`,
        { headers: getHeaders(), signal }
    )
    return data.data
}

// GET /api/v1/project/dashboard/overview/:projectId/kpis
export async function fetchProjectKPIs(projectId, signal = null) {
    const { data } = await axios.get(
        `${DASHBOARD_BASE}/${projectId}/kpis`,
        { headers: getHeaders(), signal }
    )
    return data.data
}

// GET /api/v1/project/dashboard/overview/:projectId/phase
export async function fetchPhaseGrowth(projectId, signal = null) {
    const { data } = await axios.get(
        `${DASHBOARD_BASE}/${projectId}/phase`,
        { headers: getHeaders(), signal }
    )
    return data.data
}

// GET /api/v1/project/dashboard/overview/:projectId/alerts
export async function fetchSmartAlerts(projectId, { priority, module, limit = 50 } = {}, signal = null) {
    const params = new URLSearchParams()
    params.append("limit", String(limit))
    if (priority) params.append("priority", priority)
    if (module) params.append("module", module)

    const { data } = await axios.get(
        `${DASHBOARD_BASE}/${projectId}/alerts?${params.toString()}`,
        { headers: getHeaders(), signal }
    )
    return data.data
}

export async function editProjectFromDashboard(projectId, formData, signal = null) {
    try {
        const headers = getAuthHeaders()
        delete headers["Content-Type"] // ✅ let browser set multipart boundary
        const { data } = await axios.put(
            `${BASE}/project/edit/${projectId}`, // ✅ BASE not API_BASE_URL
            formData,
            { headers, signal }
        )
        if (!data.success) throw new Error(data.description || data.message || "Failed to update project")
        return data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to update project"
        )
    }
}