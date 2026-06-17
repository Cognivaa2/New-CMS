import axios from "axios"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export function getCompanyId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("companyId") || ""
}

export function getCurrentUserKeycloakId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("keycloakId") || ""
}

export function formatToastError(error) {
  if (!error) return "An unexpected error occurred"
  if (typeof error === "string") return error

  return (
    error?.response?.data?.description ||
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.description ||
    error?.message ||
    "An unexpected error occurred"
  )
}

export function getToastErrorTitle(error, fallback = "Request Failed") {
  if (!error) return fallback
  if (typeof error === "string") return fallback

  return (
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    fallback
  )
}

export function formatDate(dateString) {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const IMPORT_MODULES = [
  {
    key: "roles",
    label: "Roles",
    description: "Import role definitions and permission sets",
    group: "Administration",
    templateHeaders: ["Role Name", "Description"],
  },
  {
    key: "users",
    label: "Users",
    description: "Bulk import team members and user accounts",
    group: "Administration",
    templateHeaders: ["Name", "Email", "Role Name", "Phone"],
  },
  {
    key: "materialMaster",
    label: "Material Master",
    description: "Import material catalogue with specs and units",
    group: "Inventory",
    templateHeaders: ["Material Name", "Unit", "Category", "Description"],
  },
  {
    key: "vendors",
    label: "Vendors",
    description: "Import vendor and supplier information",
    group: "Procurement",
    templateHeaders: [
      "Vendor Name", "Phone", "Email",
      "Vendor Type", "Contact Person", "Address", "Description",
      "GSTIN", "PAN", "Registration Number",
      "Bank Account Name", "Bank Account Number", "Bank Name",
      "IFSC Code", "Branch Name"
    ],
  },
  {
    key: "projects",
    label: "Projects",
    description: "Import project records with metadata",
    group: "Projects",
    templateHeaders: [
      "Project Name", "Location", "Budget", "Start Date", "End Date",
      "Project Code", "Description", "Client Name", "Status"
    ],
  },
  {
    key: "phases",
    label: "Phases",
    description: "Import project phases and sequences",
    group: "Projects",
    templateHeaders: [
      "Phase Name", "Project Name", "Sequence", "Start Date", "End Date", "Description"
    ],
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "Import tasks linked to project phases",
    group: "Projects",
    templateHeaders: [
      "Task Name", "Project Name", "Phase Name",
      "Start Date", "End Date", "Description",
      "Priority", "Status"
    ],
  },
  {
    key: "subtasks",
    label: "Sub Tasks",
    description: "Import subtasks linked to tasks",
    group: "Projects",
    templateHeaders: [
      "Subtask Title", "Project Name", "Phase Name", "Task Name",
      "Description", "Start Date", "End Date", "Status"
    ],
  },
  {
    key: "projectInventory",
    label: "Project Inventory",
    description: "Import inventory allocated to projects",
    group: "Inventory",
    templateHeaders: [
      "Project Name", "Material Name",
      "Current Stock", "Minimum Level", "Price Per Unit", "Supplier Name"
    ],
  },
  {
    key: "stockTransfers",
    label: "Stock Transfers",
    description: "Import stock transfer records between locations",
    group: "Inventory",
    templateHeaders: [
      "From Project", "To Project", "Material Name",
      "Quantity", "Reason", "Remarks", "Status"
    ],
  },
  {
    key: "materialRequisitions",
    label: "Material Requisitions",
    description: "Import material requisition requests",
    group: "Procurement",
    templateHeaders: [
      "Project Name", "Material Name", "Required Quantity",
      "Required By Date", "Phase Name", "Reason", "Remarks", "Status"
    ],
  },
  {
    key: "purchaseOrders",
    label: "Purchase Orders",
    description: "Import purchase orders and line items",
    group: "Procurement",
    templateHeaders: [
      "Project Name", "Vendor Name", "Material Name",
      "Ordered Quantity", "Unit Price", "GST Percent", "Discount Percent",
      "MR Number", "Expected Delivery Date",
      "Delivery Address", "Payment Terms", "Status"
    ],
  },
  {
    key: "grns",
    label: "GRNs",
    description: "Import goods received notes",
    group: "Procurement",
    templateHeaders: [
      "Project Name", "PO Number", "Material Name",
      "Received Quantity", "Delivery Date",
      "Vehicle Number", "Challan Number", "Challan Date", "Remarks"
    ],
  },
  {
    key: "workOrders",
    label: "Work Orders",
    description: "Import work orders for execution",
    group: "Operations",
    templateHeaders: [
      "Project Name", "Vendor Name", "Title", "Work Description",
      "Unit", "Quantity", "Unit Rate",
      "Description", "Start Date", "Expected End Date",
      "Payment Terms", "Work Location", "Status"
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    description: "Import project and operational expenses",
    group: "Finance",
    templateHeaders: [
      "Project Name", "Amount", "Expense Date", "Category",
      "Description", "Status", "Payment Mode",
      "Sub Type", "Reference Number"
    ],
  },
  {
    key: "payables",
    label: "Payables",
    description: "Import vendor payable records",
    group: "Finance",
    templateHeaders: [
      "Project Name", "Total Amount", "Vendor Name",
      "Source Type", "Source Number",
      "Status", "Paid Amount", "Due Date", "Notes"
    ],
  },
  {
    key: "issues",
    label: "Issues",
    description: "Import project issues and bug reports",
    group: "Operations",
    templateHeaders: [
      "Project Name", "Title", "Description",
      "Issue Type", "Priority", "Status", "Due Date", "Tags"
    ],
  },
]

export const MODULE_GROUPS = [
  "Administration",
  "Projects",
  "Inventory",
  "Procurement",
  "Operations",
  "Finance",
]
export async function uploadImport({ module, file }, signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const uploadedBy = getCurrentUserKeycloakId()
  const formData = new FormData()
  formData.append("file", file)
  formData.append("module", module)
  if (uploadedBy) formData.append("uploadedBy", uploadedBy)

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/import/upload`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
          "Content-Type": "multipart/form-data",
        },
        signal,
      }
    )

    if (data.statusCode !== 202 && !data.success) {
      throw new Error(data.description || data.message || "Failed to start import")
    }

    return data?.data || data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw error  
  }
}

export async function fetchImportStatus(jobId, signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/import/status/${jobId}`,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )

    return data?.data || data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch import status"
    )
  }
}

