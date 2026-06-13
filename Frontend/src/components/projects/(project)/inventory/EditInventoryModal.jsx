"use client"

import { useEffect, useState, useRef } from "react"
import { X, Search, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  editInventoryItem,
  fetchVendorLookup,
  formatToastError,
} from "@/app/(companyname)/projects/[projectId]/inventory/api"
import { useParams } from "next/navigation"

function VendorSearchDropdown({ value, onChange, disabled, options, isLoading }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef(null)

  const filtered = options.filter(
    (v) => !query.trim() || v.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const fn = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const handleSelect = (opt) => {
    onChange(opt.value)
    setOpen(false)
    setQuery("")
  }

  const handleClear = () => {
    onChange(null)
    setQuery("")
    setOpen(true)
  }

  return (
    <div className="relative" ref={containerRef}>
      {value && !open ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-[#252525] bg-white dark:bg-[#121212]">
          <span className="flex-1 text-[13px] font-sfpro text-black dark:text-white truncate">
            {value}
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] disabled:opacity-50"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg border border-gray-200 dark:border-[#252525] bg-white dark:bg-[#121212] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-[#414141] transition-all">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            <input
              type="text"
              placeholder={isLoading ? "Loading vendors..." : "Search vendor…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              disabled={disabled || isLoading}
              className="flex-1 bg-transparent text-[13.5px] font-sfpro text-black dark:text-white placeholder-gray-400 outline-none min-w-0"
            />
            <ChevronDown
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>

          {open && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] rounded-xl shadow-xl max-h-52 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400 font-sfpro">Loading...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <p className="text-sm text-gray-400 font-sfpro">
                    {query ? `No vendors matching "${query}"` : "No vendors found"}
                  </p>
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-left transition-colors"
                  >
                    <span className="text-[13.5px] font-sfpro-bold text-gray-900 dark:text-white truncate w-full">
                      {opt.label}
                    </span>
                    {(opt.vendorType || opt.email) && (
                      <span className="text-[11px] text-gray-400 font-sfpro truncate w-full">
                        {[opt.vendorType, opt.email].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function EditInventoryModal({ open, onClose, item, onSuccess }) {
  const { projectId } = useParams()

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({
    minimumLevel: "",
    pricePerUnit: "",
    supplierName: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const [vendorOptions, setVendorOptions] = useState([])
  const [isVendorLoading, setIsVendorLoading] = useState(false)
  const vendorControllerRef = useRef(null)

  useEffect(() => {
    if (open && item) {
      setForm({
        minimumLevel: item.minimumLevel ?? "",
        pricePerUnit: item.pricePerUnit ?? "",
        supplierName: item.supplierName ?? "",
      })
      setVendorOptions([])
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [open, item])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, submitting, onClose])

  useEffect(() => {
    if (!open || !item) return

    vendorControllerRef.current?.abort()
    const controller = new AbortController()
    vendorControllerRef.current = controller
    setIsVendorLoading(true)

    fetchVendorLookup("", controller.signal)
      .then((vendors) => {
        if (controller.signal.aborted) return

        const options = vendors.map((v) => ({
          value: v.name,
          label: v.name,
          email: v.email,
          vendorType: v.vendorType,
        }))

        setVendorOptions(options)
      })
      .catch((err) => {
        const isAbort =
          err.name === "CanceledError" ||
          err.name === "AbortError" ||
          err.code === "ERR_CANCELED"
        if (!isAbort) {
          console.error("Vendor lookup error:", err)
          setVendorOptions([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsVendorLoading(false)
      })

    return () => controller.abort()
  }, [open, item])
  const updateField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async () => {
    const payload = {}

    if (
      form.minimumLevel !== "" &&
      Number(form.minimumLevel) !== item.minimumLevel
    )
      payload.minimumLevel = Number(form.minimumLevel)

    if (
      form.pricePerUnit !== "" &&
      Number(form.pricePerUnit) !== item.pricePerUnit
    )
      payload.pricePerUnit = Number(form.pricePerUnit)

    if (form.supplierName !== (item.supplierName ?? "")) {
      payload.supplierName = form.supplierName?.trim() || null
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes", { description: "Nothing has been modified." })
      return
    }

    setSubmitting(true)
    try {
      const updated = await editInventoryItem(projectId, item.inventoryId, payload)
      toast.success("Item Updated", {
        description: `"${updated.name}" has been updated successfully.`,
      })
      onSuccess?.(updated)
      onClose()
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <>
      <div
        onClick={() => !submitting && onClose()}
        style={{ transitionDuration: "400ms" }}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        style={{
          transitionDuration: "1000ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[55dvh] flex flex-col">
          
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>
          <div className="flex flex-col items-center px-8 pt-5 pb-4 shrink-0">
            <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
              Edit Inventory Item
            </h2>
            <p className="text-sm font-sfpro text-gray-500 dark:text-[#71717a] mt-1">
              {item?.name}
            </p>
          </div>
          <div
            className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-24 xl:px-40 pt-4 pb-28"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EditField
                label="Minimum Level"
                type="number"
                value={form.minimumLevel}
                onChange={updateField("minimumLevel")}
                disabled={submitting}
                hint="Low stock alert threshold"
              />
              <EditField
                label="Price Per Unit (₹)"
                type="number"
                value={form.pricePerUnit}
                onChange={updateField("pricePerUnit")}
                disabled={submitting}
              />
              <div>
                <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
                  Vendor
                  {isVendorLoading && (
                    <Loader2 className="inline-block ml-1.5 w-3 h-3 animate-spin text-gray-400" />
                  )}
                </label>
                <VendorSearchDropdown
                  value={form.supplierName || null}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, supplierName: val ?? "" }))
                  }
                  options={vendorOptions}
                  isLoading={isVendorLoading}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1c1c1c]">
            <button
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer h-9 px-5 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 transition-all"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function EditField({ label, value, onChange, disabled, type = "text", hint }) {
  return (
    <div>
      <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={type === "number" ? "0" : undefined}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all disabled:opacity-50"
      />
      {hint && (
        <p className="mt-1 text-[11px] text-gray-400 dark:text-[#555] font-sfpro">
          {hint}
        </p>
      )}
    </div>
  )
}