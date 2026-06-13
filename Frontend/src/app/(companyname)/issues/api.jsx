import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

import {
  Files,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  Building2,
  CalendarClock,
  Clock4,
} from "lucide-react"

const BASE = getBaseUrl()

function getIssueHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatIssueError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchIssueSummary(signal = null) {
  const { data } = await axios.get(`${BASE}/issue/glabal/summary`, {
    headers: getIssueHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllIssues(
  {
    page = 1,
    limit = 10,
    search = "",
    status,
    priority,
    issueType,
    projectId,
    taskId,
    assignedTo,
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
  if (priority) params.append("priority", priority)
  if (issueType) params.append("issueType", issueType)
  if (projectId) params.append("projectId", projectId)
  if (taskId) params.append("taskId", taskId)
  if (assignedTo) params.append("assignedTo", assignedTo)

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
    `${BASE}/issue/global?${params.toString()}`,
    { headers: getIssueHeaders(), signal }
  )

  return {
    issues: data.data?.issues ?? [],
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
      id: "total-issues",
      value: fmt(summary.totalIssues),
      label: "Total Issues",
      sublabel: "Total issues across all projects.",
      icon: Files,
    },
    {
      id: "open-issues",
      value: fmt(summary.openIssues),
      label: "Open Issues",
      sublabel: "Submitted and awaiting resolution.",
      icon: AlertCircle,
    },
    {
      id: "resolved-issues",
      value: fmt(summary.resolvedIssues),
      label: "Resolved Issues",
      sublabel: "Issues that have been resolved.",
      icon: CheckCircle2,
    },
    {
      id: "rejected-issues",
      value: fmt(summary.rejectedIssues),
      label: "Rejected Issues",
      sublabel: "Issues that were rejected.",
      icon: XCircle,
    },
    {
      id: "critical-priority",
      value: fmt(summary.priority?.critical),
      label: "Critical",
      sublabel: "Issues with critical priority.",
      icon: AlertTriangle,
    },
    {
      id: "high-priority",
      value: fmt(summary.priority?.high),
      label: "High Priority",
      sublabel: "Issues with high priority.",
      icon: ArrowUp,
    },
    {
      id: "medium-priority",
      value: fmt(summary.priority?.medium),
      label: "Medium Priority",
      sublabel: "Issues with medium priority.",
      icon: Minus,
    },
    {
      id: "low-priority",
      value: fmt(summary.priority?.low),
      label: "Low Priority",
      sublabel: "Issues with low priority.",
      icon: ArrowDown,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects with reported issues.",
      icon: Building2,
    },
    {
      id: "overdue-issues",
      value: fmt(summary.overdueIssues),
      label: "Overdue Issues",
      sublabel: "Open issues past due date.",
      icon: CalendarClock,
    },
  ]
}


function fmt(n) {
  if (n === null || n === undefined) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
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

export function mapIssueToRow(issue) {
  const assignedToList = Array.isArray(issue.assignedTo)
    ? issue.assignedTo.map(mapPerson).filter(Boolean)
    : []

  return {
    id: issue.issueId,
    title: normalizeString(issue.title),
    issuetype: normalizeString(issue.issueType),
    priority: issue.priority || NA,
    status: issue.status || NA,
    project: normalizeString(issue.projectName),
    duedate: fmtDate(issue.dueDate),
    tags:
      Array.isArray(issue.tags) && issue.tags.length
        ? issue.tags.join(", ")
        : NA,
    attachments:
      Array.isArray(issue.attachments) ? issue.attachments.length : 0,
    createdby: mapPerson(issue.createdBy),
    assignedto: assignedToList,
    resolvedby: mapPerson(issue.resolvedBy) ?? null,
    resolvedat: fmtDate(issue.resolvedAt),
    rejectedby: mapPerson(issue.rejectedBy) ?? null,
    rejectedat: fmtDate(issue.rejectedAt),
    rejectionremark: normalizeString(issue.rejectionRemark),
    createdat: fmtDate(issue.createdAt),
    raw: issue,
  }
}
export const TABLE_HEADERS = [
  "Title",
  "Issue Type",
  "Priority",
  "Status",
  "Project",
  "Due Date",
  "Tags",
  "Created By",
  "Assigned To",
  "Created At",
]

export const ISSUE_STATUSES = ["submitted", "resolved", "rejected"]

export const ISSUE_PRIORITIES = ["critical", "high", "medium", "low"]

export const ISSUE_TYPES = ["safety", "quality", "design", "delay", "resource", "other"]

export const PAGE_META = {
  title: "Issues",
  description:
    "Track and manage issues across all projects. Monitor priorities, resolution times, and team accountability.",
}

export const WORKSPACE_META = {
  title: "Issue Workspace",
  description:
    "Select a project to manage issues. Track, resolve, and escalate issues from individual project workspaces.",
  searchPlaceholder: "Search issues, tags…",
}