export async function fetchImportHistory({
  page = 1,
  limit = 20,
  module,
  status,
} = {}, signal = null) {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")

  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  if (module) params.append("module", module)
  if (status) params.append("status", status)

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/import/history?${params.toString()}`,
      {
        headers: {
          ...getAuthHeaders(),
          "x-company-id": companyId,
        },
        signal,
      }
    )

    const payload = data?.data || {}

    return {
      jobs: payload.jobs || [],
      pagination: payload.pagination || {
        total: 0,
        page,
        limit,
        totalPages: 1,
      },
    }
  } catch (error) {
    if (error.name === "CanceledError") throw error
    throw new Error(
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch import history"
    )
  }
}


// export function downloadTemplate(moduleKey) {
//   const mod = IMPORT_MODULES.find((m) => m.key === moduleKey)
//   if (!mod) return

//   const headers = mod.templateHeaders
//   const csvContent = [
//     headers.join(","),
//     headers.map(() => "").join(","), // empty example row
//   ].join("\n")

//   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
//   const url = URL.createObjectURL(blob)
//   const link = document.createElement("a")
//   link.href = url
//   link.download = `${moduleKey}_import_template.csv`
//   document.body.appendChild(link)
//   link.click()
//   document.body.removeChild(link)
//   URL.revokeObjectURL(url)
// }

export function downloadTemplate(moduleKey) {
  const mod = IMPORT_MODULES.find((m) => m.key === moduleKey)
  if (!mod) return

  const headers = mod.templateHeaders
  const exampleRow = headers.map((h) => {
    const examples = {
      "Role Name": "Project Manager",
      "Name": "John Doe",
      "Email": "john@example.com",
      "Phone": "+1234567890",
      "Project Name": "Office Tower A",
      "Location": "Downtown",
      "Budget": "5000000",
      "Start Date": "2024-01-01",
      "End Date": "2024-12-31",
      "Status": "planned",
      "Material Name": "Cement",
      "Unit": "Bags",
      "Quantity": "100",
      "Amount": "5000",
      "Description": "Sample description",
    }
    return examples[h] || ""
  })

  const csvContent = [
    headers.join(","),
    exampleRow.join(","),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${moduleKey}_import_template.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}