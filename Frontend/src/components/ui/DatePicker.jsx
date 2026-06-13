"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
const getFirstWeekDay = (y, m) => new Date(y, m, 1).getDay()
const isSameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

const normalizeDate = (d) => {
    if (!d) return null
    const date = d instanceof Date ? new Date(d) : new Date(d)
    if (isNaN(date.getTime())) return null
    date.setHours(0, 0, 0, 0)
    return date
}

function parseToDate(val) {
    if (!val) return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    if (typeof val === "string") {
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
    }
    return null
}

export function formatDate(d) {
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

function getPopoverPosition(triggerEl, popoverEl, viewportPadding = 8) {
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

function NavBtn({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#a1a1aa] dark:text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#212121] dark:hover:text-[#f4f4f5] transition-colors duration-150"
        >
            {children}
        </button>
    )
}

function DrillBtn({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-0.5 text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] hover:text-[#71717a] dark:hover:text-[#a1a1aa] transition-colors duration-150"
        >
            {children}
        </button>
    )
}

function Calendar_({ value, onChange, minDate, maxDate }) {
    const today = new Date()
    const minDateNorm = normalizeDate(minDate)
    const maxDateNorm = normalizeDate(maxDate)
    const initialDate = minDateNorm || value || today
    const [view, setView] = useState(() => ({ month: initialDate.getMonth(), year: initialDate.getFullYear() }))
    const [mode, setMode] = useState("days")
    const [yearBase, setYearBase] = useState(() => Math.floor(initialDate.getFullYear() / 12) * 12)
    const valueTime = value ? new Date(value).getTime() : null

    useEffect(() => {
        if (!valueTime) return               
        const nextDate = new Date(valueTime)
        setView({ month: nextDate.getMonth(), year: nextDate.getFullYear() })
        setYearBase(Math.floor(nextDate.getFullYear() / 12) * 12)
    }, [valueTime])   

    const prevMonth = () => setView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year })
    const nextMonth = () => setView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year })

    if (mode === "years") {
        const years = Array.from({ length: 12 }, (_, i) => yearBase + i)
        return (
            <div className="w-63">
                <div className="flex items-center justify-between mb-3">
                    <NavBtn onClick={() => setYearBase(b => b - 12)}><ChevronLeft className="w-3.5 h-3.5" /></NavBtn>
                    <span className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] select-none">
                        {yearBase} - {yearBase + 11}
                    </span>
                    <NavBtn onClick={() => setYearBase(b => b + 12)}><ChevronRight className="w-3.5 h-3.5" /></NavBtn>
                </div>
                <div className="grid grid-cols-3 gap-1">
                    {years.map(y => (
                        <button
                            key={y}
                            type="button"
                            onClick={() => { setView(v => ({ ...v, year: y })); setMode("months") }}
                            className={`py-1.5 rounded-lg text-sm transition-colors duration-150 ${view.year === y ? "bg-[#212121] dark:bg-white text-white dark:text-[#121212] font-sfpro-medium" : "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    if (mode === "months") {
        return (
            <div className="w-63">
                <div className="flex items-center justify-between mb-3">
                    <NavBtn onClick={() => setView(v => ({ ...v, year: v.year - 1 }))}><ChevronLeft className="w-3.5 h-3.5" /></NavBtn>
                    <DrillBtn onClick={() => setMode("years")}>
                        {view.year} <ChevronDown className="w-3 h-3" />
                    </DrillBtn>
                    <NavBtn onClick={() => setView(v => ({ ...v, year: v.year + 1 }))}><ChevronRight className="w-3.5 h-3.5" /></NavBtn>
                </div>
                <div className="grid grid-cols-3 gap-1">
                    {MONTHS.map((m, i) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => { setView(v => ({ ...v, month: i })); setMode("days") }}
                            className={`py-1.5 rounded-lg text-sm transition-colors duration-150 ${view.month === i ? "bg-[#212121] dark:bg-white text-white dark:text-[#121212] font-sfpro-medium" : "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"}`}
                        >
                            {m.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    const daysInMonth = getDaysInMonth(view.year, view.month)
    const firstDay = getFirstWeekDay(view.year, view.month)
    const prevDays = getDaysInMonth(view.year, view.month === 0 ? 11 : view.month - 1)
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + i + 1, type: "prev" })
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: "current" })
    while (cells.length < 42) cells.push({ day: cells.length - firstDay - daysInMonth + 1, type: "next" })

    return (
        <div className="w-63">
            <div className="flex items-center justify-between mb-3">
                <NavBtn onClick={prevMonth}><ChevronLeft className="w-3.5 h-3.5" /></NavBtn>
                <div className="flex items-center gap-1">
                    <DrillBtn onClick={() => setMode("months")}>
                        {MONTHS[view.month]} <ChevronDown className="w-3 h-3" />
                    </DrillBtn>
                    <DrillBtn onClick={() => setMode("years")}>
                        {view.year} <ChevronDown className="w-3 h-3" />
                    </DrillBtn>
                </div>
                <NavBtn onClick={nextMonth}><ChevronRight className="w-3.5 h-3.5" /></NavBtn>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="h-8 flex items-center justify-center text-xs font-sfpro-medium text-[#a1a1aa] dark:text-[#71717a] select-none">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                    const y = cell.type === "prev" ? (view.month === 0 ? view.year - 1 : view.year)
                        : cell.type === "next" ? (view.month === 11 ? view.year + 1 : view.year)
                        : view.year
                    const m = cell.type === "prev" ? (view.month === 0 ? 11 : view.month - 1)
                        : cell.type === "next" ? (view.month === 11 ? 0 : view.month + 1)
                        : view.month

                    const cellDate = new Date(y, m, cell.day)
                    cellDate.setHours(0, 0, 0, 0)

                    const isToday = isSameDay(cellDate, today)
                    const isSelected = isSameDay(cellDate, value)
                    const isOther = cell.type !== "current"
                    const isBeforeMin = minDateNorm && cellDate.getTime() < minDateNorm.getTime()
                    const isAfterMax = maxDateNorm && cellDate.getTime() > maxDateNorm.getTime()
                    const isDisabled = isOther || isBeforeMin || isAfterMax

                    return (
                        <button
                            key={idx}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && onChange?.(cellDate)}
                            className={`relative h-8 w-full flex items-center justify-center rounded-full text-sm transition-colors duration-150 
                                ${isDisabled ? "opacity-30 pointer-events-none text-[#a1a1aa] dark:text-[#71717a]" : ""} 
                                ${isSelected ? "bg-[#212121] dark:bg-white text-white dark:text-[#121212] font-sfpro-medium" : ""} 
                                ${!isSelected && !isDisabled ? "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] cursor-pointer" : ""}
                            `}
                        >
                            {cell.day}
                            {isToday && !isSelected && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a1a1aa] dark:bg-[#71717a]" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default function DatePicker({
    value,
    onChange,
    placeholder = "Select date",
    disabled = false,
    minDate = null,
    maxDate = null,
}) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState(() => parseToDate(value))
    const [position, setPosition] = useState(null)
    const triggerRef = useRef(null)
    const popoverRef = useRef(null)

    const closePopover = useCallback(() => setOpen(false), [])
    useOutsideClick(triggerRef, popoverRef, closePopover)

    useEffect(() => {
        setSelected(parseToDate(value))
    }, [value])

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !popoverRef.current) return
        setPosition(getPopoverPosition(triggerRef.current, popoverRef.current, 8))
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
        let resizeObserver
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(handlePosition)
            if (triggerRef.current) resizeObserver.observe(triggerRef.current)
            if (popoverRef.current) resizeObserver.observe(popoverRef.current)
        }
        return () => {
            window.removeEventListener("resize", handlePosition)
            window.removeEventListener("scroll", handlePosition, true)
            resizeObserver?.disconnect()
        }
    }, [open, updatePosition])

    useEffect(() => {
        if (!open) setPosition(null)
    }, [open])

    const handleSelect = (d) => {
        setSelected(d)
        onChange?.(d)
        setOpen(false)
    }

    return (
        <div className="inline-block">
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl border-2 bg-transparent text-sm font-sfpro transition-all duration-200 min-w-60 ${open ? "border-[#d4d4d4] dark:border-[#3f3f46]" : "border-[#EAEAEA] dark:border-[#252525] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46]"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                {selected
                    ? <span className="flex-1 text-left text-[#212121] dark:text-[#f4f4f5]">{formatDate(selected)}</span>
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
                        className="bg-white dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg p-3 animate-in fade-in-0 zoom-in-95 duration-100"
                    >
                        <Calendar_
                            value={selected}
                            onChange={handleSelect}
                            minDate={minDate}
                            maxDate={maxDate}
                        />
                    </div>
                </Portal>
            )}
        </div>
    )
}