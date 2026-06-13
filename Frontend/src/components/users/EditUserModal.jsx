"use client"
import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Select } from "@/components/ui/DropDown"
import { fetchUserProfile, updateUser } from "@/app/(companyname)/users/api.jsx"
import { Upload, UserRound } from "lucide-react"

function Backdrop({ visible, onClose }) {
    return (
        <div onClick={onClose} style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
        />
    )
}

function Field({ label, placeholder, type = "text", value, onChange, readOnly = false }) {
    return (
        <div className="col-span-1">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label}
            </div>
            <input type={type} placeholder={placeholder} value={value} onChange={onChange}
                readOnly={readOnly}
                className={`w-full h-9 px-3 rounded-lg text-[13.5px] font-sfpro border transition-all duration-150
          ${readOnly ? "bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#1e1e1e] text-gray-400 dark:text-[#52525b] cursor-not-allowed select-none" : "bg-white dark:bg-[#121212] border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46]"}`}
            />
        </div>
    )
}


function TextareaField({ label, placeholder, value, onChange }) {
    return (
        <div className="col-span-1">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
            <textarea placeholder={placeholder} value={value} onChange={onChange} rows={3}
                className="w-full px-3 py-2 rounded-lg text-[13.5px] font-sfpro bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150 resize-none"
                style={{ scrollbarWidth: "none" }}
            />
        </div>
    )
}

function ReadOnlySelectField({ label, value }) {
    return (
        <div className="col-span-1">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label}
            </div>
            <div className="w-full h-9 px-3 flex items-center rounded-lg text-[13.5px] font-sfpro bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#1e1e1e] text-gray-400 dark:text-[#52525b] cursor-not-allowed select-none">
                {value || "—"}
            </div>
        </div>
    )
}

function AvatarUploadField({ label, currentUrl, file, onChange }) {
    const inputRef = useRef(null)
    const preview = file ? URL.createObjectURL(file) : currentUrl

    return (
        <div className="col-span-2">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">{label}</div>
            <div onClick={() => inputRef.current?.click()} className="relative group flex items-center gap-4 w-full px-4 py-4 border-2 border-dashed border-gray-300 dark:border-[#252525] rounded-lg bg-gray-50 dark:bg-[#121212] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer" >
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)}/>
                <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden border border-gray-200 dark:border-[#252525] bg-gray-200 dark:bg-[#252525] flex items-center justify-center">
                    {preview ? (
                        <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserRound className="w-5 h-5 text-gray-400 dark:text-[#52525b]" strokeWidth={1.5} />
                    )}
                </div>
                <div className="flex flex-col">
                    <p className="text-[13.5px] font-sfpro text-gray-700 dark:text-[#d4d4d8]">
                        <span className="font-sfpro-medium text-gray-900 dark:text-white">
                            {file ? file.name : "Click to upload"}
                        </span>
                        {!file && " or drag and drop"}
                    </p>
                    <p className="text-xs font-sfpro text-gray-500 dark:text-[#52525b] mt-0.5">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : "PNG, JPG, JPEG (max. 5MB)"}
                    </p>
                </div>
                <Upload className="ml-auto text-gray-400 dark:text-[#52525b] group-hover:text-gray-600 dark:group-hover:text-[#a1a1aa] transition-colors duration-150 shrink-0" width={18} height={18} strokeWidth={2}/>
            </div>
        </div>
    )
}

function SkeletonField({ wide = false }) {
    return (
        <div className={wide ? "col-span-2" : "col-span-1"}>
            <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-[#252525] mb-2 animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-gray-100 dark:bg-[#1a1a1a] animate-pulse" />
        </div>
    )
}

const EMPTY_FORM = {
    name: "",
    phone: "",
    address: "",
    about: "",
    email: "",
    role: "",
}

export default function EditUserModal({ open, onClose, user, onSuccess }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [avatarFile, setAvatarFile] = useState(null)
    const [fetching, setFetching] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setForm(EMPTY_FORM)
                setAvatarFile(null)
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && open) handleClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open])

    useEffect(() => {
        if (!open || !user?.id) return
        setFetching(true)
        fetchUserProfile(user.id)
            .then((profile) => {
                setForm({
                    name: profile.name ?? "",
                    phone: profile.phone ?? "",
                    address: profile.address ?? "",
                    about: profile.about ?? "",
                    email: profile.email ?? user.email ?? "",
                    role: profile.role?.roleName ?? user.role ?? "",
                })
            })
            .catch(() =>
                toast.error("Failed to load user profile", {
                    description: "Please try closing and reopening the form.",
                })
            )
            .finally(() => setFetching(false))
    }, [open, user?.id])
    const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))


    function handleClose() {
        if (submitting) return
        onClose()
    }

    async function handleSubmit() {
        if (!form.name.trim()) {
            toast.error("Name is required")
            return
        }
        setSubmitting(true)
        try {
            const res = await updateUser(user.id, {
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                about: form.about.trim(),
                avatar: avatarFile ?? undefined,
            })
            toast.success(res.title ?? "Profile Updated", {
                description: res.description ?? "User profile has been saved successfully.",
            })
            handleClose()
            onSuccess?.()
        } catch (err) {
            const msg =
                err.response?.data?.description ??
                err.response?.data?.message ??
                err.message ??
                "Something went wrong."
            toast.error(err.response?.data?.title ?? "Failed to Update User", { description: msg })
        } finally {
            setSubmitting(false)
        }
    }

    if (!mounted) return null

    return (
        <>
            <Backdrop visible={visible} onClose={handleClose} />

            <div style={{
                transitionDuration: "1000ms",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }} className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"}`}>
                <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl flex flex-col transition-colors duration-300">
                    <div className="flex justify-center pt-3 shrink-0">
                        <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
                    </div>
                    <div className="flex items-center justify-center px-8 pt-5 pb-5 shrink-0">
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors">
                                Edit User
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                Update profile information for this user
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 pb-6" style={{ scrollbarWidth: "none" }}>
                        {fetching ? (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                <SkeletonField />
                                <SkeletonField />
                                <SkeletonField />
                                <SkeletonField />
                                <SkeletonField wide />
                                <SkeletonField wide />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                <Field
                                    label="Email Address"
                                    value={form.email}
                                    readOnly
                                />
                                <ReadOnlySelectField
                                    label="Role"
                                    value={form.role}
                                />
                                <Field
                                    label="Full Name"
                                    placeholder="Ayan Chakraborty"
                                    value={form.name}
                                    onChange={setField("name")}
                                />
                                <Field
                                    label="Phone Number"
                                    placeholder="+91 74395 37213"
                                    type="tel"
                                    value={form.phone}
                                    onChange={setField("phone")}
                                />
                                <TextareaField
                                    label="Address"
                                    placeholder="123 Main Street, Kolkata"
                                    value={form.address}
                                    onChange={setField("address")}
                                />
                                <TextareaField
                                    label="About"
                                    placeholder="A short bio..."
                                    value={form.about}
                                    onChange={setField("about")}
                                />
                                <AvatarUploadField
                                    label="Avatar"
                                    currentUrl={user?.avatar ?? null}
                                    file={avatarFile}
                                    onChange={setAvatarFile}
                                />

                            </div>
                        )}
                    </div>
                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
                        <button onClick={handleClose} disabled={submitting} className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150" >
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={submitting || fetching} className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
                            {submitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}