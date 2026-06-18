"use client"

import { useState } from "react"
import { IMPORT_MODULES } from "@/app/(companyname)/imports/api"
import StatusBadge from "./StatusBadge"

function formatDate(dateString) {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getModuleLabel(key) {
  return IMPORT_MODULES.find((m) => m.key === key)?.label || key
}

export default function HistoryTable({ jobs = [], onViewJob }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <span className="text-xl">📋</span>
        </div>
        <p className="text-[14px] font-sfpro-medium text-zinc-500 dark:text-zinc-400">
          No import history yet
        </p>
        <p className="text-[12px] font-sfpro text-zinc-400 dark:text-zinc-600 mt-1">
          Your completed imports will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <div
          key={job._id}
          onClick={() => onViewJob?.(job)}
          className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-sfpro-bold text-gray-900 dark:text-white truncate">
              {getModuleLabel(job.module)}
            </p>
            <p className="text-[11px] font-sfpro text-gray-400 dark:text-zinc-500 mt-0.5">
              {formatDate(job.createdAt)}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-[13px] font-sfpro-bold text-gray-700 dark:text-zinc-300">
                {job.totalRows ?? 0}
              </p>
              <p className="text-[10px] font-sfpro text-gray-400 dark:text-zinc-600">total</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-sfpro-bold text-green-600 dark:text-green-400">
                {job.successCount ?? 0}
              </p>
              <p className="text-[10px] font-sfpro text-gray-400 dark:text-zinc-600">success</p>
            </div>
            {(job.failedCount ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-[13px] font-sfpro-bold text-red-500 dark:text-red-400">
                  {job.failedCount}
                </p>
                <p className="text-[10px] font-sfpro text-gray-400 dark:text-zinc-600">failed</p>
              </div>
            )}
          </div>

          <StatusBadge status={job.status} />
        </div>
      ))}
    </div>
  )
}