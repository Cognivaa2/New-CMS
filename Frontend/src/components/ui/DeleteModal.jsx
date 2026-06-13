"use client"
import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  itemName = "",
  confirmText = "Delete",
  isLoading = false,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, isLoading])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={!isLoading ? onClose : undefined}
      />

      <div className={`relative w-full max-w-90 bg-white dark:bg-[#161616] rounded-3xl shadow-2xl p-6 transform transition-all duration-150 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 text-[#f03e3e] dark:text-red-400 mt-0.5">
            <Trash2 className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[16px] font-sfpro-bold text-gray-900 dark:text-white leading-tight">
              {itemName ? `Delete ${itemName}?` : title}
            </h3>
            <p className="mt-1.5 text-xs text-gray-700 dark:text-[#b6b6b6]">
              {itemName ? `${itemName} will be deleted. This cannot be undone.` : description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={isLoading} className="cursor-pointer px-4 py-2.5 text-sm font-sfpro-bold rounded-lg text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors disabled:opacity-50">
            Cancel
          </button>

          <button onClick={onConfirm} disabled={isLoading} className="cursor-pointer px-5 py-2.5 text-sm font-sfpro-bold rounded-lg bg-[#f03e3e] text-white hover:bg-[#e03131] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {confirmText}ing…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}