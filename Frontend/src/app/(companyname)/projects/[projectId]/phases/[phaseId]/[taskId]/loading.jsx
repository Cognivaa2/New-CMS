export default function SubTasksLoading() {
    return (
        <div className="w-full rounded-md mx-auto py-8 px-4 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen transition-colors duration-300 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-80 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                        <div className="h-7 w-10 bg-gray-200 dark:bg-[#27272a] rounded-md" />
                    </div>
                    <div className="h-4 w-64 bg-gray-200 dark:bg-[#27272a] rounded-md mt-3" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    <div className="h-10 w-full sm:w-80 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-[#27272a] rounded-lg" />
                        <div className="h-10 w-28 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
                    </div>
                </div>
            </div>
            <div className="hidden md:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
                <div className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525] px-5 py-3.5">
                    <div className="flex gap-10">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-4 w-20 bg-gray-200 dark:bg-[#3f3f46] rounded" />
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-[#121212]">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-10 px-5 py-4 border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#27272a]" />
                                <div className="flex flex-col gap-1">
                                    <div className="h-4 w-24 bg-gray-200 dark:bg-[#27272a] rounded" />
                                    <div className="h-3 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                                </div>
                            </div>
                            <div className="h-4 w-48 bg-gray-200 dark:bg-[#27272a] rounded" />
                            <div className="flex -space-x-2">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div key={j} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#27272a] border-2 border-white dark:border-[#121212]" />
                                ))}
                            </div>
                            <div className="h-6 w-24 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                            <div className="h-4 w-20 bg-gray-200 dark:bg-[#27272a] rounded" />
                            <div className="h-4 w-20 bg-gray-200 dark:bg-[#27272a] rounded" />
                            <div className="h-4 w-16 bg-gray-200 dark:bg-[#27272a] rounded" />
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                                <div className="h-4 w-10 bg-gray-200 dark:bg-[#27272a] rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:hidden flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#27272a]" />
                                <div className="flex flex-col gap-1">
                                    <div className="h-4 w-24 bg-gray-200 dark:bg-[#27272a] rounded" />
                                    <div className="h-3 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                                </div>
                            </div>
                            <div className="w-6 h-6 bg-gray-200 dark:bg-[#27272a] rounded" />
                        </div>
                        <div className="h-10 w-full bg-gray-200 dark:bg-[#27272a] rounded" />
                        <div className="flex items-center justify-between">
                            <div className="h-6 w-24 bg-gray-200 dark:bg-[#27272a] rounded-full" />
                            <div className="flex -space-x-2">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div key={j} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#27272a] border-2 border-white dark:border-[#121212]" />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}