"use client"

import Image from "next/image"
import { Check, CheckCircle2, XCircle, Eye, Pencil, Trash2 } from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

const gridLayout = {
  gridTemplateColumns:
    "minmax(220px,2.2fr) minmax(260px,2.6fr) minmax(160px,1.6fr) minmax(120px,1.1fr) minmax(120px,1.1fr) minmax(70px,.7fr) minmax(110px,.9fr)",
}

function StatusPill({ status }) {
  const isActive = status === "Active"

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-sfpro-medium transition-colors duration-300 ${
        isActive
          ? "bg-[#e2f5e9] dark:bg-[#16a34a]/20 text-[#16a34a] dark:text-[#4ade80]"
          : "bg-[#fee2e2] dark:bg-[#dc2626]/20 text-[#dc2626] dark:text-[#f87171]"
      }`}
    >
      {isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {status}
    </span>
  )
}

function ActionCheck({ allowed }) {
  return (
    <div className="flex items-center justify-center">
      {allowed ? (
        <span className="w-7 h-7 rounded-full bg-[#e2f5e9] dark:bg-[#16a34a]/20 flex items-center justify-center transition-colors duration-300">
          <Check className="w-4 h-4 text-[#16a34a] dark:text-[#4ade80]" strokeWidth={2.5} />
        </span>
      ) : (
        <span className="w-7 h-7 rounded-full bg-gray-50 dark:bg-[#27272a]/50 flex items-center justify-center transition-colors duration-300" />
      )}
    </div>
  )
}

export default function UserTable({ data = [] }) {
  const getMenuItems = (user) => [
    { label: "View details", icon: <Eye className="w-4 h-4" />, onClick: () => console.log("View", user.name) },
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => console.log("Edit", user.name) },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => console.log("Delete", user.name) },
  ]

  return (
    <div className="w-full font-sfpro pb-10">
      
      <div className="md:hidden space-y-3">
        {data.length > 0 &&
          data.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-[#18181b] border border-gray-100/70 dark:border-[#27272a] rounded-2xl p-4 transition-colors duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate transition-colors">
                      {user.name}
                    </p>
                    <p className="text-[12px] text-gray-400 dark:text-[#a1a1aa] truncate transition-colors">
                      {user.role}
                    </p>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mt-1 -mr-1">
                  <ThreeDotMenu items={getMenuItems(user)} size="md" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div className="col-span-2 space-y-1">
                  <p className="text-[11px] text-gray-400 dark:text-[#71717a]">Email</p>
                  <a
                    href={`mailto:${user.email}`}
                    className="text-gray-700 dark:text-[#d4d4d8] underline decoration-gray-300 dark:decoration-[#3f3f46] underline-offset-4 break-all block"
                  >
                    {user.email}
                  </a>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 dark:text-[#71717a]">Assigned Role</p>
                  <p className="text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium truncate">
                    {user.assignedRole}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 dark:text-[#71717a]">Status</p>
                  <div>
                    <StatusPill status={user.status} />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 dark:text-[#71717a]">Last Login</p>
                  <p className="text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium">
                    {user.lastLogin}
                  </p>
                </div>

                <div className="space-y-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-[#71717a]">Tasks</p>
                      <p className="text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium mt-1">
                        {user.tasks}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                       <p className="text-[11px] text-gray-400 dark:text-[#71717a] mb-1">Action</p>
                       <ActionCheck allowed={user.hasActionAccess} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {data.length === 0 && (
          <div className="py-12 text-center text-gray-500 dark:text-[#a1a1aa]">
            No records found.
          </div>
        )}
      </div>

      <div className="hidden md:block w-full overflow-x-auto">
        <div className="min-w-245">
          
          <div
            className="grid gap-4 px-6 py-4 bg-[#f4f5f8] dark:bg-[#18181b] rounded-2xl transition-colors duration-300"
            style={gridLayout}
          >
            {["Name", "Email", "Assigned Role", "Status", "Last Login", "Tasks", "Actions"].map((h) => (
              <div
                key={h}
                className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]"
              >
                {h}
              </div>
            ))}
          </div>

          <div className="flex flex-col mt-2 divide-y divide-gray-100/50 dark:divide-[#27272a] transition-colors duration-300">
            
            {data.length > 0 &&
              data.map((user) => (
                <div
                  key={user.id}
                  className="grid gap-4 px-6 py-4 items-center hover:bg-gray-50/50 dark:hover:bg-[#27272a]/50 transition-colors duration-300"
                  style={gridLayout}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="rounded-full shrink-0 object-cover"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate transition-colors">
                        {user.name}
                      </span>
                      <span className="text-[12px] text-gray-400 dark:text-[#a1a1aa] truncate transition-colors">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 pr-4">
                    <a
                      href={`mailto:${user.email}`}
                      className="text-[14px] text-gray-400 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-[#f4f4f5] underline decoration-gray-300 dark:decoration-[#3f3f46] underline-offset-4 truncate block transition-colors"
                    >
                      {user.email}
                    </a>
                  </div>

                  <div className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium truncate transition-colors">
                    {user.assignedRole}
                  </div>

                  <div>
                    <StatusPill status={user.status} />
                  </div>
                  
                  <div className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium transition-colors">
                    {user.lastLogin}
                  </div>

                  <div className="text-[14px] text-gray-800 dark:text-[#d4d4d8] font-sfpro-medium transition-colors">
                    {user.tasks}
                  </div>

                  <div className="flex items-center gap-3">
                    <ActionCheck allowed={user.hasActionAccess} />
                    <div onClick={(e) => e.stopPropagation()}>
                      <ThreeDotMenu items={getMenuItems(user)} size="md" />
                    </div>
                  </div>
                </div>
              ))}

            {data.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-[#a1a1aa]">
                No records found.
              </div>
            )}
            
          </div>
        </div>
      </div>

    </div>
  )
}