import { Activity, CheckCircle2 } from "lucide-react"

function formatTimestamp(iso) {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24)
        return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    if (diffDays === 1)
        return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    return `${date.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

export default function ActivitiesTab({ activities = [] }) {
    return (
        <div className="flex flex-col font-sfpro">
            {activities.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                        <Activity className="w-7 h-7 text-[#a1a1aa]" />
                    </div>
                    <div>
                        <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No Activities yet</p>
                        <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">No projects assigned yet</p>
                    </div>
                </div>
            ) : (
                <div className="relative">

                    <div className="flex flex-col">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4 py-4 transition-colors">
                                <div className="shrink-0 z-10 mt-0.5">
                                    <CheckCircle2 className="w-6 h-6 text-[#212121] dark:text-[#52525b] transition-colors" strokeWidth={2}/>
                                </div>
                                <p className="flex-1 text-sm lg:text-base font-sfpro text-[#212121] dark:text-[#d4d4d8] leading-snug transition-colors">
                                    {activity.description}
                                </p>

                                <span className="shrink-0 text-[12.5px] font-sfpro-bold text-gray-700 dark:text-[#a1a1aa] whitespace-nowrap transition-colors">
                                    {formatTimestamp(activity.timestamp)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}