import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatToastError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function mapUser(user) {
  if (!user) return null
  return {
    id:         user._id || user.id || "",
    keycloakId: user.keycloakId || "",
    name:       user.name || "Unknown",
    email:      user.email || "",
    role:       user.designation || user.role || "Member",
    avatar:     user.avatar || user.avatarUrl || null,
  }
}

function mapMRItem(raw) {
  if (!raw) return null
  return {
    inventoryId:      raw.inventoryId      || "",
    materialMasterId: raw.materialMasterId || "",
    materialName:     raw.materialName     || "",
    unit:             raw.unit             || "Units",
    quantity:         raw.requiredQuantity ?? 0,
    currentStock:     raw.stockAtTimeOfMR  ?? 0,
  }
}

export function mapMRToTableFormat(mr) {
  if (!mr) return null

  const items = Array.isArray(mr.items) ? mr.items.map(mapMRItem) : []

  const materialNames = items.map((i) => i.materialName).filter(Boolean)
  const materials =
    materialNames.length === 0
      ? null
      : materialNames.length <= 2
      ? materialNames.join(", ")
      : `${materialNames.slice(0, 2).join(", ")}, +${materialNames.length - 2} more`

  const quantityParts = items
    .slice(0, 2)
    .map((i) => `${i.quantity} ${i.unit || ""}`.trim())
  const quantities =
    quantityParts.length === 0
      ? null
      : items.length > 2
      ? `${quantityParts.join(", ")}, ...`
      : quantityParts.join(", ")

  const totalQuantity = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0),
    0
  )

  return {
    id:               mr._id,
    mrId:             mr.mrNumber        || null,
    mrNumber:         mr.mrNumber        || null,
    materials,
    quantities,
    totalQuantity,
    items,
    status:           mr.status          || "Draft",
    neededBy:         formatDate(mr.requiredByDate),
    requiredByDate:   mr.requiredByDate  || null,
    requestedBy:      mapUser(mr.createdBy),
    approvedBy:       mapUser(mr.approvedBy),
    rejectedBy:       mapUser(mr.rejectedBy),
    submittedAt:      mr.submittedAt     || null,
    approvedAt:       mr.approvedAt      || null,
    rejectedAt:       mr.rejectedAt      || null,
    rejectionRemarks: mr.rejectionRemarks || null,
    reason:           mr.reason          || null,
    remarks:          mr.remarks         || null,
    phaseId:          mr.phaseId         || null,
    taskId:           mr.taskId          || null,
    subTaskId:        mr.subTaskId       || null,
    projectId:        mr.projectId       || null,
    createdAt:        formatDate(mr.createdAt),
    updatedAt:        mr.updatedAt       || "",
  }
}

export function buildMRPayload(form, userKeycloakId = null, mode = "create") {
  const payload = {
    requiredByDate: form.requiredByDate || null,
    reason:         form.reason         || null,
    remarks:        form.remarks        || null,
    items: (form.items || []).map((item) => ({
      inventoryId:      item.inventoryId      || "",
      materialMasterId: item.materialMasterId || "",
      materialName:     item.materialName     || "",
      unit:             item.unit             || "Units",
      requiredQuantity: item.quantity         ?? 0,
    })),
  }
  if (userKeycloakId) {
    if (mode === "create") payload.createdBy = userKeycloakId
    else payload.updatedBy = userKeycloakId
  }
  return payload
}

