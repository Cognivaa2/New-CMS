"use client";

import axios from "axios";
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper";

const API_BASE_URL = getBaseUrl();

export const RECONCILIATION_TABS = ["Material", "Inventory", "Purchase", "Financial"];

export const TAB_ENDPOINT = {
  Material: "material",
  Inventory: "inventory",
  Purchase: "purchase",
  Financial: "financial",
};

export const TAB_COLUMNS = {
  Material: [
    { label: "Material Name", accessor: "materialName", type: "title" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Project", accessor: "projectName", type: "text" },
    { label: "Unit", accessor: "unit", type: "text" },
    { label: "Required Qty", accessor: "requiredQty", type: "text" },
    { label: "Ordered Qty", accessor: "orderedQty", type: "text" },
    { label: "Received Qty", accessor: "receivedQty", type: "text" },
    { label: "Issued Qty", accessor: "issuedQty", type: "text" },
    { label: "Current Stock", accessor: "currentStock", type: "text" },
    { label: "Shortage Qty", accessor: "shortageQty", type: "shortage" },
    { label: "Discrepancy", accessor: "discrepancyFlags", type: "flags" },
    { label: "Status", accessor: "reconciliationStatus", type: "status" },
  ],
  Inventory: [
    { label: "Material Name", accessor: "materialName", type: "title" },
    { label: "Category", accessor: "category", type: "text" },
    { label: "Project", accessor: "projectName", type: "text" },
    { label: "Unit", accessor: "unit", type: "text" },
    { label: "Price / Unit", accessor: "pricePerUnit", type: "currency" },
    { label: "Total Received", accessor: "totalReceived", type: "text" },
    { label: "Total Consumed", accessor: "totalConsumed", type: "text" },
    { label: "Current Stock", accessor: "currentStock", type: "text" },
    { label: "Expected Stock", accessor: "expectedClosingStock", type: "text" },
    { label: "Variance Qty", accessor: "varianceQuantity", type: "variance" },
    { label: "Inventory Value", accessor: "inventoryValue", type: "currency" },
    { label: "Last Restocked", accessor: "lastRestockedAt", type: "date" },
    { label: "Status", accessor: "reconciliationStatus", type: "status" },
  ],
  Purchase: [
    { label: "PO Number", accessor: "poNumber", type: "title" },
    { label: "Vendor", accessor: "vendorName", type: "text" },
    { label: "Project", accessor: "projectName", type: "text" },
    { label: "PO Status", accessor: "poStatus", type: "postatus" },
    { label: "Ordered", accessor: "orderedValue", type: "currency" },
    { label: "Received", accessor: "receivedValue", type: "currency" },
    { label: "Billed", accessor: "billedValue", type: "currency" },
    { label: "Net Billed", accessor: "netBilledAmount", type: "currency" },
    { label: "Paid", accessor: "paidValue", type: "currency" },
    { label: "Advance", accessor: "advanceDeducted", type: "currency" },
    { label: "Outstanding", accessor: "outstandingAmount", type: "currency" },
    // { label: "Variance %", accessor: "variancePercentage", type: "variancepct" },
    { label: "GRN / INVOICE", accessor: "grnCount", type: "counts" },
    { label: "Discrepancy", accessor: "discrepancyFlags", type: "flags" },
    { label: "Approved On", accessor: "approvedAt", type: "date" },
    { label: "Status", accessor: "matchStatus", type: "status" },
  ],
  Financial: [
    { label: "Vendor Name", accessor: "vendorName", type: "title" },
    { label: "PO Count", accessor: "poCount", type: "text" },
    { label: "Advance Balance", accessor: "advanceBalance", type: "currency" },
    { label: "Committed Amount", accessor: "committedAmount", type: "currency" },
    { label: "Billed Amount", accessor: "billedAmount", type: "currency" },
    { label: "Contra Adjustment", accessor: "contraAdjustment", type: "currency" },
    { label: "Net Billed Amount", accessor: "netBilledAmount", type: "currency" },
    { label: "Paid Amount", accessor: "paidAmount", type: "currency" },
    { label: "Advance Deducted", accessor: "advanceDeducted", type: "currency" },
    { label: "Outstanding Amount", accessor: "outstandingAmount", type: "currency" },
    { label: "Net Payable", accessor: "netPayable", type: "currency" },
    { label: "Variance %", accessor: "variancePercentage", type: "variancepct" },
    { label: "Status", accessor: "reconciliationStatus", type: "status" },
  ],
};

export function formatReconciliationError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong";
  return typeof desc === "string" ? desc : "Something went wrong";
}
function getReconciliationHeaders() {
  const companyId = getCompanyId();
  if (!companyId) throw new Error("Company ID is required");
  return { ...getAuthHeaders(), "x-company-id": companyId };
}

