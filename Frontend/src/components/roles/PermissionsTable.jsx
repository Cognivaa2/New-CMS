"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { ChevronDown, Check, AlertCircle, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"

function humaniseKey(key) {
  return key
    .replace(/^(primary|project)-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
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
  "primary-finance": "Monitor company-wide financial operations, liabilities, payments and spending analytics.",
  "primary-materials-requisition": "Material request and requisition management",
  "primary-grn": "Goods receipt tracking and management",
  "primary-stock-transfers": "Inter-warehouse stock transfer management",
  "primary-payables": "Manage company payables and payments",
  "primary-contra-entry": "Manage Inter-account fund transfers",
  "primary-three-way-match": "PO, GRN & invoice matching",

  "project-documents": "Project documents and file management",
  "project-dpr": "Daily Progress Reports documentation",
  "project-expense": "Track and manage project expenses",
  "project-consumption": "Track and manage project expenses",
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
  "project-payables": "Manage project payables and payments",
  "project-three-way-match": "PO, GRN & invoice matching",
  "project-safety": "Safety inspections and compliance tracking",
}

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

const COL_WIDTH = 64
function CustomCheck({ isChecked, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-checked={isChecked}
      role="checkbox"
      className={`flex items-center justify-center transition-all ${disabled
        ? "opacity-50 cursor-not-allowed"
        : "opacity-100 hover:scale-110 cursor-pointer"
        }`}
    >
      {isChecked ? (
        <div className="w-7 h-7 rounded-full bg-[#DFFDE8] dark:bg-green-950/50 border border-[#B3FBCC] dark:border-[#073f1b] flex items-center justify-center shadow-sm">
          <Check className="text-[#059E3A] w-4 h-4 stroke-3" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46]" />
      )}
    </button>
  )
}
function RoleDropdown({ roles, activeRoleId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#e3efff] dark:bg-[#1e3a8a]/30 text-[#3b82f6] px-4 py-2 rounded-xl text-[14px] font-sfpro-medium transition-colors hover:bg-[#d0e4ff] dark:hover:bg-[#1e3a8a]/50 cursor-pointer"
      >
        Select Role
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full sm:w-56 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => { onSelect(role); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[13.5px] font-sfpro transition-colors cursor-pointer ${activeRoleId === role.id
                  ? "bg-[#e3efff] dark:bg-[#1e3a8a]/30 text-[#3b82f6] font-sfpro-medium"
                  : "text-gray-700 dark:text-[#d4d4d8] hover:bg-gray-50 dark:hover:bg-[#27272a]"
                  }`}
              >
                <span className="flex items-center gap-2">
                  {role.name}
                  {!role.isActive && (
                    <span className="text-[9px] font-sfpro-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-500 dark:text-red-400">
                      Inactive
                    </span>
                  )}
                </span>
                {activeRoleId === role.id && (
                  <Check className="w-4 h-4 text-[#3b82f6] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
function ToggleAllButton({ allEnabled, disabled, isLoading, onClick }) {
  const enable = !allEnabled
  return (
    <button
      onClick={() => onClick(enable)}
      disabled={disabled || isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-sfpro-medium transition-all border cursor-pointer ${disabled || isLoading
        ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-[#27272a] text-gray-400 dark:text-[#71717a] border-transparent"
        : enable
          ? "bg-[#f0fdf4] dark:bg-green-950/30 text-[#16a34a] dark:text-green-400 border-[#bbf7d0] dark:border-[#073f1b] hover:bg-[#dcfce7] dark:hover:bg-green-950/50"
          : "bg-[#fef2f2] dark:bg-red-950/30 text-[#dc2626] dark:text-red-400 border-[#fecaca] dark:border-[#450a0a] hover:bg-[#fee2e2] dark:hover:bg-red-950/50"
        }`}
    >
      {enable ? (
        <>
          <ShieldCheck className="w-3.5 h-3.5" />
          Grant All
        </>
      ) : (
        <>
          <ShieldOff className="w-3.5 h-3.5" />
          Clear All
        </>
      )}
    </button>
  )
}
function buildStateFromPermissions(permissions, allModules) {
  const state = {}
  allModules.forEach((mod) => {
    state[mod] = new Set(permissions[mod] || [])
  })
  return state
}
function buildPayload(state) {
  const payload = {}
  Object.entries(state).forEach(([mod, actionSet]) => {
    if (actionSet.size > 0) payload[mod] = Array.from(actionSet)
  })
  return payload
}
function countActive(state, moduleKeys) {
  return moduleKeys.filter((k) => state[k]?.size > 0).length
}
export default function PermissionsTable({
  roles = [],
  activeRoleId,
  activeRoleName,
  activeRoleIsActive = true,
  permissions = {},
  schema,
  onRoleChange,
  onUpdatePermissions,
  onToggleAllPermissions,
}) {
  const [activeTab, setActiveTab] = useState("company")
  const [permState, setPermState] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingAll, setIsTogglingAll] = useState(false)
  const saveTimeoutRef = useRef(null)
  const tabs = useMemo(() => {
    if (!schema) return []
    return [
      {
        id: "company",
        label: "Company",
        moduleKeys: [...new Set(schema.primaryModules || [])]
      },
      {
        id: "project",
        label: "Project",
        moduleKeys: [...new Set(schema.projectModules || [])]
      },
    ]
  }, [schema])
  const actions = useMemo(() => schema?.actions || [], [schema])
  const allModules = useMemo(() => schema?.modules || [], [schema])
  useEffect(() => {
    if (allModules.length === 0) return
    setPermState(buildStateFromPermissions(permissions, allModules))
  }, [activeRoleId, permissions, allModules])
  useEffect(
    () => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) },
    []
  )
  const currentModuleKeys = useMemo(
    () => {
      const keys = tabs.find((t) => t.id === activeTab)?.moduleKeys || []
      return [...new Set(keys)]
    },
    [tabs, activeTab]
  )
  const tabCounts = useMemo(
    () => Object.fromEntries(tabs.map((t) => [t.id, countActive(permState, t.moduleKeys)])),
    [tabs, permState]
  )
  const allEnabled = useMemo(() => {
    if (allModules.length === 0 || actions.length === 0) return false
    return allModules.every((mod) =>
      actions.every((action) => permState[mod]?.has(action))
    )
  }, [allModules, actions, permState])
  const scheduleSave = useCallback(
    (nextState, prevState) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(async () => {
        const nextPayload = buildPayload(nextState)
        const prevPayload = buildPayload(prevState)
        if (JSON.stringify(nextPayload) === JSON.stringify(prevPayload)) return

        setIsSaving(true)
        try {
          const res = await onUpdatePermissions(activeRoleId, nextPayload)
          toast.success(res?.title || "Permissions Updated", {
            description: res?.description || "Your changes have been saved.",
          })
        } catch (err) {
          setPermState(prevState)
          toast.error("Failed to save permissions", {
            description: err?.message || "Please try again.",
          })
        } finally {
          setIsSaving(false)
        }
      }, 400)
    },
    [activeRoleId, onUpdatePermissions]
  )
  const toggleAction = useCallback(
    (moduleKey, action) => {
      if (!activeRoleIsActive) return
      setPermState((prev) => {
        const next = {
          ...prev,
          [moduleKey]: new Set(
            prev[moduleKey]?.has(action)
              ? [...prev[moduleKey]].filter((a) => a !== action)
              : [...(prev[moduleKey] || []), action]
          ),
        }
        scheduleSave(next, prev)
        return next
      })
    },
    [activeRoleIsActive, scheduleSave]
  )
  const handleToggleAll = useCallback(
    async (enable) => {
      if (!activeRoleIsActive || isTogglingAll) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      const prevState = permState
      const nextState = buildStateFromPermissions(
        enable
          ? Object.fromEntries(allModules.map((mod) => [mod, [...actions]]))
          : {},
        allModules
      )
      setPermState(nextState)
      setIsTogglingAll(true)
      try {
        const res = await onToggleAllPermissions(activeRoleId, enable)
        toast.success(res?.title || (enable ? "All Permissions Granted" : "All Permissions Cleared"), {
          description: res?.description,
        })
        const serverPermissions = res?.data?.permissions || {}
        setPermState(buildStateFromPermissions(serverPermissions, allModules))
      } catch (err) {
        setPermState(prevState)
        toast.error("Failed to toggle permissions", {
          description: err?.message || "Please try again.",
        })
      } finally {
        setIsTogglingAll(false)
      }
    },
    [activeRoleIsActive, isTogglingAll, permState, allModules, actions, activeRoleId, onToggleAllPermissions]
  )
  if (!schema || tabs.length === 0) {
    return (
      <div className="w-full mt-10 flex items-center justify-center py-16">
        <span className="text-sm text-gray-400 dark:text-[#71717a]">
          Loading permission schema…
        </span>
      </div>
    )
  }
  const actionGridStyle = {
    gridTemplateColumns: `repeat(${actions.length}, ${COL_WIDTH}px)`,
  }

  return (
    <div className="w-full font-sfpro mt-6 md:mt-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4 md:gap-6 px-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <RoleDropdown roles={roles} activeRoleId={activeRoleId} onSelect={onRoleChange} />
          <div className="flex items-center p-1 bg-[#f4f4f5] dark:bg-[#1c1c1e] rounded-xl border border-transparent dark:border-[#27272a] w-full sm:w-auto">
            {tabs.map((tab) => {
              const count = tabCounts[tab.id] ?? 0
              const isSelected = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg text-sm font-sfpro-medium transition-all duration-200
                    ${isSelected
                      ? "bg-[#18181b] text-white shadow-md dark:bg-white dark:text-black"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5"
                    }
                  `}
                >
                  <span>{tab.label}</span>

                  {count > 0 && (
                    <span className={`
                      flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold rounded-full
                      ${isSelected
                        ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                        : "bg-gray-200 text-gray-600 dark:bg-[#3f3f46] dark:text-gray-300"
                      }
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <ToggleAllButton
            allEnabled={allEnabled}
            disabled={!activeRoleIsActive}
            isLoading={isTogglingAll}
            onClick={handleToggleAll}
          />

          {!activeRoleIsActive && (
            <span className="flex items-center gap-1.5 text-[12px] font-sfpro-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5" />
              Inactive
            </span>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-[#EAEAEA] dark:border-[#27272a] overflow-hidden bg-white dark:bg-[#09090b]">

        <div className="hidden md:block overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="min-w-160">
            <div className="flex items-center justify-between px-6 py-3 bg-[#fafafa] dark:bg-[#111113] border-b border-[#EAEAEA] dark:border-[#27272a]">
              <div className="flex-1 min-w-0 mr-4">
                <span className="text-[11px] font-sfpro-medium text-gray-400 dark:text-[#52525b] uppercase tracking-wider">
                  Module
                </span>
              </div>
              <div className="grid shrink-0" style={actionGridStyle}>
                {actions.map((action) => (
                  <div key={action} className="flex items-center justify-center mx-0.5">
                    <span className="h-8 w-full flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] text-gray-500 dark:text-[#71717a] text-[11px] md:text-xs font-sfpro-medium rounded-lg capitalize">
                      {ACTION_LABELS[action] ?? action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#EAEAEA] dark:divide-[#27272a]">
              {currentModuleKeys.map((moduleKey) => {
                const enabledActions = permState[moduleKey] || new Set()
                const hasAny = enabledActions.size > 0
                const label = humaniseKey(moduleKey)
                const desc = MODULE_DESCRIPTIONS[moduleKey] ?? ""

                return (
                  <div
                    key={moduleKey}
                    className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#fafafa] dark:hover:bg-[#0d0d0f] ${!activeRoleIsActive ? "opacity-50" : "bg-white dark:bg-[#09090b]"
                      }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                      <div className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${hasAny ? "bg-[#22c55e]" : "bg-gray-300 dark:bg-[#3f3f46]"}`} />
                      <h4 className="text-[15px] font-sfpro-bold text-gray-700 dark:text-[#f4f4f5] whitespace-nowrap shrink-0">
                        {label}
                      </h4>
                      {desc && (
                        <p className="text-[13px] text-gray-400 dark:text-[#71717a] font-sfpro leading-relaxed hidden lg:block truncate">
                          {desc}
                        </p>
                      )}
                    </div>
                    <div className="grid shrink-0" style={actionGridStyle}>
                      {actions.map((action) => (
                        <div key={action} className="flex items-center justify-center mx-0.5">
                          <CustomCheck
                            disabled={!activeRoleIsActive || isTogglingAll}
                            isChecked={enabledActions.has(action)}
                            onClick={() => toggleAction(moduleKey, action)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {currentModuleKeys.length === 0 && (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-gray-400 dark:text-[#71717a]">
                    No modules available for this tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:hidden divide-y divide-[#EAEAEA] dark:divide-[#27272a]">
          {currentModuleKeys.map((moduleKey) => {
            const enabledActions = permState[moduleKey] || new Set()
            const hasAny = enabledActions.size > 0
            const label = humaniseKey(moduleKey)
            const desc = MODULE_DESCRIPTIONS[moduleKey] ?? ""

            return (
              <div
                key={moduleKey}
                className={`px-4 py-4 transition-colors ${!activeRoleIsActive ? "opacity-50" : "bg-white dark:bg-[#09090b]"}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 transition-colors duration-300 ${hasAny ? "bg-[#22c55e]" : "bg-gray-300 dark:bg-[#3f3f46]"}`} />
                  <div className="min-w-0">
                    <h4 className="text-[15px] font-sfpro-bold text-gray-700 dark:text-[#f4f4f5]">
                      {label}
                    </h4>
                    {desc && (
                      <p className="text-[12px] text-gray-400 dark:text-[#71717a] font-sfpro leading-relaxed mt-0.5">
                        {desc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pl-5">
                  {actions.map((action) => {
                    const checked = enabledActions.has(action)
                    return (
                      <button
                        key={action}
                        disabled={!activeRoleIsActive || isTogglingAll}
                        onClick={() => toggleAction(moduleKey, action)}
                        aria-checked={checked}
                        role="checkbox"
                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                          !activeRoleIsActive || isTogglingAll
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer active:scale-95"
                        } ${
                          checked
                            ? "bg-[#DFFDE8] dark:bg-green-950/40 border-[#B3FBCC] dark:border-[#073f1b]"
                            : "bg-[#fafafa] dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a]"
                        }`}
                      >
                        {checked ? (
                          <div className="w-6 h-6 rounded-full bg-white dark:bg-green-950/50 flex items-center justify-center shadow-sm">
                            <Check className="text-[#059E3A] w-4 h-4 stroke-3" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46]" />
                        )}
                        <span className={`text-[10px] font-sfpro-medium capitalize ${
                          checked ? "text-[#059E3A] dark:text-green-400" : "text-gray-500 dark:text-[#71717a]"
                        }`}>
                          {ACTION_LABELS[action] ?? action}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {currentModuleKeys.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400 dark:text-[#71717a]">
                No modules available for this tab.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}