// components/material-list/MaterialFormFields.js
"use client"

export function Field({
  label,
  placeholder,
  value,
  onChange,
  disabled,
  required,
  as = "input",
  rows = 3,
  colSpan,
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
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
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

export function MaterialFormContent({ form, setForm, disabled }) {
  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div
      className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8 pb-25"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="Material Name"
          placeholder="e.g. Cement OPC 53 Grade"
          colSpan="col-span-2"
          value={form.name}
          onChange={update("name")}
          disabled={disabled}
          required
        />
        <Field
          label="Unit"
          placeholder="e.g. Bags, Kg, Litres"
          colSpan="col-span-2"
          value={form.unit}
          onChange={update("unit")}
          disabled={disabled}
          required
        />
        <Field
          label="Category"
          placeholder="e.g. Cement, Steel, Timber"
          colSpan="col-span-2"
          value={form.category}
          onChange={update("category")}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field
          label="Description"
          placeholder="Briefly describe this material and its intended usage…"
          colSpan="col-span-2 md:col-span-4"
          value={form.description}
          onChange={update("description")}
          disabled={disabled}
          as="textarea"
        />
      </div>

      <div className="h-1" />
    </div>
  )
}