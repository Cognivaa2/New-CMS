"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { X, Search, ChevronDown, Loader2, Package } from "lucide-react"
import { toast } from "sonner"
import {
  addMaterialToInventory,
  fetchMaterialMasterLookup,
  fetchVendorLookup,
  formatToastError,
  getCurrentUserKeycloakId,
} from "@/app/(companyname)/projects/[projectId]/inventory/api"
import { useParams } from "next/navigation"

const EMPTY_FORM = {
  materialMasterId: "",
  materialName: "",
  minimumLevel: "",
  pricePerUnit: "",
  supplierName: "",
  supplierObject: null,
  initialStock: "",
}

function VendorSearchDropdown({ value, onChange, disabled, options, isLoading }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef(null)
  const filtered = options.filter((v) =>
    !query.trim() || v.label.toLowerCase().includes(query.toLowerCase())
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

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
    setQuery("")
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
            className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] disabled:opacity-50 shrink-0"
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
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""
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

export default function AddMaterialModal({ open, onClose, onSuccess }) {
  const { projectId } = useParams()

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  const [materialSearch, setMaterialSearch] = useState("")
  const [materialResults, setMaterialResults] = useState([])
  const [isMaterialLoading, setIsMaterialLoading] = useState(false)
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)

  const [vendorOptions, setVendorOptions] = useState([])
  const [isVendorLoading, setIsVendorLoading] = useState(false)

  const searchControllerRef = useRef(null)
  const vendorControllerRef = useRef(null)
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM })
      setMaterialSearch("")
      setMaterialResults([])
      setShowMaterialDropdown(false)
      setVendorOptions([])
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 420)
      return () => clearTimeout(t)
    }
  }, [open])
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, submitting, onClose])
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target)) return
      if (searchInputRef.current?.contains(e.target)) return
      setShowMaterialDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  useEffect(() => {
    if (!open) return

    searchControllerRef.current?.abort()
    const controller = new AbortController()
    searchControllerRef.current = controller
    setIsMaterialLoading(true)

    const timer = setTimeout(() => {
      fetchMaterialMasterLookup(materialSearch, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) {
            setMaterialResults(results || [])
          }
        })
        .catch((err) => {
          const isAbort =
            err.name === "CanceledError" ||
            err.name === "AbortError" ||
            err.code === "ERR_CANCELED"
          if (!isAbort) {
            console.error("Material search error:", err)
            setMaterialResults([])
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsMaterialLoading(false)
        })
    }, 300) // Debounce search

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [materialSearch, open])
  useEffect(() => {
    if (!open) return

    vendorControllerRef.current?.abort()
    const controller = new AbortController()
    vendorControllerRef.current = controller
    setIsVendorLoading(true)

    fetchVendorLookup("", controller.signal)
      .then((vendors) => {
        if (!controller.signal.aborted) {
          setVendorOptions(
            (vendors || []).map((v) => ({
              value: v.name,
              label: v.name,
              email: v.email,
              vendorType: v.vendorType,
            }))
          )
        }
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
  }, [open])

  const handleSelectMaterial = useCallback((material) => {
    setForm((prev) => ({
      ...prev,
      materialMasterId: material._id || material.materialMasterId || material.id,
      materialName: material.name,
    }))
    setMaterialSearch(material.name)
    setShowMaterialDropdown(false)
  }, [])

  const handleClearMaterial = useCallback((e) => {
    e.stopPropagation()
    setForm((prev) => ({ ...prev, materialMasterId: "", materialName: "" }))
    setMaterialSearch("")
    setShowMaterialDropdown(true)
    setTimeout(() => {
      searchInputRef.current?.querySelector("input")?.focus()
    }, 0)
  }, [])

  const updateField = useCallback((key) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = async () => {
    if (!form.materialMasterId) {
      toast.error("Select a material", {
        description: "Please select a material from the list.",
      })
      return
    }

    const createdBy = getCurrentUserKeycloakId?.()
    if (!createdBy) {
      toast.error("Auth error", {
        description: "Could not determine current user.",
      })
      return
    }

    const payload = {
      materialMasterId: form.materialMasterId,
      createdBy,
      minimumLevel: form.minimumLevel !== "" ? Number(form.minimumLevel) : 0,
      pricePerUnit: form.pricePerUnit !== "" ? Number(form.pricePerUnit) : 0,
      supplierName: form.supplierName?.trim() || null,
      initialStock: form.initialStock !== "" ? Number(form.initialStock) : 0,
    }

    setSubmitting(true)
    try {
      const created = await addMaterialToInventory(projectId, payload)
      toast.success("Material Added", {
        description: `"${created.name}" has been added to inventory.`,
      })
      onSuccess?.(created)
      onClose()
    } catch (err) {
      toast.error("Failed to add material", { description: formatToastError(err) })
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
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      />
      <div
        style={{
          transitionDuration: "400ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[70dvh] flex flex-col">

          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-4 shrink-0">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                Add Material to Inventory
              </h2>
              <p className="text-sm font-sfpro text-gray-500 dark:text-[#71717a] mt-1">
                Select a material and configure stock settings
              </p>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-24 xl:px-40 pt-4 pb-28 space-y-5"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e0 transparent"
            }}
          >
            <div>
              <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
                Material <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={searchInputRef}>
                <div className="flex items-center gap-2.5 px-3 h-9 rounded-lg border border-gray-200 dark:border-[#252525] bg-white dark:bg-[#121212] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-[#414141] transition-all">
                  {isMaterialLoading ? (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={materialSearch}
                    onChange={(e) => {
                      setMaterialSearch(e.target.value)
                      if (!form.materialMasterId) {
                        setShowMaterialDropdown(true)
                      }
                    }}
                    onFocus={() => setShowMaterialDropdown(true)}
                    disabled={submitting}
                    className="flex-1 bg-transparent text-[13.5px] font-sfpro text-black dark:text-white placeholder-gray-400 outline-none min-w-0"
                  />
                  {form.materialMasterId && (
                    <button
                      type="button"
                      onClick={handleClearMaterial}
                      disabled={submitting}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] shrink-0 disabled:opacity-50"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${showMaterialDropdown ? "rotate-180" : ""
                      }`}
                  />
                </div>

                {showMaterialDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] rounded-xl shadow-xl max-h-52 overflow-y-auto"
                  >
                    {isMaterialLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-400 font-sfpro">
                          Searching...
                        </span>
                      </div>
                    ) : materialResults.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2">
                        <Package className="w-8 h-8 text-gray-300 dark:text-[#444]" />
                        <p className="text-sm text-gray-400 font-sfpro">
                          {materialSearch ? "No materials found" : "Start typing to search"}
                        </p>
                      </div>
                    ) : (
                      materialResults.map((mat, i) => (
                        <button
                          key={mat._id || mat.id || i}
                          type="button"
                          onClick={() => handleSelectMaterial(mat)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-left transition-colors"
                        >
                          <Package className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-sfpro-bold text-gray-900 dark:text-white truncate">
                              {mat.name}
                            </p>
                            {mat.category && (
                              <p className="text-[11.5px] text-gray-400 font-sfpro truncate">
                                {mat.category} • {mat.unit}
                              </p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Initial Stock"
                placeholder="e.g. 100"
                type="number"
                value={form.initialStock}
                onChange={updateField("initialStock")}
                disabled={submitting}
                hint="Starting quantity in inventory"
              />
              <FormField
                label="Minimum Level"
                placeholder="e.g. 20"
                type="number"
                value={form.minimumLevel}
                onChange={updateField("minimumLevel")}
                disabled={submitting}
                hint="Triggers low stock alert"
              />
              <FormField
                label="Price Per Unit (₹)"
                placeholder="e.g. 620"
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

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#1c1c1c] bg-white dark:bg-[#09090b]">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !form.materialMasterId}
              className="h-9 px-5 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add to Inventory"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function FormField({ label, placeholder, value, onChange, disabled, type = "text", hint }) {
  return (
    <div>
      <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        onWheel={type === "number" ? (e) => e.target.blur() : undefined}
        className="w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && (
        <p className="mt-1 text-[11px] text-gray-400 dark:text-[#555] font-sfpro">{hint}</p>
      )}
    </div>
  )
}