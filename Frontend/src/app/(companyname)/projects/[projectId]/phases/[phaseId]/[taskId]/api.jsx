import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function isValidObjectId(id) {
    if (!id || typeof id !== "string") return false
    return /^[a-f\d]{24}$/i.test(id)
}
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
export function parseDate(val) {
    if (!val) return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
}
export function removeSubTaskFromList(list, subTaskId) {
    return list.filter((item) => item.id !== subTaskId && item._id !== subTaskId)
}
export function updateSubTaskInList(subTasks, updatedSubTask) {
    return subTasks.map((s) => (s.id === updatedSubTask.id ? { ...s, ...updatedSubTask } : s))
}
export function mapSubTaskToFormat(apiSubTask) {
    return {
        id: apiSubTask._id || apiSubTask.subTaskId || apiSubTask.id,
        title: apiSubTask.title || "",
        description: apiSubTask.description || "",
        status: apiSubTask.status || "NotStarted",
        completionPercent: apiSubTask.completionPercent || 0,
        startDate: apiSubTask.startDate ? formatDate(apiSubTask.startDate) : null,
        endDate: apiSubTask.endDate ? formatDate(apiSubTask.endDate) : null,
        rawStartDate: apiSubTask.startDate || null,
        rawEndDate: apiSubTask.endDate || null,
        assignedTo: (apiSubTask.assignedTo || []).map((user) => ({
            id: user._id || user.id,
            keycloakId: user.keycloakId || user.userId || "",
            name: user.name || "Unknown",
            email: user.email || "",
            avatar: user.avatar || null,
        })),
        createdBy: {
            id: apiSubTask.createdBy?._id || apiSubTask.createdBy?.id || null,
            keycloakId: apiSubTask.createdBy?.keycloakId || apiSubTask.createdBy?.userId || "",
            name: apiSubTask.createdBy?.name || "Unknown",
            email: apiSubTask.createdBy?.email || "",
            avatar: apiSubTask.createdBy?.avatar || null,
            role: apiSubTask.createdBy?.role || apiSubTask.createdBy?.designation || "Team Member",
        },
        taskId: apiSubTask.taskId || "",
        phaseId: apiSubTask.phaseId || "",
        projectId: apiSubTask.projectId || "",
        companyId: apiSubTask.companyId || "",

        workOrderId: apiSubTask.workOrderId || null,

        createdAt: apiSubTask.createdAt ? formatDate(apiSubTask.createdAt) : "—",
        updatedAt: apiSubTask.updatedAt ? formatDate(apiSubTask.updatedAt) : "—",
    }
}
export function mapTaskToFormat(apiTask) {
    return {
        id: apiTask._id || apiTask.taskId || apiTask.id,
        taskName: apiTask.taskName || "Task",
        description: apiTask.description || "",
        phaseName: apiTask.phaseName || "Phase",
        status: apiTask.status || "NotStarted",
        completionPercent: apiTask.completionPercent || 0,
        startDate: apiTask.startDate || "",
        endDate: apiTask.endDate || "",
    }
}
export async function fetchSubTasksData({
    taskId,
    page = 1,
    limit = 50,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
} = {}) {
    if (!taskId) throw new Error("Task ID is required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)
    if (sortBy) params.append("sortBy", sortBy)
    if (order) params.append("order", order)
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/subtask/${taskId}?${params.toString()}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch subtasks")
        }
        const subTasks = data.data?.subTasks || []
        const pagination = data.data?.pagination || {
            total: subTasks.length,
            page,
            limit,
            totalPages: 1,
        }
        return {
            subTasks: subTasks.map(mapSubTaskToFormat),
            pagination,
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch subtasks"
        )
    }
}
export async function fetchSubTaskById(taskId, subTaskId, signal = null) {
    if (!taskId || !subTaskId) throw new Error("Task ID and SubTask ID are required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    if (!isValidObjectId(subTaskId)) throw new Error("Invalid SubTask ID format")
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/subtask/${taskId}/${subTaskId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch subtask")
        }
        return mapSubTaskToFormat(data.data?.subTask || data.data)
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch subtask details"
        )
    }
}
export async function addSubTask(taskId, subTaskData, signal = null) {
    if (!taskId) throw new Error("Task ID is required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")

    const payload = {
        title: subTaskData.title?.trim() || "",
        description: subTaskData.description?.trim() || null,
        startDate: formatToISO(subTaskData.startDate) || null,
        endDate: formatToISO(subTaskData.endDate) || null,
    }
    if (subTaskData.assignedTo?.length > 0) {
        payload.assignedTo = subTaskData.assignedTo
            .map((user) => (typeof user === "string" ? user : user.keycloakId))
            .filter(Boolean)
    }
    if (subTaskData.createdBy) {
        payload.createdBy = subTaskData.createdBy
    }
    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/subtask/${taskId}`,
            payload,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 201 && !data.data) {
            throw new Error(data.description || data.message || "Failed to create subtask")
        }
        return {
            subTask: mapSubTaskToFormat(data.data || {}),
            message: data.title || "SubTask Created",
            description: data.message || "SubTask has been created successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to create subtask"
        )
    }
}
export async function editSubTask(taskId, subTaskId, subTaskData, signal = null) {
  if (!taskId || !subTaskId) throw new Error("Task ID and SubTask ID are required")
  if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
  if (!isValidObjectId(subTaskId)) throw new Error("Invalid SubTask ID format")

  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  // backend requires updatedBy (keycloakId)
  const updatedBy =
    subTaskData?.updatedBy?.trim?.() || getCurrentUserKeycloakId()

  if (!updatedBy) throw new Error("updatedBy (keycloakId) is required")

  const payload = { updatedBy }

  if (subTaskData.title !== undefined) payload.title = subTaskData.title?.trim() || ""
  if (subTaskData.description !== undefined)
    payload.description = subTaskData.description?.trim() || null
  if (subTaskData.status !== undefined) payload.status = subTaskData.status

  if (subTaskData.startDate !== undefined)
    payload.startDate = formatToISO(subTaskData.startDate) || null
  if (subTaskData.endDate !== undefined)
    payload.endDate = formatToISO(subTaskData.endDate) || null

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/subtask/${taskId}/edit/${subTaskId}`,
      payload,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to update subtask")
    }

    return {
      subTask: mapSubTaskToFormat(data.data || {}),
      message: data.title || "SubTask Updated",
      description: data.message || "SubTask has been updated successfully",
    }
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to update subtask"
    )
  }
}
export async function deleteSubTask(taskId, subTaskId, signal = null) {
    if (!taskId || !subTaskId) throw new Error("Task ID and SubTask ID are required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    if (!isValidObjectId(subTaskId)) throw new Error("Invalid SubTask ID format")
    try {
        const { data } = await axios.delete(
            `${API_BASE_URL}/subtask/${taskId}/delete/${subTaskId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to delete subtask")
        }
        return {
            message: data.title || "SubTask Deleted",
            description: data.message || "SubTask has been deleted successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to delete subtask"
        )
    }
}
export async function fetchTaskDetails(phaseId, taskId, signal = null) {
    if (!phaseId || !taskId) throw new Error("Phase ID and Task ID are required")
    if (!isValidObjectId(phaseId)) throw new Error("Invalid Phase ID format")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/task/${phaseId}/${taskId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch task")
        }
        return mapTaskToFormat(data.data?.task || data.data)
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
export async function fetchProjectUsers(projectId, signal = null) {
    if (!projectId) throw new Error("Project ID is required")
    if (!isValidObjectId(projectId)) throw new Error("Invalid Project ID format")

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
    if (!isValidObjectId(projectId)) throw new Error("Invalid Project ID format")
    if (!isValidObjectId(phaseId)) throw new Error("Invalid Phase ID format")
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/phase/${projectId}/${phaseId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch phase")
        }
        return {
            id: data.data?._id || data.data?.phaseId,
            phaseName: data.data?.phaseName || "Phase",
            description: data.data?.description || "",
        }
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
    if (typeof window !== "undefined") {
        return localStorage.getItem("keycloakId") || ""
    }
    return ""
}
export async function assignSubTaskMember(taskId, subTaskId, keycloakId, signal = null) {
    if (!taskId || !subTaskId) throw new Error("Task ID and SubTask ID are required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    if (!isValidObjectId(subTaskId)) throw new Error("Invalid SubTask ID format")
    if (!keycloakId?.trim()) throw new Error("User keycloakId is required")

    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/subtask/${taskId}/members/${subTaskId}`,
            { userId: keycloakId.trim(), action: "add" },
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to assign member")
        }
        return {
            success: true,
            member: data.data?.member || {},
            message: data.title || "Member Assigned",
            description: data.message || "Member has been assigned successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to assign member"
        )
    }
}

export async function unassignSubTaskMember(taskId, subTaskId, keycloakId, signal = null) {
    if (!taskId || !subTaskId) throw new Error("Task ID and SubTask ID are required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    if (!isValidObjectId(subTaskId)) throw new Error("Invalid SubTask ID format")
    if (!keycloakId?.trim()) throw new Error("User keycloakId is required")

    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/subtask/${taskId}/members/${subTaskId}`,
            { userId: keycloakId.trim(), action: "remove" },
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to remove member")
        }
        return {
            success: true,
            member: data.data?.member || {},
            message: data.title || "Member Removed",
            description: data.message || "Member has been removed successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to remove member"
        )
    }
}
export async function updateSubTaskProgress(taskId, subTaskId, completionPercent, signal = null) {
    if (!taskId || !subTaskId) throw new Error("Task ID and SubTask ID are required")
    if (completionPercent === undefined || completionPercent === null) throw new Error("Completion percent is required")

    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/completion/subtask/${subTaskId}`,
            { completionPercent: Number(completionPercent) },
            { headers: getAuthHeaders(), signal }
        )

        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to update progress")
        }

        return {
            subTask: data.data || {},
            message: data.title || "Progress Updated",
            description: data.message || `Progress updated to ${completionPercent}%`,
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to update progress"
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

export async function fetchSubTaskDocuments({
    taskId,
    subTaskId,
    page = 1,
    limit = 5,
    search = "",
    dateFrom,
    dateTo,
    signal = null,
} = {}) {
    try {
        if (!taskId || !subTaskId) {
            throw new Error("Task ID and SubTask ID are required")
        }
        if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
        if (!isValidObjectId(subTaskId)) throw new Error("Invalid SubTask ID format")

        const companyId = getCompanyId()
        if (!companyId) throw new Error("Company ID is required")

        const params = new URLSearchParams()
        params.append("page", String(page))
        params.append("limit", String(limit))
        if (search?.trim()) params.append("search", search.trim())
        if (dateFrom) params.append("dateFrom", dateFrom)
        if (dateTo) params.append("dateTo", dateTo)

        const { data } = await axios.get(
            `${API_BASE_URL}/subtask/${taskId}/documents/${subTaskId}?${params.toString()}`,
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
            "Failed to fetch subtask documents"
        )
    }
}
export async function fetchTaskUniqueUsers(taskId, signal = null) {
    if (!taskId) throw new Error("Task ID is required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    try {
        const { data } = await axios.get(`${API_BASE_URL}/subtask/unique/${taskId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch task users")
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
            error.response?.data?.description || error.response?.data?.message || error.message || "Failed to fetch task unique users"
        )
    }
}
export async function fetchTaskDates(phaseId, taskId, signal = null) {
    try {
        if (!phaseId || !taskId) throw new Error("Phase ID and Task ID are required")
        const companyId = getCompanyId()
        if (!companyId) throw new Error("Company ID is required")

        const { data } = await axios.get(
            `${API_BASE_URL}/task/${phaseId}/${taskId}/dates`,
            {
                headers: { ...getAuthHeaders(), "x-company-id": companyId },
                signal,
            }
        )

        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to fetch task dates")
        }

        return {
            startDate: data.data?.startDate ? new Date(data.data.startDate) : null,
            endDate: data.data?.endDate ? new Date(data.data.endDate) : null,
            taskName: data.data?.taskName,
            taskId: data.data?.taskId,
            phaseId: data.data?.phaseId,
            phaseName: data.data?.phaseName,
            projectId: data.data?.projectId,
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(error.response?.data?.description || error.message)
    }
}
export async function fetchSubTasksByUser({
    taskId,
    keycloakId,
    page = 1,
    limit = 50,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
} = {}) {
    if (!taskId) throw new Error("Task ID is required")
    if (!isValidObjectId(taskId)) throw new Error("Invalid Task ID format")
    if (!keycloakId?.trim()) throw new Error("Keycloak ID is required")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)
    if (sortBy) params.append("sortBy", sortBy)
    if (order) params.append("order", order)

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/subtask/${taskId}/user/${encodeURIComponent(keycloakId.trim())}?${params.toString()}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch subtasks by user")
        }
        const subTasks = data.data?.subTasks || []
        const pagination = data.data?.pagination || {
            total: subTasks.length,
            page,
            limit,
            totalPages: 1,
        }
        return {
            subTasks: subTasks.map(mapSubTaskToFormat),
            pagination,
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch subtasks by user"
        )
    }
}

export async function fetchInventoryLookup(projectId, search = "", signal = null) {
    if (!projectId) throw new Error("projectId is required")
    if (!isValidObjectId(projectId)) throw new Error("Invalid Project ID format")

    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")

    const params = new URLSearchParams()
    params.append("inStock", "true")
    if (search?.trim()) params.append("search", search.trim())

    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/inventory/${projectId}/lookup?${params.toString()}`,
            {
                headers: { ...getAuthHeaders(), "x-company-id": companyId },
                signal,
            }
        )
        if (data.statusCode !== 200 && !data.data) {
            throw new Error(data.description || data.message || "Failed to fetch inventory")
        }
        const materials = data.data?.materials || []
        return materials.map((item) => ({
            _id: item.inventoryId,
            id: item.inventoryId,
            materialMasterId: item.materialMasterId,
            name: item.name,
            unit: item.unit,
            category: item.category || "",
            currentStock: item.currentStock,
            stockStatus: item.stockStatus,
            pricePerUnit: item.pricePerUnit,
        }))
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch inventory lookup"
        )
    }
}

export async function recordMaterialConsumption(
    projectId,
    subTaskId,
    taskId,
    phaseId,
    payload,
    signal = null
) {
    if (!projectId) throw new Error("projectId is required")
    if (!isValidObjectId(projectId)) throw new Error("Invalid Project ID format")

    const companyId = getCompanyId()
    if (!companyId) throw new Error("Company ID is required")

    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/consumption/${projectId}`,
            {
                inventoryId: payload.inventoryId,
                materialMasterId: payload.materialMasterId,
                materialName: payload.materialName,
                unit: payload.unit,
                quantityConsumed: payload.quantityConsumed,
                pricePerUnit: payload.pricePerUnit,
                totalCost: payload.totalCost,
                source: payload.source || "StockIssue",
                remarks: payload.remarks || null,
                recordedBy: payload.recordedBy,
                subTaskId: subTaskId || null,
                taskId: taskId || null,
                phaseId: phaseId || null,
            },
            {
                headers: { ...getAuthHeaders(), "x-company-id": companyId },
                signal,
            }
        )

        if (data.statusCode !== 201 && !data.data) {
            throw new Error(data.description || data.message || "Failed to record consumption")
        }

        return {
            record: data.data,
            message: data.title || "Consumption Recorded",
            description: data.message || "Material consumption has been recorded successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to record material consumption"
        )
    }
}