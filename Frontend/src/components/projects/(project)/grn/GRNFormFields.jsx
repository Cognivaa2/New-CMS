"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Package, X, Loader2, Plus, Trash2, Upload, FileText } from "lucide-react"
import DatePicker from "@/components/ui/DatePicker"
import { fetchApprovedPOs, fetchPOPendingItems } from "@/app/(companyname)/projects/[projectId]/grn/api"

export function TextField({
  label,
  placeholder,
  colSpan,
  value,
  onChange,
  disabled,
  required,
  as = "input",
  rows = 3,
}) {
  const cls =
    "w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"

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
  label,
  colSpan = "col-span-1",
  value,
  onChange,
  required,
  minDate,
  maxDate,
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

export function FileUploadField({ label, value, onChange, accept = "*", disabled }) {
  const inputRef = useRef(null)

  return (
    <div className="col-span-full">
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sfpro-medium border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          Choose File
        </button>
        {value && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#252525]">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[12.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] truncate max-w-40">
              {value instanceof File ? value.name : "Existing attachment"}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-[#3f3f46] flex items-center justify-center disabled:opacity-50"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        disabled={disabled}
        className="hidden"
      />
    </div>
  )
}

export function POSelector({ projectId, value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pos, setPOs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const controllerRef = useRef(null)

  const doFetch = useCallback(
    async (q) => {
      if (!projectId) return
      controllerRef.current?.abort()
      const ctrl = new AbortController()
      controllerRef.current = ctrl
      setIsLoading(true)
      try {
        const list = await fetchApprovedPOs(projectId, { search: q, signal: ctrl.signal })
        if (!ctrl.signal.aborted) setPOs(list)
      } catch {}
      finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    },
    [projectId]
  )

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
    <div className="col-span-full" ref={containerRef}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        Purchase Order <span className="text-red-500">*</span>
      </div>

      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#121212]">
          <Package className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="flex-1 text-[13px] font-sfpro-medium text-black dark:text-white truncate">
            {value.poNumber}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#52525b] shrink-0">
            {value.vendorName}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(true)
              doFetch("")
            }}
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
            placeholder="Search approved POs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setOpen(true)
              if (pos.length === 0) doFetch("")
            }}
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
              ) : pos.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-gray-400 font-sfpro">
                    {query ? `No approved POs for "${query}"` : "No approved POs found"}
                  </p>
                </div>
              ) : (
                pos.map((po) => (
                  <div
                    key={po._id}
                    onClick={() => {
                      onChange(po)
                      setOpen(false)
                      setQuery("")
                    }}
                    className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-sfpro-medium text-gray-900 dark:text-white">
                          {po.poNumber}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-[#52525b]">
                          {po.vendorName} · {po.items?.length || 0} item(s)
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-sfpro-bold uppercase ${
                          po.status === "Approved"
                            ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
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

function ItemRow({ item, index, onChange, onRemove, disabled, canRemove }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525]">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-3">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Material
          </div>
          <div className="h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12.5px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate">
            {item.materialName || "—"}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Ordered
          </div>
          <div className="h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12.5px] font-sfpro text-gray-500 dark:text-[#a1a1aa]">
            {item.orderedQuantity || 0}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Received <span className="text-red-500">*</span>
          </div>
          <input
            type="number"
            min="0"
            max={item.orderedQuantity || 0}
            step="0.001"
            placeholder="0"
            value={item.receivedQuantity || ""}
            onChange={(e) =>
              onChange(index, {
                ...item,
                receivedQuantity: parseFloat(e.target.value) || 0,
              })
            }
            disabled={disabled}
            className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
          />
        </div>
        <div className="sm:col-span-1">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Unit
          </div>
          <div className="h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] flex items-center text-[12.5px] font-sfpro text-gray-500 dark:text-[#a1a1aa]">
            {item.unit || "Units"}
          </div>
        </div>
        <div className="sm:col-span-3">
          <div className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] mb-1">
            Remarks
          </div>
          <input
            type="text"
            placeholder="Optional notes..."
            value={item.remarks || ""}
            onChange={(e) =>
              onChange(index, { ...item, remarks: e.target.value })
            }
            disabled={disabled}
            className="w-full h-8 px-2.5 rounded-lg text-[12.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#414141] disabled:opacity-50"
          />
        </div>
        <div className="sm:col-span-1 flex items-end">
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={!canRemove || disabled}
            className="w-full h-8 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function GRNItemsList({ items = [], onChange, disabled = false }) {
  const handleItemChange = (index, updated) => {
    const newItems = [...items]
    newItems[index] = updated
    onChange(newItems)
  }

  const handleRemove = (index) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== index))
  }

  const totalReceived = items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0)

  return (
    <div className="col-span-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white">
          Delivery Items <span className="text-red-500">*</span>
        </div>
      </div>
      <div
        className="space-y-2 max-h-64 overflow-y-auto pr-1"
        style={{ scrollbarWidth: "thin" }}
      >
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
          Total Received: {totalReceived.toFixed(3)}
        </p>
      </div>
    </div>
  )
}

