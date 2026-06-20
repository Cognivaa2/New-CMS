"use client"
import React, { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import axios from "axios"
import {
  PanelLeftClose,
  Sun,
  ChevronLeft,
  MoonStar,
  Bell,
  LogOut,
  User,
  Building2,
  CircleHelp,
} from "lucide-react"
import { useSidebar } from "@/components/contexts/SidebarContext"
import { useProjectSidebar } from "@/components/contexts/ProjectSidebarContext"
import { useNotification } from "@/components/contexts/NotificationContext"
import Tooltip from "@/components/ui/Tooltip"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { getRefreshToken } from "@/lib/auth"
import { logoutUserApi } from "@/app/(auth)/login/api.jsx"
import { useAuth } from "@/components/contexts/AuthContext"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"
import HelpdeskModal from "./HelpdeskModal" 

const API_BASE_URL = getBaseUrl()

const isId = (segment) => {
  if (!segment) return false
  return (
    /^[0-9a-fA-F]{24}$/.test(segment) ||
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(segment) ||
    (/^[0-9a-zA-Z_-]{16,}$/.test(segment) && /\d/.test(segment))
  )
}

const toTitle = (str) =>
  str
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

const ID_PAGE_LABELS = {
  projects: "Dashboard",
  phases: "Phase",
  tasks: "Task",
  subtasks: "Subtask",
  subtask: "Subtask",
  issues: "Issue",
  dpr: "DPR",
  grn: "GRN",
  documents: "Document",
  expenses: "Expense",
  payables: "Payable",
  inventory: "Inventory Item",
  roles: "Role",
  consumption: "Consumption",
  "purchase-order": "Purchase Order",
  "work-order": "Work Order",
  material_requisition: "Material Requisition",
  stock_transfer: "Stock Transfer",
  profile: "Profile",
}

async function fetchCompanyDetails(companyId, signal) {
  if (!companyId) return null
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/company/lookup/${companyId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 || !data.data) return null
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    console.error("Failed to fetch company details:", error)
    return null
  }
}

function useOutsideClick(ref, cb) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, cb])
}

