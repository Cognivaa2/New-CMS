"use client"
import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Eye, Pencil, Trash2, UserPlus, Power } from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import { changeUserStatus, deleteUser } from "@/app/(companyname)/users/api.jsx"
import DeleteModal from "@/components/ui/DeleteModal"

export default function UserTable({ data = [], isLoading, onEdit, onRefresh, onDelete }) {

  const [togglingId, setTogglingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const StatusBadge = ({ status }) => {
    const isActive = status === "Active"
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sfpro-medium whitespace-nowrap ${isActive
        ? "bg-[#f0faf0] dark:bg-[#1a2e1a] text-[#16a34a] dark:text-[#4ade80] border border-[#16a34a]/30"
        : "bg-[#fff1f1] dark:bg-[#2e1a1a] text-[#dc2626] dark:text-[#f87171] border border-[#dc2626]/30"
        }`}>
        {isActive
          ? <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
          : <XCircle className="w-3 h-3" strokeWidth={2} />}
        {status}
      </span>
    )
  }

  const HEADERS = ["Name", "Email", "Role", "Phone", "Status", "Created At", ""]

  async function handleToggleStatus(user) {
    if (togglingId === user.id) return
    const newStatus = user.status === "Active" ? "Inactive" : "Active"
    setTogglingId(user.id)
    try {
      await changeUserStatus(user.id, newStatus)
      toast.success(
        newStatus === "Active" ? "User Activated" : "User Deactivated",
        {
          description: `${user.name} has been ${newStatus === "Active" ? "activated" : "deactivated"} successfully.`,
        }
      )
      onRefresh?.()
    } catch (err) {
      const msg =
        err.response?.data?.description ??
        err.response?.data?.message ??
        err.message ??
        "Something went wrong."
      toast.error("Failed to Change Status", { description: msg })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast.success("User Deleted", {
        description: `${deleteTarget.name} has been deleted successfully.`,
      })
      setDeleteTarget(null)
      onDelete?.(deleteTarget.id)
    } catch (err) {
      const msg =
        err.response?.data?.description ??
        err.response?.data?.message ??
        err.message ??
        "Something went wrong."
      toast.error("Failed to Delete User", { description: msg })
    } finally {
      setIsDeleting(false)
    }
  }

  const getUserMenuItems = (user) => [
    {
      label: "Edit Details",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => onEdit?.(user),
    },
    "divider",
    {
      label: togglingId === user.id ? "Updating..." : user.status === "Active" ? "Deactivate User" : "Activate User",
      icon: <Power className="w-4 h-4" />,
      variant: user.status === "Active" ? "warning" : "success",
      onClick: () => handleToggleStatus(user),
    },
    {
      label: "Delete User",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => setDeleteTarget({ id: user.id, name: user.name }),
    },
  ]

  const getUserMenuHeader = (user) => ({
    image: user.avatar,
    title: user.name,
    subtitle: user.email,
    statusColor: user.status === "Active" ? "#22c55e" : "#ef4444",
  })

  return (
    <>
      <div className="w-full pb-10 font-sfpro">
        <div className="hidden md:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden">
          <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="w-full min-w-200 border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                  {HEADERS.map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-xs font-sfpro-medium text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-[#121212]">
                {!isLoading && data.length > 0 &&
                  data.map((user) => (
                    <tr
                      key={user.id}
                      className="group border-b border-[#f0f0f0] dark:border-[#1e1e1e] last:border-0 hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150"
                    >
                      <td className="px-5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-semibold shrink-0">
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] truncate leading-tight">{user.name}</p>
                            <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate max-w-27.5 leading-tight">{user.title}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-2 text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa] underline decoration-gray-300 dark:decoration-[#3f3f46] underline-offset-4">
                        <span className="inline-block max-w-55 truncate align-bottom">{user.email}</span>
                      </td>

                      <td className="px-5 py-2 whitespace-nowrap text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">
                        {user.role}
                      </td>

                      <td className="px-5 py-2 whitespace-nowrap text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">
                        {user.phone}
                      </td>
                      <td className="px-5 py-2 whitespace-nowrap">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-5 py-2 whitespace-nowrap text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">
                        {user.lastLogin}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div onClick={(e) => e.stopPropagation()} className="inline-block relative z-10">
                          <ThreeDotMenu
                            size="md"
                            items={getUserMenuItems(user)}
                            header={getUserMenuHeader(user)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoading && data.length === 0 && (
                  <tr className="w-full flex flex-col items-center">
                    <UserPlus className="w-16 h-16 text-gray-400 dark:text-[#71717a] mb-4" />
                    <h3 className="text-lg font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] mb-2">No Users Found</h3>
                    <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mb-6 text-center px-4">
                      Create your first user to get started
                    </p>
                  </tr>
                )}

                {isLoading &&
                  [...Array(5)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse border-b border-[#f0f0f0] dark:border-[#1e1e1e] last:border-0">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] shrink-0" />
                          <div className="flex flex-col gap-1.5">
                            <div className="w-24 h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                            <div className="w-16 h-2 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2.5"><div className="w-40 h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" /></td>
                      <td className="px-5 py-2.5"><div className="w-24 h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" /></td>
                      <td className="px-5 py-2.5"><div className="w-24 h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" /></td>
                      <td className="px-5 py-2.5"><div className="w-20 h-5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" /></td>
                      <td className="px-5 py-2.5"><div className="w-20 h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" /></td>
                      <td className="px-5 py-2.5"><div className="w-7 h-7 bg-[#f4f4f5] dark:bg-[#27272a] rounded-lg" /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {!isLoading && data.length > 0 &&
            data.map((user) => (
              <div key={user.id} className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-semibold shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] truncate leading-tight">{user.name}</p>
                      <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate leading-tight">{user.title}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 relative z-10 -mr-1 -mt-1">
                    <ThreeDotMenu
                      size="md"
                      items={getUserMenuItems(user)}
                      header={getUserMenuHeader(user)}
                    />
                  </div>
                </div>

                <p className="text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] underline decoration-gray-300 dark:decoration-[#3f3f46] underline-offset-4 break-all">
                  {user.email}
                </p>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <StatusBadge status={user.status} />
                  <span className="text-sm font-sfpro text-[#3f3f46] dark:text-[#a1a1aa]">{user.role}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-sfpro">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#a1a1aa] dark:text-[#71717a]">Phone</span>
                    <span className="text-[#3f3f46] dark:text-[#d4d4d8]">{user.phone}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#a1a1aa] dark:text-[#71717a]">Last Login</span>
                    <span className="text-[#3f3f46] dark:text-[#d4d4d8]">{user.lastLogin}</span>
                  </div>
                </div>
              </div>
            ))}

          {!isLoading && data.length === 0 && (
            <div className="py-12 text-center text-gray-500 dark:text-[#a1a1aa]">
              No records found.
            </div>
          )}

          {isLoading &&
            [...Array(5)].map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#f4f4f5] dark:bg-[#27272a]" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                      <div className="w-20 h-2 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                    </div>
                  </div>
                  <div className="w-7 h-7 bg-[#f4f4f5] dark:bg-[#27272a] rounded-lg" />
                </div>
                <div className="mt-2.5 space-y-2">
                  <div className="w-full h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                  <div className="w-24 h-5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                    <div className="h-2.5 bg-[#f4f4f5] dark:bg-[#27272a] rounded-full" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!isDeleting) setDeleteTarget(null) }}
        onConfirm={handleDelete}
        title="Delete User"
        description="This action cannot be undone and will permanently remove the user from your system."
        itemName={deleteTarget?.name}
        isLoading={isDeleting}
      />
    </>
  )
}