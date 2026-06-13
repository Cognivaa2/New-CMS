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

export async function fetchAllRoles() {
  const url = `${API_BASE_URL}/role/all?isActive=true&limit=100&sortBy=roleName&order=asc`
  const { data } = await axios.get(url, { headers: getAuthHeaders() })
  return (data.data?.roles ?? []).map((role) => ({
    value: role._id,
    label: role.roleName,
  }))
}

export function isMongoObjectId(v) {
  return typeof v === "string" && /^[a-f\d]{24}$/i.test(v)
}

export function isUUID(v) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  )
}

export function normalizeAssignedUsers(users) {
  if (!Array.isArray(users)) return []

  return users
    .map((u) => {
      if (!u) return null

      if (u.id && !u.userId) {
        return {
          id: u.id,
          mongoId: u.mongoId || (isMongoObjectId(u.id) ? u.id : ""),
          keycloakId: u.keycloakId || (isUUID(u.id) ? u.id : ""),
          name: u.name || "",
          email: u.email || "",
          avatar: u.avatar || null,
          roleId: u.roleId || "",
        }
      }

      if (typeof u === "string") {
        return {
          id: u,
          mongoId: isMongoObjectId(u) ? u : "",
          keycloakId: isUUID(u) ? u : "",
          name: "",
          email: "",
          avatar: null,
          roleId: "",
        }
      }

      let id = ""
      let mongoId = ""
      let keycloakId = ""
      let name = ""
      let email = ""
      let avatar = null
      let roleId = ""

      if (u.roleId) {
        roleId = typeof u.roleId === "object" ? u.roleId._id || u.roleId.id || "" : u.roleId
      } else if (u.role) {
        roleId = typeof u.role === "object" ? u.role._id || u.role.id || "" : u.role
      }

      if (u.userId && typeof u.userId === "object") {
        const raw = u.userId
        mongoId = raw._id && isMongoObjectId(raw._id) ? raw._id : ""
        keycloakId = raw.keycloakId && isUUID(raw.keycloakId) ? raw.keycloakId : ""
        id = keycloakId || mongoId || raw.id || ""
        name = raw.name || ""
        email = raw.email || ""
        avatar = raw.avatar || null
      } else if (u.userId && typeof u.userId === "string") {
        id = u.userId
        if (isMongoObjectId(u.userId)) mongoId = u.userId
        if (isUUID(u.userId)) keycloakId = u.userId
        name = u.name || ""
        email = u.email || ""
        avatar = u.avatar || null
      } else {
        mongoId = u._id && isMongoObjectId(u._id) ? u._id : ""
        keycloakId = u.keycloakId && isUUID(u.keycloakId) ? u.keycloakId : ""
        id = keycloakId || mongoId || u.id || ""
        name = u.name || ""
        email = u.email || ""
        avatar = u.avatar || null
      }

      return { id, mongoId, keycloakId, name, email, avatar, roleId }
    })
    .filter((u) => u && (u.id || u.mongoId || u.keycloakId))
}

export function mapProjectToCardFormat(apiProject) {
  return {
    id: apiProject._id || apiProject.projectId || apiProject.id,
    projectName: apiProject.projectName || "",
    projectCode: apiProject.projectCode || apiProject.code || "",
    description: apiProject.description || "",
    location: apiProject.location || "",
    clientName: apiProject.clientName || apiProject.client || "",
    status: apiProject.status || "planned",
    healthStatus: apiProject.healthStatus || "on_track",
    completionPercent: apiProject.completionPercent || 0,
    budget: apiProject.budget || "",
    startDate: apiProject.startDate || "",
    endDate: apiProject.endDate || "",
    coverImage: apiProject.coverImage || "",
    assignedUsers: normalizeAssignedUsers(apiProject.assignedUsers),
    createdAt: apiProject.createdAt ? formatDate(apiProject.createdAt) : "—",
  }
}

export function getInitialActiveProject(projects) {
  return projects.length > 0 ? projects[0] : null
}

export function updateProjectInList(projects, updatedProject) {
  return projects.map((p) =>
    p.id === updatedProject.id ? { ...p, ...updatedProject } : p
  )
}

