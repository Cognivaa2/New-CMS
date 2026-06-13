import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { X, Search, Plus, Trash2, Package, Loader2 } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import DatePicker from "@/components/ui/DatePicker"
import { fetchProjectInventoryForMR } from "@/app/(companyname)/projects/[projectId]/material_requisition/api"

export const REASON_OPTIONS = [
  { value: "Project Requirement", label: "Project Requirement" },
  { value: "Excess Stock", label: "Excess Stock" },
  { value: "Urgent Need", label: "Urgent Need" },
  { value: "Reallocation", label: "Reallocation" },
  { value: "Other", label: "Other" },
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

export function SelectField({
  label, options, colSpan, value, onChange,
  disabled, required, placeholder,
}) {
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

export function DatePickerField({
  label, colSpan = "col-span-1", value,
  onChange, required, minDate, maxDate,
}) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <div className="w-full [&>div]:w-full [&>div>button]:w-full">
        <DatePicker
          value={value}
          onChange={onChange}
          placeholder={`Select ${label.toLowerCase()}`}
          minDate={minDate ?? null}
          maxDate={maxDate ?? null}
        />
      </div>
    </div>
  )
}

export function TextAreaField({
  label, placeholder, colSpan, value,
  onChange, disabled, rows = 3,
}) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label}
      </div>
      <textarea
        placeholder={placeholder}
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function DropdownPortal({ anchorRef, open, children }) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current) return

    const updateCoords = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }

    updateCoords()

    window.addEventListener("scroll", updateCoords, true)
    window.addEventListener("resize", updateCoords)
    return () => {
      window.removeEventListener("scroll", updateCoords, true)
      window.removeEventListener("resize", updateCoords)
    }
  }, [open, anchorRef])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  )
}

function ItemRow({
  item, index, onChange, onRemove,
  disabled, canRemove = true, projectId,
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [inventoryList, setInventoryList] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const containerRef = useRef(null)
  const inputWrapperRef = useRef(null)
  const fetchControllerRef = useRef(null)
  const quantityRef = useRef(null)

  const doFetch = useCallback(
    (query) => {
      if (!projectId) return
      if (fetchControllerRef.current) fetchControllerRef.current.abort()
      const controller = new AbortController()
      fetchControllerRef.current = controller

      setIsLoading(true)
      fetchProjectInventoryForMR(projectId, controller.signal, query)
        .then((list) => {
          if (!controller.signal.aborted) setInventoryList(list)
        })
        .catch(() => { })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false)
        })
    },
    [projectId]
  )

  useEffect(() => {
    if (!searchOpen) return
    const timer = setTimeout(() => doFetch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchOpen, doFetch])

  useEffect(() => {
    return () => fetchControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target)
      ) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelectInventoryItem = (inv) => {
    onChange(index, {
      inventoryId: inv._id || inv.id,
      materialMasterId: inv.materialMasterId || "",
      materialName: inv.materialName,
      unit: inv.unit || "Units",
      quantity: item.quantity || 1,
      currentStock: inv.currentStock || 0,
    })
    setSearchQuery("")
    setSearchOpen(false)
    setInventoryList([])
  }

  const handleClearMaterial = () => {
    onChange(index, {
      inventoryId: "",
      materialMasterId: "",
      materialName: "",
      unit: "Units",
      quantity: 1,
      currentStock: 0,
    })
    setSearchOpen(true)
    doFetch("")
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3" ref={containerRef}>
        <div className="sm:col-span-7">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Material <span className="text-red-500">*</span>
          </div>

          {item.materialName && !searchOpen ? (
            <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212]">
              <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-[12.5px] font-sfpro-medium text-black dark:text-white">
                {item.materialName}
              </span>
              {item.currentStock !== undefined && (
                <span className="text-[10px] text-gray-400 dark:text-[#52525b] shrink-0">
                  In stock: {item.currentStock}
                </span>
              )}
              <button
                type="button"
                onClick={handleClearMaterial}
                disabled={disabled}
                className="w-3.5 h-3.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center disabled:opacity-50"
              >
                <X className="w-2.5 h-2.5 text-gray-500" />
              </button>
            </div>
          ) : (
            <div ref={inputWrapperRef}>
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder={isLoading ? "Loading..." : "Search project inventory..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setSearchOpen(true)
                    if (inventoryList.length === 0) doFetch("")
                  }}
                  disabled={disabled || !projectId}
                  className="w-full h-8 pl-7 pr-3 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
                />
              </div>

              <DropdownPortal anchorRef={inputWrapperRef} open={searchOpen}>
                <div
                  className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl max-h-48 overflow-y-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                      <span className="ml-2 text-[11px] text-gray-400 font-sfpro">
                        Loading inventory...
                      </span>
                    </div>
                  ) : inventoryList.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-[11px] text-gray-400 font-sfpro">
                        {searchQuery
                          ? `No items matching "${searchQuery}"`
                          : "No inventory items in this project"}
                      </p>
                    </div>
                  ) : (
                    inventoryList.map((inv) => (
                      <div
                        key={inv._id || inv.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelectInventoryItem(inv)
                        }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-sfpro-medium text-gray-900 dark:text-white truncate">
                            {inv.materialName}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-[#52525b]">
                            In stock: {inv.currentStock ?? 0} {inv.unit}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-[#71717a] ml-2 shrink-0">
                          {inv.unit}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </DropdownPortal>
            </div>
          )}
        </div>

        <div className="sm:col-span-3">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Quantity <span className="text-red-500">*</span>
          </div>
          <input
            ref={quantityRef}
            type="number"
            min="1"
            placeholder="0"
            value={item.quantity || ""}
            onChange={(e) =>
              onChange(index, { ...item, quantity: parseInt(e.target.value) || 0 })
            }
            onWheel={() => quantityRef.current?.blur()}
            disabled={disabled}
            className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Unit
          </div>
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

export function ItemsList({ items = [], onChange, disabled = false, projectId }) {
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
        currentStock: 0,
      },
    ])
  }

  return (
    <div className="col-span-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
          Required Materials <span className="text-red-500">*</span>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-[#a1a1aa] border border-gray-200 dark:border-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Add Material
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {items.map((item, index) => (
          <ItemRow
            key={index}
            item={item}
            index={index}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
            disabled={disabled}
            canRemove={items.length > 1}
            projectId={projectId}
          />
        ))}
      </div>

      <p className="mt-1.5 text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
        {items.length} material{items.length !== 1 ? "s" : ""} requested
      </p>
    </div>
  )
}

