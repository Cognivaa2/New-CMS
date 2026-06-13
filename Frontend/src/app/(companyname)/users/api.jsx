import axios from "axios"
import { getAuthHeaders, getCompanyId, getBaseUrl } from "@/lib/apiHelper.js"

export function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export async function fetchAllUsers({ search = "", status = "", page = 1, limit = 10 } = {}) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID not found. Please log in again.")
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (status) params.set("status", status)
  params.set("page", String(page))
  params.set("limit", String(limit))
  params.set("sortBy", "createdAt")
  params.set("order", "desc")
  const url = `${getBaseUrl()}/user/all/${companyId}?${params.toString()}`
  const { data } = await axios.get(url, { headers: getAuthHeaders() })
  return {
    users: data.data?.users ?? [],
    pagination: data.data?.pagination ?? {},
  }
}

export function normaliseUser(user) {
  return {
    id: user.keycloakId,
    name: user.name ?? "Not provided",
    title: user.role?.roleName ?? "Not provided",
    email: user.email ?? "Not provided",
    role: user.role?.roleName ?? "Not provided",
    phone: user.phone ?? "Not provided",
    status: user.status ?? "Active",
    lastLogin: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—",
    avatar: user.avatar || null,

    isOwner: user.isOwner ?? false,
  }
}


export async function fetchAllRoles() {
  const url = `${getBaseUrl()}/role/all?isActive=true&limit=100&sortBy=roleName&order=asc`
  const { data } = await axios.get(url, { headers: getAuthHeaders() })

  return (data.data?.roles ?? []).map((role) => ({
    value: role._id,
    label: role.roleName,
  }))
}


export async function registerUser({ name, email, phone, address, about, roleId }) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID not found. Please log in again.")
  const url = `${getBaseUrl()}/user/register`
  const { data } = await axios.post(
    url,
    { name, email, phone, address, about, roleId },
    { headers: getAuthHeaders() }
  )

  return data
}

export async function fetchUserProfile(keycloakId) {
  const url = `${getBaseUrl()}/user/profile/${keycloakId}`
  const { data } = await axios.get(url, { headers: getAuthHeaders() })
  return data.data ?? data
}


export async function updateUser(keycloakId, { name, phone, address, about, avatar }) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID not found. Please log in again.")
  const url = `${getBaseUrl()}/user/update/${keycloakId}`
  const form = new FormData()
  if (name !== undefined) form.append("name", name)
  if (phone !== undefined) form.append("phone", phone)
  if (address !== undefined) form.append("address", address)
  if (about !== undefined) form.append("about", about)
  if (avatar instanceof File) form.append("avatar", avatar)
  const { data } = await axios.put(url, form, {
    headers: {
      ...getAuthHeaders({ includeContentType: false }),
    },
  })
  return data
}


export async function changeUserStatus(keycloakId, status) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID not found. Please log in again.")
  const url = `${getBaseUrl()}/user/status/${keycloakId}`
  const { data } = await axios.patch(url, { status }, { headers: getAuthHeaders() })
  return data
}


export const deleteUser = async (userId) => {
    const { data } = await axios.delete(
        `${getBaseUrl()}/user/delete/${userId}`,
        { headers: getAuthHeaders({ includeContentType: false }) }
    )
    return data
}