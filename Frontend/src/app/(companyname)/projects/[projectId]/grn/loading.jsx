export default function Loading() {
  return (
    <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen font-sfpro animate-pulse">
      <div className="h-12 bg-gray-200 dark:bg-[#27272a] rounded-lg w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 dark:bg-[#27272a] rounded-2xl" />
    </div>
  )
}