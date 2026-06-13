"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, ChevronDown, Users } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"
export const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
]
// export const STATUS_OPTIONS = [
//   { value: "NotStarted", label: "Not Started" },
//   { value: "InProgress", label: "In Progress" },
//   { value: "Completed", label: "Completed" },
//   { value: "Blocked", label: "Blocked" },
//   { value: "OnHold", label: "On Hold" },
// ]
function getInitials(name) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
function getUserKey(user) {
  return user.keycloakId || user.id || user._id || ""
}
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
export function Field({ label, placeholder, colSpan, value, onChange, disabled, required }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
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
export function SelectField({ label, options, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label}
      </div>
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
export function DatePickerField({ label, colSpan = "col-span-1", value, onChange, required, minDate, maxDate }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <DatePicker
        placeholder={`Select ${label.toLowerCase()}`}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
  )
}
export function TextAreaField({ label, placeholder, colSpan, value, onChange, disabled }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
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
function UserAvatar({ user, size = 24, className = "" }) {
  const [imageError, setImageError] = useState(false)
  const hasAvatar = user.avatar && user.avatar.trim() !== "" && !imageError
  if (hasAvatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || "User"}
        width={size}
        height={size}
        onError={() => setImageError(true)}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={`rounded-full bg-gray-300 dark:bg-[#3f3f46] flex items-center justify-center text-[8px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] shrink-0 ${className}`}
    >
      {getInitials(user.name)}
    </span>
  )
}
export function UserMultiSelect({
  colSpan,
  users = [],
  selectedUsers = [],
  onChange,
  disabled = false,
  isLoading = false,
}) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
  )
  const selectedKeys = new Set(selectedUsers.map(getUserKey).filter(Boolean))
  const availableUsers = filteredUsers.filter((user) => !selectedKeys.has(getUserKey(user)))
  const handleSelectUser = (user) => {
    onChange([...selectedUsers, user])
    setSearch("")
    setIsOpen(false)
  }
  const handleRemoveUser = (index) => {
    onChange(selectedUsers.filter((_, i) => i !== index))
  }
  return (
    <div className={colSpan} ref={containerRef}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        Assign To
      </div>
      {selectedUsers.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {selectedUsers.map((user, index) => (
            <div
              key={getUserKey(user) || index}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]"
            >
              <UserAvatar user={user} size={24} />
              <span className="flex-1 truncate text-xs font-sfpro text-gray-700 dark:text-[#d4d4d8]">
                {user.name || user.email || "Unknown"}
              </span>
              {/* {user.role && (
                <span className="shrink-0 text-[10px] font-sfpro text-gray-400 dark:text-[#52525b] bg-gray-100 dark:bg-[#252525] px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              )} */}
              <button
                type="button"
                onClick={() => handleRemoveUser(index)}
                disabled={disabled}
                className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] transition-colors shrink-0 disabled:opacity-50"
              >
                <X className="w-2.5 h-2.5" />
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
            placeholder={isLoading ? "Loading users..." : "Search users to assign..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            disabled={disabled || isLoading}
            className="w-full h-9 pl-9 pr-8 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] rounded-lg shadow-xl max-h-52 overflow-y-auto z-50"
            style={{ scrollbarWidth: "thin" }}
          >
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                <span className="ml-2 text-xs text-gray-400 font-sfpro">Loading users...</span>
              </div>
            )}
            {!isLoading && availableUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6">
                <Users className="w-8 h-8 text-gray-300 dark:text-[#3f3f46] mb-2" />
                <p className="text-xs text-gray-400 dark:text-[#52525b] font-sfpro">
                  {search ? `No users matching "${search}"` : "No more users available"}
                </p>
              </div>
            )}
            {!isLoading &&
              availableUsers.map((user, index) => (
                <div
                  key={getUserKey(user) || index}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                >
                  <UserAvatar user={user} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] truncate">
                      {user.name}
                    </div>
                    {user.email && (
                      <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                  {/* {user.role && (
                    <span className="shrink-0 text-[10px] font-sfpro text-gray-400 dark:text-[#52525b] bg-gray-100 dark:bg-[#252525] px-2 py-0.5 rounded-full">
                      {user.role}
                    </span>
                  )} */}
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
export function TaskFormContentAdd({
  form,
  setForm,
  projectUsers = [],
  isLoadingUsers = false,
  disabled = false,
  phaseStartDate = null,
  phaseEndDate = null,
}) {
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
  const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))
  const updateUsers = (users) => setForm((p) => ({ ...p, assignedTo: users }))
  return (
    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25" style={{ scrollbarWidth: "none" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field label="Task Name" placeholder="Install rebar grid" colSpan="col-span-2" value={form.taskName} onChange={updateField("taskName")} disabled={disabled} required />
        <SelectField label="Priority" options={PRIORITY_OPTIONS} colSpan="col-span-2 md:col-span-1" value={form.priority} onChange={updateSelect("priority")} disabled={disabled} />
        <div className="hidden md:block col-span-1" />
        <DatePickerField label="Start Date" colSpan="col-span-2 md:col-span-1" value={form.startDate} onChange={updateDate("startDate")} required minDate={phaseStartDate} maxDate={phaseEndDate} />
        <DatePickerField label="End Date" colSpan="col-span-2 md:col-span-1" value={form.endDate} onChange={updateDate("endDate")} required minDate={phaseStartDate} maxDate={phaseEndDate} />
        <UserMultiSelect colSpan="col-span-2" users={projectUsers} selectedUsers={form.assignedTo} onChange={updateUsers} disabled={disabled} isLoading={isLoadingUsers} />
        <TextAreaField label="Description" placeholder="Briefly describe what this task involves…" colSpan="col-span-2 md:col-span-4" value={form.description} onChange={updateField("description")} disabled={disabled} />
      </div>
    </div>
  )
}

// Update TaskFormContentEdit
export function TaskFormContentEdit({
  form,
  setForm,
  disabled = false,
  phaseStartDate = null,
  phaseEndDate = null,
}) {
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
  const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))
  return (
    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25" style={{ scrollbarWidth: "none" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field label="Task Name" placeholder="Install rebar grid" colSpan="col-span-2" value={form.taskName} onChange={updateField("taskName")} disabled={disabled} required />
        <SelectField label="Priority" options={PRIORITY_OPTIONS} colSpan="col-span-1" value={form.priority} onChange={updateSelect("priority")} disabled={disabled} />
        {/* <SelectField label="Status" options={STATUS_OPTIONS} colSpan="col-span-1" value={form.status} onChange={updateSelect("status")} disabled={disabled} /> */}
        <DatePickerField label="Start Date" colSpan="col-span-2 md:col-span-1" value={form.startDate} onChange={updateDate("startDate")} required minDate={phaseStartDate} maxDate={phaseEndDate} />
        <DatePickerField label="End Date" colSpan="col-span-2 md:col-span-1" value={form.endDate} onChange={updateDate("endDate")} required minDate={phaseStartDate} maxDate={phaseEndDate} />
        <TextAreaField label="Description" placeholder="Briefly describe what this task involves…" colSpan="col-span-2 md:col-span-4" value={form.description} onChange={updateField("description")} disabled={disabled} />
      </div>
    </div>
  )
}