// dashboard/loading.jsx

import DashboardStatsSection from "@/components/dashboard/DashboardStatsSection";
import ChartSkeleton from "@/components/dashboard/ChartSkeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 p-6 md:p-8 lg:p-10">
      <div className="mb-8 animate-pulse">
        <div className="h-10 w-56 bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-3" />
        <div className="h-4 w-96 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg" />
      </div>

      <DashboardStatsSection isLoading={true} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <ChartSkeleton variant="bar" />
        <ChartSkeleton variant="donut" />
        <ChartSkeleton variant="horizontal" />
      </div>
    </div>
  );
}