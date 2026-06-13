// src/components/projects/(project)/issues/IssueFormFields.jsx

"use client"

import { useState, useRef } from "react"
import {
    X, Search, ChevronDown, Upload, File,
    Image as ImageIcon, Trash2,
} from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"
export const ISSUE_TYPE_OPTIONS = [
    { value: "site_hazard", label: "Site Hazard" },
    { value: "material_shortage", label: "Material Shortage" },
    { value: "task_delay", label: "Task Delay" },
    { value: "quality_defect", label: "Quality Defect" },
    { value: "equipment_breakdown", label: "Equipment Breakdown" },
    { value: "safety_concern", label: "Safety Concern" },
    { value: "design_change", label: "Design Change" },
    { value: "financial_exception", label: "Financial Exception" },
    { value: "other", label: "Other" },
]
export const PRIORITY_OPTIONS = [
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
]
export function Backdrop({ visible, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
                visible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        />
    )
}
export function Field({
    label, placeholder, colSpan, value, onChange,
    disabled, required, type = "text", min, max, maxLength,
}) {
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label} {required && <span className="text-red-500">*</span>}
            </div>
            <input
                type={type}
                placeholder={placeholder}
                value={value ?? ""}
                onChange={onChange}
                disabled={disabled}
                min={min} max={max} maxLength={maxLength}
                className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    )
}
export function SelectField({ label, options, colSpan, value, onChange, disabled, required, placeholder }) {
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label} {required && <span className="text-red-500">*</span>}
            </div>
            <Select
                placeholder={placeholder || `Select ${label.toLowerCase()}`}
                options={options}
                value={value}
                onChange={onChange}
                width="w-full"
                disabled={disabled}
            />
        </div>
    )
}
export function DatePickerField({ label, colSpan = "col-span-1", value, onChange, required, minDate, maxDate }) {
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label} {required && <span className="text-red-500">*</span>}
            </div>
            <div className="w-full">
                <DatePicker
                    placeholder={`Select ${label.toLowerCase()}`}
                    value={value}
                    onChange={onChange}
                    minDate={minDate}
                    maxDate={maxDate}
                />
            </div>
        </div>
    )
}
export function TextArea({ label, placeholder, colSpan, value, onChange, disabled, required, rows = 3 }) {
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label} {required && <span className="text-red-500">*</span>}
            </div>
            <textarea
                placeholder={placeholder}
                rows={rows}
                value={value ?? ""}
                onChange={onChange}
                disabled={disabled}
                className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    )
}
export function TagsInput({ colSpan, tags = [], onChange, disabled = false }) {
    const [input, setInput] = useState("")
    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            const tag = input.trim().toLowerCase()
            if (tag && !tags.includes(tag) && tags.length < 10) {
                onChange([...tags, tag])
                setInput("")
            }
        }
        if (e.key === "Backspace" && input === "" && tags.length > 0) {
            onChange(tags.slice(0, -1))
        }
    }
    const removeTag = (index) => {
        onChange(tags.filter((_, i) => i !== index))
    }
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                Tags
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-[#414141] transition-all duration-150">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#252525] text-xs font-sfpro text-gray-700 dark:text-[#d4d4d8]"
                    >
                        {tag}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-gray-300 dark:hover:bg-[#3f3f46] transition-colors"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || tags.length >= 10}
                    placeholder={
                        tags.length === 0
                            ? "Type and press Enter..."
                            : tags.length >= 10
                              ? "Max 10 tags"
                              : "Add tag..."
                    }
                    className="flex-1 min-w-25 bg-transparent text-[13.5px] font-sfpro text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] outline-none disabled:opacity-50"
                />
            </div>
            {tags.length > 0 && (
                <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mt-1">
                    {tags.length}/10 tags
                </p>
            )}
        </div>
    )
}
function getFileIcon(file) {
    const type = file.type || ""
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-500" />
    return <File className="w-4 h-4 text-gray-500 dark:text-[#888]" />
}
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
export function FileUploadField({ colSpan, files = [], onChange, disabled = false, maxFiles = 5 }) {
    const fileInputRef = useRef(null)
    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || [])
        const remaining = maxFiles - files.length
        if (remaining <= 0) return
        const toAdd = selected.slice(0, remaining)
        onChange([...files, ...toAdd])
        if (fileInputRef.current) fileInputRef.current.value = ""
    }
    const removeFile = (index) => {
        onChange(files.filter((_, i) => i !== index))
    }
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                Attachments
            </div>
            {files.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]"
                        >
                            {getFileIcon(file)}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate">
                                    {file.name}
                                </p>
                                <p className="text-[10px] font-sfpro text-gray-400 dark:text-[#52525b]">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-200 dark:hover:bg-[#3f3f46] transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition-colors" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || files.length >= maxFiles}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-gray-300 dark:border-[#3f3f46] text-gray-500 dark:text-[#71717a] hover:border-gray-400 dark:hover:border-[#52525b] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all duration-150 text-xs font-sfpro-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Upload className="w-3.5 h-3.5" />
                {files.length >= maxFiles
                    ? `Max ${maxFiles} files`
                    : `Upload files (${files.length}/${maxFiles})`}
            </button>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
        </div>
    )
}
export function ExistingAttachments({ colSpan, attachments = [] }) {
    if (!attachments || attachments.length === 0) return null
    return (
        <div className={colSpan}>
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                Existing Attachments
            </div>
            <div className="flex flex-col gap-1.5">
                {attachments.map((att, index) => (
                    <div
                        key={att._id || index}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]"
                    >
                        <File className="w-4 h-4 text-gray-500 dark:text-[#888] shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate">
                                {att.originalName || att.fileName || `Attachment ${index + 1}`}
                            </p>
                            {att.fileSize && (
                                <p className="text-[10px] font-sfpro text-gray-400 dark:text-[#52525b]">
                                    {formatFileSize(att.fileSize)}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
export function IssueFormContentAdd({
    form,
    setForm,
    disabled = false,
}) {
    const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
    const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
    const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))
    const updateTags = (tags) => setForm((p) => ({ ...p, tags }))
    const updateFiles = (files) => setForm((p) => ({ ...p, attachments: files }))
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
            <SelectField
                label="Issue Type"
                options={ISSUE_TYPE_OPTIONS}
                colSpan="col-span-1"
                value={form.issueType}
                onChange={updateSelect("issueType")}
                disabled={disabled}
                required
            />
            <SelectField
                label="Priority"
                options={PRIORITY_OPTIONS}
                colSpan="col-span-1"
                value={form.priority}
                onChange={updateSelect("priority")}
                disabled={disabled}
            />
            <Field
                label="Issue Title"
                placeholder="e.g. Plastering crack on floor 3"
                colSpan="col-span-2"
                value={form.title}
                onChange={updateField("title")}
                disabled={disabled}
                required
                maxLength={300}
            />
            <DatePickerField
                label="Due Date"
                colSpan="col-span-1"
                value={form.dueDate}
                onChange={updateDate("dueDate")}
            />
            <div className="col-span-1 md:col-span-3" />
            <TagsInput
                colSpan="col-span-2 md:col-span-4"
                tags={form.tags}
                onChange={updateTags}
                disabled={disabled}
            />
            <TextArea
                label="Description"
                placeholder="Describe the issue in detail..."
                colSpan="col-span-2 md:col-span-4"
                value={form.description}
                onChange={updateField("description")}
                disabled={disabled}
                required
                rows={4}
            />
            <FileUploadField
                colSpan="col-span-2 md:col-span-4"
                files={form.attachments}
                onChange={updateFiles}
                disabled={disabled}
                maxFiles={5}
            />
        </div>
    )
}
export function IssueFormContentEdit({
    form,
    setForm,
    disabled = false,
    existingAttachments = [],
}) {
    const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
    const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
    const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))
    const updateTags = (tags) => setForm((p) => ({ ...p, tags }))
    const updateNewFiles = (files) => setForm((p) => ({ ...p, newAttachments: files }))

    return (
        <div
            className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25"
            style={{ scrollbarWidth: "none" }}
        >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field
                    label="Issue Title"
                    placeholder="e.g. Plastering crack on floor 3"
                    colSpan="col-span-2"
                    value={form.title}
                    onChange={updateField("title")}
                    disabled={disabled}
                    required
                    maxLength={300}
                />
                <SelectField
                    label="Issue Type"
                    options={ISSUE_TYPE_OPTIONS}
                    colSpan="col-span-1"
                    value={form.issueType}
                    onChange={updateSelect("issueType")}
                    disabled={disabled}
                    required
                />
                <SelectField
                    label="Priority"
                    options={PRIORITY_OPTIONS}
                    colSpan="col-span-1"
                    value={form.priority}
                    onChange={updateSelect("priority")}
                    disabled={disabled}
                />
                <DatePickerField
                    label="Due Date"
                    colSpan="col-span-1"
                    value={form.dueDate}
                    onChange={updateDate("dueDate")}
                />
                <div className="col-span-1 md:col-span-3" />
                <TagsInput
                    colSpan="col-span-2 md:col-span-4"
                    tags={form.tags}
                    onChange={updateTags}
                    disabled={disabled}
                />
                <TextArea
                    label="Description"
                    placeholder="Describe the issue in detail..."
                    colSpan="col-span-2 md:col-span-4"
                    value={form.description}
                    onChange={updateField("description")}
                    disabled={disabled}
                    required
                    rows={4}
                />
                <ExistingAttachments
                    colSpan="col-span-2 md:col-span-4"
                    attachments={existingAttachments}
                />
                <FileUploadField
                    colSpan="col-span-2 md:col-span-4"
                    files={form.newAttachments || []}
                    onChange={updateNewFiles}
                    disabled={disabled}
                    maxFiles={5}
                />
            </div>
        </div>
    )
}