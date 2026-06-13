import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function formatPOError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

function getPOHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
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

function mapPOItem(raw) {
  if (!raw) return null
  return {
    inventoryId: raw.inventoryId || "",
    materialMasterId: raw.materialMasterId || "",
    materialName: raw.materialName || "",
    unit: raw.unit || "Units",
    orderedQuantity: raw.orderedQuantity ?? 0,
    receivedQuantity: raw.receivedQuantity ?? 0,
    unitPrice: raw.unitPrice ?? 0,
    discountPercent: raw.discountPercent ?? 0,
    gstPercent: raw.gstPercent ?? 0,
    totalPrice: raw.totalPrice ?? 0,
  }
}

export function mapPO(raw) {
  if (!raw) return null

  const items = Array.isArray(raw.items) ? raw.items.map(mapPOItem) : []

  const materialNames = items.map((i) => i.materialName).filter(Boolean)
  const materials =
    materialNames.length === 0
      ? null
      : materialNames.length <= 2
        ? materialNames.join(", ")
        : `${materialNames.slice(0, 2).join(", ")}, +${materialNames.length - 2} more`

  const totalOrderValue = raw.totalOrderValue ?? 0

  return {
    id: raw._id,
    poId: raw.poNumber || null,
    poNumber: raw.poNumber || null,
    mrId: raw.mrId || null,
    vendorId: raw.vendorId || null,
    vendorName: raw.vendorName || null,
    materials,
    items,
    totalOrderValue,
    status: raw.status || "Draft",
    expectedDeliveryDate: raw.expectedDeliveryDate || null,
    expectedDelivery: formatDate(raw.expectedDeliveryDate),
    deliveryAddress: raw.deliveryAddress || "",
    paymentTerms: raw.paymentTerms || null,
    specialInstructions: raw.specialInstructions || "",
    createdBy: mapUser(raw.createdBy),
    submittedBy: mapUser(raw.submittedBy),
    approvedBy: mapUser(raw.approvedBy),
    rejectedBy: mapUser(raw.rejectedBy),
    cancelledBy: mapUser(raw.cancelledBy),
    submittedAt: raw.submittedAt || null,
    approvedAt: raw.approvedAt || null,
    rejectedAt: raw.rejectedAt || null,
    cancelledAt: raw.cancelledAt || null,
    rejectionRemarks: raw.rejectionRemarks || "",
    cancellationRemarks: raw.cancellationRemarks || "",
    createdAt: formatDate(raw.createdAt),
    updatedAt: raw.updatedAt || "",
  }
}

export function buildPOPayload(form, createdBy = null) {
  const payload = {
    mrId: form.mrId || null,
    vendorId: form.vendorId || null,
    expectedDeliveryDate: form.expectedDeliveryDate
      ? form.expectedDeliveryDate instanceof Date
        ? form.expectedDeliveryDate.toISOString()
        : form.expectedDeliveryDate
      : null,
    deliveryAddress: form.deliveryAddress || null,
    paymentTerms: form.paymentTerms || null,
    specialInstructions: form.specialInstructions || null,
    items: (form.items || [])
      .filter((i) => i.materialMasterId && i.orderedQuantity > 0)
      .map((item) => ({
        inventoryId: item.inventoryId || "",
        materialMasterId: item.materialMasterId || "",
        materialName: item.materialName || "",
        unit: item.unit || "Units",
        orderedQuantity: Number(item.orderedQuantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        gstPercent: Number(item.gstPercent) || 0,
      })),
  }
  if (createdBy) payload.createdBy = createdBy
  return payload
}

function abbreviateNumber(num) {
  if (num == null || isNaN(num)) return "0"
  const absNum = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  if (absNum >= 1_000_000_000) {
    const val = absNum / 1_000_000_000
    return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)).replace(/\.0$/, "") + "B"
  }
  if (absNum >= 1_000_000) {
    const val = absNum / 1_000_000
    return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)).replace(/\.0$/, "") + "M"
  }
  if (absNum >= 1_000) {
    const val = absNum / 1_000
    return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)).replace(/\.0$/, "") + "K"
  }
  return sign + absNum.toString()
}

function abbreviateIndianCurrency(num) {
  if (num == null || isNaN(num)) return "₹0"
  const absNum = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  if (absNum >= 1_00_00_000) {
    const val = absNum / 1_00_00_000
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, "")
    return sign + "₹" + formatted + " Cr"
  }
  if (absNum >= 1_00_000) {
    const val = absNum / 1_00_000
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, "")
    return sign + "₹" + formatted + " L"
  }
  if (absNum >= 1_000) {
    const val = absNum / 1_000
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.?0+$/, "")
    return sign + "₹" + formatted + "K"
  }
  return sign + "₹" + absNum.toLocaleString("en-IN")
}

