"use client"

import Image from "next/image"
import { CheckCircle2, Clock, XCircle, Eye, FileText, Check } from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
const gridLayout = {
  gridTemplateColumns: "50px minmax(180px, 1.5fr) minmax(150px, 1fr) minmax(200px, 1.2fr) minmax(150px, 1fr) 80px 120px 40px"
}

function StatusPill({ status }) {
  let style = ""
  let Icon = null

  switch (status) {
    case "Resolved":
    case "Approved":
      style = "bg-[#ebfbf1] border-[#c1f0d0] text-[#16a34a] dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400"
      Icon = CheckCircle2
      break
    case "Pending":
      style = "bg-[#fdf8e6] border-[#f5e5a3] text-[#b45309] dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400"
      Icon = Clock
      break
    case "Rejected":
      style = "bg-[#fdf0f0] border-[#f5c2c2] text-[#dc2626] dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
      Icon = XCircle
      break
    default:
      style = "bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
      Icon = Clock
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] font-sfpro-bold transition-colors ${style}`}>
      <Icon className="w-4 h-4" strokeWidth={2.5} />
      {status}
    </span>
  )
}

function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 dark:bg-[#27272a] text-gray-600 dark:text-gray-300 text-[12px] font-sfpro-bold">
      {priority}
    </span>
  )
}

function UserInfo({ user }) {
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <Image src={user.avatar} alt={user.name} width={34} height={34} className="rounded-full object-cover shrink-0" />
      <div className="flex flex-col">
        <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate leading-tight">{user.name}</span>
        <span className="text-[11.5px] text-gray-500 dark:text-[#a1a1aa] truncate leading-tight mt-0.5">{user.role}</span>
      </div>
    </div>
  )
}

function RowLabel({ text }) {
  return <span className="text-[11px] text-gray-400 dark:text-[#71717a] font-sfpro-medium mb-1 tracking-wide block">{text}</span>
}

export default function ApprovalTable({ data = [] }) {
  const getMenuItems = (row) => [
    { label: "View proposal", icon: <Eye className="w-4 h-4" />, onClick: () => console.log("View", row.reqId) },
    { label: "Download doc", icon: <FileText className="w-4 h-4" />, onClick: () => console.log("Download", row.reqId) }
  ]
  const getMenuHeader = (row) => ({
    title: row.reqId,
    subtitle: row.title,
    statusColor: row.status === "Resolved" ? "#22c55e" : row.status === "Rejected" ? "#ef4444" : "#eab308"
  })

  return (
    <div className="w-full font-sfpro pb-10">
      <div className="lg:hidden space-y-4">
        {data.length > 0 &&
          data.map((row) => (
            <div key={row.id} className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                   <div className="w-10 h-10 rounded-xl bg-[#eceffb] text-[#5569cd] dark:bg-[#27272a] dark:text-[#8192ed] flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </div>
                  <div className="min-w-0">
                    <RowLabel text={row.reqId} />
                    <p className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">{row.title}</p>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1">
                  <ThreeDotMenu items={getMenuItems(row)} size="sm" header={getMenuHeader(row)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                    <RowLabel text="Project" />
                    <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#d4d4d8]">{row.project}</span>
                 </div>
                 <div>
                    <RowLabel text="Created At" />
                    <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#d4d4d8]">{row.createdAt}</span>
                 </div>
              </div>
              
              <div className="mb-4">
                <UserInfo user={row.createdBy} />
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#27272a] pt-4">
                <div className="flex items-center gap-2">
                  <RowLabel text="Priority" />
                  <PriorityBadge priority={row.priority} />
                </div>
                <StatusPill status={row.status} />
              </div>
            </div>
          ))}
      </div>
      <div className="hidden lg:block w-full overflow-x-auto">
        <div className="w-full flex flex-col gap-3">
          {data.length > 0 &&
            data.map((row) => (
              <div
                key={row.id}
                className="grid gap-4 px-4 py-4 items-center bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#27272a] rounded-2xl transition-colors duration-300 shadow-sm hover:shadow-md"
                style={gridLayout}
              >
                <div className="w-10 h-10 rounded-xl bg-[#eceffb] text-[#5569cd] dark:bg-[#27272a] dark:text-[#8192ed] flex items-center justify-center">
                  <Check className="w-5 h-5" strokeWidth={3} />
                </div>
                <div className="flex flex-col pr-2">
                  <RowLabel text={row.reqId} />
                  <span className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">
                    {row.title}
                  </span>
                </div>
                <div className="flex flex-col pr-2">
                  <RowLabel text="Project" />
                  <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#d4d4d8] truncate">
                    {row.project}
                  </span>
                </div>
                <div>
                  <UserInfo user={row.createdBy} />
                </div>
                <div className="flex flex-col">
                  <RowLabel text="Created At" />
                  <span className="text-[13px] font-sfpro-medium text-gray-800 dark:text-[#d4d4d8]">
                    {row.createdAt}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                   <RowLabel text="Priority" />
                   <PriorityBadge priority={row.priority} />
                </div>
                <div>
                  <StatusPill status={row.status} />
                </div>
                <div className="flex items-center justify-end">
                  <div onClick={(e) => e.stopPropagation()} className="relative z-10">
                    <ThreeDotMenu items={getMenuItems(row)} size="sm" header={getMenuHeader(row)} />
                  </div>
                </div>
              </div>
            ))}

            {data.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-[#a1a1aa] bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-2xl">
                No approvals found.
              </div>
            )}
        </div>
      </div>
    </div>
  )
}