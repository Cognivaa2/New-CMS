// dpr/loading.jsx

export default function Loading() {
  return (
    <div className="w-full rounded-md mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 flex flex-col gap-4 sm:gap-5 lg:gap-6 bg-white dark:bg-[#121212] min-h-screen transition-colors duration-300">
      <div className="w-full font-sans animate-pulse">
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-[#27272a] rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-48"></div>
          </div>
          <div className="flex gap-4">
            <div className="h-10 bg-gray-200 dark:bg-[#27272a] rounded-lg w-32"></div>
            <div className="h-10 bg-gray-200 dark:bg-[#27272a] rounded-lg w-32"></div>
            <div className="h-10 bg-gray-200 dark:bg-[#27272a] rounded-lg w-10"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-[#18181b] rounded-2xl"></div>
          ))}
        </div>
        <div>
          <div className="h-6 bg-gray-200 dark:bg-[#27272a] rounded w-48 mb-4"></div>
          <div className="h-10 bg-gray-100 dark:bg-[#18181b] rounded-lg w-full mb-4"></div>
          
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-12 items-center p-3 gap-2">
                <div className="col-span-3 pr-4"><div className="h-8 bg-gray-200 dark:bg-[#27272a] rounded w-full"></div></div>
                <div className="col-span-1 flex space-x-1">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
                  <div className="w-6 h-6 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
                </div>
                <div className="col-span-2"><div className="h-2 bg-gray-200 dark:bg-[#27272a] rounded w-24"></div></div>
                <div className="col-span-1"><div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-16"></div></div>
                <div className="col-span-1"><div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-16"></div></div>
                <div className="col-span-2"><div className="h-2 bg-gray-200 dark:bg-[#27272a] rounded w-24"></div></div>
                <div className="col-span-1 text-center"><div className="h-4 bg-gray-200 dark:bg-[#27272a] rounded w-8 mx-auto"></div></div>
                <div className="col-span-1"><div className="h-6 bg-gray-200 dark:bg-[#27272a] rounded-full w-full"></div></div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}