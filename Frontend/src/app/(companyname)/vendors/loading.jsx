export default function Loading() {
  return (
    <div className="w-full mx-auto py-6 px-4 sm:px-8 bg-[#fdfdfd] dark:bg-[#09090b] min-h-screen animate-pulse">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-3 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="h-3 w-4 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
        <div className="h-3 w-4 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
        <div className="h-3 w-24 bg-gray-300 dark:bg-[#3f3f46] rounded" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-4 bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#27272a] rounded-[40px] p-8 h-[calc(100vh-160px)] min-h-175 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-3">
              <div className="h-7 w-48 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
              <div className="h-3 w-56 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="h-3 w-40 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
            </div>
            <div className="w-10 h-10 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-12 bg-gray-100 dark:bg-[#18181b] rounded-full" />
            <div className="w-6 h-6 bg-gray-100 dark:bg-[#18181b] rounded" />
          </div>

          <div className="flex-1 space-y-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 rounded-[28px] border border-gray-100 dark:border-[#27272a] flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-[#27272a] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-[#27272a]/50 rounded" />
                </div>
                <div className="w-4 h-6 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="xl:col-span-8 bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#27272a] rounded-[40px] p-10 h-[calc(100vh-160px)] min-h-175 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-3">
              <div className="h-7 w-32 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
              <div className="h-3 w-64 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
            </div>
            <div className="w-10 h-6 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
          </div>
          <div className="flex gap-2 p-1.5 bg-gray-50 dark:bg-[#1c1c1c] rounded-2xl w-fit mb-10">
            <div className="h-10 w-28 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
            <div className="h-10 w-28 bg-transparent rounded-xl" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="h-10 w-64 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                  <div className="h-8 w-20 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-24 bg-gray-100 dark:bg-[#27272a] rounded" />
                <div className="h-20 w-full bg-gray-50 dark:bg-[#1c1c1c] rounded-xl" />
              </div>
              <div className="space-y-4 pt-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                    <div className="h-3 w-48 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="h-6 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
                <div className="flex gap-3">
                  <div className="h-10 w-32 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                  <div className="h-10 w-32 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                </div>
              </div>
              <div className="space-y-8">
                <div className="h-6 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
                    <div className="h-5 w-48 bg-gray-200 dark:bg-[#27272a] rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}