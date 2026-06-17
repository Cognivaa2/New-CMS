export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] p-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded-lg w-40" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-8" />
          </div>
          <div className="h-4 bg-gray-100 dark:bg-zinc-800/50 rounded w-80" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 bg-gray-100 dark:bg-zinc-800 rounded-xl w-64" />
          <div className="h-10 bg-gray-200 dark:bg-zinc-700 rounded-xl w-32" />
        </div>
      </div>

      {/* Group label */}
      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-28 mb-5" />

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 h-44 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              <div className="w-20 h-6 bg-gray-100 dark:bg-zinc-800 rounded-full" />
            </div>
            <div>
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-zinc-800/50 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 dark:bg-zinc-800/50 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}