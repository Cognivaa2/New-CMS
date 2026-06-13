export default function Loading() {
  return (
    <div className="w-full rounded-md mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 flex flex-col gap-4 sm:gap-5 lg:gap-6 bg-white dark:bg-[#09090b] min-h-screen transition-colors duration-300">
      <div className="w-full font-sans animate-pulse">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-[#27272a] rounded w-64 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-48" />
          </div>
          <div className="flex gap-4">
            <div className="h-10 bg-gray-200 dark:bg-[#27272a] rounded-lg w-48" />
            <div className="h-10 bg-gray-200 dark:bg-[#27272a] rounded-lg w-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 dark:bg-[#18181b] rounded-3xl"
            />
          ))}
        </div>

        <div className="h-12 bg-gray-100 dark:bg-[#18181b] rounded-2xl w-fit mb-6 px-2 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 bg-gray-200 dark:bg-[#27272a] rounded-xl w-24"
            />
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-[#252525] overflow-hidden">
          <div className="h-12 bg-gray-50 dark:bg-[#18181b]" />
          <div className="space-y-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-16 border-b border-gray-100 dark:border-[#1e1e1e] flex items-center px-5 gap-6"
              >
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-28" />
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-16" />
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-36" />
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-20" />
                <div className="h-6 bg-gray-200 dark:bg-[#27272a] rounded-full w-24" />
                <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-6 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}