export function removeProjectFromList(projects, projectId) {
  return projects.filter((p) => p.id !== projectId)
}
export function getCurrentUserKeycloakId() {
  return localStorage.getItem("keycloakId") || ""
}
function buildProjectFormData(projectData) {
  const formData = new FormData()
  formData.append("companyId", getCompanyId())
  formData.append("projectName", projectData.projectName?.trim() || "")
  formData.append("projectCode", projectData.projectCode?.trim() || "")
  formData.append("clientName", projectData.clientName?.trim() || "")
  formData.append("location", projectData.location?.trim() || "")
  formData.append("description", projectData.description?.trim() || "")
  formData.append("status", projectData.status || "planned")
  formData.append("healthStatus", projectData.healthStatus || "on_track")
  formData.append("completionPercent", String(projectData.completionPercent || 0))
  formData.append("budget", String(projectData.budget || ""))
  formData.append("startDate", formatToISO(projectData.startDate))
  formData.append("endDate", formatToISO(projectData.endDate))
  if (projectData.createdBy) {
    formData.append("createdBy", projectData.createdBy)
  }
  if (projectData.coverImage instanceof File) {
    formData.append("coverImage", projectData.coverImage)
  } else if (projectData.coverImage === null) {
    formData.append("coverImage", "")
  }
  if (Array.isArray(projectData.assignedUsers) && projectData.assignedUsers.length > 0) {
    const usersWithRoles = projectData.assignedUsers
      .map((user) => {
        if (!user) return null
        let userId = ""
        if (typeof user === "string") {
          userId = user
        } else {
          userId = user.keycloakId || user.id || user.mongoId || user._id || ""
        }
        const roleId = typeof user === "object" ? (user.roleId || "") : ""
        if (!userId) return null
        return { userId: String(userId), roleId: String(roleId) }
      })
      .filter(Boolean)
    formData.append("assignedUsers", JSON.stringify(usersWithRoles))
  } else {
    formData.append("assignedUsers", "[]")
  }
  return formData
}
function getFormDataHeaders() {
  const headers = getAuthHeaders()
  delete headers["Content-Type"]
  return headers
}
export async function fetchProjectsData({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  sortBy = "createdAt",
  order = "desc",
  signal = null,
} = {}) {
  try {
    const keycloakId = localStorage.getItem("keycloakId")
    if (!keycloakId) throw new Error("Keycloak ID not found")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (search?.trim()) params.append("search", search.trim())
    if (status) params.append("status", status)
    if (sortBy) params.append("sortBy", sortBy)
    if (order) params.append("order", order)

    const { data } = await axios.get(
      `${API_BASE_URL}/project/all/${keycloakId}?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )

    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to fetch projects")
    }

    const projects = data.title?.projects || data.data?.projects || []

    const pagination = data.title?.pagination || data.data?.pagination || {
      total: projects.length, page, limit, totalPages: 1,
    }

    return { projects: projects.map(mapProjectToCardFormat), pagination }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description || error.response?.data?.message || error.message || "Failed to fetch projects"
    )
  }
}

export async function fetchProjectById(projectId, signal = null) {
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/project/${projectId}`,
      { headers: getAuthHeaders(), signal }
    )

    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to fetch project")
    }

    let raw = null
    if (data.title && typeof data.title === "object") {
      if (data.title.project && typeof data.title.project === "object") raw = data.title.project
      else if (!Array.isArray(data.title)) raw = data.title
    }
    if (!raw && data.data && typeof data.data === "object") {
      if (data.data.project && typeof data.data.project === "object") raw = data.data.project
      else raw = data.data
    }
    if (!raw) throw new Error("Unexpected API response structure")

    return {
      project: mapProjectToCardFormat(raw),
      stats: data.data?.stats || {}
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description || error.response?.data?.message || error.message || "Failed to fetch project details"
    )
  }
}

