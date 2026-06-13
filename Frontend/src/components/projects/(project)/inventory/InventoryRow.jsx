"use client"

import { useState } from "react"
import {
  Package, Truck, User, DollarSign,
  Archive, AlertTriangle, Eye, Pencil,
  Trash2, ArrowUpDown,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

const STATUS_CONFIG = {
  Excellent: { active: 17, color: "#22C55E" },
  Good:      { active: 11, color: "#86EFAC" },
  Low:       { active: 5,  color: "#F59E0B" },
  Critical:  { active: 2,  color: "#EF4444" },
}

function StatusGauge({ level = "Good" }) {
  const totalSegments = 17
  const cfg = STATUS_CONFIG[level] || STATUS_CONFIG.Good
  const inactiveColor = "#D7DCE6"
  const cx = 24, cy = 22, innerR = 10, outerR = 18

  return (
    <div className="flex flex-col items-center justify-center leading-none">
      <svg width="62" height="34" viewBox="0 0 48 28" aria-label={`${level} status`}>
        {Array.from({ length: totalSegments }).map((_, i) => {
          const t = i / (totalSegments - 1)
          const angle = Math.PI - t * Math.PI
          const x1 = cx + innerR * Math.cos(angle)
          const y1 = cy - innerR * Math.sin(angle)
          const x2 = cx + outerR * Math.cos(angle)
          const y2 = cy - outerR * Math.sin(angle)
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i < cfg.active ? cfg.color : inactiveColor}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      <span
        className="mt-px text-[13px] font-sfpro-medium"
        style={{ color: cfg.color }}
      >
        {level}
      </span>
    </div>
  )
}

function Stat({ icon: Icon, label, value, withDivider = false }) {
  return (
    <div className={`flex items-center gap-2 mx-4 min-w-0 md:pr-3 ${withDivider ? "md:border-r md:border-[#ECEFF6] dark:md:border-[#2A2A30]" : ""}`}>
      <div className="w-6 h-6 rounded-[7px] border border-[#E8ECF4] dark:border-[#2A2A30] flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-[#A0A8B8] dark:text-zinc-500" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] leading-none text-[#A0A8B8] dark:text-zinc-500 truncate">{label} :</p>
        <p className="mt-0.5 text-[13.5px] leading-none font-sfpro-bold text-[#2E3442] dark:text-zinc-300 truncate">{value ?? "—"}</p>
      </div>
    </div>
  )
}

export default function InventoryRow({ item, onView, onEdit, onAdjust, onDelete }) {
  const Icon = item.category?.toLowerCase().includes("machine") ? Truck : Package

  const menuItems = [
    // {
    //   label: "View details",
    //   icon: <Eye className="w-4 h-4" />,
    //   onClick: () => onView?.(item),
    // },
    {
      label: "Edit item",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => onEdit?.(item),
    },
    {
      label: "Adjust stock",
      icon: <ArrowUpDown className="w-4 h-4" />,
      onClick: () => onAdjust?.(item),
    },
    "divider",
    {
      label: "Delete item",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger",
      onClick: () => onDelete?.(item),
    },
  ]

  return (
    <div className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-white dark:bg-[#18181b] border border-[#E8ECF4] dark:border-[#2A2A30] rounded-2xl px-4 md:px-5 py-3 transition-all hover:border-gray-300 dark:hover:border-[#3a3a3a]">
      <div className="flex items-center gap-3 w-full md:w-55 shrink-0 min-w-0">
        <div className="w-9 h-9 rounded-[10px] bg-[#EEF1FF] dark:bg-[#232A45] text-[#5A67D8] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h4 className="text-[17px] font-sfpro-bold text-[#212121] dark:text-zinc-100 truncate">
            {item.name}
          </h4>
          <p className="text-[13px] text-[#919191] dark:text-zinc-500 truncate mt-0.5">
            {item.category} • {item.unit}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 w-full md:flex-1 gap-y-3 md:gap-y-0">
        <Stat
          icon={Archive}
          label="Current Stock"
          value={`${item.currentStock} ${item.unit}`}
          withDivider
        />
        <Stat
          icon={AlertTriangle}
          label="Min Level"
          value={`${item.minimumLevel} ${item.unit}`}
          withDivider
        />
        <Stat
          icon={User}
          label="Supplier"
          value={item.supplierName}
          withDivider
        />
        <Stat
          icon={DollarSign}
          label="Price / Unit"
          value={item.pricePerUnit ? `₹${item.pricePerUnit}` : null}
        />
      </div>
      <div className="ml-auto flex items-center gap-3 md:gap-4 shrink-0">
        <StatusGauge level={item.stockStatus} />
        <div onClick={(e) => e.stopPropagation()}>
          <ThreeDotMenu
            items={menuItems}
            size="md"
            header={{
              title: item.name,
              subtitle: item.category,
            }}
          />
        </div>
      </div>
    </div>
  )
}