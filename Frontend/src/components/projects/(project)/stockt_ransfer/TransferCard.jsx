"use client"

import {
  MoveUpRight, MoveDownLeft,
  Check, Clock, X,
  Pencil, Trash2,
  ThumbsUp, ThumbsDown,
  Loader2,
} from "lucide-react"
import Image from "next/image"
import { SmoothCorners } from "react-smooth-corners"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

function StatusBadge({ status }) {
  const config = {
    Approved: {
      wrapper: "bg-[#e8fbf0] dark:bg-green-500/10 border border-[#c1f0d0] dark:border-green-500/20",
      dot: "bg-[#16a34a]",
      icon: <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />,
      text: "text-[#15803d] dark:text-green-400",
      label: "Approved",
    },
    Draft: {
      wrapper: "bg-[#fef9ec] dark:bg-amber-500/10 border border-[#fde68a] dark:border-amber-500/20",
      dot: "bg-[#d97706]",
      icon: <Clock className="w-2.5 h-2.5 text-white" strokeWidth={3} />,
      text: "text-[#b45309] dark:text-amber-400",
      label: "Pending",
    },
    Rejected: {
      wrapper: "bg-[#fff1f1] dark:bg-red-500/10 border border-[#fecaca] dark:border-red-500/20",
      dot: "bg-[#dc2626]",
      icon: <X className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />,
      text: "text-[#dc2626] dark:text-red-400",
      label: "Rejected",
    },
  }
  const c = config[status] || config.Draft
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${c.wrapper}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.dot}`}>
        {c.icon}
      </div>
      <span className={`text-[12.5px] font-bold ${c.text}`}>{c.label}</span>
    </div>
  )
}
export default function TransferCard({
  transfer,
  onEdit,
  onDelete,
  onApprove,  
  onReject,   
  isApproving = false,
}) {
  const isOutgoing  = transfer.type === "Outgoing"
  const isDraft     = transfer.status === "Draft"
  const isApproved  = transfer.status === "Approved"
  const hasAvatar   = transfer.createdBy?.avatar
  const menuItems = [
    {
      label: "Edit transfer",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => onEdit?.(transfer),
      disabled: isApproved,
    },
    "divider",
    ...(isDraft
      ? [
          {
            label: "Approve transfer",
            icon: <ThumbsUp className="w-4 h-4" />,
            onClick: () => onApprove?.(transfer),
          },
          {
            label: "Reject transfer",
            icon: <ThumbsDown className="w-4 h-4" />,
            variant: "danger",
            onClick: () => onReject?.(transfer),
          },
          "divider",
        ]
      : []),
    {
      label: "Delete transfer",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => onDelete?.(transfer),
      disabled: isApproved,
    },
  ].filter(Boolean)

  return (
    <div
      className="group relative transition-transform duration-300 hover:-translate-y-1"
      style={{ filter: "drop-shadow(0px 4px 12px rgba(0,0,0,0.06))" }}
    >
      <SmoothCorners
        corners="8"
        borderRadius="42"
        className="
          relative bg-white dark:bg-[#18181b]
          ring-1 ring-inset ring-gray-200/80 dark:ring-white/10
          p-6 min-h-52.5 flex flex-col justify-between
        "
      >
        {isApproving && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[42px] bg-white/70 dark:bg-[#18181b]/70 backdrop-blur-[2px]">
            <Loader2 className="w-6 h-6 text-gray-500 dark:text-gray-300 animate-spin" />
          </div>
        )}
        <div>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isOutgoing
                    ? "bg-[#ed5555] text-white"
                    : "bg-[#5c69d7] text-white"
                }`}
              >
                {isOutgoing
                  ? <MoveUpRight size={15} strokeWidth={3} />
                  : <MoveDownLeft size={15} strokeWidth={3} />}
              </div>
              <span className="text-[13px] font-semibold text-gray-400 dark:text-gray-500">
                {isOutgoing ? "Outgoing Stock" : "Incoming Stock"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                {transfer.date}
              </span>
              <div
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 relative z-10 -mr-1"
              >
                <ThreeDotMenu
                  items={menuItems}
                  size="sm"
                  header={{
                    title: transfer.material,
                    subtitle: `${transfer.fromProject} → ${transfer.toProject}`,
                    statusColor:
                      isApproved ? "#22c55e"
                      : transfer.status === "Rejected" ? "#dc2626"
                      : "#d97706",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-[16px] font-bold text-[#18181b] dark:text-white mb-2">
              {transfer.material}
            </h4>
            <div className="space-y-0.5">
              <p className="text-[13.5px] text-gray-400 dark:text-gray-500">
                of quantity{" "}
                <span className="font-bold text-[#18181b] dark:text-gray-200">
                  {transfer.quantity}
                </span>
              </p>
              <p className="text-[13.5px] text-gray-400 dark:text-gray-500">
                from{" "}
                <span className="font-bold text-[#18181b] dark:text-gray-200">
                  {transfer.fromProject}
                </span>
              </p>
              <p className="text-[13.5px] text-gray-400 dark:text-gray-500">
                to{" "}
                <span className="font-bold text-[#18181b] dark:text-gray-200">
                  {transfer.toProject}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-end mt-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={transfer.status} />
            {isDraft && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onApprove?.(transfer)}
                  disabled={isApproving}
                  title="Approve"
                  className="
                    w-7 h-7 rounded-full flex items-center justify-center
                    bg-green-50 dark:bg-green-500/10
                    text-green-600 dark:text-green-400
                    hover:bg-green-100 dark:hover:bg-green-500/20
                    border border-green-200 dark:border-green-500/20
                    transition-colors disabled:opacity-40
                  "
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => onReject?.(transfer)}
                  disabled={isApproving}
                  title="Reject"
                  className="
                    w-7 h-7 rounded-full flex items-center justify-center
                    bg-red-50 dark:bg-red-500/10
                    text-red-500 dark:text-red-400
                    hover:bg-red-100 dark:hover:bg-red-500/20
                    border border-red-200 dark:border-red-500/20
                    transition-colors disabled:opacity-40
                  "
                >
                  <X className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>
            )}
          </div>

          {hasAvatar ? (
              <img
                src={transfer.createdBy.avatar}
                alt={transfer.createdBy.name || "user"}
                fill
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-[#18181b] shadow-sm"
              />
          ) : (
            <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-[#27272a] flex items-center justify-center text-[11px] font-sfpro-bold text-gray-500 dark:text-[#a1a1aa] ring-2 ring-white dark:ring-[#18181b]">
              {transfer.createdBy?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </SmoothCorners>
    </div>
  )
}