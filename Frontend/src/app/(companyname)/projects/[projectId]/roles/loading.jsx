
export default function Loading() {
  const gridLayout = { 
    gridTemplateColumns: "2.5fr 2fr 1.5fr 1.2fr 1.2fr 0.8fr 1fr" 
  };

  return (
    <div className="w-full  mx-auto py-8 px-4 sm:px-6 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen">
      
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 w-full mb-8 animate-pulse">
        <div className="flex flex-col gap-4 pt-2">
          <div className="h-12 w-64 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
          <div className="space-y-2">
            <div className="h-3 w-60 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
            <div className="h-3 w-40 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <div className="h-10 w-[320px] bg-gray-100 dark:bg-[#18181b] rounded-full" />
          <div className="h-10 w-10 bg-gray-100 dark:bg-[#18181b] rounded-full" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-4 animate-pulse">
        <div className="min-w-250">
          <div className="h-14 w-full bg-[#f4f5f7] dark:bg-[#18181b] rounded-2xl mb-4" />
          
          <div className="flex flex-col gap-2">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="grid gap-4 px-6 py-4 items-center"
                style={gridLayout}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200 dark:bg-[#27272a] rounded-full shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-3 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
                    <div className="h-2 w-20 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
                  </div>
                </div>
                <div><div className="h-3 w-40 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                <div><div className="h-3 w-28 bg-gray-200 dark:bg-[#27272a] rounded" /></div>
                <div><div className="h-8 w-24 bg-gray-100 dark:bg-[#27272a]/50 rounded-full" /></div>
                <div><div className="h-3 w-20 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                <div><div className="h-3 w-8 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                  <div className="w-5 h-5 bg-gray-100 dark:bg-[#27272a]/50 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}