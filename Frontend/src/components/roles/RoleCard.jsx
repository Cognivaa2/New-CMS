"use client";
import { UserCog, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import ThreeDotMenu from "@/components/ui/ThreeDotMenu";

export default function RoleCard({ role, isActive, onClick, onToggleStatus, onEdit, onDelete }) {
    const menuItems = [
        {
            label: role.isActive ? "Deactivate" : "Activate",
            icon: role.isActive
                ? <ToggleLeft className="w-4 h-4" />
                : <ToggleRight className="w-4 h-4" />,
            onClick: onToggleStatus, 
        },
        {
            label: "Edit",
            icon: <Pencil className="w-4 h-4" />,
            onClick: () => onEdit?.(role), 
        },
        {
            label: "Delete",
            icon: <Trash2 className="w-4 h-4" />,
            variant: "danger",
            onClick: () => onDelete?.(role), 
        },
    ];

    return (
        <button
            onClick={onClick}
            className={`flex flex-col text-left border rounded-[28px] p-6 w-full transition-all duration-300 font-sfpro group
        ${
            isActive
                ? "border-gray-400 dark:border-[#52525b] bg-gray-50 dark:bg-[#27272a] shadow-sm"
                : "border-gray-100 dark:border-[#27272a] hover:border-gray-300 dark:hover:border-[#3f3f46] bg-white dark:bg-[#18181b]"
        }
        ${!role.isActive ? "opacity-60" : ""}
      `}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2.5">
                    <div
                        className={`p-2.5 rounded-full flex items-center justify-center shadow-sm transition-colors duration-300 ${
                            isActive
                                ? "bg-[#4f46e5] text-white"
                                : "bg-[#f0f4ff] dark:bg-[#1e3a8a]/20 text-[#4f46e5] dark:text-[#60a5fa]"
                        }`}
                    >
                        <UserCog className="w-5 h-5" />
                    </div>
                    
                </div>
                <div
                    onClick={(e) => e.stopPropagation()} 
                    className="relative z-10 -mr-1 -mt-1"
                >
                    <ThreeDotMenu
                        items={menuItems}
                        size="sm"
                        header={{
                            title: role.name,
                            subtitle:
                                role.description || "Manage role permissions and settings",
                        }}
                    />
                </div>
            </div>
            <h3 className="text-[21px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] mb-1.5">
                {role.name}
            </h3>
            <p className="text-[14px] text-gray-400 dark:text-[#71717a] leading-relaxed line-clamp-2">
                {role.description}
            </p>
            <div className="flex flex-col gap-0.5 mt-auto">
                {/* <span className="text-[14px] font-sfpro-medium text-gray-500 dark:text-[#a1a1aa]">
                    Created by {role.createdBy}
                </span> */}
                <span className="text-[14px] text-gray-400 dark:text-[#71717a]">
                    Created at {role.createdAt}
                </span>
            </div>
        </button>
    );
}