function UserAvatar({ avatar, size = 28, className = "" }) {
  const [imgError, setImgError] = useState(false)
  const showAvatar = avatar && !imgError

  if (showAvatar) {
    return (
      <img
        src={avatar}
        alt="User"
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  const fontSize = size <= 24 ? 10 : size <= 32 ? 12 : 14
  return (
    <div
      className={`rounded-full bg-[#f4f4f5] dark:bg-[#27272a] flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="font-sfpro-medium text-[#3f3f46] dark:text-[#a1a1aa] leading-none"
        style={{ fontSize }}
      >
        U
      </span>
    </div>
  )
}

function CompanyLogo({ company }) {
  const [imgError, setImgError] = useState(false)

  if (company?.logo && !imgError) {
    return (
      <img
        src={company.logo}
        alt={company.companyName ?? "Company Logo"}
        width={36}
        height={36}
        onError={() => setImgError(true)}
        className="h-9 w-9 rounded-full object-cover shrink-0"
      />
    )
  }

  return (
    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-[#27272a] flex items-center justify-center shrink-0">
      <Building2 size={18} className="text-gray-400 dark:text-[#71717a]" />
    </div>
  )
}

function ProfileMenu({ userId, avatar }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: null, right: null })
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const { onLogout } = useAuth()

  useOutsideClick(wrapRef, () => closeMenu())

  useEffect(() => {
    if (open) setVisible(true)
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    setTimeout(() => setVisible(false), 150)
  }

  const POPOVER_WIDTH = 160
  const POPOVER_HEIGHT = 90

  const openMenu = () => {
    if (open) { closeMenu(); return }

    const rect = btnRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const showAbove = spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow

    const topVal = showAbove
      ? rect.top + window.scrollY - POPOVER_HEIGHT - 4
      : rect.bottom + window.scrollY + 4

    const spaceRight = window.innerWidth - rect.right
    let leftVal = null
    let rightVal = null

    if (spaceRight >= POPOVER_WIDTH) {
      leftVal = rect.left + window.scrollX
    } else {
      rightVal = window.innerWidth - rect.right - window.scrollX
    }

    setPos({ top: topVal, left: leftVal, right: rightVal })
    setOpen(true)
  }

  const handleLogout = async () => {
    setLoading(true)
    closeMenu()
    const refreshToken = getRefreshToken()
    try {
      await logoutUserApi(refreshToken)
    } catch {}
    finally {
      onLogout()
      toast.success("Logged out", {
        description: "You have been successfully logged out.",
      })
      router.push("/login")
      setLoading(false)
    }
  }

  const items = [
    {
      label: "Profile",
      icon: <User className="w-4 h-4" />,
      onClick: () => { if (userId) router.push(`/profile/${userId}`) },
    },
    {
      label: loading ? "Logging out..." : "Logout",
      icon: <LogOut className="w-4 h-4" />,
      variant: "danger",
      disabled: loading,
      onClick: handleLogout,
    },
  ]

  return (
    <div
      ref={wrapRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        className="flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
      >
        <UserAvatar avatar={avatar} size={28} />
      </button>

      {visible && (
        <div
          style={{
            position: "fixed",
            top: pos.top,
            ...(pos.left !== null ? { left: pos.left } : {}),
            ...(pos.right !== null ? { right: pos.right } : {}),
          }}
          className={`z-99999 p-1 bg-white dark:bg-[#121212] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-lg overflow-hidden min-w-40 w-max transition-all duration-150 origin-top ${
            open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { if (!item.disabled) item.onClick?.() }}
              disabled={item.disabled}
              className={`rounded-md w-full flex items-center gap-2.5 px-3 py-2 text-sm font-sfpro text-left transition-colors duration-150
                ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${item.variant === "danger"
                  ? "text-[#ef4444] hover:bg-[#fff1f1] dark:hover:bg-[#2e1a1a]"
                  : "text-[#3f3f46] dark:text-white hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"
                }`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { toggleSidebar } = useSidebar()
  const { toggleProjectSidebar, isInProject } = useProjectSidebar()
  const { toggleNotification, hasNewNotification } = useNotification()
  const { authState } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [company, setCompany] = useState(null)
  const [helpdeskOpen, setHelpdeskOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function loadCompany() {
      try {
        const companyId = localStorage.getItem("companyId")
        if (!companyId) return
        const data = await fetchCompanyDetails(companyId, controller.signal)
        setCompany(data ?? null)
      } catch (error) {
        if (error.name !== "CanceledError") console.error(error)
      }
    }
    loadCompany()
    return () => controller.abort()
  }, [])

  const userId = authState.userId
  const avatar = authState.avatar

  const getCurrentPageName = () => {
    if (pathname === "/" || pathname === "") return "Dashboard"
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return "Dashboard"
    const last = segments[segments.length - 1]
    if (segments[0] === "projects" && segments.length === 2) return "Dashboard"
    const phasesIdx = segments.indexOf("phases")
    if (phasesIdx !== -1) {
      const afterPhases = segments.length - phasesIdx - 1
      if (afterPhases === 0) return "Phases"
      if (afterPhases === 1) return "Task"
      if (afterPhases === 2) return "Subtask"
    }
    if (isId(last)) {
      let i = segments.length - 2
      while (i >= 0 && isId(segments[i])) i--
      const parent = segments[i]
      return ID_PAGE_LABELS[parent] || toTitle(parent || "")
    }
    return toTitle(last)
  }

  const currentPageName = getCurrentPageName()
  const isHome = pathname === "/" || pathname === ""

  const handleToggle = () => {
    if (isInProject) toggleProjectSidebar()
    else toggleSidebar()
  }

  return (
    <>
      <div className="sticky top-0 z-30 w-full h-16 md:h-18 bg-white dark:bg-[#121212] border-b-2 border-[#EAEAEA] dark:border-[#27272a] flex items-center justify-between px-4 md:px-8 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggle}
            className="hidden md:flex text-[#212121] dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors items-center justify-center"
          >
            <Tooltip
              content={isInProject ? "Collapse Project Menu" : "Collapse Sidebar"}
              side="right"
            >
              <PanelLeftClose size={22} strokeWidth={2} className="cursor-pointer" />
            </Tooltip>
          </button>

          {!isHome && (
            <button
              onClick={() => router.back()}
              className="md:hidden flex text-[#000000] dark:text-[#ffffff] hover:text-gray-600 dark:hover:text-gray-300 transition-colors items-center justify-center cursor-pointer bg-transparent p-1 border border-[#dfdfdf] dark:border-[#313131] rounded-md"
              aria-label="Go back"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          )}

          <button
            onClick={handleToggle}
            className="md:hidden flex items-center justify-center"
            aria-label="Open menu"
          >
            <CompanyLogo company={company} />
          </button>

          {!isHome && (
            <Tooltip content="Go Back" side="bottom">
              <button
                onClick={() => router.back()}
                className="hidden md:flex text-[#000000] dark:text-[#ffffff] hover:text-gray-600 dark:hover:text-gray-300 transition-colors items-center justify-center cursor-pointer bg-transparent p-1 border border-[#dfdfdf] dark:border-[#313131] rounded-md text-sm"
                aria-label="Go back"
              >
                <ChevronLeft size={18} strokeWidth={2} />
                Back
              </button>
            </Tooltip>
          )}
          <Tooltip content="Help & Support" side="bottom">
            <button
              onClick={() => setHelpdeskOpen(true)}
              className="hidden md:flex text-[#000000] dark:text-[#ffffff] hover:text-gray-600 dark:hover:text-gray-300 transition-colors items-center justify-center cursor-pointer bg-transparent p-1 border border-[#dfdfdf] dark:border-[#313131] rounded-md text-sm"
              aria-label="Help & Support"
            >
              <CircleHelp size={18} strokeWidth={2} />
              Help
            </button>
          </Tooltip>

          <button
            onClick={() => setHelpdeskOpen(true)}
            className="md:hidden flex text-[#000000] dark:text-[#ffffff] hover:text-gray-600 dark:hover:text-gray-300 transition-colors items-center justify-center cursor-pointer bg-transparent p-1 border border-[#dfdfdf] dark:border-[#313131] rounded-md"
            aria-label="Help & Support"
          >
            <CircleHelp size={16} strokeWidth={2} />
          </button>

          <span className="md:hidden font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] text-[15px] tracking-wide transition-colors">
            {currentPageName}
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-5 text-[#212121] dark:text-gray-400">
          <Tooltip content="Toggle Theme" side="bottom">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="dark:hover:text-white transition-colors flex items-center justify-center w-5 h-5 cursor-pointer"
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <Sun size={20} strokeWidth={2} />
                ) : (
                  <MoonStar size={20} strokeWidth={2} />
                )
              ) : (
                <div className="w-5 h-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="Your Profile" side="bottom">
            <ProfileMenu userId={userId} avatar={avatar} />
          </Tooltip>

          <Tooltip content="Notification Panel" side="left">
            <button
              onClick={toggleNotification}
              className="relative hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="md:hidden relative flex items-center justify-center">
                <Bell size={20} strokeWidth={2} />
                {hasNewNotification && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22c55e]" />
                )}
              </span>
              <span className="hidden md:inline-flex relative items-center justify-center">
                <Bell size={22} strokeWidth={2} />
                {hasNewNotification && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22c55e]" />
                )}
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      <HelpdeskModal
        isOpen={helpdeskOpen}
        onClose={() => setHelpdeskOpen(false)}
      />
    </>
  )
}