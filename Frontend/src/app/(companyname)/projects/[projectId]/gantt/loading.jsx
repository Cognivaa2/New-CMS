// loading.jsx
export default function GanttLoading() {
  return (
    <div className="w-full rounded-md mx-auto py-8 px-4 bg-white dark:bg-[#121212] min-h-screen transition-colors duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="h-10 w-56 bg-gray-200 dark:bg-[#27272a] rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-gray-100 dark:bg-[#1f1f1f] rounded mt-3 animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-16 bg-gray-100 dark:bg-[#1f1f1f] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="border border-gray-200 dark:border-[#27272a] rounded-2xl overflow-hidden">
        <div className="h-12 bg-gray-50 dark:bg-[#111] border-b border-gray-200 dark:border-[#27272a] animate-pulse" />
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-11 border-b border-gray-100 dark:border-[#1a1a1a] flex animate-pulse">
            <div className="w-72 border-r border-gray-100 dark:border-[#1a1a1a] px-4 flex items-center">
              <div
                className="h-3 bg-gray-100 dark:bg-[#222] rounded"
                style={{ width: `${120 - (i % 3) * 25}px`, marginLeft: `${(i % 3) * 20}px` }}
              />
            </div>
            <div className="flex-1 px-4 flex items-center">
              <div
                className="h-5 bg-gray-100 dark:bg-[#222] rounded-full"
                style={{ width: `${60 + Math.random() * 180}px`, marginLeft: `${20 + i * 25}px` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}