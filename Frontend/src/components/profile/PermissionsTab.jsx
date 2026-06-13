"use client"
import { useState } from "react"
import { ShieldCheck, ShieldOff, AlertCircle } from "lucide-react"

const ACTION_LABELS = {
    create: "Create",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    approve: "Approve",
    reject: "Reject",
    download: "Download",
    upload: "Upload",
}

const MODULE_DESCRIPTIONS = {
    "primary-approvals": "Approval workflows management",
    "primary-dashboard": "View and manage dashboard analytics",
    "primary-inventory": "Material and resource inventory",
    "primary-issues": "Track and resolve company issues",
    "primary-materials": "Manage materials and specifications",
    "primary-organization": "Company settings and configuration",
    "primary-projects": "Create, manage and track projects",
    "primary-purchase-orders": "Purchase order creation and tracking",
    "primary-roles": "User roles and permissions configuration",
    "primary-users": "Manage users and access levels",
    "primary-vendors": "Manage vendors and suppliers",
    "primary-work-orders": "Work order creation and tracking",
    "project-documents": "Project documents and file management",
    "project-dpr": "Daily Progress Reports documentation",
    "project-expense": "Track and manage project expenses",
    "project-consumption": "Track and manage project consumption",
    "project-gantt": "Visual project timeline and scheduling",
    "project-grn": "Goods Receipt Note tracking",
    "project-inventory": "Project-level inventory tracking",
    "project-issues": "Track and resolve project issues",
    "project-material-requisitions": "Material request and requisition management",
    "project-phases": "Project phases and milestones",
    "project-purchase-orders": "Project-level purchase orders",
    "project-roles": "Project-level roles and permissions",
    "project-stock-transfers": "Inter-project stock transfers",
    "project-tasks": "Manage daily tasks and assignments",
    "project-work-orders": "Project-level work orders",
}

const COL_WIDTH = 52

