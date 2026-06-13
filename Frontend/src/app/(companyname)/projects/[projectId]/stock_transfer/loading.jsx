export default function Loading() {
  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen animate-pulse">

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-4">
        <div className="space-y-4">
          <div className="h-12 w-64 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
          <div className="h-3 w-80 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
        </div>
        <div className="h-11 w-112.5 bg-gray-100 dark:bg-[#18181b] rounded-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-50 dark:bg-[#1a1e27] rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-60 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-4xl p-5">
             <div className="flex justify-between mb-6">
                <div className="h-6 w-24 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                <div className="h-3 w-16 bg-gray-50 dark:bg-[#27272a] rounded" />
             </div>
             <div className="space-y-3">
                <div className="h-5 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
                <div className="h-3 w-48 bg-gray-100 dark:bg-[#27272a] rounded" />
                <div className="h-3 w-40 bg-gray-100 dark:bg-[#27272a] rounded" />
             </div>
             <div className="mt-8 flex justify-between">
                <div className="h-7 w-20 bg-green-50 dark:bg-green-900/10 rounded-full" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-[#27272a] rounded-full" />
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}