function mapMaterialSummary(summary = {}) {
  return [
    {
      id: 1,
      value: `${summary.totalMaterials ?? 0}`,
      label: "Total Materials",
      subLabel: "Tracked items",
      icon: "materials",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 2,
      value: `${summary.matchedCount ?? 0}`,
      label: "Matched",
      subLabel: "Fully reconciled",
      icon: "matched",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 3,
      value: `${summary.reconciledCount ?? 0}`,
      label: "Reconciled",
      subLabel: "Within tolerance",
      icon: "matched",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 4,
      value: `${summary.shortageCount ?? 0}`,
      label: "Partial Delivery",
      subLabel: "Short received",
      icon: "alert",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 5,
      value: `${summary.overIssuedCount ?? 0}`,
      label: "Over Issued",
      subLabel: "Excess consumption",
      icon: "alert",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
  ];
}

function mapInventorySummary(summary = {}) {
  return [
    {
      id: 1,
      value: `${summary.totalItems ?? 0}`,
      label: "Total Items",
      subLabel: "Inventory records",
      icon: "materials",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 2,
      value: `₹${(summary.totalInventoryValue ?? 0).toLocaleString("en-IN")}`,
      label: "Inventory Value",
      subLabel: "Current valuation",
      icon: "currency",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 3,
      value: `${summary.matchedItemCount ?? 0}`,
      label: "Matched",
      subLabel: "Stock balanced",
      icon: "matched",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 4,
      value: `${summary.shortageItemCount ?? 0}`,
      label: "Shortage",
      subLabel: "Below expected",
      icon: "alert",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 5,
      value: `${summary.excessItemCount ?? 0}`,
      label: "Excess",
      subLabel: "Above expected",
      icon: "pending",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
  ];
} function mapPurchaseSummary(summary = {}) {
  return [
    {
      id: 1,
      value: `${summary.totalPOs ?? 0}`,
      label: "Total POs",
      subLabel: "Purchase orders",
      icon: "vendors",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 2,
      value: `₹${(summary.totalOrderValue ?? 0).toLocaleString("en-IN")}`,
      label: "Total Order Value",
      subLabel: "Committed amount",
      icon: "currency",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 3,
      value: `₹${(summary.totalPaidValue ?? 0).toLocaleString("en-IN")}`,
      label: "Total Paid",
      subLabel: "Settled amount",
      icon: "paid",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 4,
      value: `₹${(summary.totalOutstandingAmount ?? 0).toLocaleString("en-IN")}`,
      label: "Outstanding",
      subLabel: "Pending balance",
      icon: "balance",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 5,
      value: `${summary.matchedPOCount ?? 0}`,
      label: "Matched POs",
      subLabel: `Pending GRN: ${summary.pendingGRNCount ?? 0}`,
      icon: "matched",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
  ];
}

function mapFinancialSummary(summary = {}) {
  return [
    {
      id: 1,
      value: `${summary.totalVendors ?? 0}`,
      label: "Total Vendors",
      subLabel: "Active vendors",
      icon: "vendors",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 2,
      value: `₹${(summary.totalCommittedAmount ?? 0).toLocaleString("en-IN")}`,
      label: "Committed Amount",
      subLabel: "Total PO value",
      icon: "currency",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 3,
      value: `₹${(summary.totalPaidAmount ?? 0).toLocaleString("en-IN")}`,
      label: "Total Paid",
      subLabel: "Settled amount",
      icon: "paid",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
    {
      id: 4,
      value: `₹${(summary.totalNetPayable ?? 0).toLocaleString("en-IN")}`,
      label: "Net Payable",
      subLabel: "After deductions",
      icon: "balance",
      colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]",
    },
    {
      id: 5,
      value: `${summary.settledCount ?? 0}`,
      label: "Settled",
      subLabel: `Unmatched: ${summary.unmatchedCount ?? 0}`,
      icon: "matched",
      colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]",
    },
  ];
}

function mapSummaryCards(tab, summary = {}) {
  switch (tab) {
    case "Material": return mapMaterialSummary(summary);
    case "Inventory": return mapInventorySummary(summary);
    case "Purchase": return mapPurchaseSummary(summary);
    case "Financial": return mapFinancialSummary(summary);
    default: return [];
  }
}

function normalizeRowId(tab, record, index) {
  switch (tab) {
    case "Material":
    case "Inventory":
      return record.inventoryId?.toString() || `row-${index}`;
    case "Purchase":
      return record.poId?.toString() || `row-${index}`;
    case "Financial":
      return record.vendorId?.toString() || `row-${index}`;
    default:
      return `row-${index}`;
  }
}

export async function fetchReconciliationData(
  tab,
  {
    page = 1,
    limit = 20,
    search = "",
    sortBy,
    order = "asc",
    projectId,
    signal = null,
  } = {}
) {
  const endpoint = TAB_ENDPOINT[tab];
  if (!endpoint) throw new Error(`Unknown tab: ${tab}`);

  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("limit", String(limit));
  if (search?.trim()) params.append("search", search.trim());
  if (sortBy) params.append("sortBy", sortBy);
  if (order) params.append("order", order);
  if (projectId) params.append("projectId", projectId);

  const { data } = await axios.get(
    `${API_BASE_URL}/reconciliation/${endpoint}?${params.toString()}`,
    { headers: getReconciliationHeaders(), signal }
  );

  const payload = data.data || {};
  const rawSummary = payload.summary || {};
  const rawRecords = payload.records || [];
  const rawPagination = payload.pagination || {};

  const records = rawRecords.map((record, index) => ({
    ...record,
    id: normalizeRowId(tab, record, index),
  }));

  return {
    summary: mapSummaryCards(tab, rawSummary),
    rawSummary,
    records,
    pagination: {
      total: rawPagination.total ?? records.length,
      page: rawPagination.page ?? page,
      limit: rawPagination.limit ?? limit,
      totalPages: rawPagination.totalPages ?? 1,
      hasNext: rawPagination.hasNext ?? false,
      hasPrev: rawPagination.hasPrev ?? false,
    },
    columns: TAB_COLUMNS[tab] || [],
  };
}

export function getReconciliationColumns(tab) {
  return TAB_COLUMNS[tab] || TAB_COLUMNS.Material;
}