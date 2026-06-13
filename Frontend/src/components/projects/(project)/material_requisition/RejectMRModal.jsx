"use client"

import { useEffect, useState } from "react"
import { Backdrop } from "./MRFormFields"

export default function RejectMRModal({
  open,
  onClose,
  onConfirm,
  mr,
  isLoading = false,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [remarks, setRemarks] = useState("")

  useEffect(() => {
    if (open) {
      setRemarks("")
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && !isLoading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, isLoading, onClose])

  const handleClose = () => {
    if (!isLoading) onClose()
  }

  const handleConfirm = () => {
    onConfirm(remarks.trim())
  }

  if (!mounted) return null

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div
        style={{
          transitionDuration: "400ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`w-full max-w-md bg-white dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl transition-all duration-300 ${
            visible ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
        >
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-lg font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
              Reject Material Requisition
            </h2>
            <p className="text-sm font-sfpro text-gray-500 dark:text-[#71717a] mt-1">
              Provide a reason for rejecting <span className="font-sfpro-bold">{mr?.mrNumber}</span>
            </p>
          </div>

          <div className="px-6 pb-4">
            <label className="text-xs font-sfpro text-black dark:text-white mb-1.5 block">
              Rejection Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain why this MR is being rejected..."
              rows={4}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-[#27272a]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? "Rejecting..." : "Reject MR"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}