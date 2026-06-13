import axios from "axios"
import { getAuthHeaders, getCompanyId, getBaseUrl } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()
export function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
export function formatDate(dateString) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
export function formatToISO(dateString) {
  if (!dateString) return ""
  const date = dateString instanceof Date ? dateString : new Date(dateString)
  if (isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export function formatToastError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}
export function mapPhaseToCardFormat(apiPhase) {
  return {
    id: apiPhase._id || apiPhase.phaseId || apiPhase.id,
    phaseName: apiPhase.phaseName || "",
    description: apiPhase.description || "",
    sequence: apiPhase.sequence || 0,
    startDate: apiPhase.startDate || "",
    endDate: apiPhase.endDate || "",
    completionPercent: apiPhase.completionPercent || 0,
    projectId: apiPhase.projectId || "",
    createdBy: apiPhase.createdBy || null,
    updatedBy: apiPhase.updatedBy || null,
    createdAt: apiPhase.createdAt ? formatDate(apiPhase.createdAt) : "—",
    updatedAt: apiPhase.updatedAt ? formatDate(apiPhase.updatedAt) : "—",
  }
}
export function getInitialActivePhase(phases) {
  return phases.length > 0 ? phases[0] : null
}
export function updatePhaseInList(phases, updatedPhase) {
  return phases.map((p) =>
    p.id === updatedPhase.id ? { ...p, ...updatedPhase } : p
  )
}
export function removePhaseFromList(phases, phaseId) {
  return phases.filter((p) => p.id !== phaseId)
}
export async function fetchPhasesData({
  projectId,
  page = 1,
  limit = 50,
  search = "",
  sortBy = "sequence",
  order = "asc",
  minCompletion,
  maxCompletion,
  startDateFrom,
  startDateTo,
  endDateFrom,
  endDateTo,
  signal = null,
} = {}) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required")
    }
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (search?.trim()) params.append("search", search.trim())
    if (sortBy) params.append("sortBy", sortBy)
    if (order) params.append("order", order)
    if (minCompletion !== undefined) params.append("minCompletion", String(minCompletion))
    if (maxCompletion !== undefined) params.append("maxCompletion", String(maxCompletion))
    if (startDateFrom) params.append("startDateFrom", startDateFrom)
    if (startDateTo) params.append("startDateTo", startDateTo)
    if (endDateFrom) params.append("endDateFrom", endDateFrom)
    if (endDateTo) params.append("endDateTo", endDateTo)

    const { data } = await axios.get(
      `${API_BASE_URL}/phase/${projectId}/all?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch phases")
    }
    const phases = data.data?.phases || []
    const pagination = data.data?.pagination || {
      total: phases.length,
      page,
      limit,
      totalPages: 1,
    }
    return {
      phases: phases.map(mapPhaseToCardFormat),
      pagination
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch phases"
    )
  }
}
export async function fetchPhaseById(projectId, phaseId, signal = null) {
  try {
    if (!projectId || !phaseId) {
      throw new Error("Project ID and Phase ID are required")
    }
    const { data } = await axios.get(
      `${API_BASE_URL}/phase/${projectId}/${phaseId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch phase")
    }
    return mapPhaseToCardFormat(data.data)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch phase details"
    )
  }
}
export function getCurrentUserKeycloakId() {
  return localStorage.getItem("keycloakId") || ""
}
export async function addPhase(projectId, phaseData, signal = null) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required")
    }
    const payload = {
      phaseName: phaseData.phaseName?.trim() || "",
      description: phaseData.description?.trim() || "",
      startDate: formatToISO(phaseData.startDate),
      endDate: formatToISO(phaseData.endDate),
    }
    if (phaseData.createdBy) {
      payload.createdBy = phaseData.createdBy
    }
    const { data } = await axios.post(
      `${API_BASE_URL}/phase/${projectId}/add`,
      payload,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 201 && !data.data) {
      throw new Error(data.description || data.message || "Failed to create phase")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to create phase"
    )
  }
}
export async function editPhase(projectId, phaseId, phaseData, signal = null) {
  try {
    if (!projectId || !phaseId) {
      throw new Error("Project ID and Phase ID are required")
    }
    const payload = {}
    if (phaseData.phaseName !== undefined) {
      payload.phaseName = phaseData.phaseName?.trim() || ""
    }
    if (phaseData.description !== undefined) {
      payload.description = phaseData.description?.trim() || ""
    }
    if (phaseData.startDate !== undefined) {
      payload.startDate = formatToISO(phaseData.startDate)
    }
    if (phaseData.endDate !== undefined) {
      payload.endDate = formatToISO(phaseData.endDate)
    }
    const { data } = await axios.put(
      `${API_BASE_URL}/phase/${projectId}/${phaseId}/edit`,
      payload,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to update phase")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to update phase"
    )
  }
}
export async function deletePhase(projectId, phaseId, signal = null) {
  try {
    if (!projectId || !phaseId) {
      throw new Error("Project ID and Phase ID are required")
    }
    const { data } = await axios.delete(
      `${API_BASE_URL}/phase/${projectId}/${phaseId}/delete`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to delete phase")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to delete phase"
    )
  }
}
export async function reorderPhases(projectId, phaseIds, signal = null) {
  try {
    if (!projectId) {
      throw new Error("Project ID is required")
    }
    if (!Array.isArray(phaseIds) || phaseIds.length === 0) {
      throw new Error("Phase IDs array is required")
    }
    const { data } = await axios.put(
      `${API_BASE_URL}/phase/${projectId}/reorder`,
      { phases: phaseIds },
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to reorder phases")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to reorder phases"
    )
  }
}