function humaniseKey(key) {
    return key
        .replace(/^(primary|project)-/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
}

function ReadonlyCheck({ isChecked, size = "md" }) {
    const dim = size === "sm" ? "w-5 h-5" : "w-6 h-6"
    const icon = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"
    return (
        <div className="flex items-center justify-center">
            {isChecked ? (
                <div className={`${dim} rounded-full bg-[#DFFDE8] dark:bg-green-950/50 border border-[#B3FBCC] dark:border-[#073f1b] flex items-center justify-center`}>
                    <svg
                        className={`${icon} text-[#059E3A]`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            ) : (
                <div className={`${dim} rounded-full bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46]`} />
            )}
        </div>
    )
}

function ModuleRow({ moduleKey, grantedActions, actions }) {
    const hasAny = grantedActions.length > 0
    const label = humaniseKey(moduleKey)
    const desc = MODULE_DESCRIPTIONS[moduleKey] ?? ""

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#09090b] hover:bg-[#fafafa] dark:hover:bg-[#0d0d0f] transition-colors min-w-max">
            <div className="flex items-center gap-3 flex-1 min-w-65 mr-3">
                <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                        hasAny ? "bg-[#22c55e]" : "bg-gray-300 dark:bg-[#3f3f46]"
                    }`}
                />
                <h4 className="text-[13px] xl:text-sm font-sfpro-bold text-gray-700 dark:text-[#f4f4f5] whitespace-nowrap shrink-0">
                    {label}
                </h4>
                {desc && (
                    <p className="text-[11px] xl:text-xs text-gray-400 dark:text-[#71717a] leading-relaxed truncate">
                        {desc}
                    </p>
                )}
            </div>

            <div
                className="grid shrink-0"
                style={{ gridTemplateColumns: `repeat(${actions.length}, ${COL_WIDTH}px)` }}
            >
                {actions.map((action) => (
                    <div key={action} className="flex items-center justify-center mx-0.5">
                        <ReadonlyCheck isChecked={grantedActions.includes(action)} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function MobilePermissionCard({ moduleKey, grantedActions, actions }) {
    const label = humaniseKey(moduleKey)
    const desc = MODULE_DESCRIPTIONS[moduleKey] ?? ""
    const hasAny = grantedActions.length > 0
    const activeCount = grantedActions.length

    return (
        <div className="rounded-xl border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-[#09090b] overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-3 border-b border-[#EAEAEA] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#111113]">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                            hasAny ? "bg-[#22c55e]" : "bg-gray-300 dark:bg-[#3f3f46]"
                        }`}
                    />
                    <div className="min-w-0">
                        <h4 className="text-[13px] font-sfpro-bold text-gray-800 dark:text-[#f4f4f5]">
                            {label}
                        </h4>
                        {desc && (
                            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-[#71717a] leading-relaxed">
                                {desc}
                            </p>
                        )}
                    </div>
                </div>

                {activeCount > 0 && (
                    <span className="shrink-0 text-[10px] font-sfpro-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 px-2 py-0.5 rounded-md">
                        {activeCount}/{actions.length}
                    </span>
                )}
            </div>

            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {actions.map((action) => {
                    const enabled = grantedActions.includes(action)
                    return (
                        <div
                            key={action}
                            className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                                enabled
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                    : "bg-[#fafafa] dark:bg-[#111113] border-[#EAEAEA] dark:border-[#27272a]"
                            }`}
                        >
                            <span className={`text-[11px] font-sfpro-medium ${
                                enabled
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-gray-500 dark:text-[#71717a]"
                            }`}>
                                {ACTION_LABELS[action] ?? action}
                            </span>
                            <ReadonlyCheck isChecked={enabled} size="sm" />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function PermissionsTab({ permissionsData, isLoading, error }) {
    const [activeTab, setActiveTab] = useState("company")

    if (isLoading) {
        return (
            <div className="w-full mt-4 sm:mt-5 flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-[#3f3f46] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 dark:text-[#71717a]">
                        Loading permissions…
                    </span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full mt-4 sm:mt-5 flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-sm font-sfpro-medium text-gray-600 dark:text-[#a1a1aa]">
                        {error}
                    </p>
                </div>
            </div>
        )
    }

    if (!permissionsData || !permissionsData.schema) {
        return (
            <div className="w-full mt-4 sm:mt-5 flex items-center justify-center py-12">
                <span className="text-xs text-gray-400 dark:text-[#71717a]">
                    No permission data available.
                </span>
            </div>
        )
    }

    const {
        roleName,
        isActive,
        permissions = {},
        schema,
    } = permissionsData

    const { actions = [], primaryModules = [], projectModules = [] } = schema

    const tabs = [
        { id: "company", label: "Company", moduleKeys: [...new Set(primaryModules)] },
        { id: "project", label: "Project", moduleKeys: [...new Set(projectModules)] },
    ]

    const currentModuleKeys = tabs.find((t) => t.id === activeTab)?.moduleKeys ?? []

    const tabCounts = Object.fromEntries(
        tabs.map((t) => [
            t.id,
            t.moduleKeys.filter((k) => (permissions[k]?.length ?? 0) > 0).length,
        ])
    )

    const totalGranted = Object.values(permissions).filter(
        (arr) => Array.isArray(arr) && arr.length > 0
    ).length

    const actionGridStyle = {
        gridTemplateColumns: `repeat(${actions.length}, ${COL_WIDTH}px)`,
    }

    const tableMinWidth = Math.max(760, 280 + actions.length * COL_WIDTH)

    return (
        <div className="w-full font-sfpro mt-3 sm:mt-4 lg:mt-5 min-w-0">
            <div className="flex flex-col gap-3 mb-4 lg:mb-5">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                    <div className="w-full overflow-x-auto [scrollbar-width:none]">
                        <div className="flex items-center gap-1 bg-[#f4f4f5] dark:bg-[#1c1c1e] rounded-lg border border-transparent dark:border-[#27272a] p-1 w-max min-w-fit">
                            {tabs.map((tab) => {
                                const count = tabCounts[tab.id] ?? 0
                                const isSelected = activeTab === tab.id

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-sfpro-medium whitespace-nowrap transition-all duration-200 ${
                                            isSelected
                                                ? "bg-[#18181b] text-white shadow-md dark:bg-white dark:text-black"
                                                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {count > 0 && (
                                            <span
                                                className={`flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold rounded-full ${
                                                    isSelected
                                                        ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                                                        : "bg-gray-200 text-gray-600 dark:bg-[#3f3f46] dark:text-gray-300"
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {roleName && (
                            <span className="text-[11px] font-sfpro-medium text-gray-500 dark:text-[#71717a] bg-[#fafafa] dark:bg-[#111113] px-2.5 py-1 rounded-md border border-[#EAEAEA] dark:border-[#27272a]">
                                Role: <span className="text-gray-800 dark:text-[#f4f4f5]">{roleName}</span>
                            </span>
                        )}

                        {totalGranted > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-sfpro-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-md border border-green-100 dark:border-green-900/50">
                                <ShieldCheck className="w-3 h-3" />
                                {totalGranted} module{totalGranted !== 1 ? "s" : ""} accessible
                            </span>
                        )}

                        {isActive === false && (
                            <span className="flex items-center gap-1 text-[11px] font-sfpro-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900">
                                <ShieldOff className="w-3 h-3" />
                                Role Inactive
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {currentModuleKeys.length === 0 ? (
                <div className="rounded-lg border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-[#09090b] flex items-center justify-center py-12">
                    <p className="text-xs text-gray-400 dark:text-[#71717a]">
                        No modules available for this tab.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:hidden">
                        {currentModuleKeys.map((moduleKey) => (
                            <MobilePermissionCard
                                key={moduleKey}
                                moduleKey={moduleKey}
                                grantedActions={permissions[moduleKey] ?? []}
                                actions={actions}
                            />
                        ))}
                    </div>

                    <div className="hidden xl:block rounded-lg border border-[#EAEAEA] dark:border-[#27272a] overflow-hidden bg-white dark:bg-[#09090b]">
                        <div className="overflow-x-auto">
                            <div style={{ minWidth: `${tableMinWidth}px` }}>
                                <div className="flex items-center justify-between px-4 py-2.5 bg-[#fafafa] dark:bg-[#111113] border-b border-[#EAEAEA] dark:border-[#27272a] min-w-max">
                                    <div className="flex-1 min-w-65 mr-3">
                                        <span className="text-[10px] font-sfpro-medium text-gray-400 dark:text-[#52525b] uppercase tracking-wider">
                                            Module
                                        </span>
                                    </div>

                                    <div className="grid shrink-0" style={actionGridStyle}>
                                        {actions.map((action) => (
                                            <div key={action} className="flex items-center justify-center mx-0.5">
                                                <span className="h-7 w-full flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] text-[10px] font-sfpro-medium rounded-md capitalize">
                                                    {ACTION_LABELS[action] ?? action}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="divide-y divide-[#EAEAEA] dark:divide-[#27272a]">
                                    {currentModuleKeys.map((moduleKey) => (
                                        <ModuleRow
                                            key={moduleKey}
                                            moduleKey={moduleKey}
                                            grantedActions={permissions[moduleKey] ?? []}
                                            actions={actions}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <p className="mt-3 text-center text-[11px] font-sfpro text-gray-400 dark:text-[#52525b] px-2">
                This is a read-only view. Contact your administrator to change permissions.
            </p>
        </div>
    )
}