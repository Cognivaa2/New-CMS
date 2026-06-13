"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Upload, X, FileText } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"
import { VALID_SUB_TYPES, VALID_PAYMENT_MODES, VALID_CATEGORIES } from "@/app/(companyname)/projects/[projectId]/expenses/api.jsx"

const SUB_TYPE_OPTIONS = VALID_SUB_TYPES.map((s) => ({ value: s, label: s }))
const CATEGORY_OPTIONS = VALID_CATEGORIES.map((c) => ({ value: c, label: c }))
const PAYMENT_MODE_OPTIONS = VALID_PAYMENT_MODES.map((m) => ({ value: m, label: m }))

function Label({ children, required }) {
    return (
        <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
            {children} {required && <span className="text-red-500">*</span>}
        </div>
    )
}

function TextInput({ label, placeholder, value, onChange, disabled, required, colSpan = "col-span-1" }) {
    return (
        <div className={colSpan}>
            <Label required={required}>{label}</Label>
            <input
                type="text"
                placeholder={placeholder}
                value={value || ""}
                onChange={onChange}
                disabled={disabled}
                className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    )
}

function NumberInput({ label, placeholder, value, onChange, disabled, required, colSpan = "col-span-1" }) {
    return (
        <div className={colSpan}>
            <Label required={required}>{label}</Label>
            <input
                type="number"
                min="0"
                placeholder={placeholder}
                value={value || ""}
                onChange={onChange}
                disabled={disabled}
                className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    )
}

function SelectField({ label, value, onChange, options, disabled, required, colSpan = "col-span-1", placeholder = "Select…" }) {
    return (
        <div className={colSpan}>
            <Label required={required}>{label}</Label>
            <Select
                placeholder={placeholder}
                options={options}
                value={value}
                onChange={onChange}
                width="w-full"
                disabled={disabled}
            />
        </div>
    )
}

function TextareaInput({ label, placeholder, value, onChange, disabled, required, colSpan = "col-span-full", rows = 2 }) {
    return (
        <div className={colSpan}>
            <Label required={required}>{label}</Label>
            <textarea
                rows={rows}
                placeholder={placeholder}
                value={value || ""}
                onChange={onChange}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
        </div>
    )
}

function DateField({ label, value, onChange, required, colSpan = "col-span-1" }) {
    return (
        <div className={colSpan}>
            <Label required={required}>{label}</Label>
            <div className="w-full [&>div]:w-full [&>div>button]:w-full">
                <DatePicker
                    value={value}
                    onChange={onChange}
                    placeholder={`Select ${label.toLowerCase()}`}
                    maxDate={new Date()}
                />
            </div>
        </div>
    )
}

function FileUploadField({ label, value, onChange, disabled, colSpan = "col-span-full" }) {
    const inputRef = useRef(null)
    return (
        <div className={colSpan}>
            <Label>{label}</Label>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sfpro-medium border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Choose File
                </button>
                {value && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[12.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] truncate max-w-40">
                            {value instanceof File ? value.name : "Existing file"}
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            disabled={disabled}
                            className="w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center disabled:opacity-50"
                        >
                            <X className="w-3 h-3 text-gray-500" />
                        </button>
                    </div>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => onChange(e.target.files?.[0] || null)}
                disabled={disabled}
                className="hidden"
            />
        </div>
    )
}

function ExpenseFormContent({ form, setForm, disabled }) {
    const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
    const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))

    const handleSubTypeChange = (val) => {
        setForm((p) => ({
            ...p,
            subType: val,
            category: VALID_CATEGORIES.includes(val) ? val : p.category,
        }))
    }

    return (
        <div
            className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
            style={{ scrollbarWidth: "none" }}
        >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <SelectField
                    label="Sub Type"
                    value={form.subType}
                    onChange={handleSubTypeChange}
                    options={SUB_TYPE_OPTIONS}
                    disabled={disabled}
                    required
                    colSpan="col-span-2 md:col-span-2"
                    placeholder="Select sub type…"
                />

                <SelectField
                    label="Category"
                    value={form.category}
                    onChange={updateSelect("category")}
                    options={CATEGORY_OPTIONS}
                    disabled={disabled}
                    colSpan="col-span-2 md:col-span-2"
                    placeholder="Select category…"
                />

                <NumberInput
                    label="Amount (₹)"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    disabled={disabled}
                    required
                    colSpan="col-span-2 md:col-span-2"
                />

                <DateField
                    label="Expense Date"
                    value={form.expenseDate}
                    onChange={(date) => setForm((p) => ({ ...p, expenseDate: date }))}
                    required
                    colSpan="col-span-2 md:col-span-2"
                />

                <SelectField
                    label="Payment Mode"
                    value={form.paymentMode}
                    onChange={updateSelect("paymentMode")}
                    options={PAYMENT_MODE_OPTIONS}
                    disabled={disabled}
                    colSpan="col-span-2 md:col-span-2"
                    placeholder="Select mode…"
                />

                <TextInput
                    label="Reference Number"
                    placeholder="e.g. TXN123456"
                    value={form.referenceNumber}
                    onChange={update("referenceNumber")}
                    disabled={disabled}
                    colSpan="col-span-2 md:col-span-2"
                />

                <TextareaInput
                    label="Description"
                    placeholder="Brief description of this expense…"
                    value={form.description}
                    onChange={update("description")}
                    disabled={disabled}
                    required
                    colSpan="col-span-full"
                    rows={2}
                />

                <FileUploadField
                    label="Proof (Invoice / Receipt)"
                    value={form.proof}
                    onChange={(file) => setForm((p) => ({ ...p, proof: file }))}
                    disabled={disabled}
                    colSpan="col-span-full"
                />
            </div>
        </div>
    )
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

const INITIAL_FORM = {
    subType: "",
    category: "",
    amount: "",
    expenseDate: null,
    paymentMode: "",
    referenceNumber: "",
    description: "",
    proof: null,
}

export default function AddExpenseModal({ open, onClose, onSave }) {
    const [form, setForm] = useState(INITIAL_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
            setForm(INITIAL_FORM)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setForm(INITIAL_FORM)
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
        if (!form.subType) {
            toast.error("Sub type is required")
            return
        }
        if (!form.amount || Number(form.amount) <= 0) {
            toast.error("A valid amount is required")
            return
        }
        if (!form.description?.trim()) {
            toast.error("Description is required")
            return
        }
        if (!form.expenseDate) {
            toast.error("Expense date is required")
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
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[92dvh] lg:max-h-[75dvh] flex flex-col">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
                    </div>

                    <div className="flex flex-col items-center px-8 pt-5 pb-4 shrink-0">
                        <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                            Add Manual Expense
                        </h2>
                        <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                            Record a petty cash or miscellaneous expense for approval
                        </p>
                    </div>

                    <ExpenseFormContent form={form} setForm={setForm} disabled={submitting} />

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
                            disabled={submitting}
                            className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 transition-all duration-150"
                        >
                            {submitting ? "Submitting…" : "Submit Expense"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}