// rounded-[1.75rem]
export default function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.id} className="bg-white dark:bg-transparent border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
              <div className="relative text-zinc-300 dark:text-zinc-700">
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{stat.label}</h4>
            <p className="text-[10px] text-zinc-400 mt-1">{stat.sublabel}</p>
          </div>
        )
      })}
    </div>
  )
}