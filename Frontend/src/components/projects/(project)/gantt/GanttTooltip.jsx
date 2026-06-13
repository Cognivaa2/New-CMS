"use client"

import { useEffect, useState, useRef } from "react"
import { formatFullDate } from "@/app/(companyname)/projects/[projectId]/gantt/api"

const TYPE_LABELS = { phase: "Phase", task: "Task", subtask: "Sub Task" }
const TYPE_COLORS = { phase: "bg-blue-500", task: "bg-violet-500", subtask: "bg-pink-400" }

export default function GanttTooltip({ tooltip }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!tooltip || !ref.current) return

    const el = ref.current
    const rect = el.getBoundingClientRect()
    let x = tooltip.x - rect.width / 2
    let y = tooltip.y - rect.height - 8

    if (x < 8) x = 8
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8
    if (y < 8) y = tooltip.y + 40

    setPos({ x, y })
    requestAnimationFrame(() => setVisible(true))
    return () => setVisible(false)
  }, [tooltip])

  if (!tooltip) return null

  const { row } = tooltip
  const progress = Math.min(100, Math.max(0, row.progress))

  return (
    <div
      ref={ref}
      className={`fixed z-50 pointer-events-none transition-all duration-200 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2c2c2e] rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 px-4 py-3 min-w-52 max-w-72">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[row.type]}`} />
          <span className="text-[10px] font-sfpro-bold text-[#71717a] dark:text-[#52525b] uppercase tracking-wider">
            {TYPE_LABELS[row.type]}
          </span>
        </div>
        <p className="text-[13px] font-sfpro-bold text-[#09090b] dark:text-[#f4f4f5] leading-snug mb-3">
          {row.name}
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div>
            <p className="text-[9px] font-sfpro-bold text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider mb-0.5">
              Start
            </p>
            <p className="text-[11.5px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
              {formatFullDate(row.start)}
            </p>
          </div>
          <div className="w-3 h-px bg-gray-300 dark:bg-[#333]" />
          <div>
            <p className="text-[9px] font-sfpro-bold text-[#a1a1aa] dark:text-[#52525b] uppercase tracking-wider mb-0.5">
              End
            </p>
            <p className="text-[11.5px] font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
              {formatFullDate(row.end)}
            </p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-sfpro-medium text-[#71717a] dark:text-[#52525b]">Progress</span>
            <span className="text-[10px] font-sfpro-bold text-[#3f3f46] dark:text-[#a1a1aa]">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-[#27272a] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress >= 100
                  ? "bg-emerald-500"
                  : progress > 50
                  ? "bg-blue-500"
                  : progress > 0
                  ? "bg-amber-500"
                  : "bg-gray-300 dark:bg-[#333]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}