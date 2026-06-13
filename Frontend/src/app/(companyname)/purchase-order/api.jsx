import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"
import {
  Files,
  Clock4,
  FileCheck,
  ArrowRightLeft,
  FileX,
  Boxes,
  Building2,
  CalendarClock,
  Store,
} from "lucide-react"

const BASE = getBaseUrl()

function getPOHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatPOError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchPOSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/po/summary`, {
    headers: getPOHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllPOs(
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    projectId,
    vendorId,
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
  if (status) params.append("status", status)
  if (projectId) params.append("projectId", projectId)
  if (vendorId) params.append("vendorId", vendorId)
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

  const { data } = await axios.get(
    `${BASE}/po?${params.toString()}`,
    { headers: getPOHeaders(), signal }
  )

  return {
    pos: data.data?.pos ?? [],
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
      id: "total-pos",
      value: fmt(summary.totalPOs),
      label: "Total POs",
      sublabel: "Total purchase orders across all projects.",
      icon: Files,
    },
    {
      id: "pending-pos",
      value: fmt(summary.pendingPOs),
      label: "Pending POs",
      sublabel: "Submitted and awaiting review.",
      icon: Clock4,
    },
    {
      id: "approved-pos",
      value: fmt(summary.approvedPOs),
      label: "Approved POs",
      sublabel: "Approved but not yet fulfilled.",
      icon: FileCheck,
    },
    {
      id: "completed-pos",
      value: fmt(summary.completedPOs),
      label: "Completed POs",
      sublabel: "Fully received and closed.",
      icon: ArrowRightLeft,
    },
    {
      id: "rejected-pos",
      value: fmt(summary.rejectedPOs),
      label: "Rejected POs",
      sublabel: "Total rejected across all projects.",
      icon: FileX,
    },
    {
      id: "total-ordered-qty",
      value: fmtQty(summary.totalOrderedQty),
      label: "Total Ordered Qty",
      sublabel: "Global quantity count.",
      icon: Boxes,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects currently generating POs.",
      icon: Building2,
    },
    {
      id: "delayed-orders",
      value: fmt(summary.delayedOrders),
      label: "Delayed Orders",
      sublabel: "Delivery date crossed.",
      icon: CalendarClock,
    },
    {
      id: "total-vendors",
      value: fmt(summary.totalVendors),
      label: "Total Vendors",
      sublabel: "Unique vendors across all POs.",
      icon: Store,
    },
    {
      id: "avg-approval",
      value:
        summary.avgApprovalTimeDays !== null
          ? `${summary.avgApprovalTimeDays}d`
          : "—",
      label: "Avg Approval Time",
      sublabel: "From submit to approval.",
      icon: Clock4,
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
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(1)}k`
  return `Rs. ${Number(n).toLocaleString("en-IN")}`
}

const NA = "Not Available"

function fmtDate(raw) {
  if (!raw) return NA
  const d = new Date(raw)
  if (isNaN(d.getTime())) return NA
  return d.toLocaleDateString("en-GB", {
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

export function mapPOToRow(po) {
  return {
    id: po.poId || po.poNumber,
    poid: po.poNumber || NA,
    project: po.projectName && po.projectName !== "Unknown Project" ? po.projectName : NA,
    vendor: po.vendor?.name || NA,
    materials:
      Array.isArray(po.materials) && po.materials.length
        ? po.materials.join(", ")
        : NA,
    totalitems: po.totalItems != null ? String(po.totalItems) : NA,
    totalamount:
      po.totalOrderValue != null ? fmtCurrency(po.totalOrderValue) : NA,
    status: po.status || NA,
    deliveryby: fmtDate(po.expectedDeliveryDate),
    orderedby: mapPerson(po.requestedBy),
    approvedby: null,
    grnstatus: po.grnStatus || NA,
    createdat: fmtDate(po.createdAt),
    isDelayed: po.isDelayed ?? false,
    fulfilmentRate: po.fulfilmentRate ?? 0,
    raw: po,
  }
}

export const TABLE_HEADERS = [
  "PO ID",
  "Project",
  "Vendor",
  "Materials",
  "Total Items",
  "Total Amount",
  "Status",
  "Delivery By",
  "Ordered By",
  "GRN Status",
  "Created At",
]

export const PO_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "PartiallyDelivered",
  "Completed",
  "Cancelled",
]

export const PAGE_META = {
  title: "Purchase Orders",
  description:
    "Track and manage purchase orders across all projects — from draft to goods received.",
}

export const WORKSPACE_META = {
  title: "Project Workspace",
  description:
    "Select a project to monitor purchase orders. Operations can only be performed inside individual project workspaces.",
  searchPlaceholder: "Search anything",
}