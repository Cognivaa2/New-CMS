"use client"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Backdrop, ProjectFormContent } from "./ProjectFormFields"

const EMPTY_FORM = {
  projectName: "",
  projectCode: "",
  clientName: "",
  location: "",
  description: "",
  status: "planned",
  healthStatus: "on_track",
  completionPercent: 0,
  budget: "",
  startDate: "",
  endDate: "",
  coverImage: null,
  assignedUsers: [],
}
export default function AddProjectModal({ open, onClose, onSave }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM })
      setImagePreview(null)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [open])
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape" && open && !submitting) onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, onClose])
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error("File Too Large", { description: "Maximum file size is 10MB." }); return }
    setForm(p => ({ ...p, coverImage: file }))
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }
  function handleClose() { if (!submitting) onClose() }
  async function handleSubmit() {
    if (!form.projectName.trim()) { toast.error("Missing Required Fields", { description: "Project name is required." }); return }
    setSubmitting(true)
    try { await onSave(form) } catch { } finally { setSubmitting(false) }
  }
  if (!mounted) return null
  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div
        style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        className={`fixed bottom-0 left-0 right-0 z-110 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[65dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight">Create New Project</h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">Enter details to initialize a new project workspace</p>
            </div>
          </div>
          <ProjectFormContent
            form={form}
            setForm={setForm}
            imagePreview={imagePreview}
            onFileChange={handleFileChange}
            onRemoveImage={() => { setForm(p => ({ ...p, coverImage: null })); setImagePreview(null) }}
            isEditMode={false}
          />
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button onClick={handleClose} disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}