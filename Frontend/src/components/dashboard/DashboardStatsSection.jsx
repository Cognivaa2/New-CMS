import {
  FolderKanban,
  ShoppingCart,
  Hammer,
  PackageCheck,
  FileText,
  AlertCircle,
  Wallet,
  Boxes,
  IndianRupee,
  CheckSquare,
} from "lucide-react"
import DashboardStatCard from "./DashboardStatCard"

const iconMap = {
  FolderKanban,
  ShoppingCart,
  Hammer,
  PackageCheck,
  FileText,
  AlertCircle,
  Wallet,
  Boxes,
  IndianRupee,
  CheckSquare,
}

function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-[1.75rem] p-5 shadow-sm animate-pulse flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-9 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-9 w-9 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl" />
      </div>
      <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
      <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800/70 rounded-md" />
    </div>
  )
}

export default function DashboardStatsSection({ stats = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon || FileText
        return (
          <DashboardStatCard
            key={stat.id}
            value={stat.value}
            label={stat.label}
            sublabel={stat.sublabel}
            icon={Icon}
            trend={stat.trend}
            trendUp={stat.trendUp}
          />
        )
      })}
    </div>
  )
}