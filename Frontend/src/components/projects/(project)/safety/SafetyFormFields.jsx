"use client"

import { useState, useRef } from "react"
import {
    Trash2,
    Upload,
    FileText,
    X,
    Plus,
} from "lucide-react"
import DatePicker from "@/components/ui/DatePicker"
import { Select } from "@/components/ui/DropDown"

const CATEGORIES = ["Safety", "Quality"]
const STATUSES = ["Pass", "Fail", "Observation"]
const SEVERITIES = ["Low", "Medium", "High"]

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ label: c, value: c }))
const STATUS_OPTIONS = STATUSES.map((s) => ({ label: s, value: s }))
const SEVERITY_OPTIONS = SEVERITIES.map((s) => ({ label: s, value: s }))

function EntryAttachmentField({ value, onChange, disabled }) {
    const inputRef = useRef(null)
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
            >
                <Upload className="w-3 h-3" />
                {value ? "Replace" : "Attach"}
            </button>
            {value && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] font-sfpro text-gray-700 dark:text-[#d4d4d8] truncate max-w-24">
                        {value instanceof File ? value.name : "Attached"}
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        disabled={disabled}
                        className="w-3.5 h-3.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center disabled:opacity-50"
                    >
                        <X className="w-2.5 h-2.5 text-gray-500" />
                    </button>
                </div>
            )}
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

function EntryRow({ entry, index, onChange, onRemove, disabled, canRemove }) {
    const update = (key, val) => onChange(index, { ...entry, [key]: val })

    return (
        <div className="rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wide">
                    Entry #{index + 1}
                </span>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={!canRemove || disabled}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div>
                <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                    Title <span className="text-red-500">*</span>
                </div>
                <input
                    type="text"
                    placeholder="Inspection title..."
                    value={entry.title || ""}
                    onChange={(e) => update("title", e.target.value)}
                    disabled={disabled}
                    className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                />
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Category <span className="text-red-500">*</span>
                    </div>
                    <Select
                        options={CATEGORY_OPTIONS}
                        value={entry.category || "Safety"}
                        onChange={(val) => update("category", val)}
                        disabled={disabled}
                        placeholder="Category"
                        width="w-full"
                    />
                </div>
                <div>
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Status <span className="text-red-500">*</span>
                    </div>
                    <Select
                        options={STATUS_OPTIONS}
                        value={entry.status || "Observation"}
                        onChange={(val) => update("status", val)}
                        disabled={disabled}
                        placeholder="Status"
                        width="w-full"
                    />
                </div>
                <div>
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Severity <span className="text-red-500">*</span>
                    </div>
                    <Select
                        options={SEVERITY_OPTIONS}
                        value={entry.severity || "Low"}
                        onChange={(val) => update("severity", val)}
                        disabled={disabled}
                        placeholder="Severity"
                        width="w-full"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Inspection Date <span className="text-red-500">*</span>
                    </div>
                    <div className="w-full [&>div]:w-full [&>div>button]:w-full [&>div>button]:h-8 [&>div>button]:text-[12.5px]">
                        <DatePicker
                            value={entry.inspectionDate || null}
                            onChange={(date) => update("inspectionDate", date)}
                            placeholder="Select date"
                            maxDate={new Date()}
                        />
                    </div>
                </div>
                <div>
                    <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                        Location
                    </div>
                    <input
                        type="text"
                        placeholder="e.g. Block A, Floor 3"
                        value={entry.location || ""}
                        onChange={(e) => update("location", e.target.value)}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                    />
                </div>
            </div>

            <div>
                <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                    Attachment
                </div>
                <EntryAttachmentField
                    value={entry.attachmentFile || entry.attachment}
                    onChange={(file) => update("attachmentFile", file)}
                    disabled={disabled}
                />
            </div>

            <div>
                <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                    Description
                </div>
                <textarea
                    rows={2}
                    placeholder="Describe the inspection finding..."
                    value={entry.description || ""}
                    onChange={(e) => update("description", e.target.value)}
                    disabled={disabled}
                    className="w-full px-2.5 py-1.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] resize-none disabled:opacity-50"
                />
            </div>

            <div>
                <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
                    Remarks
                </div>
                <input
                    type="text"
                    placeholder="Optional remarks..."
                    value={entry.remarks || ""}
                    onChange={(e) => update("remarks", e.target.value)}
                    disabled={disabled}
                    className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                />
            </div>
        </div>
    )
}

export function EntriesList({ entries = [], onChange, disabled = false }) {
    const handleEntryChange = (index, updated) => {
        const newEntries = [...entries]
        newEntries[index] = updated
        onChange(newEntries)
    }

    const handleRemove = (index) => {
        if (entries.length <= 1) return
        onChange(entries.filter((_, i) => i !== index))
    }

    const handleAdd = () => {
        const keycloakId =
            typeof window !== "undefined"
                ? localStorage.getItem("keycloakId") || ""
                : ""

        onChange([
            ...entries,
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
        ])
    }

    return (
        <div className="col-span-full">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
                    Inspection Entries <span className="text-red-500">*</span>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                    <Plus className="w-3 h-3" />
                    Add Entry
                </button>
            </div>
            <div
                className="space-y-3 max-h-96 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin" }}
            >
                {entries.map((entry, index) => (
                    <EntryRow
                        key={index}
                        entry={entry}
                        index={index}
                        onChange={handleEntryChange}
                        onRemove={handleRemove}
                        disabled={disabled}
                        canRemove={entries.length > 1}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
                    {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
                </p>
            </div>
        </div>
    )
}

export function SafetyFormContent({ form, setForm, disabled = false }) {
    return (
        <div
            className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
            style={{ scrollbarWidth: "none" }}
        >
            <div className="grid grid-cols-1 gap-x-4 gap-y-5">
                <EntriesList
                    entries={form.entries || []}
                    onChange={(entries) => setForm((p) => ({ ...p, entries }))}
                    disabled={disabled}
                />
            </div>
        </div>
    )
}