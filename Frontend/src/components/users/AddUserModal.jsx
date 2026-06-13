"use client"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Select } from "@/components/ui/DropDown"
import { fetchAllRoles, registerUser } from "@/app/(companyname)/users/api.jsx"

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

function Field({ label, placeholder, type = "text", value, onChange }) {
  return (
    <div className="col-span-1">
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150"
      />
    </div>
  )
}

function SelectField({ label, options, value, onChange, isLoading }) {
  return (
    <div className="col-span-2">
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
        {label}
      </div>
      <Select
        placeholder={isLoading ? "Loading..." : `Select ${label.toLowerCase()}`}
        options={options}
        value={value}
        onChange={onChange}
        width="w-full"
        disabled={isLoading}
      />
    </div>
  )
}

const EMPTY_FORM = {
  name:   "",
  email:  "",
  roleId: "",
}

export default function AddUserModal({ open, onClose, activeTab = "Users", onSuccess }) {
  const [mounted, setMounted]  = useState(false)
  const [visible, setVisible]= useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [roleOptions, setRoleOptions]= useState([])
  const [rolesLoading, setRolesLoading]= useState(false)
  const [submitting, setSubmitting] = useState(false)

  const entityName = activeTab.endsWith("s") ? activeTab.slice(0, -1) : activeTab

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
    const onKey = (e) => { if (e.key === "Escape" && open) handleClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (!open || activeTab !== "Users") return
    setRolesLoading(true)
    fetchAllRoles()
      .then(setRoleOptions)
      .catch(() =>
        toast.error("Failed to load roles", {
          description: "Please try closing and reopening the form.",
        })
      )
      .finally(() => setRolesLoading(false))
  }, [open, activeTab])

  const setField  = (key) => (e)  => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const setSelect = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }))

  function handleClose() {
    if (submitting) return
    setForm(EMPTY_FORM)
    onClose()
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || !form.roleId) {
      toast.error("Missing Required Fields", {
        description: "Name, email and role are required.",
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await registerUser({
        name:   form.name.trim(),
        email:  form.email.trim(),
        roleId: form.roleId,
      })
      toast.success(res.title ?? "User Created Successfully", {
        description:
          res.description ?? `Login credentials have been sent to ${form.email.trim()}.`,
      })
      handleClose()
      onSuccess?.()
    } catch (err) {
      const msg =
        err.response?.data?.description ??
        err.response?.data?.message ??
        err.message ??
        "Something went wrong."
      toast.error(err.response?.data?.title ?? "Failed to Add User", { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />

      <div style={{
          transitionDuration: "1000ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}>
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl flex flex-col transition-colors duration-300">

          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                Add New {entityName}
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                Enter details to create a new {entityName.toLowerCase()} account
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 pb-6" style={{ scrollbarWidth: "none" }}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Field
                label="Full Name"
                placeholder="Ayan Chakraborty"
                value={form.name}
                onChange={setField("name")}
              />
              <Field
                label="Email Address"
                placeholder="ayanchakraborty@gmail.com"
                type="email"
                value={form.email}
                onChange={setField("email")}
              />
              <SelectField
                label="Role"
                options={roleOptions}
                value={form.roleId}
                onChange={setSelect("roleId")}
                isLoading={rolesLoading}
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
            <button onClick={handleClose} disabled={submitting} className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150" >
              {submitting ? "Adding..." : `Add ${entityName}`}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}