export async function fetchUsersForSelection(search = "", signal = null) {
  try {
    const companyId = getCompanyId()
    if (!companyId) return []
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    params.set("page", "1")
    params.set("limit", "50")
    params.set("status", "Active")
    params.set("sortBy", "name")
    params.set("order", "asc")

    const { data } = await axios.get(
      `${API_BASE_URL}/user/all/${companyId}?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )

    const users = data.data?.users ?? []
    return users.map((u) => {
      const mongoId = u._id && isMongoObjectId(u._id) ? u._id : ""
      const keycloakId = u.keycloakId && isUUID(u.keycloakId) ? u.keycloakId : ""

      return {
        id: keycloakId || mongoId || u.id || "",
        mongoId,
        keycloakId,
        _id: u._id || "",
        name: u.name || "Unknown",
        email: u.email || "",
        avatar: u.avatar || null,
      }
    })
  } catch (error) {
    if (error.name === "CanceledError") throw error
    return []
  }
}

export async function addProject(projectData, signal = null) {
  try {
    const formData = buildProjectFormData(projectData)
    const { data } = await axios.post(`${API_BASE_URL}/project/add`, formData, { headers: getFormDataHeaders(), signal })
    if (!data.success) throw new Error(data.description || data.message || "Failed to create project")
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(error.response?.data?.description || error.response?.data?.message || error.message || "Failed to create project")
  }
}

export async function editProject(projectId, projectData, signal = null) {
  try {
    const formData = buildProjectFormData(projectData)
    const { data } = await axios.put(`${API_BASE_URL}/project/edit/${projectId}`, formData, { headers: getFormDataHeaders(), signal })
    if (!data.success) throw new Error(data.description || data.message || "Failed to update project")
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(error.response?.data?.description || error.response?.data?.message || error.message || "Failed to update project")
  }
}

export async function deleteProject(projectId, signal = null) {
  try {
    const { data } = await axios.delete(`${API_BASE_URL}/project/delete/${projectId}`, { headers: getAuthHeaders(), signal })
    if (!data.success) throw new Error(data.description || data.message || "Failed to delete project")
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(error.response?.data?.description || error.response?.data?.message || error.message || "Failed to delete project")
  }
}

export async function updateProjectStatus(projectId, status, signal = null) {
  try {
    const { data } = await axios.patch(`${API_BASE_URL}/project/statusUpdate/${projectId}`, { status }, { headers: getAuthHeaders(), signal })
    if (!data.success) throw new Error(data.description || data.message || "Failed to update status")
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(error.response?.data?.description || error.response?.data?.message || error.message || "Failed to update project status")
  }
}


export async function fetchProjectMembers(projectId, signal = null) {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/project/members/${projectId}`, { headers: getAuthHeaders(), signal })
    if (!data.success) throw new Error(data.data || data.message || "Failed to fetch members")
    return data.title?.members ?? data.data?.members ?? []
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description || error.response?.data?.message || error.message || "Failed to fetch members"
    )
  }
}


export async function updateProjectMember(projectId, userId, action, signal = null) {
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/project/members/${projectId}`,
      { userId, action },
      { headers: getAuthHeaders(), signal }
    )
    if (!data.success) throw new Error(data.data || data.message || "Failed to update member")
    return data.title
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description || error.response?.data?.message || error.message || "Failed to update member"
    )
  }
}


export async function changeProjectMemberRole(projectId, userId, roleId, signal = null) {
  try {
    const { data } = await axios.patch(`${API_BASE_URL}/project/role/${projectId}`, { userId, roleId }, { headers: getAuthHeaders(), signal })
    if (!data.success) throw new Error(data.data || data.message || "Failed to change role")
    return data.title
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description || error.response?.data?.message || error.message || "Failed to change member role"
    )
  }
}

export async function exportProject(projectId, projectName = "project", signal = null) {
  try {
    const companyId = getCompanyId()
    const headers = {
      ...getAuthHeaders(),
      "x-company-id": companyId,
    }

    const response = await axios.get(
      `${API_BASE_URL}/project/export/${projectId}`,
      {
        headers,
        responseType: "blob",
        signal,
      }
    )

    const blob = response.data
    const contentDisposition = response.headers["content-disposition"]

    let filename = `${projectName}-export.zip`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i)
      if (match?.[1]) {
        filename = decodeURIComponent(match[1].replace(/['"]/g, "").trim())
      }
    }

    const url = window.URL.createObjectURL(
      new Blob([blob], { type: blob.type || "application/zip" })
    )

    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)

    return { success: true, filename }
  } catch (error) {
    if (error.name === "AbortError" || error.name === "CanceledError") throw error

    let errorMessage = "Failed to export project"

    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        const parsed = JSON.parse(text)
        errorMessage =
          parsed?.description ||
          parsed?.message ||
          errorMessage
      } catch {
        errorMessage = error.message || errorMessage
      }
    } else {
      errorMessage =
        error.response?.data?.description ||
        error.response?.data?.message ||
        error.message ||
        errorMessage
    }

    throw new Error(errorMessage)
  }
}