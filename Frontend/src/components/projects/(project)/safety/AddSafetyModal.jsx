"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { SafetyFormContent } from "./SafetyFormFields"

function getKeycloakId() {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("keycloakId") || ""
}

function buildInitialForm() {
    return {
        entries: [
            {
                title: "",
                category: "Safety",
                status: "Observation",
                severity: "Low",
                inspectionDate: null,
                inspectedBy: getKeycloakId(),
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
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
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
            }, 350)
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

    const validate = useCallback(() => {
        if (!form?.entries?.length) {
            toast.error("Add at least one entry")
            return false
        }
        for (let i = 0; i < form.entries.length; i++) {
            const e = form.entries[i]
            const tag = form.entries.length > 1 ? ` in Entry #${i + 1}` : ""
            if (!e.title?.trim()) {
                toast.error(`Title is required${tag}`)
                return false
            }
            if (!e.inspectionDate) {
                toast.error(`Date is required${tag}`)
                return false
            }
            if (!e.inspectedBy?.trim()) {
                toast.error("Session error — please refresh")
                return false
            }
        }
        return true
    }, [form])

    const handleSubmit = async () => {
        if (!validate()) return
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
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    visible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[90dvh] lg:max-h-[75dvh] flex flex-col">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="px-6 pt-4 pb-3 shrink-0 text-center">
                        <h2 className="text-lg font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                            New Inspection
                        </h2>
                        <p className="text-[13px] font-sfpro text-gray-400 dark:text-[#71717a] mt-0.5">
                            Add inspection entries below
                        </p>
                    </div>

                    {!form ? (
                        <div className="flex-1 px-6 lg:px-12 xl:px-20 py-6 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <SafetyFormContent form={form} setForm={setForm} disabled={submitting} />
                    )}

                    <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-3.5 border-t border-gray-100 dark:border-[#27272a]">
                        <button
                            onClick={() => !submitting && onClose()}
                            disabled={submitting}
                            className="h-9 px-5 rounded-lg text-[13px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-50 dark:hover:bg-[#27272a] disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !form}
                            className="h-9 px-5 rounded-lg text-[13px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? "Creating…" : "Create"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}