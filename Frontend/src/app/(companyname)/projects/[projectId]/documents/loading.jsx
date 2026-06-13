
export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] p-8 w-full mx-auto animate-pulse">
      
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-48"></div>
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-8"></div>
          </div>
          <div className="h-4 bg-gray-100 dark:bg-zinc-800/50 rounded w-72 mt-3"></div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 bg-gray-100 dark:bg-zinc-800 rounded-full w-70"></div>
          <div className="h-10 bg-gray-100 dark:bg-zinc-800 rounded-full w-10"></div>
          <div className="h-10 bg-gray-200 dark:bg-zinc-700 rounded-full w-28"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between h-45">
            <div className="flex justify-between">
              <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-800 rounded"></div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
            </div>
            <div className="mt-4">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2 mb-4"></div>
              
              <div className="h-3 bg-gray-100 dark:bg-zinc-800/50 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-100 dark:bg-zinc-800/50 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}