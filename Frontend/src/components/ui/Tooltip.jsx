"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

export default function Tooltip({ children, content, side = "right", disabled = false }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [mounted, setMounted] = useState(false)

  const triggerRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    const touch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    setIsTouchDevice(touch)
  }, [])

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const offset = 10

    const positions = {
      right: { top: rect.top + rect.height / 2, left: rect.right + offset },
      left: { top: rect.top + rect.height / 2, left: rect.left - offset },
      top: { top: rect.top - offset, left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + offset, left: rect.left + rect.width / 2 },
    }

    setCoords(positions[side])
  }

  const handleMouseEnter = () => {
    if (isTouchDevice) return
    clearTimeout(timeoutRef.current)
    updatePosition()
    timeoutRef.current = setTimeout(() => setVisible(true), 120)
  }

  const handleMouseLeave = () => {
    if (isTouchDevice) return
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  const transforms = {
    right: { base: "translateY(-50%) translateX(-4px)", visible: "translateY(-50%) translateX(0px)" },
    left: { base: "translateY(-50%) translateX(4px) translateX(-100%)", visible: "translateY(-50%) translateX(-100%)" },
    top: { base: "translateX(-50%) translateY(4px) translateY(-100%)", visible: "translateX(-50%) translateY(-100%)" },
    bottom: { base: "translateX(-50%) translateY(-4px)", visible: "translateX(-50%) translateY(0px)" },
  }

  const arrowBase = "pointer-events-none absolute w-0 h-0"
  const arrowStyles = {
    right: {
      className: `${arrowBase} top-1/2 -left-[5px]`,
      style: {
        transform: "translateY(-50%)",
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderRight: "5px solid",
      },
    },
    left: {
      className: `${arrowBase} top-1/2 -right-[5px]`,
      style: {
        transform: "translateY(-50%)",
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        borderLeft: "5px solid",
      },
    },
    top: {
      className: `${arrowBase} left-1/2 -bottom-[5px]`,
      style: {
        transform: "translateX(-50%)",
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: "5px solid",
      },
    },
    bottom: {
      className: `${arrowBase} left-1/2 -top-[5px]`,
      style: {
        transform: "translateX(-50%)",
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderBottom: "5px solid",
      },
    },
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {mounted && !disabled && !isTouchDevice && createPortal(
        <div className="font-sfpro-medium pointer-events-none fixed z-9999 text-xs font-medium whitespace-nowrap transition-all duration-150 ease-out"
          style={{
            top: coords.top,
            left: coords.left,
            transform: visible ? transforms[side].visible : transforms[side].base,
            opacity: visible ? 1 : 0,
          }}
        >
          <ArrowEl side={side} arrowStyles={arrowStyles} />
          <div className="relative px-3 py-1.5 rounded-md border shadow-md bg-white text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-700">
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function ArrowEl({ side, arrowStyles }) {
  const { className, style } = arrowStyles[side]
  const colorKey = {
    right: "borderRightColor",
    left: "borderLeftColor",
    top: "borderTopColor",
    bottom: "borderBottomColor",
  }[side]

  return (
    <>
      <span className={className}
        style={{
          ...style,
          [colorKey]: "var(--tooltip-border)",
          zIndex: 1,
        }}
      />
      <span className={className}
        style={{
          ...style,
          [colorKey]: "var(--tooltip-bg)",
          zIndex: 2,
          ...(side === "right" && { marginLeft: "1px" }),
          ...(side === "left" && { marginRight: "1px" }),
          ...(side === "top" && { marginBottom: "1px" }),
          ...(side === "bottom" && { marginTop: "1px" }),
        }}
      />

      <style>{`
        :root {
          --tooltip-bg: #ffffff;
          --tooltip-border: #e4e4e7;
        }
        .dark {
          --tooltip-bg: #18181b;
          --tooltip-border: #3f3f46;
        }
      `}</style>
    </>
  )
}