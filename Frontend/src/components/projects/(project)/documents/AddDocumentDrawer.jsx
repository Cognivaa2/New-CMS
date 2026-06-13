"use client"
import { useEffect, useState } from "react"
import { UploadCloud, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { DOCUMENT_CATEGORIES, MAX_FILE_SIZE } from "@/lib/documentConstants"
import { Select } from "@/components/ui/DropDown"

function Backdrop({ visible, onClose }) {
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

function Field({ label, placeholder, type = "text", colSpan, value, onChange, disabled, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function SelectField({ label, colSpan, value, onChange, options, placeholder, disabled, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <Select
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        width="w-full"
      />
    </div>
  )
}

function FileUploadField({ label, colSpan, onChange, disabled, selectedFile }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large", { description: "Maximum file size is 20MB" })
        return
      }
      onChange?.(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large", { description: "Maximum file size is 20MB" })
        return
      }
      onChange?.(file)
    }
  }

  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label} <span className="text-red-500">*</span>
      </div>
      <label
        className={`w-full h-36 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group relative overflow-hidden ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${
          isDragging
            ? "border-[#545ceb] bg-[#545ceb]/5 dark:bg-[#545ceb]/10"
            : "border-gray-300 dark:border-[#3f3f46] bg-gray-50/50 dark:bg-[#121212]/50 hover:bg-gray-50 dark:hover:bg-[#18181b]"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileChange}
          disabled={disabled}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.dwg,.dxf"
        />

        {selectedFile ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-[13.5px] font-sfpro-medium text-green-700 dark:text-green-400 text-center px-4 truncate max-w-full">
              {selectedFile.name}
            </p>
            <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#71717a] mt-1">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white dark:bg-[#27272a] shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200 border border-gray-100 dark:border-[#3f3f46]">
              <UploadCloud
                className={`w-6 h-6 ${
                  isDragging ? "text-[#545ceb]" : "text-gray-400 dark:text-[#a1a1aa]"
                }`}
              />
            </div>
            <p className="text-[13.5px] font-sfpro-medium text-gray-700 dark:text-[#f4f4f5]">
              <span className="text-[#545ceb] font-sfpro-bold">Click to upload</span>{" "}
              <span className="text-gray-400 font-sfpro">or drag and drop</span>
            </p>
            <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#71717a] mt-1.5">
              PDF, DOCX, XLSX, or Images (max. 20MB)
            </p>
          </>
        )}
      </label>
    </div>
  )
}

function TextArea({ label, placeholder, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
      </div>
      <textarea
        placeholder={placeholder}
        rows={3}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function TagsInput({ label, colSpan, value = [], onChange, disabled, placeholder }) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const tag = inputValue.trim()
      if (tag && !value.includes(tag)) {
        onChange([...value, tag])
      }
      setInputValue("")
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
      </div>
      <div
        className={`w-full min-h-9 px-2 py-1.5 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-[#414141] focus-within:border-gray-300 dark:focus-within:border-[#3f3f46] transition-all duration-150 flex flex-wrap gap-1.5 items-center ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#27272a] text-gray-700 dark:text-[#d4d4d8] text-xs font-sfpro-medium"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] text-gray-500 dark:text-[#71717a] transition-colors"
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-25 h-6 bg-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p className="text-[10px] font-sfpro text-gray-400 dark:text-[#52525b] mt-1">
        Press Enter or comma to add tags
      </p>
    </div>
  )
}

const INITIAL_FORM = {
  name: "",
  category: "",
  description: "",
  tags: [],
}

export default function AddDocumentDrawer({ open, onClose, onSubmit, isUploading = false }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setSelectedFile(null)
      setFormData(INITIAL_FORM)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setSelectedFile(null)
        setFormData(INITIAL_FORM)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && !submitting && !isUploading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, isUploading, onClose])

  const handleClose = () => {
    if (!submitting && !isUploading) onClose()
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("File Required", { description: "Please select a file to upload" })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        file: selectedFile,
        name: formData.name?.trim() || selectedFile.name,
        category: formData.category || "other",
        description: formData.description?.trim() || "",
        tags: formData.tags || [],
      }

      await onSubmit?.(payload)
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = submitting || isUploading

  if (!mounted) return null

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div
        style={{
          transitionDuration: "1000ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[70dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0 transition-colors">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                Upload Document
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                Add files to your project workspace
              </p>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 space-y-8 pb-25"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
              <FileUploadField
                label="Select File"
                colSpan="col-span-2 md:col-span-4"
                onChange={(file) => setSelectedFile(file)}
                selectedFile={selectedFile}
                disabled={isLoading}
              />

              <Field
                label="Document Name"
                placeholder="e.g., Q3 Financial Report"
                colSpan="col-span-2"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isLoading}
              />
              <SelectField
                label="Category"
                colSpan="col-span-2"
                value={formData.category}
                onChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
                options={DOCUMENT_CATEGORIES}
                placeholder="Select category..."
                disabled={isLoading}
              />
              <TagsInput
                label="Tags (Optional)"
                colSpan="col-span-2 md:col-span-4"
                value={formData.tags}
                onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                disabled={isLoading}
                placeholder="Add tags..."
              />
              <TextArea
                label="Description (Optional)"
                placeholder="Add any relevant notes or context for this file…"
                colSpan="col-span-2 md:col-span-4"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
              />
            </div>
            <div className="h-1" />
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 bg-white dark:bg-[#09090b] border-t border-gray-100 dark:border-[#27272a] transition-colors">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
              className={`cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium transition-all duration-150 flex items-center gap-2 ${
                selectedFile && !isLoading
                  ? "bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200"
                  : "bg-gray-200 dark:bg-[#27272a] text-gray-400 dark:text-[#52525b] cursor-not-allowed"
              }`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}