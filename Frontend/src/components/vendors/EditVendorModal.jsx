// components/vendors/EditVendorModal.js
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { VendorFormContent } from "./VendorFormFields"

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    />
  )
}
function vendorToForm(vendor) {
  if (!vendor) return null
  return {
    name: vendor.name || "",
    phone: vendor.phone || "",
    email: vendor.email || "",
    vendorType: vendor.vendorType || "",
    contactPerson: vendor.contactPerson || "",
    website: vendor.website || "",
    address: vendor.address || "",
    description: vendor.description || "",
    legalDetails: {
      gstin: vendor.legalDetails?.gstin || "",
      pan: vendor.legalDetails?.pan || "",
      registrationNo: vendor.legalDetails?.registrationNo || "",
    },
    bankDetails: {
      accountName: vendor.bankDetails?.accountName || "",
      accountNumber: vendor.bankDetails?.accountNumber || "",
      bankName: vendor.bankDetails?.bankName || "",
      ifsc: vendor.bankDetails?.ifsc || "",
    },
  }
}

export default function EditVendorModal({
  open,
  onClose,
  onSave,
  vendor,
  isLoading,
}) {
  const [form, setForm] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (vendor) {
      setForm(vendorToForm(vendor))
      setPhotoPreview(
        typeof vendor.photo === "string" && vendor.photo ? vendor.photo : null
      )
    }
  }, [vendor])
  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setForm(null)
        setPhotoFile(null)
        setPhotoPreview(null)
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

  const busy = isLoading || submitting

  function handleClose() {
    if (!busy) onClose()
  }
  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too Large", { description: "Maximum file size is 10MB." })
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handlePhotoRemove() {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await onSave(form, photoFile)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  const isFormReady = form !== null

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
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[80dvh] flex flex-col transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="flex flex-col items-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                Edit Vendor
              </h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                {vendor?.name || "Update vendor details"}
              </p>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center justify-center gap-2 pb-3 shrink-0">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-[#3f3f46] border-t-gray-600 dark:border-t-[#a1a1aa] rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-sfpro">
                Loading full details...
              </span>
            </div>
          )}
          {isFormReady ? (
            <VendorFormContent
              form={form}
              setForm={setForm}
              photoPreview={photoPreview}
              onPhotoChange={handlePhotoChange}
              onPhotoRemove={handlePhotoRemove}
              disabled={submitting}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400 font-sfpro">
                  Loading vendor data...
                </span>
              </div>
            </div>
          )}

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button
              onClick={handleClose}
              disabled={busy}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy || !isFormReady}
              className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}