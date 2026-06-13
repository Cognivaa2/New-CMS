import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

import {
  Files,
  FileText,
  FileCheck,
  FileX,
  Boxes,
  Building2,
  CalendarClock,
  PackageCheck,
  Clock4,
  ArrowRightLeft,
} from "lucide-react"

const BASE = getBaseUrl()

function getSTHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatSTError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}
export async function fetchTransferSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/stocktransfer/summary`, {
    headers: getSTHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllTransfers(
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    projectId,
    fromProjectId,
    toProjectId,
    sortBy = "createdAt",
    order = "desc",
    dateFrom,
    dateTo,
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
  if (fromProjectId) params.append("fromProjectId", fromProjectId)
  if (toProjectId) params.append("toProjectId", toProjectId)

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

  const { data } = await axios.get(
    `${BASE}/stocktransfer/global?${params.toString()}`,
    { headers: getSTHeaders(), signal }
  )

  return {
    transfers: data.data?.transfers ?? [],
    pagination: data.data?.pagination ?? {
      total: 0,
      page,
      limit,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }
}
export function mapSummaryToStats(summary) {
  if (!summary) return []

  return [
    {
      id: "total-transfers",
      value: fmt(summary.totalTransfers),
      label: "Total Transfers",
      sublabel: "Total stock transfers across all projects.",
      icon: Files,
    },
    {
      id: "draft-transfers",
      value: fmt(summary.draftTransfers),
      label: "Draft Transfers",
      sublabel: "Created but not yet submitted.",
      icon: FileText,
    },
    {
      id: "approved-transfers",
      value: fmt(summary.approvedTransfers),
      label: "Approved Transfers",
      sublabel: "Verified and completed transfers.",
      icon: FileCheck,
    },
    {
      id: "rejected-transfers",
      value: fmt(summary.rejectedTransfers),
      label: "Rejected Transfers",
      sublabel: "Transfers that were rejected.",
      icon: FileX,
    },
    {
      id: "total-materials-moved",
      value: fmtQty(summary.totalMaterialsMoved),
      label: "Total Qty Moved",
      sublabel: "Quantity moved via approved transfers.",
      icon: Boxes,
    },
    {
      id: "total-item-lines",
      value: fmt(summary.totalItemLines),
      label: "Total Item Lines",
      sublabel: "Total line items across all transfers.",
      icon: PackageCheck,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects involved in transfers.",
      icon: Building2,
    },
    {
      id: "unique-materials",
      value: fmt(summary.uniqueMaterialsTransferred),
      label: "Unique Materials",
      sublabel: "Distinct materials transferred.",
      icon: ArrowRightLeft,
    },
    {
      id: "stale-drafts",
      value: fmt(summary.staleDraftTransfers),
      label: "Stale Drafts",
      sublabel: "Drafts older than 3 days.",
      icon: CalendarClock,
    },
    {
      id: "avg-approval",
      value: fmtDays(summary.avgApprovalTimeDays),
      label: "Avg Approval Time",
      sublabel: "Average time from creation to approval.",
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
  if (n >= 1_00_000) return `${(n / 1_000).toFixed(1)}k`
  if (n >= 1_000) return Number(n).toLocaleString("en-IN")
  return String(n)
}

function fmtDays(n) {
  if (n === null || n === undefined) return "—"
  if (n === 0) return "0d"
  return `${n}d`
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
  if (val === "Unknown Project") return fallback
  return val
}

function normalizeProject(proj) {
  if (!proj || typeof proj !== "object") return null
  return {
    id: proj.id || "",
    name: normalizeString(proj.name),
    code: proj.code || null,
  }
}

export function mapTransferToRow(t) {
  return {
    id: t.transferId,
    fromproject: normalizeProject(t.fromProject),
    toproject: normalizeProject(t.toProject),
    materials: Array.isArray(t.materials) && t.materials.length
      ? t.materials.join(", ")
      : NA,
    totalitems: t.totalItems != null ? String(t.totalItems) : NA,
    totalquantity:
      t.totalQuantity != null
        ? Number(t.totalQuantity).toLocaleString("en-IN")
        : NA,
    status: t.status || NA,
    reason: normalizeString(t.reason),
    remarks: normalizeString(t.remarks),
    rejectionremarks: normalizeString(t.rejectionRemarks),
    createdby: mapPerson(t.createdBy),
    approvedby: mapPerson(t.approvedBy) ?? null,
    rejectedby: mapPerson(t.rejectedBy) ?? null,
    createdat: fmtDate(t.createdAt),
    approvedat: fmtDate(t.approvedAt),
    rejectedat: fmtDate(t.rejectedAt),
    raw: t,
  }
}
export const TABLE_HEADERS = [
  "From Project",
  "To Project",
  "Materials",
  "Total Items",
  "Total Quantity",
  "Status",
  "Reason",
  "Created By",
  "Approved By",
  "Created At",
]

export const TRANSFER_STATUSES = ["Draft", "Approved", "Rejected"]

export const PAGE_META = {
  title: "Stock Transfers",
  description:
    "Track and manage material transfers between projects. Monitor transfer status, approvals, and material movement across your organization.",
}

export const WORKSPACE_META = {
  title: "Transfer Workspace",
  description:
    "Select a project to manage stock transfers. Track outgoing and incoming material movements from individual project workspaces.",
  searchPlaceholder: "Search materials…",
}