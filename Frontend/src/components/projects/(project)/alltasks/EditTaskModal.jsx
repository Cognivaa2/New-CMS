"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Select } from "@/components/ui/DropDown"
import DatePicker, { formatDate } from "@/components/ui/DatePicker"
import { fetchPhaseDates } from "@/app/(companyname)/projects/[projectId]/tasks/api"

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
]

const STATUS_OPTIONS = [
  { value: "NotStarted", label: "Not Started" },
  { value: "InProgress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Blocked", label: "Blocked" },
  { value: "OnHold", label: "On Hold" },
]

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function formFromTask(task) {
  if (!task) return null
  return {
    taskName: task.taskName || task.title || "",
    description: task.description || "",
    priority: task.priority || "Medium",
    status: task.status || "NotStarted",
    startDate: parseDate(task.startDate),
    endDate: parseDate(task.endDate || task.date),
    completionPercent: task.completionPercent || task.progress || 0,
  }
}

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

export default function EditTaskModal({
  open,
  onClose,
  onSave,
  task,
  isEditLoading = false,
  projectId,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [phaseDates, setPhaseDates] = useState({ startDate: null, endDate: null, phaseName: null })
  const [isLoadingPhaseDates, setIsLoadingPhaseDates] = useState(false)
  const phaseDatesRef = useRef(null)

  useEffect(() => {
    if (!open || !task) {
      setPhaseDates({ startDate: null, endDate: null, phaseName: null })
      return
    }

    const phaseId = task.phaseId?._id || task.phaseId
    const projId = task.projectId || projectId

    if (!phaseId || !projId) {
      console.warn("Missing phaseId or projectId for fetching phase dates")
      return
    }

    if (phaseDatesRef.current) {
      phaseDatesRef.current.abort()
    }

    const controller = new AbortController()
    phaseDatesRef.current = controller
    setIsLoadingPhaseDates(true)

    fetchPhaseDates(projId, phaseId, controller.signal)
      .then((dates) => {
        if (!controller.signal.aborted) {
          setPhaseDates(dates)
        }
      })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          console.error("Failed to fetch phase dates:", err)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingPhaseDates(false)
        }
        if (phaseDatesRef.current === controller) {
          phaseDatesRef.current = null
        }
      })

    return () => {
      controller.abort()
    }
  }, [open, task, projectId])

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setForm(null)
        setPhaseDates({ startDate: null, endDate: null, phaseName: null })
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open || !task) return
    setForm(formFromTask(task))
  }, [open, task])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  useEffect(() => {
    return () => {
      phaseDatesRef.current?.abort()
    }
  }, [])

  const handleClose = () => {
    if (!submitting) onClose()
  }

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

    if (phaseDates.startDate) {
      const phaseStart = new Date(phaseDates.startDate)
      phaseStart.setHours(0, 0, 0, 0)
      const formStart = new Date(start)
      formStart.setHours(0, 0, 0, 0)
      
      if (formStart < phaseStart) {
        toast.error("Invalid Start Date", {
          description: `Task cannot start before phase start (${formatDate(phaseDates.startDate)})`,
        })
        return
      }
    }

    if (phaseDates.endDate) {
      const phaseEnd = new Date(phaseDates.endDate)
      phaseEnd.setHours(23, 59, 59, 999)
      
      if (end > phaseEnd) {
        toast.error("Invalid End Date", {
          description: `Task cannot end after phase end (${formatDate(phaseDates.endDate)})`,
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
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
        completionPercent: form.completionPercent,
      }
      await onSave(payload)
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
  const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))

  if (!mounted) return null
  
  const isFormReady = form !== null
  const displayPhaseName = phaseDates.phaseName || task?.phaseName

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
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[70dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                Edit Task
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                {displayPhaseName ? `Phase: ${displayPhaseName}` : "Update task details"}
              </p>
            </div>
          </div>

          {(isEditLoading || isLoadingPhaseDates) && (
            <div className="flex items-center justify-center gap-2 pb-3">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-sfpro">
                {isEditLoading ? "Loading full details..." : "Loading phase constraints..."}
              </span>
            </div>
          )}
          {phaseDates.startDate && phaseDates.endDate && !isLoadingPhaseDates && (
            <div className="flex items-center justify-center pb-3">
              <div className="text-xs font-sfpro text-gray-500 dark:text-[#71717a] bg-gray-100 dark:bg-[#1a1a1a] px-3 py-1.5 rounded-full">
                Phase period: {formatDate(phaseDates.startDate)} — {formatDate(phaseDates.endDate)}
              </div>
            </div>
          )}

          {isFormReady ? (
            <div
              className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <div className="col-span-2">
                  <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                    Task Name <span className="text-red-500">*</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter task name"
                    value={form.taskName ?? ""}
                    onChange={updateField("taskName")}
                    disabled={submitting}
                    className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="col-span-1">
                  <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                    Priority
                  </div>
                  <Select
                    placeholder="Select priority"
                    options={PRIORITY_OPTIONS}
                    value={form.priority}
                    onChange={updateSelect("priority")}
                    width="w-full"
                    disabled={submitting}
                  />
                </div>
                <div className="col-span-1">
                  <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                    Status
                  </div>
                  <Select
                    placeholder="Select status"
                    options={STATUS_OPTIONS}
                    value={form.status}
                    onChange={updateSelect("status")}
                    width="w-full"
                    disabled={submitting}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </div>
                  <DatePicker
                    placeholder="Select start date"
                    value={form.startDate}
                    onChange={updateDate("startDate")}
                    minDate={phaseDates.startDate}
                    maxDate={phaseDates.endDate}
                    disabled={submitting}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </div>
                  <DatePicker
                    placeholder="Select end date"
                    value={form.endDate}
                    onChange={updateDate("endDate")}
                    minDate={form.startDate || phaseDates.startDate}
                    maxDate={phaseDates.endDate}
                    disabled={submitting}
                  />
                </div>

                <div className="col-span-2 md:col-span-4">
                  <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                    Description
                  </div>
                  <textarea
                    placeholder="Briefly describe what this task involves…"
                    rows={3}
                    value={form.description ?? ""}
                    onChange={updateField("description")}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                <span className="text-sm text-gray-400 font-sfpro">Loading task data...</span>
              </div>
            </div>
          )}
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
              disabled={submitting || !isFormReady}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}