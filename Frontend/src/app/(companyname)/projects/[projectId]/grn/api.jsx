import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatGRNError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

function getGRNHeaders(isFormData = false) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  const base = { ...getAuthHeaders(), "x-company-id": companyId }
  if (isFormData) {
    delete base["Content-Type"]
    delete base["content-type"]
  }
  return base
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
    id: user._id || user.id || "",
    keycloakId: user.keycloakId || "",
    name: user.name || "Unknown",
    email: user.email || "",
    role: user.designation || user.role || "Member",
    avatar: user.avatar || user.avatarUrl || null,
  }
}

function mapGRNItem(raw) {
  if (!raw) return null
  return {
    inventoryId: raw.inventoryId || "",
    materialMasterId: raw.materialMasterId || "",
    materialName: raw.materialName || "",
    unit: raw.unit || "Units",
    orderedQuantity: raw.orderedQuantity ?? 0,
    receivedQuantity: raw.receivedQuantity ?? 0,
    remarks: raw.remarks || "",
  }
}

export function mapGRN(raw) {
  if (!raw) return null

  const items = Array.isArray(raw.items) ? raw.items.map(mapGRNItem) : []

  const materialNames = items.map((i) => i.materialName).filter(Boolean)
  const materials =
    materialNames.length === 0
      ? null
      : materialNames.length <= 2
        ? materialNames.join(", ")
        : `${materialNames.slice(0, 2).join(", ")}, +${materialNames.length - 2} more`

  return {
    id: raw._id,
    grnNumber: raw.grnNumber || null,
    poId: raw.poId || null,
    poNumber: raw.poNumber || null,
    mrId: raw.mrId || null,
    vendorId: raw.vendorId || null,
    vendorName: raw.vendorName || null,
    materials,
    items,
    totalAmount: raw.totalAmount ?? null,
    deliveryDate: raw.deliveryDate || null,
    deliveryDateFormatted: formatDate(raw.deliveryDate),
    vehicleNumber: raw.vehicleNumber || null,
    deliveryChallanNumber: raw.deliveryChallanNumber || null,
    deliveryChallanDate: raw.deliveryChallanDate || null,
    deliveryChallanDateFormatted: formatDate(raw.deliveryChallanDate),
    remarks: raw.remarks || null,
    attachment: raw.attachment || null,
    createdBy: mapUser(raw.createdBy),
    updatedBy: mapUser(raw.updatedBy),
    createdAt: formatDate(raw.createdAt),
    updatedAt: raw.updatedAt || "",
  }
}

export function buildGRNPayload(form, createdBy = null) {
  const formData = new FormData()
  if (createdBy) formData.append("createdBy", createdBy)
  if (form.deliveryDate) {
    const deliveryDate =
      form.deliveryDate instanceof Date
        ? form.deliveryDate.toISOString()
        : String(form.deliveryDate)
    formData.append("deliveryDate", deliveryDate)
  }
  if (form.vehicleNumber?.trim())
    formData.append("vehicleNumber", form.vehicleNumber.trim())
  if (form.deliveryChallanNumber?.trim())
    formData.append("deliveryChallanNumber", form.deliveryChallanNumber.trim())
  if (form.deliveryChallanDate) {
    const challanDate =
      form.deliveryChallanDate instanceof Date
        ? form.deliveryChallanDate.toISOString()
        : String(form.deliveryChallanDate)
    formData.append("deliveryChallanDate", challanDate)
  }
  if (form.remarks?.trim()) formData.append("remarks", form.remarks.trim())
  const items = (form.items || [])
    .filter((i) => i.inventoryId && Number(i.receivedQuantity) > 0)
    .map((item) => ({
      inventoryId: item.inventoryId || "",
      materialMasterId: item.materialMasterId || "",
      materialName: item.materialName || "",
      unit: item.unit || "Units",
      orderedQuantity: Number(item.orderedQuantity) || 0,
      receivedQuantity: Number(item.receivedQuantity) || 0,
      remarks: item.remarks || "",
    }))
  formData.append("items", JSON.stringify(items))
  if (form.attachment instanceof File) {
    formData.append("attachment", form.attachment, form.attachment.name)
  }
  return formData
}

