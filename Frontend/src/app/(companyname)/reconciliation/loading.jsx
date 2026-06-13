export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-black py-12 px-6 lg:px-12 animate-pulse">
      <div className="max-w-400 mx-auto">
        <div className="mb-10">
          <div className="h-9 w-72 bg-gray-200 dark:bg-[#27272a] rounded-xl mb-3" />
          <div className="h-4 w-96 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
        </div>

        <div className="bg-white dark:bg-[#18181b] border border-[#E8ECF4] dark:border-[#2A2A30] rounded-2xl p-6 mb-6">
          <div className="h-5 w-40 bg-gray-200 dark:bg-[#27272a] rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 border border-[#E8ECF4] dark:border-[#2A2A30]">
                <div className="h-3 w-20 bg-gray-200 dark:bg-[#27272a] rounded mb-2" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-[#27272a] rounded mb-1" />
                <div className="h-2.5 w-24 bg-gray-100 dark:bg-[#27272a] rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#18181b] border border-[#E8ECF4] dark:border-[#2A2A30] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="h-5 w-36 bg-gray-200 dark:bg-[#27272a] rounded mb-1" />
            <div className="h-3 w-60 bg-gray-100 dark:bg-[#27272a] rounded" />
          </div>
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}