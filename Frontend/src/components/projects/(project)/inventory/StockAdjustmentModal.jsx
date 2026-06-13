"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import {
  createStockAdjustment,
  formatToastError,
  getCurrentUserKeycloakId,
} from "@/app/(companyname)/projects/[projectId]/inventory/api"
import { useParams } from "next/navigation"
import { Select } from "@/components/ui/DropDown"

const REASON_OPTIONS = [
  { value: "Damage", label: "Damage" },
  { value: "Wastage", label: "Wastage" },
  { value: "Correction", label: "Correction" },
  { value: "OpeningBalance", label: "Opening Balance" },
  { value: "Other", label: "Other" },
]

export default function StockAdjustmentModal({ open, onClose, item, onSuccess }) {
  const { projectId } = useParams()

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("Correction")
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)


  useEffect(() => {
    if (open) {
      setAdjustmentType("add")
      setQuantity("")
      setReason("Correction")
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
    const handler = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, submitting, onClose])


  const handleSubmit = async () => {
    if (!quantity || Number(quantity) <= 0) {
      toast.error("Invalid quantity", {
        description: "Quantity must be a positive number.",
      })
      return
    }
    if (!item?.inventoryId) {
      toast.error("Missing item", {
        description: "No inventory item selected.",
      })
      return
    }

    const createdBy = getCurrentUserKeycloakId()
    if (!createdBy) {
      toast.error("Auth error", {
        description: "Could not determine current user.",
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        inventoryId: item.inventoryId,
        adjustmentType,
        quantity: Number(quantity),
        reason,
        createdBy,
        ...(remarks.trim() && { remarks: remarks.trim() }),
      }
      const result = await createStockAdjustment(projectId, payload)
      toast.success("Adjustment Created", {
        description: `Draft adjustment for "${item.name}" created. Submit it for approval when ready.`,
      })
      onSuccess?.(result)
      onClose()
    } catch (err) {
      toast.error("Adjustment Failed", { description: formatToastError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null


  const newStock =
    quantity && !isNaN(Number(quantity))
      ? adjustmentType === "add"
        ? (item?.currentStock || 0) + Number(quantity)
        : Math.max(0, (item?.currentStock || 0) - Number(quantity))
      : null

  return (
    <>
      <div
        onClick={() => !submitting && onClose()}
        style={{ transitionDuration: "400ms" }}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      />
      <div style={{
        transitionDuration: "1000ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}>
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[60dvh] flex flex-col">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex flex-col items-center px-8 pt-5 pb-4 shrink-0">
            <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
              Adjust Stock
            </h2>
            <p className="text-sm font-sfpro text-gray-500 dark:text-[#71717a] mt-1">
              {item?.name} — Current:{" "}
              <span className="font-sfpro-bold text-gray-800 dark:text-gray-200">
                {item?.currentStock} {item?.unit}
              </span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-24 xl:px-40 pt-4 pb-28 space-y-5" style={{ scrollbarWidth: "none" }}>
            <div>
              <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-2 block">
                Adjustment Type
              </label>
              <div className="flex gap-3">
                {[
                  {
                    type: "add",
                    label: "Add Stock",
                    icon: ArrowUp,
                    color: "text-green-600 dark:text-green-400",
                  },
                  {
                    type: "subtract",
                    label: "Remove Stock",
                    icon: ArrowDown,
                    color: "text-red-500 dark:text-red-400",
                  },
                ].map(({ type, label, icon: Icon, color }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjustmentType(type)}
                    disabled={submitting}
                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-sfpro-medium transition-all ${adjustmentType === type
                      ? "border-[#2a2a2a] dark:border-white bg-[#2a2a2a] dark:bg-white text-white dark:text-black"
                      : "border-gray-200 dark:border-[#27272a] text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${adjustmentType === type ? "" : color}`}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={submitting}
                  className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all disabled:opacity-50"
                />
                {newStock !== null && (
                  <p className="mt-1 text-[11.5px] font-sfpro text-gray-500 dark:text-[#666]">
                    Estimated stock after approval:{" "}
                    <span className="font-sfpro-bold text-gray-800 dark:text-gray-200">
                      {newStock} {item?.unit}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
                  Reason <span className="text-red-500">*</span>
                </label>
                <Select
                  options={REASON_OPTIONS}
                  value={reason}
                  onChange={setReason}
                  placeholder="Select reason"
                  width="w-full"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
                Remarks{" "}
                <span className="text-gray-400 font-sfpro text-xs">
                  (optional)
                </span>
              </label>
              <textarea
                rows={2}
                placeholder="Additional notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={submitting}
                className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all resize-none disabled:opacity-50"
              />
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1c1c1c]">
            <button
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !quantity || Number(quantity) <= 0}
              className={`cursor-pointer h-9 px-5 rounded-lg text-[13.5px] font-sfpro-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${adjustmentType === "add"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
                }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </span>
              ) : adjustmentType === "add" ? (
                "Add Stock"
              ) : (
                "Remove Stock"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}