export function computePOStats(pos, total = 0) {
  const draft = pos.filter((p) => p.status === "Draft").length
  const submitted = pos.filter((p) => p.status === "Submitted").length
  const approved = pos.filter((p) => p.status === "Approved").length
  const rejected = pos.filter((p) => p.status === "Rejected").length
  const completed = pos.filter((p) => p.status === "Completed" || p.status === "PartiallyDelivered").length
  const totalValue = pos.reduce((sum, p) => sum + (p.totalOrderValue || 0), 0)

  return [
    { id: 1, title: "Draft POs", value: abbreviateNumber(draft), subtitle: "Pending submission", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 2, title: "Submitted POs", value: abbreviateNumber(submitted), subtitle: "Awaiting approval", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 3, title: "Approved POs", value: abbreviateNumber(approved), subtitle: "Ready for delivery", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 4, title: "Rejected POs", value: abbreviateNumber(rejected), subtitle: "Declined orders", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 5, title: "Total Value", value: abbreviateIndianCurrency(totalValue), subtitle: "Across all POs", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
  ]
}

export async function fetchAllPOs(projectId, {
  page = 1,
  limit = 10,
  search = "",
  status,
  vendorId,
  sortBy = "createdAt",
  order = "desc",
  lastId,
  signal = null,
} = {}) {
  if (!projectId) throw new Error("projectId is required")

  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  params.append("sortBy", sortBy)
  params.append("order", order)
  if (search?.trim()) params.append("search", search.trim())
  if (status) params.append("status", status)
  if (vendorId) params.append("vendorId", vendorId)
  if (lastId) params.append("lastId", lastId)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/po/${projectId}?${params.toString()}`,
      { headers: getPOHeaders(), signal }
    )

    const rawPOs = data.data?.pos || []
    const raw = data.data?.pagination || {}

    const total = raw.total ?? rawPOs.length
    const totalPages = raw.totalPages ?? 1
    const curPage = raw.page ?? page

    const hasNextPage = raw.hasNextPage ?? raw.hasNext ?? (curPage < totalPages)
    const nextCursor = raw.nextCursor ?? (hasNextPage ? String(curPage + 1) : null)

    return {
      pos: rawPOs.map(mapPO),
      pagination: {
        ...raw,
        total,
        page: curPage,
        totalPages,
        hasNextPage,
        nextCursor,
      },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function fetchSinglePO(projectId, poId, signal = null) {
  if (!projectId || !poId) throw new Error("projectId and poId are required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/po/${projectId}/${poId}`,
      { headers: getPOHeaders(), signal }
    )
    const raw = data.data?.po
    if (!raw) throw new Error("PO data missing in response")
    return mapPO(raw)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function createPO(projectId, payload, signal = null) {
  if (!projectId) throw new Error("projectId is required")
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/po/${projectId}`,
      payload,
      { headers: getPOHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function editPO(projectId, poId, payload, signal = null) {
  if (!projectId || !poId) throw new Error("projectId and poId are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/po/${projectId}/${poId}`,
      payload,
      { headers: getPOHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function submitPO(projectId, poId, updatedBy, signal = null) {
  if (!projectId || !poId || !updatedBy)
    throw new Error("projectId, poId and updatedBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/po/${projectId}/submit/${poId}`,
      { updatedBy },
      { headers: getPOHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function approvePO(projectId, poId, actionBy, signal = null) {
  if (!projectId || !poId || !actionBy)
    throw new Error("projectId, poId and actionBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/po/${projectId}/approve/${poId}`,
      { actionBy },
      { headers: getPOHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function rejectPO(projectId, poId, actionBy, rejectionRemarks = "", signal = null) {
  if (!projectId || !poId || !actionBy)
    throw new Error("projectId, poId and actionBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/po/${projectId}/reject/${poId}`,
      { actionBy, rejectionRemarks },
      { headers: getPOHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function cancelPO(projectId, poId, actionBy, cancellationRemarks = "", signal = null) {
  if (!projectId || !poId || !actionBy)
    throw new Error("projectId, poId and actionBy are required")
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/po/${projectId}/cancel/${poId}`,
      { actionBy, cancellationRemarks },
      { headers: getPOHeaders(), signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function deletePO(projectId, poId, deletedBy, signal = null) {
  if (!projectId || !poId || !deletedBy)
    throw new Error("projectId, poId and deletedBy are required")
  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/po/${projectId}/${poId}`,
      { headers: getPOHeaders(), data: { deletedBy }, signal }
    )
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function fetchMRsPendingForPO(projectId, { page = 1, limit = 20, search = "", signal = null } = {}) {
  if (!projectId) throw new Error("projectId is required")

  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/po/${projectId}/mr/pending?${params.toString()}`,
      { headers: getPOHeaders(), signal }
    )
    const raw = data.data?.mrs || []
    return raw.map((mr) => ({
      ...mr,
      items: (mr.items || []).map((item) => ({
        inventoryId: item.inventoryId || "",
        materialMasterId: item.materialMasterId || "",
        materialName: item.materialName || "",
        unit: item.unit || "Units",
        requiredQuantity: item.requiredQuantity ?? item.quantity ?? 1,
        hasPO: item.hasPO ?? false,
      })),
    }))
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function fetchPOItems(projectId, poId, signal = null) {
  if (!projectId || !poId) throw new Error("projectId and poId are required")
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/po/${projectId}/items/${poId}`,
      { headers: getPOHeaders(), signal }
    )
    return data.data || null
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatPOError(error))
  }
}

export async function fetchVendorsLookup(search = "", signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  params.append("limit", "100")
  params.append("page", "1")
  params.append("isActive", "true")
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/vendors?${params.toString()}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data.data?.vendors || []
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    console.error("[fetchVendorsLookup] failed:", error.message)
    return []
  }
}