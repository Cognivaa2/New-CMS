export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-black p-8 font-sfpro animate-pulse">
      <div className="max-w-400 mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="h-12 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-4 w-96 bg-zinc-100 dark:bg-zinc-900 rounded" />
          </div>
          <div className="h-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[1.75rem] shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-6 w-6 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
              </div>
              <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-4xl shadow-sm">
            <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-56 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="h-50 w-full bg-zinc-50 dark:bg-zinc-900 rounded-xl" />
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-4xl shadow-sm">
            <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-64 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="h-50 w-full flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-zinc-100 dark:bg-zinc-900" />
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-6 rounded-4xl shadow-sm">
            <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-40 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900" />
                  <div className="h-4 w-48 bg-zinc-100 dark:bg-zinc-900 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-4xl p-6 shadow-sm">
            <div className="h-5 w-56 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-72 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-4xl p-6 shadow-sm">
            <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-64 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  {[...Array(7)].map((_, j) => (
                    <div key={j} className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-4xl p-6 shadow-sm">
            <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-56 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  {[...Array(8)].map((_, j) => (
                    <div key={j} className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-4 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-4xl p-6 shadow-sm">
            <div className="h-5 w-52 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-64 bg-zinc-100 dark:bg-zinc-900 rounded mb-6" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded" />
                  </div>
                  <div className="flex gap-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-8 w-12 bg-zinc-100 dark:bg-zinc-900 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}