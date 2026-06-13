// src/app/issues/api.jsx

import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

// ── Helpers ──────────────────────────────────────────────────────────────

export function isValidObjectId(id) {
    if (!id || typeof id !== "string") return false
    return /^[a-f\d]{24}$/i.test(id)
}

export function formatDate(dateString) {
    if (!dateString) return "—"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "—"
    const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
    const day = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
    return `${time}, ${day}`
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

export function getCurrentUserKeycloakId() {
    if (typeof window !== "undefined") {
        return localStorage.getItem("keycloakId") || ""
    }
    return ""
}

export function debounce(fn, delay = 400) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

// ── Status Mapping (backend → frontend) ──────────────────────────────────

const STATUS_MAP = {
    submitted: "In Progress",
    resolved: "Resolved",
    rejected: "Blocked",
}

const STATUS_REVERSE_MAP = {
    "In Progress": "submitted",
    Resolved: "resolved",
    Blocked: "rejected",
}

function mapStatusToFrontend(backendStatus) {
    return STATUS_MAP[backendStatus] || backendStatus || "In Progress"
}

function mapStatusToBackend(frontendStatus) {
    return STATUS_REVERSE_MAP[frontendStatus] || frontendStatus || "submitted"
}

// ── Issue Mapper ─────────────────────────────────────────────────────────

function mapUserInfo(user) {
    if (!user) return null
    return {
        keycloakId: user.keycloakId || user.userId || "",
        name: user.name || "Unknown",
        role: user.designation || user.role || "Team Member",
        email: user.email || "",
        avatar: user.avatar || null,
    }
}

export function mapIssueToFormat(apiIssue) {
    if (!apiIssue) return null
    return {
        id: apiIssue.issueId || apiIssue._id || apiIssue.id,
        issue: apiIssue.title || "",
        title: apiIssue.title || "",
        description: apiIssue.description || "",
        project: apiIssue.projectName || "",
        projectId: apiIssue.projectId || "",
        taskId: apiIssue.taskId || null,
        subtaskId: apiIssue.subtaskId || null,
        issueType: apiIssue.issueType || "",
        priority: apiIssue.priority || "medium",
        status: mapStatusToFrontend(apiIssue.status),
        backendStatus: apiIssue.status || "submitted",
        dueDate: apiIssue.dueDate || null,
        tags: apiIssue.tags || [],
        attachments: apiIssue.attachments || [],
        createdBy: mapUserInfo(apiIssue.createdBy),
        assignedTo: Array.isArray(apiIssue.assignedTo)
            ? apiIssue.assignedTo.map(mapUserInfo).filter(Boolean)
            : [],
        resolvedBy: mapUserInfo(apiIssue.resolvedBy),
        resolvedAt: apiIssue.resolvedAt ? formatDate(apiIssue.resolvedAt) : null,
        rejectedBy: mapUserInfo(apiIssue.rejectedBy),
        rejectedAt: apiIssue.rejectedAt ? formatDate(apiIssue.rejectedAt) : null,
        rejectionRemark: apiIssue.rejectionRemark || null,
        createdAt: formatDate(apiIssue.createdAt),
        updatedAt: formatDate(apiIssue.updatedAt),
        commentPreview: apiIssue.commentPreview || [],
        totalComments: apiIssue.totalComments || 0,
    }
}

export function mapCommentToFormat(apiComment) {
    if (!apiComment) return null
    return {
        id: apiComment.commentId || apiComment._id,
        text: apiComment.text || "",
        image: apiComment.image || null,
        createdBy: mapUserInfo(apiComment.createdBy),
        editedAt: apiComment.editedAt ? formatDate(apiComment.editedAt) : null,
        createdAt: formatDate(apiComment.createdAt),
        rawCreatedAt: apiComment.createdAt,
    }
}

// ── Summary / Stats ──────────────────────────────────────────────────────

export async function fetchIssueSummary(projectId = null, signal = null) {
    try {
        const params = new URLSearchParams()
        if (projectId && isValidObjectId(projectId)) {
            params.append("projectId", projectId)
        }
        const url = `${API_BASE_URL}/issue/summary${params.toString() ? `?${params}` : ""}`
        const { data } = await axios.get(url, {
            headers: getAuthHeaders(),
            signal,
        })
        if (data.statusCode !== 200 || !data.data) {
            throw new Error(data.description || "Failed to fetch issue summary")
        }
        const d = data.data
        const overview = d.overview || {}
        const summary = {
            total: overview.total || 0,
            resolved: overview.resolved || 0,
            inProgress: overview.submitted || 0,
            blocked: overview.rejected || 0,
            overdue: overview.overdue || 0,
            unassigned: overview.unassigned || 0,
            resolutionRate: overview.resolutionRate || 0,
            avgResolutionHours: overview.avgResolutionHours || null,
        }
        const stats = [
            {
                id: 1,
                title: "Total Issues",
                value: summary.total,
                subtitle: d.scope === "project" ? "in this project" : "from all projects",
                colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
            },
            {
                id: 2,
                title: "Issues Resolved",
                value: summary.resolved,
                subtitle: d.scope === "project" ? "in this project" : "from all projects",
                colorClass: "bg-[#eef5fc] dark:bg-[#1e1e2e]",
            },
            {
                id: 3,
                title: "Issues In Progress",
                value: summary.inProgress,
                subtitle: d.scope === "project" ? "in this project" : "from all projects",
                colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
            },
            {
                id: 4,
                title: "Issues Blocked",
                value: summary.blocked,
                subtitle: d.scope === "project" ? "in this project" : "from all projects",
                colorClass: "bg-[#eef5fc] dark:bg-[#1e1e2e]",
            },
        ]
        return { summary, stats, raw: d }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch issue summary"
        )
    }
}

