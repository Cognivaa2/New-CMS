"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Search, Loader2, X, Users } from "lucide-react"
import FilterOptions from "@/components/ui/FilterOptions"
import Tooltip from "@/components/ui/Tooltip"

const ALL_TASK_FILTERS = [
  {
    key: "status",
    label: "Task Status",
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
    label: "Priority Level",
    options: [
      { value: "Critical", label: "Critical" },
      { value: "High", label: "High" },
      { value: "Medium", label: "Medium" },
      { value: "Low", label: "Low" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { value: "createdAt", label: "Created Date" },
      { value: "taskName", label: "Name" },
      { value: "priority", label: "Priority" },
      { value: "status", label: "Status" },
      { value: "endDate", label: "Due Date" },
      { value: "completionPercent", label: "Progress" },
    ],
  },
]

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const BG_COLORS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
]

function colorFor(name = "") {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return BG_COLORS[sum % BG_COLORS.length]
}
function Avatar({ user, size = "md", className = "", isSelected = false, onClick }) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs"
  return (
    <Tooltip content={isSelected ? `${user.name} (filtering)` : user.name} side="bottom">
      <button
        type="button"
        onClick={() => onClick?.(user.keycloakId)}
        className={[
          sizeClass,
          "rounded-full ring-2 overflow-hidden shrink-0 transition-all duration-200 cursor-pointer",
          isSelected
            ? "ring-[#212121] dark:ring-white scale-110"
            : "ring-white dark:ring-[#09090b] hover:scale-105 hover:ring-[#a1a1aa] dark:hover:ring-[#52525b]",
          className,
        ].join(" ")}
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center font-sfpro-bold ${colorFor(user.name)}`}>
            {getInitials(user.name)}
          </div>
        )}
      </button>
    </Tooltip>
  )
}
function MembersModal({ users, isOpen, onClose, triggerRef }) {
  const dropdownRef = useRef(null)
  const [style, setStyle] = useState({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOpen || !triggerRef?.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setStyle({ position: "fixed", top: rect.bottom + 8, left: rect.left, zIndex: 9999, minWidth: "15rem" })
  }, [isOpen, triggerRef])

  useEffect(() => {
    if (!isOpen) return
    const update = () => {
      if (!triggerRef?.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setStyle((s) => ({ ...s, top: rect.bottom + 8, left: rect.left }))
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [isOpen, triggerRef])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target)) return
      if (triggerRef?.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen, onClose, triggerRef])

  if (!mounted) return null

  const modal = (
    <div
      ref={dropdownRef}
      style={style}
      className={`bg-white dark:bg-[#09090b] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-xl p-1.5 transition-all duration-200 origin-top-left
        ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
    >
      <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2 mb-0.5">
        <p className="text-sm font-sfpro-medium text-[#212121] dark:text-white">Assigned Members</p>
        <span className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a]">
          {users.length} {users.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="overflow-y-auto max-h-72 py-0.5" style={{ scrollbarWidth: "thin" }}>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-center px-4">
            <div className="w-10 h-10 rounded-md bg-[#f4f4f5] dark:bg-[#202020] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <div>
              <p className="text-sm font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No members yet</p>
              <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-0.5">
                No users assigned to any task
              </p>
            </div>
          </div>
        ) : (
          users.map((user, index) => (
            <div
              key={user.keycloakId || user.email || index}
              className="flex items-center gap-2.5 mb-1 px-2 py-1.5 rounded-lg hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors duration-150"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-xs font-sfpro-bold ${colorFor(user.name)}`}>
                    {getInitials(user.name)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sfpro-medium text-[#212121] dark:text-[#f4f4f5] truncate leading-tight">{user.name}</p>
                {user.email && (
                  <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] truncate mt-0.5">{user.email}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
const MAX_VISIBLE = 3

function AvatarStack({ users, isLoading, selectedUserKeycloakId, onUserAvatarClick }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)

  if (isLoading) {
    return (
      <div className="flex items-center -space-x-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-[#09090b] bg-[#f4f4f5] dark:bg-[#27272a] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!users || users.length === 0) return null

  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <>
      <div ref={triggerRef} className="flex items-center">
        <div className="flex items-center -space-x-2">
          {visible.map((user, index) => (
            <Avatar
              key={user.keycloakId || user.email || index}
              user={user}
              isSelected={selectedUserKeycloakId === user.keycloakId}
              onClick={onUserAvatarClick}
            />
          ))}
          {overflow > 0 && (
            <Tooltip content={`${overflow} more member${overflow > 1 ? "s" : ""}`} side="bottom">
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-[#09090b] bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] flex items-center justify-center text-[11px] font-sfpro-bold text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#e4e4e7] dark:hover:bg-[#3f3f46] transition-colors duration-150 cursor-pointer"
              >
                +{overflow}
              </button>
            </Tooltip>
          )}
        </div>
        {overflow <= 0 && users.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="ml-1.5 flex items-center justify-center w-6 h-6 rounded-md hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#71717a] transition-colors duration-150 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        )}
        {selectedUserKeycloakId && (
          <Tooltip content="Clear user filter" side="bottom">
            <button
              type="button"
              onClick={() => onUserAvatarClick?.(selectedUserKeycloakId)}
              className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#212121] dark:bg-white text-white dark:text-black text-[11px] font-sfpro-medium transition-colors duration-150 hover:opacity-80 cursor-pointer"
            >
              <span>Filtered</span>
              <X className="w-3 h-3" />
            </button>
          </Tooltip>
        )}
      </div>

      <MembersModal
        users={users}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  )
}

export default function TaskHeader({
  count = 0,
  total = 0,
  phases = [],
  selectedPhase,
  onSearch,
  onFilterChange,
  onPhaseChange,
  isRefreshing = false,
  assignedUsers = [],
  isLoadingUsers = false,
  selectedUserKeycloakId = null,   
  onUserAvatarClick,               
}) {
  const [searchValue, setSearchValue] = useState("")
  const [isPhaseDropdownOpen, setIsPhaseDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsPhaseDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault()
        document.querySelector('input[placeholder*="Search"]')?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleClearSearch = () => {
    setSearchValue("")
    onSearch?.("")
    document.querySelector('input[placeholder*="Search"]')?.focus()
  }

  const handlePhaseSelect = (phaseId) => {
    onPhaseChange?.(phaseId)
    setIsPhaseDropdownOpen(false)
  }

  const selectedPhaseName =
    selectedPhase && phases.length > 0
      ? phases.find((p) => p.id === selectedPhase)?.name || "Phase"
      : "All Phases"

  const showClearButton = searchValue.length > 0

  const displayCount =
    total > 0
      ? count === total
        ? `${total}`
        : `${count}/${total}`
      : count > 0
        ? `${count}`
        : null

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full mb-8 font-sans">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-sfpro-bold leading-none tracking-tight transition-colors break-word">
            <span className="text-[#a3a3a3] dark:text-[#858585]">All Tasks</span>
          </h1>
          {displayCount && (
            <span className="mt-1 flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border dark:border-[#353535] border-[#dfdfdf] text-[#636366] dark:text-[#a1a1aa] text-sm font-sfpro-medium transition-colors duration-300">
              {displayCount}
            </span>
          )}
          {isRefreshing && <Loader2 className="w-4 h-4 text-[#71717a] animate-spin mt-1" />}
        </div>
        <p className="text-[13px] sm:text-[14px] text-[#a3a3a3] dark:text-[#71717a] mt-3 max-w-full sm:max-w-105 lg:max-w-70 leading-snug transition-colors">
          View and manage all tasks across every phase
        </p>
      </div>
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
        <AvatarStack
          users={assignedUsers}
          isLoading={isLoadingUsers}
          selectedUserKeycloakId={selectedUserKeycloakId}
          onUserAvatarClick={onUserAvatarClick}
        />
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center border border-[#e4e4e7] dark:border-[#27272a] rounded-lg overflow-hidden h-10 bg-white dark:bg-[#18181b]">
            <button
              onClick={() => setIsPhaseDropdownOpen(!isPhaseDropdownOpen)}
              className="px-3 text-sm font-medium font-sfpro-bold text-[#18181b] dark:text-[#f4f4f5] hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors h-full flex items-center gap-2"
            >
              {selectedPhaseName}
              <ChevronDown className={`w-4 h-4 text-[#71717a] transition-transform duration-200 ${isPhaseDropdownOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {isPhaseDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => handlePhaseSelect("all")}
                className={`w-full px-3 py-2 text-left text-sm font-sfpro hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors ${
                  !selectedPhase ? "text-[#18181b] dark:text-white font-sfpro-medium" : "text-[#71717a]"
                }`}
              >
                All Phases
              </button>
              {phases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => handlePhaseSelect(phase.id)}
                  className={`w-full px-3 py-2 text-left text-sm font-sfpro hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors ${
                    selectedPhase === phase.id ? "text-[#18181b] dark:text-white font-sfpro-medium" : "text-[#71717a]"
                  }`}
                >
                  {phase.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex items-center w-full sm:w-[320px] lg:w-65">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-[#444444] transition-all duration-300 font-sfpro"
          />
          <div className="absolute right-2.5 flex items-center">
            {showClearButton ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-xs rounded-md w-6 h-6 font-sfpro-medium transition-colors duration-300">
                /
              </div>
            )}
          </div>
        </div>

        {/* ── Filter ── */}
        <div className="shrink-0 flex items-center">
          <FilterOptions
            filters={ALL_TASK_FILTERS}
            align="right"
            onChange={(selectedFilters) => onFilterChange?.(selectedFilters)}
          />
        </div>
      </div>
    </div>
  )
}