"use client"

import { useState } from "react"
import {
    Trash2, Package, Layers, CheckSquare,
    FileText, Wrench, TrendingDown, Tag,
} from "lucide-react"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

const SOURCE_CONFIG = {
    StockIssue: {
        label: "Stock Issue",
        className: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    },
    DPRSync: {
        label: "DPR Sync",
        className: "text-purple-600 bg-purple-50 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    },
}

const HEADERS = [
    "Material", "Qty Consumed", "Unit Price", "Total Cost",
    "Source", "Phase", "Task", "Sub Task", "Recorded By", "Date", "",
]

function SourcePill({ source }) {
    const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.StockIssue
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sfpro-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    )
}

function WOBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-sfpro-bold uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            <Wrench className="w-2.5 h-2.5" />
            WO
        </span>
    )
}

function UserAvatar({ user, size = 28 }) {
    const [imgError, setImgError] = useState(false)
    const hasAvatar = user?.avatar && !imgError
    if (hasAvatar) {
        return (
            <img
                src={user.avatar} alt={user.name || "User"}
                width={size} height={size}
                onError={() => setImgError(true)}
                className="rounded-full object-cover border border-white dark:border-[#121212] shadow-sm shrink-0"
                style={{ width: size, height: size }}
            />
        )
    }
    const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-200 dark:bg-[#3f3f46] flex items-center justify-center text-[10px] font-sfpro-bold text-gray-600 dark:text-[#a1a1aa] shrink-0"
        >
            {initials}
        </div>
    )
}

function UserCell({ user }) {
    if (!user) return <span className="text-[13px] text-gray-400 dark:text-[#52525b]">—</span>
    return (
        <div className="flex items-center gap-2 min-w-0">
            <UserAvatar user={user} size={26} />
            <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5] truncate">{user.name}</span>
                {user.role && (
                    <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate leading-tight">{user.role}</span>
                )}
            </div>
        </div>
    )
}

