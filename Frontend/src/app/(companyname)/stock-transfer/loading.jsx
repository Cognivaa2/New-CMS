// app/stock-transfer/loading.jsx

export default function Loading() {
  return (
    <div className="w-full min-h-screen bg-[#fafafa] dark:bg-black py-8 px-4 sm:px-6 lg:px-8 font-sfpro animate-pulse">
      <div className="max-w-400 mx-auto mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-64 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
              <div className="h-7 w-10 bg-gray-200 dark:bg-[#27272a] rounded-md" />
            </div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
          </div>
          <div className="h-11 w-64 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl" />
        </div>
      </div>

      <div className="max-w-400 mx-auto mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#18181b] border border-[#E8ECF4] dark:border-[#2A2A30] rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="h-8 w-16 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                <div className="h-5 w-5 bg-gray-200 dark:bg-[#27272a] rounded" />
              </div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded mb-2" />
              <div className="h-3 w-full bg-gray-100 dark:bg-[#27272a] rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-400 mx-auto">
        <div className="bg-white dark:bg-[#18181b] border border-[#E8ECF4] dark:border-[#2A2A30] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-[#27272a]">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div className="flex-1">
                <div className="h-7 w-48 bg-gray-200 dark:bg-[#27272a] rounded-lg mb-2" />
                <div className="h-4 w-full max-w-lg bg-gray-100 dark:bg-[#27272a] rounded" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-64 bg-gray-100 dark:bg-[#27272a] rounded-xl" />
                <div className="h-10 w-10 bg-gray-100 dark:bg-[#27272a] rounded-xl" />
                <div className="h-10 w-36 bg-gray-300 dark:bg-[#27272a] rounded-xl" />
              </div>
            </div>
          </div>

          <div className="bg-[#fafafa] dark:bg-[#121212] border-b border-gray-100 dark:border-[#27272a] px-6 py-4">
            <div className="flex gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-24 bg-gray-200 dark:bg-[#27272a] rounded"
                />
              ))}
            </div>
          </div>

          <div className="px-6 py-24 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#27272a] rounded-full mb-4" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-[#27272a] rounded mb-2" />
            <div className="h-3 w-64 bg-gray-100 dark:bg-[#27272a] rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}