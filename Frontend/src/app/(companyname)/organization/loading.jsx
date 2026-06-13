export default function OrganizationLoading() {
  return (
    <div className="w-full mx-auto py-8 px-4 flex flex-col gap-6 font-sans bg-white dark:bg-[#121212] min-h-screen animate-pulse transition-colors duration-300">
      
      <div className="flex justify-between items-center w-full mb-4">
        <div className="h-7 w-32 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
        <div className="h-9 w-20 bg-gray-200 dark:bg-[#27272a] rounded-lg"></div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full pb-8">
        <div className="flex flex-col md:flex-row items-center gap-6 w-full">
          <div className="w-35 h-35 bg-gray-200 dark:bg-[#27272a] rounded-full shrink-0"></div>
          <div className="flex flex-col gap-3 w-full max-w-md">
            <div className="h-10 w-48 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
            <div className="h-5 w-64 bg-gray-200 dark:bg-[#27272a] rounded-md mb-1"></div>
            <div className="flex gap-2 mb-2">
              <div className="h-7 w-20 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
              <div className="h-7 w-20 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
              <div className="h-7 w-16 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
            </div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-center mt-4 md:mt-0">
          <div className="h-9 w-24 bg-gray-200 dark:bg-[#27272a] rounded-full mb-3"></div>
          <div className="w-24 h-1 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 mt-4">
        <div className="bg-[#f9f9fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-3xl p-8 h-full">
          <div className="h-6 w-28 bg-gray-200 dark:bg-[#3f3f46] rounded-md mb-8"></div>
          <div className="flex flex-col gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gray-200 dark:bg-[#3f3f46] rounded-full shrink-0"></div>
                <div className={`h-4 bg-gray-200 dark:bg-[#3f3f46] rounded-md ${item === 3 ? 'w-full h-10' : 'w-48'}`}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between h-full pt-4 pb-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex flex-col gap-2">
                <div className="h-12 w-16 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-[#27272a] rounded-md"></div>
              </div>
            ))}
          </div>
          <div>
            <div className="h-6 w-36 bg-gray-200 dark:bg-[#27272a] rounded-md mb-6"></div>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-8 w-32 bg-gray-200 dark:bg-[#27272a] rounded-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}