// ── Get All Issues (list) ────────────────────────────────────────────────

export async function fetchAllIssues({
    page = 1,
    limit = 20,
    search = "",
    status,
    priority,
    issueType,
    projectId,
    taskId,
    assignedTo,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
} = {}) {
    try {
        const params = new URLSearchParams()
        params.append("page", String(page))
        params.append("limit", String(limit))
        if (search?.trim()) params.append("search", search.trim())
        if (status) params.append("status", mapStatusToBackend(status))
        if (priority) params.append("priority", priority)
        if (issueType) params.append("issueType", issueType)
        if (projectId) params.append("projectId", projectId)
        if (taskId) params.append("taskId", taskId)
        if (assignedTo) params.append("assignedTo", assignedTo)
        if (dateFrom) params.append("dateFrom", dateFrom)
        if (dateTo) params.append("dateTo", dateTo)
        if (sortBy) params.append("sortBy", sortBy)
        if (order) params.append("order", order)

        const { data } = await axios.get(
            `${API_BASE_URL}/issue?${params.toString()}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 || !data.data) {
            throw new Error(data.description || "Failed to fetch issues")
        }
        const issues = (data.data.issues || []).map(mapIssueToFormat)
        const pagination = data.data.pagination || {
            total: issues.length,
            page,
            limit,
            totalPages: 1,
        }
        return { issues, pagination }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch issues"
        )
    }
}

// ── Get Single Issue ─────────────────────────────────────────────────────

export async function fetchIssueById(issueId, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    if (!isValidObjectId(issueId)) throw new Error("Invalid Issue ID format")
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/issue/${issueId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 || !data.data) {
            throw new Error(data.description || "Failed to fetch issue")
        }
        return mapIssueToFormat(data.data)
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch issue details"
        )
    }
}

// ── Create Issue ─────────────────────────────────────────────────────────

export async function createIssue(issueData, signal = null) {
    try {
        const formData = new FormData()
        formData.append("title", issueData.title?.trim() || "")
        formData.append("description", issueData.description?.trim() || "")
        formData.append("issueType", issueData.issueType || "")
        formData.append("projectId", issueData.projectId || "")
        if (issueData.priority) formData.append("priority", issueData.priority)
        if (issueData.taskId) formData.append("taskId", issueData.taskId)
        if (issueData.subtaskId) formData.append("subtaskId", issueData.subtaskId)
        if (issueData.dueDate) formData.append("dueDate", formatToISO(issueData.dueDate))
        if (issueData.createdBy) formData.append("createdBy", issueData.createdBy)
        if (issueData.tags && issueData.tags.length > 0) {
            formData.append("tags", JSON.stringify(issueData.tags))
        }
        if (issueData.attachments && issueData.attachments.length > 0) {
            issueData.attachments.forEach((file) => {
                formData.append("attachments", file)
            })
        }
        const headers = getAuthHeaders()
        delete headers["Content-Type"]
        const { data } = await axios.post(
            `${API_BASE_URL}/issue`,
            formData,
            { headers, signal }
        )
        if (data.statusCode !== 201 || !data.data) {
            throw new Error(data.description || "Failed to create issue")
        }
        return {
            issue: mapIssueToFormat(data.data),
            message: data.title || "Issue Created",
            description: data.message || "Issue has been created successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to create issue"
        )
    }
}

// ── Edit Issue ───────────────────────────────────────────────────────────

export async function editIssue(issueId, issueData, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    if (!isValidObjectId(issueId)) throw new Error("Invalid Issue ID format")
    try {
        const formData = new FormData()
        formData.append("updatedBy", issueData.updatedBy || getCurrentUserKeycloakId())
        if (issueData.title !== undefined) formData.append("title", issueData.title?.trim() || "")
        if (issueData.description !== undefined) formData.append("description", issueData.description?.trim() || "")
        if (issueData.issueType !== undefined) formData.append("issueType", issueData.issueType)
        if (issueData.priority !== undefined) formData.append("priority", issueData.priority)
        if (issueData.taskId !== undefined) formData.append("taskId", issueData.taskId || "")
        if (issueData.subtaskId !== undefined) formData.append("subtaskId", issueData.subtaskId || "")
        if (issueData.dueDate !== undefined) {
            formData.append("dueDate", issueData.dueDate ? formatToISO(issueData.dueDate) : "")
        }
        if (issueData.tags !== undefined) {
            formData.append("tags", JSON.stringify(issueData.tags || []))
        }
        if (issueData.newAttachments && issueData.newAttachments.length > 0) {
            issueData.newAttachments.forEach((file) => {
                formData.append("attachments", file)
            })
        }
        const headers = getAuthHeaders()
        delete headers["Content-Type"]
        const { data } = await axios.put(
            `${API_BASE_URL}/issue/${issueId}`,
            formData,
            { headers, signal }
        )
        if (data.statusCode !== 200 || !data.data) {
            throw new Error(data.description || "Failed to update issue")
        }
        return {
            issue: mapIssueToFormat(data.data),
            message: data.title || "Issue Updated",
            description: data.message || "Issue has been updated successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to update issue"
        )
    }
}

// ── Delete Issue ─────────────────────────────────────────────────────────

export async function deleteIssue(issueId, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    if (!isValidObjectId(issueId)) throw new Error("Invalid Issue ID format")
    try {
        const { data } = await axios.delete(
            `${API_BASE_URL}/issue/${issueId}`,
            {
                headers: getAuthHeaders(),
                data: { deletedBy: getCurrentUserKeycloakId() },
                signal,
            }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to delete issue")
        }
        return {
            message: data.title || "Issue Deleted",
            description: data.message || "Issue has been deleted successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to delete issue"
        )
    }
}

// ── Resolve Issue ────────────────────────────────────────────────────────

export async function resolveIssue(issueId, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/issue/resolve/${issueId}`,
            { approvedBy: getCurrentUserKeycloakId() },
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to resolve issue")
        }
        return {
            message: data.title || "Issue Resolved",
            description: data.message || "Issue has been resolved successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to resolve issue"
        )
    }
}

