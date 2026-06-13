"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
const getFirstWeekDay = (y, m) => new Date(y, m, 1).getDay()
const isSameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

function formatDate(d) {
    if (!d) return ""
    return `${MONTHS[d.getMonth()].slice(0, 3)} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`
}

function useOutsideClick(triggerRef, popoverRef, cb) {
    useEffect(() => {
        const handler = (e) => {
            const insideTrigger = triggerRef.current && triggerRef.current.contains(e.target)
            const insidePopover = popoverRef.current && popoverRef.current.contains(e.target)
            if (!insideTrigger && !insidePopover) cb()
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [triggerRef, popoverRef, cb])
}

function Portal({ children }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null
    return createPortal(children, document.body)
}

function getPopoverPosition(triggerEl, popoverEl, viewportPadding = 16) {
    const rect = triggerEl.getBoundingClientRect()
    const popRect = popoverEl.getBoundingClientRect()
    const gap = 6
    const spaceRight = window.innerWidth - rect.right
    const spaceLeft = rect.left
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const showAbove = spaceBelow < popRect.height + gap && spaceAbove > spaceBelow

    const top = Math.max(
        viewportPadding,
        Math.min(
            showAbove ? rect.top - popRect.height - gap : rect.bottom + gap,
            window.innerHeight - popRect.height - viewportPadding
        )
    )

    let left
    if (spaceRight >= popRect.width) left = rect.left
    else if (spaceLeft >= popRect.width) left = rect.right - popRect.width
    else left = Math.max(viewportPadding, Math.min(rect.right - popRect.width, window.innerWidth - popRect.width - viewportPadding))

    return { top, left }
}

function MonthPanel({ year, month, start, end, onDayClick, onHover }) {
    const today = new Date()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstWeekDay(year, month)
    const prevDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + i + 1, type: "prev" })
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: "current" })
    while (cells.length < 35) cells.push({ day: cells.length - firstDay - daysInMonth + 1, type: "next" })

    return (
        <div className="w-full sm:w-55">
            <p className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] text-center mb-3 select-none">
                {MONTHS[month]} {year}
            </p>
            <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="h-8 flex items-center justify-center text-xs font-sfpro-medium text-[#a1a1aa] dark:text-[#71717a] select-none">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                    const y = cell.type === "prev" ? (month === 0 ? year - 1 : year)
                        : cell.type === "next" ? (month === 11 ? year + 1 : year)
                        : year
                    const m = cell.type === "prev" ? (month === 0 ? 11 : month - 1)
                        : cell.type === "next" ? (month === 11 ? 0 : month + 1)
                        : month
                    const cellDate = new Date(y, m, cell.day)
                    const isOther = cell.type !== "current"
                    const isToday = isSameDay(cellDate, today)
                    const isStart = isSameDay(cellDate, start)
                    const isEnd = isSameDay(cellDate, end)
                    const isEdge = isStart || isEnd
                    const isInRange = start && end && cellDate > start && cellDate < end

                    const edgeRounding =
                        isStart && isEnd ? "rounded-full" :
                        isStart ? "rounded-l-full rounded-r-none" :
                        isEnd ? "rounded-r-full rounded-l-none" :
                        isInRange ? "rounded-none" : "rounded-full"

                    return (
                        <div
                            key={idx}
                            className={`relative h-8 flex items-center justify-center ${isInRange && !isOther ? "bg-[#f4f4f5] dark:bg-[#27272a]" : ""}
                                ${isStart && !isEnd && !isOther ? "bg-linear-to-r from-transparent to-[#f4f4f5] dark:to-[#27272a]" : ""}
                                ${isEnd && !isStart && !isOther ? "bg-linear-to-l from-transparent to-[#f4f4f5] dark:to-[#27272a]" : ""}`}
                        >
                            <button
                                type="button"
                                onClick={() => !isOther && onDayClick(cellDate)}
                                onMouseEnter={() => !isOther && onHover(cellDate)}
                                onMouseLeave={() => onHover(null)}
                                className={`relative h-8 w-8 flex items-center justify-center text-sm transition-colors duration-150 ${edgeRounding}
                                    ${isOther ? "opacity-30 pointer-events-none text-[#a1a1aa] dark:text-[#71717a]" : ""}
                                    ${isEdge ? "bg-[#212121] dark:bg-white text-white dark:text-[#121212] font-sfpro-medium z-10" : ""}
                                    ${!isEdge && !isInRange && !isOther ? "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] cursor-pointer" : ""}
                                    ${isInRange && !isEdge ? "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8]" : ""}`}
                            >
                                {cell.day}
                                {isToday && !isEdge && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a1a1aa] dark:bg-[#71717a]" />
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function DateRangePicker({
    value,
    onChange,
    placeholder = "Pick a date range",
    disabled = false,
}) {
    const today = new Date()
    const [open, setOpen] = useState(false)
    const [start, setStart] = useState(value?.start ?? null)
    const [end, setEnd] = useState(value?.end ?? null)
    const [hover, setHover] = useState(null)
    const [position, setPosition] = useState(null)
    const [leftView, setLeftView] = useState({
        month: today.getMonth(),
        year: today.getFullYear(),
    })
    const triggerRef = useRef(null)
    const popoverRef = useRef(null)

    const rightView = {
        month: leftView.month === 11 ? 0 : leftView.month + 1,
        year: leftView.month === 11 ? leftView.year + 1 : leftView.year,
    }

    const closePopover = useCallback(() => setOpen(false), [])
    useOutsideClick(triggerRef, popoverRef, closePopover)

    const prevPage = () => setLeftView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year })
    const nextPage = () => setLeftView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year })

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !popoverRef.current) return
        setPosition(getPopoverPosition(triggerRef.current, popoverRef.current, 16))
    }, [])

    const popoverCallbackRef = useCallback((node) => {
        popoverRef.current = node
        if (node) updatePosition()
    }, [updatePosition])

    useEffect(() => {
        if (!open) return
        const handlePosition = () => updatePosition()
        window.addEventListener("resize", handlePosition)
        window.addEventListener("scroll", handlePosition, true)
        return () => {
            window.removeEventListener("resize", handlePosition)
            window.removeEventListener("scroll", handlePosition, true)
        }
    }, [open, updatePosition])

    useEffect(() => {
        if (!open) setPosition(null)
    }, [open])

    const handleDayClick = (d) => {
        if (!start || (start && end)) {
            setStart(d)
            setEnd(null)
            setHover(null)
            return
        }
        if (isSameDay(d, start)) {
            setStart(null)
            return
        }
        const s = d < start ? d : start
        const e = d < start ? start : d
        setStart(s)
        setEnd(e)
        onChange?.({ start: s, end: e })
        setOpen(false)
    }

    const effectiveEnd = end ?? (start && hover && hover > start ? hover : null)
    const label = start && end
        ? `${formatDate(start)} - ${formatDate(end)}`
        : start
        ? `${formatDate(start)} - ...`
        : null

    return (
        <div className="inline-block">
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl border-2 bg-transparent text-sm font-sfpro transition-all duration-200 min-w-50 sm:min-w-65 ${open ? "border-[#d4d4d4] dark:border-[#3f3f46]" : "border-[#EAEAEA] dark:border-[#252525] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46]"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                {label
                    ? <span className="flex-1 text-left text-[#212121] dark:text-[#f4f4f5] truncate">{label}</span>
                    : <span className="flex-1 text-left text-[#a1a1aa] dark:text-[#71717a] font-sfpro-medium">{placeholder}</span>
                }
                <Calendar className="w-4 h-4 text-[#a1a1aa] dark:text-[#71717a] shrink-0" />
            </button>

            {open && (
                <Portal>
                    <div
                        ref={popoverCallbackRef}
                        style={{
                            position: "fixed",
                            top: position ? position.top : -9999,
                            left: position ? position.left : -9999,
                            zIndex: 99999,
                            visibility: position ? "visible" : "hidden",
                        }}
                        className="bg-white dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg p-4 animate-in fade-in-0 zoom-in-95 duration-100 w-[calc(100vw-32px)] max-w-130"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={prevPage}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] dark:text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#212121] dark:hover:text-[#f4f4f5] transition-colors duration-150"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] select-none">
                                {MONTHS[leftView.month]} {leftView.year}
                                <span className="hidden sm:inline"> &nbsp;–&nbsp; {MONTHS[rightView.month]} {rightView.year}</span>
                            </span>
                            <button
                                type="button"
                                onClick={nextPage}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] dark:text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#212121] dark:hover:text-[#f4f4f5] transition-colors duration-150"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <MonthPanel year={leftView.year} month={leftView.month} start={start} end={effectiveEnd} onDayClick={handleDayClick} onHover={setHover} />
                            <div className="hidden sm:block w-px self-stretch bg-[#EAEAEA] dark:bg-[#252525]" />
                            <div className="sm:hidden w-full h-px bg-[#EAEAEA] dark:bg-[#252525]" />
                            <MonthPanel year={rightView.year} month={rightView.month} start={start} end={effectiveEnd} onDayClick={handleDayClick} onHover={setHover} />
                        </div>

                        {start && !end && (
                            <p className="mt-3 text-center text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a]">Now select an end date</p>
                        )}
                    </div>
                </Portal>
            )}
        </div>
    )
}