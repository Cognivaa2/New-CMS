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

export function mapTransferToCardFormat(transfer, viewerProjectId = null) {
  const fromProjectId =
    typeof transfer.fromProjectId === "object"
      ? transfer.fromProjectId?._id
      : transfer.fromProjectId

  const type =
    viewerProjectId && String(fromProjectId) === String(viewerProjectId)
      ? "Outgoing"
      : "Incoming"

  const createdBy = transfer.createdBy || {}
  const approvedBy = transfer.approvedBy || null
  const rejectedBy = transfer.rejectedBy || null

  return {
    id: transfer._id,
    _transferId: transfer._id,
    _isMovement: false,
    type,
    date: transfer.createdAt
      ? new Date(transfer.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—",
    material:
      transfer.items?.length > 0
        ? transfer.items[0].materialName +
        (transfer.items.length > 1 ? ` +${transfer.items.length - 1} more` : "")
        : "—",
    quantity:
      transfer.items?.length > 0
        ? `${transfer.items[0].quantity} ${transfer.items[0].unit}`
        : "—",
    items: transfer.items || [],
    fromProject:
      typeof transfer.fromProjectId === "object"
        ? transfer.fromProjectId?.projectName || "—"
        : "—",
    toProject:
      typeof transfer.toProjectId === "object"
        ? transfer.toProjectId?.projectName || "—"
        : "—",
    fromProjectId,
    toProjectId:
      typeof transfer.toProjectId === "object"
        ? transfer.toProjectId?._id
        : transfer.toProjectId,
    status: transfer.status || "Draft",
    reason: transfer.reason || "",
    remarks: transfer.remarks || "",
    rejectionRemarks: transfer.rejectionRemarks || "",
    createdBy: {
      name: createdBy.name || "Unknown",
      email: createdBy.email || "",
      avatar: createdBy.avatar || null,
    },
    approvedBy: approvedBy
      ? { name: approvedBy.name || "", email: approvedBy.email || "" }
      : null,
    rejectedBy: rejectedBy
      ? { name: rejectedBy.name || "", email: rejectedBy.email || "" }
      : null,
    approvedAt: transfer.approvedAt || null,
    rejectedAt: transfer.rejectedAt || null,
    createdAt: transfer.createdAt || "",
    updatedAt: transfer.updatedAt || "",
  }
}

export async function fetchTransferById(fromProjectId, transferId, signal = null) {
  if (!fromProjectId || !transferId)
    throw new Error("fromProjectId and transferId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/stocktransfer/${fromProjectId}/${transferId}`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )
    const raw = data.data?.transfer
    if (!raw) throw new Error("Transfer data missing in response")
    return mapTransferToCardFormat(raw, fromProjectId)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch transfer"
    )
  }
}

export async function createTransfer(fromProjectId, payload, signal = null) {
  if (!fromProjectId) throw new Error("fromProjectId is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/stocktransfer/${fromProjectId}`,
      payload,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
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
      "Failed to create transfer"
    )
  }
}

export async function approveTransfer(fromProjectId, transferId, actionBy, signal = null) {
  if (!fromProjectId || !transferId || !actionBy)
    throw new Error("fromProjectId, transferId and actionBy are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/stocktransfer/${fromProjectId}/approve/${transferId}`,
      { actionBy },
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
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
      "Failed to approve transfer"
    )
  }
}

export async function rejectTransfer(
  fromProjectId,
  transferId,
  actionBy,
  rejectionRemarks = "",
  signal = null
) {
  if (!fromProjectId || !transferId || !actionBy)
    throw new Error("fromProjectId, transferId and actionBy are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/stocktransfer/${fromProjectId}/reject/${transferId}`,
      { actionBy, rejectionRemarks },
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
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
      "Failed to reject transfer"
    )
  }
}

export async function editTransfer(fromProjectId, transferId, payload, signal = null) {
  if (!fromProjectId || !transferId)
    throw new Error("fromProjectId and transferId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.put(
      `${API_BASE_URL}/stocktransfer/${fromProjectId}/${transferId}`,
      payload,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
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
      "Failed to edit transfer"
    )
  }
}

