"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Search, Package, X, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import DatePicker from "@/components/ui/DatePicker"
import { fetchVendorsLookupForWO } from "@/app/(companyname)/projects/[projectId]/work-order/api"
export function TextField({
    label, placeholder, colSpan, value,
    onChange, disabled, required, as = "input", rows = 3,
}) {
    const cls =
        "w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"

    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </div>
            {as === "textarea" ? (
                <textarea
                    rows={rows}
                    placeholder={placeholder}
                    value={value || ""}
                    onChange={onChange}
                    disabled={disabled}
                    className={`${cls} resize-none`}
                />
            ) : (
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value || ""}
                    onChange={onChange}
                    disabled={disabled}
                    className={`${cls} h-9`}
                />
            )}
        </div>
    )
}
export function DateField({
    label, colSpan = "col-span-1", value,
    onChange, required, minDate, maxDate,
}) {
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </div>
            <div className="w-full [&>div]:w-full [&>div>button]:w-full">
                <DatePicker
                    value={value}
                    onChange={onChange}
                    placeholder={`Select ${label.toLowerCase()}`}
                    minDate={minDate ?? null}
                    maxDate={maxDate ?? null}
                />
            </div>
        </div>
    )
}
function SearchDropdown({
    label, required, colSpan = "col-span-full",
    value, onSelect, onClear, disabled,
    displayValue, displaySub,
    placeholder, fetchFn, renderItem,
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [items, setItems] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const containerRef = useRef(null)
    const controllerRef = useRef(null)

    const doFetch = useCallback(async (q) => {
        controllerRef.current?.abort()
        const ctrl = new AbortController()
        controllerRef.current = ctrl

        if (!q?.trim()) {
            setIsLoading(true)
            try {
                const list = await fetchFn("", ctrl.signal)
                if (!ctrl.signal.aborted) setItems(list.slice(0, 50))
            } catch { }
            finally { if (!ctrl.signal.aborted) setIsLoading(false) }
            return
        }

        setIsLoading(true)
        try {
            const list = await fetchFn(q, ctrl.signal)
            if (!ctrl.signal.aborted) setItems(list.slice(0, 50))
        } catch { }
        finally { if (!ctrl.signal.aborted) setIsLoading(false) }
    }, [fetchFn])
    useEffect(() => {
        if (!open) return
        const t = setTimeout(() => doFetch(query), 300)
        return () => clearTimeout(t)
    }, [query, open, doFetch])
    useEffect(() => () => controllerRef.current?.abort(), [])
    useEffect(() => {
        const fn = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", fn)
        return () => document.removeEventListener("mousedown", fn)
    }, [])

    return (
        <div className={colSpan} ref={containerRef}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </div>

            {value ? (
                <button
                    type="button"
                    onClick={() => { onClear(); setOpen(true); }}
                    disabled={disabled}
                    className="flex items-center gap-2 h-9 w-full px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212] hover:border-gray-300 dark:hover:border-[#4a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed justify-between"
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Package className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-[13px] font-sfpro-medium text-black dark:text-white truncate">
                                {displayValue}
                            </p>
                            {displaySub && (
                                <p className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">
                                    {displaySub}
                                </p>
                            )}
                        </div>
                    </div>
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:text-[#71717a] dark:hover:text-[#a1a1aa] shrink-0" />
                </button>
            ) : (
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => { setOpen(true); if (items.length === 0 && !query) doFetch("") }}
                        disabled={disabled}
                        className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {open && (
                        <div
                            className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl max-h-56 overflow-y-auto z-50"
                            style={{ scrollbarWidth: "thin" }}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center py-4 gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                    <span className="text-[11px] text-gray-400 font-sfpro">Searching...</span>
                                </div>
                            ) : items.length === 0 ? (
                                <div className="py-4 text-center">
                                    <p className="text-[11px] text-gray-400 font-sfpro">
                                        {query ? `No vendors found matching "${query}"` : "No vendors available"}
                                    </p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div
                                        key={item._id || item.id || idx}
                                        onClick={() => { onSelect(item); setOpen(false); setQuery(""); }}
                                        className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        {renderItem(item)}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function VendorSelector({ value, onChange, disabled }) {
    return (
        <SearchDropdown
            label="Select Vendor"
            required
            colSpan="col-span-full md:col-span-2"
            value={value}
            displayValue={value?.name || "—"}
            displaySub={value?.vendorType ? `${value.vendorType}` : value?.email || ""}
            placeholder="Search by vendor name, email..."
            disabled={disabled}
            fetchFn={fetchVendorsLookupForWO}
            onSelect={onChange}
            onClear={() => onChange(null)}
            renderItem={(v) => (
                <div className="flex flex-col items-start">
                    <p className="text-[13px] font-sfpro-medium text-gray-900 dark:text-white">
                        {v.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {v.vendorType && (
                            <span className="text-[11px] text-gray-400 dark:text-[#52525b] bg-gray-100 dark:bg-[#27272a] px-1.5 py-0.5 rounded">
                                {v.vendorType}
                            </span>
                        )}
                        {v.email && (
                            <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate">
                                · {v.email}
                            </span>
                        )}
                    </div>
                </div>
            )}
        />
    )
}
function WorkItemRow({ item, index, onChange, onRemove, disabled, canRemove }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Description <span className="text-red-500">*</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Work description..."
                        value={item.description || ""}
                        onChange={(e) => onChange(index, { ...item, description: e.target.value })}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Qty <span className="text-red-500">*</span>
                    </div>
                    <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.quantity || ""}
                        onChange={(e) =>
                            onChange(index, { ...item, quantity: parseFloat(e.target.value) || 0 })
                        }
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Unit</div>
                    <input
                        type="text"
                        placeholder="Units"
                        value={item.unit || ""}
                        onChange={(e) => onChange(index, { ...item, unit: e.target.value })}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Rate <span className="text-red-500">*</span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitRate || ""}
                        onChange={(e) =>
                            onChange(index, { ...item, unitRate: parseFloat(e.target.value) || 0 })
                        }
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Amount</div>
                    <div className="h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12.5px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        ₹{((item.quantity || 0) * (item.unitRate || 0)).toFixed(2)}
                    </div>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={!canRemove || disabled}
                className="mt-5 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0 disabled:cursor-not-allowed"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
export function WorkItemsList({ items = [], onChange, disabled = false }) {
    const handleItemChange = (index, updated) => {
        const newItems = [...items]
        newItems[index] = updated
        onChange(newItems)
    }

    const handleRemove = (index) => {
        if (items.length <= 1) return
        onChange(items.filter((_, i) => i !== index))
    }

    const handleAdd = () => {
        onChange([
            ...items,
            { description: "", unit: "Units", quantity: 1, unitRate: 0 },
        ])
    }

    const totalValue = items.reduce(
        (sum, i) => sum + (i.quantity || 0) * (i.unitRate || 0),
        0
    )

    return (
        <div className="col-span-full">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
                    Work Items <span className="text-red-500">*</span>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-[#a1a1aa] border border-gray-200 dark:border-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-3 h-3" />
                    Add Item
                </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {items.map((item, index) => (
                    <WorkItemRow
                        key={index}
                        item={item}
                        index={index}
                        onChange={handleItemChange}
                        onRemove={handleRemove}
                        disabled={disabled}
                        canRemove={items.length > 1}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                    Total: ₹{totalValue.toFixed(2)}
                </p>
            </div>
        </div>
    )
}
function MilestoneRow({ milestone, index, onChange, onRemove, disabled, canRemove, totalValue }) {
    const amount = totalValue > 0
        ? ((milestone.paymentPercent || 0) / 100) * totalValue 
        : 0

    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Milestone Title <span className="text-red-500">*</span>
                    </div>
                    <input
                        type="text"
                        placeholder="e.g. Foundation Complete"
                        value={milestone.title || ""}
                        onChange={(e) => onChange(index, { ...milestone, title: e.target.value })}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Trigger % <span className="text-red-500">*</span>
                    </div>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="e.g. 50"
                        value={milestone.triggerPercent || ""}
                        onChange={(e) =>
                            onChange(index, { ...milestone, triggerPercent: parseFloat(e.target.value) || 0 })
                        }
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Payment % <span className="text-red-500">*</span>
                    </div>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="e.g. 40"
                        value={milestone.paymentPercent || ""}
                        onChange={(e) =>
                            onChange(index, { ...milestone, paymentPercent: parseFloat(e.target.value) || 0 })
                        }
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                <div className="sm:col-span-3">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Due Date</div>
                    <div className="[&>div]:w-full [&>div>button]:w-full [&>div>button]:h-8 [&>div>button]:text-[12.5px]">
                        <DatePicker
                            value={milestone.dueDate ? new Date(milestone.dueDate) : null}
                            onChange={(d) => onChange(index, { ...milestone, dueDate: d ? d.toISOString() : null })}
                            placeholder="Select date"
                            minDate={new Date()}
                        />
                    </div>
                </div>

                <div className="sm:col-span-2">
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Amount</div>
                    <div className="h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12.5px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                        ₹{amount.toFixed(2)}
                    </div>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={!canRemove || disabled}
                className="mt-5 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0 disabled:cursor-not-allowed"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
export function MilestonesList({ milestones = [], onChange, disabled = false, totalValue = 0 }) {
    const handleChange = (index, updated) => {
        const next = [...milestones]
        next[index] = updated
        onChange(next)
    }

    const handleRemove = (index) => {
        if (milestones.length <= 1) return
        onChange(milestones.filter((_, i) => i !== index))
    }

    const handleAdd = () => {
        onChange([
            ...milestones,
            { title: "", description: "", triggerPercent: 0, paymentPercent: 0, dueDate: null },
        ])
    }

    const totalPaymentPercent = milestones.reduce((sum, m) => sum + (m.paymentPercent || 0), 0) 

    return (
        <div className="col-span-full">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
                        Payment Milestones <span className="text-red-500">*</span>
                    </div>
                    <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-sfpro-bold ${
                            totalPaymentPercent === 100  
                                ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                                : totalPaymentPercent > 100  
                                    ? "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                    >
                        Payment: {totalPaymentPercent}% / 100%  
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-[#a1a1aa] border border-gray-200 dark:border-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-3 h-3" />
                    Add Milestone
                </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {milestones.map((ms, index) => (
                    <MilestoneRow
                        key={index}
                        milestone={ms}
                        index={index}
                        onChange={handleChange}
                        onRemove={handleRemove}
                        disabled={disabled}
                        canRemove={milestones.length > 1}
                        totalValue={totalValue}
                    />
                ))}
            </div>
        </div>
    )
}
export function WOFormContent({ form, setForm, disabled = false, projectId, isEdit = false }) {
    const updateField = (key) => (e) =>
        setForm((p) => ({ ...p, [key]: e.target.value }))

    const totalContractValue = (form.workItems || []).reduce(
        (sum, i) => sum + (i.quantity || 0) * (i.unitRate || 0),
        0
    )
    const showMilestones = form.hasMilestones ?? false

    const toggleMilestones = () => {
        const next = !showMilestones
        setForm((p) => ({
            ...p,
            hasMilestones: next,
            milestones: next && (!p.milestones || p.milestones.length === 0)
                ? [{ title: "", description: "", triggerPercent: 0, paymentPercent: 0, dueDate: null }] // ✅
                : p.milestones || [],
        }))
    }

    return (
        <div
            className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-20 xl:px-36 pt-6 pb-24 space-y-6"
            style={{ scrollbarWidth: "none" }}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                <TextField
                    label="Work Order Title"
                    placeholder="e.g. Civil Foundation Work"
                    colSpan="col-span-1 md:col-span-2"
                    value={form.title}
                    onChange={updateField("title")}
                    disabled={disabled}
                    required
                />
                <VendorSelector
                    value={form.vendorObject}
                    onChange={(v) =>
                        setForm((p) => ({
                            ...p,
                            vendorObject: v,
                            vendorId: v?._id || v?.id || "",
                        }))
                    }
                    disabled={disabled}
                />
                <DateField
                    label="Start Date"
                    colSpan="col-span-1 md:col-span-1"
                    value={form.startDate}
                    onChange={(date) => setForm((p) => ({ ...p, startDate: date }))}
                    minDate={new Date()}
                />
                <DateField
                    label="Expected End Date"
                    colSpan="col-span-1 md:col-span-1"
                    value={form.expectedEndDate}
                    onChange={(date) => setForm((p) => ({ ...p, expectedEndDate: date }))}
                    minDate={form.startDate ? new Date(form.startDate) : new Date()}
                />
                <TextField
                    label="Description"
                    placeholder="Describe the scope of work..."
                    colSpan="col-span-1 md:col-span-2"
                    value={form.description}
                    onChange={updateField("description")}
                    disabled={disabled}
                    as="textarea"
                    rows={2}
                />
                <WorkItemsList
                    items={form.workItems || []}
                    onChange={(items) => setForm((p) => ({ ...p, workItems: items }))}
                    disabled={disabled}
                />
                <div className="col-span-1 md:col-span-2">
                    <button
                        type="button"
                        onClick={toggleMilestones}
                        disabled={disabled}
                        className="flex items-center gap-2 text-[13px] font-sfpro-medium text-gray-700 dark:text-[#a1a1aa] hover:text-black dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {showMilestones
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />
                        }
                        {showMilestones ? "Hide" : "Add"} Payment Milestones
                    </button>
                </div>
                {showMilestones && (
                    <MilestonesList
                        milestones={form.milestones || []}
                        onChange={(milestones) => setForm((p) => ({ ...p, milestones }))}
                        disabled={disabled}
                        totalValue={totalContractValue}
                    />
                )}
                <TextField
                    label="Work Location"
                    placeholder="Site or location details..."
                    colSpan="col-span-1 md:col-span-2"
                    value={form.workLocation}
                    onChange={updateField("workLocation")}
                    disabled={disabled}
                    as="textarea"
                    rows={2}
                />
                <TextField
                    label="Payment Terms"
                    placeholder="e.g. Net 30, milestone-based..."
                    colSpan="col-span-1 md:col-span-1"
                    value={form.paymentTerms}
                    onChange={updateField("paymentTerms")}
                    disabled={disabled}
                />
                <TextField
                    label="Special Instructions"
                    placeholder="Any special notes or requirements..."
                    colSpan="col-span-1 md:col-span-1"
                    value={form.specialInstructions}
                    onChange={updateField("specialInstructions")}
                    disabled={disabled}
                />
            </div>
        </div>
    )
}