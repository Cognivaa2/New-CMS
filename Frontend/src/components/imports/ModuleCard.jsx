"use client"

import {
    Users, Shield, Package, Truck, FolderKanban,
    GitBranch, CheckSquare, ListTodo, Boxes, ArrowLeftRight,
    ClipboardList, ShoppingCart, PackageCheck, Wrench,
    Receipt, CreditCard, AlertTriangle, Upload, Download,
} from "lucide-react"
import { SmoothCorners } from "react-smooth-corners"

const MODULE_ICONS = {
    roles: Shield,
    users: Users,
    materialMaster: Package,
    vendors: Truck,
    projects: FolderKanban,
    phases: GitBranch,
    tasks: CheckSquare,
    subtasks: ListTodo,
    projectInventory: Boxes,
    stockTransfers: ArrowLeftRight,
    materialRequisitions: ClipboardList,
    purchaseOrders: ShoppingCart,
    grns: PackageCheck,
    workOrders: Wrench,
    expenses: Receipt,
    payables: CreditCard,
    issues: AlertTriangle,
}

// const GROUP_COLORS = {
//   Administration: {
//     bg: "bg-purple-50 dark:bg-purple-500/10",
//     icon: "text-purple-600 dark:text-purple-400",
//     badge: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300",
//   },
//   Projects: {
//     bg: "bg-blue-50 dark:bg-blue-500/10",
//     icon: "text-blue-600 dark:text-blue-400",
//     badge: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
//   },
//   Inventory: {
//     bg: "bg-emerald-50 dark:bg-emerald-500/10",
//     icon: "text-emerald-600 dark:text-emerald-400",
//     badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
//   },
//   Procurement: {
//     bg: "bg-amber-50 dark:bg-amber-500/10",
//     icon: "text-amber-600 dark:text-amber-400",
//     badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
//   },
//   Operations: {
//     bg: "bg-orange-50 dark:bg-orange-500/10",
//     icon: "text-orange-600 dark:text-orange-400",
//     badge: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300",
//   },
//   Finance: {
//     bg: "bg-rose-50 dark:bg-rose-500/10",
//     icon: "text-rose-600 dark:text-rose-400",
//     badge: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300",
//   },
// }

const GROUP_COLORS = {
    Administration: {
        bg: "bg-black/[0.04] dark:bg-white/[0.06]",
        icon: "text-black dark:text-white",
        badge: "bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white",
    },
    Projects: {
        bg: "bg-black/[0.04] dark:bg-white/[0.06]",
        icon: "text-black dark:text-white",
        badge: "bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white",
    },
    Inventory: {
        bg: "bg-black/[0.04] dark:bg-white/[0.06]",
        icon: "text-black dark:text-white",
        badge: "bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white",
    },
    Procurement: {
        bg: "bg-black/[0.04] dark:bg-white/[0.06]",
        icon: "text-black dark:text-white",
        badge: "bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white",
    },
    Operations: {
        bg: "bg-black/[0.04] dark:bg-white/[0.06]",
        icon: "text-black dark:text-white",
        badge: "bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white",
    },
    Finance: {
        bg: "bg-black/[0.04] dark:bg-white/[0.06]",
        icon: "text-black dark:text-white",
        badge: "bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white",
    },
}
export default function ModuleCard({ module, onImport, onDownloadTemplate }) {
    const Icon = MODULE_ICONS[module.key] || Package
    const colors = GROUP_COLORS[module.group] || GROUP_COLORS.Projects

    return (
        <div className="group relative transition-all duration-300 hover:-translate-y-1">
            <div
                className="
        h-full p-5 flex flex-col gap-4 rounded-2xl
        bg-white dark:bg-[#09090b]
        border border-gray-200/80 dark:border-zinc-800/80
        shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none
        transition-all duration-300
      "
            >
                <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                        <Icon className={`w-5 h-5 ${colors.icon}`} strokeWidth={1.8} />
                    </div>
                    <span className={`text-[10px] font-sfpro-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.badge}`}>
                        {module.group}
                    </span>
                </div>

                <div className="flex flex-col flex-1">
                    <h3 className="text-[15px] font-sfpro-bold text-[#1f1f1f] dark:text-[#f4f4f5] leading-tight mb-1">
                        {module.label}
                    </h3>
                    <p className="text-[12px] font-sfpro text-[#8b8b8b] dark:text-[#888] leading-snug line-clamp-2 flex-1">
                        {module.description}
                    </p>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-zinc-800/60">
                    <button
                        onClick={() => onDownloadTemplate(module.key)}
                        className="
            flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg
            text-[11.5px] font-sfpro-medium
            border border-gray-200 dark:border-zinc-700
            text-gray-600 dark:text-zinc-400
            hover:bg-gray-50 dark:hover:bg-zinc-800/60
            transition-all duration-150
          "
                    >
                        <Download className="w-3.5 h-3.5" />
                        Template
                    </button>
                    <button
                        onClick={() => onImport(module)}
                        className="
            flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg
            text-[11.5px] font-sfpro-bold
            bg-[#212121] dark:bg-white
            text-white dark:text-black
            hover:bg-black dark:hover:bg-gray-200
            transition-all duration-150
          "
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Import
                    </button>
                </div>
            </div>
        </div>
    )
}