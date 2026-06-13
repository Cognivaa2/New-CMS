"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { BookOpen, Clock, Pencil, UserPlus, Trash2, ImageIcon, Download } from "lucide-react"  
import Tooltip from "@/components/ui/Tooltip"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import ProjectQuickPreviewModal from "@/components/projects/ProjectQuickPreviewModal"
import ManageMembersModal from "@/components/projects/ManageMembersModal"

const STATUS_CONFIG = {
    planned: { label: "Planned", dot: "#a1a1aa" },
    active: { label: "In-progress", dot: "#22c55e" },
    on_hold: { label: "On Hold", dot: "#f59e0b" },
    completed: { label: "Completed", dot: "#3b82f6" },
    cancelled: { label: "Cancelled", dot: "#ef4444" },
}
const HEALTH_CONFIG = {
    on_track: { label: "On Track" },
    delayed: { label: "Delayed" },
    over_budget: { label: "Over Budget" },
}

function AvatarStack({ users = [] }) {
    const safeUsers = Array.isArray(users) ? users : []
    const visible = safeUsers.slice(0, 3)
    const extra = safeUsers.length - 3
    return (
        <div className="flex items-center">
            {visible.map((u, i) => (
                <Tooltip content={u.name || u.email || "User"} side="bottom" key={i}>
                    <div
                        style={{ zIndex: 10 - i }}
                        className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white dark:border-[#09090b] bg-[#e5e5ea] dark:bg-[#3f3f46] flex items-center justify-center overflow-hidden -ml-2 first:ml-0 shrink-0"
                    >
                        {u?.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[9px] font-sfpro-medium text-gray-500 dark:text-[#a1a1aa]">
                                {(u?.name || u?.email || "U")[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                </Tooltip>
            ))}
            {extra > 0 && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white dark:border-[#121212] bg-gray-200 dark:bg-[#212121] flex items-center justify-center -ml-1.5 shrink-0">
                    <span className="text-[10px] sm:text-xs font-sfpro-medium text-black dark:text-white">+{extra}</span>
                </div>
            )}
        </div>
    )
}

export default function ProjectCard({ project, index = 0, onClick, onEdit, onDelete, onToggleStatus, onMembersChanged, onExport }) {  
    const router = useRouter()
    const [previewOpen, setPreviewOpen] = useState(false)
    const [membersOpen, setMembersOpen] = useState(false)

    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned
    const health = HEALTH_CONFIG[project.healthStatus]
    const cover = project.coverImage
    const pct = Math.min(100, Math.max(0, project.completionPercent || 0))
    const projectId = project._id || project.id

    const menuItems = [
        { label: "Open Project", icon: <BookOpen size={15} />, onClick: () => router.push(`/projects/${projectId}`) },
        { label: "Quick Preview", icon: <Clock size={15} />, onClick: () => setPreviewOpen(true) },
        "divider",
        { label: "Edit Details", icon: <Pencil size={15} />, onClick: () => onEdit?.(project) },
        { label: "Manage Members", icon: <UserPlus size={15} />, onClick: () => setMembersOpen(true) },
        { label: "Export Data", icon: <Download size={15} />, onClick: () => onExport?.() },
        "divider",
        { label: "Delete", icon: <Trash2 size={15} />, variant: "danger", onClick: () => onDelete?.(project) },
    ]

    const handleCardClick = (e) => {
        if (!e.target.closest(".three-dot-menu")) onClick?.(project)
        router.push(`/projects/${projectId}`)
    }

    return (
        <div onClick={handleCardClick} className="block cursor-pointer h-full">
            <article className="group h-full flex flex-col relative bg-white dark:bg-[#09090b] rounded-2xl overflow-hidden border-2 border-[#E3E3E3] dark:border-[#212121] transition-colors duration-300">
                <div className="relative overflow-hidden bg-gray-100 dark:bg-[#27272a] h-36 sm:h-40 shrink-0">
                    {cover ? (
                        <img
                            src={cover}
                            alt={project.projectName}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon
                                size={40}
                                className="text-gray-300 dark:text-[#3f3f46]"
                            />
                        </div>
                    )}
                    <div className="three-dot-menu absolute top-2 right-2 z-10">
                        <ThreeDotMenu
                            size="sm"
                            items={menuItems}
                            header={{
                                image: cover,
                                title: project.projectName,
                                subtitle: "You can do quick actions for this project from here",
                                statusColor: status.dot,
                            }}
                        />
                    </div>
                </div>

                <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
                    <div>
                        <h3 className="text-[15px] sm:text-base lg:text-lg font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] truncate mb-0.5 transition-colors duration-300">
                            {project.projectName}
                        </h3>
                        <p className="text-xs sm:text-[13px] font-sfpro text-gray-500 dark:text-[#71717a] leading-[1.45] line-clamp-2 transition-colors duration-300">
                            {project.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5">
                            <span className="text-[11px] sm:text-xs font-sfpro-medium text-gray-400 dark:text-[#a1a1aa] truncate transition-colors duration-300">
                                {project.location}
                            </span>
                            {project.clientName && (
                                <>
                                    <span className="text-gray-300 dark:text-[#52525b] text-[10px]">•</span>
                                    <span className="text-[11px] sm:text-xs font-sfpro-medium text-gray-400 dark:text-[#a1a1aa] truncate transition-colors duration-300">
                                        {project.clientName}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pt-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 h-1 bg-gray-100 dark:bg-[#27272a] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500 bg-[#212121] dark:bg-white" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] sm:text-xs lg:text-sm font-sfpro-bold text-[#212121] dark:text-gray-200 min-w-8 text-right transition-colors duration-300">
                                {pct}%
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                            <div className="shrink-0">
                                <AvatarStack users={project.assignedUsers ?? []} />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                                <span className="text-[10px] sm:text-[11px] lg:text-xs font-sfpro-medium px-2.5 py-1 rounded-full shrink-0 transition-colors duration-300 text-white bg-black dark:bg-white dark:text-[#212121]">
                                    {status.label}
                                </span>
                                {health && (
                                    <span className="text-[10px] sm:text-[11px] lg:text-xs font-sfpro-medium px-2.5 py-1 rounded-full shrink-0 transition-colors duration-300 text-white bg-black dark:bg-white dark:text-[#212121]">
                                        {health.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </article>

            <ProjectQuickPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                projectId={projectId}
            />

            <ManageMembersModal
                isOpen={membersOpen}
                onClose={() => setMembersOpen(false)}
                project={project}
                onMembersChanged={onMembersChanged}
            />
        </div>
    )
}