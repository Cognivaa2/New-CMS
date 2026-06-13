"use client"
import { useEffect, useState } from "react"

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  )
}
function Field({ label, placeholder, type = "text", colSpan, value, onChange, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150"
      />
    </div>
  )
}
function TextareaField({ label, placeholder, colSpan, value, onChange, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </div>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 resize-none"
      />
    </div>
  )
}
function Section({ children }) {
  return <div>{children}</div>
}
export default function AddRoleModal({ open, onClose, onSave, initialRole, mode }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    roleName: "",
    description: "",
  })
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialRole) {
        setFormData({
          roleName: initialRole.name || "",
          description: initialRole.description || "",
        })
      } else {
        setFormData({
          roleName: "",
          description: "",
        })
      }
    }
  }, [open, mode, initialRole]) 
  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [open])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && !saving) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, saving])
  if (!mounted) return null
  const handleChange = (field, value) => {
  if (field === "roleName") {
    value = value.replace(/[^a-zA-Z0-9\s]/g, "")
  }
  setFormData(prev => ({ ...prev, [field]: value }))
}
  const handleSubmit = async () => {
  if (!formData.roleName.trim()) return

  if (!formData.roleName.trim().match(/^[a-zA-Z0-9\s]+$/)) return

  try {
    setSaving(true)
    await onSave(formData.roleName.trim(), formData.description.trim())
  } catch (err) {
    console.error(err)
  } finally {
    setSaving(false)
  }
}
  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }
  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />
      <div
        style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[55dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0 transition-colors">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                {mode === 'edit' ? "Edit Role" : "Add New Role"}
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                {mode === 'edit' ? "Update role details and configuration" : "Create a custom role and configure its initial details"}
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25" style={{ scrollbarWidth: "none" }}>
            <Section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field 
                  label="Role Name" 
                  placeholder="e.g. Senior Architect" 
                  colSpan="col-span-2" 
                  value={formData.roleName}
                  onChange={(v) => handleChange("roleName", v)}
                  required
                />                
                <TextareaField
                  label="Description"
                  placeholder="Briefly describe the responsibilities of this role..."
                  colSpan="col-span-2 md:col-span-4"
                  value={formData.description}
                  onChange={(v) => handleChange("description", v)}
                />
              </div>
            </Section>
            <div className="h-1" />
          </div>
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-200 dark:border-[#27272a]">
            <button
              onClick={handleClose}
              disabled={saving}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {mode === 'edit' ? "Updating..." : "Creating..."}
                </>
              ) : (
                mode === 'edit' ? "Save Changes" : "Create Role"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}