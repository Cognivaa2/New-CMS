export default function UserProfileLoading() {
  return (
    <div className="w-full mx-auto py-8 px-4 bg-white dark:bg-[#121212] min-h-screen animate-pulse transition-colors duration-300 font-sfpro">
      <div className="mb-6">
        <div className="h-7 w-32 bg-gray-200 dark:bg-[#27272a] rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] gap-6">
        <div className="flex flex-col gap-4">
          <div className="bg-[#f9f9fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-3xl p-6 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#27272a]" />
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="h-5 w-36 bg-gray-200 dark:bg-[#27272a] rounded-md" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-[#27272a] rounded-md" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-[#27272a] rounded-full mt-1" />
            </div>
            <div className="h-9 w-full bg-gray-200 dark:bg-[#27272a] rounded-lg mt-2" />
          </div>

          <div className="bg-[#f9f9fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-3xl p-6 flex flex-col gap-5">
            <div className="h-4 w-10 bg-gray-200 dark:bg-[#27272a] rounded-md" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full bg-gray-200 dark:bg-[#27272a] rounded" />
              <div className="h-3 w-5/6 bg-gray-200 dark:bg-[#27272a] rounded" />
              <div className="h-3 w-4/6 bg-gray-200 dark:bg-[#27272a] rounded" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-[#27272a] shrink-0" />
                <div className="h-3 w-40 bg-gray-200 dark:bg-[#27272a] rounded" />
              </div>
            ))}
          </div>

          <div className="bg-[#f9f9fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-3xl p-6 flex flex-col gap-3">
            <div className="h-4 w-40 bg-gray-200 dark:bg-[#27272a] rounded-md" />
            <div className="h-3 w-full bg-gray-200 dark:bg-[#27272a] rounded-full" />
            <div className="h-3 w-10 bg-gray-200 dark:bg-[#27272a] rounded-md self-end" />
          </div>
        </div>

        <div className="bg-[#f9f9fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-3xl p-6 flex flex-col gap-6">

          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-28 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
            ))}
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#27272a]"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-[#27272a] shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-3.5 w-44 bg-gray-200 dark:bg-[#27272a] rounded" />
                  <div className="h-3 w-64 bg-gray-200 dark:bg-[#27272a] rounded" />
                </div>
                <div className="h-6 w-12 bg-gray-200 dark:bg-[#27272a] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}