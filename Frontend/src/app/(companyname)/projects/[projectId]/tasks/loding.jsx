"use client"

export default function TaskPageSkeleton() {
  return (
    <div className="w-full bg-white dark:bg-[#121212] font-sans p-6 transition-colors duration-300">
      
      <div className="flex flex-col lg:flex-row lg:items-start justify-between w-full mb-8 animate-pulse gap-6">
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-40 bg-gray-200 dark:bg-[#27272a] rounded-lg"></div>
            <div className="h-6 w-8 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="h-3 w-56 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
            <div className="h-3 w-36 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          <div className="h-8.5 w-22.5 bg-gray-200 dark:bg-[#27272a] rounded-lg"></div>
          <div className="h-8.5 w-64 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
          <div className="h-8.5 w-8.5 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
        {Array.from({ length: 12 }).map((_, index) => (
          <div 
            key={index} 
            className="flex flex-col justify-between border border-gray-100 dark:border-[#27272a] rounded-[20px] p-5 h-48 bg-white dark:bg-[#18181b] shadow-[0_2px_10px_rgba(0,0,0,0.02)] animate-pulse"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
              </div>
              <div className="h-5 w-3 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
            </div>

            <div className="flex flex-col gap-2 mt-4 grow">
              <div className="h-4 w-full bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
              <div className="h-4 w-[70%] bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
            </div>

            <div className="flex items-end justify-between mt-auto pt-4">
              <div className="h-8 w-16 bg-gray-200 dark:bg-[#27272a] rounded-lg"></div>
              
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full bg-gray-300 dark:bg-[#3f3f46] border-2 border-white dark:border-[#18181b]"></div>
                <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-[#27272a] border-2 border-white dark:border-[#18181b]"></div>
                <div className="h-7 w-7 rounded-full bg-gray-300 dark:bg-[#3f3f46] border-2 border-white dark:border-[#18181b]"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}