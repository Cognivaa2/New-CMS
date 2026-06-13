"use client"

import { useRef, useMemo, useState, useEffect, useCallback } from "react"
import {
  generateColumns,
  getBarPosition,
  getTodayPosition,
} from "@/app/(companyname)/projects/[projectId]/gantt/api"
import GanttTimeline from "./GanttTimeline"
import GanttRow from "./GanttRow"
import GanttTooltip from "./GanttTooltip"

const SIDEBAR_WIDTH = 300
const ROW_HEIGHT = 44

export default function GanttChart({
  rows,
  project,
  viewMode,
  collapsedIds,
  onToggleCollapse,
}) {
  const [zoom, setZoom] = useState(1)
  const [tooltip, setTooltip] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const sidebarScrollRef = useRef(null)
  const timelineScrollRef = useRef(null)
  const headerScrollRef = useRef(null)
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  const { columns, colWidth, timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const base = generateColumns(project.startDate, project.endDate, viewMode)
    return { ...base, colWidth: base.colWidth * zoom }
  }, [project, viewMode, zoom])

  const timelineWidth = columns.length * colWidth

  const todayOffset = useMemo(
    () => getTodayPosition(timelineStart, timelineEnd, totalDays, timelineWidth),
    [timelineStart, timelineEnd, totalDays, timelineWidth]
  )

  const barPositions = useMemo(() => {
    const map = {}
    rows.forEach((row) => {
      map[row.id] = getBarPosition(row, timelineStart, totalDays, timelineWidth)
    })
    return map
  }, [rows, timelineStart, totalDays, timelineWidth])

  const handleTimelineScroll = (e) => {
    const { scrollTop, scrollLeft } = e.currentTarget
    if (sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = scrollTop
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft
  }

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.closest("button")) return

    const container = timelineScrollRef.current
    if (!container) return

    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }

    setIsDragging(true)
    setTooltip(null) 
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragStateRef.current.active) return

    const container = timelineScrollRef.current
    if (!container) return

    const dx = e.clientX - dragStateRef.current.startX
    const dy = e.clientY - dragStateRef.current.startY

    container.scrollLeft = dragStateRef.current.scrollLeft - dx
    container.scrollTop = dragStateRef.current.scrollTop - dy
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current.active) return
    dragStateRef.current.active = false
    setIsDragging(false)
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    const container = timelineScrollRef.current
    if (!container) return

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom((prev) => parseFloat(Math.min(Math.max(prev + delta, 0.4), 4).toFixed(2)))
      } else if (e.shiftKey) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  useEffect(() => {
    if (todayOffset !== null && timelineScrollRef.current) {
      timelineScrollRef.current.scrollLeft = Math.max(0, todayOffset - 400)
    }
  }, [viewMode, todayOffset])

  const totalContentHeight = Math.max(rows.length * ROW_HEIGHT, 500)
  const headerHeight = viewMode !== "month" ? ROW_HEIGHT * 1.3 : ROW_HEIGHT

  return (
    <div
      className="
        relative flex overflow-hidden
        border border-gray-200 dark:border-[#27272a]
        rounded-2xl
        bg-white dark:bg-[#09090b]
        h-[calc(100vh-200px)]
      "
    >
      <div
        className="shrink-0 flex flex-col border-r border-gray-200 dark:border-[#27272a]"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div
          className="shrink-0 flex items-center px-4 bg-[#fafafa] dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-[#27272a]"
          style={{ height: headerHeight }}
        >
          <span className="text-[11px] font-sfpro-bold text-[#71717a] uppercase tracking-wider">
            Project Hierarchy
          </span>
        </div>

        <div
          ref={sidebarScrollRef}
          className="flex-1 overflow-y-scroll"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`
            .sidebar-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          <div className="sidebar-scroll">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`
                  flex items-center border-b border-gray-100 dark:border-[#1a1a1a]
                  transition-colors shrink-0
                  ${
                    row.type === "phase"
                      ? "bg-[#fafafa] dark:bg-[#111]"
                      : "bg-white dark:bg-[#09090b] hover:bg-gray-50 dark:hover:bg-[#111]"
                  }
                `}
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: `${16 + row.depth * 20}px`,
                  paddingRight: 16,
                }}
              >
                {row.hasChildren ? (
                  <button
                    onClick={() => onToggleCollapse(row.id)}
                    className="
                      mr-2 shrink-0 w-5 h-5 flex items-center justify-center
                      rounded cursor-pointer
                      hover:bg-gray-200 dark:hover:bg-zinc-800
                      transition-colors
                    "
                  >
                    <svg
                      className={`w-3 h-3 text-[#71717a] transition-transform duration-200 ${
                        collapsedIds.has(row.id) ? "" : "rotate-90"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ) : (
                  <div className="w-5 shrink-0 mr-2" />
                )}

                <div
                  className={`shrink-0 w-2 h-2 rounded-full mr-2 ${
                    row.type === "phase"
                      ? "bg-blue-500"
                      : row.type === "task"
                      ? "bg-violet-500"
                      : "bg-pink-400"
                  }`}
                />
                <span
                  className={`text-[13px] truncate ${
                    row.type === "phase"
                      ? "font-sfpro-bold text-[#09090b] dark:text-[#f4f4f5]"
                      : row.type === "task"
                      ? "font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]"
                      : "font-sfpro text-[#71717a] dark:text-[#a1a1aa]"
                  }`}
                >
                  {row.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div
          ref={headerScrollRef}
          className="shrink-0 overflow-hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div style={{ width: timelineWidth }}>
            <GanttTimeline
              columns={columns}
              colWidth={colWidth}
              viewMode={viewMode}
              height={ROW_HEIGHT}
            />
          </div>
        </div>
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          onMouseDown={handleMouseDown}
          className="flex-1 overflow-scroll select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          <style>{`
            .timeline-body::-webkit-scrollbar { display: none; }
          `}</style>

          <div
            className="timeline-body relative"
            style={{ width: timelineWidth, height: totalContentHeight }}
          >
            {columns.map((col, i) => (
              <div
                key={i}
                className={`absolute top-0 bottom-0 border-r border-gray-100 dark:border-[#1a1a1a] ${
                  col.isWeekend ? "bg-zinc-50/40 dark:bg-white/1.5" : ""
                }`}
                style={{ left: i * colWidth, width: colWidth }}
              />
            ))}

            {todayOffset !== null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: todayOffset }}
              >
                <div className="absolute inset-y-0 left-0 w-[1.5px] bg-red-500/70 dark:bg-red-400/60 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 dark:bg-red-500 text-white text-[9px] font-sfpro-bold rounded-b-md whitespace-nowrap shadow-md">
                  Today
                </div>
              </div>
            )}

            {/* Gantt bars */}
            {rows.map((row) => {
              const pos = barPositions[row.id]
              return (
                <GanttRow
                  key={row.id}
                  row={row}
                  barLeft={pos?.left}
                  barWidth={pos?.width}
                  rowHeight={ROW_HEIGHT}
                  onMouseEnter={(e, r) => {
                    if (dragStateRef.current.active) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({
                      row: r,
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {tooltip && <GanttTooltip tooltip={tooltip} />}
    </div>
  )
}