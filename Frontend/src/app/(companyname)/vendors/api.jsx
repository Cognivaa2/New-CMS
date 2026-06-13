// app/vendors/api.js
import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const BASE = getBaseUrl()

export function getVendorHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return {
    ...getAuthHeaders(),
    "x-company-id": companyId,
  }
}

export function formatVendorError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function getCurrentUserKeycloakId() {
  return localStorage.getItem("keycloakId") || ""
}

export function mapVendor(raw) {
  if (!raw) return null
  return {
    id: raw._id,
    name: raw.name || "",
    email: raw.email || "",
    phone: raw.phone || "",
    photo: raw.photo || null,
    vendorType: raw.vendorType || "",
    contactPerson: raw.contactPerson || "",
    website: raw.website || "",
    address: raw.address || "",
    description: raw.description || "",
    supplyCategories: Array.isArray(raw.supplyCategories) ? raw.supplyCategories : [],
    rating: raw.rating ?? null,
    notes: raw.notes || "",
    legalDetails: raw.legalDetails || {},
    bankDetails: raw.bankDetails || {},
    isActive: raw.isActive ?? true,
    isVerified: raw.isVerified ?? false,
    createdBy: raw.createdBy || null,
    updatedBy: raw.updatedBy || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  }
}

export async function fetchVendors({
  search = "",
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  sortOrder = "desc",
  vendorType = "",
  isActive,
  isVerified,
  signal = null,
} = {}) {
  try {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("sortOrder", sortOrder)
    if (search.trim()) params.append("search", search.trim())
    if (vendorType.trim()) params.append("vendorType", vendorType.trim())
    if (isActive !== undefined) params.append("isActive", String(isActive))
    if (isVerified !== undefined) params.append("isVerified", String(isVerified))

    const { data } = await axios.get(
      `${BASE}/vendors?${params.toString()}`,
      { headers: getVendorHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch vendors")
    }

    const vendors = data.data?.vendors || []
    const pagination = data.data?.pagination || {
      total: vendors.length,
      page,
      limit,
      totalPages: 1,
    }

    return {
      vendors: vendors.map(mapVendor),
      pagination,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function fetchVendorById(vendorId, signal = null) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")

    const { data } = await axios.get(
      `${BASE}/vendors/${vendorId}`,
      { headers: getVendorHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch vendor")
    }

    return mapVendor(data.data?.vendor)
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function addVendor(formData, signal = null) {
  try {
    const { data } = await axios.post(
      `${BASE}/vendors`,
      formData,
      {
        headers: {
          ...getVendorHeaders(),
          "Content-Type": "multipart/form-data",
        },
        signal,
      }
    )

    if (data.statusCode !== 201 && !data.data) {
      throw new Error(data.description || data.message || "Failed to create vendor")
    }

    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function editVendor(vendorId, formData, signal = null) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")

    const { data } = await axios.put(
      `${BASE}/vendors/${vendorId}`,
      formData,
      {
        headers: {
          ...getVendorHeaders(),
          "Content-Type": "multipart/form-data",
        },
        signal,
      }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to update vendor")
    }

    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function deleteVendor(vendorId, updatedBy = null, signal = null) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")
    const body = {}
    if (updatedBy) body.updatedBy = updatedBy
    const { data } = await axios.delete(
      `${BASE}/vendors/${vendorId}`,
      { headers: getVendorHeaders(), data: body, signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to delete vendor")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}


function normalizeLegalDetailsKeys(raw = {}) {
  if (!raw || typeof raw !== "object") return {}
  return {
    gstin: raw.gstin ?? raw.GSTIN ?? null,
    panNumber: raw.panNumber ?? raw.pan_number ?? raw.pan ?? raw.PAN ?? null,
    registrationNumber: raw.registrationNumber ?? raw.registration_number ?? raw.registrationNo ?? raw.regNo ?? raw.regNumber ?? null,
  }
}

function normalizeBankDetailsKeys(raw = {}) {
  if (!raw || typeof raw !== "object") return {}
  return {
    accountName: raw.accountName ?? raw.account_name ?? null,
    accountNumber: raw.accountNumber ?? raw.account_number ?? null,
    bankName: raw.bankName ?? raw.bank_name ?? null,
    ifscCode: raw.ifscCode ?? raw.ifsc_code ?? raw.ifsc ?? null,
    branchName: raw.branchName ?? raw.branch_name ?? null,
  }
}


export function buildVendorFormData(fields, photoFile = null) {
  const fd = new FormData()
  const scalars = [
    "name", "phone", "email", "vendorType", "contactPerson",
    "website", "address", "description", "notes", "rating",
    "isActive", "isVerified", "createdBy", "updatedBy",
  ]
  scalars.forEach((key) => {
    if (fields[key] !== undefined && fields[key] !== null) {
      fd.append(key, String(fields[key]))
    }
  })
  if (fields.supplyCategories !== undefined) {
    fd.append("supplyCategories", JSON.stringify(fields.supplyCategories))
  }
  if (fields.legalDetails !== undefined) {
    fd.append(
      "legalDetails",
      JSON.stringify(normalizeLegalDetailsKeys(fields.legalDetails))
    )
  }
  if (fields.bankDetails !== undefined) {
    fd.append(
      "bankDetails",
      JSON.stringify(normalizeBankDetailsKeys(fields.bankDetails))
    )
  }
  if (photoFile) {
    fd.append("photo", photoFile)
  }
  return fd
}


export async function fetchVendorHistory({
  vendorId,
  page = 1,
  limit = 10,
  module = "",
  status = "",
  sortOrder = "desc",
  signal = null,
} = {}) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")

    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortOrder", sortOrder)
    if (module) params.append("module", module)
    if (status) params.append("status", status)

    const { data } = await axios.get(
      `${BASE}/vendors/history/${vendorId}?${params.toString()}`,
      { headers: getVendorHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch vendor history")
    }

    return {
      vendor: data.data?.vendor || null,
      history: data.data?.history || [],
      summary: data.data?.summary || { totalPOs: 0, totalMRs: 0, total: 0 },
      pagination: data.data?.pagination || {
        total: 0, page, limit, totalPages: 1, hasNext: false, hasPrev: false,
      },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}


export async function fetchVendorAdvanceSummary(vendorId, signal = null) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")
    const { data } = await axios.get(
      `${BASE}/vendors/advance/${vendorId}`,
      { headers: getVendorHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch advance summary")
    }
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function fetchVendorAdvanceTransactions({
  vendorId,
  page = 1,
  limit = 20,
  txnType = "",
  dateFrom = "",
  dateTo = "",
  signal = null,
} = {}) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    if (txnType) params.append("txnType", txnType)
    if (dateFrom) params.append("dateFrom", dateFrom)
    if (dateTo) params.append("dateTo", dateTo)

    const { data } = await axios.get(
      `${BASE}/vendors/advance/transactions/${vendorId}?${params.toString()}`,
      { headers: getVendorHeaders(), signal }
    )
    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch transactions")
    }
    return {
      vendor: data.data?.vendor || null,
      transactions: data.data?.transactions || [],
      pagination: data.data?.pagination || {
        total: 0, page, limit, totalPages: 1, hasNext: false, hasPrev: false,
      },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function addVendorAdvanceApi(vendorId, formData, signal = null) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")
    const { data } = await axios.post(
      `${BASE}/vendors/advance/${vendorId}`,
      formData,
      {
        headers: {
          ...getVendorHeaders(),
          "Content-Type": "multipart/form-data",
        },
        signal,
      }
    )
    if (data.statusCode !== 201 && !data.data) {
      throw new Error(data.description || data.message || "Failed to add advance")
    }
    return data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}



export async function fetchVendorFullHistory({
  vendorId,
  page = 1,
  limit = 20,
  txnType = "",
  dateFrom = "",
  dateTo = "",
  signal = null,
} = {}) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required");
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (txnType) params.append("txnType", txnType);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    const { data } = await axios.get(
      `${BASE}/vendors/advance/history/${vendorId}?${params.toString()}`,
      { headers: getVendorHeaders(), signal }
    );
    if (data.statusCode !== 200 && !data.data)
      throw new Error(data.description || data.message || "Failed to fetch history");
    return {
      vendor: data.data?.vendor || null,
      summary: data.data?.summary || null,
      transactions: data.data?.transactions || [],
      pagination: data.data?.pagination || {
        total: 0, page, limit, totalPages: 1, hasNext: false, hasPrev: false,
      },
    };
  } catch (error) {
    if (error.name === "CanceledError") throw error;
    throw new Error(formatVendorError(error));
  }
}


export async function fetchVendorBills({
  vendorId,
  page = 1,
  limit = 10,
  status = "",
  sourceType = "",
  sortBy = "createdAt",
  order = "desc",
  signal = null,
} = {}) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("limit", String(limit))
    params.append("sortBy", sortBy)
    params.append("order", order)
    if (status) params.append("status", status)
    if (sourceType) params.append("sourceType", sourceType)

    const { data } = await axios.get(
      `${BASE}/vendors/bills/${vendorId}?${params.toString()}`,
      { headers: getVendorHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch bills")
    }

    return {
      vendor: data.data?.vendor || null,
      kpi: data.data?.kpi || {
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        totalGRNs: 0,
        totalWOs: 0,
        totalPOs: 0,
      },
      bills: data.data?.bills || [],
      pagination: data.data?.pagination || {
        total: 0, page, limit,
        totalPages: 1, hasNext: false, hasPrev: false,
      },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function fetchPayableById(projectId, payableId, signal = null) {
  try {
    if (!projectId || !payableId) throw new Error("Project ID and Payable ID are required")

    const { data } = await axios.get(
      `${BASE}/payables/${projectId}/${payableId}`,
      { headers: getVendorHeaders(), signal }
    )

    if (data.statusCode !== 200 && !data.data) {
      throw new Error(data.description || data.message || "Failed to fetch payable")
    }

    return {
      payable: data.data?.payable || null,
      transactions: data.data?.transactions || [],
      vendorAdvanceBalance: data.data?.vendorAdvanceBalance ?? null,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}

export async function fetchPayableDetailForVendor(vendorId, payableId, signal = null) {
  try {
    if (!vendorId) throw new Error("Vendor ID is required")
    if (!payableId) throw new Error("Payable ID is required")

    const listParams = new URLSearchParams()
    listParams.append("vendorId", vendorId)
    listParams.append("limit", "250")
    listParams.append("page", "1")

    const { data: listData } = await axios.get(
      `${BASE}/payables?${listParams.toString()}`,
      { headers: getVendorHeaders(), signal }
    )

    if (listData.statusCode !== 200 && !listData.data) {
      throw new Error(
        listData.description || listData.message || "Failed to resolve payable"
      )
    }

    const payables = listData.data?.payables || []
    const matched = payables.find(
      (p) => String(p.payableId) === String(payableId)
    )

    if (!matched) {
      throw new Error("Payable not found for this vendor")
    }

    const projectId = matched.projectId
    if (!projectId) {
      throw new Error("Project ID missing for this payable")
    }

    const { data: detailData } = await axios.get(
      `${BASE}/payables/${projectId}/${payableId}`,
      { headers: getVendorHeaders(), signal }
    )

    if (detailData.statusCode !== 200 && !detailData.data) {
      throw new Error(
        detailData.description ||
          detailData.message ||
          "Failed to fetch payable details"
      )
    }

    return {
      payable: detailData.data?.payable || null,
      transactions: detailData.data?.transactions || [],
      vendorAdvanceBalance: detailData.data?.vendorAdvanceBalance ?? null,
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(formatVendorError(error))
  }
}