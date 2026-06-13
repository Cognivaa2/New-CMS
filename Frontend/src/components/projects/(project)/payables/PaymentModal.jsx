"use client"
import { useEffect, useState, useRef } from "react"
import {
  Calendar,
  CreditCard,
  FileText,
  IndianRupee,
  ArrowDownCircle,
  Upload,
  X,
  FileIcon,
  Image as ImageIcon,
} from "lucide-react"

import { formatCurrency } from "@/app/(companyname)/projects/[projectId]/payables/api"
import DatePicker from "@/components/ui/DatePicker"
import { Select } from "@/components/ui/DropDown"
import { toast } from "sonner"

const PAYMENT_MODE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "BankTransfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "DD", label: "DD" },
  { value: "Other", label: "Other" },
]

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    />
  )
}

function FieldLabel({ icon: Icon, label, required }) {
  return (
    <label className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 flex items-center gap-1.5">
      {Icon && <Icon size={12} />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
  )
}

function InputField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  children,
  hint,
  colSpan = "",
  required,
}) {
  const inputRef = useRef(null)

  return (
    <div className={colSpan}>
      <FieldLabel icon={icon} label={label} required={required} />

      {children ? (
        children
      ) : type === "textarea" ? (
        <textarea
          rows={3}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all resize-none"
        />
      ) : (
        <input
          ref={inputRef}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onWheel={() => type === "number" && inputRef.current?.blur()}
          placeholder={placeholder}
          disabled={disabled}
          min={type === "number" ? "0" : undefined}
          className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        />
      )}

      {hint && (
        <p className="text-[11px] text-gray-400 dark:text-[#52525b] font-sfpro mt-1">
          {hint}
        </p>
      )}
    </div>
  )
}

