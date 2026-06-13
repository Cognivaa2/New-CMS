"use client"

import { Search, Plus, Loader2, Eye, Edit, Trash2, ShieldCheck, ShieldOff } from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"
import FilterOptions from "@/components/ui/FilterOptions"

const VENDOR_FILTERS = [
  {
    key: "isActive",
    label: "Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    key: "isVerified",
    label: "Verified",
    options: [
      { value: "true", label: "Verified" },
      { value: "false", label: "Unverified" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { value: "createdAt", label: "Created Date" },
      { value: "name", label: "Name" },
      { value: "email", label: "Email" },
    ],
  },
]

function Avatar({ src, name, size = 56 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        className="rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm shrink-0"
        onError={(e) => { e.target.style.display = "none" }}
      />
    )
  }
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?"
  return (
    <div
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className="rounded-full bg-gray-200 dark:bg-[#27272a] flex items-center justify-center text-sm font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] border-2 border-white dark:border-gray-800 shadow-sm shrink-0"
    >
      {initials}
    </div>
  )
}

export default function VendorList({
  vendors = [],
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onSearch,
  onFilter,
  onToggleVerify,     // ← new prop
  isRefreshing = false,
}) {
  const getMenuItems = (vendor) => [
    {
      label: "View Profile",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => onSelect?.(vendor.id),
    },
    {
      label: "Edit Vendor",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => onEdit?.(vendor),
    },
    // {
    //   label: vendor.isVerified ? "Mark as Unverified" : "Mark as Verified",
    //   icon: vendor.isVerified
    //     ? <ShieldOff className="w-4 h-4" />
    //     : <ShieldCheck className="w-4 h-4" />,
    //   onClick: () => onToggleVerify?.(vendor),
    // },
    "divider",
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => onDelete?.(vendor),
    },
  ]

  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#27272a] rounded-[40px] p-8 shadow-sm h-[calc(100vh-160px)] min-h-175 flex flex-col transition-all">

      {/* header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-[24px] font-sfpro-bold text-gray-900 dark:text-white tracking-tight">
            Your All Vendors
          </h2>
          <p className="text-[13px] text-gray-400 mt-1 leading-snug">
            Manage and track your vendor relationships
          </p>
        </div>
        <button
          onClick={onAdd}
          className="w-10 h-10 bg-[#1c1c1c] dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Add vendor"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* search + filter */}
      <div className="relative my-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search any vendor"
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-[#27272a] rounded-full text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-800 transition-all"
          />
        </div>
        <FilterOptions filters={VENDOR_FILTERS} onChange={onFilter} align="right" />
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {isRefreshing && (
          <div className="flex items-center justify-center gap-2 py-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-sfpro">Updating...</span>
          </div>
        )}

        {!isRefreshing && vendors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] font-sfpro-medium text-gray-400 dark:text-[#71717a]">
              No vendors found
            </p>
            <p className="text-[12px] text-gray-300 dark:text-[#52525b] mt-1">
              Add your first vendor to get started
            </p>
          </div>
        )}

        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => onSelect?.(vendor.id)}
            className={`group p-4 rounded-[28px] border transition-all cursor-pointer flex items-center gap-4 ${selectedId === vendor.id
                ? "border-gray-200 dark:border-[#2a2a2e] bg-[#f9f9fa] dark:bg-[#1a1a1d] shadow-sm"
                : "border-transparent hover:bg-[#fafafa] dark:hover:bg-[#18181b]"
              }`}
          >
            <div className="shrink-0">
              <Avatar src={vendor.photo} name={vendor.name} size={56} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-sfpro-bold text-[16px] text-gray-900 dark:text-white truncate">
                {vendor.name}
              </h4>
              <p className="text-[12px] text-gray-400 truncate mt-0.5 leading-tight">
                {vendor.description || vendor.vendorType || vendor.email || ""}
              </p>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <ThreeDotMenu
                items={getMenuItems(vendor)}
                size="sm"
                header={{
                  title: vendor.name,
                  subtitle: vendor.isVerified ? "Verified Vendor" : "Vendor Actions",
                  // green dot when verified
                  statusColor: vendor.isVerified ? "#22c55e" : undefined,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}