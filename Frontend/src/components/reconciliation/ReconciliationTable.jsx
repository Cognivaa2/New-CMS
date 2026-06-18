// components/reconciliation/ReconciliationTable.jsx
"use client";

import {
  CheckCircle2, AlertTriangle, XCircle, Clock,
  FileText, ChevronLeft, ChevronRight,
} from "lucide-react";

function NA() {
  return (
    <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
      "Not Provided"
    </span>
  );
}
const FLAG_LABELS = {
  SHORT_ORDERED: "Short Ordered",
  EXCESS_ORDERED: "Excess Ordered",
  PARTIAL_DELIVERY: "Partial Delivery",
  OVER_ISSUED: "Over Issued",
  NO_GRN: "No GRN",
  NO_PAYABLE: "No Payable",
  UNDER_BILLED: "Under Billed",
  OVER_BILLED: "Over Billed",
  HIGH_VARIANCE: "High Variance",
  UNDER_RECEIVED: "Under Received",
  PAYMENT_PENDING: "Payment Pending",
  MULTIPLE_PAYABLES: "Multi Payables",
};
const STATUS_CONFIG = {
  MATCHED: { bg: "bg-[#ebfbf1] dark:bg-green-500/10", text: "text-[#166534] dark:text-green-400", border: "border-[#b7efc5] dark:border-green-500/20", icon: CheckCircle2, label: "Matched" },
  RECONCILED: { bg: "bg-[#ebfbf1] dark:bg-green-500/10", text: "text-[#166534] dark:text-green-400", border: "border-[#b7efc5] dark:border-green-500/20", icon: CheckCircle2, label: "Reconciled" },
  SETTLED: { bg: "bg-[#ebfbf1] dark:bg-green-500/10", text: "text-[#166534] dark:text-green-400", border: "border-[#b7efc5] dark:border-green-500/20", icon: CheckCircle2, label: "Settled" },
  TOLERATED: { bg: "bg-[#ebfbf1] dark:bg-green-500/10", text: "text-[#166534] dark:text-green-400", border: "border-[#b7efc5] dark:border-green-500/20", icon: CheckCircle2, label: "Tolerated" },
  PARTIAL_DELIVERY: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: Clock, label: "Partial Delivery" },
  PENDING_DELIVERY: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: Clock, label: "Pending Delivery" },
  PENDING_GRN: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: Clock, label: "Pending GRN" },
  PENDING_INVOICE: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: Clock, label: "Pending Invoice" },
  PARTIALLY_PAID: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: Clock, label: "Partially Paid" },
  PARTIAL_BILLING: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: Clock, label: "Partial Billing" },
  UNDER_BILLED: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: AlertTriangle, label: "Under Billed" },
  EXCESS: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: AlertTriangle, label: "Excess" },
  NO_BILLING: { bg: "bg-[#fff7ed] dark:bg-orange-500/10", text: "text-[#9a3412] dark:text-orange-400", border: "border-[#fed7aa] dark:border-orange-500/20", icon: AlertTriangle, label: "No Billing" },
  OVER_ISSUED: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: XCircle, label: "Over Issued" },
  NOT_ORDERED: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: XCircle, label: "Not Ordered" },
  SHORTAGE: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: XCircle, label: "Shortage" },
  ZERO_STOCK: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: XCircle, label: "Zero Stock" },
  UNMATCHED: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: AlertTriangle, label: "Unmatched" },
  OVER_BILLED: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: XCircle, label: "Over Billed" },
  UNPAID: { bg: "bg-[#fef2f2] dark:bg-red-500/10", text: "text-[#991b1b] dark:text-red-400", border: "border-[#fecaca] dark:border-red-500/20", icon: XCircle, label: "Unpaid" },
};

const DEFAULT_STATUS = {
  bg: "bg-gray-100 dark:bg-[#27272a]",
  text: "text-gray-600 dark:text-[#a1a1aa]",
  border: "border-gray-200 dark:border-[#3f3f46]",
  icon: CheckCircle2,
  label: null,
};

const PO_STATUS_CONFIG = {
  Approved: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  Completed: "bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe] dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  PartiallyDelivered: "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa] dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  Cancelled: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca] dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
};

function StatusPill({ status }) {
  if (!status) return <NA />;
  const c = STATUS_CONFIG[status] || DEFAULT_STATUS;
  const Icon = c.icon;
  const display = c.label || status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sfpro-medium whitespace-nowrap border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {display}
    </span>
  );
}

