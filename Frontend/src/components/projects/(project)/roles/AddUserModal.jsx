"use client"
import { useEffect, useState } from "react"
import { Select } from "@/components/ui/DropDown"

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

function Field({ label, placeholder, type = "text", uppercase = false, colSpan, min, max }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        min={min}
        max={max}
        style={uppercase ? { textTransform: "uppercase" } : {}}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150"
      />
    </div>
  )
}

function SelectField({ label, options, colSpan, value, onChange }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      <Select 
        placeholder={`Select ${label.toLowerCase()}`}
        options={options}
        value={value}
        onChange={onChange}
        width="w-full"
      />
    </div>
  )
}

function FileUploadField({ label, colSpan }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
      <div className="relative group flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-gray-400 dark:text-[#52525b] mb-3 group-hover:text-gray-600 dark:group-hover:text-[#a1a1aa] transition-colors duration-150"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        <p className="text-[13.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] mb-1 text-center">
          <span className="text-gray-900 dark:text-white font-sfpro-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs font-sfpro text-gray-500 dark:text-[#52525b] text-center">
          PNG, JPG, JPEG (max. 5MB)
        </p>
      </div>
    </div>
  )
}

function Section({ children }) {
  return <div>{children}</div>
}

export default function AddUserModal({ open, onClose, activeTab = "Users" }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

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
    const onKey = (e) => {
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted) return null

  const roleOptions = [
    { label: "Project Manager", value: "project_manager" },
    { label: "Site Engineer", value: "site_engineer" },
    { label: "Accountant", value: "accountant" },
    { label: "Supervisor", value: "supervisor" },
    { label: "Admin", value: "admin" },
  ]

  const statusOptions = [
    { label: "Active", value: "Active" },
    { label: "Inactive", value: "Inactive" },
  ]

  const ownerOptions = [
    { label: "No", value: "false" },
    { label: "Yes", value: "true" },
  ]

  const projectOptions = [
    { label: "Newtown Commercial Complex", value: "proj_1" },
    { label: "Rajarhat Residential Tower", value: "proj_2" },
    { label: "Salt Lake IT Hub", value: "proj_3" },
  ]

  return (
    <>
      <Backdrop visible={visible} onClose={onClose} />

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
                Add New {entityName}
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                Enter details to create a new {entityName.toLowerCase()} account
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25" style={{ scrollbarWidth: "none" }}>

            <Section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field label="Full Name" placeholder="Ayan Chakraborty" colSpan="col-span-2" />
                <Field label="Email Address" placeholder="ayanchakraborty@gmail.com" type="email" colSpan="col-span-2" />
                <Field label="Phone Number" placeholder="+91 74395 37213" type="tel" colSpan="col-span-2" />
                
                <SelectField 
                  label="Role" 
                  options={roleOptions} 
                  colSpan="col-span-1" 
                  onChange={(v) => console.log("Role:", v)}
                />
                <SelectField 
                  label="Status" 
                  options={statusOptions} 
                  colSpan="col-span-1" 
                  onChange={(v) => console.log("Status:", v)}
                />
              </div>
            </Section>

            <Section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <Field label="Password" placeholder="••••••••" type="password" colSpan="col-span-2" />
                <Field label="Confirm Password" placeholder="••••••••" type="password" colSpan="col-span-2" />
              </div>
            </Section>

            <Section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <SelectField 
                  label="Is Owner" 
                  options={ownerOptions} 
                  colSpan="col-span-1" 
                  onChange={(v) => console.log("Is Owner:", v)}
                />
                <SelectField 
                  label="Assigned Project" 
                  options={projectOptions} 
                  colSpan="col-span-1" 
                  onChange={(v) => console.log("Assigned Project:", v)}
                />
              </div>
            </Section>

            <Section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
                <FileUploadField label="Avatar" colSpan="col-span-2 md:col-span-4" />
              </div>
            </Section>

            <div className="h-1" />
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
            <button
              onClick={onClose}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150"
            >
              Cancel
            </button>
            <button className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all duration-150">
              Add {entityName}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}