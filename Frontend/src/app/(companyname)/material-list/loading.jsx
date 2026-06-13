export default function Loading() {
  const gridLayout = { 
    gridTemplateColumns: "40px minmax(180px, 1.2fr) minmax(200px, 1.5fr) 120px 100px 120px 180px 120px 40px" 
  }

  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 w-full mb-4 animate-pulse">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-64 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
            <div className="h-8 w-10 bg-gray-100 dark:bg-[#27272a]/70 rounded-md" />
          </div>
          <div className="h-3 w-80 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="h-10 w-[320px] bg-gray-100 dark:bg-[#18181b] rounded-full" />
          <div className="h-10 w-10 bg-gray-100 dark:bg-[#18181b] rounded-xl" />
          <div className="h-10 w-36 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-[#f8f9fa] dark:bg-[#1a1e27] rounded-2xl border border-gray-100 dark:border-[#27272a]" />
        ))}
      </div>

      <div className="w-full overflow-hidden animate-pulse">
        <div className="hidden lg:grid gap-4 px-6 py-4 bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-t-2xl items-center" style={gridLayout}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-2 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
          ))}
        </div>

        <div className="flex flex-col border-x border-b border-gray-100 dark:border-[#27272a] rounded-b-2xl">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="grid gap-4 px-6 py-5 items-center bg-white dark:bg-[#121212] border-b border-gray-50 dark:border-[#27272a] last:border-0" style={gridLayout}>
              <div className="w-4 h-4 bg-gray-100 dark:bg-[#27272a] rounded" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-[#27272a] rounded" />
              <div className="h-3 w-48 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="h-3 w-16 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="h-6 w-14 bg-gray-50 dark:bg-[#27272a]/30 border border-gray-100 dark:border-[#27272a] rounded-full" />
              <div className="h-7 w-20 bg-green-50/50 dark:bg-green-900/10 rounded-full" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                <div className="space-y-1">
                  <div className="h-2 w-20 bg-gray-200 dark:bg-[#27272a] rounded" />
                  <div className="h-2 w-12 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
                </div>
              </div>
              <div className="h-3 w-20 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="w-5 h-5 ml-auto bg-gray-100 dark:bg-[#27272a]/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}