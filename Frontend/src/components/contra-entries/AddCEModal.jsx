"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, AlertCircle, Search, X, Package } from "lucide-react"
import {
    createCE,
    getKeycloakId,
    formatCEError,
    fetchGlobalPOLookup,
} from "@/app/(companyname)/contra-entries/api"
import { Select } from "@/components/ui/DropDown"
import { toast } from "sonner"

const TYPES = [
    { value: "QUANTITY_CORRECTION", label: "Quantity Correction" },
    { value: "PRICE_CORRECTION", label: "Price Correction" },
    { value: "OTHER", label: "Other" },
]

const inputClass =
    "w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"

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

function POSelector({ value, onChange, disabled, projectId, error }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [poList, setPoList] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const containerRef = useRef(null)
    const inputRef = useRef(null)
    const controllerRef = useRef(null)

    const doFetch = useCallback(async (q) => {
        controllerRef.current?.abort()
        const ctrl = new AbortController()
        controllerRef.current = ctrl
        setIsLoading(true)
        try {
            const list = await fetchGlobalPOLookup({
                search: q,
                projectId: projectId || undefined,
                signal: ctrl.signal,
            })
            if (!ctrl.signal.aborted) setPoList(list)
        } catch (err) {
            if (err.name !== "CanceledError" && err.name !== "AbortError") {
                console.error("PO lookup failed:", err.message)
            }
        } finally {
            if (!ctrl.signal.aborted) setIsLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        if (!open) return
        const t = setTimeout(() => doFetch(query), 300)
        return () => clearTimeout(t)
    }, [query, open, doFetch])

    useEffect(() => {
        if (open && poList.length === 0) doFetch("")
    }, [open])

    useEffect(() => {
        const fn = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", fn)
        return () => document.removeEventListener("mousedown", fn)
    }, [])

    useEffect(() => () => controllerRef.current?.abort(), [])

    const handleSelect = (po) => {
        onChange(po)
        setOpen(false)
        setQuery("")
    }

    const handleClear = () => {
        onChange(null)
        setQuery("")
        setOpen(true)
        setTimeout(() => { inputRef.current?.focus(); doFetch("") }, 50)
    }

    return (
        <div ref={containerRef} className="relative">
            {value ? (
                <div className={`flex items-center gap-2 h-9 px-3 rounded-lg border ${error
                        ? "border-red-300 dark:border-red-500/40"
                        : "border-gray-200 dark:border-[#252525]"
                    } bg-white dark:bg-[#121212]`}>
                    <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-sfpro-medium text-black dark:text-white truncate">
                            {value.poNumber}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-[#52525b] ml-2">
                            {value.vendorName}
                        </span>
                    </div>
                    {value.projectName && (
                        <span className="text-[10px] font-sfpro-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] shrink-0 truncate max-w-24">
                            {value.projectName}
                        </span>
                    )}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="w-5 h-5 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center shrink-0 transition-colors"
                        >
                            <X className="w-3 h-3 text-gray-500" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search by PO number or vendor..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setOpen(true)}
                        disabled={disabled}
                        className={`${inputClass} h-9 pl-9 ${error
                                ? "border-red-300 dark:border-red-500/40 focus:ring-red-300 dark:focus:ring-red-500/40"
                                : ""
                            }`}
                    />

                    {open && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] rounded-xl shadow-xl max-h-56 overflow-y-auto z-60"
                            style={{ scrollbarWidth: "thin" }}>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6 gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    <span className="text-[12px] text-gray-400 font-sfpro">Loading…</span>
                                </div>
                            ) : poList.length === 0 ? (
                                <div className="py-6 text-center">
                                    <p className="text-[12px] text-gray-400 dark:text-[#52525b] font-sfpro">
                                        {query
                                            ? `No approved POs found for "${query}"`
                                            : "No approved POs available"}
                                    </p>
                                </div>
                            ) : (
                                poList.map((po) => (
                                    <button
                                        key={po.poId}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(po)}
                                        className="w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors text-left"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-sfpro-medium text-gray-900 dark:text-white truncate">
                                                    {po.poNumber}
                                                </p>
                                                <p className="text-[11px] text-gray-400 dark:text-[#52525b] truncate">
                                                    {po.vendorName}
                                                    {po.projectName ? ` · ${po.projectName}` : ""}
                                                    {` · ${po.itemCount} item${po.itemCount !== 1 ? "s" : ""}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {po.totalOrderValue != null && (
                                                    <span className="text-[11px] font-sfpro-medium text-gray-500 dark:text-[#71717a]">
                                                        ₹{Number(po.totalOrderValue).toLocaleString("en-IN")}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sfpro-bold uppercase ${po.status === "Approved"
                                                        ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                                                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                                    }`}>
                                                    {po.status}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function AddCEModal({ open, onClose, onSuccess, projectId }) {
    const [form, setForm] = useState({
        selectedPO: null,  
        type: "QUANTITY_CORRECTION",
        adjustmentAmount: "",
        reason: "",
        remarks: "",
    })
    const [isSaving, setIsSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    const INITIAL_FORM = {
        selectedPO: null,
        type: "QUANTITY_CORRECTION",
        adjustmentAmount: "",
        reason: "",
        remarks: "",
    }

    useEffect(() => {
        if (open) {
            setMounted(true)
            setForm(INITIAL_FORM)
            setErrors({})
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setForm(INITIAL_FORM)
                setErrors({})
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        const fn = (e) => {
            if (e.key === "Escape" && open && !isSaving) onClose()
        }
        window.addEventListener("keydown", fn)
        return () => window.removeEventListener("keydown", fn)
    }, [open, isSaving, onClose])

    const set = (key, val) => {
        setForm((p) => ({ ...p, [key]: val }))
        if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }))
    }

    const validate = () => {
        const e = {}
        if (!form.selectedPO)
            e.selectedPO = "Please select a Purchase Order"
        if (!form.adjustmentAmount || Number(form.adjustmentAmount) <= 0)
            e.adjustmentAmount = "Amount must be a positive number"
        if (!form.reason.trim())
            e.reason = "Reason is required"

        const keycloakId = getKeycloakId()
        if (!keycloakId)
            e.auth = "User session not found. Please re-login."

        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return

        setIsSaving(true)
        try {
            const res = await createCE({
                createdBy: getKeycloakId(),
                poId: form.selectedPO.poId,
                type: form.type,
                adjustmentAmount: Number(form.adjustmentAmount),
                direction: "CREDIT_VENDOR",
                reason: form.reason.trim(),
                remarks: form.remarks.trim() || undefined,
            })
            toast.success("Contra Entry Created", {
                description: res.description || "CE created as Draft",
            })
            onSuccess?.()
            onClose()
        } catch (err) {
            toast.error("Failed to Create", { description: formatCEError(err) })
        } finally {
            setIsSaving(false)
        }
    }

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={() => !isSaving && onClose()} />

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
                            Create Contra Entry
                        </h2>
                        <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                            Create a billing adjustment for a Purchase Order
                        </p>
                    </div>

                    {errors.auth && (
                        <div className="mx-8 lg:mx-20 xl:mx-36 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-[12px] text-red-600 dark:text-red-400 font-sfpro">
                                {errors.auth}
                            </p>
                        </div>
                    )}

                    <div
                        className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 space-y-5 pb-25"
                        style={{ scrollbarWidth: "none" }}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">

                            <div className="col-span-full">
                                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                                    Purchase Order <span className="text-red-500">*</span>
                                </div>
                                <POSelector
                                    value={form.selectedPO}
                                    onChange={(po) => {
                                        set("selectedPO", po)
                                        if (errors.selectedPO) setErrors((p) => ({ ...p, selectedPO: "" }))
                                    }}
                                    disabled={isSaving}
                                    projectId={projectId}
                                    error={!!errors.selectedPO}
                                />
                                {errors.selectedPO && (
                                    <p className="text-[11px] text-red-500 font-sfpro mt-1">
                                        {errors.selectedPO}
                                    </p>
                                )}
                                <p className="text-[11px] text-gray-400 dark:text-[#52525b] font-sfpro mt-1">
                                    Only Approved or Partially Delivered POs are shown
                                </p>
                            </div>

                            <div className="col-span-2 md:col-span-2">
                                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                                    Adjustment Type <span className="text-red-500">*</span>
                                </div>
                                <Select
                                    options={TYPES}
                                    value={form.type}
                                    onChange={(val) => set("type", val)}
                                    placeholder="Select type…"
                                    disabled={isSaving}
                                    width="w-full"
                                />
                            </div>

                            <div className="col-span-2 md:col-span-2">
                                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                                    Adjustment Amount <span className="text-red-500">*</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.adjustmentAmount}
                                    onChange={(e) => set("adjustmentAmount", e.target.value)}
                                    placeholder="₹ 0.00"
                                    disabled={isSaving}
                                    className={`${inputClass} h-9 ${errors.adjustmentAmount
                                            ? "border-red-300 dark:border-red-500/40 focus:ring-red-300 dark:focus:ring-red-500/40"
                                            : ""
                                        }`}
                                />
                                {errors.adjustmentAmount && (
                                    <p className="text-[11px] text-red-500 font-sfpro mt-1">
                                        {errors.adjustmentAmount}
                                    </p>
                                )}
                            </div>

                            <div className="col-span-full">
                                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                                    Reason <span className="text-red-500">*</span>
                                </div>
                                <textarea
                                    value={form.reason}
                                    onChange={(e) => set("reason", e.target.value)}
                                    rows={2}
                                    placeholder="Explain why this adjustment is needed..."
                                    disabled={isSaving}
                                    className={`${inputClass} resize-none ${errors.reason
                                            ? "border-red-300 dark:border-red-500/40 focus:ring-red-300 dark:focus:ring-red-500/40"
                                            : ""
                                        }`}
                                />
                                {errors.reason && (
                                    <p className="text-[11px] text-red-500 font-sfpro mt-1">
                                        {errors.reason}
                                    </p>
                                )}
                            </div>

                            <div className="col-span-full">
                                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                                    Remarks
                                </div>
                                <textarea
                                    value={form.remarks}
                                    onChange={(e) => set("remarks", e.target.value)}
                                    rows={2}
                                    placeholder="Any additional context (optional)..."
                                    disabled={isSaving}
                                    className={`${inputClass} resize-none`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#27272a]">
                        <button
                            onClick={() => !isSaving && onClose()}
                            disabled={isSaving}
                            className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 transition-all duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 transition-all duration-150 flex items-center gap-2"
                        >
                            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isSaving ? "Creating…" : "Create Entry"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}