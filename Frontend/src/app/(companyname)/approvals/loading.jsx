export default function Loading() {
  const gridLayout = { gridTemplateColumns: "50px minmax(180px, 1.5fr) minmax(150px, 1fr) minmax(200px, 1.2fr) minmax(150px, 1fr) 80px 120px 40px" }

  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-6 flex flex-col gap-2 bg-white dark:bg-[#121212] min-h-screen">
      
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8 animate-pulse">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="h-12 w-48 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
            <div className="h-8 w-10 bg-gray-100 dark:bg-[#27272a]/70 rounded-full mt-2" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-60 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
            <div className="h-3 w-40 bg-gray-100 dark:bg-[#27272a]/70 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-[320px] bg-gray-100 dark:bg-[#18181b] rounded-full" />
          <div className="h-10 w-10 bg-gray-100 dark:bg-[#18181b] rounded-full" />
          <div className="h-10 w-36 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[#f2f6fa] dark:bg-[#1a1e27] rounded-3xl" />
        ))}
      </div>
      <div className="w-full overflow-hidden animate-pulse pb-10">
        <div className="min-w-275">
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid gap-4 px-4 py-4 items-center bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-2xl" style={gridLayout}>
                <div className="w-10 h-10 bg-gray-100 dark:bg-[#27272a] rounded-xl" />
                <div className="space-y-2"><div className="h-2 w-16 bg-gray-200 dark:bg-[#27272a] rounded" /><div className="h-3 w-32 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                <div className="space-y-2"><div className="h-2 w-12 bg-gray-200 dark:bg-[#27272a] rounded" /><div className="h-3 w-24 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200 dark:bg-[#27272a] rounded-full shrink-0" />
                  <div className="space-y-2 w-full"><div className="h-2 w-20 bg-gray-200 dark:bg-[#27272a] rounded" /><div className="h-2 w-16 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                </div>
                <div className="space-y-2"><div className="h-2 w-16 bg-gray-200 dark:bg-[#27272a] rounded" /><div className="h-3 w-28 bg-gray-100 dark:bg-[#27272a]/50 rounded" /></div>
                <div className="space-y-2"><div className="h-2 w-12 bg-gray-200 dark:bg-[#27272a] rounded" /><div className="h-6 w-16 bg-gray-100 dark:bg-[#27272a]/50 rounded-full" /></div>
                <div className="h-8 w-24 bg-gray-100 dark:bg-[#27272a]/50 rounded-full" />
                <div className="w-6 h-6 ml-auto bg-gray-100 dark:bg-[#27272a]/50 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}