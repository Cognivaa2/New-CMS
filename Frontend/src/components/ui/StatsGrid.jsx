// components/ui/StatsGrid.jsx
// rounded-[1.75rem] 5,26
function StatCard({ value, label, sublabel, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-center">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[32px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
          {value}
        </span>
        <div className="relative text-zinc-400 dark:text-zinc-600">
          {Icon && <Icon className="w-6 h-6" strokeWidth={2} />}
        </div>
      </div>
      <h3 className="text-[17px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight mb-0.5 font-sfpro">
        {label}
      </h3>
      <p className="text-[13px] text-zinc-400 dark:text-zinc-500 leading-snug font-medium max-w-40 font-sfpro">
        {sublabel}
      </p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm animate-pulse flex flex-col gap-3">
      <div className="h-9 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
      <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
      <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
    </div>
  )
}

export default function StatsGrid({ stats = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.id}
          value={stat.value}
          label={stat.label}
          sublabel={stat.sublabel}
          icon={stat.icon}
        />
      ))}
    </div>
  )
}