export function GRNFormContent({
  form,
  setForm,
  disabled = false,
  projectId,
  isEdit = false,
}) {
  const updateField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  const handlePOChange = async (po) => {
    if (!po) {
      setForm((p) => ({ ...p, poObject: null, poId: "", items: [] }))
      return
    }

    setForm((p) => ({
      ...p,
      poObject: po,
      poId: po._id,
      items: [],
    }))

    try {
      const { pendingItems } = await fetchPOPendingItems(projectId, po._id)
      setForm((p) => ({
        ...p,
        items: (pendingItems || []).map((i) => ({
          inventoryId: i.inventoryId || "",
          materialMasterId: i.materialMasterId || "",
          materialName: i.materialName || "",
          unit: i.unit || "Units",
          orderedQuantity: i.remainingQuantity || 0,
          receivedQuantity: 0,
          remarks: "",
        })),
      }))
    } catch (err) {
      console.error("Failed to load pending items:", err)
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-6 pb-25"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        {isEdit ? (
          <div className="col-span-full">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
              Purchase Order
            </div>
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#1a1a1a]">
              <span className="text-[13px] font-sfpro text-gray-500 dark:text-[#71717a]">
                {form.poObject?.poNumber || "—"}
              </span>
              <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] font-sfpro">
                locked
              </span>
            </div>
          </div>
        ) : (
          <POSelector
            projectId={projectId}
            value={form.poObject}
            onChange={handlePOChange}
            disabled={disabled}
          />
        )}

        <DateField
          label="Delivery Date"
          colSpan="col-span-2 md:col-span-2"
          value={form.deliveryDate}
          onChange={(date) => setForm((p) => ({ ...p, deliveryDate: date }))}
          required
          maxDate={new Date()}
        />

        <TextField
          label="Vehicle Number"
          placeholder="e.g. MH01AB1234"
          colSpan="col-span-2 md:col-span-2"
          value={form.vehicleNumber}
          onChange={updateField("vehicleNumber")}
          disabled={disabled}
        />

        <TextField
          label="Challan Number"
          placeholder="Delivery challan no."
          colSpan="col-span-2 md:col-span-2"
          value={form.deliveryChallanNumber}
          onChange={updateField("deliveryChallanNumber")}
          disabled={disabled}
        />

        <DateField
          label="Challan Date"
          colSpan="col-span-2 md:col-span-2"
          value={form.deliveryChallanDate}
          onChange={(date) => setForm((p) => ({ ...p, deliveryChallanDate: date }))}
          maxDate={new Date()}
        />

        <GRNItemsList
          items={form.items || []}
          onChange={(items) => setForm((p) => ({ ...p, items }))}
          disabled={disabled}
        />

        <TextField
          label="Remarks"
          placeholder="Any notes or observations..."
          colSpan="col-span-full"
          value={form.remarks}
          onChange={updateField("remarks")}
          disabled={disabled}
          as="textarea"
          rows={2}
        />

        <FileUploadField
          label="Attachment (Invoice/Challan)"
          value={form.attachment}
          onChange={(file) => setForm((p) => ({ ...p, attachment: file }))}
          accept="image/*,application/pdf"
          disabled={disabled}
        />
      </div>
    </div>
  )
}