export function computeGRNStats(grns, total = 0) {
  const totalItems = grns.reduce((sum, g) => sum + (g.items?.length || 0), 0)
  const withAttachments = grns.filter((g) => g.attachment).length
  const uniqueVendors = new Set(grns.map((g) => g.vendorId).filter(Boolean)).size

  return [
    {
      id: 1,
      title: "Total GRNs",
      value: total,
      subtitle: "Goods received",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 2,
      title: "Items Received",
      value: totalItems,
      subtitle: "Across all GRNs",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 3,
      title: "With Attachments",
      value: withAttachments,
      subtitle: "Challan/Invoice",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 4,
      title: "Vendors",
      value: uniqueVendors,
      subtitle: "Unique suppliers",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
  ]
}

export async function fetchAllGRNs(
  projectId,
  {
    page = 1,
    limit = 10,
    search = "",
    poId,
    vendorId,
    sortBy = "createdAt",
    order = "desc",
    lastId,
    signal = null,
  } = {}
) {
  if (!projectId) throw new Error("projectId is required")

  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  params.append("sortBy", sortBy)
  params.append("order", order)
  if (search?.trim()) params.append("search", search.trim())
  if (poId) params.append("poId", poId)
  if (vendorId) params.append("vendorId", vendorId)
  if (lastId) params.append("lastId", lastId)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/grn/${projectId}?${params.toString()}`,
      { headers: getGRNHeaders(), signal }
    )

    const rawGRNs = data.data?.grns || []
    const raw = data.data?.pagination || {}

    const total = raw.total ?? rawGRNs.length
    const totalPages = raw.totalPages ?? 1
    const curPage = raw.page ?? page

    const hasNextPage = raw.hasNextPage ?? raw.hasNext ?? (curPage < totalPages)
    const nextCursor = raw.nextCursor ?? (hasNextPage ? String(curPage + 1) : null)

    return {
      grns: rawGRNs.map(mapGRN),
      pagination: { ...raw, total, page: curPage, totalPages, hasNextPage, nextCursor },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function fetchSingleGRN(projectId, grnId, signal = null) {
  if (!projectId || !grnId) throw new Error("projectId and grnId are required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/grn/${projectId}/${grnId}`,
      { headers: getGRNHeaders(), signal }
    )
    const raw = data.data?.grn
    if (!raw) throw new Error("GRN data missing in response")
    return mapGRN(raw)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function createGRN(projectId, poId, payload, signal = null) {
  if (!projectId || !poId) throw new Error("projectId and poId are required")
  const isFormData = payload instanceof FormData
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/grn/${projectId}/${poId}`,
      payload,
      { headers: getGRNHeaders(isFormData), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function editGRN(projectId, grnId, payload, signal = null) {
  if (!projectId || !grnId) throw new Error("projectId and grnId are required")
  const isFormData = payload instanceof FormData
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/grn/${projectId}/${grnId}`,
      payload,
      { headers: getGRNHeaders(isFormData), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function deleteGRN(projectId, grnId, deletedBy, signal = null) {
  if (!projectId || !grnId || !deletedBy)
    throw new Error("projectId, grnId and deletedBy are required")

  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/grn/${projectId}/${grnId}`,
      { headers: getGRNHeaders(), data: { deletedBy }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function fetchPOPendingItems(projectId, poId, signal = null) {
  if (!projectId || !poId) throw new Error("projectId and poId are required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/grn/${projectId}/${poId}/pending`,
      { headers: getGRNHeaders(), signal }
    )
    return data.data || {}
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function fetchGRNsByPO(projectId, poId, signal = null) {
  if (!projectId || !poId) throw new Error("projectId and poId are required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/grn/${projectId}/po/${poId}`,
      { headers: getGRNHeaders(), signal }
    )
    return data.data || {}
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatGRNError(error))
  }
}

export async function exportGRNPdf(projectId, grnId) {
  if (!projectId || !grnId) throw new Error("projectId and grnId are required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/grn/${projectId}/export/${grnId}`,
      { headers: getGRNHeaders(), responseType: "blob" }
    )
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `GRN_${grnId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    throw new Error(formatGRNError(error))
  }
}

export async function fetchApprovedPOs(
  projectId,
  { search = "", signal = null } = {}
) {
  if (!projectId) throw new Error("projectId is required")

  const params = new URLSearchParams()
  params.append("page", "1")
  params.append("limit", "100")
  params.append("status", "Approved,PartiallyDelivered")
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/po/${projectId}?${params.toString()}`,
      { headers: getGRNHeaders(), signal }
    )
    return data.data?.pos || []
  } catch (error) {
    if (error.name === "CanceledError") throw error
    console.error("[fetchApprovedPOs] failed:", error.message)
    return []
  }
}