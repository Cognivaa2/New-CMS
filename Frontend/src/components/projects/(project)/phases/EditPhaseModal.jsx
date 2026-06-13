"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import DatePicker, { formatDate } from "@/components/ui/DatePicker"

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  )
}

function Field({ label, placeholder, type = "text", colSpan, value, onChange, disabled, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function DatePickerField({ label, placeholder, colSpan, value, onChange, required, minDate, maxDate }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <div className="w-full">
        <DatePicker
          placeholder={placeholder || `Select ${label.toLowerCase()}`}
          value={value}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    </div>
  )
}

function TextArea({ label, placeholder, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
      </div>
      <textarea
        placeholder={placeholder}
        rows={3}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }
  if (typeof val === "string") {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function formFromPhase(phase) {
  if (!phase) return null
  return {
    phaseName: phase.phaseName ?? "",
    description: phase.description ?? "",
    startDate: parseDate(phase.startDate),
    endDate: parseDate(phase.endDate),
  }
}

export default function EditPhaseModal({ 
  open, 
  onClose, 
  onSave, 
  phase, 
  isEditLoading = false,
  projectStartDate,
  projectEndDate,
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
    if (!open || !phase) return
    const formData = formFromPhase(phase)
    setForm(formData)
  }, [open, phase])

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
    if (!form?.phaseName?.trim()) {
      toast.error("Missing Required Fields", { description: "Phase name is required." })
      return
    }
    if (!form.startDate) {
      toast.error("Missing Required Fields", { description: "Start date is required." })
      return
    }
    if (!form.endDate) {
      toast.error("Missing Required Fields", { description: "End date is required." })
      return
    }
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    if (end <= start) {
      toast.error("Invalid Date Range", { description: "End date must be after start date." })
      return
    }
    if (projectStartDate) {
      const projStart = new Date(projectStartDate)
      projStart.setHours(0, 0, 0, 0)
      const formStart = new Date(start)
      formStart.setHours(0, 0, 0, 0)
      if (formStart < projStart) {
        toast.error("Invalid Start Date", { 
          description: `Phase cannot start before project start (${formatDate(projectStartDate)})` 
        })
        return
      }
    }
    if (projectEndDate) {
      const projEnd = new Date(projectEndDate)
      projEnd.setHours(23, 59, 59, 999)
      if (end > projEnd) {
        toast.error("Invalid End Date", { 
          description: `Phase cannot end after project end (${formatDate(projectEndDate)})` 
        })
        return
      }
    }
    setSubmitting(true)
    try {
      await onSave(form)
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const updateDate = (key) => (date) => {
    setForm((prev) => ({ ...prev, [key]: date }))
  }

  if (!mounted) return null

  const isFormReady = form !== null

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
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[55dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0 transition-colors">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                Edit Phase
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                Update the phase details below
              </p>
            </div>
          </div>
          {isEditLoading && (
            <div className="flex items-center justify-center gap-2 pb-3">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-sfpro">Loading phase details...</span>
            </div>
          )}
          {isFormReady ? (
            <div
              className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field
                  label="Phase Name"
                  placeholder="Foundation Work"
                  colSpan="col-span-2"
                  value={form.phaseName}
                  onChange={updateField("phaseName")}
                  disabled={submitting}
                  required
                />
                <DatePickerField
                  label="Start Date"
                  colSpan="col-span-2 md:col-span-1"
                  value={form.startDate}
                  onChange={updateDate("startDate")}
                  required
                  minDate={projectStartDate}
                  maxDate={projectEndDate}
                />
                <DatePickerField
                  label="End Date"
                  colSpan="col-span-2 md:col-span-1"
                  value={form.endDate}
                  onChange={updateDate("endDate")}
                  required
                  minDate={projectStartDate}
                  maxDate={projectEndDate}
                />
                <TextArea
                  label="Description"
                  placeholder="Briefly describe the scope and deliverables of this phase…"
                  colSpan="col-span-2 md:col-span-4"
                  value={form.description}
                  onChange={updateField("description")}
                  disabled={submitting}
                />
              </div>
              <div className="h-1" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                <span className="text-sm text-gray-400 font-sfpro">Loading phase data...</span>
              </div>
            </div>
          )}
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !isFormReady}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}