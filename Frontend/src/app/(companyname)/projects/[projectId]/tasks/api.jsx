import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

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
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
export function formatToISO(dateString) {
  if (!dateString) return ""
  const date = dateString instanceof Date ? dateString : new Date(dateString)
  if (isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
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
export function mapTaskToCardFormat(apiTask, phaseName = "Phase") {
  return {
    id: apiTask._id || apiTask.taskId || apiTask.id,
    title: apiTask.taskName || "",
    taskName: apiTask.taskName || "",
    description: apiTask.description || "",
    priority: apiTask.priority || "Medium",
    status: apiTask.status || "NotStarted",
    progress: apiTask.completionPercent || 0,
    completionPercent: apiTask.completionPercent || 0,
    date: apiTask.endDate || "",
    endDate: apiTask.endDate || "",
    startDate: apiTask.startDate || "",
    phaseId: apiTask.phaseId?._id || apiTask.phaseId || "",
    phaseName: apiTask.phaseId?.phaseName || phaseName,
    projectId: apiTask.projectId || "",
    workOrderId: apiTask.workOrderId || null,  
    members: (apiTask.assignedTo || []).map((user) => ({
      id: user._id || user.id,
      keycloakId: user.keycloakId || "",
      name: user.name || "Unknown",
      email: user.email || "",
      avatar: user.avatar || null,
    })),
    assignedTo: (apiTask.assignedTo || []).map((user) => ({
      id: user._id || user.id,
      keycloakId: user.keycloakId || "",
      name: user.name || "Unknown",
      email: user.email || "",
      avatar: user.avatar || null,
    })),
    dependencies: apiTask.dependencies || [],
    createdBy: apiTask.createdBy || null,
    updatedBy: apiTask.updatedBy || null,
    createdAt: apiTask.createdAt || "",
    updatedAt: apiTask.updatedAt || "",
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
export async function fetchTaskDocuments({
  phaseId,
  taskId,
  page = 1,
  limit = 5,
  search = "",
  dateFrom,
  dateTo,
  signal = null,
} = {}) {
  try {
    if (!phaseId || !taskId) {
      throw new Error("Phase ID and Task ID are required")
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
      `${API_BASE_URL}/task/${phaseId}/documents/${taskId}?${params.toString()}`,
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
        "Failed to fetch task documents"
    )
  }
}
export async function fetchAllPhases(projectId, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/phase/${projectId}/allphases`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch phases")
    }
    return data.data?.phases || []
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
export async function fetchTasksForPhase(phaseId, phaseName, options = {}) {
  const { search = "", status, priority, sortBy = "createdAt", order = "desc", signal } = options
  try {
    const params = new URLSearchParams()
    params.append("page", "1")
    params.append("limit", "100")
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)
    if (priority) params.append("priority", priority)
    if (sortBy) params.append("sortBy", sortBy)
    if (order) params.append("order", order)
    const { data } = await axios.get(
      `${API_BASE_URL}/task/${phaseId}?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      return []
    }
    const tasks = data.data?.tasks || []
    return tasks.map((task) => mapTaskToCardFormat(task, phaseName))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    console.error(`Failed to fetch tasks for phase ${phaseId}:`, error)
    return []
  }
}
export async function fetchAllTasksData({
  projectId,
  search = "",
  status,
  priority,
  sortBy = "createdAt",
  order = "desc",
  phaseFilter,
  signal = null,
} = {}) {
  if (!projectId) throw new Error("Project ID is required")
  try {
    const phases = await fetchAllPhases(projectId, signal)
    if (!phases || phases.length === 0) {
      return { tasks: [], phases: [] }
    }
    const targetPhases = phaseFilter
      ? phases.filter((p) => p._id === phaseFilter)
      : phases
    const taskPromises = targetPhases.map((phase) =>
      fetchTasksForPhase(phase._id, phase.phaseName, {
        search,
        status,
        priority,
        sortBy,
        order,
        signal,
      })
    )
    const taskArrays = await Promise.all(taskPromises)
    let allTasks = taskArrays.flat()
    allTasks.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case "taskName":
        case "title":
          aVal = a.title?.toLowerCase() || ""
          bVal = b.title?.toLowerCase() || ""
          break
        case "progress":
        case "completionPercent":
          aVal = a.progress || 0
          bVal = b.progress || 0
          break
        case "endDate":
        case "date":
          aVal = new Date(a.date || 0).getTime()
          bVal = new Date(b.date || 0).getTime()
          break
        case "priority":
          const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 }
          aVal = priorityOrder[a.priority] || 0
          bVal = priorityOrder[b.priority] || 0
          break
        case "status":
          aVal = a.status || ""
          bVal = b.status || ""
          break
        default:
          aVal = new Date(a.createdAt || 0).getTime()
          bVal = new Date(b.createdAt || 0).getTime()
      }
      return order === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
    return {
      tasks: allTasks,
      phases: phases.map((p) => ({ id: p._id, name: p.phaseName, sequence: p.sequence })),
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch tasks"
    )
  }
}
export async function fetchTaskById(phaseId, taskId, signal = null) {
  if (!phaseId || !taskId) throw new Error("Phase ID and Task ID are required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/task/${phaseId}/${taskId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch task")
    }
    return mapTaskToCardFormat(data.data?.task || data.data)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch task details"
    )
  }
}
export async function editTask(phaseId, taskId, taskData, signal = null) {
  if (!phaseId || !taskId) throw new Error("Phase ID and Task ID are required")
  const payload = {}
  if (taskData.taskName !== undefined) payload.taskName = taskData.taskName?.trim() || ""
  if (taskData.description !== undefined) payload.description = taskData.description?.trim() || ""
  if (taskData.priority !== undefined) payload.priority = taskData.priority
  if (taskData.status !== undefined) payload.status = taskData.status
  if (taskData.startDate !== undefined) payload.startDate = formatToISO(taskData.startDate)
  if (taskData.endDate !== undefined) payload.endDate = formatToISO(taskData.endDate)
  if (taskData.dependencies !== undefined) payload.dependencies = taskData.dependencies
  try {
    const { data } = await axios.put(
      `${API_BASE_URL}/task/${phaseId}/edit/${taskId}`,
      payload,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to update task")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to update task"
    )
  }
}
export async function deleteTask(phaseId, taskId, signal = null) {
  if (!phaseId || !taskId) throw new Error("Phase ID and Task ID are required")
  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/task/${phaseId}/delete/${taskId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to delete task")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to delete task"
    )
  }
}
export async function fetchProjectUsers(projectId, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/project/members/${projectId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to fetch project members")
    }
    const members = data.title?.members || data.data?.members || []
    return members.map((member) => ({
      id: member.mongoId,
      keycloakId: member.keycloakId,
      name: member.name || "Unknown",
      email: member.email || "",
      avatar: member.avatar || null,
      role: member.designation || "Member",
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch project members"
    )
  }
}
export async function updateTaskMember(phaseId, taskId, userId, action, signal = null) {
  if (!phaseId || !taskId || !userId || !action) {
    throw new Error("Phase ID, Task ID, User ID, and action are required")
  }
  if (!["add", "remove"].includes(action)) {
    throw new Error('Action must be "add" or "remove"')
  }
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/task/${phaseId}/members/${taskId}`,
      { userId, action },
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to update task member")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to update task member"
    )
  }
}
export async function fetchPhaseDates(projectId, phaseId, signal = null) {
  if (!projectId || !phaseId) throw new Error("Project ID and Phase ID are required")
  try {
    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")

    const { data } = await axios.get(
      `${API_BASE_URL}/phase/${projectId}/${phaseId}/dates`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )

    if (data.statusCode !== 200) {
      throw new Error(data.description || "Failed to fetch phase dates")
    }

    const phaseData = data.data?.phase || data.data
    const highlightRange = data.data?.highlightRange

    return {
      startDate: highlightRange?.minDate
        ? new Date(highlightRange.minDate)
        : phaseData?.startDate
          ? new Date(phaseData.startDate)
          : null,
      endDate: highlightRange?.maxDate
        ? new Date(highlightRange.maxDate)
        : phaseData?.endDate
          ? new Date(phaseData.endDate)
          : null,
      phaseName: phaseData?.phaseName,
      phaseId: phaseData?.phaseId || phaseData?._id,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch phase dates"
    )
  }
}
export async function fetchAllTasksByUser(projectId, keycloakId, signal = null) {
  if (!projectId || !keycloakId) {
    throw new Error("Project ID and User ID are required");
  }

  const { data } = await axios.get(
    `${API_BASE_URL}/task/project/${projectId}/user/${keycloakId}`,
    { headers: getAuthHeaders(), signal }
  );

  if (data.statusCode !== 200 && !data.data) {
    throw new Error(data.description || "Failed to fetch user tasks");
  }

  return data.data?.tasks || [];
}


