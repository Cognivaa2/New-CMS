"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

export default function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  transfer,
  isLoading = false,
}) {
  const [remarks, setRemarks] = useState("")

  useEffect(() => {
    if (isOpen) setRemarks("")
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => !isLoading && onClose()}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#27272a] p-6 flex flex-col gap-5">

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[17px] font-sfpro-bold text-[#18181b] dark:text-white">
                Reject Transfer
              </h2>
              {transfer?.material && (
                <p className="text-[13px] font-sfpro text-gray-400 dark:text-[#71717a] mt-0.5">
                  {transfer.material}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-sfpro text-black dark:text-white mb-1.5">
              Rejection Remarks{" "}
              <span className="text-gray-400 dark:text-[#52525b] font-normal">
                (optional)
              </span>
            </label>
            <textarea
              rows={3}
              placeholder="Reason for rejection..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isLoading}
              className="
                w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro resize-none
                bg-white dark:bg-[#121212]
                border border-gray-200 dark:border-[#252525]
                text-black dark:text-white
                placeholder-gray-400 dark:placeholder-[#52525b]
                focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
              "
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="
                h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium
                border border-gray-200 dark:border-[#27272a]
                text-gray-700 dark:text-[#a1a1aa]
                hover:bg-gray-100 dark:hover:bg-[#27272a]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(remarks.trim())}
              disabled={isLoading}
              className="
                h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium
                bg-red-500 hover:bg-red-600
                text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              {isLoading ? "Rejecting..." : "Reject Transfer"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}