function POStatusBadge({ status }) {
  if (!status) return <NA />;
  const cls = PO_STATUS_CONFIG[status] ||
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:border-[#3f3f46]";
  const display = status.replace(/([A-Z])/g, " $1").trim();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sfpro-medium whitespace-nowrap border ${cls}`}>
      {display}
    </span>
  );
}

function FlagsCell({ flags }) {
  if (!flags || !Array.isArray(flags) || flags.length === 0) return <NA />;
  const display = flags
    .map((flag) =>
      FLAG_LABELS[flag] ||
      flag.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
    )
    .join(", ");
  return (
    <span
      className="text-[12px] font-sfpro-medium text-[#212121] dark:text-[#d4d4d8] leading-snug block max-w-40 line-clamp-2"
      title={display}
    >
      {display}
    </span>
  );
}

function DateCell({ value }) {
  if (!value) return <NA />;
  const d = new Date(value);
  if (isNaN(d.getTime())) return <NA />;
  const formatted = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] whitespace-nowrap">
      {formatted}
    </span>
  );
}

function ShortageCell({ value }) {
  if (value === null || value === undefined) return <NA />;
  const num = Number(value);
  if (num === 0) return (
    <span className="text-[13px] font-sfpro-medium text-gray-400 dark:text-[#52525b]">0</span>
  );
  return (
    <span className="text-[13px] font-sfpro-medium text-red-600 dark:text-red-400 whitespace-nowrap">
      {num.toLocaleString("en-IN")}
    </span>
  );
}

function VarianceCell({ value }) {
  if (value === null || value === undefined) return <NA />;
  const num = Number(value);
  if (num === 0) return (
    <span className="text-[13px] font-sfpro-medium text-gray-400 dark:text-[#52525b]">0</span>
  );
  return (
    <span className={`text-[13px] font-sfpro-medium whitespace-nowrap ${num < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
      }`}>
      {num > 0 ? `+${num.toLocaleString("en-IN")}` : num.toLocaleString("en-IN")}
    </span>
  );
}

function VariancePctCell({ value }) {
  if (value === null || value === undefined) return <NA />;
  const num = Number(value);
  const color =
    num === 0 ? "text-gray-400 dark:text-[#52525b]" :
      num <= 2 ? "text-gray-600 dark:text-[#a1a1aa]" :
        num <= 5 ? "text-orange-600 dark:text-orange-400" :
          "text-red-600 dark:text-red-400";
  return (
    <span className={`text-[13px] font-sfpro-medium whitespace-nowrap ${color}`}>
      {num.toFixed(2)}%
    </span>
  );
}

function CountsCell({ row }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] font-sfpro-medium whitespace-nowrap">
        GRN {row.grnCount ?? 0}
      </span>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] font-sfpro-medium whitespace-nowrap">
        INV {row.payableCount ?? 0}
      </span>
    </div>
  );
}

function Cell({ children }) {
  return <td className="px-5 py-2 align-middle">{children}</td>;
}

function renderCell(row, column) {
  const value = row[column.accessor];

  switch (column.type) {
    case "status":
      return <StatusPill status={value} />;

    case "postatus":
      return <POStatusBadge status={value} />;

    case "flags":
      return <FlagsCell flags={value} />;

    case "shortage":
      return <ShortageCell value={value} />;

    case "variance":
      return <VarianceCell value={value} />;

    case "variancepct":
      return <VariancePctCell value={value} />;

    case "counts":
      return <CountsCell row={row} />;

    case "date":
      return <DateCell value={value} />;

    case "currency":
      if (value === null || value === undefined) return <NA />;
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] whitespace-nowrap">
          ₹{Number(value).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      );

    case "title":
      if (!value) return <NA />;
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] truncate max-w-48 block">
          {value}
        </span>
      );

    default:
      if (value === null || value === undefined || value === "") return <NA />;
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] whitespace-nowrap">
          {String(value)}
        </span>
      );
  }
}

function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonMobileCard() {
  return (
    <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-24 bg-gray-200 dark:bg-[#27272a] rounded" />
          <div className="h-3 w-36 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        </div>
        <div className="h-6 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="space-y-1.5">
            <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
            <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ activeTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
        <FileText className="w-7 h-7 text-[#a1a1aa]" />
      </div>
      <div>
        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
          No {activeTab} reconciliation data
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Data will appear here once records are available.
        </p>
      </div>
    </div>
  );
}

function MobileCard({ row, columns }) {
  const primary = columns[0];
  const statusCol = columns.find((c) => c.type === "status");

  return (
    <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate min-w-0">
          {row[primary?.accessor] ?? "—"}
        </p>
        {statusCol && (
          <div className="shrink-0">
            <StatusPill status={row[statusCol.accessor]} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {columns.slice(1).map((col) => {
          if (col.type === "status") return null;
          return (
            <div
              key={col.accessor}
              className={`flex flex-col gap-0.5 ${col.type === "flags" ? "col-span-2" : ""}`}
            >
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                {col.label}
              </span>
              <div>{renderCell(row, col)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
        {total} record{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => pagination.hasPrev && onPageChange(page - 1)}
          disabled={!pagination.hasPrev}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] min-w-16 text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => pagination.hasNext && onPageChange(page + 1)}
          disabled={!pagination.hasNext}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function ReconciliationTable({
  activeTab,
  columns = [],
  rows = [],
  isLoading = false,
  pagination = {},
  onPageChange,
}) {
  const displayColumns = columns.length > 0 ? columns : [];

  return (
    <div className="w-full font-sfpro pb-10">

      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
          : rows.length === 0
            ? <EmptyState activeTab={activeTab} />
            : rows.map((row) => (
              <MobileCard key={row.id} row={row} columns={displayColumns} />
            ))}
      </div>

      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-300 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#101012] border-b border-[#EAEAEA] dark:border-[#252525]">
                {displayColumns.map((col) => (
                  <th
                    key={col.accessor}
                    className="px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={displayColumns.length || 8} />
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length || 1}>
                    <EmptyState activeTab={activeTab} />
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${index !== rows.length - 1
                      ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]"
                      : ""
                      }`}
                  >
                    {displayColumns.map((col) => (
                      <Cell key={col.accessor}>{renderCell(row, col)}</Cell>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && rows.length > 0 && (
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      )}

    </div>
  );
}