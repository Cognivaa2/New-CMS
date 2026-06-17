"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { WOFormContent } from "./WOFormFields"

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

export default function EditWOModal({
    open,
    onClose,
    onSave,
    wo,
    isEditLoading = false,
    projectId,
}) {
    const [form, setForm] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const modalRef = useRef(null)

    useEffect(() => {
        if (open) {
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
            document.body.style.overflow = 'hidden'
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setForm(null)
                document.body.style.overflow = ''
            }, 420)
            return () => { clearTimeout(t); document.body.style.overflow = '' }
        }
        return () => { document.body.style.overflow = '' }
    }, [open])

    useEffect(() => {
        if (!wo) return
        setForm({
            title: wo.title || "",
            vendorId: wo.vendorId || "",
            vendorObject: wo.vendorId
                ? { _id: wo.vendorId, name: wo.vendorName }
                : null,
            description: wo.description || "",
            workItems: (wo.workItems || []).map((item) => ({
                description: item.description || "",
                unit: item.unit || "Units",
                quantity: item.quantity ?? 1,
                unitRate: item.unitRate ?? 0,
            })),
            hasMilestones: wo.hasMilestones ?? false,
            milestones: (wo.milestones || []).map((ms) => ({
                title: ms.title || "",
                description: ms.description || "",
                triggerPercent: ms.triggerPercent ?? 0,
                paymentPercent: ms.paymentPercent ?? 0,
                dueDate: ms.dueDate || null,
            })),
            startDate: wo.startDate ? new Date(wo.startDate) : null,
            expectedEndDate: wo.expectedEndDate ? new Date(wo.expectedEndDate) : null,
            workLocation: wo.workLocation || "",
            paymentTerms: wo.paymentTerms || "",
            specialInstructions: wo.specialInstructions || "",
            phaseId: wo.phaseId || null,
            status: wo.status || "Draft",
            gst: wo.gst ?? 0,
            discount: wo.discount ?? 0,
        })
    }, [wo])

    useEffect(() => {
        const fn = (e) => {
            if (e.key === "Escape" && open && !submitting) onClose()
        }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [open, submitting, onClose])

    const handleSubmit = async () => {
        if (!form) return

        if (!form.title?.trim()) {
            toast.error("Enter a title for the Work Order")
            return
        }
        if (!form.vendorId) {
            toast.error("Select a vendor")
            return
        }
        if (!form.workItems?.length) {
            toast.error("Add at least one work item")
            return
        }
        const hasEmptyDesc = form.workItems.some((i) => !i.description?.trim())
        if (hasEmptyDesc) {
            toast.error("Each work item needs a description")
            return
        }
        const hasEmptyQty = form.workItems.some((i) => !i.quantity || i.quantity <= 0)
        if (hasEmptyQty) {
            toast.error("All work items need a valid quantity")
            return
        }
        if (form.hasMilestones) {
            if (!form.milestones?.length) {
                toast.error("Add at least one milestone")
                return
            }
            const totalPercent = form.milestones.reduce((s, m) => s + (m.paymentPercent || 0), 0) // ✅
            if (totalPercent !== 100) {
                toast.error(`Payment percentages must total 100% (currently ${totalPercent}%)`)
                return
            }
        }

        setSubmitting(true)
        try {
            await onSave(form)
        } catch { }
        finally { setSubmitting(false) }
    }

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={() => !submitting && onClose()} />
            <div
                ref={modalRef}
                style={{
                    transitionDuration: "1000ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
                    }`}
            >
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[85dvh] md:max-h-[90dvh] lg:max-h-[75dvh] flex flex-col shadow-2xl">
                    <div className="sm:hidden flex justify-center pt-3 shrink-0">
                        <div className="w-9 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>
                    <div className="flex flex-col items-center px-4 sm:px-8 pt-4 sm:pt-5 pb-4 shrink-0 border-b border-gray-100 dark:border-[#27272a]">
                        <h2 className="text-base sm:text-lg md:text-xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight text-center px-2">
                            Edit Work Order
                        </h2>
                        <p className="text-xs sm:text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 text-center px-2">
                            {wo?.status === "Rejected"
                                ? "This WO was rejected — update and resubmit"
                                : `Editing ${wo?.woNumber || "WO"}`}
                        </p>
                    </div>

                    {isEditLoading || !form ? (
                        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pt-6 pb-6 space-y-4 overflow-y-auto" >
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-[#1c1c1c] animate-pulse" style={{ scrollbarWidth: "none" }} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto relative" style={{ scrollbarWidth: "none" }} >
                            <WOFormContent
                                form={form}
                                setForm={setForm}
                                disabled={submitting}
                                projectId={projectId}
                                isEdit
                            />
                        </div>
                    )}

                    <div className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-gray-100 dark:border-[#27272a] bg-white dark:bg-[#09090b]">
                        <button
                            onClick={() => !submitting && onClose()}
                            disabled={submitting || isEditLoading}
                            className="h-9 px-3 sm:px-4 rounded-lg text-[12px] sm:text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || isEditLoading || !form}
                            className="h-9 px-3 sm:px-4 rounded-lg text-[12px] sm:text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                        >
                            {submitting ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}