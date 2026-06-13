"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Loader2, Package, Plus, Trash2, AlertCircle, Lock } from "lucide-react"
import { Select } from "@/components/ui/DropDown"

const UNITS = ["kg", "g", "ton", "m", "cm", "mm", "m²", "m³", "L", "mL", "pcs", "box", "bag", "roll", "sheet", "set"]

const EMPTY_CONSUMPTION_ROW = {
    id: crypto.randomUUID(),
    inventoryId: "",
    materialMasterId: "",
    materialName: "",
    unit: "",
    quantityConsumed: "",
    pricePerUnit: "",
    totalCost: "",
    remarks: "",
}

function calcTotal(qty, price) {
    const q = parseFloat(qty)
    const p = parseFloat(price)
    if (isNaN(q) || isNaN(p)) return ""
    return (q * p).toFixed(2)
}

function validateRows(rows) {
    const errors = {}
    rows.forEach((row, idx) => {
        const rowErrors = []
        if (!row.inventoryId?.trim()) rowErrors.push("inventoryId")
        if (!row.materialMasterId?.trim()) rowErrors.push("materialMasterId")
        if (!row.materialName?.trim()) rowErrors.push("materialName")
        if (!row.unit?.trim()) rowErrors.push("unit")
        if (!row.quantityConsumed || parseFloat(row.quantityConsumed) < 0.001) rowErrors.push("quantityConsumed")
        if (
            row.pricePerUnit === "" ||
            row.pricePerUnit === undefined ||
            row.pricePerUnit === null ||
            parseFloat(row.pricePerUnit) < 0
        ) rowErrors.push("pricePerUnit")
        if (rowErrors.length > 0) errors[idx] = rowErrors
    })
    return errors
}
function inputCls({ locked = false, errored = false, extra = "" } = {}) {
    return [
        "dark:bg-[#161616] w-full px-3 py-2.5 rounded-xl text-sm font-sfpro border",
        "transition-colors duration-150 outline-none",
        "disabled:opacity-50",
        locked
            ? "text-gray-400 dark:text-[#555] cursor-not-allowed"
            : "text-gray-900 dark:text-white",
        "placeholder:text-gray-300 dark:placeholder:text-[#444]",
        locked
            ? "bg-gray-100 dark:bg-[#111]"
            : "bg-white dark:bg-[#1a1a1a]",
        errored
            ? "border-red-300 dark:border-red-700"
            : "border-[#e4e4e7] dark:border-[#333]",
        "focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#333] focus:ring-offset-0",
        extra,
    ].filter(Boolean).join(" ")
}
const totalCostCls =
    "w-full px-3 py-2.5 rounded-xl text-sm font-sfpro " +
    "bg-gray-100 dark:bg-[#111] " +
    "border border-[#e4e4e7] dark:border-[#333] " +
    "text-gray-400 dark:text-[#555] " +
    "placeholder:text-gray-300 dark:placeholder:text-[#444] " +
    "cursor-not-allowed"

function SectionToggle({ label, icon: Icon, active, onClick, count }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-sfpro-medium transition-all duration-200 cursor-pointer
                ${active
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-[#888] hover:bg-gray-200 dark:hover:bg-[#2c2c2e]"
                }`}
        >
            <Icon size={15} />
            {label}
            {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-sfpro-bold
                    ${active
                        ? "bg-white/20 dark:bg-black/20 text-white dark:text-gray-900"
                        : "bg-gray-300 dark:bg-[#333] text-gray-600 dark:text-[#aaa]"
                    }`}>
                    {count}
                </span>
            )}
        </button>
    )
}

function LockedFieldHint() {
    return (
        <span className="inline-flex items-center gap-0.5 ml-1">
            <Lock size={9} className="text-gray-400 dark:text-[#555]" />
        </span>
    )
}

