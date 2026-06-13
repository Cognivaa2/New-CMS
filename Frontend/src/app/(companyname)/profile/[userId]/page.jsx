"use client"
import { useState, useEffect, useCallback } from "react"
import { use } from "react"
import { fetchUserProfileData } from "./api"
import UserProfileLeft from "@/components/profile/UserProfileLeft"
import UserProfileRight from "@/components/profile/UserProfileRight"
import UserProfileLoading from "./loading"

export default function UserProfilePage({ params }) {
    const { userId } = use(params)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadProfile = useCallback(() => {
        setLoading(true)
        fetchUserProfileData(userId).then((res) => {
            setData(res)
            setLoading(false)
        })
    }, [userId])

    useEffect(() => {
        loadProfile()
    }, [loadProfile])

    if (loading || !data) {
        return <UserProfileLoading />
    }

    return (
        <div className="w-full mx-auto py-8 px-4 flex flex-col gap-6 bg-white dark:bg-[#121212] min-h-screen transition-colors duration-300">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] transition-colors">Your Profile</h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[460px_1fr] gap-6 items-start">
                <UserProfileLeft
                    user={data.user}
                    onSuccess={loadProfile}
                />
                <UserProfileRight
                    userId={userId}
                    activities={data.activities}
                    roleId={data.user.roleId}
                />
            </div>
        </div>
    )
}