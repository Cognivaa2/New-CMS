export default function Loading() {
    return (
        <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen font-sfpro">
            <div className="flex flex-col gap-6 mb-8 animate-pulse">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-72 bg-gray-100 dark:bg-[#27272a] rounded-xl" />
                        <div className="h-8 w-10 bg-gray-100 dark:bg-[#27272a] rounded-lg" />
                    </div>
                    <div className="flex gap-3">
                        <div className="h-11 w-72 bg-gray-100 dark:bg-[#27272a] rounded-full" />
                        <div className="h-11 w-32 bg-gray-100 dark:bg-[#27272a] rounded-xl" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-24 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] animate-pulse"
                    />
                ))}
            </div>

            <div className="rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
                <div className="h-12 bg-gray-50 dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 border-b border-[#f0f0f0] dark:border-[#1e1e1e] bg-white dark:bg-[#121212] animate-pulse"
                    />
                ))}
            </div>
        </div>
    )
}