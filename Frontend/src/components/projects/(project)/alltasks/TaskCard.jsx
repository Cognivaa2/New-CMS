"use client"

import { useState } from "react"
import { Calendar, SquareSlash, Eye, Pencil, Trash2, UserPlus, FolderOpen, Link2, Unlink } from "lucide-react"
import Tooltip from "@/components/ui/Tooltip"
import { useParams, useRouter } from "next/navigation"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import TaskManageMembersModal from "./TaskManageMembersModal"
import TaskDocumentsModal from "@/components/projects/(project)/tasks/TaskDocumentsModal"
import LinkTaskToWOModal from "@/components/projects/(project)/tasks/LinkTaskToWOModal"
import { toast } from "sonner"
import { unlinkTaskFromWO } from "@/app/(companyname)/projects/[projectId]/phases/[phaseId]/api"

function formatDate(dateStr) {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "N/A"
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getInitials(name) {
  if (!name || typeof name !== "string") return "?"
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  )
}

function UserAvatar({ user, size = 28 }) {
  const [imageError, setImageError] = useState(false)

  if (!user) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-[#f4f4f5] dark:border-[#18181b] bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]"
      >
        ?
      </div>
    )
  }

  const initials = getInitials(user.name)
  const avatarUrl = user.avatar || user.profileImage || user.image || ""
  const hasAvatar =
    avatarUrl &&
    typeof avatarUrl === "string" &&
    avatarUrl.trim() !== "" &&
    !imageError

  if (hasAvatar) {
    return (
      <img
        src={avatarUrl}
        alt={user.name || "User"}
        width={size}
        height={size}
        onError={() => setImageError(true)}
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-[#f4f4f5] dark:border-[#18181b] object-cover"
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-[#f4f4f5] dark:border-[#18181b] bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]"
    >
      {initials}
    </div>
  )
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  phaseName = "Phase",
  projectUsers = [],
  isLoadingUsers = false,
  onAssignMember,
  onUnassignMember,
  onMembersChanged,
}) {
  const params = useParams()
  const router = useRouter()

  const [membersOpen, setMembersOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [linkWOOpen, setLinkWOOpen] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const progress = task.completionPercent ?? task.progress ?? 0
  const progressColor =
    progress === 100 ? "text-[#73A464]" : "text-[#71717a] dark:text-[#a1a1aa]"

  const users = task.assignedTo || task.members || []
  const userList = Array.isArray(users) ? users : []
  const taskTitle = task.taskName || task.title || "Untitled Task"
  const phaseId = task.phaseId?._id || task.phaseId || params?.phaseId
  const displayPhaseName = task.phaseName || phaseName
  const projectId = task.projectId || params?.projectId

  const handleUnlink = async () => {
    if (isUnlinking) return
    setIsUnlinking(true)

    const toastId = toast.loading("Unlinking Work Order…")

    try {
      await unlinkTaskFromWO(projectId, phaseId, task.id)
      toast.success("Work Order Unlinked", {
        id: toastId,
        description: `Task "${taskTitle}" has been unlinked from the Work Order`,
      })
      onMembersChanged?.()
    } catch (err) {
      toast.error("Unlink Failed", {
        id: toastId,
        description: err.message || "Failed to unlink task from Work Order",
      })
    } finally {
      setIsUnlinking(false)
    }
  }

  const handleLinkSuccess = ({ wo }) => {
    toast.success("Task Linked", {
      description: `Task linked to ${wo.woNumber} successfully`,
    })
    onMembersChanged?.()
  }

  const menuItems = [
    {
      label: "View details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () =>
        router.push(
          `/projects/${params?.projectId}/phases/${phaseId}/${task.id}`
        ),
    },
    {
      label: "Edit task",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => onEdit?.(task),
    },
    {
      label: "Manage members",
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => setMembersOpen(true),
    },
    {
      label: "View documents",
      icon: <FolderOpen className="w-4 h-4" />,
      onClick: () => setDocumentsOpen(true),
    },
    ...(task.workOrderId
      ? [
        {
          label: isUnlinking ? "Unlinking…" : "Unlink Work Order",
          icon: <Unlink className="w-4 h-4" />,
          onClick: handleUnlink,
          disabled: isUnlinking,
          variant: "danger",
        },
      ]
      : [
        {
          label: "Link to Work Order",
          icon: <Link2 className="w-4 h-4" />,
          onClick: () => setLinkWOOpen(true),
        },
      ]),
    "divider",
    {
      label: "Delete task",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => onDelete?.(task),
    },
  ]

  const handleCardClick = () => {
    router.push(
      `/projects/${params?.projectId}/phases/${phaseId}/${task.id}`
    )
  }

  const handleAssign = async (user) => {
    if (onAssignMember) await onAssignMember(task, user)
  }

  const handleUnassign = async (user) => {
    if (onUnassignMember) await onUnassignMember(task, user)
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="
          group relative cursor-pointer h-full
          p-4 flex flex-col justify-between gap-4 xl:gap-5
          bg-[#fcfcfd] dark:bg-[#18181b]
          border border-[#d4d4d8] dark:border-black/60
          rounded-2xl
          shadow-[0_6px_18px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)]
          hover:shadow-[0_12px_28px_rgba(0,0,0,0.10),0_4px_10px_rgba(0,0,0,0.05)]
          transition-all duration-300
          hover:-translate-y-1 hover:scale-[1.01]
        "
      >
        <div className="flex items-start justify-between text-xs text-[#71717a] dark:text-[#a1a1aa]">
          <div className="flex items-center flex-wrap gap-3 mt-1">
            <span className="flex items-center gap-1 font-sfpro-medium">
              <SquareSlash size={16} /> {displayPhaseName}
            </span>
            <span className="flex items-center gap-1 font-sfpro-medium">
              <Calendar size={16} />
              {formatDate(task.endDate || task.date)}
            </span>
            {task.workOrderId && (
              <span className="flex items-center gap-1 font-sfpro-medium text-violet-500 dark:text-violet-400">
                <Link2 size={13} />
                WO Linked
              </span>
            )}
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 relative z-10 -mt-1 -mr-1"
          >
            <ThreeDotMenu
              items={menuItems}
              size="sm"
              header={{
                title: taskTitle,
                subtitle: `Phase: ${displayPhaseName}`,
                statusColor:
                  progress === 100
                    ? "#22c55e"
                    : progress > 0
                      ? "#f59e0b"
                      : "#a1a1aa",
              }}
            />
          </div>
        </div>

        <p className="text-sm font-sfpro font-bold text-[#18181b] dark:text-[#f4f4f5] line-clamp-3">
          {taskTitle}
        </p>

        <div className="flex items-end flex-wrap justify-between">
          <div
            className={`text-2xl lg:text-3xl font-sfpro-bold tracking-tighter ${progressColor}`}
          >
            {progress}%
          </div>

          <div className="flex -space-x-2">
            {userList.length > 0 ? (
              <>
                {userList.slice(0, 4).map((user, i) => {
                  const key =
                    user?.id || user?.keycloakId || user?._id || `user-${i}`
                  const userName = user?.name || user?.email || "Unknown"

                  return (
                    <Tooltip content={userName} side="bottom" key={key}>
                      <div>
                        <UserAvatar user={user} size={28} />
                      </div>
                    </Tooltip>
                  )
                })}

                {userList.length > 4 && (
                  <Tooltip
                    content={`+${userList.length - 4} more`}
                    side="bottom"
                  >
                    <div className="w-7 h-7 rounded-full border-2 border-[#f4f4f5] dark:border-[#18181b] bg-[#e4e4e7] dark:bg-[#3f3f46] flex items-center justify-center text-xs font-sfpro-medium text-[#71717a]">
                      +{userList.length - 4}
                    </div>
                  </Tooltip>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-400 dark:text-[#52525b] font-sfpro">
                No assignees
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskManageMembersModal
        isOpen={membersOpen}
        onClose={() => {
          setMembersOpen(false)
          onMembersChanged?.()
        }}
        task={task}
        projectUsers={projectUsers}
        isLoadingUsers={isLoadingUsers}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
      />

      <TaskDocumentsModal
        isOpen={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        task={task}
        phaseId={phaseId}
        projectId={projectId}
      />

      <LinkTaskToWOModal
        isOpen={linkWOOpen}
        onClose={() => setLinkWOOpen(false)}
        projectId={projectId}
        phaseId={phaseId}
        task={task}
        onSuccess={handleLinkSuccess}
      />
    </>
  )
}