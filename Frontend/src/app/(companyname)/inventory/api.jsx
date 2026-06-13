import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

import {
  Files,
  Building2,
  IndianRupee,
  Boxes,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Star,
  PackageCheck,
} from "lucide-react"

const BASE = getBaseUrl()

function getInventoryHeaders() {
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  return { ...getAuthHeaders(), "x-company-id": companyId }
}

export function formatInventoryError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}

export async function fetchInventorySummary(signal = null) {
  const { data } = await axios.get(`${BASE}/inventory/summary`, {
    headers: getInventoryHeaders(),
    signal,
  })
  return data.data?.summary ?? null
}

export async function fetchAllInventory(
  {
    page = 1,
    limit = 10,
    search = "",
    stockStatus,
    projectId,
    category,
    sortBy = "createdAt",
    order = "desc",
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
  if (stockStatus) params.append("stockStatus", stockStatus)
  if (projectId) params.append("projectId", projectId)
  if (category?.trim()) params.append("category", category.trim())
  if (lastId) params.append("lastId", lastId)

  const { data } = await axios.get(
    `${BASE}/inventory?${params.toString()}`,
    { headers: getInventoryHeaders(), signal }
  )

  return {
    inventory: data.data?.inventory ?? [],
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
      id: "total-items",
      value: fmt(summary.totalItems),
      label: "Total Items",
      sublabel: "Total inventory items across all projects.",
      icon: Files,
    },
    {
      id: "active-projects",
      value: fmt(summary.activeProjects),
      label: "Active Projects",
      sublabel: "Projects with inventory records.",
      icon: Building2,
    },
    {
      id: "stock-value",
      value: fmtCurrency(summary.totalStockValue),
      label: "Total Stock Value",
      sublabel: "Current value of all inventory.",
      icon: IndianRupee,
    },
    {
      id: "current-stock",
      value: fmtQty(summary.totalCurrentStock),
      label: "Current Stock",
      sublabel: "Total units currently in stock.",
      icon: Boxes,
    },
    {
      id: "total-received",
      value: fmtQty(summary.totalReceived),
      label: "Total Received",
      sublabel: "Cumulative quantity received.",
      icon: TrendingUp,
    },
    {
      id: "total-consumed",
      value: fmtQty(summary.totalConsumed),
      label: "Total Consumed",
      sublabel: "Cumulative quantity consumed.",
      icon: TrendingDown,
    },
    {
      id: "critical-items",
      value: fmt(summary.stockStatusBreakdown?.critical),
      label: "Critical Stock",
      sublabel: "Items with zero or negative stock.",
      icon: AlertTriangle,
    },
    {
      id: "low-items",
      value: fmt(summary.stockStatusBreakdown?.low),
      label: "Low Stock",
      sublabel: "Items at or below minimum level.",
      icon: AlertCircle,
    },
    {
      id: "good-items",
      value: fmt(summary.stockStatusBreakdown?.good),
      label: "Good Stock",
      sublabel: "Items within safe stock range.",
      icon: PackageCheck,
    },
    {
      id: "excellent-items",
      value: fmt(summary.stockStatusBreakdown?.excellent),
      label: "Excellent Stock",
      sublabel: "Items well above minimum level.",
      icon: Star,
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

function fmtCurrency(n) {
  if (n === null || n === undefined) return "—"
  if (n === 0) return "₹0"
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`
  if (n >= 1_000) return `₹${Number(n).toLocaleString("en-IN")}`
  return `₹${n}`
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
export function mapInventoryToRow(item) {
  return {
    id: item.inventoryId,
    name: normalizeString(item.name),
    category: normalizeString(item.category),
    project: normalizeString(item.projectName),
    unit: normalizeString(item.unit),
    currentstock:
      item.currentStock != null
        ? Number(item.currentStock).toLocaleString("en-IN")
        : NA,
    minimumlevel:
      item.minimumLevel != null
        ? Number(item.minimumLevel).toLocaleString("en-IN")
        : NA,
    priceperunit:
      item.pricePerUnit != null
        ? `₹${Number(item.pricePerUnit).toLocaleString("en-IN")}`
        : NA,
    stockvalue:
      item.stockValue != null
        ? `₹${Number(item.stockValue).toLocaleString("en-IN")}`
        : NA,
    stockstatus: item.stockStatus || NA,
    supplier: normalizeString(item.supplierName),
    totalreceived:
      item.totalReceived != null
        ? Number(item.totalReceived).toLocaleString("en-IN")
        : NA,
    totalconsumed:
      item.totalConsumed != null
        ? Number(item.totalConsumed).toLocaleString("en-IN")
        : NA,
    lastrestocked: fmtDate(item.lastRestockedAt),
    createdby: mapPerson(item.createdBy),
    createdat: fmtDate(item.createdAt),
    raw: item,
  }
}

export const TABLE_HEADERS = [
  "Name",
  "Category",
  "Project",
  "Unit",
  "Current Stock",
  "Minimum Level",
  "Price/Unit",
  "Stock Value",
  "Stock Status",
  "Supplier",
  "Total Received",
  "Total Consumed",
  "Last Restocked",
  "Created By",
  "Created At",
]

export const STOCK_STATUSES = ["Critical", "Low", "Good", "Excellent"]

export const SORT_FIELDS = [
  { label: "Created At", value: "createdAt" },
  { label: "Updated At", value: "updatedAt" },
  { label: "Name", value: "name" },
  { label: "Category", value: "category" },
  { label: "Current Stock", value: "currentStock" },
  { label: "Minimum Level", value: "minimumLevel" },
  { label: "Price Per Unit", value: "pricePerUnit" },
]

export const PAGE_META = {
  title: "Inventory",
  description:
    "Track and manage material inventory across all projects. Monitor stock levels, consumption, and supplier information.",
}

export const WORKSPACE_META = {
  title: "Inventory Workspace",
  description:
    "Select a project to manage inventory items. Monitor stock health, restocking needs, and consumption patterns.",
  searchPlaceholder: "Search items, category, supplier…",
}