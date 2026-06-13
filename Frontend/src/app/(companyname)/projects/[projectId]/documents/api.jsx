// src/app/(companyname)/projects/[projectId]/documents/api.jsx
import axios from "axios"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"
import {
  DOCUMENT_CATEGORIES,
  FILE_TYPES,
  formatFileSize,
  formatToastError
} from "@/lib/documentConstants"

const API_BASE_URL = getBaseUrl()
export { DOCUMENT_CATEGORIES, FILE_TYPES, formatFileSize, formatToastError }
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
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
export function getCurrentUserKeycloakId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("keycloakId") || ""
}
export function getCompanyId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("companyId") || ""
}
function capitalizeFirst(str) {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1)
}
function extractAuthorName(uploadedBy) {
  if (!uploadedBy) return "Unknown"
  if (typeof uploadedBy === "string") return uploadedBy
  if (typeof uploadedBy === "object") {
    return uploadedBy.name || uploadedBy.keycloakId || "Unknown"
  }
  return "Unknown"
}
function extractAuthorKeycloakId(uploadedBy) {
  if (!uploadedBy) return ""
  if (typeof uploadedBy === "string") return uploadedBy
  if (typeof uploadedBy === "object") {
    return uploadedBy.keycloakId || ""
  }
  return ""
}
export function mapDocumentToCardFormat(apiDoc) {
  if (!apiDoc) return null
  return {
    id: apiDoc._id || apiDoc.documentId || apiDoc.id,
    title: apiDoc.name || apiDoc.fileName || "Untitled",
    name: apiDoc.name || apiDoc.fileName || "Untitled",
    subtitle: apiDoc.category ? capitalizeFirst(apiDoc.category) : "",
    author: extractAuthorName(apiDoc.uploadedBy, apiDoc.uploadedByName),
    authorKeycloakId: extractAuthorKeycloakId(apiDoc.uploadedBy),
    avatarUrl: typeof apiDoc.uploadedBy === "object"   // 👈 add this
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
    updatedBy: typeof apiDoc.updatedBy === "object"
      ? apiDoc.updatedBy?.keycloakId
      : apiDoc.updatedBy || null,
  }
}
export async function uploadDocument(projectId, formData, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/document/${projectId}`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
          "Content-Type": "multipart/form-data",
        },
        signal,
      }
    )
    if (data.statusCode !== 201 && !data.success) {
      throw new Error(data.description || data.message || "Failed to upload document")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to upload document"
    )
  }
}
export async function fetchDocumentsData({
  projectId,
  page = 1,
  limit = 20,
  search = "",
  category,
  fileType,
  tags,
  uploadedBy,
  sortBy = "createdAt",
  order = "desc",
  signal = null,
} = {}) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  if (search?.trim()) params.append("search", search.trim())
  if (category) params.append("category", category)
  if (fileType) params.append("fileType", fileType)
  if (tags) params.append("tags", Array.isArray(tags) ? tags.join(",") : tags)
  if (uploadedBy) params.append("uploadedBy", uploadedBy)
  if (sortBy) params.append("sortBy", sortBy)
  if (order) params.append("order", order)
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/document/${projectId}?${params.toString()}`,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to fetch documents")
    }
    const documents = data.title?.documents || data.data?.documents || data.documents || []
    const pagination = data.title?.pagination || data.data?.pagination || data.pagination || {
      total: documents.length,
      page,
      limit,
      totalPages: 1,
    }
    const mappedDocs = documents.map(mapDocumentToCardFormat).filter(Boolean)
    return {
      documents: mappedDocs,
      pagination,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch documents"
    )
  }
}
export async function fetchDocumentById(projectId, documentId, signal = null) {
  if (!projectId || !documentId) {
    throw new Error("Project ID and Document ID are required")
  }
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/document/${projectId}/${documentId}`,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to fetch document")
    }
    const docData = data.title || data.data || data
    return mapDocumentToCardFormat(docData)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch document details"
    )
  }
}
export async function editDocument(projectId, documentId, updates, signal = null) {
  if (!projectId || !documentId) {
    throw new Error("Project ID and Document ID are required")
  }
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const updatedBy = getCurrentUserKeycloakId()
  if (!updatedBy) throw new Error("User authentication required")
  const payload = { updatedBy }
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.category !== undefined) payload.category = updates.category
  if (updates.tags !== undefined) payload.tags = updates.tags
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/document/${projectId}/${documentId}`,
      payload,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to update document")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to update document"
    )
  }
}
export async function deleteDocument(projectId, documentId, signal = null) {
  if (!projectId || !documentId) {
    throw new Error("Project ID and Document ID are required")
  }
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/document/${projectId}/${documentId}`,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to delete document")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to delete document"
    )
  }
}
export async function linkDocument(projectId, documentId, linkData, signal = null) {
  if (!projectId || !documentId) {
    throw new Error("Project ID and Document ID are required")
  }
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const updatedBy = getCurrentUserKeycloakId()
  if (!updatedBy) throw new Error("User authentication required")
  const payload = {
    refModel: linkData.refModel,
    refId: linkData.refId,
    updatedBy,
  }
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/document/${projectId}/link/${documentId}`,
      payload,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to link document")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to link document"
    )
  }
}
export async function unlinkDocument(projectId, documentId, signal = null) {
  if (!projectId || !documentId) {
    throw new Error("Project ID and Document ID are required")
  }
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const updatedBy = getCurrentUserKeycloakId()
  if (!updatedBy) throw new Error("User authentication required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/document/${projectId}/unlink/${documentId}`,
      { updatedBy },
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to unlink document")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to unlink document"
    )
  }
}
export function buildUploadFormData({ file, name, description, category, tags }) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("name", name?.trim() || file.name)
  formData.append("uploadedBy", getCurrentUserKeycloakId())
  if (description?.trim()) {
    formData.append("description", description.trim())
  }
  if (category) {
    formData.append("category", category)
  }
  if (tags && tags.length > 0) {
    formData.append("tags", JSON.stringify(tags))
  }
  return formData
}
export function removeDocumentFromList(documents, documentId) {
  return documents.filter((d) => d.id !== documentId)
}
export function updateDocumentInList(documents, updatedDoc) {
  return documents.map((d) =>
    d.id === updatedDoc.id ? { ...d, ...updatedDoc } : d
  )
}