function ProofUploadField({ file, previewUrl, onChange, onRemove, disabled = false }) {
  const isImage = file?.type?.startsWith("image/")
  const isPdf = file?.type === "application/pdf"

  return (
    <div>
      <FieldLabel icon={Upload} label="Payment Proof" />

      {file && previewUrl ? (
        <div className="relative rounded-xl border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#121212] overflow-hidden">
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-white/90 dark:bg-[#09090b]/90 border border-gray-200 dark:border-[#333] shadow-sm hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30 transition-all disabled:opacity-50 group"
          >
            <X className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-500 transition-colors" />
          </button>

          {isImage ? (
            <div className="flex items-center justify-center p-4 max-h-48">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-40 max-w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <FileIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-sfpro-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-[#52525b] font-sfpro mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB • {file.type.split("/")[1]?.toUpperCase()}
                </p>
              </div>
            </div>
          )}
          {isImage && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 dark:border-[#252525] bg-white dark:bg-[#09090b]">
              <ImageIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <p className="text-[11.5px] font-sfpro text-gray-500 dark:text-[#71717a] truncate flex-1">
                {file.name}
              </p>
              <p className="text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] shrink-0">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative group flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={onChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          />
          <Upload className="w-8 h-8 text-gray-400 dark:text-[#52525b] mb-3 group-hover:text-gray-600 dark:group-hover:text-[#a1a1aa]" />
          <p className="text-[13.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] mb-1 text-center">
            <span className="font-sfpro-medium text-gray-900 dark:text-white">
              Click to upload
            </span>{" "}
            receipt, screenshot or PDF
          </p>
          <p className="text-xs font-sfpro text-gray-500 dark:text-[#52525b] text-center">
            PNG, JPG, JPEG, PDF
          </p>
        </div>
      )}
    </div>
  )
}

const INITIAL_FORM = {
  paymentDate: new Date(),
  paymentMode: "BankTransfer",
  paymentModeOther: "",
  amount: "",
  advanceDeducted: "",
  referenceNumber: "",
  notes: "",
  proofFile: null,
  proofFileName: "",
  proofPreviewUrl: "",
}

export default function PaymentModal({ payable, onClose, onSubmit }) {
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    if (!payable) return
    if (form.proofPreviewUrl) {
      URL.revokeObjectURL(form.proofPreviewUrl)
    }
    setForm(INITIAL_FORM)
  }, [payable])

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    )
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !submitting) {
        handleClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [submitting])

  useEffect(() => {
    return () => {
      if (form.proofPreviewUrl) {
        URL.revokeObjectURL(form.proofPreviewUrl)
      }
    }
  }, [form.proofPreviewUrl])

  if (!payable) return null

  const cashAmount = Number(form.amount) || 0
  const advanceAmt = Number(form.advanceDeducted) || 0
  const totalSettlement = cashAmount + advanceAmt

  const isValid =
    totalSettlement > 0 &&
    totalSettlement <= payable.dueAmount &&
    (cashAmount > 0 || advanceAmt > 0)

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleProofChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (form.proofPreviewUrl) {
      URL.revokeObjectURL(form.proofPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)

    setForm((prev) => ({
      ...prev,
      proofFile: file,
      proofFileName: file.name,
      proofPreviewUrl: previewUrl,
    }))
  }

  const handleProofRemove = () => {
    if (form.proofPreviewUrl) {
      URL.revokeObjectURL(form.proofPreviewUrl)
    }
    setForm((prev) => ({
      ...prev,
      proofFile: null,
      proofFileName: "",
      proofPreviewUrl: "",
    }))
  }

  const handleClose = () => {
    if (submitting) return
    setVisible(false)
    setTimeout(() => onClose?.(), 420)
  }

  const handleSubmit = async () => {
    if (!isValid || submitting) return
    if (!form.paymentDate) {
      toast.error("Payment date is required")
      return
    }
    if (!form.paymentMode) {
      toast.error("Payment mode is required")
      return
    }
    if (form.paymentMode === "Other" && !form.paymentModeOther?.trim()) {
      toast.error("Please specify the payment mode")
      return
    }
    if (cashAmount === 0 && advanceAmt === 0) {
      toast.error("Enter an amount or advance deduction")
      return
    }
    if (totalSettlement > payable.dueAmount) {
      toast.error(
        `Payment (${formatCurrency(totalSettlement)}) exceeds due amount (${formatCurrency(payable.dueAmount)})`
      )
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Backdrop visible={visible} onClose={handleClose} />

      <div
        style={{
          transitionDuration: "1000ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[70dvh] flex flex-col">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" />
          </div>

          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="text-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                Record Payment
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">
                {payable.payableNumber} • {payable.vendorName || "No vendor"}
              </p>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="p-4 rounded-xl bg-[#f9f9f9] dark:bg-[#18181b] border border-[#f0f0f0] dark:border-[#252525]">
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Total",
                    value: payable.totalAmount,
                    color: "text-gray-800 dark:text-[#f4f4f5]",
                  },
                  {
                    label: "Paid",
                    value: payable.paidAmount,
                    color: "text-green-600 dark:text-green-400",
                  },
                  {
                    label: "Due",
                    value: payable.dueAmount,
                    color: "text-red-600 dark:text-red-400",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#71717a] font-sfpro-bold">
                      {label}
                    </p>
                    <p className={`text-sm font-sfpro-bold mt-0.5 ${color}`}>
                      {formatCurrency(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
              <InputField
                label="Payment Date"
                icon={Calendar}
                colSpan="col-span-1"
                required
              >
                <DatePicker
                  value={form.paymentDate}
                  onChange={(d) => handleChange("paymentDate", d)}
                  placeholder="Select payment date"
                  maxDate={new Date()}
                />
              </InputField>

              <InputField
                label="Payment Mode"
                icon={CreditCard}
                colSpan="col-span-1"
                required
              >
                <Select
                  options={PAYMENT_MODE_OPTIONS}
                  value={form.paymentMode}
                  onChange={(v) => handleChange("paymentMode", v)}
                  placeholder="Select mode"
                />
              </InputField>

              {form.paymentMode === "Other" && (
                <InputField
                  label="Specify Mode"
                  value={form.paymentModeOther}
                  onChange={(v) => handleChange("paymentModeOther", v)}
                  placeholder="Enter payment mode"
                  colSpan="md:col-span-2"
                  required
                />
              )}

              <InputField
                label="Payment Amount"
                icon={IndianRupee}
                value={form.amount}
                onChange={(v) => handleChange("amount", v)}
                placeholder="0.00"
                type="number"
              />

              <InputField
                label="Advance Deduction"
                icon={ArrowDownCircle}
                value={form.advanceDeducted}
                onChange={(v) => handleChange("advanceDeducted", v)}
                placeholder="0.00"
                type="number"
              />

              <InputField
                label="Reference Number"
                icon={FileText}
                value={form.referenceNumber}
                onChange={(v) => handleChange("referenceNumber", v)}
                placeholder="UTR / Cheque No. / Transaction ID"
                colSpan="md:col-span-2"
              />

              <div className="md:col-span-2">
                <ProofUploadField
                  file={form.proofFile}
                  previewUrl={form.proofPreviewUrl}
                  onChange={handleProofChange}
                  onRemove={handleProofRemove}
                  disabled={submitting}
                />
              </div>

              <InputField
                label="Notes (Optional)"
                value={form.notes}
                onChange={(v) => handleChange("notes", v)}
                placeholder="Add any remarks…"
                type="textarea"
                colSpan="md:col-span-2"
              />
            </div>

            {totalSettlement > 0 && (
              <div className="p-3 rounded-xl bg-[#f9f9f9] dark:bg-[#18181b] border border-[#f0f0f0] dark:border-[#252525]">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-[#a1a1aa] font-sfpro">
                    Total Settlement
                  </span>
                  <span className="font-sfpro-bold text-gray-800 dark:text-white">
                    {formatCurrency(totalSettlement)}
                  </span>
                </div>
                {advanceAmt > 0 && (
                  <p className="text-[11px] text-gray-400 dark:text-[#52525b] font-sfpro mt-1">
                    Cash: {formatCurrency(cashAmount)} + Advance:{" "}
                    {formatCurrency(advanceAmt)}
                  </p>
                )}
              </div>
            )}

            <div className="h-1" />
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-[#27272a]">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}