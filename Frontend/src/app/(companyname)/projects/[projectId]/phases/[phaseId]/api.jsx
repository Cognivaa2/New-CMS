import axios from "axios"
import { getAuthHeaders, getBaseUrl , getCompanyId } from "@/lib/apiHelper"

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
export function mapTaskToCardFormat(apiTask) {
  return {
    id: apiTask._id || apiTask.taskId || apiTask.id,
    taskName: apiTask.taskName || "",
    description: apiTask.description || "",
    priority: apiTask.priority || "Medium",
    status: apiTask.status || "NotStarted",
    startDate: apiTask.startDate || "",
    endDate: apiTask.endDate || "",
    completionPercent: apiTask.completionPercent || 0,
    phaseId: apiTask.phaseId || "",
    projectId: apiTask.projectId || "",
    companyId: apiTask.companyId || "",
    workOrderId: apiTask.workOrderId || null, 
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
    createdAt: apiTask.createdAt ? formatDate(apiTask.createdAt) : "—",
    updatedAt: apiTask.updatedAt ? formatDate(apiTask.updatedAt) : "—",
  }
}
export function mapUserToSelectFormat(assignment) {
  const user = assignment.userId || assignment
  return {
    id: user._id || user.id || assignment._id,
    keycloakId: user.keycloakId || assignment.keycloakId || "",
    name: user.name || assignment.name || "Unknown",
    email: user.email || assignment.email || "",
    avatar: user.avatar || null,
    role: assignment.role || "Member",
  }
}
export function mapPhaseToFormat(apiPhase) {
  return {
    id: apiPhase._id || apiPhase.phaseId,
    phaseName: apiPhase.phaseName || "Phase",
    description: apiPhase.description || "",
    startDate: apiPhase.startDate || "",
    endDate: apiPhase.endDate || "",
    completionPercent: apiPhase.completionPercent || 0,
  }
}
export function removeTaskFromList(tasks, taskId) {
  return tasks.filter((t) => t.id !== taskId)
}
export function updateTaskInList(tasks, updatedTask) {
  return tasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
}
export async function fetchTasksData({
  phaseId,
  page = 1,
  limit = 50,
  search = "",
  status,
  priority,
  sortBy = "createdAt",
  order = "desc",
  signal = null,
} = {}) {
  if (!phaseId) throw new Error("Phase ID is required")
  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  if (search?.trim()) params.append("search", search.trim())
  if (status) params.append("status", status)
  if (priority) params.append("priority", priority)
  if (sortBy) params.append("sortBy", sortBy)
  if (order) params.append("order", order)
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/task/${phaseId}?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch tasks")
    }
    const tasks = data.data?.tasks || []
    const pagination = data.data?.pagination || {
      total: tasks.length,
      page,
      limit,
      totalPages: 1,
    }
    return {
      tasks: tasks.map(mapTaskToCardFormat),
      pagination,
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
export function getCurrentUserKeycloakId() {
  return localStorage.getItem("keycloakId") || ""
}
export async function addTask(phaseId, taskData, signal = null) {
  if (!phaseId) throw new Error("Phase ID is required")
  const payload = {
    taskName: taskData.taskName?.trim() || "",
    description: taskData.description?.trim() || "",
    priority: taskData.priority || "Medium",
    startDate: formatToISO(taskData.startDate),
    endDate: formatToISO(taskData.endDate),
  }
  if (taskData.assignedTo?.length > 0) {
    payload.assignedTo = taskData.assignedTo
      .map((user) => (typeof user === "string" ? user : user.keycloakId))
      .filter(Boolean)
  }
  if (taskData.createdBy) {
    payload.createdBy = taskData.createdBy
  }
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/task/${phaseId}`,
      payload,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 201 && !data.data) {
      throw new Error(data.description || data.message || "Failed to create task")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create task"
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
      `${API_BASE_URL}/task/${phaseId}/edit/${taskId}`,  // ← Fixed: added /edit/
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
export async function fetchPhaseDetails(projectId, phaseId, signal = null) {
  if (!projectId || !phaseId) throw new Error("Project ID and Phase ID are required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/phase/${projectId}/${phaseId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch phase")
    }
    return mapPhaseToFormat(data.data)
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
export async function fetchTaskMembers(phaseId, taskId, signal = null) {
  if (!phaseId || !taskId) throw new Error("Phase ID and Task ID are required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/task/${phaseId}/members/${taskId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to fetch task members")
    }
    const members = data.data?.members || data.title?.members || []
    return members.map((member) => ({
      id: member.mongoId || member.id,
      keycloakId: member.keycloakId,
      name: member.name || "Unknown",
      email: member.email || "",
      avatar: member.avatar || null,
      role: member.designation || member.role || "Member",
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch task members"
    )
  }
}


export async function fetchPhaseUniqueUsers(phaseId, signal = null) {
  if (!phaseId) throw new Error("Phase ID is required")
  try {
    const { data } = await axios.get(`${API_BASE_URL}/task/unique/${phaseId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch phase users")
    }
    const users = data.data?.users || []
    return users.map((user) => ({
      keycloakId: user.keycloakId || "",
      name: user.name || "Unknown",
      email: user.email || "",
      avatar: user.avatar || null,
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description || error.response?.data?.message || error.message || "Failed to fetch phase unique users"
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
export async function fetchPhaseDates(projectId, phaseId, signal = null) {
  try {
    if (!projectId || !phaseId) throw new Error("Project ID and Phase ID are required")
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
    const projectData = data.data?.project

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
      projectName: projectData?.projectName,
      projectId: projectData?.projectId,
      projectStartDate: projectData?.startDate ? new Date(projectData.startDate) : null,
      projectEndDate: projectData?.endDate ? new Date(projectData.endDate) : null,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(error.response?.data?.description || error.message)
  }
}
export async function fetchTasksByUser({
    phaseId,
    keycloakId,
    page = 1,
    limit = 50,
    search = "",
    status,
    priority,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
} = {}) {
    if (!phaseId) throw new Error("Phase ID is required")
    if (!keycloakId?.trim()) throw new Error("Keycloak ID is required")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)
    if (priority) params.append("priority", priority)
    if (sortBy) params.append("sortBy", sortBy)
    if (order) params.append("order", order)

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/task/${phaseId}/user/${encodeURIComponent(keycloakId.trim())}?${params.toString()}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch tasks by user")
        }
        const tasks = data.data?.tasks || []
        const pagination = data.data?.pagination || {
            total: tasks.length,
            page,
            limit,
            totalPages: 1,
        }
        return {
            tasks: tasks.map(mapTaskToCardFormat),
            pagination,
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch tasks by user"
        )
    }
}

export async function fetchWOLookup(projectId, search = "", signal = null) {
  if (!projectId) throw new Error("projectId is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/wo/${projectId}/lookup?${params.toString()}`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )
    return data.data?.wos || []
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch work orders"
    )
  }
}



export async function linkTaskToWO(projectId, phaseId, taskId, woId, action = "link", signal = null) {
  if (!projectId || !phaseId || !taskId || !woId)
    throw new Error("projectId, phaseId, taskId, and woId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/task/projects/${projectId}/phases/${phaseId}/tasks/${taskId}/linkToWo`,
      {
        action: action, 
        workOrderId: woId,
        updatedBy: getCurrentUserKeycloakId(), 
      },
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to link task to work order"
    )
  }
}

export async function unlinkTaskFromWO(projectId, phaseId, taskId, signal = null) {
  if (!projectId || !phaseId || !taskId)
    throw new Error("projectId, phaseId and taskId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/task/projects/${projectId}/phases/${phaseId}/tasks/${taskId}/linkToWo`,
      {
        action:    "unlink",
        updatedBy: getCurrentUserKeycloakId(),
      },
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to unlink task from work order"
    )
  }
}