function ConsumptionRow({
    row,
    index,
    errors,
    onChange,
    onRemove,
    isLoading,
    inventoryList,
    isLoadingInventory,
    isWOMode,
}) {
    const rowErrors = errors[index] || []
    const hasError = (field) => rowErrors.includes(field)

    const hasInventorySelected = !!row.inventoryId?.trim()
    const isFieldLocked = (field) => {
        if (isWOMode) return false
        if (!hasInventorySelected) return false
        return ["materialName", "unit", "pricePerUnit"].includes(field)
    }

    const handleInventorySelect = (inventoryItem) => {
        if (isWOMode) {
            onChange(index, {
                ...row,
                inventoryId: inventoryItem._id || inventoryItem.id || "",
                materialMasterId: inventoryItem.materialMasterId || "",
            })
        } else {
            const price =
                inventoryItem.pricePerUnit !== undefined && inventoryItem.pricePerUnit !== null
                    ? String(inventoryItem.pricePerUnit)
                    : ""
            onChange(index, {
                ...row,
                inventoryId: inventoryItem._id || inventoryItem.id || "",
                materialMasterId: inventoryItem.materialMasterId || "",
                materialName: inventoryItem.name || inventoryItem.materialName || "",
                unit: inventoryItem.unit || "",
                pricePerUnit: price,
                totalCost: calcTotal(row.quantityConsumed, price),
            })
        }
    }

    const handleQtyOrPrice = (field, value) => {
        const updated = { ...row, [field]: value }
        updated.totalCost = calcTotal(
            field === "quantityConsumed" ? value : row.quantityConsumed,
            field === "pricePerUnit" ? value : row.pricePerUnit
        )
        onChange(index, updated)
    }

    return (
        <div className={`relative p-4 rounded-2xl border transition-colors duration-200
            ${rowErrors.length > 0
                ? "border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10"
                : "border-[#EAEAEA] dark:border-[#252525] bg-gray-50/50 dark:bg-[#161616]"
            }`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-base font-sfpro-bold text-[#212121] dark:text-white">
                        Material #{index + 1}
                    </span>
                    {isWOMode && (
                        <span className="text-[10px] font-sfpro-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                            WO
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={isLoading}
                    className="p-1 rounded-lg text-gray-400 dark:text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150 cursor-pointer disabled:opacity-40"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div>
                    <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                        {isWOMode
                            ? <>Inventory Reference <span className="text-gray-300 dark:text-[#555] font-sfpro">(audit link)</span></>
                            : "Inventory Item"
                        }
                    </label>
                    <Select
                        options={inventoryList.map((inv) => ({
                            value: inv._id || inv.id,
                            label: isWOMode
                                ? `${inv.name || inv.materialName} (${inv.unit})`
                                : `${inv.name || inv.materialName} (${inv.unit}) — Stock: ${inv.currentStock ?? "N/A"}`,
                        }))}
                        value={row.inventoryId || null}
                        onChange={(value) => {
                            const selected = inventoryList.find(
                                (inv) => (inv._id || inv.id) === value
                            )
                            if (selected) handleInventorySelect(selected)
                        }}
                        placeholder={
                            isLoadingInventory
                                ? "Loading inventory..."
                                : isWOMode
                                    ? "Select audit reference material"
                                    : "Select inventory item"
                        }
                        searchable={true}
                        disabled={isLoading || isLoadingInventory}
                        width="w-full"
                        error={hasError("inventoryId")}
                    />
                </div>

                <div>
                    <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                        Material Name
                        {isFieldLocked("materialName") && <LockedFieldHint />}
                    </label>
                    <input
                        type="text"
                        value={row.materialName}
                        onChange={(e) => {
                            if (isFieldLocked("materialName")) return
                            onChange(index, { ...row, materialName: e.target.value })
                        }}
                        readOnly={isFieldLocked("materialName")}
                        placeholder={
                            isWOMode
                                ? "Enter material name"
                                : hasInventorySelected ? "" : "Select inventory item first"
                        }
                        disabled={isLoading}
                        className={inputCls({
                            locked: isFieldLocked("materialName"),
                            errored: hasError("materialName"),
                        })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                            Unit
                            {isFieldLocked("unit") && <LockedFieldHint />}
                        </label>
                        {isWOMode ? (
                            <>
                                <input
                                    list={`unit-suggestions-${row.id}`}
                                    type="text"
                                    value={row.unit}
                                    onChange={(e) => onChange(index, { ...row, unit: e.target.value })}
                                    placeholder="Type or select unit"
                                    disabled={isLoading}
                                    className={inputCls({ errored: hasError("unit") })}
                                />
                                <datalist id={`unit-suggestions-${row.id}`}>
                                    {UNITS.map((u) => <option key={u} value={u} />)}
                                </datalist>
                            </>
                        ) : (
                            <Select
                                options={UNITS.map((u) => ({ value: u, label: u }))}
                                value={row.unit || null}
                                onChange={(value) => {
                                    if (isFieldLocked("unit")) return
                                    onChange(index, { ...row, unit: value })
                                }}
                                placeholder="Select unit"
                                searchable={false}
                                disabled={isLoading || isFieldLocked("unit")}
                                width="w-full"
                                error={hasError("unit")}
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                            Quantity
                        </label>
                        <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={row.quantityConsumed}
                            onChange={(e) => handleQtyOrPrice("quantityConsumed", e.target.value)}
                            placeholder="Quantity"
                            disabled={isLoading}
                            className={inputCls({ errored: hasError("quantityConsumed") })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                            Price / Unit
                            {isFieldLocked("pricePerUnit") && <LockedFieldHint />}
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.pricePerUnit}
                            onChange={(e) => {
                                if (isFieldLocked("pricePerUnit")) return
                                handleQtyOrPrice("pricePerUnit", e.target.value)
                            }}
                            readOnly={isFieldLocked("pricePerUnit")}
                            placeholder={
                                isWOMode
                                    ? "Enter price"
                                    : hasInventorySelected ? "" : "Auto from inventory"
                            }
                            disabled={isLoading}
                            className={inputCls({
                                locked: isFieldLocked("pricePerUnit"),
                                errored: hasError("pricePerUnit"),
                            })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                            Total Cost
                        </label>
                        <input
                            type="text"
                            value={row.totalCost ? `₹ ${row.totalCost}` : ""}
                            readOnly
                            placeholder="Auto-calculated"
                            className={totalCostCls}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-sfpro-medium text-gray-500 dark:text-white mb-1">
                        Remarks <span className="text-gray-300 dark:text-[#555] font-sfpro">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => onChange(index, { ...row, remarks: e.target.value })}
                        placeholder="Remarks..."
                        disabled={isLoading}
                        className={inputCls({})}
                    />
                </div>
            </div>
        </div>
    )
}

function ConsumptionSummary({ rows, isWOMode }) {
    const validRows = rows.filter((r) => r.totalCost !== "")
    if (validRows.length === 0) return null
    const total = validRows.reduce((sum, r) => sum + parseFloat(r.totalCost || 0), 0)
    return (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border
            ${isWOMode
                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                : "bg-gray-100 dark:bg-[#1e1e1e] border-[#e4e4e7] dark:border-[#2c2c2c]"
            }`}>
            <div>
                <span className="text-xs font-sfpro-medium text-gray-500 dark:text-[#888]">
                    Total Cost ({validRows.length} item{validRows.length !== 1 ? "s" : ""})
                </span>
                {isWOMode && (
                    <p className="text-[10px] font-sfpro text-blue-500 dark:text-blue-400 mt-0.5">
                        WO consumption — inventory not deducted
                    </p>
                )}
            </div>
            <span className="text-sm font-sfpro-bold text-gray-900 dark:text-white">
                ₹ {total.toFixed(2)}
            </span>
        </div>
    )
}

export default function UpdateProgressModal({
    isOpen,
    onClose,
    subtask,
    onSave,
    isLoading,
    showConsumption = false,
    projectId = null,
    inventoryList = [],
    isLoadingInventory = false,
    onSaveConsumption = null,
    recordedBy = "",
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    const isWOMode = !!subtask?.workOrderId

    const [activeSection, setActiveSection] = useState("progress")
    const [percent, setPercent] = useState(0)
    const [consumptionRows, setConsumptionRows] = useState([])
    const [consumptionErrors, setConsumptionErrors] = useState({})
    const [isSavingConsumption, setIsSavingConsumption] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setPercent(subtask?.completionPercent || 0)
            setConsumptionRows([])
            setConsumptionErrors({})
            setActiveSection("progress")
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => setMounted(false), 300)
            return () => clearTimeout(t)
        }
    }, [isOpen, subtask])

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape" && isOpen && !isLoading && !isSavingConsumption) onClose()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, isLoading, isSavingConsumption, onClose])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    const handleAddRow = useCallback(() => {
        setConsumptionRows((prev) => [
            ...prev,
            { ...EMPTY_CONSUMPTION_ROW, id: crypto.randomUUID() },
        ])
        setConsumptionErrors({})
    }, [])

    const handleRowChange = useCallback((index, updated) => {
        setConsumptionRows((prev) => prev.map((r, i) => (i === index ? updated : r)))
        setConsumptionErrors((prev) => {
            const next = { ...prev }
            delete next[index]
            return next
        })
    }, [])

    const handleRemoveRow = useCallback((index) => {
        setConsumptionRows((prev) => prev.filter((_, i) => i !== index))
        setConsumptionErrors((prev) => {
            const next = {}
            Object.entries(prev).forEach(([k, v]) => {
                const ki = parseInt(k)
                if (ki < index) next[ki] = v
                else if (ki > index) next[ki - 1] = v
            })
            return next
        })
    }, [])

    const handleSaveConsumption = useCallback(async () => {
        if (!onSaveConsumption || consumptionRows.length === 0) return

        const errors = validateRows(consumptionRows)
        if (Object.keys(errors).length > 0) {
            setConsumptionErrors(errors)
            return
        }

        setIsSavingConsumption(true)
        try {
            await onSaveConsumption(
                consumptionRows.map((r) => ({
                    inventoryId: r.inventoryId.trim(),
                    materialMasterId: r.materialMasterId.trim(),
                    materialName: r.materialName.trim(),
                    unit: r.unit.trim(),
                    quantityConsumed: parseFloat(r.quantityConsumed),
                    pricePerUnit: parseFloat(r.pricePerUnit),
                    totalCost: parseFloat(r.totalCost),
                    remarks: r.remarks?.trim() || null,
                    recordedBy,
                    source: "StockIssue",
                }))
            )
            setConsumptionRows([])
            setConsumptionErrors({})
        } finally {
            setIsSavingConsumption(false)
        }
    }, [consumptionRows, onSaveConsumption, recordedBy])

    const busyLoading = isLoading || isSavingConsumption

    if (!mounted) return null

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
            <div
                onClick={() => !busyLoading && onClose()}
                className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm
                    transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
            />
            <div className={`relative w-full bg-white dark:bg-[#121212] rounded-3xl shadow-2xl
                overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${showConsumption ? "max-w-lg" : "max-w-md"}
                ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"}`}
            >
                <div className="flex items-start justify-between p-6 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[18px] font-sfpro-bold text-gray-900 dark:text-white tracking-tight">
                                {activeSection === "progress" ? "Update Progress" : "Record Consumption"}
                            </h2>
                            {activeSection === "consumption" && isWOMode && (
                                <span className="text-[10px] font-sfpro-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                                    WO Mode
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-gray-500 dark:text-[#888] font-sfpro line-clamp-2 max-w-60 sm:max-w-72 mt-0.5">
                            {activeSection === "progress"
                                ? "Update your progress using the slider to reflect completion and save your changes."
                                : isWOMode
                                    ? "Enter all material details manually. Contractor supplies materials - project inventory is unchanged."
                                    : "Select materials from inventory. Name, unit and price are auto-filled - only enter quantity consumed."
                            }
                        </p>
                    </div>
                    <button
                        onClick={() => !busyLoading && onClose()}
                        disabled={busyLoading}
                        className="p-1 rounded-full bg-[#212121] dark:bg-white transition-colors shrink-0
                            flex items-center justify-center mt-1 hover:scale-90 duration-200
                            cursor-pointer disabled:opacity-50"
                    >
                        <X size={16} className="text-white dark:text-black" strokeWidth={2.5} />
                    </button>
                </div>
                {showConsumption && (
                    <div className="flex gap-2 px-6 pb-4">
                        <SectionToggle
                            label="Progress"
                            icon={({ size }) => (
                                <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                                    <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                                </svg>
                            )}
                            active={activeSection === "progress"}
                            onClick={() => setActiveSection("progress")}
                            count={0}
                        />
                        <SectionToggle
                            label={isWOMode ? "WO Consumption" : "Consumption"}
                            icon={Package}
                            active={activeSection === "consumption"}
                            onClick={() => setActiveSection("consumption")}
                            count={consumptionRows.length}
                        />
                    </div>
                )}
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: "calc(100dvh - 240px)", scrollbarWidth: "thin" }}
                >
                    {activeSection === "progress" && (
                        <div className="p-6 pt-2">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-gray-50 dark:border-[#1a1a1a]">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor"
                                            strokeWidth="8" className="text-[#f0f0f0] dark:text-[#27272a]" />
                                        <circle
                                            cx="50" cy="50" r="46"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeDasharray="289.026"
                                            strokeDashoffset={289.026 - (289.026 * percent) / 100}
                                            strokeLinecap="round"
                                            className="text-gray-900 dark:text-white transition-all duration-300 ease-out"
                                        />
                                    </svg>
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-sfpro-bold text-gray-900 dark:text-white">
                                            {percent}%
                                        </span>
                                        <span className="text-[11px] font-sfpro text-gray-500 dark:text-[#888] uppercase tracking-wider">
                                            Completed
                                        </span>
                                    </div>
                                </div>

                                <div className="w-full space-y-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={percent}
                                        onChange={(e) => setPercent(Number(e.target.value))}
                                        disabled={busyLoading}
                                        className="w-full h-2 bg-gray-200 dark:bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white disabled:opacity-50"
                                    />
                                    <div className="flex justify-between text-xs font-sfpro-medium text-gray-400 dark:text-[#666]">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "consumption" && showConsumption && (
                        <div className="p-6 pt-2 flex flex-col gap-4">

                            {isWOMode && consumptionRows.length === 0 && (
                                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-violet-600">
                                    <AlertCircle size={15} className="text-violet-400 mt-0.5 shrink-0" />
                                    <p className="text-xs font-sfpro text-violet-600 dark:text-violet-400">
                                        This subtask is linked to a Work Order. All material details must be entered manually. Inventory stock will not be deducted.
                                    </p>
                                </div>
                            )}

                            {consumptionRows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center rounded-2xl border-2 border-dashed border-[#e4e4e7] dark:border-[#252525]">
                                    <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center">
                                        <Package size={20} className="text-gray-400 dark:text-[#555]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-sfpro-medium text-gray-600 dark:text-[#aaa]">
                                            No materials added
                                        </p>
                                        <p className="text-xs font-sfpro text-gray-400 dark:text-[#666] mt-0.5">
                                            {isWOMode
                                                ? "Add contractor-supplied materials for cost tracking."
                                                : "Select from project inventory to log consumption."
                                            }
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-sfpro-medium hover:bg-black dark:hover:bg-gray-200 transition-all cursor-pointer"
                                    >
                                        <Plus size={14} />
                                        Add Material
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {consumptionRows.map((row, idx) => (
                                        <ConsumptionRow
                                            key={row.id}
                                            row={row}
                                            index={idx}
                                            errors={consumptionErrors}
                                            onChange={handleRowChange}
                                            onRemove={handleRemoveRow}
                                            isLoading={busyLoading}
                                            inventoryList={inventoryList}
                                            isLoadingInventory={isLoadingInventory}
                                            isWOMode={isWOMode}
                                        />
                                    ))}

                                    <ConsumptionSummary rows={consumptionRows} isWOMode={isWOMode} />

                                    {Object.keys(consumptionErrors).length > 0 && (
                                        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                                            <p className="text-xs font-sfpro text-red-600 dark:text-red-400">
                                                Please fill all required fields in the highlighted rows.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        disabled={busyLoading}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#e4e4e7] dark:border-[#252525] text-sm font-sfpro-medium text-gray-500 dark:text-[#666] hover:border-gray-400 dark:hover:border-[#444] hover:text-gray-700 dark:hover:text-[#aaa] transition-all duration-150 w-full justify-center cursor-pointer disabled:opacity-40"
                                    >
                                        <Plus size={14} />
                                        Add Another Material
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 px-6 bg-gray-50/50 dark:bg-[#161616] border-t border-gray-100 dark:border-[#1e1e1e] flex justify-end gap-3">
                    <button
                        onClick={() => !busyLoading && onClose()}
                        disabled={busyLoading}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-sfpro-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c2c2e] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>

                    {activeSection === "progress" && (
                        <button
                            onClick={() => onSave(percent)}
                            disabled={busyLoading || percent === subtask?.completionPercent}
                            className="px-6 py-2.5 rounded-xl text-[14px] font-sfpro-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 cursor-pointer"
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            {isLoading ? "Saving..." : "Save Progress"}
                        </button>
                    )}

                    {activeSection === "consumption" && showConsumption && (
                        <button
                            onClick={handleSaveConsumption}
                            disabled={busyLoading || consumptionRows.length === 0}
                            className="px-6 py-2.5 rounded-xl text-[14px] font-sfpro-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 cursor-pointer"
                        >
                            {isSavingConsumption && <Loader2 size={16} className="animate-spin" />}
                            {isSavingConsumption
                                ? "Recording..."
                                : isWOMode
                                    ? `Record ${consumptionRows.length > 1 ? `${consumptionRows.length} WO Materials` : "WO Material"}`
                                    : `Record ${consumptionRows.length > 1 ? `${consumptionRows.length} Materials` : "Consumption"}`
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}