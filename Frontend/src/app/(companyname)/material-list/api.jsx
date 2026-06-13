// app/material-master/api.js
import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const BASE = getBaseUrl()

export function getMaterialHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return {
    ...getAuthHeaders(),
    "x-company-id": companyId,
  }
}

export function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function formatMaterialError(error) {
  const raw =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  if (Array.isArray(raw)) return raw[0] || "Something went wrong"
  return typeof raw === "string" ? raw : "Something went wrong"
}

export function mapMaterial(raw) {
  if (!raw) return null
  return {
    id: raw._id,
    name: raw.name || "",
    category: raw.category || "",
    unit: raw.unit || "",
    description: raw.description || "",
    isActive: raw.isActive ?? true,
    createdBy: raw.createdBy || null,
    updatedBy: raw.updatedBy || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  }
}

export async function createMaterial(payload, signal = null) {
  try {
    const { data } = await axios.post(
      `${BASE}/material`,
      payload,
      { headers: getMaterialHeaders(), signal }
    )
    if (data.statusCode !== 201 && !data.data) {
      throw new Error(data.description || data.message || "Failed to create material")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}

export async function fetchMaterials({
  search = "",
  category = "",
  isActive,
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  sortOrder = "desc",
  signal = null,
} = {}) {
  try {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("sortOrder", sortOrder)
    if (search.trim()) params.append("search", search.trim())
    if (category.trim()) params.append("category", category.trim())
    if (isActive !== undefined) params.append("isActive", String(isActive))

    const { data } = await axios.get(
      `${BASE}/material?${params.toString()}`,
      { headers: getMaterialHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch materials")
    }

    const materials = data.data?.materials || []
    const pagination = data.data?.pagination || {
      total: materials.length,
      page,
      limit,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }

    return {
      materials: materials.map(mapMaterial),
      pagination,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}
export async function fetchMaterialsLookup(search = "", signal = null) {
  try {
    const params = new URLSearchParams()
    if (search.trim()) params.append("search", search.trim())

    const { data } = await axios.get(
      `${BASE}/material/lookup?${params.toString()}`,
      { headers: getMaterialHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch lookup")
    }

    return data.data?.materials || []
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}
export async function fetchMaterialById(materialId, signal = null) {
  try {
    if (!materialId) throw new Error("Material ID is required")

    const { data } = await axios.get(
      `${BASE}/material/${materialId}`,
      { headers: getMaterialHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch material")
    }

    return mapMaterial(data.data?.material)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}

export async function editMaterial(materialId, payload, signal = null) {
  try {
    if (!materialId) throw new Error("Material ID is required")

    const { data } = await axios.patch(
      `${BASE}/material/${materialId}`,
      payload,
      { headers: getMaterialHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to update material")
    }

    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}

export async function toggleMaterialStatus(materialId, updatedBy = null, signal = null) {
  try {
    if (!materialId) throw new Error("Material ID is required")

    const body = {}
    if (updatedBy) body.updatedBy = updatedBy

    const { data } = await axios.patch(
      `${BASE}/material/status/${materialId}`,
      body,
      { headers: getMaterialHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to toggle status")
    }

    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}

export async function deleteMaterial(materialId, updatedBy = null, signal = null) {
  try {
    if (!materialId) throw new Error("Material ID is required")

    const body = {}
    if (updatedBy) body.updatedBy = updatedBy

    const { data } = await axios.delete(
      `${BASE}/material/${materialId}`,
      { headers: getMaterialHeaders(), data: body, signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to delete material")
    }

    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatMaterialError(error))
  }
}
export function buildStats(pagination, activeCount, inactiveCount, categoryCount, recentCount) {
  return [
    { id: 1, title: "Total Materials", value: pagination.total ?? 0, subtitle: "Across your company", colorClass: "bg-[#f8f9fa] dark:bg-[#1e1e2e]" },
    { id: 2, title: "Active Materials", value: activeCount ?? 0, subtitle: "Currently active", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 3, title: "Inactive Materials", value: inactiveCount ?? 0, subtitle: "Currently inactive", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 4, title: "Categories", value: categoryCount ?? 0, subtitle: "Unique categories", colorClass: "bg-[#f8f9fa] dark:bg-[#1e1e2e]" },
    { id: 5, title: "Recently Added", value: recentCount ?? 0, subtitle: "Last 7 days", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
  ]
}

export function getCurrentUserKeycloakId() {
  return localStorage.getItem("keycloakId") || ""
}