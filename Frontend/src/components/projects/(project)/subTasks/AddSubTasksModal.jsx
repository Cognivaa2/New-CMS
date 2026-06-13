"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Backdrop, SubTaskFormContentAdd } from "./SubTaskFormFields"
import { formatDate } from "@/app/(companyname)/projects/[projectId]/phases/[phaseId]/[taskId]/api" 

const EMPTY_FORM = {
    title: "",
    description: "",
    startDate: null,
    endDate: null,
    assignedTo: [],
}

export default function AddSubTasksModal({
    open,
    onClose,
    onSave,
    projectUsers = [],
    isLoadingUsers = false,
    taskStartDate = null, 
    taskEndDate = null, 
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
        if (!form.title?.trim()) {
            toast.error("Missing Required Fields", { description: "SubTask title is required." })
            return
        }
        
        // Validate dates if provided
        if (form.startDate && form.endDate) {
            const start = new Date(form.startDate)
            const end = new Date(form.endDate)
            
            if (end <= start) {
                toast.error("Invalid Date Range", { description: "End date must be after start date." })
                return
            }
        }
        
        // Validate against task dates
        if (taskStartDate && form.startDate) {
            const start = new Date(form.startDate)
            const taskStart = new Date(taskStartDate)
            taskStart.setHours(0, 0, 0, 0)
            start.setHours(0, 0, 0, 0)
            
            if (start < taskStart) {
                toast.error("Invalid Start Date", { 
                    description: `Subtask cannot start before task start (${formatDate(taskStartDate)})` 
                })
                return
            }
        }
        
        if (taskEndDate && form.endDate) {
            const end = new Date(form.endDate)
            const taskEnd = new Date(taskEndDate)
            taskEnd.setHours(23, 59, 59, 999)
            
            if (end > taskEnd) {
                toast.error("Invalid End Date", { 
                    description: `Subtask cannot end after task end (${formatDate(taskEndDate)})` 
                })
                return
            }
        }

        setSubmitting(true)
        try {
            const payload = {
                title: form.title,
                description: form.description,
                startDate: form.startDate,
                endDate: form.endDate,
                assignedTo: form.assignedTo.map((user) => user.keycloakId).filter(Boolean),
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
                style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[65dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>
                    <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0 transition-colors">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Add New Sub Task
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                Define a new sub task for this task
                            </p>
                        </div>
                    </div>
                    <SubTaskFormContentAdd
                        form={form}
                        setForm={setForm}
                        projectUsers={projectUsers}
                        isLoadingUsers={isLoadingUsers}
                        disabled={submitting}
                        taskStartDate={taskStartDate} // ← Add this
                        taskEndDate={taskEndDate} // ← Add this
                    />
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
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
                            {submitting ? "Creating..." : "Create Sub Task"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}