export async function deleteTransfer(
  fromProjectId,
  transferId,
  deletedBy = null,
  signal = null
) {
  if (!fromProjectId || !transferId)
    throw new Error("fromProjectId and transferId are required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/stocktransfer/${fromProjectId}/${transferId}`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        data: deletedBy ? { deletedBy } : undefined,
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
      "Failed to delete transfer"
    )
  }
}

export async function fetchProjectLookup(signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.get(`${API_BASE_URL}/project/lookup`, {
      headers: { ...getAuthHeaders(), "x-company-id": companyId },
      signal,
    })
    const raw = data.title?.projects || data.data?.projects || []
    return raw.map((p) => ({
      _id: p.projectId || p._id || p.id,
      projectName: p.projectName || "",
      projectCode: p.projectCode || "",
      status: p.status || "",
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch projects"
    )
  }
}

export async function fetchInventoryByProject(projectId, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/inventory/${projectId}/lookup`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )
    const raw = data.data?.materials || []
    return raw.map((inv) => ({
      _id: String(inv.inventoryId || inv._id || ""),
      materialMasterId: String(inv.materialMasterId || ""),
      materialName: inv.name || inv.materialName || "",
      unit: inv.unit || "Units",
      currentStock: inv.currentStock ?? 0,
      category: inv.category || "",
      stockStatus: inv.stockStatus || "",
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch inventory"
    )
  }
}

export function mapMovement(raw) {
  if (!raw) return null

  const ownerProject = raw.projectId
    ? {
      id: String(raw.projectId._id),
      name: raw.projectId.projectName || "—",
      code: raw.projectId.projectCode || "",
    }
    : null

  const counterpartProject = raw.counterpartProjectId
    ? {
      id: String(raw.counterpartProjectId._id),
      name: raw.counterpartProjectId.projectName || "—",
      code: raw.counterpartProjectId.projectCode || "",
    }
    : null

  const isOutgoing = raw.movementType === "Outgoing"
  const fromProject = isOutgoing ? ownerProject : counterpartProject
  const toProject = isOutgoing ? counterpartProject : ownerProject

  return {
    id: String(raw._id),
    movementType: raw.movementType || "Incoming",
    materialName: raw.materialName || "—",
    materialMasterId: raw.materialMasterId || null,
    inventoryId: raw.inventoryId || null,
    quantity: raw.quantity ?? 0,
    unit: raw.unit || "Units",
    stockSnapshot: raw.stockSnapshot ?? null,
    status: raw.status || "Draft",

    fromProject,
    toProject,

    project: ownerProject,
    counterpartProject,

    transfer: raw.transferId
      ? {
        id: String(raw.transferId._id),
        status: raw.transferId.status || "",
        reason: raw.transferId.reason || "",
        remarks: raw.transferId.remarks || "",
      }
      : null,

    createdBy: raw.createdBy
      ? {
        name: raw.createdBy.name || "Unknown",
        email: raw.createdBy.email || "",
        avatar: raw.createdBy.avatar || null,
      }
      : null,

    formattedDate: raw.createdAt
      ? new Date(raw.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—",

    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  }
}

export async function fetchStockMovements(
  {
    page = 1,
    limit = 20,
    search = "",
    status,
    movementType,
    projectId,
    sortBy = "createdAt",
    order = "desc",
    signal = null,
  } = {}
) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  params.append("sortBy", sortBy)
  params.append("order", order)
  if (search?.trim()) params.append("search", search.trim())
  if (status) params.append("status", status)
  if (movementType) params.append("movementType", movementType)
  if (projectId) params.append("projectId", projectId)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/stocktransfer/movements?${params.toString()}`,
      {
        headers: { ...getAuthHeaders(), "x-company-id": companyId },
        signal,
      }
    )

    const raw = data.data?.movements || []
    const pagination = data.data?.pagination || {
      total: raw.length, page, limit, totalPages: 1, hasNext: false, hasPrev: false,
    }

    return { movements: raw.map(mapMovement), pagination }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch stock movements"
    )
  }
}