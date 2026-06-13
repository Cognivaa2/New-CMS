import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"
import {
  Files,
  Clock4,
  FileCheck,
  Hammer,
  FileX,
  HardHat,
  Building2,
  CalendarClock,
  Flag,
  Target,
} from "lucide-react"

const BASE = getBaseUrl()

function getWOHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatWOError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchWOSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/wo/summary`, {
    headers: getWOHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllWOs(
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    projectId,
    vendorId,
    sortBy = "createdAt",
    order = "desc",
    dateFrom,
    dateTo,
    lastId,
    overdueOnly,
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
  if (overdueOnly) params.append("overdueOnly", overdueOnly)
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
    `${BASE}/wo?${params.toString()}`,
    { headers: getWOHeaders(), signal }
  )

  return {
    wos: data.data?.wos ?? [],
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
      id: "total-wos",
      value: fmt(summary.totalWOs),
      label: "Total Work Orders",
      sublabel: "All work orders across projects.",
      icon: Files,
    },
    {
      id: "submitted-wos",
      value: fmt(summary.submittedWOs),
      label: "Submitted",
      sublabel: "Awaiting approval.",
      icon: Clock4,
    },
    {
      id: "approved-wos",
      value: fmt(summary.approvedWOs),
      label: "Approved",
      sublabel: "Approved and ready to start.",
      icon: FileCheck,
    },
    {
      id: "inprogress-wos",
      value: fmt(summary.inProgressWOs),
      label: "In Progress",
      sublabel: "Currently being executed on site.",
      icon: Hammer,
    },
    {
      id: "completed-wos",
      value: fmt(summary.completedWOs),
      label: "Completed",
      sublabel: "Finished and signed off.",
      icon: Flag,
    },
    {
      id: "rejected-wos",
      value: fmt(summary.rejectedWOs),
      label: "Rejected",
      sublabel: "Declined by approving authority.",
      icon: FileX,
    },
    {
      id: "active-vendors",
      value: fmt(summary.activeVendors),
      label: "Active Vendors",
      sublabel: "Vendors with assigned work.",
      icon: HardHat,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects with ongoing work orders.",
      icon: Building2,
    },
    {
      id: "overdue-wos",
      value: fmt(summary.overdueWOs),
      label: "Overdue",
      sublabel: "Past expected completion date.",
      icon: CalendarClock,
    },
    {
      id: "avg-completion",
      value:
        summary.avgCompletionPercent !== null
          ? `${summary.avgCompletionPercent}%`
          : "—",
      label: "Avg Completion",
      sublabel: "Average progress of active WOs.",
      icon: Target,
    },
  ]
}

function fmt(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCurrency(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 10_000_000) return `Rs. ${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `Rs. ${(n / 100_000).toFixed(1)}L`
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

export function mapWOToRow(wo) {
  return {
    id: wo.woId,
    woid: wo.woNumber || NA,
    title: wo.title || NA,
    project:
      wo.projectName && wo.projectName !== "Unknown Project"
        ? wo.projectName
        : NA,
    vendor: wo.vendorName || NA,
    totalitems: wo.totalItems != null ? String(wo.totalItems) : NA,
    contractvalue:
      wo.totalContractValue != null ? fmtCurrency(wo.totalContractValue) : NA,
    status: wo.status || NA,
    completion:
      wo.completionPercent != null ? `${wo.completionPercent}%` : NA,
    startdate: fmtDate(wo.startDate),
    expectedenddate: fmtDate(wo.expectedEndDate),
    actualenddate: fmtDate(wo.actualEndDate),
    hasmilestones: wo.hasMilestones ?? false,
    isoverdue: wo.isOverdue ?? false,
    createdby: mapPerson(wo.createdBy),
    approvedby: mapPerson(wo.approvedBy),
    createdat: fmtDate(wo.createdAt),
    raw: wo,
  }
}


export const TABLE_HEADERS = [
  "WO ID",
  "Title",
  "Project",
  "Vendor",
  "Total Items",
  "Contract Value",
  "Status",
  "Completion",
  "Start Date",
  "Expected End Date",
  "Created By",
  "Approved By",
  "Created At",
]

export const WO_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "InProgress",
  "Completed",
  "Cancelled",
]

export const PAGE_META = {
  title: "Work Orders",
  description:
    "Manage and track all work orders across projects. Monitor contractor progress, completion status, and budget utilization.",
}

export const WORKSPACE_META = {
  title: "Work Order Workspace",
  description:
    "Select a project to manage work orders. Assign tasks to contractors, track progress, and approve completed work from individual project workspaces.",
  searchPlaceholder: "Search anything",
}