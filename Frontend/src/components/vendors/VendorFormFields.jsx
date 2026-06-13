// components/vendors/VendorFormFields.js
"use client"

import { X } from "lucide-react"
export function Field({
  label,
  placeholder,
  value,
  onChange,
  disabled,
  required,
  type = "text",
  colSpan = "",
  as = "input",
  rows = 3,
}) {
  const cls = [
    "w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro",
    "bg-white dark:bg-[#121212]",
    "border border-gray-200 dark:border-[#252525]",
    "text-black dark:text-white",
    "placeholder-gray-400 dark:placeholder-[#52525b]",
    "focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141]",
    "transition-all duration-150",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" ")

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
          type={type}
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
export function PhotoUploadField({ preview, onFileChange, onRemove, disabled, colSpan = "" }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">
        Vendor Photo
      </div>
      {preview ? (
        <div className="relative group w-full rounded-lg overflow-hidden border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#121212]">
          <img
            src={preview}
            alt="Vendor preview"
            className="w-full h-36 object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="px-3 py-2">
            <label className="cursor-pointer text-xs font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] hover:text-gray-900 dark:hover:text-white transition-colors">
              Change photo
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                disabled={disabled}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center w-full py-7 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-gray-400 dark:text-[#52525b] mb-2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          <p className="text-[13px] font-sfpro text-gray-700 dark:text-[#d4d4d8] text-center">
            <span className="font-sfpro-medium text-gray-900 dark:text-white">
              Click to upload
            </span>{" "}
            or drag and drop
          </p>
          <p className="text-xs font-sfpro text-gray-400 dark:text-[#52525b] mt-1">
            PNG, JPG, JPEG (max. 10MB)
          </p>
        </div>
      )}
    </div>
  )
}
export function VendorFormContent({ form, setForm, photoPreview, onPhotoChange, onPhotoRemove, disabled }) {
  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div
      className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="Vendor Name"
          placeholder="e.g. Ayan Traders"
          colSpan="col-span-2 md:col-span-2"
          value={form.name}
          onChange={update("name")}
          disabled={disabled}
          required
        />
        <Field
          label="Phone"
          placeholder="e.g. 9876543210"
          colSpan="col-span-2 md:col-span-1"
          value={form.phone}
          onChange={update("phone")}
          disabled={disabled}
          required
        />
        <Field
          label="Email"
          placeholder="vendor@email.com"
          colSpan="col-span-2 md:col-span-1"
          type="email"
          value={form.email}
          onChange={update("email")}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="Vendor Type"
          placeholder="e.g. Supplier, Contractor"
          colSpan="col-span-2 md:col-span-1"
          value={form.vendorType}
          onChange={update("vendorType")}
          disabled={disabled}
        />
        <Field
          label="Contact Person"
          placeholder="e.g. Rajan Mehta"
          colSpan="col-span-2 md:col-span-1"
          value={form.contactPerson}
          onChange={update("contactPerson")}
          disabled={disabled}
        />
        <Field
          label="Website"
          placeholder="https://example.com"
          colSpan="col-span-2 md:col-span-2"
          value={form.website}
          onChange={update("website")}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="Address"
          placeholder="Full address…"
          colSpan="col-span-2 md:col-span-4"
          value={form.address}
          onChange={update("address")}
          disabled={disabled}
          as="textarea"
          rows={2}
        />
        <Field
          label="Description"
          placeholder="Brief description of this vendor…"
          colSpan="col-span-2 md:col-span-4"
          value={form.description}
          onChange={update("description")}
          disabled={disabled}
          as="textarea"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="GSTIN"
          placeholder="e.g. 22AAAAA0000A1Z5"
          colSpan="col-span-2 md:col-span-1"
          value={form.legalDetails?.gstin}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              legalDetails: { ...p.legalDetails, gstin: e.target.value },
            }))
          }
          disabled={disabled}
        />
        <Field
          label="PAN"
          placeholder="e.g. AAAAA0000A"
          colSpan="col-span-2 md:col-span-1"
          value={form.legalDetails?.pan}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              legalDetails: { ...p.legalDetails, pan: e.target.value },
            }))
          }
          disabled={disabled}
        />
        <Field
          label="Registration No."
          placeholder="e.g. REG00025698"
          colSpan="col-span-2 md:col-span-2"
          value={form.legalDetails?.registrationNo}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              legalDetails: { ...p.legalDetails, registrationNo: e.target.value },
            }))
          }
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="Account Name"
          placeholder="e.g. Ayan Chakraborty"
          colSpan="col-span-2 md:col-span-2"
          value={form.bankDetails?.accountName}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              bankDetails: { ...p.bankDetails, accountName: e.target.value },
            }))
          }
          disabled={disabled}
        />
        <Field
          label="Account Number"
          placeholder="e.g. 1234567890"
          colSpan="col-span-2 md:col-span-1"
          value={form.bankDetails?.accountNumber}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              bankDetails: { ...p.bankDetails, accountNumber: e.target.value },
            }))
          }
          disabled={disabled}
        />
        <Field
          label="Bank Name"
          placeholder="e.g. IDBI Bank"
          colSpan="col-span-2 md:col-span-1"
          value={form.bankDetails?.bankName}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              bankDetails: { ...p.bankDetails, bankName: e.target.value },
            }))
          }
          disabled={disabled}
        />
        <Field
          label="IFSC Code"
          placeholder="e.g. IDIB000B001"
          colSpan="col-span-2 md:col-span-1"
          value={form.bankDetails?.ifsc}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              bankDetails: { ...p.bankDetails, ifsc: e.target.value },
            }))
          }
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <PhotoUploadField
          colSpan="col-span-2 md:col-span-4"
          preview={photoPreview}
          onFileChange={onPhotoChange}
          onRemove={onPhotoRemove}
          disabled={disabled}
        />
      </div>

      <div className="h-1" />
    </div>
  )
}