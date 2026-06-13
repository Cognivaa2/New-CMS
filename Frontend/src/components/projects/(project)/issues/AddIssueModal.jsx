"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Backdrop, IssueFormContentAdd } from "./IssueFormFields"
import { getCurrentUserKeycloakId } from "@/app/(companyname)/projects/[projectId]/issues/api"

const EMPTY_FORM = {
    title: "",
    description: "",
    issueType: "",
    priority: "medium",
    dueDate: null,
    tags: [],
    attachments: [],
}

export default function AddIssueModal({
    open,
    onClose,
    onSave,
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [form, setForm] = useState({ ...EMPTY_FORM })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setForm({ ...EMPTY_FORM })
            setMounted(true)
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )
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
        const errors = []
        if (!form.title?.trim()) errors.push("Issue title is required")
        if (!form.description?.trim()) errors.push("Description is required")
        if (!form.issueType) errors.push("Issue type is required")

        if (errors.length > 0) {
            toast.error("Missing Required Fields", {
                description: errors.join(". "),
            })
            return
        }

        if (form.title.trim().length > 300) {
            toast.error("Validation Failed", {
                description: "Title cannot exceed 300 characters",
            })
            return
        }

        setSubmitting(true)
        try {
            const createdBy = getCurrentUserKeycloakId()
            if (!createdBy) {
                toast.error("Auth Error", {
                    description: "Could not determine current user. Please refresh.",
                })
                setSubmitting(false)
                return
            }

            const payload = {
                title: form.title,
                description: form.description,
                issueType: form.issueType,
                priority: form.priority || "medium",
                dueDate: form.dueDate,
                tags: form.tags,
                attachments: form.attachments,
                createdBy,
            }
            await onSave(payload)
        } catch (err) {
            // Parent handles toast
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
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[90dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>

                    <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0 transition-colors">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Report New Issue
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                Submit a new issue for tracking and resolution
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pb-25"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <IssueFormContentAdd
                            form={form}
                            setForm={setForm}
                            disabled={submitting}
                        />
                    </div>

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
                            {submitting ? "Submitting..." : "Submit Issue"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}