// app/(company)/material-requisitions/api.js
import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const BASE = getBaseUrl()

function getMRHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatMRError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchMRSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/requisition/summary`, {
    headers: getMRHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}


export async function fetchAllMRs(
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    projectId,
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
    `${BASE}/requisition?${params.toString()}`,
    { headers: getMRHeaders(), signal }
  )

  return {
    mrs: data.data?.mrs ?? [],
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

import {
  Files,
  Clock4,
  FileCheck,
  ArrowRightLeft,
  FileX,
  Boxes,
  Building2,
  CalendarClock,
  FileText,
} from "lucide-react"

export function mapSummaryToStats(summary) {
  if (!summary) return []
  return [
    {
      id: "total-mrs",
      value: fmt(summary.totalMRs),
      label: "Total MRs",
      sublabel: "Total requisitions across all projects.",
      icon: Files,
    },
    {
      id: "draft-mrs",
      value: fmt(summary.draftMRs),
      label: "Draft MRs",
      sublabel: "Created but not submitted.",
      icon: FileText,
    },
    {
      id: "pending-mrs",
      value: fmt(summary.pendingMRs),
      label: "Pending MRs",
      sublabel: "Submitted and awaiting review.",
      icon: Clock4,
    },
    {
      id: "approved-mrs",
      value: fmt(summary.approvedMRs),
      label: "Approved MRs",
      sublabel: "Approved but not converted.",
      icon: FileCheck,
    },
    {
      id: "converted-po",
      value: fmt(summary.convertedToPO),
      label: "Converted to PO",
      sublabel: "MRs already fulfilled.",
      icon: ArrowRightLeft,
    },
    {
      id: "rejected-mrs",
      value: fmt(summary.rejectedMRs),
      label: "Rejected MRs",
      sublabel: "Total rejected requisitions.",
      icon: FileX,
    },
    {
      id: "total-qty",
      value: fmtQty(summary.totalRequestedQty),
      label: "Total Requested Qty",
      sublabel: "Global quantity count.",
      icon: Boxes,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects currently generating MRs.",
      icon: Building2,
    },
    {
      id: "delayed",
      value: fmt(summary.delayedRequests),
      label: "Delayed Requests",
      sublabel: "Needed-by date crossed.",
      icon: CalendarClock,
    },
    {
      id: "avg-approval",
      value: summary.avgApprovalTimeDays !== null
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

function normalizeProjectName(name) {
  if (!name || name === "Unknown Project") return NA
  return name
}

export function mapMRToRow(mr) {
  return {
    id: mr.mrId || mr.mrNumber,
    mrid: mr.mrNumber || NA,
    project: normalizeProjectName(mr.projectName),
    materials: Array.isArray(mr.materials) && mr.materials.length
      ? mr.materials.join(", ")
      : NA,
    totalitems: mr.totalItems != null ? String(mr.totalItems) : NA,
    totalquantity: mr.totalQuantity != null
      ? Number(mr.totalQuantity).toLocaleString("en-IN")
      : NA,
    status: mr.status || NA,
    neededby: fmtDate(mr.neededBy),
    postatus: mr.poStatus || NA,
    createdat: fmtDate(mr.createdAt),
    requestedby: mapPerson(mr.requestedBy),
    approvedby: mapPerson(mr.approvedBy) ?? null,
    raw: mr,
  }
}

export const TABLE_HEADERS = [
  "MR ID",
  "Project",
  "Materials",
  "Total Items",
  "Total Quantity",
  "Status",
  "Needed By",
  "Requested By",
  "Approved By",
  "PO Status",
  "Created At",
]

export const MR_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "ConvertedToPO",
]

export const PAGE_META = {
  title: "Material Requisitions",
  description:
    "Track and manage material requests across all projects — from draft to purchase order.",
}

export const WORKSPACE_META = {
  title: "Project Workspace",
  description:
    "Select a project to monitor material requisitions. Operations can only be performed inside individual project workspaces.",
  searchPlaceholder: "Search anything",
}