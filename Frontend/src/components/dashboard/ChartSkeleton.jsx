// components/dashboard/ChartSkeleton.jsx

export default function ChartSkeleton({ variant = "bar" }) {
  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-[1.75rem] p-6 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-2">
          <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3 w-52 bg-zinc-100 dark:bg-zinc-800/70 rounded-md" />
        </div>
        {variant === "bar" && (
          <div className="h-7 w-24 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg" />
        )}
      </div>

      {variant === "bar" && (
        <div className="h-72 w-full flex items-end gap-2 pt-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
              style={{ height: `${30 + ((i * 17) % 60)}%` }}
            />
          ))}
        </div>
      )}

      {variant === "donut" && (
        <div className="h-72 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-20 border-zinc-100 dark:border-zinc-800" />
          </div>
          <div className="space-y-2.5 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="h-3 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === "horizontal" && (
        <div className="h-72 w-full flex flex-col justify-between py-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2.5 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-md shrink-0" />
              <div
                className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"
                style={{ width: `${30 + ((i * 13) % 60)}%` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}