function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function capitalizeFirst(str) {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function extractAuthorName(uploadedBy, fallback) {
  if (!uploadedBy) return fallback || "Unknown"
  if (typeof uploadedBy === "string") return uploadedBy
  return uploadedBy.name || uploadedBy.keycloakId || fallback || "Unknown"
}

export function mapDocumentToCardFormat(apiDoc) {
  if (!apiDoc) return null
  return {
    id: apiDoc._id || apiDoc.documentId || apiDoc.id,
    title: apiDoc.name || apiDoc.fileName || "Untitled",
    name: apiDoc.name || apiDoc.fileName || "Untitled",
    subtitle: apiDoc.category ? capitalizeFirst(apiDoc.category) : "",
    author: extractAuthorName(apiDoc.uploadedBy, apiDoc.uploadedByName),
    authorKeycloakId:
      typeof apiDoc.uploadedBy === "object"
        ? apiDoc.uploadedBy?.keycloakId
        : apiDoc.uploadedBy || null,
    avatarUrl:
      typeof apiDoc.uploadedBy === "object"
        ? apiDoc.uploadedBy?.avatarUrl ?? null
        : null,
    date: formatDate(apiDoc.createdAt),
    size: formatFileSize(apiDoc.fileSize),
    sizeBytes: apiDoc.fileSize || 0,
    type: apiDoc.fileType?.toLowerCase() || "other",
    mimeType: apiDoc.mimeType || "",
    fileUrl: apiDoc.fileUrl || apiDoc.viewUrl || "",
    viewUrl: apiDoc.viewUrl || apiDoc.fileUrl || "",
    fileName: apiDoc.fileName || "",
    description: apiDoc.description || "",
    category: apiDoc.category || "other",
    tags: Array.isArray(apiDoc.tags) ? apiDoc.tags : [],
    linkedTo: apiDoc.linkedTo || null,
    createdAt: apiDoc.createdAt,
    updatedAt: apiDoc.updatedAt,
    updatedBy:
      typeof apiDoc.updatedBy === "object"
        ? apiDoc.updatedBy?.keycloakId
        : apiDoc.updatedBy || null,
  }
}

export async function fetchPhaseDocuments({
  projectId,
  phaseId,
  page = 1,
  limit = 5,
  search = "",
  dateFrom,
  dateTo,
  signal = null,
} = {}) {
  try {
    if (!projectId || !phaseId) {
      throw new Error("Project ID and Phase ID are required")
    }
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (search?.trim()) params.append("search", search.trim())
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)

    const { data } = await axios.get(
      `${API_BASE_URL}/phase/${projectId}/documents/${phaseId}?${params.toString()}`,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch documents")
    }

    const documents = data.data?.documents || []
    const pagination = data.data?.pagination || {
      total: documents.length,
      page,
      limit,
      totalPages: 1,
    }

    return {
      documents: documents.map(mapDocumentToCardFormat),
      pagination,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch phase documents"
    )
  }
}
export async function fetchProjectDates(projectId, signal = null) {
  try {
    if (!projectId) throw new Error("Project ID is required")
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")

    const { data } = await axios.get(
      `${API_BASE_URL}/project/${projectId}/dates`,
      { 
        headers: { ...getAuthHeaders(), "x-company-id": companyId }, 
        signal 
      }
    )
    if (data.statusCode !== 200) {
      throw new Error(data.description || "Failed to fetch project dates")
    }
    return {
      startDate: data.data?.startDate ? new Date(data.data.startDate) : null,
      endDate: data.data?.endDate ? new Date(data.data.endDate) : null,
      projectName: data.data?.projectName,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(error.response?.data?.description || error.message)
  }
}