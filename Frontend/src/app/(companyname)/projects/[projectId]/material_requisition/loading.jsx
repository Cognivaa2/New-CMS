export default function Loading() {
  const gridLayout = {
    gridTemplateColumns: "40px 130px minmax(130px, 1fr) minmax(130px, 1fr) 110px 110px 160px 160px 110px 40px"
  }

  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-4">
        <div className="space-y-4">
          <div className="h-12 w-80 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
          <div className="space-y-2">
            <div className="h-3 w-64 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
            <div className="h-3 w-48 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="h-11 w-[320px] bg-gray-100 dark:bg-[#18181b] rounded-full" />
          <div className="h-11 w-11 bg-gray-100 dark:bg-[#18181b] rounded-xl" />
          <div className="h-11 w-36 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-50 dark:bg-[#1a1e27] rounded-3xl border border-gray-100 dark:border-[#27272a]" />
        ))}
      </div>
      <div className="w-full overflow-hidden border border-gray-100 dark:border-[#27272a] rounded-4xl">
        <div className="hidden lg:grid gap-4 px-6 py-5 bg-gray-50/50 dark:bg-[#1c1c1f] border-b border-gray-100 dark:border-[#27272a] items-center" style={gridLayout}>
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-2 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
          ))}
        </div>
        <div className="flex flex-col bg-white dark:bg-[#18181b]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid gap-4 px-6 py-5 items-center border-b border-gray-50 dark:border-[#27272a] last:border-0" style={gridLayout}>
              <div className="w-4 h-4 bg-gray-100 dark:bg-[#27272a] rounded" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-[#27272a] rounded" />
              <div className="h-3 w-28 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="h-3 w-28 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="h-7 w-20 bg-green-50 dark:bg-green-900/10 rounded-full" />
              <div className="h-3 w-20 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                <div className="space-y-1">
                  <div className="h-2 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
                  <div className="h-2 w-10 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                <div className="space-y-1">
                  <div className="h-2 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
                  <div className="h-2 w-10 bg-gray-100 dark:bg-[#27272a]/50 rounded" />
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