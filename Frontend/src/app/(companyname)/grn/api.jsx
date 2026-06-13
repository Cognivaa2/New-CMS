import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

import {
  Files,
  Clock4,
  FileCheck,
  PackageCheck,
  Boxes,
  Building2,
  CalendarClock,
  Truck,
  ClipboardCheck,
  FileStack,
} from "lucide-react"

const BASE = getBaseUrl()

function getGRNHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatGRNError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchGRNSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/grn/summary`, {
    headers: getGRNHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllGRNs(
  {
    page = 1,
    limit = 10,
    search = "",
    projectId,
    vendorId,
    poId,
    mrId,
    sortBy = "createdAt",
    order = "desc",
    dateFrom,
    dateTo,
    lastId,
  } = {},
  signal = null
) {
  const params = new URLSearchParams()
  params.append("page", String(page))
  params.append("limit", String(limit))
  params.append("sortBy", sortBy)
  params.append("order", order)

  if (search?.trim()) params.append("search", search.trim())
  if (projectId) params.append("projectId", projectId)
  if (vendorId) params.append("vendorId", vendorId)
  if (poId) params.append("poId", poId)
  if (mrId) params.append("mrId", mrId)

  if (dateFrom)
    params.append(
      "dateFrom",
      dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom
    )
  if (dateTo)
    params.append(
      "dateTo",
      dateTo instanceof Date ? dateTo.toISOString() : dateTo
    )
  if (lastId) params.append("lastId", lastId)

  const { data } = await axios.get(`${BASE}/grn?${params.toString()}`, {
    headers: getGRNHeaders(),
    signal,
  })

  return {
    grns: data.data?.grns ?? [],
    pagination: data.data?.pagination ?? {
      total: 0,
      page,
      limit,
      totalPages: 1,
      hasNextPage: false,
      nextCursor: null,
    },
  }
}


export function mapSummaryToStats(summary) {
  if (!summary) return []

  return [
    {
      id: "total-grns",
      value: fmt(summary.totalGRNs),
      label: "Total GRNs",
      sublabel: "Total goods received notes across all projects.",
      icon: Files,
    },
    {
      id: "grns-today",
      value: fmt(summary.grnsToday),
      label: "Today's GRNs",
      sublabel: "Goods received today.",
      icon: Clock4,
    },
    {
      id: "grns-this-month",
      value: fmt(summary.grnsThisMonth),
      label: "This Month",
      sublabel: "GRNs received in the current month.",
      icon: CalendarClock,
    },
    {
      id: "total-qty-received",
      value: fmtQty(summary.totalReceivedQuantity),
      label: "Total Qty Received",
      sublabel: "Global received quantity count.",
      icon: Boxes,
    },
    {
      id: "total-amount",
      value: fmtCurrency(summary.totalReceivedAmount),
      label: "Total Amount",
      sublabel: "Total value of received goods.",
      icon: ClipboardCheck,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects with GRN activity.",
      icon: Building2,
    },
    {
      id: "active-vendors",
      value: fmt(summary.activeVendors),
      label: "Active Vendors",
      sublabel: "Vendors with recent deliveries.",
      icon: Truck,
    },
    {
      id: "linked-pos",
      value: fmt(summary.linkedPOs),
      label: "Linked POs",
      sublabel: "Purchase orders with GRNs.",
      icon: FileCheck,
    },
    {
      id: "linked-mrs",
      value: fmt(summary.linkedMRs),
      label: "Linked MRs",
      sublabel: "Material requisitions fulfilled.",
      icon: PackageCheck,
    },
    {
      id: "avg-items",
      value:
        summary.avgItemsPerGRN != null
          ? `${summary.avgItemsPerGRN}`
          : "—",
      label: "Avg Items/GRN",
      sublabel: "Average line items per receipt.",
      icon: FileStack,
    },
  ]
}

function fmt(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtQty(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCurrency(n) {
  if (n === null || n === undefined) return "—"
  if (n === 0) return "₹0"
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`
  return `₹${n.toLocaleString("en-IN")}`
}

const NA = "Not Available"

function fmtDate(raw) {
  if (!raw) return NA
  const d = new Date(raw)
  if (isNaN(d.getTime())) return NA
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function mapPerson(user) {
  if (!user || typeof user !== "object") return null
  return {
    id: user.id || "",
    keycloakId: user.keycloakId || "",
    name: user.name || "Unknown",
    email: user.email || "",
    avatar: user.avatar || null,
    role: user.role || "",
  }
}

function normalizeString(val, fallback = NA) {
  if (!val || (typeof val === "string" && val.trim() === "")) return fallback
  if (val === "Unknown Project" || val === "Unknown Vendor") return fallback
  return val
}

export function mapGRNToRow(grn) {
  return {
    id: grn.grnId || grn.grnNumber,
    grnid: normalizeString(grn.grnNumber),
    project: normalizeString(grn.projectName),
    ponumber: normalizeString(grn.poNumber),
    mrnumber: normalizeString(grn.mrNumber),
    vendor: normalizeString(grn.vendorName),
    totalitems: grn.totalItems != null ? String(grn.totalItems) : NA,
    totalquantity:
      grn.totalQuantity != null
        ? Number(grn.totalQuantity).toLocaleString("en-IN")
        : NA,
    totalamount:
      grn.totalAmount != null
        ? `₹${Number(grn.totalAmount).toLocaleString("en-IN")}`
        : NA,
    deliverydate: fmtDate(grn.deliveryDate),
    challannumber: normalizeString(grn.deliveryChallanNumber),
    requestedby: mapPerson(grn.requestedBy),
    remarks: normalizeString(grn.remarks),
    createdat: fmtDate(grn.createdAt),
    raw: grn,
  }
}


export const TABLE_HEADERS = [
  "GRN ID",
  "Project",
  "PO Number",
  "MR Number",
  "Vendor",
  "Total Items",
  "Total Quantity",
  "Total Amount",
  "Delivery Date",
  "Challan Number",
  "Requested By",
  "Created At",
]

export const PAGE_META = {
  title: "Goods Received Notes",
  description:
    "Track and manage all goods received against purchase orders. Monitor deliveries, verify quantities, and manage inventory updates across projects.",
}

export const WORKSPACE_META = {
  title: "GRN Workspace",
  description:
    "Select a project to manage goods received notes. Track deliveries, verify quantities, and update inventory from individual project workspaces.",
  searchPlaceholder: "Search GRN, PO, vendor…",
}