"use client"

const STATUS_CONFIG = {
    Cleared: {
        className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
    Partial: {
        className: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    },
    Overdue: {
        className: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    },
}

const HEADERS = [
    { label: "Payable No", align: "left" },
    { label: "Source No", align: "left" },
    { label: "Invoice", align: "left" },
    { label: "Source", align: "left" },
    { label: "Total", align: "center" },
    { label: "Paid", align: "center" },
    { label: "Due Date", align: "center" },
    { label: "Status", align: "right" },
]

function StatusPill({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.Overdue
    return (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-sfpro-bold tracking-tight whitespace-nowrap ${config.className}`}>
            {status}
        </span>
    )
}

function NA() {
    return (
        <span className="text-[12px] italic text-zinc-300 dark:text-zinc-600">
            Not Available
        </span>
    )
}

function EmptyState() {
    return (
        <tr>
            <td colSpan={HEADERS.length}>
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p className="text-[14px] font-sfpro-medium text-zinc-400 dark:text-zinc-500">
                        No payables found
                    </p>
                </div>
            </td>
        </tr>
    )
}

export default function GlobalPayables({ data = [] }) {
    return (
        <div className="flex flex-col h-full font-sfpro">
            <div className="mb-5 ml-1 px-4 sm:px-0">
                <h3 className="text-[18px] sm:text-[22px] font-sfpro-bold text-zinc-900 dark:text-white leading-tight tracking-tight">
                    Global Payables
                </h3>
                <p className="text-[12px] sm:text-[13px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Comprehensive view of accounts payable universe across all projects.
                </p>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-4xl shadow-sm bg-white dark:bg-transparent overflow-hidden">
                <div className="overflow-auto max-h-100 custom-scrollbar">
                    <table className="w-full border-separate border-spacing-0 min-w-175">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#F9FAFB] dark:bg-zinc-900">
                                {HEADERS.map((h, i) => (
                                    <th
                                        key={i}
                                        className={`px-4 py-3.5 text-[11px] font-sfpro-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap border-b border-zinc-100 dark:border-zinc-800 text-${h.align}`}
                                    >
                                        {h.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                            {data.length === 0
                                ? <EmptyState />
                                : data.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="bg-white dark:bg-transparent transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                                    >
                                        <td className="px-4 py-3.5 text-[13px] font-sfpro-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                            {row.payId ?? <NA />}
                                        </td>
                                        <td className="px-4 py-3.5 text-[13px] text-zinc-600 dark:text-zinc-400 font-sfpro-medium whitespace-nowrap">
                                            {row.budget ?? <NA />}
                                        </td>
                                        <td className="px-4 py-3.5 text-[13px] text-zinc-600 dark:text-zinc-400 font-sfpro-medium">
                                            {row.invoice ?? <NA />}
                                        </td>
                                        <td className="px-4 py-3.5 text-[13px] text-zinc-600 dark:text-zinc-400 font-sfpro-medium">
                                            {row.source ?? <NA />}
                                        </td>
                                        <td className="px-4 py-3.5 text-center text-[13px] text-zinc-900 dark:text-zinc-100 font-sfpro-bold whitespace-nowrap">
                                            {row.total}
                                        </td>
                                        <td className="px-4 py-3.5 text-center text-[13px] text-zinc-600 dark:text-zinc-400 font-sfpro-medium whitespace-nowrap">
                                            {row.paid}
                                        </td>
                                        <td className="px-4 py-3.5 text-center text-[13px] text-zinc-500 dark:text-zinc-500 font-sfpro-medium whitespace-nowrap">
                                            {row.due ?? <NA />}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <StatusPill status={row.status} />
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}