"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Backdrop, TransferFormContentAdd } from "./TransferFormFields"

const EMPTY_FORM = {
  toProjectId: null,
  items: [
    { inventoryId: "", materialMasterId: "", materialName: "", unit: "Units", quantity: 1, availableStock: 0 },
  ],
  reason: "",
  remarks: "",
}

export default function AddTransferModal({
  open,
  onClose,
  onSave,
  projects = [],
  isLoadingProjects = false,
  inventoryItems = [],
  isLoadingInventory = false,
  fromProjectId = null,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, items: [...EMPTY_FORM.items] })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        items: [{ inventoryId: "", materialMasterId: "", materialName: "", unit: "Units", quantity: 1, availableStock: 0 }],
      })
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
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  const handleClose = () => {
    if (!submitting) onClose()
  }

  const handleSubmit = async () => {
  if (!form.toProjectId) {
    toast.error("Missing Required Fields", {
      description: "Please select a destination project.",
    })
    return
  }

  const validItems = form.items.filter(
    (item) =>
      item.inventoryId &&
      item.materialMasterId &&
      item.materialName &&       
      item.quantity > 0
  )

  if (validItems.length === 0) {
    toast.error("Missing Required Fields", {
      description: "Add at least one material with a valid quantity.",
    })
    return
  }

  const overStockItem = validItems.find(
    (item) => item.availableStock > 0 && item.quantity > item.availableStock
  )
  if (overStockItem) {
    toast.error("Insufficient Stock", {
      description: `"${overStockItem.materialName}" quantity (${overStockItem.quantity}) exceeds available stock (${overStockItem.availableStock}).`,
    })
    return
  }

  setSubmitting(true)
  try {
    const payload = {
      toProjectId: form.toProjectId,
      items: validItems.map((item) => ({
        inventoryId:      item.inventoryId,
        materialMasterId: item.materialMasterId,
        materialName:     item.materialName,   
        unit:             item.unit,          
        quantity:         item.quantity,
      })),
      reason:  form.reason  || undefined,
      remarks: form.remarks || undefined,
    }
    await onSave(payload)
  } catch (err) {
  } finally {
    setSubmitting(false)
  }
}

  if (!mounted) return null

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div
        style={{
          transitionDuration: "1000ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[75dvh] flex flex-col transition-colors duration-300">
 
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                New Stock Transfer
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                Transfer materials between projects
              </p>
            </div>
          </div>

          <TransferFormContentAdd
            form={form}
            setForm={setForm}
            projects={projects}
            isLoadingProjects={isLoadingProjects}
            inventoryItems={inventoryItems}
            isLoadingInventory={isLoadingInventory}
            fromProjectId={fromProjectId}
            disabled={submitting}
          />

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {submitting ? "Creating..." : "Create Transfer"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}