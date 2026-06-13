"use client"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { changePassword } from "@/app/(companyname)/profile/[userId]/api"

function Backdrop({ visible, onClose }) {
    return (
        <div onClick={onClose} style={{ transitionDuration: "400ms" }}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        />
    )
}

function PasswordField({ label, placeholder, value, onChange }) {
    const [show, setShow] = useState(false)
    return (
        <div className="col-span-1">
            <div className="text-xs lg:text-sm font-sfpro text-black dark:text-white mb-1.5 transition-colors">
                {label}
            </div>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full h-9 px-3 pr-9 rounded-lg text-[13.5px] font-sfpro border bg-white dark:bg-[#121212] border-gray-200 dark:border-[#252525] text-black dark:text-white placeholder-gray-400 dark:placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#414141] focus:border-gray-300 dark:focus:border-[#3f3f46] transition-all duration-150"
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#52525b] hover:text-gray-600 dark:hover:text-[#a1a1aa] transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" }

export default function ChangePasswordModal({ open, onClose, userId }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
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
            }, 420)
            return () => clearTimeout(t)
        }
    }, [open])

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && open) handleClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open])

    const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

    function handleClose() {
        if (submitting) return
        onClose()
    }

    async function handleSubmit() {
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            toast.error("All fields are required")
            return
        }
        if (form.newPassword !== form.confirmPassword) {
            toast.error("Passwords do not match", {
                description: "New password and confirm password must be the same.",
            })
            return
        }
        if (form.newPassword.length < 8) {
            toast.error("Password too short", {
                description: "New password must be at least 8 characters.",
            })
            return
        }
        if (form.currentPassword === form.newPassword) {
            toast.error("Same password", {
                description: "New password must be different from your current password.",
            })
            return
        }
        setSubmitting(true)
        try {
            const res = await changePassword(userId, {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
                confirmPassword: form.confirmPassword,
            })
            toast.success(res.title ?? "Password Changed", {
                description: res.description ?? "Your password has been updated successfully.",
            })
            handleClose()
        } catch (err) {
            const msg =
                err.response?.data?.description ??
                err.response?.data?.message ??
                err.message ??
                "Something went wrong."
            toast.error(err.response?.data?.title ?? "Failed to Change Password", { description: msg })
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
                                Change Password
                            </h2>
                            <p className="text-sm font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors">
                                Enter your current password and choose a new one
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 lg:px-20 xl:px-36 pt-4 pb-6" style={{ scrollbarWidth: "none" }}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 gap-y-5">
                            <PasswordField
                                label="Current Password"
                                placeholder="Enter your current password"
                                value={form.currentPassword}
                                onChange={setField("currentPassword")}
                            />
                            <PasswordField
                                label="New Password"
                                placeholder="Enter your new password"
                                value={form.newPassword}
                                onChange={setField("newPassword")}
                            />
                            <PasswordField
                                label="Confirm New Password"
                                placeholder="Re-enter your new password"
                                value={form.confirmPassword}
                                onChange={setField("confirmPassword")}
                            />
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 transition-colors">
                        <button onClick={handleClose} disabled={submitting} className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
                            {submitting ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}