// components/projects/(project)/documents/EditDocumentModal.jsx
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { DOCUMENT_CATEGORIES } from "@/lib/documentConstants"
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
function Field({ label, placeholder, colSpan, value, onChange, disabled, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}
function SelectField({ label, colSpan, value, onChange, options, placeholder, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
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
function TextArea({ label, placeholder, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
      </div>
      <textarea
        placeholder={placeholder}
        rows={3}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
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
        className={`w-full min-h-9 px-2 py-1.5 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-[#414141] transition-all duration-150 flex flex-wrap gap-1.5 items-center ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
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
function formFromDocument(doc) {
  if (!doc) return null
  console.log("[EditModal] formFromDocument input:", doc)
  const form = {
    name: doc.name || doc.title || "",
    description: doc.description || "",
    category: doc.category || "",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
  }
  console.log("[EditModal] formFromDocument output:", form)
  return form
}
export default function EditDocumentModal({
  open,
  onClose,
  onSave,
  document: documentData,
  isEditLoading = false,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setForm(null)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    
    if (documentData) {
      console.log("[EditModal] Received documentData:", documentData)
      const formData = formFromDocument(documentData)
      if (formData) {
        setForm(formData)
      }
    }
  }, [open, documentData])
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
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  const handleClose = () => {
    if (!submitting) onClose()
  }
  const handleSubmit = async () => {
    if (!form?.name?.trim()) {
      toast.error("Missing Required Fields", {
        description: "Document name is required.",
      })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        category: form.category || "other",
        tags: form.tags || [],
      }
      console.log("[EditModal] Submitting payload:", payload)
      await onSave(payload)
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }
  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }
  const updateSelect = (key) => (val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }
  const updateTags = (tags) => {
    setForm((prev) => ({ ...prev, tags }))
  }
  if (!mounted) return null
  const isFormReady = form !== null
  const isLoading = submitting || isEditLoading
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
                Edit Document
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                Update document metadata
              </p>
            </div>
          </div>
          {isFormReady ? (
            <div
              className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 space-y-8 pb-25"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field
                  label="Document Name"
                  placeholder="e.g., Q3 Financial Report"
                  colSpan="col-span-2"
                  value={form.name}
                  onChange={updateField("name")}
                  disabled={isLoading}
                  required
                />
                <SelectField
                  label="Category"
                  colSpan="col-span-2"
                  value={form.category}
                  onChange={updateSelect("category")}
                  options={DOCUMENT_CATEGORIES}
                  placeholder="Select category..."
                  disabled={isLoading}
                />
                <TagsInput
                  label="Tags"
                  colSpan="col-span-2 md:col-span-4"
                  value={form.tags}
                  onChange={updateTags}
                  disabled={isLoading}
                  placeholder="Add tags..."
                />
                <TextArea
                  label="Description"
                  placeholder="Add any relevant notes or context..."
                  colSpan="col-span-2 md:col-span-4"
                  value={form.description}
                  onChange={updateField("description")}
                  disabled={isLoading}
                />
              </div>
              {documentData && (
                <div className="bg-gray-50 dark:bg-[#121212] rounded-xl p-4 border border-gray-100 dark:border-[#27272a]">
                  <p className="text-xs font-sfpro-medium text-gray-500 dark:text-[#71717a] mb-2">
                    File Information
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>File:</strong> {documentData.fileName || documentData.title}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>Size:</strong> {documentData.size}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      <strong>Type:</strong> {documentData.type?.toUpperCase()}
                    </span>
                    {documentData.date && (
                      <span className="text-gray-600 dark:text-gray-300">
                        <strong>Uploaded:</strong> {documentData.date}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="h-1" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400 font-sfpro">
                  Loading document data...
                </span>
              </div>
            </div>
          )}
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
              disabled={isLoading || !isFormReady}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}