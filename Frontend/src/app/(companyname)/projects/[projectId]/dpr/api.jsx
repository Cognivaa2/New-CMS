"use client";

import axios from "axios";
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper";

const API_BASE_URL = getBaseUrl();

export function formatDprError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong";
  return typeof desc === "string" ? desc : "Something went wrong";
}

function getDprHeaders() {
  const companyId = getCompanyId();
  if (!companyId) throw new Error("Company ID is required");
  return { ...getAuthHeaders(), "x-company-id": companyId };
}

function formatEventTime(eventAt) {
  if (!eventAt) return null;
  const d = new Date(eventAt);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function orNull(value) {
  if (value === undefined || value === null || value === "" || value === "—") return null;
  return value;
}

function summarizeMaterials(materials = []) {
  if (!Array.isArray(materials) || materials.length === 0) return null;
  const names = materials
    .map((m) => m.materialName || m.name || "")
    .filter(Boolean);
  if (names.length === 0) return `${materials.length} item(s)`;
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")}, +${names.length - 2} more`;
}

function deriveStatus(ev, details = {}) {
  if (details.status) return details.status;
  switch (ev.action) {
    case "MRCreated":
    case "POCreated":
    case "WOCreated":
      return "Draft";
    case "MRSubmitted":
    case "POSubmitted":
    case "WOSubmitted":
      return "Submitted";
    case "MRApproved":
    case "POApproved":
    case "WOApproved":
    case "ExpenseApproved":
      return "Approved";
    case "MRRejected":
    case "PORejected":
    case "WORejected":
    case "ExpenseRejected":
      return "Rejected";
    case "MRConvertedToPO":
      return "Converted";
    case "POPartiallyDelivered":
      return "Partially Delivered";
    case "POCompleted":
    case "WOCompleted":
      return "Completed";
    case "POCancelled":
    case "WOCancelled":
      return "Cancelled";
    case "GRNCreated":
      return "Received";
    case "WOInProgress":
      return "In Progress";
    case "ExpenseCreated":
      return "Recorded";
    case "ExpenseReversed":
      return "Reversed";
    default:
      return null;
  }
}

export function mapEventToRow(ev) {
  if (!ev) return null;
  const details = ev.details || {};
  const materialSummary = summarizeMaterials(details.materials);

  const fromProjectName =
    orNull(details.fromProjectName) ||
    orNull(details.counterpartProjectName);
  const toProjectName =
    orNull(details.toProjectName) ||
    orNull(details.counterpartProjectName);

  const workOrderDisplay =
    orNull(details.workOrderNumber) ||
    (details.isWOConsumption ? "Linked (no ref)" : null);

  const grnQtySummary = (() => {
    if (Array.isArray(details.materials) && details.materials.length > 0) {
      const parts = details.materials.map(
        (m) => `${m.receivedQuantity ?? m.quantity ?? "?"} ${m.unit ?? ""} ${m.materialName ?? ""}`.trim()
      );
      if (parts.length === 1) return parts[0];
      return `${parts.length} items (${details.totalReceivedQuantity ?? "?"} total)`;
    }
    if (details.totalReceivedQuantity != null) {
      return `${details.totalReceivedQuantity}`;
    }
    return null;
  })();

  return {
    id: ev.eventId || ev._id || Math.random().toString(36).slice(2),
    time: orNull(formatEventTime(ev.eventAt)),
    eventAt: ev.eventAt,
    module: ev.module,
    action: ev.action,

    refNumber: orNull(ev.refNumber),
    description: orNull(ev.description),
    actorName: orNull(ev.actorName) ?? "System",

    taskName:
      orNull(details.taskName) ||
      orNull(details.title) ||
      orNull(details.subTaskTitle) ||
      orNull(ev.description),

    title:
      orNull(details.subTaskTitle) ||
      orNull(details.title) ||
      orNull(details.taskName) ||
      orNull(ev.description),

    parentTask: orNull(details.parentTaskName) || orNull(details.taskName),
    status: deriveStatus(ev, details) || null,
    completion: details.completionPercent ?? details.progressPercent ?? 0,
    previousCompletion: details.previousPercent ?? null,
    startDate: formatDisplayDate(details.startDate),
    endDate: formatDisplayDate(details.endDate || details.expectedEndDate),
    priority: orNull(details.priority),
    assignedUsers: details.assignedTo
      ? { name: details.assignedTo, role: details.assignedRole || "Member", img: null }
      : null,
    workOrderLinked: details.linkedWO
      ? { name: details.linkedWO, role: "Work Order", img: null }
      : null,
    doneBy: orNull(ev.actorName) ?? "System",

    material:
      orNull(details.materialName) ||
      orNull(details.itemName) ||
      materialSummary,
    quantity:
      details.quantityConsumed ??
      details.quantity ??
      details.receivedQuantity ??
      details.orderedQuantity ??
      null,
    unit: orNull(details.unit),
    totalCost:
      details.totalCost ??
      details.totalOrderValue ??
      details.totalAmount ??
      details.totalContractValue ??
      details.amount ??
      null,
    source:
      orNull(details.source) ||
      orNull(details.warehouseName),

    workOrderNumber: workOrderDisplay,

    fromLocation: fromProjectName || orNull(details.fromWarehouse) || orNull(details.from),
    toLocation: toProjectName || orNull(details.toWarehouse) || orNull(details.to),
    transferType: orNull(details.transferType),
    itemCount: details.itemCount ?? null,
    materialsSummary: materialSummary,
    quantitySummary: Array.isArray(details.materials)
      ? details.materials
        .map((m) => `${m.quantity ?? 0} ${m.unit ?? ""}`.trim())
        .join(", ")
      : null,

    documentNumber:
      orNull(ev.refNumber) ||
      orNull(details.mrNumber) ||
      orNull(details.poNumber) ||
      orNull(details.grnNumber) ||
      orNull(details.woNumber),

    vendor: orNull(details.vendorName),

    amount:
      details.totalOrderValue ??
      details.totalAmount ??
      details.totalContractValue ??
      details.amount ??
      details.totalCost ??
      null,

    itemSummary:
      orNull(details.itemsSummary) ||
      orNull(details.itemSummary) ||
      (Array.isArray(details.materials) && details.materials.length > 0
        ? materialSummary
        : null) ||
      (details.itemCount != null ? `${details.itemCount} item(s)` : null) ||
      orNull(details.materialName),

    grnQtySummary,
    grnAmount: details.totalAmount ?? details.totalOrderValue ?? null,

    expenseCategory: orNull(details.category),
    expenseAmount: details.amount ?? null,
  };
}

export function mapDprSummary(summary = {}) {
  return [
    {
      id: 1,
      value: `${summary.overallProgressPercent ?? 0}%`,
      label: "Overall Progress",
      subLabel: "Cumulative",
      icon: "trend",
      colorClass: "bg-[#f3f6ff] dark:bg-[#1a1c2e]",
    },
    {
      id: 2,
      value: `${summary.totalSubTasks ?? 0}`,
      label: "Total Sub Tasks",
      subLabel: "Logged today",
      icon: "tasks",
      colorClass: "bg-[#eff8ff] dark:bg-[#162335]",
    },
    {
      id: 3,
      value: `${summary.totalConsumptionEntries ?? 0}`,
      label: "Consumptions",
      subLabel: "Material entries",
      icon: "box",
      colorClass: "bg-[#f5f3ff] dark:bg-[#201b35]",
    },
    {
      id: 4,
      value: `₹${(summary.totalMaterialCost ?? 0).toLocaleString("en-IN")}`,
      label: "Material Cost",
      subLabel: "Today's spend",
      icon: "currency",
      colorClass: "bg-[#ebf5ff] dark:bg-[#1a2335]",
    },
    {
      id: 5,
      value: `${summary.totalEvents ?? 0}`,
      label: "Total Events",
      subLabel: "Activity count",
      icon: "log",
      colorClass: "bg-[#f2f3f9] dark:bg-[#27272a]",
    },
  ];
}

export const TAB_TO_MODULE = {
  Tasks: "Task",
  "Sub Tasks": "SubTask",
  Progress: "SubTask",
  Consumptions: "MaterialConsumption",
  Transfers: "StockTransfer",
  MRs: "MaterialRequisition",
  POs: "PurchaseOrder",
  GRNs: "GRN",
  WOs: "WorkOrder",
  Expenses: "Expense",
};

const PROGRESS_ACTIONS = new Set(["ProgressUpdated"]);
const SUBTASK_NON_PROGRESS_ACTIONS = new Set([
  "SubTaskCreated",
  "SubTaskUpdated",
  "SubTaskDeleted",
]);

export async function fetchDprSummary(projectId, dateStr, signal = null) {
  if (!projectId) throw new Error("projectId is required");
  try {
    const params = new URLSearchParams();
    if (dateStr) params.append("date", dateStr);

    const { data } = await axios.get(
      `${API_BASE_URL}/dpr/summary/${projectId}?${params.toString()}`,
      { headers: getDprHeaders(), signal }
    );

    const payload = data.data || {};
    return {
      exists: payload.exists ?? false,
      reportDate: payload.reportDate,
      summary: mapDprSummary(payload.summary || {}),
      rawSummary: payload.summary || {},
    };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error;
    throw new Error(formatDprError(error));
  }
}

export async function fetchDprEvents(
  projectId,
  { dateStr, module = "all", page = 1, limit = 20, signal = null, tab = null } = {}
) {
  if (!projectId) throw new Error("projectId is required");
  try {
    const params = new URLSearchParams();
    if (dateStr) params.append("date", dateStr);
    if (module && module !== "all") params.append("module", module);
    params.append("page", String(page));
    params.append("limit", String(limit));

    const { data } = await axios.get(
      `${API_BASE_URL}/dpr/${projectId}?${params.toString()}`,
      { headers: getDprHeaders(), signal }
    );

    const payload = data.data || {};
    let rawEvents = payload.events || [];
    if (tab === "Progress") {
      rawEvents = rawEvents.filter((ev) => PROGRESS_ACTIONS.has(ev.action));
    } else if (tab === "Sub Tasks") {
      rawEvents = rawEvents.filter((ev) => !PROGRESS_ACTIONS.has(ev.action));
    }

    const mappedRows = rawEvents.map(mapEventToRow).filter(Boolean);

    const filteredTotal = tab === "Progress" || tab === "Sub Tasks"
      ? mappedRows.length
      : payload.pagination?.total ?? mappedRows.length;

    return {
      exists: payload.exists ?? false,
      projectName: payload.projectName || "",
      projectCode: payload.projectCode || "",
      reportDate: payload.reportDate,
      summary: mapDprSummary(payload.summary || {}),
      rawSummary: payload.summary || {},
      activeModule: payload.activeModule || "all",
      availableModules: payload.availableModules || [],
      rows: mappedRows,
      pagination: {
        ...(payload.pagination || {}),
        total: filteredTotal,
        totalPages: Math.max(Math.ceil(filteredTotal / limit), 1),
        hasNext: false,
        hasPrev: (payload.pagination?.page ?? 1) > 1,
        page,
        limit,
      },
    };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error;
    throw new Error(formatDprError(error));
  }
}

export async function fetchDprHistory(
  projectId,
  { startDate, endDate, page = 1, limit = 30, signal = null } = {}
) {
  if (!projectId) throw new Error("projectId is required");
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", String(page));
    params.append("limit", String(limit));

    const { data } = await axios.get(
      `${API_BASE_URL}/dpr/history/${projectId}?${params.toString()}`,
      { headers: getDprHeaders(), signal }
    );

    const payload = data.data || {};
    return {
      projectName: payload.projectName || "",
      projectCode: payload.projectCode || "",
      dprs: payload.dprs || [],
      pagination: payload.pagination || {},
    };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error;
    throw new Error(formatDprError(error));
  }
}

export async function exportDprExcel(projectId, dateStr, projectName, signal = null) {
  if (!projectId) throw new Error("projectId is required");
  try {
    const params = new URLSearchParams();
    if (dateStr) params.append("date", dateStr);

    const response = await axios.get(
      `${API_BASE_URL}/dpr/export/${projectId}?${params.toString()}`,
      {
        headers: getDprHeaders(),
        responseType: "blob",
        signal,
      }
    );

    const disposition = response.headers["content-disposition"];
    let filename = `DPR_${projectName || "Report"}_${dateStr || "today"}.xlsx`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) filename = match[1].replace(/['"]/g, "").trim();
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    return { success: true, filename };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error;
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.description || json.message || "Failed to export");
      } catch {
        throw new Error(formatDprError(error));
      }
    }
    throw new Error(formatDprError(error));
  }
}