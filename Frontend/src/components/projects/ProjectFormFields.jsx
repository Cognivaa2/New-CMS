"use client"
import { useState, useEffect, useRef } from "react"
import { X, Search, ChevronDown } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"
import { fetchUsersForSelection, fetchAllRoles } from "@/app/(companyname)/projects/api"

export const STATUS_OPTIONS = [
  { label: "Planned", value: "planned" },
  { label: "Active", value: "active" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]
export const HEALTH_OPTIONS = [
  { label: "On Track", value: "on_track" },
  { label: "Delayed", value: "delayed" },
  { label: "Over Budget", value: "over_budget" },
]
export function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-100 bg-black/60 backdrop-blur-md transition-opacity ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  )
}
function getInitials(name) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}
function Field({ label, placeholder, type = "text", uppercase, colSpan, min, max, value, onChange }) {
  const inputRef = useRef(null);

  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
      <input
        ref={inputRef} type={type} placeholder={placeholder} min={min} max={max} value={value ?? ""} onChange={onChange}
        onWheel={() => { if (type === "number") inputRef.current?.blur() }} style={uppercase ? { textTransform: "uppercase" } : {}}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      />
    </div>
  )
}
function SelectField({ label, options, colSpan, value, onChange }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
      <Select placeholder={`Select ${label.toLowerCase()}`} options={options} value={value} onChange={onChange} width="w-full" />
    </div>
  )
}
function DatePickerField({ label, placeholder, colSpan, value, onChange, minDate, maxDate }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
      <DatePicker 
        placeholder={placeholder || `Select ${label.toLowerCase()}`} 
        value={value} 
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
  )
}
function TextAreaField({ label, placeholder, colSpan, value, onChange }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
      <textarea placeholder={placeholder} rows={3} value={value ?? ""} onChange={onChange}
        className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 resize-none" />
    </div>
  )
}
function FileUploadField({ label, colSpan, preview, onFileChange, onRemove }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
      {preview ? (
        <div className="relative group w-full rounded-lg overflow-hidden border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#121212]">
          <img src={preview} alt="Cover preview" className="w-full h-40 object-cover" />
          <button type="button" onClick={onRemove}
            className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="px-3 py-2">
            <label className="cursor-pointer text-xs font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] hover:text-gray-900 dark:hover:text-white transition-colors">
              Change image
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </label>
          </div>
        </div>
      ) : (
        <div className="relative group flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer">
          <input type="file" accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="w-8 h-8 text-gray-400 dark:text-[#52525b] mb-3 group-hover:text-gray-600 dark:group-hover:text-[#a1a1aa] transition-colors duration-150">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          <p className="text-[13.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] mb-1 text-center">
            <span className="text-gray-900 dark:text-white font-sfpro-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs font-sfpro text-gray-500 dark:text-[#52525b] text-center">PNG, JPG, JPEG (max. 10MB)</p>
        </div>
      )}
    </div>
  )
}
function UserMultiSelect({ selectedUsers, onChange, colSpan }) {
  const [search, setSearch] = useState("")
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const searchTimerRef = useRef(null)
  const [defaultRoleId, setDefaultRoleId] = useState("")

  useEffect(() => {
    fetchAllRoles()
      .then(roles => { if (roles.length > 0) setDefaultRoleId(roles[0].value) })
      .catch(() => {})
  }, [])
  useEffect(() => {
    setLoading(true)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchUsersForSelection(search).then(setAllUsers).catch(() => setAllUsers([])).finally(() => setLoading(false))
    }, 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search])
  useEffect(() => {
    const handler = e => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const getUserKey = (u) => u.mongoId || u.keycloakId || u.id || u._id || ""
  const selectedKeys = new Set(selectedUsers.map(getUserKey).filter(Boolean))
  const availableUsers = allUsers.filter(u => !selectedKeys.has(getUserKey(u)))
  return (
    <div className={colSpan} ref={containerRef}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">Assigned Users</div>
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user, index) => (
            <div 
              key={getUserKey(user) || index} 
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#3f3f46] hover:bg-gray-150 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-gray-300 dark:bg-[#3f3f46] flex items-center justify-center text-[7px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] shrink-0">
                  {getInitials(user.name)}
                </span>
              )}
              <span className="text-xs font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] max-w-30 truncate">
                {user.name || user.email || "User"}
              </span>
              <button 
                type="button" 
                onClick={() => onChange(selectedUsers.filter((_, i) => i !== index))}
                className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-300 dark:hover:bg-[#52525b] transition-colors ml-0.5"
              >
                <X className="w-2.5 h-2.5 text-gray-500 dark:text-[#a1a1aa]" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search users to assign..." 
            value={search}
            onChange={e => setSearch(e.target.value)} 
            onFocus={() => setIsOpen(true)}
            className="w-full h-9 pl-9 pr-8 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150" 
          />
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] rounded-lg shadow-xl max-h-44 overflow-y-auto z-10" style={{ scrollbarWidth: "thin" }}>
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                <span className="ml-2 text-xs text-gray-400 font-sfpro">Loading users...</span>
              </div>
            )}
            {!loading && availableUsers.length === 0 && (
              <div className="py-4 text-center text-xs text-gray-400 dark:text-[#52525b] font-sfpro">
                {search ? `No users matching "${search}"` : "No more users available"}
              </div>
            )}
            {!loading && availableUsers.map((user, index) => (
              <div 
                key={getUserKey(user) || index}
                onClick={() => { 
                  onChange([...selectedUsers, { ...user, roleId: defaultRoleId }])
                  setSearch("")
                  setIsOpen(false) 
                }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#252525] flex items-center justify-center text-[10px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] shrink-0">
                    {getInitials(user.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] truncate">{user.name}</div>
                  {user.email && <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] truncate">{user.email}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedUsers.length > 0 && (
        <div className="mt-1.5 text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
          {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} assigned
        </div>
      )}
    </div>
  )
}
export function ProjectFormContent({ form, setForm, imagePreview, onFileChange, onRemoveImage, isEditMode = false }) {
  const sf = key => e => setForm(p => ({ ...p, [key]: e.target.value }))
  const sdf = key => date => setForm(p => ({ ...p, [key]: date }))


  const handleStartDateChange = (date) => {
    setForm(p => {
      const next = { ...p, startDate: date }
      if (p.endDate && date && new Date(date) > new Date(p.endDate)) {
        next.endDate = ""   // clear end date if it became invalid
      }
      return next
    })
  }

  const handleEndDateChange = (date) => {
    setForm(p => {
      const next = { ...p, endDate: date }
      if (p.startDate && date && new Date(date) < new Date(p.startDate)) {
        next.startDate = "" // clear start date if it became invalid
      }
      return next
    })
  }
  return (
    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25" style={{ scrollbarWidth: "none" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field 
          label="Project Name" 
          placeholder="e.g. Newtown Commercial Complex" 
          colSpan="col-span-2 md:col-span-3" 
          value={form.projectName} 
          onChange={sf("projectName")} 
        />
        <Field 
          label="Project Code" 
          placeholder="PRJ-2024-001" 
          colSpan="col-span-2 md:col-span-1" 
          uppercase 
          value={form.projectCode} 
          onChange={sf("projectCode")} 
        />
        <Field 
          label="Client Name" 
          placeholder="Acme Corp." 
          colSpan="col-span-2" 
          value={form.clientName} 
          onChange={sf("clientName")} 
        />
        <Field 
          label="Location" 
          placeholder="Sector 5, Newtown" 
          colSpan="col-span-2" 
          value={form.location} 
          onChange={sf("location")} 
        />
        <DatePickerField 
        label="Start Date" 
        colSpan="col-span-1" 
        value={form.startDate} 
        onChange={handleStartDateChange}
        maxDate={form.endDate || undefined}
      />
      <DatePickerField 
        label="End Date" 
        colSpan="col-span-1" 
        value={form.endDate} 
        onChange={handleEndDateChange}
        minDate={form.startDate || undefined}
      />
        <Field 
          label="Budget (₹)" 
          placeholder="e.g. 5000000" 
          type="number" 
          min="0" 
          colSpan="col-span-2" 
          value={form.budget}
          onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) setForm(p => ({ ...p, budget: v })) }} 
        />
        {!isEditMode && (
          <UserMultiSelect 
            colSpan="col-span-2 md:col-span-4" 
            selectedUsers={form.assignedUsers}
            onChange={users => setForm(p => ({ ...p, assignedUsers: users }))} 
          />
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <TextAreaField 
          label="Description" 
          placeholder="Provide a brief overview of the project..." 
          colSpan="col-span-2 md:col-span-4" 
          value={form.description} 
          onChange={sf("description")} 
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <FileUploadField 
          label="Cover Image" 
          colSpan="col-span-2 md:col-span-4" 
          preview={imagePreview} 
          onFileChange={onFileChange} 
          onRemove={onRemoveImage} 
        />
      </div>
      <div className="h-1" />
    </div>
  )
}