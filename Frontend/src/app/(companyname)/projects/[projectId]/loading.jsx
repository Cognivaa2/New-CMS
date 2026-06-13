export default function Loading() {
  return (
    <div className="w-full animate-pulse">
      
      <div className="flex justify-between items-start mb-10">
        <div className="w-full max-w-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-8 w-64 bg-gray-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="h-6 w-24 bg-gray-200 dark:bg-neutral-800 rounded-full"></div>
            <div className="h-6 w-24 bg-gray-200 dark:bg-neutral-800 rounded-full"></div>
          </div>

          <div className="space-y-2 mb-6 w-full">
            <div className="h-4 w-full bg-gray-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="h-4 w-11/12 bg-gray-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="h-4 w-4/5 bg-gray-200 dark:bg-neutral-800 rounded-md"></div>
          </div>

          <div className="flex gap-3">
            <div className="h-7 w-32 bg-gray-200 dark:bg-neutral-800 rounded-full"></div>
            <div className="h-7 w-32 bg-gray-200 dark:bg-neutral-800 rounded-full"></div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gray-200 dark:bg-neutral-800 rounded-lg"></div>
          <div className="w-24 h-9 bg-gray-200 dark:bg-neutral-800 rounded-lg"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 h-64">
        <div className="bg-[#fcfcfd] dark:bg-[#111111] border border-gray-100 dark:border-neutral-800 rounded-3xl p-8 flex flex-col justify-center gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-5 h-5 bg-gray-200 dark:bg-neutral-800 rounded-sm shrink-0"></div>
              <div className="h-4 w-48 bg-gray-200 dark:bg-neutral-800 rounded-md"></div>
            </div>
          ))}
        </div>

        <div className="flex justify-around items-center h-full w-full">
          <div className="relative w-48 h-48 rounded-full border-18 border-gray-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2">
            <div className="w-16 h-8 bg-gray-200 dark:bg-neutral-700 rounded-md"></div>
            <div className="w-24 h-3 bg-gray-200 dark:bg-neutral-700 rounded-md"></div>
          </div>

          <div className="relative w-56 h-56 mt-16 rounded-full border-18 border-gray-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2">
            <div className="w-24 h-6 bg-gray-200 dark:bg-neutral-700 rounded-md"></div>
            <div className="w-20 h-3 bg-gray-200 dark:bg-neutral-700 rounded-md"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
        <div className="w-full">
          <div className="h-5 w-32 bg-gray-200 dark:bg-neutral-800 rounded-md mb-6"></div>
          <div className="h-64 w-full bg-gray-100 dark:bg-[#111111] rounded-xl border border-gray-50 dark:border-neutral-800"></div>
        </div>

        <div className="w-full">
          <div className="h-5 w-32 bg-gray-200 dark:bg-neutral-800 rounded-md mb-6"></div>
          <div className="h-64 w-full bg-gray-100 dark:bg-[#111111] rounded-xl border border-gray-50 dark:border-neutral-800"></div>
        </div>
      </div>
      
    </div>
  )
}