export function computeMRStats(mrs, total = 0) {
  const pending   = mrs.filter((m) => m.status === "Draft" || m.status === "Submitted").length
  const approved  = mrs.filter((m) => m.status === "Approved").length
  const fulfilled = mrs.filter((m) => m.status === "ConvertedToPO").length
  const rejected  = mrs.filter((m) => m.status === "Rejected").length
  const totalQty  = mrs.reduce((sum, m) => sum + (m.totalQuantity || 0), 0)

  return [
    { id: 1, title: "Pending Requests",  value: pending,   subtitle: "Draft & Submitted", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 2, title: "Approved Requests", value: approved,  subtitle: "Ready for PO",      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 3, title: "Fulfilled Requests",value: fulfilled, subtitle: "Converted to PO",   colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 4, title: "Rejected Requests", value: rejected,  subtitle: "Declined MRs",      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 5, title: "Total Quantity",    value: totalQty,  subtitle: "Across all items",  colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
  ]
}

export async function fetchAllMRs(
  projectId,
  {
    page      = 1,
    limit     = 10,
    search    = "",
    status,
    sortBy    = "createdAt",
    order     = "desc",
    lastId,
    signal    = null,
  } = {}
) {
  if (!projectId) throw new Error("projectId is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  params.append("page",  String(page))
  params.append("limit", String(limit))
  if (search?.trim()) params.append("search",  search.trim())
  if (status)         params.append("status",  status)
  if (sortBy)         params.append("sortBy",  sortBy)
  if (order)          params.append("order",   order)
  if (lastId)         params.append("lastId",  lastId)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/requisition/${projectId}?${params.toString()}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )

    const rawMRs    = data.data?.mrs || []
    const pagination = data.data?.pagination || {
      total: rawMRs.length,
      page,
      limit,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }

    return { mrs: rawMRs.map(mapMRToTableFormat), pagination }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch MRs"
    )
  }
}

export async function fetchSingleMR(projectId, mrId, signal = null) {
  if (!projectId || !mrId) throw new Error("projectId and mrId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/requisition/${projectId}/${mrId}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )

    const raw = data.data?.mr
    if (!raw) throw new Error("MR data missing in response")
    return mapMRToTableFormat(raw)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch MR"
    )
  }
}

export async function createMR(projectId, payload, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/requisition/${projectId}`,
      payload,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to create MR"
    )
  }
}

export async function editMR(projectId, mrId, payload, signal = null) {
  if (!projectId || !mrId) throw new Error("projectId and mrId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/requisition/${projectId}/${mrId}`,
      payload,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to edit MR"
    )
  }
}

export async function submitMR(projectId, mrId, updatedBy, signal = null) {
  if (!projectId || !mrId || !updatedBy)
    throw new Error("projectId, mrId and updatedBy are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/requisition/${projectId}/submit/${mrId}`,
      { updatedBy },
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to submit MR"
    )
  }
}

export async function approveMR(projectId, mrId, actionBy, signal = null) {
  if (!projectId || !mrId || !actionBy)
    throw new Error("projectId, mrId and actionBy are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/requisition/${projectId}/approve/${mrId}`,
      { actionBy },
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to approve MR"
    )
  }
}

export async function rejectMR(
  projectId,
  mrId,
  actionBy,
  rejectionRemarks = "",
  signal = null
) {
  if (!projectId || !mrId || !actionBy)
    throw new Error("projectId, mrId and actionBy are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/requisition/${projectId}/reject/${mrId}`,
      { actionBy, rejectionRemarks },
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to reject MR"
    )
  }
}

export async function deleteMR(projectId, mrId, deletedBy, signal = null) {
  if (!projectId || !mrId || !deletedBy)
    throw new Error("projectId, mrId and deletedBy are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/requisition/${projectId}/${mrId}`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        data: { deletedBy },
        signal,
      }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to delete MR"
    )
  }
}

export async function fetchMRItems(projectId, mrId, signal = null) {
  if (!projectId || !mrId) throw new Error("projectId and mrId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/requisition/${projectId}/items/${mrId}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data.data || null
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch MR items"
    )
  }
}

export async function fetchProjectInventoryForMR(
  projectId,
  signal = null,
  search = ""
) {
  if (!projectId) throw new Error("projectId is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const params = new URLSearchParams()
    params.append("limit", "200")
    params.append("page",  "1")
    if (search?.trim()) params.append("search", search.trim())

    const { data } = await axios.get(
      `${API_BASE_URL}/inventory/${projectId}/lookup?${params.toString()}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )

    const rawItems = data.data?.materials || []
    return rawItems.map((inv) => ({
      _id:              String(inv.inventoryId),
      id:               String(inv.inventoryId),
      materialMasterId: String(inv.materialMasterId),
      materialName:     inv.name,
      unit:             inv.unit         || "Units",
      currentStock:     inv.currentStock ?? 0,
    }))
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    console.error("[fetchProjectInventoryForMR] failed:", error.message)
    return []
  }
}

export async function fetchMaterialsLookup(search = "", signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/material/lookup?${params.toString()}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data.data?.materials || []
  } catch (error) {
    if (error.name === "CanceledError") throw error
    console.error("fetchMaterialsLookup failed:", error.message)
    return []
  }
}