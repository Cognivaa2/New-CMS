"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { formatDate } from "@/components/ui/DatePicker"
import { Backdrop, TaskFormContentAdd } from "./TaskFormFields"

const EMPTY_FORM = {
  taskName: "",
  description: "",
  priority: "Medium",
  startDate: null,
  endDate: null,
  assignedTo: [],
}

export default function AddTaskModal({
  open,
  onClose,
  onSave,
  projectUsers = [],
  isLoadingUsers = false,
  phaseStartDate = null,
  phaseEndDate = null,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM })
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
    if (!form.taskName?.trim()) {
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
    try {
      const payload = {
        taskName: form.taskName,
        description: form.description,
        priority: form.priority,
        startDate: form.startDate,
        endDate: form.endDate,
        assignedTo: form.assignedTo.map((user) => user.keycloakId).filter(Boolean),
      }
      await onSave(payload)
    } catch (err) {
      toast.error("Failed to create task", { description: err.message || "An error occurred." })
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
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[65dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                Add New Task
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                Define a new task and assign team members
              </p>
            </div>
          </div>
          <TaskFormContentAdd
            form={form}
            setForm={setForm}
            projectUsers={projectUsers}
            isLoadingUsers={isLoadingUsers}
            disabled={submitting}
            phaseStartDate={phaseStartDate}
            phaseEndDate={phaseEndDate}
          />
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button type="button" onClick={handleClose} disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}