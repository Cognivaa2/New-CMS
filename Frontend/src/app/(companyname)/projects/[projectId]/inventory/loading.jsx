// src/app/inventory/loading.jsx

export default function Loading() {
  return (
    <div className="w-full mx-auto p-6 md:p-10 min-h-screen font-sfpro bg-[#fafafa] dark:bg-black">
      
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5 w-full mb-10 animate-pulse">
        <div className="space-y-3 max-w-sm">
          <div className="h-10 w-48 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
          <div className="space-y-2">
            <div className="h-3 w-72 bg-gray-200 dark:bg-[#27272a]/70 rounded-lg" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-[#27272a]/70 rounded-lg" />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-11 w-64 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-xl" />
          <div className="h-11 w-11 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-xl" />
          <div className="h-11 w-36 bg-gray-300 dark:bg-[#27272a] rounded-xl" />
          <div className="h-11 w-40 bg-gray-300 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>

      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="flex flex-col lg:flex-row items-center justify-between gap-4 p-5 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-2xl animate-pulse"
          >
            <div className="flex items-center gap-4 w-full lg:w-70 shrink-0">
              <div className="w-12 h-12 bg-gray-100 dark:bg-[#27272a] rounded-xl shrink-0" />
              <div className="space-y-2 w-full">
                <div className="h-4 bg-gray-200 dark:bg-[#3f3f46] rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-[#27272a] rounded w-1/2" />
              </div>
            </div>
            <div className="flex flex-1 w-full justify-between items-center gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="hidden md:flex items-center gap-3 flex-1 border-l border-gray-100 dark:border-[#27272a] pl-6">
                  <div className="w-6 h-6 bg-gray-100 dark:bg-[#27272a] rounded-md shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-2.5 bg-gray-100 dark:bg-[#27272a] rounded w-1/2" />
                    <div className="h-3.5 bg-gray-200 dark:bg-[#3f3f46] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-6 shrink-0 border-l border-gray-100 dark:border-[#27272a] pl-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-6 bg-gray-200 dark:bg-[#3f3f46] rounded-t-full" />
                <div className="w-10 h-2 bg-gray-100 dark:bg-[#27272a] rounded" />
              </div>
              <div className="w-8 h-8 bg-gray-100 dark:bg-[#27272a] rounded-full shrink-0" />
            </div>
            
          </div>
        ))}
      </div>
      
    </div>
  )
}