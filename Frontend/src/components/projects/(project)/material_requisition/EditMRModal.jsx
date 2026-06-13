"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Backdrop, MRFormContentEdit } from "./MRFormFields"

function formFromMR(mr) {
  if (!mr) return null
  return {
    mrNumber: mr.mrNumber || "",
    items: (mr.items || []).map((item) => ({
      inventoryId: item.inventoryId || "",
      materialMasterId: item.materialMasterId || "",
      materialName: item.materialName || "",
      unit: item.unit || "Units",
      quantity: item.quantity || 0,
      currentStock: item.currentStock || 0,
    })),
    requiredByDate: mr.requiredByDate ? new Date(mr.requiredByDate) : null,
    reason: mr.reason || "",
    remarks: mr.remarks || "",
    status: mr.status || "Draft",
  }
}

export default function EditMRModal({
  open,
  onClose,
  onSave,
  mr,
  isEditLoading = false,
  projectId,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setForm(null)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open || !mr) return
    setForm(formFromMR(mr))
  }, [open, mr])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  const handleClose = () => {
    if (!submitting) onClose()
  }


  const handleSubmit = async () => {
    if (!form) return

    const validItems = form.items.filter(
      (item) => item.inventoryId && item.quantity > 0
    )

    if (validItems.length === 0) {
      toast.error("Missing Materials", {
        description: "Add at least one material with a valid quantity.",
      })
      return
    }
    if (!form.requiredByDate) {
      toast.error("Missing Required Date", {
        description: "Please select when materials are required.",
      })
      return
    }

    setSubmitting(true)
    try {
      await onSave({
        ...form,
        items: validItems,
        requiredByDate:
          form.requiredByDate instanceof Date
            ? form.requiredByDate.toISOString()
            : new Date(form.requiredByDate).toISOString(),
      })
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  const isFormReady = form !== null
  const isApproved = mr?.status === "Approved" || mr?.status === "ConvertedToPO"

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div
        style={{
          transitionDuration: "1000ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                Edit Material Requisition
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                {isApproved
                  ? "This MR has been approved and cannot be modified"
                  : "Update the requisition details below"}
              </p>
            </div>
          </div>

          {isEditLoading && (
            <div className="flex items-center justify-center gap-2 pb-3">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-sfpro">Loading MR details...</span>
            </div>
          )}

          {isApproved && isFormReady && (
            <div className="mx-8 lg:mx-20 xl:mx-36 mb-3 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-[12.5px] font-sfpro-medium text-amber-700 dark:text-amber-400">
                Approved MRs are locked. Create a new MR if additional materials are needed.
              </p>
            </div>
          )}

          {isFormReady ? (
            <MRFormContentEdit
              form={form}
              setForm={setForm}
              disabled={submitting || isApproved}
              projectId={projectId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                <span className="text-sm text-gray-400 font-sfpro">Loading MR data...</span>
              </div>
            </div>
          )}

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            {!isApproved && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !isFormReady}
                className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}