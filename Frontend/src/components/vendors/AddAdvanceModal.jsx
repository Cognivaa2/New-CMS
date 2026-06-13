
"use client"

import { useState, useEffect } from "react"
import { X, Upload, FileText, IndianRupee } from "lucide-react"
import { toast } from "sonner"
import DatePicker from "@/components/ui/DatePicker"
import { Select } from "@/components/ui/DropDown"

const PAYMENT_MODES = [
  "Cash", "BankTransfer", "Cheque", "UPI", "NEFT", "RTGS", "DD", "Other",
]

const PAYMENT_MODE_OPTIONS = PAYMENT_MODES.map((m) => ({ value: m, label: m }))

const INITIAL_FORM = {
  amount: "",
  paymentDate: new Date(),
  paymentMode: "BankTransfer",
  referenceNumber: "",
  notes: "",
}

export default function AddAdvanceModal({ open, onClose, onSave, vendorName }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setForm(INITIAL_FORM)
      setProofFile(null)
      setProofPreview(null)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setForm(INITIAL_FORM)
        setProofFile(null)
        setProofPreview(null)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose()
    }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [open, submitting, onClose])

  function handleClose() {
    if (!submitting) onClose()
  }

  function handleProofChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too Large", { description: "Maximum file size is 10MB." })
      return
    }
    setProofFile(file)
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (ev) => setProofPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setProofPreview(null)
    }
  }

  function handleProofRemove() {
    setProofFile(null)
    setProofPreview(null)
  }

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  function toDateString(d) {
    if (!d) return ""
    if (typeof d === "string") return d
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  async function handleSubmit() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast.error("Invalid Amount", { description: "Enter a valid positive amount." })
      return
    }
    if (!form.paymentDate) {
      toast.error("Missing Date", { description: "Payment date is required." })
      return
    }
    if (!form.paymentMode) {
      toast.error("Missing Payment Mode", { description: "Select a payment mode." })
      return
    }
    setSubmitting(true)
    try {
      await onSave(
        { ...form, paymentDate: toDateString(form.paymentDate) },
        proofFile,
      )
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  const inputCls = `w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro
    bg-white dark:bg-[#121212]
    border border-gray-200 dark:border-[#252525]
    text-black dark:text-white
    placeholder-gray-400 dark:placeholder-[#52525b]
    focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141]
    transition-all duration-150
    disabled:opacity-50 disabled:cursor-not-allowed h-9`

  return (
    <>
      <div
        onClick={handleClose}
        style={{ transitionDuration: "400ms" }}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
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
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">

          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                Add Advance Payment
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                {vendorName
                  ? `Adding advance for ${vendorName}`
                  : "Record an advance payment"}
              </p>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 space-y-6 pb-25"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">

              <div className="col-span-2">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                  Amount <span className="text-red-500">*</span>
                </div>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={update("amount")}
                    disabled={submitting}
                    className={`${inputCls} pl-9`}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                  Payment Date <span className="text-red-500">*</span>
                </div>
                <DatePicker
                  value={form.paymentDate}
                  onChange={(d) => setForm((prev) => ({ ...prev, paymentDate: d }))}
                  placeholder="Select date"
                  disabled={submitting}
                  maxDate={new Date()}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                  Payment Mode <span className="text-red-500">*</span>
                </div>
                <Select
                  options={PAYMENT_MODE_OPTIONS}
                  value={form.paymentMode}
                  onChange={(val) => setForm((prev) => ({ ...prev, paymentMode: val }))}
                  placeholder="Select mode"
                  disabled={submitting}
                  width="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
              <div className="col-span-2">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                  Reference Number
                </div>
                <input
                  type="text"
                  placeholder="e.g. TXN12345678"
                  value={form.referenceNumber}
                  onChange={update("referenceNumber")}
                  disabled={submitting}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                  Notes
                </div>
                <input
                  type="text"
                  placeholder="Optional notes…"
                  value={form.notes}
                  onChange={update("notes")}
                  disabled={submitting}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
                Payment Proof
              </div>
              {proofFile ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#121212]">
                  {proofPreview ? (
                    <img
                      src={proofPreview}
                      alt="Proof preview"
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-sfpro text-gray-500">
                        {proofFile.name}
                      </span>
                    </div>
                  )}
                  {!submitting && (
                    <button
                      type="button"
                      onClick={handleProofRemove}
                      className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="px-3 py-2">
                    <label className="cursor-pointer text-xs font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] hover:text-gray-900 dark:hover:text-white transition-colors">
                      Change file
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleProofChange}
                        disabled={submitting}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center w-full py-7 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleProofChange}
                    disabled={submitting}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-7 h-7 text-gray-400 dark:text-[#52525b] mb-2" />
                  <p className="text-[13px] font-sfpro text-gray-700 dark:text-[#d4d4d8] text-center">
                    <span className="font-sfpro-medium text-gray-900 dark:text-white">
                      Click to upload
                    </span>{" "}
                    proof document
                  </p>
                  <p className="text-xs font-sfpro text-gray-400 dark:text-[#52525b] mt-1">
                    PNG, JPG, PDF (max. 10MB)
                  </p>
                </div>
              )}
            </div>

            <div className="h-1" />
          </div>
          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {submitting ? "Processing…" : "Add Advance"}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}