"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check } from "lucide-react"

function Separator() {
    return <div className="my-1 h-px bg-[#EAEAEA] dark:bg-[#252525]" />
}

export function Select({
    options = [],
    grouped = false,
    value,
    onChange,
    placeholder = "Select…",
    searchable = false,
    disabled = false,
    width = "w-full",
}) {
    const [open, setOpen] = useState(false)
    const [selected, setSelect] = useState(value ?? null)
    const [query, setQuery] = useState("")
    const [dropdownStyle, setDropdownStyle] = useState({})
    const wrapRef = useRef(null)
    const dropdownRef = useRef(null)
    const searchRef = useRef(null)

    // Must check BOTH the trigger wrapper and the portalled dropdown —
    // since the dropdown renders in document.body, clicks inside it are
    // "outside" wrapRef and would incorrectly close before handleSelect fires.
    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (wrapRef.current?.contains(e.target)) return
            if (dropdownRef.current?.contains(e.target)) return
            setOpen(false)
            setQuery("")
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    // Compute fixed position from trigger rect whenever opening
    useEffect(() => {
        if (!open || !wrapRef.current) return
        const rect = wrapRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const dropdownH = 288
        if (spaceBelow >= dropdownH || spaceBelow >= 120) {
            setDropdownStyle({ position: "fixed", top: rect.bottom + 6, left: rect.left, width: rect.width, minWidth: 160, zIndex: 9999 })
        } else {
            setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, minWidth: 160, zIndex: 9999 })
        }
        if (searchable) setTimeout(() => searchRef.current?.focus(), 50)
    }, [open, searchable])

    // Keep position in sync on scroll/resize
    useEffect(() => {
        if (!open) return
        const update = () => {
            if (!wrapRef.current) return
            const rect = wrapRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            if (spaceBelow >= 288 || spaceBelow >= 120) {
                setDropdownStyle(s => ({ ...s, top: rect.bottom + 6, left: rect.left, width: rect.width, bottom: "auto" }))
            } else {
                setDropdownStyle(s => ({ ...s, bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, top: "auto" }))
            }
        }
        window.addEventListener("scroll", update, true)
        window.addEventListener("resize", update)
        return () => {
            window.removeEventListener("scroll", update, true)
            window.removeEventListener("resize", update)
        }
    }, [open])

    useEffect(() => { if (value !== undefined) setSelect(value) }, [value])

    const displayLabel = useMemo(() => {
        if (!selected) return null
        if (grouped) {
            for (const grp of options) {
                const found = grp.items?.find(i => i.value === selected)
                if (found) return found.label
            }
        } else {
            return options.find(o => o.value === selected)?.label ?? null
        }
        return null
    }, [selected, options, grouped])

    const filter = (items) =>
        query ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())) : items

    const handleSelect = (opt) => {
        setSelect(opt.value)
        onChange?.(opt.value)
        setOpen(false)
        setQuery("")
    }

    const OptionRow = ({ item }) => (
        // onMouseDown preventDefault stops the outside-click handler from firing
        // before the onClick — ensuring handleSelect always completes
        <button type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleSelect(item)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors duration-150 text-left cursor-pointer">
            <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                {selected === item.value && <Check className="w-3.5 h-3.5 text-[#212121] dark:text-[#f4f4f5]" strokeWidth={2.5} />}
            </span>
            <span className={`flex-1 truncate ${selected === item.value ? "font-sfpro-medium text-[#212121] dark:text-[#f4f4f5]" : ""}`}>
                {item.label}
            </span>
        </button>
    )

    const dropdown = open && (
        <div ref={dropdownRef} style={dropdownStyle}
            className="bg-white dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg p-1.5 animate-in fade-in-0 zoom-in-95 duration-100 max-h-72 flex flex-col">
            {searchable && (
                <div className="px-1 pb-1.5 mb-0.5 border-b border-[#EAEAEA] dark:border-[#252525]">
                    <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search…" className="font-sfpro-medium w-full h-8 px-2.5 rounded-lg text-sm font-sfpro bg-[#f9f9f9] dark:bg-[#27272a] border border-[#EAEAEA] dark:border-[#252525] text-[#212121] dark:text-[#f4f4f5] placeholder:text-[#a1a1aa] dark:placeholder:text-[#71717a] outline-none focus:border-[#d4d4d4] dark:focus:border-[#3f3f46] transition-colors" />
                </div>
            )}
            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin" }}>
                {grouped
                    ? options.map((grp, gi) => {
                        const filtered = filter(grp.items ?? [])
                        if (!filtered.length) return null
                        return (
                            <div key={gi}>
                                {gi > 0 && <Separator />}
                                {grp.label && <p className="px-2 pt-1.5 pb-0.5 text-[11px] font-sfpro-medium uppercase tracking-widest text-[#a1a1aa] dark:text-[#71717a]">{grp.label}</p>}
                                {filtered.map(item => <OptionRow key={item.value} item={item} />)}
                            </div>
                        )
                    })
                    : filter(options).map(item => <OptionRow key={item.value} item={item} />)
                }
                {(grouped ? options.every(g => !filter(g.items ?? []).length) : !filter(options).length) && (
                    <p className="py-6 text-center text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a]">No results found</p>
                )}
            </div>
        </div>
    )

    return (
        <div ref={wrapRef} className={`relative inline-block ${width}`}>
            <button type="button" disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                className={`w-full inline-flex items-center gap-2 h-9 px-3 rounded-xl border-2 bg-transparent text-sm font-sfpro transition-all duration-200
                    ${open ? "border-[#d4d4d4] dark:border-[#3f3f46]" : "border-[#EAEAEA] dark:border-[#252525] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46]"}
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                {displayLabel
                    ? <span className="flex-1 text-left text-[#212121] dark:text-[#f4f4f5] truncate">{displayLabel}</span>
                    : <span className="flex-1 text-left text-[#a1a1aa] dark:text-[#71717a] truncate font-sfpro-medium">{placeholder}</span>
                }
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-[#a1a1aa] dark:text-[#71717a] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {typeof window !== "undefined" && createPortal(dropdown, document.body)}
        </div>
    )
}


export function ContextMenu({ trigger, items = [], align = "left" }) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    return (
        <div ref={wrapRef} className="relative inline-block">
            <div onClick={() => setOpen(o => !o)} className="cursor-pointer">{trigger}</div>
            {open && (
                <div className={`absolute top-[calc(100%+6px)] z-50 ${align === "right" ? "right-0" : "left-0"} bg-white dark:bg-[#18181b] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg p-1.5 min-w-40 animate-in fade-in-0 zoom-in-95 duration-100`}>
                    {items.map((item, i) => {
                        if (item.type === "separator") return <Separator key={i} />
                        return (
                            <button key={i} type="button" onClick={() => { item.onClick?.(); setOpen(false) }}
                                className="w-full flex items-center justify-between gap-4 px-2.5 py-1.5 rounded-lg text-sm font-sfpro text-[#3f3f46] dark:text-[#d4d4d8] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors duration-150 text-left cursor-pointer">
                                <span>{item.label}</span>
                                {(item.shortcut || item.arrow) && (
                                    <span className="flex items-center gap-1 shrink-0">
                                        {item.shortcut && <span className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a]">{item.shortcut}</span>}
                                        {item.arrow && <ChevronDown className="w-3 h-3 -rotate-90 text-[#a1a1aa] dark:text-[#71717a]" />}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}