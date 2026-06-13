import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function getCurrentUserKeycloakId() {
  if (typeof window === "undefined") return null
  return (
    localStorage.getItem("keycloakId") ||
    localStorage.getItem("userId") ||
    null
  )
}

export function formatToastError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}
export async function fetchAllInventory({
  projectId,
  page = 1,
  limit = 10,
  search = "",
  stockStatus,
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
  if (stockStatus) params.append("stockStatus", stockStatus)
  params.append("sortBy", sortBy)
  params.append("order", order)

  const { data } = await axios.get(
    `${API_BASE_URL}/inventory/${projectId}?${params.toString()}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to fetch inventory")
  }
  return {
    inventory: data.data?.inventory || [],
    pagination: data.data?.pagination || {
      total: 0, page, limit, totalPages: 1,
    },
  }
}

export async function fetchInventoryLookup({
  projectId,
  search = "",
  inStock,
  signal = null,
} = {}) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())
  if (inStock !== undefined) params.append("inStock", String(inStock))

  const { data } = await axios.get(
    `${API_BASE_URL}/inventory/${projectId}/lookup?${params.toString()}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to fetch inventory lookup")
  }
  return data.data?.materials || []
}

export async function fetchSingleInventoryItem(projectId, inventoryId, signal = null) {
  if (!projectId || !inventoryId) throw new Error("Project ID and Inventory ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const { data } = await axios.get(
    `${API_BASE_URL}/inventory/${projectId}/${inventoryId}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to fetch inventory item")
  }
  return data.data
}

export async function addMaterialToInventory(projectId, payload, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const { data } = await axios.post(
    `${API_BASE_URL}/inventory/${projectId}`,
    payload,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 201) {
    throw new Error(data.description || "Failed to add material")
  }
  return data.data
}

export async function editInventoryItem(projectId, inventoryId, payload, signal = null) {
  if (!projectId || !inventoryId) throw new Error("Project ID and Inventory ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const { data } = await axios.patch(
    `${API_BASE_URL}/inventory/${projectId}/${inventoryId}`,
    payload,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to update inventory item")
  }
  return data.data
}

export async function stockAdjustment(projectId, inventoryId, payload, signal = null) {
  if (!projectId || !inventoryId) throw new Error("Project ID and Inventory ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const { data } = await axios.patch(
    `${API_BASE_URL}/inventory/${projectId}/adjust/${inventoryId}`,
    payload,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to adjust stock")
  }
  return data.data
}

export async function deleteInventoryItem(projectId, inventoryId, signal = null) {
  if (!projectId || !inventoryId) throw new Error("Project ID and Inventory ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const { data } = await axios.delete(
    `${API_BASE_URL}/inventory/${projectId}/${inventoryId}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to delete inventory item")
  }
  return data.data
}

export async function fetchLowStockAlerts(projectId, statusFilter = "all", signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  params.append("statusFilter", statusFilter)

  const { data } = await axios.get(
    `${API_BASE_URL}/inventory/${projectId}/low?${params.toString()}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to fetch low stock alerts")
  }
  return data.data?.alerts || []
}

export async function checkStockAvailability(projectId, materialMasterId, requiredQuantity, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  params.append("materialMasterId", materialMasterId)
  params.append("requiredQuantity", String(requiredQuantity))

  const { data } = await axios.get(
    `${API_BASE_URL}/inventory/${projectId}/stock?${params.toString()}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to check stock")
  }
  return data.data
}

export async function fetchMaterialMasterLookup(search = "", signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/material/lookup?${params.toString()}`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )

    console.log("Material lookup response:", data)

    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.data?.materials)) return data.data.materials

    return []
  } catch (error) {
    const isAbort =
      error.name === "CanceledError" ||
      error.name === "AbortError" ||
      error.code === "ERR_CANCELED"

    if (isAbort) {
      throw error
    }

    console.error("fetchMaterialMasterLookup failed:", error)
    return []
  }
}

export async function fetchVendorLookup(search = "", signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())
  const { data } = await axios.get(
    `${API_BASE_URL}/vendors/lookup?${params.toString()}`,
    { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
  )
  return data?.data?.vendors || []
}



export async function createStockAdjustment(projectId, payload, signal = null) {
  if (!projectId) throw new Error("Project ID is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const { data } = await axios.post(
    `${API_BASE_URL}/adjustments/${projectId}`,
    payload,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 201) {
    throw new Error(data.description || "Failed to create stock adjustment")
  }
  return data.data?.stockAdjustment
}



export async function fetchAllStockAdjustments({
  projectId,
  page = 1,
  limit = 15,
  status,
  adjustmentType,
  inventoryId,
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
  params.append("sortBy", sortBy)
  params.append("order", order)
  if (status) params.append("status", status)
  if (adjustmentType) params.append("adjustmentType", adjustmentType)
  if (inventoryId) params.append("inventoryId", inventoryId)
  const { data } = await axios.get(
    `${API_BASE_URL}/adjustments/${projectId}?${params.toString()}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to fetch stock adjustments")
  }
  return {
    adjustments: data.data?.adjustments || [],
    pagination: data.data?.pagination || { total: 0, page, limit, totalPages: 1, hasNext: false, hasPrev: false },
  }
}


export async function fetchSingleStockAdjustment(projectId, adjustmentId, signal = null) {
  if (!projectId || !adjustmentId) throw new Error("Project ID and Adjustment ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const { data } = await axios.get(
    `${API_BASE_URL}/adjustments/${projectId}/${adjustmentId}`,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to fetch stock adjustment")
  }
  return data.data?.stockAdjustment
}


export async function submitStockAdjustment(projectId, adjustmentId, updatedBy, signal = null) {
  if (!projectId || !adjustmentId) throw new Error("Project ID and Adjustment ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const { data } = await axios.patch(
    `${API_BASE_URL}/adjustments/${projectId}/submit/${adjustmentId}`,
    { updatedBy },
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to submit stock adjustment")
  }
  return data.data?.stockAdjustment
}


export async function approveStockAdjustment(projectId, adjustmentId, actionBy, signal = null) {
  if (!projectId || !adjustmentId) throw new Error("Project ID and Adjustment ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const { data } = await axios.patch(
    `${API_BASE_URL}/adjustments/${projectId}/approve/${adjustmentId}`,
    { actionBy },
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to approve stock adjustment")
  }
  return data.data?.stockAdjustment
}


export async function rejectStockAdjustment(projectId, adjustmentId, actionBy, rejectionRemarks = "", signal = null) {
  if (!projectId || !adjustmentId) throw new Error("Project ID and Adjustment ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const { data } = await axios.patch(
    `${API_BASE_URL}/adjustments/${projectId}/reject/${adjustmentId}`,
    { actionBy, rejectionRemarks },
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to reject stock adjustment")
  }
  return data.data?.stockAdjustment
}


export async function editStockAdjustment(projectId, adjustmentId, payload, signal = null) {
  if (!projectId || !adjustmentId) throw new Error("Project ID and Adjustment ID are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const { data } = await axios.patch(
    `${API_BASE_URL}/adjustments/${projectId}/${adjustmentId}`,
    payload,
    {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    }
  )
  if (data.statusCode !== 200) {
    throw new Error(data.description || "Failed to edit stock adjustment")
  }
  return data.data?.stockAdjustment
}