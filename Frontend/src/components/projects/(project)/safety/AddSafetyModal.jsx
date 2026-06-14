"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { SafetyFormContent } from "./SafetyFormFields"

function getKeycloakId() {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("keycloakId") || ""
}

function buildInitialForm() {
    const keycloakId = getKeycloakId()
    return {
        entries: [
            {
                title: "",
                category: "Safety",
                status: "Observation",
                severity: "Low",
                inspectionDate: null,
                inspectedBy: keycloakId,
                location: "",
                description: "",
                remarks: "",
                attachmentFile: null,
            },
        ],
    }
}

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

export default function AddSafetyModal({ open, onClose, onSave, projectId }) {
    const [form, setForm] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
            setForm(buildInitialForm())
            requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            )
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
        const fn = (e) => {
            if (e.key === "Escape" && open && !submitting) onClose()
        }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [open, submitting, onClose])

    const handleSubmit = async () => {
        if (!form?.entries?.length) {
            toast.error("Add at least one entry")
            return
        }
        const hasEmptyTitle = form.entries.some((e) => !e.title?.trim())
        if (hasEmptyTitle) {
            toast.error("All entries must have a title")
            return
        }
        const hasEmptyInspector = form.entries.some((e) => !e.inspectedBy?.trim())
        if (hasEmptyInspector) {
            toast.error("Session error — please refresh and try again")
            return
        }
        const hasEmptyDate = form.entries.some((e) => !e.inspectionDate)
        if (hasEmptyDate) {
            toast.error("All entries must have an inspection date")
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
            <Backdrop visible={visible} onClose={() => !submitting && onClose()} />
            <div
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
                    }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[92dvh] lg:max-h-[70dvh] flex flex-col">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>
                    <div className="flex flex-col items-center px-8 pt-5 pb-4 shrink-0">
                        <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                            Create Safety Inspection
                        </h2>
                        <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                            Record safety and quality inspection entries
                        </p>
                    </div>

                    {!form ? (
                        <div className="flex-1 px-8 lg:px-20 xl:px-36 pt-7 pb-10 space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-[#1c1c1c] animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <SafetyFormContent
                            form={form}
                            setForm={setForm}
                            disabled={submitting}
                        />
                    )}

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#27272a]">
                        <button
                            onClick={() => !submitting && onClose()}
                            disabled={submitting}
                            className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 transition-all duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !form}
                            className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 transition-all duration-150"
                        >
                            {submitting ? "Creating…" : "Create Inspection"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}