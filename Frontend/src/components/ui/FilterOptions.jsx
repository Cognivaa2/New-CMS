"use client"
import { useState, useRef, useEffect, useMemo } from "react"
import { SlidersHorizontal, Check, X } from "lucide-react"

function useOutsideClick(ref, cb) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, cb])
}

export default function FilterOptions({
  filters = [],
  value = {},
  onChange,
  align = "left",
  label = "",
}) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [localState, setLocal] = useState({})
  const [pos, setPos] = useState({ top: 0, left: null, right: null })

  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  useOutsideClick(wrapRef, () => closePanel())

  const PANEL_WIDTH = 288   
  const PANEL_MARGIN = 8

  const computePosition = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const vw = window.innerWidth

    const top = rect.bottom + window.scrollY + 6

    let left = null
    let right = null

    if (align === "right") {
      const desiredRight = vw - rect.right - window.scrollX
      const panelLeft = vw - desiredRight - PANEL_WIDTH
      if (panelLeft < PANEL_MARGIN) {
        left = PANEL_MARGIN
      } else {
        right = Math.max(PANEL_MARGIN, desiredRight)
      }
    } else {
      const desiredLeft = rect.left + window.scrollX
      if (desiredLeft + PANEL_WIDTH > vw - PANEL_MARGIN) {
        right = PANEL_MARGIN
      } else {
        left = Math.max(PANEL_MARGIN, desiredLeft)
      }
    }

    setPos({ top, left, right })
  }

  useEffect(() => {
    if (open) {
      computePosition()
      setVisible(true)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimating(true))
      )

      const onResize = () => computePosition()
      window.addEventListener("resize", onResize)
      window.addEventListener("scroll", onResize, true)
      return () => {
        window.removeEventListener("resize", onResize)
        window.removeEventListener("scroll", onResize, true)
      }
    }
  }, [open, align])

  const closePanel = () => {
    setAnimating(false)
    setTimeout(() => {
      setOpen(false)
      setVisible(false)
    }, 200)
  }

  const allOptions = useMemo(
    () => filters.flatMap(grp => grp.options.map(opt => ({ ...opt, groupKey: grp.key }))),
    [filters]
  )
  const activeCount = useMemo(
    () => Object.values(localState).reduce((sum, arr) => sum + (arr?.length ?? 0), 0),
    [localState]
  )
  const isSelected = (groupKey, optionValue) => (localState[groupKey] ?? []).includes(optionValue)

  const toggle = (groupKey, optionValue) => {
    setLocal(prev => {
      const current = prev[groupKey] ?? []
      const next = current.includes(optionValue)
        ? current.filter(v => v !== optionValue)
        : [...current, optionValue]
      const updated = { ...prev, [groupKey]: next }
      if (!next.length) delete updated[groupKey]
      onChange?.(updated)
      return updated
    })
  }

  const clearAll = () => {
    setLocal({})
    onChange?.({})
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? closePanel() : setOpen(true)}
        className={`relative inline-flex items-center gap-2 h-9 px-3 rounded-xl border-2 bg-transparent text-sm font-sfpro transition-all duration-200 cursor-pointer ${
          open
            ? "border-[#d4d4d4] dark:border-[#3f3f46]"
            : "border-[#EAEAEA] dark:border-[#252525] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46]"
        }`}
      >
        <SlidersHorizontal className="w-4 h-4 text-[#a1a1aa] dark:text-[#71717a] shrink-0" />
        {activeCount > 0 && (
          <span className="flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-md bg-[#212121] dark:bg-white text-white dark:text-[#121212] text-[11px] font-sfpro-medium leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {visible && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: pos.top,
            ...(pos.left !== null ? { left: pos.left } : {}),
            ...(pos.right !== null ? { right: pos.right } : {}),
            width: `min(${PANEL_WIDTH}px, calc(100vw - ${PANEL_MARGIN * 2}px))`,
            opacity: animating ? 1 : 0,
            transform: animating ? "scale(1) translateY(0px)" : "scale(0.94) translateY(-6px)",
            filter: animating ? "blur(0px)" : "blur(4px)",
            transition: animating
              ? "opacity 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1), filter 220ms cubic-bezier(0.16,1,0.3,1)"
              : "opacity 160ms ease-in, transform 160ms ease-in, filter 160ms ease-in",
            pointerEvents: animating ? "auto" : "none",
            transformOrigin: align === "right" ? "top right" : "top left",
          }}
          className="z-50 bg-white dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg overflow-hidden"
        >
          <div
            style={{
              opacity: animating ? 1 : 0,
              transform: animating ? "translateY(0px)" : "translateY(5px)",
              transition: "opacity 200ms cubic-bezier(0.16,1,0.3,1) 50ms, transform 200ms cubic-bezier(0.16,1,0.3,1) 50ms",
            }}
            className="flex items-center justify-between px-4 py-3 border-b border-[#EAEAEA] dark:border-[#252525]"
          >
            <span className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5]">Filters</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] hover:text-[#212121] dark:hover:text-[#f4f4f5] transition-colors duration-150"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-95 overflow-y-auto px-2 py-2" style={{ scrollbarWidth: "thin" }}>
            {allOptions.map((opt, i) => {
              const active = isSelected(opt.groupKey, opt.value)
              return (
                <button
                  key={`${opt.groupKey}-${opt.value}`}
                  type="button"
                  onClick={() => toggle(opt.groupKey, opt.value)}
                  style={{
                    opacity: animating ? 1 : 0,
                    transform: animating ? "translateY(0px)" : "translateY(5px)",
                    transition: `opacity 200ms cubic-bezier(0.16,1,0.3,1) ${80 + i * 28}ms, transform 200ms cubic-bezier(0.16,1,0.3,1) ${80 + i * 28}ms`,
                  }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer text-left ${
                    active ? "bg-[#f4f4f5] dark:bg-[#27272a]" : "hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      active
                        ? "bg-[#212121] dark:bg-white border-[#212121] dark:border-white"
                        : "border-[#d4d4d4] dark:border-[#3f3f46] bg-transparent"
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-white dark:text-[#121212]" strokeWidth={3} />}
                  </span>
                  <span
                    className={`flex-1 ${
                      active
                        ? "font-sfpro-medium text-[#212121] dark:text-[#f4f4f5]"
                        : "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8]"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}