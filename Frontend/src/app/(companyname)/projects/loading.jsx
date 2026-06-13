export default function ProjectsLoading() {
  return (
    <div className="mx-auto py-8 px-4 flex flex-col gap-6 font-sans bg-white dark:bg-[#121212] min-h-screen animate-pulse transition-colors duration-300 w-full">
      <div className="flex justify-between items-center w-full mb-4">
        <div className="h-7 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
        <div className="h-9 w-32 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-9 w-56 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        <div className="h-9 w-9 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#18181b] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#27272a]">
            <div className="h-38 w-full bg-gray-200 dark:bg-[#27272a]" />
            <div className="p-3.5 flex flex-col gap-2.5">
              <div className="h-3.5 w-3/4 bg-gray-200 dark:bg-[#27272a] rounded-md" />
              <div className="h-3 w-full bg-gray-200 dark:bg-[#27272a] rounded-md" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-[#27272a] rounded-md" />
              <div className="h-1 w-full bg-gray-200 dark:bg-[#27272a] rounded-full mt-1" />
              <div className="flex items-center justify-between mt-0.5">
                <div className="h-6 w-14 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                <div className="h-5 w-20 bg-gray-200 dark:bg-[#27272a] rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}