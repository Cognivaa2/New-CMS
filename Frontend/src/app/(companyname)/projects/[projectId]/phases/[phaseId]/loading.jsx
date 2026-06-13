export default function Loading() {
    return (
    <div className="mx-auto py-8 px-4 flex flex-col gap-6 font-sans bg-white dark:bg-[#121212] min-h-screen animate-pulse transition-colors duration-300 w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
            <div className="h-7 w-7 bg-gray-200 dark:bg-[#27272a] rounded-md" />
          </div>
          <div className="h-4 w-52 bg-gray-200 dark:bg-[#27272a] rounded-md mt-3" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-[#27272a] rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-56 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
          <div className="h-10 w-10 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="rounded-2xl p-4 bg-gray-100 dark:bg-[#1e1e1e] h-35 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="h-4 w-28 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                <div className="w-7 h-7 bg-gray-200 dark:bg-[#27272a] rounded-full" />
              </div>
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-md" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-[#27272a] rounded-md" />
            </div>
            <div className="flex items-center gap-2 px-0.5">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-7 w-32 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                <div className="h-7 w-32 bg-gray-100 dark:bg-[#27272a] rounded-full" />
              </div>
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#27272a] shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}