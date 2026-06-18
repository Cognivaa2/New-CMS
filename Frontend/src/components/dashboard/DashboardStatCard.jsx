// components/dashboard/DashboardStatCard.jsx

"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

export default function DashboardStatCard({
  value,
  label,
  sublabel,
  icon: Icon,
  trend,
  trendUp,
}) {
  return (
    <div className="group bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-zinc-200 dark:hover:border-zinc-700 hover:-translate-y-0.5 flex flex-col justify-center">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[32px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
            {value}
          </span>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                trendUp
                  ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
                  : "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10"
              }`}
            >
              {trendUp ? (
                <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
              )}
              {trend}
            </span>
          )}
        </div>

        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:bg-violet-50 group-hover:text-violet-600 dark:group-hover:bg-violet-500/10 dark:group-hover:text-violet-400 transition-colors">
            <Icon className="w-4.5 h-4.5" strokeWidth={2} />
          </div>
        )}
      </div>

      <h3 className="text-[17px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight mb-1 font-sfpro">
        {label}
      </h3>
      <p className="text-[13px] text-zinc-400 dark:text-zinc-500 leading-snug font-medium font-sfpro">
        {sublabel}
      </p>
    </div>
  );
}