// ── Reject Issue ─────────────────────────────────────────────────────────

export async function rejectIssue(issueId, remark, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    if (!remark?.trim()) throw new Error("Rejection remark is required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/issue/reject/${issueId}`,
            { rejectedBy: getCurrentUserKeycloakId(), remark: remark.trim() },
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to reject issue")
        }
        return {
            message: data.title || "Issue Rejected",
            description: data.message || "Issue has been rejected",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to reject issue"
        )
    }
}

// ── Assigned Users ───────────────────────────────────────────────────────

export async function fetchAssignedUsers(issueId, { page = 1, limit = 20 } = {}, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    try {
        const params = new URLSearchParams()
        params.append("page", String(page))
        params.append("limit", String(limit))
        const { data } = await axios.get(
            `${API_BASE_URL}/issue/members/${issueId}?${params}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 || !data.data) {
            throw new Error(data.description || "Failed to fetch assigned users")
        }
        const users = (data.data.assignedUsers || []).map(mapUserInfo).filter(Boolean)
        return { users, pagination: data.data.pagination }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to fetch assigned users"
        )
    }
}

export async function assignUserToIssue(issueId, keycloakId, signal = null) {
    if (!issueId || !keycloakId) throw new Error("Issue ID and user keycloakId are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/issue/members/${issueId}`,
            { userId: keycloakId.trim(), action: "add" },
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to assign user")
        }
        return {
            message: data.title || "User Assigned",
            description: data.message || "User assigned successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to assign user"
        )
    }
}