function PhaseTaskCell({ record }) {
    const parts = [
        record.phaseName && { icon: Layers, label: record.phaseName },
        record.taskName && { icon: CheckSquare, label: record.taskName },
        record.subTaskName && { icon: FileText, label: record.subTaskName },
    ].filter(Boolean)

    if (!parts.length) return <span className="text-[13px] text-gray-400 dark:text-[#52525b]">—</span>

    return (
        <div className="flex flex-col gap-0.5">
            {parts.map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-gray-400 dark:text-[#52525b] shrink-0" />
                    <span className="text-[12px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa] truncate max-w-36">
                        {label}
                    </span>
                </div>
            ))}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center">
                <TrendingDown className="w-7 h-7 text-[#a1a1aa]" />
            </div>
            <div>
                <p className="text-[15px] lg:text-xl font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">
                    No consumption records yet
                </p>
                <p className="text-sm font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-1">
                    Start recording material consumption for this project.
                </p>
            </div>
        </div>
    )
}

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#71717a] uppercase font-sfpro-bold tracking-wide">
                {label}
            </span>
            <div className="text-[13px] text-[#3f3f46] dark:text-[#d4d4d8] font-sfpro-medium wrap-break-words">
                {children || "—"}
            </div>
        </div>
    )
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] p-4 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="h-3.5 w-36 bg-gray-200 dark:bg-[#27272a] rounded" />
                    <div className="h-3 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-[#1e1e1e] rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="space-y-1.5">
                        <div className="h-2.5 w-14 bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                        <div className="h-3.5 w-full bg-gray-100 dark:bg-[#1e1e1e] rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

function SkeletonRow() {
    return (
        <tr className="border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
            {HEADERS.map((_, i) => (
                <td key={i} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 dark:bg-[#27272a] rounded animate-pulse" />
                </td>
            ))}
        </tr>
    )
}

function ConsumptionCard({ row, menuItems }) {
    return (
        <div className="rounded-2xl border-2 border-[#EAEAEA] dark:border-[#252525] bg-transparent hover:bg-[#f9f9f9] dark:hover:bg-[#09090b] transition-all duration-300 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] truncate">
                            {row.materialName}
                        </p>
                        {row.isWOConsumption && <WOBadge />}
                    </div>
                    <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate mt-0.5">
                        {row.unit}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <SourcePill source={row.source} />
                    <div onClick={(e) => e.stopPropagation()}>
                        <ThreeDotMenu items={menuItems} size="md" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="Qty Consumed">
                    <span className="font-sfpro-bold text-[#212121] dark:text-white">
                        {row.quantityConsumed.toLocaleString("en-IN")} {row.unit}
                    </span>
                </DetailRow>
                <DetailRow label="Total Cost">
                    <span className="font-sfpro-bold text-[#212121] dark:text-white">
                        ₹{row.totalCost.toLocaleString("en-IN")}
                    </span>
                </DetailRow>
                <DetailRow label="Unit Price">
                    ₹{row.pricePerUnit.toLocaleString("en-IN")}
                </DetailRow>
                <DetailRow label="Recorded By">
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <UserAvatar user={row.recordedBy} size={20} />
                        <span className="text-[12px] truncate">{row.recordedBy?.name || "—"}</span>
                    </div>
                </DetailRow>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#f0f0f0] dark:border-[#252525]">
                <DetailRow label="Phase">
                    {row.phaseName ? (
                        <div className="flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-gray-400 dark:text-[#52525b] shrink-0" />
                            <span className="truncate">{row.phaseName}</span>
                        </div>
                    ) : "—"}
                </DetailRow>
                <DetailRow label="Task">
                    {row.taskName ? (
                        <div className="flex items-center gap-1.5">
                            <CheckSquare className="w-3 h-3 text-gray-400 dark:text-[#52525b] shrink-0" />
                            <span className="truncate">{row.taskName}</span>
                        </div>
                    ) : "—"}
                </DetailRow>
                <DetailRow label="Sub Task">
                    {row.subTaskName ? (
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-gray-400 dark:text-[#52525b] shrink-0" />
                            <span className="truncate">{row.subTaskName}</span>
                        </div>
                    ) : "—"}
                </DetailRow>
                <DetailRow label="Date">{row.createdAt}</DetailRow>
                {row.remarks && (
                    <DetailRow label="Remarks">
                        <span className="line-clamp-2 font-sfpro">{row.remarks}</span>
                    </DetailRow>
                )}
            </div>
        </div>
    )
}

function ConsumptionRow({ row, menuItems, isLast }) {
    return (
        <tr className={`group hover:bg-[#f9f9f9] dark:hover:bg-[#0d0d0d] transition-colors duration-150 ${!isLast ? "border-b border-[#f0f0f0] dark:border-[#1e1e1e]" : ""}`}>
            <td className="px-4 py-4">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-sfpro-bold text-gray-900 dark:text-white truncate max-w-45">
                            {row.materialName}
                        </span>
                        {row.isWOConsumption && <WOBadge />}
                    </div>
                    {row.remarks && (
                        <span className="text-[11px] text-gray-400 dark:text-[#52525b] truncate max-w-45">
                            {row.remarks}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-gray-400 dark:text-[#52525b]" />
                    <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                        {row.quantityConsumed.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-[#71717a] font-sfpro">
                        {row.unit}
                    </span>
                </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8]">
                    ₹{row.pricePerUnit.toLocaleString("en-IN")}
                </span>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                    ₹{row.totalCost.toLocaleString("en-IN")}
                </span>
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <SourcePill source={row.source} />
            </td>

            <td className="px-4 py-4 whitespace-nowrap">
                {row.phaseName ? (
                    <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-gray-400 dark:text-[#52525b] shrink-0" />
                        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-32">
                            {row.phaseName}
                        </span>
                    </div>
                ) : (
                    <span className="text-[13px] text-gray-400 dark:text-[#52525b]">—</span>
                )}
            </td>

            <td className="px-4 py-4 whitespace-nowrap">
                {row.taskName ? (
                    <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-gray-400 dark:text-[#52525b] shrink-0" />
                        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-32">
                            {row.taskName}
                        </span>
                    </div>
                ) : (
                    <span className="text-[13px] text-gray-400 dark:text-[#52525b]">—</span>
                )}
            </td>

            <td className="px-4 py-4 whitespace-nowrap">
                {row.subTaskName ? (
                    <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-[#52525b] shrink-0" />
                        <span className="text-[13px] font-sfpro-medium text-gray-700 dark:text-[#d4d4d8] truncate max-w-32">
                            {row.subTaskName}
                        </span>
                    </div>
                ) : (
                    <span className="text-[13px] text-gray-400 dark:text-[#52525b]">—</span>
                )}
            </td>

            <td className="px-4 py-4 whitespace-nowrap">
                <UserCell user={row.recordedBy} />
            </td>
            <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-[13px] font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
                    {row.createdAt}
                </span>
            </td>
            <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center">
                    <ThreeDotMenu items={menuItems} size="sm" />
                </div>
            </td>
        </tr>
    )
}

export default function ConsumptionTable({
    data = [],
    isLoading = false,
    onDelete,
}) {
    const buildMenuItems = (row) => {
        const items = []
        items.push({
            label: "Delete Record",
            icon: <Trash2 className="w-4 h-4" />,
            variant: "danger",
            onClick: () => onDelete?.(row),
        })
        return items
    }

    return (
        <div className="w-full font-sfpro pb-10">
            <div className="lg:hidden space-y-3">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : data.length === 0
                        ? <EmptyState />
                        : data.map((row) => (
                            <ConsumptionCard key={row.id} row={row} menuItems={buildMenuItems(row)} />
                        ))}
            </div>

            <div className="hidden lg:block w-full rounded-2xl border border-[#EAEAEA] dark:border-[#252525] overflow-hidden shadow-sm">
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#f9f9f9] dark:bg-[#18181b] border-b border-[#EAEAEA] dark:border-[#252525]">
                                {HEADERS.map((h, i) => (
                                    <th
                                        key={i}
                                        className="px-4 py-3.5 text-left text-[11px] font-sfpro-bold text-[#a1a1aa] dark:text-[#71717a] whitespace-nowrap tracking-wide uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#121212]">
                            {isLoading
                                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                : data.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={HEADERS.length}> 
                                                <EmptyState />
                                            </td>
                                        </tr>
                                    )
                                    : data.map((row, index) => (
                                        <ConsumptionRow
                                            key={row.id}
                                            row={row}
                                            menuItems={buildMenuItems(row)}
                                            isLast={index === data.length - 1}
                                        />
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}