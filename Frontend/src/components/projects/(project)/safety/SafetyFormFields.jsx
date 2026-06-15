"use client"

import { useRef } from "react"
import {
    Trash2,
    Upload,
    FileText,
    X,
    Plus,
} from "lucide-react"
import DatePicker from "@/components/ui/DatePicker"
import { Select } from "@/components/ui/DropDown"

const CATEGORY_OPTIONS = [
    { label: "Safety", value: "Safety" },
    { label: "Quality", value: "Quality" },
]
const STATUS_OPTIONS = [
    { label: "Pass", value: "Pass" },
    { label: "Fail", value: "Fail" },
    { label: "Observation", value: "Observation" },
]
const SEVERITY_OPTIONS = [
    { label: "Low", value: "Low" },
    { label: "Medium", value: "Medium" },
    { label: "High", value: "High" },
]

function AttachmentButton({ attachmentFile, attachment, onFileChange, onClear, disabled }) {
    const inputRef = useRef(null)

    const hasNewFile = attachmentFile instanceof File
    const hasExisting = !hasNewFile && !!attachment

    const displayName = hasNewFile
        ? attachmentFile.name
        : hasExisting
            ? (typeof attachment === "string"
                ? attachment.split("/").pop() || "Attached"
                : "Attached")
            : null

    const handleRemove = () => {
        if (hasNewFile) {
            onFileChange(null)
        } else {
            onClear()
        }
    }

    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="flex items-center gap-1 px-2.5 h-8 rounded-lg text-[11.5px] font-sfpro-medium border border-dashed border-gray-300 dark:border-[#333] hover:border-gray-400 dark:hover:border-[#555] transition-colors disabled:opacity-50"
            >
                <Upload className="w-3 h-3" />
                {displayName ? "Replace" : "File"}
            </button>

            {displayName && (
                <div className="flex items-center gap-1 px-2 h-7 rounded-md bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]">
                    <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-[10.5px] font-sfpro text-gray-600 dark:text-[#a1a1aa] truncate max-w-20">
                        {displayName}
                    </span>
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={disabled}
                        className="hover:text-red-500 transition-colors disabled:opacity-50 shrink-0 ml-0.5"
                    >
                        <X className="w-2.5 h-2.5" />
                    </button>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                disabled={disabled}
                className="hidden"
            />
        </div>
    )
}

function EntryCard({ entry, index, onChange, onRemove, disabled, canRemove }) {
    const update = (key, val) => onChange(index, { ...entry, [key]: val })

    return (
        <div className="rounded-xl border border-gray-200 dark:border-[#252525] bg-white dark:bg-[#111] p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-sfpro-bold text-gray-400 dark:text-[#52525b] uppercase tracking-wider">
                    Entry {index + 1}
                </span>
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        disabled={disabled}
                        className="w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-3">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Inspection title"
                        value={entry.title || ""}
                        onChange={(e) => update("title", e.target.value)}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12px] font-sfpro bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                    />
                </div>
                <div className="col-span-3">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Category
                    </label>
                    <Select
                        options={CATEGORY_OPTIONS}
                        value={entry.category || "Safety"}
                        onChange={(val) => update("category", val)}
                        disabled={disabled}
                        placeholder="Category"
                        width="w-full"
                    />
                </div>
                <div className="col-span-3">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Status
                    </label>
                    <Select
                        options={STATUS_OPTIONS}
                        value={entry.status || "Observation"}
                        onChange={(val) => update("status", val)}
                        disabled={disabled}
                        placeholder="Status"
                        width="w-full"
                    />
                </div>
                <div className="col-span-3">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Severity
                    </label>
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

            <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-2">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Date <span className="text-red-500">*</span>
                    </label>
                    <div className="[&>div]:w-full [&>div>button]:w-full [&>div>button]:h-8 [&>div>button]:text-[12px]">
                        <DatePicker
                            value={entry.inspectionDate || null}
                            onChange={(date) => update("inspectionDate", date)}
                            placeholder="Date"
                            maxDate={new Date()}
                        />
                    </div>
                </div>
                <div className="col-span-3">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Location
                    </label>
                    <input
                        type="text"
                        placeholder="Block A, Floor 3"
                        value={entry.location || ""}
                        onChange={(e) => update("location", e.target.value)}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12px] font-sfpro bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                    />
                </div>
                <div className="col-span-4">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Description
                    </label>
                    <input
                        type="text"
                        placeholder="Brief finding description"
                        value={entry.description || ""}
                        onChange={(e) => update("description", e.target.value)}
                        disabled={disabled}
                        className="w-full h-8 px-2.5 rounded-lg text-[12px] font-sfpro bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                    />
                </div>
                <div className="col-span-3">
                    <label className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] mb-0.5 block">
                        Attachment
                    </label>
                    <AttachmentButton
                        attachmentFile={entry.attachmentFile}
                        attachment={entry.attachment}
                        onFileChange={(file) => update("attachmentFile", file)}
                        onClear={() => onChange(index, {
                            ...entry,
                            attachmentFile: null,
                            attachment: null,
                        })}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    )
}

export function EntriesList({ entries = [], onChange, disabled = false }) {
    const handleChange = (index, updated) => {
        const next = [...entries]
        next[index] = updated
        onChange(next)
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
                attachment: null,
            },
        ])
    }

    return (
        <div className="space-y-3">
            {entries.map((entry, i) => (
                <EntryCard
                    key={i}
                    entry={entry}
                    index={i}
                    onChange={handleChange}
                    onRemove={handleRemove}
                    disabled={disabled}
                    canRemove={entries.length > 1}
                />
            ))}

            <button
                type="button"
                onClick={handleAdd}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black text-[12px] font-sfpro-medium hover:bg-[#111] dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
            </button>

            <p className="text-[10.5px] font-sfpro text-gray-400 dark:text-[#52525b] text-center">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
        </div>
    )
}

export function SafetyFormContent({ form, setForm, disabled = false }) {
    return (
        <div
            className="flex-1 overflow-y-auto px-6 lg:px-12 xl:px-20 pt-4 pb-24"
            style={{ scrollbarWidth: "thin" }}
        >
            <EntriesList
                entries={form.entries || []}
                onChange={(entries) => setForm((p) => ({ ...p, entries }))}
                disabled={disabled}
            />
        </div>
    )
}