export async function fetchPhases(projectId, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  try {
    const { data } = await axios.get(`${API_BASE_URL}/phase/${projectId}/all?limit=100&sortBy=sequence&order=asc`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal, }
    )
    const phases = data?.data?.phases || data?.title?.phases || data?.phases || []
    return phases.map((p) => ({
      value: p._id,
      label: p.phaseName,
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message || "Failed to fetch phases"
    )
  }
}


export async function fetchTasksByPhase(phaseId, signal = null) {
  if (!phaseId) throw new Error("Phase ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  try {
    const { data } = await axios.get(`${API_BASE_URL}/task/${phaseId}?limit=100`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    const tasks = data?.data?.tasks || data?.title?.tasks || data?.tasks || []
    return tasks.map((t) => ({
      value: t._id,
      label: t.taskName,
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message || "Failed to fetch tasks"
    )
  }
}


export async function fetchSubTasksByTask(taskId, signal = null) {
  if (!taskId) throw new Error("Task ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  try {
    const { data } = await axios.get(`${API_BASE_URL}/subtask/${taskId}?limit=100`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal, }
    )
    const subtasks = data?.data?.subTasks || data?.title?.subTasks || data?.subTasks || []
    return subtasks.map((s) => ({
      value: s._id,
      label: s.title,
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message || "Failed to fetch subtasks"
    )
  }
}


export async function downloadDocument(projectId, documentId, fileName, signal = null) {
  if (!projectId || !documentId) throw new Error("Project ID and Document ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const response = await fetch(
    `${API_BASE_URL}/document/${projectId}/download/${documentId}`,
    {
      headers: {
        ...getAuthHeaders(),
        "x-company-id": companyId,
      },
      signal,
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.description || err.message || "Download failed")
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName || "document"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}