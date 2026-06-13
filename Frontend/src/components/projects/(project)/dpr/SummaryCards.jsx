"use client";

import { TrendingUp, LayoutList, Package, IndianRupee, Activity } from "lucide-react";

const ICON_MAP = {
  trend: TrendingUp,
  tasks: LayoutList,
  box: Package,
  currency: IndianRupee,
  log: Activity,
};

function SkeletonCard() {
  return (
    <div className="rounded-3xl p-8 bg-[#f4f4f5] dark:bg-[#18181b] animate-pulse flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-24 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
        <div className="h-6 w-6 bg-gray-200 dark:bg-[#27272a] rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
      </div>
    </div>
  );
}

export default function SummaryCards({ cards = [], isLoading = false }) {
  if (isLoading || cards.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => {
        const Icon = ICON_MAP[card.icon] || Activity;
        return (
          <div
            key={card.id}
            className={`${card.colorClass} rounded-3xl p-8 flex flex-col relative overflow-hidden transition-colors duration-300`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                {card.value}
              </span>
              <Icon className="text-gray-400 shrink-0" size={22} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">
                {card.label}
              </p>
              <p className="text-[13px] text-gray-400 dark:text-gray-500 font-medium">
                {card.subLabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}