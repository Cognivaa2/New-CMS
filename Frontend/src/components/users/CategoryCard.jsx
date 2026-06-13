"use client"
import { UserCog, Eye, Pencil, Trash2 } from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

export default function CategoryCard({ title, description, isActive, onClick, id }) {
  const menuItems = [
    { label: "View details", icon: <Eye className="w-4 h-4" />, onClick: () => console.log("View", id || title) },
    "divider",
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => console.log("Edit", id || title) },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, variant: "danger", onClick: () => console.log("Delete", id || title) },
  ]

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer w-full sm:w-70 flex flex-col text-left border rounded-3xl sm:rounded-4xl p-4 sm:p-6 transition-all duration-300 font-sfpro ${
        isActive 
          ? "border-gray-200 dark:border-[#3f3f3f] bg-gray-50 dark:bg-[#09090b]"
          : "border-gray-100 dark:border-[#27272a] hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-transparent"
      }`}
    >
      <div className="flex justify-between items-start w-full mb-4 sm:mb-6">
        <div className="bg-[#f0f4ff] dark:bg-[#1e3a8a]/30 p-2 sm:p-2.5 rounded-full shadow-sm transition-colors">
          <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-[#4f46e5] dark:text-[#60a5fa]" />
        </div>
        <div onClick={(e) => e.stopPropagation()} className="relative z-10 -mr-1 -mt-1">
          <ThreeDotMenu
            size="md"
            items={menuItems}
            header={{
              title: title,
              subtitle: description || "Category details and actions",
            }}
          />
        </div>
      </div>

      <h3 className="text-[15px] sm:text-[17px] font-sfpro-medium text-gray-800 dark:text-[#f4f4f5] transition-colors">
        {title}
      </h3>

      <p className="text-[12px] sm:text-[13px] font-sfpro text-gray-400 dark:text-[#a1a1aa] mt-1 leading-relaxed transition-colors line-clamp-2 sm:line-clamp-none">
        {description}
      </p>
    </div>
  )
}