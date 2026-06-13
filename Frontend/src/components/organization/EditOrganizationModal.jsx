"use client";
import { useEffect, useState, useRef } from "react";
import { X, Upload } from "lucide-react";

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  );
}

function Field({ label, placeholder, value, onChange, type = "text", uppercase = false, colSpan, disabled = false }) {
  return (
    <div className={colSpan}>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
      {type === "textarea" ? (
        <textarea
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all resize-none"
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={uppercase ? { textTransform: "uppercase" } : {}}
          className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all"
        />
      )}
    </div>
  );
}

// function Field({ label, placeholder, value, onChange, type = "text", uppercase = false, colSpan, disabled = false }) {
//   return (
//     <div className={colSpan}>
//       <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">{label}</div>
//       <input
//         type={type}
//         placeholder={placeholder}
//         value={value || ""}
//         onChange={(e) => onChange(e.target.value)}
//         disabled={disabled}
//         style={uppercase ? { textTransform: "uppercase" } : {}}
//         className="w-full py-2 px-3 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all"
//       />
//     </div>
//   );
// }

function LogoUploadField({ preview, onChange, disabled }) {
  return (
    <div>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">Company Logo</div>
      <div className="relative group flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        {preview ? (
          <img src={preview} alt="logo" className="max-h-28 object-contain rounded" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 dark:text-[#52525b] mb-3 group-hover:text-gray-600 dark:group-hover:text-[#a1a1aa]" />
            <p className="text-[13.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8] mb-1">
              <span className="font-sfpro-medium text-gray-900 dark:text-white">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs font-sfpro text-gray-500 dark:text-[#52525b]">PNG, JPG, JPEG (max. 10MB)</p>
          </>
        )}
      </div>
    </div>
  );
}

function TagsInput({ tags, onAdd, onRemove }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const t = input.trim();
    if (t && !tags.includes(t)) {
      onAdd(t);
      setInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && tags.length > 0) onRemove(tags.length - 1);
  };

  return (
    <div>
      <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5">Tags</div>
      <div className="flex flex-wrap items-center gap-2 w-full px-3 py-2 rounded-lg bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-[#414141]">
        {tags.map((tag, idx) => (
          <span key={idx} className="flex items-center gap-1 bg-gray-100 dark:bg-[#27272a] text-gray-700 dark:text-[#d4d4d8] text-[12px] font-sfpro-medium pl-2.5 pr-1.5 py-0.5 rounded-md">
            {tag}
            <X className="w-3 h-3 text-gray-400 dark:text-[#71717a] cursor-pointer hover:text-gray-700 dark:hover:text-[#f4f4f5]" onClick={() => onRemove(idx)} />
          </span>
        ))}
        <input
          placeholder="Add tag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-24 text-[13.5px] font-sfpro bg-transparent outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b]"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-3 py-1 rounded-md text-[12px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function EditOrganizationDrawer({ open, onClose, initialData, onSave, saving }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState(initialData || {});

const prevOpenRef = useRef(false);

useEffect(() => {
  if (open && !prevOpenRef.current && initialData) {
    setForm({
      ...initialData,
      logoPreview: initialData.logoPreview || initialData.logo || "",
    });
  }
  prevOpenRef.current = open;
}, [open, initialData]);
  useEffect(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); }
    else { setVisible(false); const t = setTimeout(() => setMounted(false), 420); return () => clearTimeout(t); }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  if (!mounted) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setAddr = (k, v) => setForm((p) => ({ ...p, address: { ...p.address, [k]: v } }));

  const handleAddTag = (t) => setForm((p) => ({ ...p, tags: [...(p.tags || []), t] }));
  const handleRemoveTag = (i) => setForm((p) => ({ ...p, tags: (p.tags || []).filter((_, idx) => idx !== i) }));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setForm((p) => ({ ...p, logo: file, logoPreview: URL.createObjectURL(file) }));
  };

  const handleSubmit = () => { if (!saving) onSave(form); };

  return (
    <>
      <Backdrop visible={visible} onClose={saving ? undefined : onClose} />
      <div style={{ transitionDuration: "1000ms", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }} className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}>
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[88dvh] lg:max-h-[55dvh] flex flex-col">
          <div className="flex justify-center pt-3 shrink-0"><div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46]" /></div>
          <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
            <div className="text-center">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">Edit Organization</h2>
              <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1">Update your company profile and legal details</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-7 space-y-8" style={{ scrollbarWidth: "none" }}>
            <LogoUploadField preview={form.logoPreview} onChange={handleLogoChange} disabled={saving} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
              <Field label="Company Name" value={form.companyName} onChange={(v) => set("companyName", v)} colSpan="col-span-2" />
              <Field label="Company Type" value={form.companyType} onChange={(v) => set("companyType", v)} colSpan="col-span-1" />
              <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} type="tel" colSpan="col-span-1" />
                {/* <Field 
      label="Description" 
      placeholder="Briefly describe your company..." 
      value={form.description} 
      onChange={(v) => set("description", v)} 
      type="textarea" 
      colSpan="col-span-2 md:col-span-4" 
    /> */}
              <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" colSpan="col-span-2" disabled />
              <Field label="Website" value={form.website} onChange={(v) => set("website", v)} type="url" colSpan="col-span-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
              <Field label="GSTIN" value={form.gstin} onChange={(v) => set("gstin", v)} uppercase colSpan="col-span-1" />
              <Field label="PAN" value={form.pan} onChange={(v) => set("pan", v)} uppercase colSpan="col-span-1" />
              <Field label="CIN" value={form.cin} onChange={(v) => set("cin", v)} uppercase colSpan="col-span-1" />
              <Field label="Labour License No." value={form.laborLicenseNo} onChange={(v) => set("laborLicenseNo", v)} colSpan="col-span-1" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
              <Field label="Street" value={form.address?.street} onChange={(v) => setAddr("street", v)} colSpan="col-span-2 md:col-span-4" />
              <Field label="City" value={form.address?.city} onChange={(v) => setAddr("city", v)} colSpan="col-span-1" />
              <Field label="State" value={form.address?.state} onChange={(v) => setAddr("state", v)} colSpan="col-span-1" />
              <Field label="Country" value={form.address?.country} onChange={(v) => setAddr("country", v)} colSpan="col-span-1" />
              <Field label="Pincode" value={form.address?.pincode} onChange={(v) => setAddr("pincode", v)} colSpan="col-span-1" />
            </div>

            <TagsInput tags={form.tags || []} onAdd={handleAddTag} onRemove={handleRemoveTag} />
            <div className="h-1" />
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4">
            <button onClick={onClose} disabled={saving} className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}