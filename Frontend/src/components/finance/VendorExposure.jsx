"use client"
function VendorAvatar({ name, photo }) {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")

  const palettes = [
    "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  ]
  const palette = palettes[(name?.length ?? 0) % palettes.length]

  if (photo) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover opacity-90"
          onError={(e) => {
            const parent = e.currentTarget.parentElement
            e.currentTarget.remove()
            parent.className = `w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-[14px] font-sfpro-bold border border-zinc-100 dark:border-zinc-800 select-none ${palette}`
            parent.textContent = initials || "?"
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-[14px] font-sfpro-bold border border-zinc-100 dark:border-zinc-800 select-none ${palette}`}
    >
      {initials || "?"}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <p className="text-[14px] font-sfpro-medium text-zinc-400 dark:text-zinc-500">
        No vendor data available
      </p>
    </div>
  )
}

export default function VendorExposure({ data = [] }) {
  return (
    <div className="flex flex-col h-full font-sfpro">
      <div className="mb-5">
        <h3 className="text-[20px] font-sfpro-bold text-zinc-900 dark:text-white leading-tight">
          Vendor Financial Exposure
        </h3>
        <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1 leading-snug">
          Identify vendors with the highest outstanding liabilities and payment exposure.
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {data.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white dark:bg-[#1b1b1b] border border-zinc-100 dark:border-zinc-900 p-4 rounded-2xl shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="flex items-center min-w-0 flex-1">
                  <VendorAvatar name={vendor.name} photo={vendor.photo} />

                  <div className="ml-4 flex-1 min-w-0">
                    <h4 className="text-[15px] font-sfpro-bold text-zinc-900 dark:text-white leading-none truncate">
                      {vendor.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-tight line-clamp-1">
                      {vendor.role || "Vendor"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-900 sm:mt-0 sm:pt-0 sm:border-0 sm:flex sm:items-start sm:gap-5 sm:ml-4 sm:pr-1">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[11px] text-zinc-400 font-sfpro-medium whitespace-nowrap">
                      Total Payable
                    </span>
                    <span className="text-[16px] sm:text-[18px] font-sfpro-bold text-zinc-900 dark:text-white leading-none">
                      {vendor.totalPayable}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[11px] text-zinc-400 font-sfpro-medium whitespace-nowrap">
                      Outstanding
                    </span>
                    <span className="text-[16px] sm:text-[18px] font-sfpro-bold text-zinc-900 dark:text-white leading-none">
                      {vendor.outstanding}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[11px] text-zinc-400 font-sfpro-medium whitespace-nowrap">
                      Advance Bal.
                    </span>
                    <span className="text-[16px] sm:text-[18px] font-sfpro-bold text-zinc-900 dark:text-white leading-none">
                      {vendor.advanceBalance}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}