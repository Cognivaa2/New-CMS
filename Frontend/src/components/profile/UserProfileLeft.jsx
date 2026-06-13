"use client"
import { useState } from "react"
import { Mail, Phone, MapPin, Pencil, BadgeCheck, Lock } from "lucide-react"
import Tooltip from "@/components/ui/Tooltip"
import EditUserModal from "@/components/users/EditUserModal"
import ChangePasswordModal from "@/components/profile/ChangePasswordModal"

const NotProvided = () => (
    <span className="text-sm font-sfpro italic text-[#c2c2c2] dark:text-[#3f3f46] transition-colors">Not provided</span>
)

export default function UserProfileLeft({ user, onSuccess }) {
    const completion = user.profileCompletion ?? 0
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isPasswordOpen, setIsPasswordOpen] = useState(false)

    return (
        <>
            <div className="flex flex-col gap-4 font-sfpro">
                <div className="bg-[#F9F9FA] dark:bg-[#121212] border border-transparent dark:border-[#27272a] rounded-3xl p-6 flex flex-col items-center gap-3 transition-colors duration-300">
                    <div className="relative">
                        <div className="w-24 h-24 lg:w-40 lg:h-40 xl:w-49 xl:h-49 rounded-full overflow-hidden border-9 border-white dark:border-[#09090b] transition-colors flex items-center justify-center">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = "none" }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#d4d4d4] text-[#212121] dark:bg-[#424242] dark:text-white font-bold text-2xl lg:text-4xl xl:text-6xl">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-center">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-lg lg:text-xl xl:text-2xl font-sfpro-bold text-gray-900 dark:text-[#f4f4f5] leading-tight transition-colors">{user.name}</h2>
                            {user.isVerified && (
                                <Tooltip content="You are a verified user" side="right">
                                    <BadgeCheck className="w-4 h-4 lg:w-9 lg:h-9 shrink-0" fill="#525ACC" stroke="#ffffff" />
                                </Tooltip>
                            )}
                        </div>
                        <p className="text-base font-sfpro-medium text-[#919191] dark:text-[#71717a] transition-colors">{user.role}</p>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row gap-1 mt-1">
                        <button onClick={() => setIsEditOpen(true)} className="cursor-pointer w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-sfpro-bold bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-[#eaeaea] transition-all duration-150">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                        </button>
                        <button onClick={() => setIsPasswordOpen(true)} className="cursor-pointer w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-sfpro-bold border border-[#c2c2c2] dark:border-[#494949] bg-transparent text-[#212121] dark:text-white hover:bg-[#eaeaea] dark:hover:bg-[#1d1d1d] transition-all duration-150">
                            <Lock className="w-3.5 h-3.5" />
                            Change Password
                        </button>
                    </div>

                    <div className="mt-6 w-full">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-sfpro-bold text-gray-400 dark:text-[#52525b] transition-colors">About</p>
                            {user.about
                                ? <p className="text-sm font-sfpro text-[#212121] dark:text-[#a1a1aa] transition-colors">{user.about}</p>
                                : <NotProvided />
                            }
                        </div>
                        <div className="flex flex-col gap-4 mt-6">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-[#212121] dark:text-white shrink-0 mt-0.5 transition-colors" />
                                {user.email
                                    ? <span className="text-sm font-sfpro text-[#212121] dark:text-white break-all transition-colors">{user.email}</span>
                                    : <NotProvided />
                                }
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-[#212121] dark:text-white shrink-0 mt-0.5 transition-colors" />
                                {user.phone
                                    ? <span className="text-sm font-sfpro text-[#212121] dark:text-white transition-colors">{user.phone}</span>
                                    : <NotProvided />
                                }
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-[#212121] dark:text-white shrink-0 mt-0.5 transition-colors" />
                                {user.address
                                    ? <span className="text-sm font-sfpro text-[#212121] dark:text-white transition-colors">{user.address}</span>
                                    : <NotProvided />
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#f9f9fa] dark:bg-[#18181b] border border-transparent dark:border-[#27272a] rounded-3xl p-6 flex flex-col gap-3 transition-colors duration-300">
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                            <p className="text-sm lg:text-base xl:text-lg font-sfpro-bold text-gray-800 dark:text-[#d4d4d8] transition-colors">Complete Your Profile</p>
                        </div>
                        <p className="text-xs font-sfpro text-[#919191] dark:text-[#52525b] transition-colors">Add more info to help your team identify you</p>
                    </div>
                    <div className="flex gap-1 lg:gap-4 items-center">
                        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-[#27272a] overflow-hidden transition-colors">
                            <div className="h-full rounded-full bg-gray-800 dark:bg-[#f4f4f5] transition-all duration-700" style={{ width: `${completion}%` }} />
                        </div>
                        <span className="text-sm lg:text-xl xl:text-2xl font-sfpro-bold text-gray-900 dark:text-[#f4f4f5] transition-colors">
                            {completion}%
                        </span>
                    </div>
                </div>
            </div>

            <EditUserModal
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                user={user}
                onSuccess={() => {
                    setIsEditOpen(false)
                    onSuccess?.()
                }}
            />

            <ChangePasswordModal
                open={isPasswordOpen}
                onClose={() => setIsPasswordOpen(false)}
                userId={user.id}
            />
        </>
    )
}