export default function RolesLoading() {
  return (
    <div className="max-w-350 mx-auto p-4 md:p-8 min-h-screen transition-colors duration-300 animate-pulse font-sfpro">
      
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8">
        <div className="min-w-0 flex flex-col gap-3">
          <div className="h-10 w-48 sm:w-64 lg:w-80 bg-gray-200 dark:bg-[#27272a] rounded-xl"></div>
          <div className="h-4 w-full sm:w-96 lg:w-md bg-gray-100 dark:bg-[#18181b] rounded-lg mt-1"></div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          <div className="w-full sm:w-[320px] lg:w-65 h-10.5 bg-gray-100 dark:bg-[#18181b] rounded-xl border border-gray-100 dark:border-[#27272a]"></div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10.5 h-10.5  bg-gray-100 dark:bg-[#18181b] rounded-xl shrink-0"></div>
            <div className="w-full sm:w-32 h-10.5  bg-gray-200 dark:bg-[#27272a] rounded-xl"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="flex flex-col border border-gray-100 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-[28px] p-6 w-full h-55"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#27272a]"></div>
              <div className="w-6 h-6 rounded-md bg-gray-50 dark:bg-[#27272a]/50"></div>
            </div>

            <div className="w-2/3 h-5.25 bg-gray-200 dark:bg-[#27272a] rounded-lg mb-3"></div>
            <div className="w-full h-3 bg-gray-100 dark:bg-[#27272a]/60 rounded-md mb-2"></div>
            <div className="w-4/5 h-3 bg-gray-100 dark:bg-[#27272a]/60 rounded-md"></div>

            <div className="mt-auto flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
              <div className="w-1/3 h-3 bg-gray-100 dark:bg-[#27272a]/50 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="w-full mt-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 px-2 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-30 h-9 bg-gray-200 dark:bg-[#27272a] rounded-xl"></div>
            <div className="w-48 h-6 bg-gray-200 dark:bg-[#27272a] rounded-lg"></div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-8 bg-gray-100 dark:bg-[#27272a] rounded-lg"></div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="flex flex-col lg:flex-row lg:items-center justify-between p-4 px-6 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-3xl min-h-19"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-10 lg:w-[65%]">
                <div className="w-32 h-5 bg-gray-200 dark:bg-[#27272a] rounded-md min-w-45"></div>
                <div className="w-full sm:w-64 h-3 bg-gray-100 dark:bg-[#27272a]/60 rounded-md"></div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-6 mt-4 lg:mt-0">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-6 rounded-full bg-gray-200 dark:bg-[#27272a]"></div>
                  
                  <div className="hidden lg:block w-px h-6 bg-gray-100 dark:bg-[#27272a] mx-2"></div>

                  <div className="flex items-center">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="w-12 md:w-16 flex justify-center">
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#27272a]"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}