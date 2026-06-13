"use client";

import React from "react";
export default function Loading() {
  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#09090b] px-6 pt-8 pb-16 lg:px-10 font-sans">
      <div className="max-w-350 mx-auto space-y-8">
        <HeaderSkeleton />
        <StatsSkeleton />
        <AnalyticsSkeleton />
        <TabsSkeleton />
        <TableSkeleton />
      </div>
    </div>
  );
}
function HeaderSkeleton() {
  return (
    <div className="w-full flex items-start justify-between gap-4">
      <div className="space-y-2 animate-pulse">
        <div className="h-6 w-56 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="h-4 w-80 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
      </div>

      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-10 w-28 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
        <div className="h-10 w-36 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-[#121212] p-4 animate-pulse"
        >
          <div className="h-3.5 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
          <div className="mt-3 h-6 w-24 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
          <div className="mt-2 h-3 w-32 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        </div>
      ))}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-[#121212] p-4 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="mt-4 h-48 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-2xl" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-40 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-[#121212] p-4 animate-pulse">
        <div className="h-4 w-36 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="mt-4 h-56 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded-2xl" />
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] dark:border-[#252525] bg-white dark:bg-[#121212] p-4 animate-pulse">
        <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-[#27272a]" />
                <div className="min-w-0 space-y-1">
                  <div className="h-3.5 w-36 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                  <div className="h-3 w-28 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                </div>
              </div>
              <div className="h-4 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide rounded-2xl bg-[#f7f7f7] dark:bg-[#18181b] p-1.5 border border-[#ececec] dark:border-[#252525] w-fit animate-pulse">
      {["Manual", "Committed", "Actual", "Pending", "Approved", "Rejected", "Reversed"].map(
        (t, i) => (
          <div
            key={t}
            className={`h-10 rounded-xl bg-white dark:bg-[#1f1f1f] border border-transparent ${
              i === 0 ? "w-24" : i === 1 ? "w-32" : "w-24"
            }`}
          />
        )
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="w-full font-sfpro pb-10">
      <div className="lg:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
                <div className="h-3 w-44 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                  <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-275 border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <th key={i} className="px-5 py-3.5">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-[#121212]">
              {Array.from({ length: 6 }).map((_, r) => (
                <tr
                  key={r}
                  className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]"
                >
                  {Array.from({ length: 9 }).map((__, c) => (
                    <td key={c} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}