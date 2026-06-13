"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { formatDate } from "@/components/ui/DatePicker"
import { Backdrop, TaskFormContentEdit } from "./TaskFormFields"

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === "string") {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function formFromTask(task) {
  if (!task) return null
  return {
    taskName: task.taskName ?? "",
    description: task.description ?? "",
    priority: task.priority || "Medium",
    // status: task.status || "NotStarted",
    startDate: parseDate(task.startDate),
    endDate: parseDate(task.endDate),
  }
}

export default function EditTaskModal({
  open,
  onClose,
  onSave,
  task,
  isEditLoading = false,
  phaseStartDate = null,
  phaseEndDate = null,
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
      const t = setTimeout(() => { setMounted(false); setForm(null) }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open || !task) return
    setForm(formFromTask(task))
  }, [open, task])

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open && !submitting) onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  const handleClose = () => { if (!submitting) onClose() }

  const handleSubmit = async () => {
    if (!form?.taskName?.trim()) {
      toast.error("Missing Required Fields", { description: "Task name is required." })
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
    if (phaseStartDate) {
      const ps = new Date(phaseStartDate)
      ps.setHours(0, 0, 0, 0)
      const fs = new Date(start)
      fs.setHours(0, 0, 0, 0)
      if (fs < ps) {
        toast.error("Invalid Start Date", {
          description: `Task cannot start before phase start (${formatDate(phaseStartDate)})`,
        })
        return
      }
    }
    if (phaseEndDate) {
      const pe = new Date(phaseEndDate)
      pe.setHours(23, 59, 59, 999)
      if (end > pe) {
        toast.error("Invalid End Date", {
          description: `Task cannot end after phase end (${formatDate(phaseEndDate)})`,
        })
        return
      }
    }
    setSubmitting(true)
    try { await onSave(form) } catch {} finally { setSubmitting(false) }
  }

  if (!mounted) return null
  const isFormReady = form !== null

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}>
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[65dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">Edit Task</h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">Update the task details below</p>
            </div>
          </div>
          {isEditLoading && (
            <div className="flex items-center justify-center gap-2 pb-3">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-sfpro">Loading task details...</span>
            </div>
          )}
          {isFormReady ? (
            <TaskFormContentEdit
              form={form}
              setForm={setForm}
              disabled={submitting}
              phaseStartDate={phaseStartDate}
              phaseEndDate={phaseEndDate}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                <span className="text-sm text-gray-400 font-sfpro">Loading task data...</span>
              </div>
            </div>
          )}
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button onClick={handleClose} disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || !isFormReady}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}