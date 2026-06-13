export default function Loading() {
    return (
        <div className="w-full mx-auto py-8 px-4 sm:px-8 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen font-sfpro animate-pulse">

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 w-full mb-8">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 sm:h-11 lg:h-12 w-56 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
                        <div className="h-7 w-9 bg-gray-100 dark:bg-[#1e1e1e] rounded-md" />
                    </div>
                    <div className="h-4 w-64 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg mt-3" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    <div className="h-10 w-full sm:w-[320px] lg:w-65 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl" />
                    <div className="h-10 w-44 bg-gray-200 dark:bg-[#27272a] rounded-xl" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-24 rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]"
                    />
                ))}
            </div>
            <div className="lg:hidden space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1.5">
                                <div className="h-4 w-36 bg-gray-200 dark:bg-[#27272a] rounded" />
                                <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                            </div>
                            <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, n) => (
                                <div key={n} className="space-y-1.5">
                                    <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                                    <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                            {Array.from({ length: 2 }).map((_, n) => (
                                <div key={n} className="space-y-1.5">
                                    <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                                    <div className="h-3.5 w-24 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
                <div className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525] px-4 py-3.5 flex gap-6">
                    {[100, 80, 70, 70, 72, 120, 110, 80, 24].map((w, i) => (
                        <div
                            key={i}
                            className="h-3 bg-gray-200 dark:bg-[#27272a] rounded"
                            style={{ width: w }}
                        />
                    ))}
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className={`px-4 py-4 flex items-center gap-6 ${
                            i < 5 ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""
                        }`}
                    >
                        <div className="h-4 w-28 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-4 w-16 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-4 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-4 w-18 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-5 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
                        <div className="flex flex-col gap-1">
                            <div className="h-3 w-24 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                            <div className="h-3 w-20 bg-gray-50 dark:bg-[#181818] rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
                            <div className="h-3.5 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        </div>
                        <div className="h-4 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-5 w-5 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}