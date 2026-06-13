"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Package, X, Loader2, Plus, Trash2 } from "lucide-react"
import DatePicker from "@/components/ui/DatePicker"
import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"
import { fetchMRsPendingForPO } from "@/app/(companyname)/projects/[projectId]/purchase-order/api"

const API_BASE_URL = getBaseUrl()
async function fetchVendorLookup(search = "", signal = null) {
  const companyId = getCompanyId()
  if (!companyId) return []

  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/vendors/lookup?${params.toString()}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data.data?.vendors || []
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    console.error("[fetchVendorLookup] failed:", error.message)
    return []
  }
}
async function fetchMaterialsLookup(search = "", signal = null) {
  const companyId = getCompanyId()
  if (!companyId) return []

  const params = new URLSearchParams()
  if (search?.trim()) params.append("search", search.trim())

  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/material/lookup?${params.toString()}`,
      { headers: { ...getAuthHeaders(), "x-company-id": companyId }, signal }
    )
    return data.data?.materials || []
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error
    console.error("[fetchMaterialsLookup] failed:", error.message)
    return []
  }
}
export function TextField({
  label, placeholder, colSpan, value,
  onChange, disabled, required, as = "input", rows = 3,
}) {
  const cls = "w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"

  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {as === "textarea" ? (
        <textarea
          rows={rows}
          placeholder={placeholder}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          className={`${cls} h-9`}
        />
      )}
    </div>
  )
}
export function DateField({
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
function SearchDropdown({
  label, required, colSpan = "col-span-full",
  value, onSelect, onClear, disabled,
  displayValue, displaySub,
  placeholder, fetchFn, renderItem,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const controllerRef = useRef(null)

  const doFetch = useCallback(async (q) => {
    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl
    setIsLoading(true)
    try {
      const list = await fetchFn(q, ctrl.signal)
      if (!ctrl.signal.aborted) setItems(list)
    } catch { }
    finally { if (!ctrl.signal.aborted) setIsLoading(false) }
  }, [fetchFn])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => doFetch(query), 300)
    return () => clearTimeout(t)
  }, [query, open, doFetch])

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    const fn = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])
  return (
    <div className={colSpan} ref={containerRef}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>

      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212]">
          <Package className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="flex-1 text-[13px] font-sfpro-medium text-black dark:text-white truncate">
            {displayValue}
          </span>
          {displaySub && (
            <span className="text-[11px] text-gray-400 dark:text-[#52525b] shrink-0">
              {displaySub}
            </span>
          )}
          <button
            type="button"
            onClick={() => { onClear(); setOpen(true); doFetch("") }}
            disabled={disabled}
            className="w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { setOpen(true); if (items.length === 0) doFetch("") }}
            disabled={disabled}
            className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
          />
          {open && (
            <div
              className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl max-h-52 overflow-y-auto z-50"
              style={{ scrollbarWidth: "thin" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                  <span className="text-[11px] text-gray-400 font-sfpro">Loading...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-gray-400 font-sfpro">
                    {query ? `No results for "${query}"` : "No items found"}
                  </p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item._id || item.id || idx}
                    onClick={() => { onSelect(item); setOpen(false); setQuery("") }}
                    className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    {renderItem(item)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
export function MRSelector({ projectId, value, onChange, disabled }) {
  const fetchFn = useCallback(
    (q, signal) => {
      if (!projectId) return Promise.resolve([])
      return fetchMRsPendingForPO(projectId, { search: q, signal })
    },
    [projectId]
  )
  return (
    <SearchDropdown
      label="Material Requisition"
      required
      colSpan="col-span-full"
      value={value}
      displayValue={value?.mrNumber || "—"}
      displaySub={value?.status}
      placeholder="Search approved MRs..."
      disabled={disabled || !projectId}
      fetchFn={fetchFn}
      onSelect={onChange}
      onClear={() => onChange(null)}
      renderItem={(mr) => (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-sfpro-medium text-gray-900 dark:text-white">{mr.mrNumber}</p>
            <p className="text-[11px] text-gray-400 dark:text-[#52525b]">
              {mr.items?.length || 0} item(s) · {mr.uncoveredItemCount ?? 0} uncovered
            </p>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-sfpro-bold uppercase ${mr.status === "Approved"
              ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
              : "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
              }`}
          >
            {mr.status}
          </span>
        </div>
      )}
    />
  )
}
export function VendorSelector({ value, onChange, disabled }) {
  return (
    <SearchDropdown
      label="Vendor"
      required
      colSpan="col-span-full md:col-span-2"
      value={value}
      displayValue={value?.name || "—"}
      displaySub={value?.vendorType}
      placeholder="Search vendors..."
      disabled={disabled}
      fetchFn={fetchVendorLookup}
      onSelect={onChange}
      onClear={() => onChange(null)}
      renderItem={(v) => (
        <div>
          <p className="text-[13px] font-sfpro-medium text-gray-900 dark:text-white">{v.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {v.vendorType && (
              <span className="text-[11px] text-gray-400 dark:text-[#52525b]">{v.vendorType}</span>
            )}
            {v.email && (
              <span className="text-[11px] text-gray-400 dark:text-[#52525b]">· {v.email}</span>
            )}
          </div>
        </div>
      )}
    />
  )
}
function MaterialSearchInput({ item, index, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [materials, setMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const controllerRef = useRef(null)

  const doFetch = useCallback(async (q) => {
    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl
    setIsLoading(true)
    try {
      const list = await fetchMaterialsLookup(q, ctrl.signal)
      if (!ctrl.signal.aborted) setMaterials(list)
    } catch { }
    finally { if (!ctrl.signal.aborted) setIsLoading(false) }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => doFetch(query), 300)
    return () => clearTimeout(t)
  }, [query, open, doFetch])

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    const fn = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const handleSelect = (mat) => {
    onChange(index, {
      ...item,
      materialMasterId: mat._id || mat.id,
      materialName: mat.name,
      unit: mat.unit || "Units",
    })
    setQuery("")
    setOpen(false)
  }

  const handleClear = () => {
    onChange(index, {
      ...item,
      materialMasterId: "",
      materialName: "",
      unit: "Units",
    })
    setOpen(true)
    doFetch("")
  }

  return (
    <div className="relative" ref={containerRef}>
      {item.materialName && !open ? (
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212]">
          <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="flex-1 truncate text-[12.5px] font-sfpro-medium text-black dark:text-white">
            {item.materialName}
          </span>
          <button
            type="button"
            onClick={handleClear}
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
              placeholder="Search material..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { setOpen(true); if (materials.length === 0) doFetch("") }}
              disabled={disabled}
              className="w-full h-8 pl-7 pr-3 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
            />
          </div>
          {open && (
            <div
              className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl max-h-48 overflow-y-auto z-50"
              style={{ scrollbarWidth: "thin" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-3 gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                  <span className="text-[11px] text-gray-400 font-sfpro">Loading...</span>
                </div>
              ) : materials.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-gray-400 font-sfpro">
                  {query ? `No materials matching "${query}"` : "No materials found"}
                </p>
              ) : (
                materials.map((mat) => (
                  <div
                    key={mat._id || mat.id}
                    onClick={() => handleSelect(mat)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-sfpro-medium text-gray-900 dark:text-white truncate">{mat.name}</p>
                      {mat.category && (
                        <p className="text-[10px] text-gray-400 dark:text-[#52525b]">{mat.category}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-[#71717a] ml-2 shrink-0">
                      {mat.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}


function ItemRow({ item, index, onChange, onRemove, disabled, canRemove }) {
  const qtyRef = useRef(null)
  const priceRef = useRef(null)
  const discRef = useRef(null)
  const gstRef = useRef(null)

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Material <span className="text-red-500">*</span>
          </div>
          <MaterialSearchInput item={item} index={index} onChange={onChange} disabled={disabled} />
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Qty <span className="text-red-500">*</span>
          </div>
          <input
            ref={qtyRef}
            type="number" min="1" placeholder="0"
            value={item.orderedQuantity || ""}
            onChange={(e) => onChange(index, { ...item, orderedQuantity: parseFloat(e.target.value) || 0 })}
            onWheel={() => qtyRef.current?.blur()}
            disabled={disabled}
            className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Unit Price <span className="text-red-500">*</span>
          </div>
          <input
            ref={priceRef}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={item.unitPrice || ""}
            onChange={(e) => onChange(index, { ...item, unitPrice: parseFloat(e.target.value) || 0 })}
            onWheel={() => priceRef.current?.blur()}
            disabled={disabled}
            className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>

        <div className="sm:col-span-1">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Disc%</div>
          <input
            ref={discRef}
            type="number" min="0" max="100" step="0.1" placeholder="0"
            value={item.discountPercent || ""}
            onChange={(e) => onChange(index, { ...item, discountPercent: parseFloat(e.target.value) || 0 })}
            onWheel={() => discRef.current?.blur()}
            disabled={disabled}
            className="w-full h-8 px-2 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>

        <div className="sm:col-span-1">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">GST%</div>
          <input
            ref={gstRef}
            type="number" min="0" step="0.1" placeholder="0"
            value={item.gstPercent || ""}
            onChange={(e) => onChange(index, { ...item, gstPercent: parseFloat(e.target.value) || 0 })}
            onWheel={() => gstRef.current?.blur()}
            disabled={disabled}
            className="w-full h-8 px-2 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>

        <div className="sm:col-span-1">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Unit</div>
          <div className="h-8 px-2 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12px] font-sfpro text-gray-500 dark:text-[#a1a1aa] truncate">
            {item.unit || "Units"}
          </div>
        </div>

        <div className="sm:col-span-1">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">Total</div>
          <div className="h-8 px-2 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
            {(() => {
              const base = (item.orderedQuantity || 0) * (item.unitPrice || 0)
              const disc = base * ((item.discountPercent || 0) / 100)
              const afterDisc = base - disc
              const gst = afterDisc * ((item.gstPercent || 0) / 100)
              return `₹${(afterDisc + gst).toFixed(0)}`
            })()}
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


export function POItemsList({ items = [], onChange, disabled = false }) {
  const handleItemChange = (index, updated) => {
    const newItems = [...items]
    newItems[index] = updated
    onChange(newItems)
  }

  const handleRemove = (index) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    onChange([
      ...items,
      {
        inventoryId: "", materialMasterId: "", materialName: "",
        unit: "Units", orderedQuantity: 1, unitPrice: 0,
        discountPercent: 0, gstPercent: 0,
      },
    ])
  }

  const totalValue = items.reduce((sum, i) => {
    const base = (i.orderedQuantity || 0) * (i.unitPrice || 0)
    const disc = base * ((i.discountPercent || 0) / 100)
    const afterDisc = base - disc
    const gst = afterDisc * ((i.gstPercent || 0) / 100)
    return sum + afterDisc + gst
  }, 0)

  return (
    <div className="col-span-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
          Order Items <span className="text-red-500">*</span>
        </div>
        {/* <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-sfpro-medium bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-[#a1a1aa] border border-gray-200 dark:border-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Add Item
        </button> */}
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {items.map((item, index) => (
          <ItemRow
            key={index}
            item={item}
            index={index}
            onChange={handleItemChange}
            onRemove={handleRemove}
            disabled={disabled}
            canRemove={items.length > 1}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b]">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
        <p className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
          Total: ₹{totalValue.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
export function POFormContent({ form, setForm, disabled = false, projectId, isEdit = false }) {
  const updateField = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div
      className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        {isEdit ? (
          <div className="col-span-full">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
              Material Requisition
            </div>
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#1a1a1a]">
              <span className="text-[13px] font-sfpro text-gray-500 dark:text-[#71717a]">
                {form.mrObject?.mrNumber || "—"}
              </span>
              <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] font-sfpro">
                locked
              </span>
            </div>
          </div>
        ) : (
          <MRSelector
            projectId={projectId}
            value={form.mrObject}
            onChange={(mr) =>
              setForm((p) => ({
                ...p,
                mrObject: mr,
                mrId: mr?._id || "",
                items:
                  p.items?.length > 0
                    ? p.items
                    : (mr?.items || []).map((i) => ({
                      inventoryId: i.inventoryId || "",
                      materialMasterId: i.materialMasterId || "",
                      materialName: i.materialName || "",
                      unit: i.unit || "Units",
                      orderedQuantity: i.requiredQuantity ?? 1,
                      unitPrice: 0,
                      discountPercent: 0,   
                      gstPercent: 0,   
                    })),
              }))
            }
            disabled={disabled}
          />
        )}
        <VendorSelector
          value={form.vendorObject}
          onChange={(v) =>
            setForm((p) => ({
              ...p,
              vendorObject: v,
              vendorId: v?._id || v?.id || "",
            }))
          }
          disabled={disabled}
        />
        <DateField
          label="Expected Delivery"
          colSpan="col-span-2 md:col-span-2"
          value={form.expectedDeliveryDate}
          onChange={(date) =>
            setForm((p) => ({ ...p, expectedDeliveryDate: date }))
          }
          minDate={new Date()}
        />
        <POItemsList
          items={form.items || []}
          onChange={(items) => setForm((p) => ({ ...p, items }))}
          disabled={disabled}
        />
        <TextField
          label="Delivery Address"
          placeholder="Site delivery address..."
          colSpan="col-span-2 md:col-span-4"
          value={form.deliveryAddress}
          onChange={updateField("deliveryAddress")}
          disabled={disabled}
          as="textarea"
          rows={2}
        />
        <TextField
          label="Payment Terms"
          placeholder="e.g. Net 30, 50% advance..."
          colSpan="col-span-2 md:col-span-2"
          value={form.paymentTerms}
          onChange={updateField("paymentTerms")}
          disabled={disabled}
        />
        <TextField
          label="Special Instructions"
          placeholder="Any special delivery or handling instructions..."
          colSpan="col-span-2 md:col-span-2"
          value={form.specialInstructions}
          onChange={updateField("specialInstructions")}
          disabled={disabled}
        />
      </div>
    </div>
  )
}