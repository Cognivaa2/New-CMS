"use client";

import { CheckCircle2, FileText, ChevronLeft, ChevronRight } from "lucide-react";

function NA() {
  return (
    <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
      Not available
    </span>
  );
}

const TAB_COLUMNS = {
  Tasks: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "Task Name", accessor: "taskName", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Start Date", accessor: "startDate", type: "text" },
    { label: "End Date", accessor: "endDate", type: "text" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  "Sub Tasks": [
    { label: "Time", accessor: "time", type: "text" },
    { label: "Title", accessor: "title", type: "title" },
    { label: "Parent Task", accessor: "parentTask", type: "text" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Start Date", accessor: "startDate", type: "text" },
    { label: "End Date", accessor: "endDate", type: "text" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  Progress: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "Sub-Task", accessor: "title", type: "title" },
    { label: "Parent Task", accessor: "parentTask", type: "text" },
    { label: "Completion %", accessor: "completion", type: "progress" },
    { label: "Previous %", accessor: "previousCompletion", type: "prevprogress" },
    { label: "Updated By", accessor: "doneBy", type: "text" },
  ],
  Consumptions: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "Material", accessor: "material", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Quantity", accessor: "quantity", type: "text" },
    { label: "Unit", accessor: "unit", type: "text" },
    { label: "Total Cost", accessor: "totalCost", type: "currency" },
    { label: "Work Order", accessor: "workOrderNumber", type: "wo" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  Transfers: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "From Project", accessor: "fromLocation", type: "text" },
    { label: "To Project", accessor: "toLocation", type: "text" },
    { label: "Materials", accessor: "materialsSummary", type: "text" },
    { label: "Quantity", accessor: "quantitySummary", type: "text" },
    { label: "Items", accessor: "itemCount", type: "text" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  MRs: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "MR Number", accessor: "documentNumber", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Items", accessor: "itemSummary", type: "text" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  POs: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "PO Number", accessor: "documentNumber", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Vendor", accessor: "vendor", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  GRNs: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "GRN Number", accessor: "documentNumber", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Vendor", accessor: "vendor", type: "text" },
    { label: "Qty Received", accessor: "grnQtySummary", type: "text" },
    { label: "Amount", accessor: "grnAmount", type: "currency" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  WOs: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "WO Number", accessor: "documentNumber", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Vendor", accessor: "vendor", type: "text" },
    { label: "Amount", accessor: "amount", type: "currency" },
    { label: "Status", accessor: "status", type: "status" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
  Expenses: [
    { label: "Time", accessor: "time", type: "text" },
    { label: "Ref No.", accessor: "documentNumber", type: "title" },
    { label: "Action", accessor: "action", type: "text" },
    { label: "Category", accessor: "expenseCategory", type: "text" },
    { label: "Amount", accessor: "expenseAmount", type: "currency" },
    { label: "Description", accessor: "description", type: "text" },
    { label: "Done By", accessor: "doneBy", type: "text" },
  ],
};

function StatusPill({ status }) {
  if (!status) return <NA />;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sfpro-medium whitespace-nowrap bg-[#ebfbf1] text-[#166534] border border-[#b7efc5] dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.25} />
      {status}
    </span>
  );
}

function ProgressBar({ percent = 0 }) {
  const pct = Math.min(Number(percent) || 0, 100);
  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#27272a] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#212121] dark:bg-white transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-sfpro-medium text-gray-500 dark:text-[#a1a1aa] shrink-0 w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}


function PrevPercent({ percent }) {
  if (percent === null || percent === undefined) return <NA />;
  return (
    <span className="text-[13px] font-sfpro-medium text-gray-400 dark:text-[#71717a]">
      {Number(percent)}%
    </span>
  );
}


function WOPill({ value }) {
  if (!value) {
    return (
      <span className="text-[12px] italic text-gray-400 dark:text-[#52525b] opacity-60">
        Project consumption
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sfpro-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20 whitespace-nowrap">
      {value}
    </span>
  );
}

function Cell({ children, className = "" }) {
  return <td className={`px-5 py-2 align-middle ${className}`}>{children}</td>;
}

function renderCell(row, column) {
  const value = row[column.accessor];

  switch (column.type) {
    case "status":
      return <StatusPill status={value} />;

    case "progress":
      return <ProgressBar percent={Number(value) || 0} />;
    case "prevprogress":
      return <PrevPercent percent={value} />;
    case "wo":
      return <WOPill value={value} />;

    case "currency":
      if (value === null || value === undefined) return <NA />;
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] whitespace-nowrap">
          ₹{Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );

    case "title":
      if (!value) return <NA />;
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-45 block">
          {value}
        </span>
      );

    default:
      if (value === null || value === undefined || value === "") return <NA />;
      return (
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] whitespace-nowrap">
          {value}
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

function SkeletonCard() {
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
          No {activeTab} recorded today
        </p>
        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
          Activity will appear here as events are logged.
        </p>
      </div>
    </div>
  );
}

function MobileCard({ row, columns }) {
  const primary = columns[1];
  const statusCol = columns.find((c) => c.type === "status");

  return (
    <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
            {row.time ?? <NA />}
          </p>
          <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate">
            {row[primary?.accessor] ?? <NA />}
          </p>
        </div>
        {statusCol && (
          <div className="shrink-0">
            <StatusPill status={row[statusCol.accessor]} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {columns.slice(2).map((col) => (
          <div key={col.accessor} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
              {col.label}
            </span>
            <div>{renderCell(row, col)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, hasNext, hasPrev } = pagination;

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro">
        {total} event{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => hasPrev && onPageChange(page - 1)}
          disabled={!hasPrev}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] min-w-16 text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => hasNext && onPageChange(page + 1)}
          disabled={!hasNext}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[#27272a] bg-white dark:bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function WorkTable({
  activeTab,
  rows = [],
  isLoading = false,
  pagination = {},
  onPageChange,
}) {
  const columns = TAB_COLUMNS[activeTab] || TAB_COLUMNS.Tasks;

  return (
    <div className="w-full font-sfpro pb-10">
      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : rows.length === 0
            ? <EmptyState activeTab={activeTab} />
            : rows.map((row) => (
              <MobileCard key={row.id} row={row} columns={columns} />
            ))}
      </div>

      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-250 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                {columns.map((col) => (
                  <th
                    key={col.accessor}
                    className="px-5 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#121212]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length} />
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
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
                    {columns.map((col) => (
                      <Cell key={col.accessor}>{renderCell(row, col)}</Cell>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}