import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatSafetyError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

function getSafetyHeaders(isFormData = false) {
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

function mapEntry(raw) {
  if (!raw) return null
  return {
    id: raw._id || raw.id || "",
    title: raw.title || "",
    category: raw.category || "",
    status: raw.status || "",
    severity: raw.severity || "",
    location: raw.location || "",
    description: raw.description || "",
    remarks: raw.remarks || "",
    inspectedBy: mapUser(raw.inspectedByUser || raw.inspectedBy),
    inspectedByRaw: raw.inspectedBy || "",
    isResolved: raw.isResolved ?? false,
    resolvedAt: raw.resolvedAt || null,
    resolvedAtFormatted: formatDate(raw.resolvedAt),
    resolvedBy: mapUser(raw.resolvedByUser || raw.resolvedBy),
    inspectionDate: raw.inspectionDate || null,
    resolutionNote: raw.resolutionNote || "",
    attachment: raw.attachment || null,
  }
}

export function mapInspection(raw) {
  if (!raw) return null

  const entries = Array.isArray(raw.entries)
    ? raw.entries.map(mapEntry)
    : []

  const entryTitles = entries.map((e) => e.title).filter(Boolean)
  const entrySummary =
    entryTitles.length === 0
      ? null
      : entryTitles.length <= 2
        ? entryTitles.join(", ")
        : `${entryTitles.slice(0, 2).join(", ")}, +${entryTitles.length - 2} more`

  const statuses = entries.map((e) => e.status).filter(Boolean)
  const hasAnyFail = statuses.includes("Fail")
  const allPass = statuses.length > 0 && statuses.every((s) => s === "Pass")
  const overallStatus = hasAnyFail
    ? "Fail"
    : allPass
      ? "Pass"
      : statuses.includes("Observation")
        ? "Observation"
        : ""

  const unresolvedCount = entries.filter(
    (e) => (e.status === "Fail" || e.status === "Observation") && !e.isResolved
  ).length

  return {
    id: raw._id,
    inspectionNumber: raw.inspectionNumber || null,
    projectId: raw.projectId || null,
    projectName: raw.projectName || null,
    entries,
    entrySummary,
    entryCount: entries.length,
    overallStatus,
    unresolvedCount,
    createdBy: mapUser(raw.createdByUser || raw.createdBy),
    updatedBy: mapUser(raw.updatedByUser || raw.updatedBy),
    createdAt: raw.createdAt || "",
    createdAtFormatted: formatDate(raw.createdAt),
    updatedAt: raw.updatedAt || "",
    updatedAtFormatted: formatDate(raw.updatedAt),
  }
}

export function buildInspectionPayload(form, createdBy = null) {
  const formData = new FormData()
  if (createdBy) formData.append("createdBy", createdBy)

  const entries = (form.entries || [])
    .filter((e) => e.title?.trim() && e.inspectedBy?.trim())
    .map((entry) => ({
      title: entry.title?.trim() || "",
      category: entry.category || "Safety",
      status: entry.status || "Observation",
      severity: entry.severity || "Low",
      inspectionDate: entry.inspectionDate
        ? entry.inspectionDate instanceof Date
          ? entry.inspectionDate.toISOString()
          : String(entry.inspectionDate)
        : null,
      location: entry.location?.trim() || "",
      description: entry.description?.trim() || "",
      remarks: entry.remarks?.trim() || "",
      inspectedBy: entry.inspectedBy?.trim() || "",
      _id: entry.id || entry._id || undefined,
    }))

  formData.append("entries", JSON.stringify(entries))

  ;(form.entries || []).forEach((entry, index) => {
    if (entry.attachmentFile instanceof File) {
      formData.append(`attachment_${index}`, entry.attachmentFile, entry.attachmentFile.name)
    }
  })

  return formData
}

export function computeSafetyStats(inspections, projectSummary = {}) {
  return [
    {
      id: 1,
      title: "Total Inspections",
      value: projectSummary.totalInspections ?? inspections.length,
      subtitle: "All inspections",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 2,
      title: "Pass Rate",
      value: `${projectSummary.passRate ?? 0}%`,
      subtitle: `${projectSummary.pass ?? 0} passed entries`,
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 3,
      title: "Unresolved Fails",
      value: projectSummary.unresolvedFails ?? 0,
      subtitle: "Needs attention",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 4,
      title: "Total Entries",
      value: projectSummary.totalEntries ?? 0,
      subtitle: `${projectSummary.safetyEntries ?? 0} safety · ${projectSummary.qualityEntries ?? 0} quality`,
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
  ]
}

export async function fetchAllInspections(
  projectId,
  {
    page = 1,
    limit = 10,
    search = "",
    category,
    status,
    severity,
    isResolved,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    order = "desc",
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
  if (category) params.append("category", category)
  if (status) params.append("status", status)
  if (severity) params.append("severity", severity)
  if (isResolved !== undefined && isResolved !== "") params.append("isResolved", isResolved)
  if (dateFrom) params.append("dateFrom", dateFrom)
  if (dateTo) params.append("dateTo", dateTo)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/safety/${projectId}?${params.toString()}`,
      { headers: getSafetyHeaders(), signal }
    )

    const rawInspections = data.data?.inspections || []
    const raw = data.data?.pagination || {}
    const projectSummary = data.data?.projectSummary || {}

    const total = raw.total ?? rawInspections.length
    const totalPages = raw.totalPages ?? 1
    const curPage = raw.page ?? page

    const hasNextPage = raw.hasNext ?? raw.hasNextPage ?? (curPage < totalPages)
    const nextCursor = hasNextPage ? String(curPage + 1) : null

    return {
      inspections: rawInspections.map(mapInspection),
      projectSummary,
      pagination: { ...raw, total, page: curPage, totalPages, hasNextPage, nextCursor },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatSafetyError(error))
  }
}

export async function fetchSingleInspection(projectId, inspectionId, signal = null) {
  if (!projectId || !inspectionId) throw new Error("projectId and inspectionId are required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/safety/${projectId}/${inspectionId}`,
      { headers: getSafetyHeaders(), signal }
    )
    const raw = data.data?.inspection
    if (!raw) throw new Error("Inspection data missing in response")
    return mapInspection(raw)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatSafetyError(error))
  }
}

export async function createInspection(projectId, payload, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  const isFormData = payload instanceof FormData
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/safety/${projectId}`,
      payload,
      { headers: getSafetyHeaders(isFormData), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatSafetyError(error))
  }
}

export async function editInspection(projectId, inspectionId, payload, signal = null) {
  if (!projectId || !inspectionId) throw new Error("projectId and inspectionId are required")
  const isFormData = payload instanceof FormData
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/safety/${projectId}/${inspectionId}`,
      payload,
      { headers: getSafetyHeaders(isFormData), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatSafetyError(error))
  }
}

export async function resolveEntry(projectId, inspectionId, entryId, resolvedBy, resolutionNote = "", signal = null) {
  if (!projectId || !inspectionId || !entryId || !resolvedBy) {
    throw new Error("projectId, inspectionId, entryId and resolvedBy are required")
  }

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/safety/${projectId}/${inspectionId}/entries/resolve/${entryId}`,
      { resolvedBy, resolutionNote },
      { headers: getSafetyHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatSafetyError(error))
  }
}

export async function deleteInspection(projectId, inspectionId, deletedBy, signal = null) {
  if (!projectId || !inspectionId || !deletedBy) {
    throw new Error("projectId, inspectionId and deletedBy are required")
  }

  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/safety/${projectId}/${inspectionId}`,
      { headers: getSafetyHeaders(), data: { deletedBy }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatSafetyError(error))
  }
}