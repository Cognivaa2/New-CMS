"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, ChevronDown, Plus, Trash2, Package } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"

export const REASON_OPTIONS = [
  { value: "Project Requirement", label: "Project Requirement" },
  { value: "Excess Stock", label: "Excess Stock" },
  { value: "Urgent Need", label: "Urgent Need" },
  { value: "Reallocation", label: "Reallocation" },
  { value: "Other", label: "Other" },
]

export const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
]

export function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    />
  )
}

export function Field({ label, placeholder, colSpan, value, onChange, disabled, required, type = "text" }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

export function SelectField({ label, options, colSpan, value, onChange, disabled, required, placeholder }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
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

export function ProjectSelect({
  label,
  colSpan,
  projects = [],
  value,
  onChange,
  disabled,
  required,
  isLoading = false,
  excludeProjectId = null,
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

  const getId = (p) => String(p._id || p.projectId || p.id || "")

  const selectedProject = projects.find(
    (p) => getId(p) === String(value || "")
  )

  const filteredProjects = projects.filter((p) => {
    const id = getId(p)
    if (excludeProjectId && id === String(excludeProjectId)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.projectName?.toLowerCase().includes(q) ||
      p.projectCode?.toLowerCase().includes(q)
    )
  })

  const handleSelect = (project) => {
    onChange(getId(project))
    setSearch("")
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setSearch("")
  }

  return (
    <div className={colSpan} ref={containerRef}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>

      {selectedProject && !isOpen ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-[#252525] bg-white dark:bg-[#121212]">
          <span className="flex-1 truncate text-[13.5px] font-sfpro text-black dark:text-white">
            {selectedProject.projectName}
            {selectedProject.projectCode && (
              <span className="text-gray-400 dark:text-[#52525b] ml-1.5 text-xs">
                ({selectedProject.projectCode})
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] transition-colors disabled:opacity-50"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={
                isLoading ? "Loading projects..." : "Search destination project..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsOpen(true)}
              disabled={disabled || isLoading}
              className="w-full h-9 pl-9 pr-8 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""
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
                  <span className="ml-2 text-xs text-gray-400 font-sfpro">
                    Loading projects...
                  </span>
                </div>
              )}

              {!isLoading && filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6">
                  <p className="text-xs text-gray-400 dark:text-[#52525b] font-sfpro">
                    {search
                      ? `No projects matching "${search}"`
                      : "No projects available"}
                  </p>
                </div>
              )}

              {!isLoading &&
                filteredProjects.map((project) => (
                  <div
                    key={getId(project)}
                    onClick={() => handleSelect(project)}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] truncate">
                        {project.projectName}
                      </div>
                      {project.projectCode && (
                        <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] truncate">
                          {project.projectCode}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({
  item,
  index,
  onChange,
  onRemove,
  disabled,
  canRemove = true,        
  inventoryItems = [],
  isLoadingInventory = false,
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const containerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filteredInventory = inventoryItems.filter((inv) => {
    if (!searchQuery.trim()) return true
    return inv.materialName?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleSelectMaterial = (inv) => {
    onChange(index, {
      inventoryId: String(inv._id),               // ← force string
      materialMasterId: String(inv.materialMasterId),  // ← force string, was getting lost
      materialName: inv.materialName,
      unit: inv.unit || "Units",
      quantity: item.quantity || 1,
      availableStock: inv.currentStock ?? 0,
    })
    setSearchQuery("")
    setSearchOpen(false)
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3" ref={containerRef}>

        {/* Material select */}
        <div className="sm:col-span-6 relative">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Material <span className="text-red-500">*</span>
          </div>

          {item.materialName && !searchOpen ? (
            <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212]">
              <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-[12.5px] font-sfpro-medium text-black dark:text-white">
                {item.materialName}
              </span>
              {item.availableStock !== undefined && (
                <span className="text-[10px] text-gray-400 dark:text-[#52525b] shrink-0">
                  Stock: {item.availableStock}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  onChange(index, {
                    ...item,
                    inventoryId: "",
                    materialMasterId: "",
                    materialName: "",
                    unit: "Units",
                    availableStock: 0,
                  })
                  setSearchOpen(true)
                }}
                disabled={disabled}
                className="w-3.5 h-3.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center disabled:opacity-50"
              >
                <X className="w-2.5 h-2.5 text-gray-500" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder={isLoadingInventory ? "Loading..." : "Search material..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  disabled={disabled || isLoadingInventory}
                  className="w-full h-8 pl-7 pr-3 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                />
              </div>

              {searchOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl max-h-40 overflow-y-auto z-50"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {isLoadingInventory && (
                    <div className="flex items-center justify-center py-3">
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
                      <span className="ml-2 text-[11px] text-gray-400 font-sfpro">Loading...</span>
                    </div>
                  )}

                  {!isLoadingInventory && filteredInventory.length === 0 && (
                    <div className="py-4 text-center">
                      <p className="text-[11px] text-gray-400 font-sfpro">
                        {searchQuery
                          ? `No materials matching "${searchQuery}"`
                          : "No inventory items available"}
                      </p>
                    </div>
                  )}

                  {!isLoadingInventory &&
                    filteredInventory.map((inv) => (
                      <div
                        key={inv._id}
                        onClick={() => handleSelectMaterial(inv)}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-sfpro-medium text-gray-900 dark:text-white truncate">
                            {inv.materialName}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-[#52525b]">
                            {inv.unit} · Stock: {inv.currentStock ?? 0}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quantity — disabled only by form submitting, NOT by canRemove */}
        <div className="sm:col-span-3">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Quantity <span className="text-red-500">*</span>
          </div>
          <input
            type="number"
            min="1"
            max={item.availableStock || undefined}
            placeholder="0"
            value={item.quantity || ""}
            onChange={(e) =>
              onChange(index, { ...item, quantity: parseInt(e.target.value) || 0 })
            }
            disabled={disabled}                        // ← only disabled when form submitting
            className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
          />
          {item.availableStock > 0 && item.quantity > item.availableStock && (
            <p className="text-[10px] text-red-500 mt-0.5 font-sfpro">
              Exceeds available stock ({item.availableStock})
            </p>
          )}
        </div>

        {/* Unit */}
        <div className="sm:col-span-3">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Unit</div>
          <div className="h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12.5px] font-sfpro text-gray-500 dark:text-[#a1a1aa]">
            {item.unit || "Units"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove || disabled}        
        className="mt-5 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ItemsList({
  items = [],
  onChange,
  disabled = false,
  inventoryItems = [],
  isLoadingInventory = false,
}) {
  const handleItemChange = (index, updatedItem) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    onChange(newItems)
  }

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== index))
  }

  const handleAddItem = () => {
    onChange([
      ...items,
      {
        inventoryId: "",
        materialMasterId: "",
        materialName: "",
        unit: "Units",
        quantity: 1,
        availableStock: 0,
      },
    ])
  }

  const selectedInventoryIds = new Set(
    items.map((item) => item.inventoryId).filter(Boolean)
  )
  const availableInventory = inventoryItems.filter(
    (inv) => !selectedInventoryIds.has(inv._id)
  )

  return (
    <div className="col-span-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
          Transfer Items <span className="text-red-500">*</span>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-[#a1a1aa] border border-gray-200 dark:border-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Add Item
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <ItemRow
            key={index}
            item={item}
            index={index}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
            disabled={disabled}                      
            canRemove={items.length > 1}            
            inventoryItems={
              item.inventoryId
                ? [
                  ...inventoryItems.filter(
                    (inv) => inv._id === item.inventoryId
                  ),
                  ...availableInventory,
                ]
                : availableInventory
            }
            isLoadingInventory={isLoadingInventory}
          />
        ))}
      </div>

      <p className="mt-1.5 text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
        {items.length} item{items.length !== 1 ? "s" : ""} in this transfer
      </p>
    </div>
  )
}

export function TransferFormContentAdd({
  form,
  setForm,
  projects = [],
  isLoadingProjects = false,
  inventoryItems = [],
  isLoadingInventory = false,
  fromProjectId = null,
  disabled = false,
}) {
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))

  return (
    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25" style={{ scrollbarWidth: "none" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <ProjectSelect
          label="Destination Project"
          colSpan="col-span-2"
          projects={projects}
          value={form.toProjectId}
          onChange={(val) => setForm((p) => ({ ...p, toProjectId: val }))}
          disabled={disabled}
          required
          isLoading={isLoadingProjects}
          excludeProjectId={fromProjectId}
        />

        <SelectField
          label="Reason"
          options={REASON_OPTIONS}
          colSpan="col-span-2 md:col-span-1"
          value={form.reason}
          onChange={updateSelect("reason")}
          disabled={disabled}
          placeholder="Select reason"
        />

        <div className="hidden md:block col-span-1" />

        <ItemsList
          items={form.items}
          onChange={(items) => setForm((p) => ({ ...p, items }))}
          disabled={disabled}
          inventoryItems={inventoryItems}
          isLoadingInventory={isLoadingInventory}
        />

        <TextAreaField
          label="Remarks"
          placeholder="Any additional notes about this transfer..."
          colSpan="col-span-2 md:col-span-4"
          value={form.remarks}
          onChange={updateField("remarks")}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export function TransferFormContentEdit({
  form,
  setForm,
  projects = [],
  isLoadingProjects = false,
  inventoryItems = [],
  isLoadingInventory = false,
  fromProjectId = null,
  disabled = false,
}) {
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))

  return (
    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25" style={{ scrollbarWidth: "none" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <ProjectSelect
          label="Destination Project"
          colSpan="col-span-2"
          projects={projects}
          value={form.toProjectId}
          onChange={(val) => setForm((p) => ({ ...p, toProjectId: val }))}
          disabled={disabled}
          required
          isLoading={isLoadingProjects}
          excludeProjectId={fromProjectId}
        />

        <SelectField
          label="Reason"
          options={REASON_OPTIONS}
          colSpan="col-span-1"
          value={form.reason}
          onChange={updateSelect("reason")}
          disabled={disabled}
          placeholder="Select reason"
        />

        <div className="col-span-1">
          <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">Status</div>
          <div className="h-9 px-3 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#252525] flex items-center text-[13.5px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
            {form.status === "Rejected" ? "Rejected → Draft" : form.status || "Draft"}
          </div>
        </div>

        <ItemsList
          items={form.items}
          onChange={(items) => setForm((p) => ({ ...p, items }))}
          disabled={disabled}
          inventoryItems={inventoryItems}
          isLoadingInventory={isLoadingInventory}
        />

        <TextAreaField
          label="Remarks"
          placeholder="Any additional notes about this transfer..."
          colSpan="col-span-2 md:col-span-4"
          value={form.remarks}
          onChange={updateField("remarks")}
          disabled={disabled}
        />
      </div>
    </div>
  )
}