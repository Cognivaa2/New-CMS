"use client"
import { useState } from "react"
import DatePicker from "@/components/ui/DatePicker"
import DateRangePicker from "@/components/ui/DateRangePicker"
import { Select, ContextMenu } from "@/components/ui/DropDown"
import FilterOptions from "@/components/ui/FilterOptions"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import { Pencil, Trash2, Eye, CheckCircle2, AlertCircle, Bell, Loader2 } from "lucide-react"
import { toast } from "sonner"

const FILTERS = [
    {
        key: "status",
        label: "Status",
        options: [
            { value: "NotStarted", label: "Not Started" },
            { value: "InProgress", label: "In Progress" },
            { value: "Completed", label: "Completed" },
            { value: "Blocked", label: "Blocked" },
            { value: "OnHold", label: "On Hold" },
        ],
    },
    {
        key: "priority",
        label: "Priority",
        options: [
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
            { value: "Critical", label: "Critical" },
        ],
    },
]

const TABS = ["DatePicker", "DateRangePicker", "Select", "FilterOptions", "ThreeDotMenu", "Toaster"]

export default function DevPage() {
    const [active, setActive] = useState("DatePicker")

    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] p-10">
            <div className="flex flex-wrap gap-2 mb-10">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActive(tab)}
                        className={`px-4 py-2 rounded-xl text-sm font-sfpro-medium transition-colors duration-150
              ${active === tab
                                ? "bg-[#212121] dark:bg-white text-white dark:text-[#121212]"
                                : "border-2 border-[#EAEAEA] dark:border-[#252525] text-[#3f3f46] dark:text-[#d4d4d8] hover:border-[#d4d4d4] dark:hover:border-[#3f3f46]"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex items-start gap-4 flex-wrap">
                {active === "DatePicker" && (
                    <DatePicker
                        placeholder="Select date"
                        onChange={(d) => console.log("DatePicker →", d)}
                    />
                )}

                {active === "DateRangePicker" && (
                    <DateRangePicker
                        placeholder="Pick a date range"
                        onChange={(r) => console.log("DateRangePicker →", r)}
                    />
                )}

                {active === "Select" && (
                    <Select
                        placeholder="Select status"
                        width="w-[220px]"
                        options={[
                            { value: "planned", label: "Planned" },
                            { value: "active", label: "Active" },
                            { value: "on_hold", label: "On Hold" },
                            { value: "completed", label: "Completed" },
                        ]}
                        onChange={(v) => console.log("Select →", v)}
                    />
                )}

                {active === "FilterOptions" && (
                    <FilterOptions
                        filters={FILTERS}
                        onChange={(f) => console.log("FilterOptions →", f)}
                    />
                )}

                {active === "ThreeDotMenu" && (
                    <ThreeDotMenu
                        items={[
                            { label: "View details", icon: <Eye className="w-4 h-4" />, onClick: () => console.log("View") },
                            { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => console.log("Edit") },
                            { label: "Delete", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => console.log("Delete") },
                        ]}
                    />
                )}

                {active === "Toaster" && (
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => toast.success("Project saved successfully", {
                                description: "The project has been added to your dashboard."
                            })}
                            className="px-5 py-2.5 bg-black text-white border border-[#333333] rounded-xl text-sm font-medium hover:bg-[#111111] transition flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Success
                        </button>

                        <button
                            onClick={() => toast.error("Failed to delete user", {
                                description: "You do not have permission to perform this action."
                            })}
                            className="px-5 py-2.5 bg-black text-white border border-[#333333] rounded-xl text-sm font-medium hover:bg-[#111111] transition flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4" />
                            Error
                        </button>

                        <button
                            onClick={() => toast("New notification", {
                                description: "Sarah commented on your recent work order.",
                                icon: <Bell className="w-4 h-4" />
                            })}
                            className="px-5 py-2.5 bg-black text-white border border-[#333333] rounded-xl text-sm font-medium hover:bg-[#111111] transition flex items-center gap-2"
                        >
                            <Bell className="w-4 h-4" />
                            Info / Custom Icon
                        </button>

                        <button
                            onClick={() => {
                                const promise = () => new Promise((resolve) => setTimeout(resolve, 1800));

                                toast.promise(promise, {
                                    loading: 'Uploading file...',
                                    success: 'File uploaded successfully.',
                                    error: 'Failed to upload file.',
                                });
                            }}
                            className="px-5 py-2.5 bg-black text-white border border-[#333333] rounded-xl text-sm font-medium hover:bg-[#111111] transition flex items-center gap-2"
                        >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading State
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}