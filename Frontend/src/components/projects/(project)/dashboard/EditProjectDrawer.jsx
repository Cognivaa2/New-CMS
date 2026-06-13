"use client"
import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"
import { useParams } from "next/navigation"
import { editProjectFromDashboard } from "@/app/(companyname)/projects/[projectId]/api"
import { X } from "lucide-react"

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    />
  )
}

function Field({ label, placeholder, type = "text", uppercase = false, colSpan, min, max, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        min={min}
        max={max}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        style={uppercase ? { textTransform: "uppercase" } : {}}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function SelectField({ label, options, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      <Select
        placeholder={`Select ${label.toLowerCase()}`}
        options={options}
        value={value}
        onChange={onChange}
        width="w-full"
        disabled={disabled}
      />
    </div>
  )
}

function DatePickerField({ label, colSpan, value, onChange, disabled, minDate, maxDate }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      <DatePicker
        placeholder={`Select ${label.toLowerCase()}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate ?? null}
        maxDate={maxDate ?? null}
      />
    </div>
  )
}

function TextAreaField({ label, placeholder, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
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

function FileUploadField({ label, colSpan, preview, onFileChange, onRemove, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      {preview ? (
        <div className="relative group w-full rounded-lg overflow-hidden border border-gray-200 dark:border-[#252525]">
          <img src={preview} alt="Cover" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="px-3 py-2">
            <label className="cursor-pointer text-xs font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] hover:text-gray-900 dark:hover:text-white transition-colors">
              Change image
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" disabled={disabled} />
            </label>
          </div>
        </div>
      ) : (
        <div className="relative group flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-gray-400 dark:text-[#52525b] mb-3">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          <p className="text-[13.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] mb-1 text-center">
            <span className="font-sfpro-medium text-gray-900 dark:text-white">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs font-sfpro text-gray-500 dark:text-[#52525b] text-center">PNG, JPG, JPEG (max. 10MB)</p>
        </div>
      )}
    </div>
  )
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

const STATUS_OPTIONS = [
  { label: "Planned", value: "planned" },
  { label: "Active", value: "active" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

export default function EditProjectDrawer({ open, onClose, projectData, onSaved }) {
  const { projectId } = useParams()

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setForm(null)
        setImagePreview(null)
        setImageFile(null)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open || !projectData) return

    setForm({
      projectName: projectData.projectName || "",
      projectCode: projectData.projectCode || "",
      clientName: projectData.clientName || "",
      location: projectData.location || "",
      description: projectData.description || "",
      status: projectData.status || "planned",
      budget: projectData.budget ?? "",
      startDate: parseDate(projectData.startDate),
      endDate: parseDate(projectData.endDate),
    })

    setImagePreview(
      typeof projectData.coverImage === "string" && projectData.coverImage
        ? projectData.coverImage
        : null
    )
    setImageFile(null)
  }, [open, projectData])

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open && !submitting) onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])

  function sf(key) {
    return (e) => setForm(p => ({ ...p, [key]: e.target.value }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too Large", { description: "Maximum file size is 10MB" })
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview(null)
    setForm(p => ({ ...p, coverImage: null }))
  }

  async function handleSubmit() {
    if (!form) return
    if (!form.projectName?.trim()) {
      toast.error("Project name is required")
      return
    }
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error("Invalid Date Range", { description: "End date must be after start date" })
      return
    }

    const formData = new FormData()
    formData.append("projectName", form.projectName.trim())
    if (form.projectCode?.trim()) formData.append("projectCode", form.projectCode.trim())
    if (form.clientName?.trim()) formData.append("clientName", form.clientName.trim())
    if (form.location?.trim()) formData.append("location", form.location.trim())
    if (form.description !== undefined) formData.append("description", form.description?.trim() || "")
    if (form.budget !== "") formData.append("budget", String(form.budget))
    if (form.startDate) {
      formData.append("startDate",
        form.startDate instanceof Date
          ? form.startDate.toISOString().split("T")[0]
          : form.startDate
      )
    }
    if (form.endDate) {
      formData.append("endDate",
        form.endDate instanceof Date
          ? form.endDate.toISOString().split("T")[0]
          : form.endDate
      )
    }
    if (imageFile) {
      formData.append("coverImage", imageFile)
    } else if (imagePreview === null) {
      formData.append("coverImage", "")
    }

    setSubmitting(true)
    try {
      const res = await editProjectFromDashboard(projectId, formData)
      toast.success("Project Updated", {
        description: res.description || "Project details updated successfully",
      })
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error("Update Failed", { description: err.message || "Something went wrong" })
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <>
      <Backdrop visible={visible} onClose={() => !submitting && onClose()} />

      <div
        style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[65dvh] flex flex-col transition-colors duration-300">

          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">
                Edit Project
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                Update project details
              </p>
            </div>
          </div>
          {!form ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25" style={{ scrollbarWidth: "none" }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field
                  label="Project Name"
                  placeholder="e.g. Newtown Commercial Complex"
                  colSpan="col-span-2 md:col-span-3"
                  value={form.projectName}
                  onChange={sf("projectName")}
                  disabled={submitting}
                />
                <Field
                  label="Project Code"
                  placeholder="PRJ-2024-001"
                  colSpan="col-span-2 md:col-span-1"
                  uppercase
                  value={form.projectCode}
                  onChange={sf("projectCode")}
                  disabled={submitting}
                />
                <Field
                  label="Client Name"
                  placeholder="Acme Corp."
                  colSpan="col-span-2"
                  value={form.clientName}
                  onChange={sf("clientName")}
                  disabled={submitting}
                />
                <Field
                  label="Location"
                  placeholder="Sector 5, Newtown"
                  colSpan="col-span-2"
                  value={form.location}
                  onChange={sf("location")}
                  disabled={submitting}
                />
                <DatePickerField
                  label="Start Date"
                  colSpan="col-span-1"
                  value={form.startDate}
                  onChange={(d) => setForm(p => ({ ...p, startDate: d }))}
                  disabled={submitting}
                  maxDate={form.endDate}
                />
                <DatePickerField
                  label="End Date"
                  colSpan="col-span-1"
                  value={form.endDate}
                  onChange={(d) => setForm(p => ({ ...p, endDate: d }))}
                  disabled={submitting}
                  minDate={form.startDate}
                />
                <Field
                  label="Budget (₹)"
                  placeholder="e.g. 5000000"
                  type="number"
                  min="0"
                  colSpan="col-span-2"
                  value={form.budget}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "" || Number(v) >= 0) setForm(p => ({ ...p, budget: v }))
                  }}
                  disabled={submitting}
                />
                <TextAreaField
                  label="Description"
                  placeholder="Provide a brief overview of the project..."
                  colSpan="col-span-2 md:col-span-4"
                  value={form.description}
                  onChange={sf("description")}
                  disabled={submitting}
                />
                <FileUploadField
                  label="Cover Image"
                  colSpan="col-span-2 md:col-span-4"
                  preview={imagePreview}
                  onFileChange={handleFileChange}
                  onRemove={handleRemoveImage}
                  disabled={submitting}
                />
              </div>
              <div className="h-1" />
            </div>
          )}

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-neutral-800">
            <button
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}