export async function unassignUserFromIssue(issueId, keycloakId, signal = null) {
    if (!issueId || !keycloakId) throw new Error("Issue ID and user keycloakId are required")
    try {
        const { data } = await axios.patch(
            `${API_BASE_URL}/issue/members/${issueId}`,
            { userId: keycloakId.trim(), action: "remove" },
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to unassign user")
        }
        return {
            message: data.title || "User Unassigned",
            description: data.message || "User unassigned successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to unassign user"
        )
    }
}
export async function fetchComments(issueId, { page = 1, limit = 20, search = "" } = {}, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    try {
        const params = new URLSearchParams()
        params.append("page", String(page))
        params.append("limit", String(limit))
        if (search?.trim()) params.append("search", search.trim())
        const { data } = await axios.get(
            `${API_BASE_URL}/issue/comments/${issueId}?${params}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 || !data.data) {
            throw new Error(data.description || "Failed to fetch comments")
        }
        const comments = (data.data.comments || []).map(mapCommentToFormat)
        return { comments, pagination: data.data.pagination }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to fetch comments"
        )
    }
}

export async function addComment(issueId, { text, image }, signal = null) {
    if (!issueId) throw new Error("Issue ID is required")
    if (!text?.trim()) throw new Error("Comment text is required")
    try {
        const formData = new FormData()
        formData.append("text", text.trim())
        formData.append("commentedBy", getCurrentUserKeycloakId())
        if (image) formData.append("image", image)
        const headers = getAuthHeaders()
        delete headers["Content-Type"]
        const { data } = await axios.post(
            `${API_BASE_URL}/issue/comments/${issueId}`,
            formData,
            { headers, signal }
        )
        if (data.statusCode !== 201 || !data.data) {
            throw new Error(data.description || "Failed to add comment")
        }
        return {
            comment: mapCommentToFormat(data.data),
            message: "Comment Added",
            description: data.message || "Comment added successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to add comment"
        )
    }
}

export async function editComment(issueId, commentId, { text, image }, signal = null) {
    if (!issueId || !commentId) throw new Error("Issue ID and Comment ID are required")
    try {
        const formData = new FormData()
        formData.append("updatedBy", getCurrentUserKeycloakId())
        if (text?.trim()) formData.append("text", text.trim())
        if (image) formData.append("image", image)
        const headers = getAuthHeaders()
        delete headers["Content-Type"]
        const { data } = await axios.put(
            `${API_BASE_URL}/issue/comments/${issueId}/${commentId}`,
            formData,
            { headers, signal }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to edit comment")
        }
        return {
            message: "Comment Updated",
            description: data.message || "Comment updated successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to edit comment"
        )
    }
}

export async function deleteComment(issueId, commentId, signal = null) {
    if (!issueId || !commentId) throw new Error("Issue ID and Comment ID are required")
    try {
        const { data } = await axios.delete(
            `${API_BASE_URL}/issue/comments/${issueId}/${commentId}`,
            {
                headers: getAuthHeaders(),
                data: { deletedBy: getCurrentUserKeycloakId() },
                signal,
            }
        )
        if (data.statusCode !== 200) {
            throw new Error(data.description || "Failed to delete comment")
        }
        return {
            message: "Comment Deleted",
            description: data.message || "Comment deleted successfully",
        }
    } catch (error) {
        if (error.name === "CanceledError") throw error
        throw new Error(
            error.response?.data?.description ||
            error.message ||
            "Failed to delete comment"
        )
    }
}

// ── Fetch Project Users ──────────────────────────────────────────────────

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