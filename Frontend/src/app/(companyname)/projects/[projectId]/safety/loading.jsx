"use client"

export default function Loading() {
  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="h-10 w-72 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-[#1e1e1e] rounded mt-3" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-75 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
          <div className="h-11 w-40 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e]" />
        ))}
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
        <div className="h-12 bg-gray-50 dark:bg-[#18181b]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-t border-gray-100 dark:border-[#1e1e1e]" />
        ))}
      </div>
    </div>
  )
}