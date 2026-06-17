const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    dot: "bg-blue-400 animate-pulse",
  },
  completed: {
    label: "Completed",
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    dot: "bg-green-400",
  },
  partial: {
    label: "Partial",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    dot: "bg-orange-400",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    dot: "bg-red-400",
  },
}

export default function StatusBadge({ status, size = "sm" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const textSize = size === "sm" ? "text-[11px]" : "text-xs"

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-sfpro-medium ${textSize} ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  )
}