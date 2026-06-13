"use client"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { MoreVertical } from "lucide-react"
function useOutsideClick(ref, cb) {
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb() }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [ref, cb])
}
function Portal({ children }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null
    return createPortal(children, document.body)
}
export default function ThreeDotMenu({ items = [], size = "sm", header = null }) {
    const [open, setOpen] = useState(false)
    const [visible, setVisible] = useState(false)
    const [animating, setAnimating] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: null, right: null })
    const wrapRef = useRef(null)
    const btnRef = useRef(null)
    useOutsideClick(wrapRef, () => closeMenu())
    useEffect(() => {
        if (open) {
            setVisible(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
        }
    }, [open])
    const closeMenu = () => {
        setAnimating(false)
        setTimeout(() => { setOpen(false); setVisible(false) }, 200)
    }
    const POPOVER_WIDTH = 246
    const itemCount = items.filter((i) => i !== "divider").length
    const POPOVER_HEIGHT = (header ? 80 : 0) + itemCount * 36 + 24
    const openMenu = () => {
        if (open) { closeMenu(); return }
        const rect = btnRef.current.getBoundingClientRect()
        const spaceRight = window.innerWidth - rect.right
        const spaceLeft = rect.left
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        const showAbove = spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow
        const topVal = showAbove
            ? rect.top + window.scrollY - POPOVER_HEIGHT - 6
            : rect.bottom + window.scrollY + 6
        let leftVal = null, rightVal = null
        if (spaceRight >= POPOVER_WIDTH) leftVal = rect.left + window.scrollX
        else if (spaceLeft >= POPOVER_WIDTH) rightVal = window.innerWidth - rect.right - window.scrollX
        else leftVal = Math.max(8, rect.right + window.scrollX - POPOVER_WIDTH)
        setPos({ top: topVal, left: leftVal, right: rightVal })
        setOpen(true)
    }
    const sizeMap = {
        sm: { btn: "w-7 h-7", icon: "w-4 h-4" },
        md: { btn: "w-8 h-8", icon: "w-4 h-4" },
        lg: { btn: "w-9 h-9", icon: "w-5 h-5" },
    }
    const s = sizeMap[size] ?? sizeMap.sm
    return (
        <div ref={wrapRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
            <button ref={btnRef} type="button" onClick={openMenu}
                className={`${s.btn} flex items-center justify-center cursor-pointer bg-black/30 rounded-full transition-colors duration-150`}>
                <MoreVertical className={`${s.icon} text-white`} />
            </button>
            <Portal>
                {visible && (
                    <div
                        ref={wrapRef}
                        style={{
                            position: "fixed",
                            top: pos.top,
                            ...(pos.left !== null ? { left: pos.left } : {}),
                            ...(pos.right !== null ? { right: pos.right } : {}),
                            width: POPOVER_WIDTH,
                            zIndex: 99999,
                            opacity: animating ? 1 : 0,
                            transform: animating ? "scale(1) translateY(0px)" : "scale(0.93) translateY(-8px)",
                            filter: animating ? "blur(0px)" : "blur(5px)",
                            transition: animating
                                ? "opacity 240ms cubic-bezier(0.16,1,0.3,1), transform 240ms cubic-bezier(0.16,1,0.3,1), filter 240ms cubic-bezier(0.16,1,0.3,1)"
                                : "opacity 160ms ease-in, transform 160ms ease-in, filter 160ms ease-in",
                            pointerEvents: animating ? "auto" : "none",
                        }}
                        className="bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.4)] overflow-hidden origin-top-left"
                    >
                        {header && (
                            <div style={{
                                opacity: animating ? 1 : 0,
                                transform: animating ? "translateY(0px)" : "translateY(6px)",
                                transition: "opacity 220ms cubic-bezier(0.16,1,0.3,1) 40ms, transform 220ms cubic-bezier(0.16,1,0.3,1) 40ms",
                            }}>
                                <div className="flex items-center gap-3 px-3.5 py-3.5">
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#e5e5ea] dark:bg-[#2a2a2a]">
                                            {header.image ? (
                                                <img src={header.image} alt={header.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[15px] font-semibold text-[#6b7280] dark:text-[#9ca3af]">
                                                    {(header.title || "?")[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {header.statusColor && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#141414]"
                                                style={{ backgroundColor: header.statusColor }} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13.5px] font-sfpro-medium text-[#111] dark:text-[#f5f5f5] truncate leading-tight">
                                            {header.title}
                                        </p>
                                        <p className="text-[11.5px] font-sfpro text-[#9ca3af] dark:text-[#6b7280] leading-snug mt-0.5" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                            {header.subtitle}
                                        </p>
                                    </div>
                                    {header.actions?.length > 0 && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            {header.actions.map((action, ai) => (
                                                <button key={ai} type="button" title={action.tooltip}
                                                    onClick={(e) => { e.stopPropagation(); action.onClick?.(); closeMenu() }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] dark:text-[#6b7280] hover:text-[#374151] dark:hover:text-[#d4d4d8] hover:bg-[#f3f4f6] dark:hover:bg-[#242424] transition-colors duration-100">
                                                    {action.icon}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="h-px bg-[#f0f0f0] dark:bg-[#222]" />
                            </div>
                        )}
                        <div className="p-1.5">
                            {items.map((item, i) => {
                                if (item === "divider") return <div key={`d-${i}`} className="my-1 mx-1 h-px bg-[#f0f0f0] dark:bg-[#222]" />
                                const isDanger = item.variant === "danger"
                                return (
                                    <button key={i} type="button"
                                        onClick={() => { item.onClick?.(); closeMenu() }}
                                        style={{
                                            opacity: animating ? 1 : 0,
                                            transform: animating ? "translateY(0px)" : "translateY(5px)",
                                            transition: `opacity 210ms cubic-bezier(0.16,1,0.3,1) ${60 + i * 28}ms, transform 210ms cubic-bezier(0.16,1,0.3,1) ${60 + i * 28}ms`,
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-[9px] text-[13px] font-sfpro text-left cursor-pointer transition-colors duration-100 ${isDanger ? "text-[#ef4444] hover:bg-[#fef2f2] dark:hover:bg-[#2a1515]" : "text-[#1c1c1e] dark:text-[#f0f0f0] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f]"}`}>
                                        {item.icon && (
                                            <span className={`shrink-0 flex items-center justify-center w-5 h-5 ${isDanger ? "text-[#ef4444]" : "text-[#8e8e93] dark:text-[#636366]"}`}>
                                                {item.icon}
                                            </span>
                                        )}
                                        <span className="flex-1 leading-none tracking-[-0.01em]">{item.label}</span>
                                        {item.badge && (
                                            <span className="text-[10px] font-sfpro-medium px-1.5 py-0.5 rounded-md bg-[#f0f0f0] dark:bg-[#252525] text-[#6b7280] dark:text-[#9ca3af]">
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </Portal>
        </div>
    )
}