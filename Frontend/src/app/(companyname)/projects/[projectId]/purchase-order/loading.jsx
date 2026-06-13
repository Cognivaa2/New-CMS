export default function Loading() {
  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen font-sfpro animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
          <div className="h-4 w-80 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-48 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
          <div className="h-11 w-32 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="h-96 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]" />
    </div>
  )
}