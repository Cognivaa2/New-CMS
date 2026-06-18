// components/material-list/AddMaterialModal.js
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { MaterialFormContent } from "./MaterialFormFields"

const INITIAL = { name: "", unit: "", category: "", description: "" }

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    />
  )
}

export default function AddMaterialModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setForm(INITIAL)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => { setMounted(false); setForm(INITIAL) }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [open, submitting, onClose])

  function handleClose() {
    if (!submitting) onClose()
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error("Missing Required Fields", {
        description: "Material name is required.",
      })
      return
    }
    if (!form.unit?.trim()) {
      toast.error("Missing Required Fields", {
        description: "Unit is required.",
      })
      return
    }
    setSubmitting(true)
    try {
      await onSave(form)
    } catch {
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
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[55dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0 transition-colors">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                Add New Material
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                Add a new material to your company catalogue
              </p>
            </div>
          </div>

          <MaterialFormContent
            form={form}
            setForm={setForm}
            disabled={submitting}
          />
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {submitting ? "Creating…" : "Create Material"}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}