export function MRFormContentAdd({ form, setForm, disabled = false, projectId }) {
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
  const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div
      className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <ItemsList
          items={form.items}
          onChange={(items) => setForm((p) => ({ ...p, items }))}
          disabled={disabled}
          projectId={projectId}
        />
        <DatePickerField
          label="Required By"
          colSpan="col-span-2 md:col-span-2"
          value={form.requiredByDate}
          onChange={updateDate("requiredByDate")}
          required
          minDate={new Date()}
        />
        <SelectField
          label="Reason"
          options={REASON_OPTIONS}
          colSpan="col-span-2 md:col-span-2"
          value={form.reason}
          onChange={updateSelect("reason")}
          disabled={disabled}
          placeholder="Select reason for requisition"
        />
        <TextAreaField
          label="Remarks"
          placeholder="Any additional notes or specifications..."
          colSpan="col-span-2 md:col-span-4"
          value={form.remarks}
          onChange={updateField("remarks")}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export function MRFormContentEdit({ form, setForm, disabled = false, projectId }) {
  const updateSelect = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))
  const updateDate = (key) => (date) => setForm((p) => ({ ...p, [key]: date }))
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  if (!form) return null

  return (
    <div
      className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <div className="col-span-full mb-2">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#27272a]">
            <span className="text-[12px] font-sfpro text-gray-500 dark:text-[#a1a1aa]">
              MR Number
            </span>
            <span className="text-[13px] font-sfpro-bold text-gray-900 dark:text-white">
              {form.mrNumber}
            </span>
          </div>
        </div>
        <ItemsList
          items={form.items}
          onChange={(items) => setForm((p) => ({ ...p, items }))}
          disabled={disabled}
          projectId={projectId}
        />
        <DatePickerField
          label="Required By"
          colSpan="col-span-2 md:col-span-2"
          value={form.requiredByDate}
          onChange={updateDate("requiredByDate")}
          required
          minDate={new Date()}
        />
        <SelectField
          label="Reason"
          options={REASON_OPTIONS}
          colSpan="col-span-2 md:col-span-2"
          value={form.reason}
          onChange={updateSelect("reason")}
          disabled={disabled}
          placeholder="Select reason for requisition"
        />
        <TextAreaField
          label="Remarks"
          placeholder="Any additional notes or specifications..."
          colSpan="col-span-2 md:col-span-4"
          value={form.remarks}
          onChange={updateField("remarks")}
          disabled={disabled}
        />
        {form.status === "Rejected" && (
          <div className="col-span-full px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <p className="text-[12px] font-sfpro-medium text-amber-700 dark:text-amber-400">
              This MR was previously rejected. Editing will reset status to Draft.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}