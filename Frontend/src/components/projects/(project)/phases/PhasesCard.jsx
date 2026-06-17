"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowRight, Eye, Pencil, Trash2, GripVertical, FolderOpen, Hand } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import Tooltip from "@/components/ui/Tooltip"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

function formatDate(dateStr) {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function PhaseCard({
  phase,
  onEdit,
  onDelete,
  onViewDocuments,
  isDragging = false,
  dragHandleProps = null,
}) {
  const params = useParams()
  const router = useRouter()
  const pct = Math.min(100, Math.max(0, phase.completionPercent || 0))
  const backgroundData = [{ value: 100 }]
  const progressData = [{ value: pct }, { value: 100 - pct }]

  const menuItems = [
    {
      label: "View details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => router.push(`/projects/${params?.projectId}/phases/${phase.id}`),
    },
    {
      label: "Edit phase",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => onEdit?.(phase),
    },
    {
      label: "View documents",
      icon: <FolderOpen className="w-4 h-4" />,
      onClick: () => onViewDocuments?.(phase),
    },
    "divider",
    {
      label: "Delete phase",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => onDelete?.(phase),
    },
  ]

  const handleCardClick = (e) => {
    if (isDragging) {
      e.preventDefault()
      return
    }
    router.push(`/projects/${params?.projectId}/phases/${phase.id}`)
  }

  return (
    <article
      onClick={handleCardClick}
      className={`group/card flex flex-col h-full transition-all duration-300 ${isDragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
    >
      <div
        className={`relative rounded-2xl p-4 flex flex-col flex-1 gap-2 dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] transition-all duration-300 ${isDragging
            ? "bg-white dark:bg-[#1f1f1f] shadow-2xl shadow-black/10 dark:shadow-black/30 scale-[1.02]"
            : "hover:bg-[#f4f4f5] dark:hover:bg-[#222222]"
          }`}
      >
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#18181b] dark:bg-[#f4f4f5] text-white dark:text-black text-xs font-sfpro-bold flex items-center justify-center shadow-sm z-10">
          {phase.sequence || "Not Available"}
        </div>

        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base lg:text-lg font-sfpro-bold text-[#09090b] dark:text-[#f4f4f5] leading-tight transition-colors duration-300 pr-8">
            {phase.phaseName}
          </h3>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 flex items-center gap-0.5 z-10"
          >
            {dragHandleProps && (
              <Tooltip content="Drag to reorder" side="top">
                <div
                  {...dragHandleProps}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${isDragging
                      ? "opacity-100 bg-[#d4d4d8] dark:bg-[#3f3f46] cursor-grabbing"
                      : "hover:bg-[#d4d4d8] dark:hover:bg-[#3f3f46] cursor-grab"
                    }`}
                  aria-label="Drag to reorder phase"
                >
                  <Hand className="w-4 h-4 text-[#71717a] dark:text-[#a1a1aa]" />
                </div>
              </Tooltip>
            )}
            <ThreeDotMenu
              items={menuItems}
              size="sm"
              header={{
                title: phase.phaseName,
                subtitle: phase.description || "Manage phase details and settings",
                statusColor: pct === 100 ? "#22c55e" : pct > 0 ? "#f59e0b" : "#a1a1aa",
              }}
            />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 mt-auto">
          <p className="text-xs font-sfpro text-[#71717a] dark:text-[#a1a1aa] transition-colors duration-300 max-w-[65%] line-clamp-2">
            {phase.description || "No description"}
          </p>
          <div className="relative shrink-0 w-15 h-15 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={backgroundData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={27}
                  startAngle={225}
                  endAngle={-45}
                  paddingAngle={0}
                  stroke="none"
                  dataKey="value"
                >
                  <Cell fill="#e4e4e7" className="dark:fill-[#3f3f46]" />
                </Pie>
                <Pie
                  data={progressData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={27}
                  startAngle={225}
                  endAngle={-45}
                  cornerRadius={10}
                  stroke="none"
                  dataKey="value"
                >
                  <Cell fill="#18181b" className="dark:fill-[#f4f4f5]" />
                  <Cell fill="transparent" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="absolute bottom-0.5 right-0 text-[11px] font-sfpro-bold text-[#09090b] dark:text-[#f4f4f5] leading-none transition-colors duration-300">
              {pct}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 m-1 px-0.5">
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          <Tooltip content="Start Date" side="bottom">
            <span className="text-xs font-sfpro-medium px-3 py-1.5 rounded-full w-fit bg-[#e4e4e7] dark:bg-[#27272a] text-[#3f3f46] dark:text-[#a1a1aa] transition-colors duration-300">
              {formatDate(phase.startDate)}
            </span>
          </Tooltip>
          <Tooltip content="End Date" side="bottom">
            <span className="text-xs font-sfpro-medium px-3 py-1.5 rounded-full w-fit bg-[#e4e4e7] dark:bg-[#27272a] text-[#3f3f46] dark:text-[#a1a1aa] transition-colors duration-300">
              {formatDate(phase.endDate)}
            </span>
          </Tooltip>
        </div>
        {/* <Tooltip content="View phase details" side="left">
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#e4e4e7] dark:bg-[#27272a] hover:bg-[#d4d4d8] dark:hover:bg-[#3f3f46] text-[#3f3f46] dark:text-[#a1a1aa] transition-colors duration-200"
            aria-label="View phase"
          >
            <ArrowRight size={16} strokeWidth={2} />
          </div>
        </Tooltip> */}
      </div>
    </article>
  )
}