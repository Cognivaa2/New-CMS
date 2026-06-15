"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import axios from "axios"
import { useSidebar } from "@/components/contexts/SidebarContext"
import { useProjectSidebar } from "@/components/contexts/ProjectSidebarContext"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"
import Tooltip from "@/components/ui/Tooltip"
import {
  PieChart, Network, Users, Key, FileText, Package,
  AlertTriangle, ClipboardList, ShoppingBag,
  Presentation, CreditCard,
  ShelvingUnit,
  BrickWall, TicketCheck,
  ArrowLeftRight,
  X, FileCheck, Shuffle,
  Building2, ChevronDown,
  Layers, Warehouse, Receipt, Landmark,
  Scale,
} from "lucide-react"

const API_BASE_URL = getBaseUrl()

const menu = [
  {
    section: "Controls",
    items: [
      { label: "Dashboard", icon: PieChart, href: "/dashboard", moduleKey: null },
      { label: "Organization", icon: Network, href: "/organization", moduleKey: "primary-organization" },
      { label: "Roles & Permissions", icon: Key, href: "/roles", moduleKey: "primary-roles" },
      { label: "Users", icon: Users, href: "/users", moduleKey: "primary-users" },
      { label: "Material MasterList", icon: BrickWall, href: "/material-list", moduleKey: "primary-materials" },
      { label: "Vendors", icon: ShelvingUnit, href: "/vendors", moduleKey: "primary-vendors" },
    ]
  },
  {
    section: "Operations",
    items: [
      { label: "Projects", icon: FileText, href: "/projects", moduleKey: "primary-projects" },
      { label: "Inventory", icon: Package, href: "/inventory", moduleKey: "primary-inventory" },
      { label: "Stock Transfers", icon: Shuffle, href: "/stock-transfer", moduleKey: "primary-stock-transfers" },
      { label: "Material Requisitions", icon: BrickWall, href: "/material-requisitions", moduleKey: "primary-materials-requisition" },
      { label: "Purchase Order", icon: ShoppingBag, href: "/purchase-order", moduleKey: "primary-purchase-orders" },
      { label: "GRN", icon: TicketCheck, href: "/grn", moduleKey: "primary-grn" },
      {
        label: "Reconciliation",
        icon: Scale,
        href: "/reconciliation",
        moduleKey: "primary-reconciliation",
        subItems: [
          { label: "Material Reconciliation", href: "/reconciliation?tab=Material", icon: Layers },
          { label: "Inventory Reconciliation", href: "/reconciliation?tab=Inventory", icon: Warehouse },
          { label: "Purchase Reconciliation", href: "/reconciliation?tab=Purchase", icon: Receipt },
          { label: "Financial Reconciliation", href: "/reconciliation?tab=Financial", icon: Landmark },
        ],
      },
      { label: "Work Order", icon: ClipboardList, href: "/work-order", moduleKey: "primary-work-orders" },
      { label: "Issues", icon: AlertTriangle, href: "/issues", moduleKey: "primary-issues" },
    ]
  },
  {
    section: "Finance",
    items: [
      { label: "Finance", icon: Presentation, href: "/finance", moduleKey: "primary-finance" },
      { label: "Payables", icon: CreditCard, href: "/payables", moduleKey: "primary-payables" },
      { label: "Three Way Match", icon: FileCheck, href: "/twm", moduleKey: "primary-three-way-match" },
      { label: "Countra entry", icon: ArrowLeftRight, href: "/contra-entries", moduleKey: "primary-contra-entry" },
    ]
  }
]
const SKELETON_WIDTHS = [72, 88, 64, 96, 80, 68, 92, 76, 84, 60, 78, 90, 66, 82, 70, 86, 74]

async function fetchRolePermissions(roleId, signal = null) {
  if (!roleId) return null
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/role/${roleId}`,
      { headers: getAuthHeaders(), signal }
    )
    if (data.statusCode !== 200 || !data.data) return null
    return data.data
  } catch (error) {
    if (error.name === "CanceledError") throw error
    console.error("Failed to fetch role permissions:", error)
    return null
  }
}

async function fetchCompanyDetails(companyId, signal = null) {
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
function SkeletonItem({ isOpen, inverted, index = 0 }) {
  const width = SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]

  return (
    <div
      className={`flex items-center ${isOpen ? "justify-start px-3 w-full gap-3" : "justify-center"} py-2 rounded-lg mb-0.5 animate-pulse`}
    >
      <div
        className={`w-5 h-5 rounded-md shrink-0 ${inverted
          ? "bg-white/10 dark:bg-black/10"
          : "bg-gray-200 dark:bg-[#27272a]"
          }`}
      />
      <div
        className={`transition-all duration-300 ${isOpen ? "max-w-50 opacity-100" : "max-w-0 opacity-0"}`}
      >
        <div
          className={`h-3.5 rounded-md ${inverted
            ? "bg-white/10 dark:bg-black/10"
            : "bg-gray-200 dark:bg-[#27272a]"
            }`}
          style={{ width: `${width}px` }}
        />
      </div>
    </div>
  )
}

function SkeletonHeader({ isOpen, inverted }) {
  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${isOpen ? "max-h-10 opacity-100 mt-4 mb-2" : "max-h-0 opacity-0 mt-0 mb-0"}`}
    >
      <div className="px-3">
        <div
          className={`h-3 w-16 rounded-md animate-pulse ${inverted
            ? "bg-white/10 dark:bg-black/10"
            : "bg-gray-200 dark:bg-[#27272a]"
            }`}
        />
      </div>
    </div>
  )
}

function SidebarSkeleton({ isOpen, inverted }) {
  const skeletonSections = [
    { items: 6 },
    { items: 9 },
    { items: 2 },
  ]

  let globalIndex = 0

  return (
    <div className="space-y-1">
      {skeletonSections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          <SkeletonHeader isOpen={isOpen} inverted={inverted} />
          {Array.from({ length: section.items }).map((_, itemIndex) => {
            const idx = globalIndex++
            return (
              <SkeletonItem
                key={`${sectionIndex}-${itemIndex}`}
                isOpen={isOpen}
                inverted={inverted}
                index={idx}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function CompanyHeaderSkeleton({ isOpen }) {
  return (
    <div className="px-4 pt-6 pb-2 flex items-start justify-between overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#27272a] animate-pulse shrink-0" />
        <div
          className={`flex flex-col gap-2 transition-all duration-300 overflow-hidden ${isOpen ? "max-w-35 opacity-100" : "max-w-0 opacity-0"}`}
        >
          <div className="h-5 w-24 rounded-md bg-gray-200 dark:bg-[#27272a] animate-pulse" />
          <div className="h-3 w-32 rounded-md bg-gray-200 dark:bg-[#27272a] animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function CompanyHeader({ company, isOpen, closeSidebar }) {
  const [imgError, setImgError] = useState(false)

  const displayName = company?.companyName
    ? company.companyName.split(" ")[0]
    : "Company"

  const fullName = company?.companyName ?? "Company"

  return (
    <div className="px-4 pt-6 pb-2 flex items-start justify-between overflow-hidden cursor-pointer">
      <Tooltip content={fullName} side="right">
        <div className="flex items-center gap-3">
          {company?.logo && !imgError ? (
            <img
              src={company.logo}
              alt={`${fullName} Logo`}
              width={40}
              height={40}
              onError={() => setImgError(true)}
              className="h-12 w-12 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-[#27272a] flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-gray-400 dark:text-[#71717a]" />
            </div>
          )}

          <div
            className={`flex flex-col transition-all duration-300 overflow-hidden ${isOpen ? "max-w-35 opacity-100" : "max-w-0 opacity-0"}`}
          >
            <h2 className="font-sfpro-bold text-2xl text-[#212121] dark:text-[#f4f4f5] truncate">
              {displayName}
            </h2>
            <p className="text-sm text-[#8e8e8e] dark:text-[#a1a1aa] leading-tight truncate lowercase">
              {fullName}
            </p>
          </div>
        </div>
      </Tooltip>

      <button
        onClick={closeSidebar}
        className="md:hidden ml-2 text-[#8e8e8e] dark:text-[#a1a1aa] hover:text-black dark:hover:text-white transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  )
}

export default function Sidebar() {
  const { isOpen, closeSidebar } = useSidebar()
  const { isInProject } = useProjectSidebar()
  const pathname = usePathname()

  const [moduleStatus, setModuleStatus] = useState(null)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)
  const [company, setCompany] = useState(null)
  const [isLoadingCompany, setIsLoadingCompany] = useState(true)
  const searchParams = useSearchParams()
  const [expandedItems, setExpandedItems] = useState({})

  const invertedWhenCollapsed = !isOpen && isInProject

  useEffect(() => {
    if (pathname === "/reconciliation") {
      setExpandedItems((prev) => ({ ...prev, Reconciliation: true }))
    }
  }, [pathname])

  function toggleExpand(label) {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }))
  }

useEffect(() => {
  const controller = new AbortController()

  async function loadPermissions() {
    setIsLoadingPermissions(true)
    try {
      const roleId = localStorage.getItem("roleId")
      const accessToken = localStorage.getItem("accessToken") 

      if (!roleId || !accessToken) {
        setModuleStatus(null)
        setIsLoadingPermissions(false)
        return
      }

      const roleData = await fetchRolePermissions(roleId, controller.signal)
      if (roleData?.moduleStatus) {
        setModuleStatus(roleData.moduleStatus)
      } else {
        setModuleStatus(null)
      }
    } catch (error) {
      if (error.name !== "CanceledError") {
        console.error("Error loading permissions:", error)
        setModuleStatus(null)
      }
    } finally {
      setIsLoadingPermissions(false)
    }
  }

  loadPermissions()
  return () => controller.abort()
}, [])

useEffect(() => {
  const controller = new AbortController()

  async function loadCompany() {
    setIsLoadingCompany(true)
    try {
      const companyId = localStorage.getItem("companyId")
      const accessToken = localStorage.getItem("accessToken") 

      if (!companyId || !accessToken) {
        setCompany(null)
        setIsLoadingCompany(false)
        return
      }

      const companyData = await fetchCompanyDetails(companyId, controller.signal)
      setCompany(companyData ?? null)
    } catch (error) {
      if (error.name !== "CanceledError") {
        console.error("Error loading company:", error)
        setCompany(null)
      }
    } finally {
      setIsLoadingCompany(false)
    }
  }

  loadCompany()
  return () => controller.abort()
}, [])
  const filteredMenu = menu.map(section => {
    const filteredItems = section.items.filter(item => {
      if (item.moduleKey === null) return true
      if (moduleStatus === null) return true
      return moduleStatus[item.moduleKey] === true
    })
    return { ...section, items: filteredItems }
  }).filter(section => section.items.length > 0)

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeSidebar}
      />

      <aside
        className={`fixed md:relative z-50 md:z-auto h-full flex flex-col border-r-2
          transition-all duration-300 ease-in-out shrink-0
          ${isOpen ? "w-65 translate-x-0" : "md:w-18 -translate-x-full md:translate-x-0"}
          ${invertedWhenCollapsed
            ? "bg-[#121212] border-[#27272a] dark:bg-white dark:border-[#e4e4e7]"
            : "bg-white dark:bg-[#121212] border-[#EAEAEA] dark:border-[#27272a]"
          }`}
      >
        {isLoadingCompany ? (
          <CompanyHeaderSkeleton isOpen={isOpen} />
        ) : (
          <CompanyHeader
            company={company}
            isOpen={isOpen}
            closeSidebar={closeSidebar}
          />
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          {isLoadingPermissions ? (
            <SidebarSkeleton isOpen={isOpen} inverted={invertedWhenCollapsed} />
          ) : (
            filteredMenu.map((section) => (
              <div key={section.section}>
                <SidebarSectionHeader label={section.section} isOpen={isOpen} />
                {section.items.map((item) => {
                  const Icon = item.icon
                  const hasSubItems = item.subItems && item.subItems.length > 0
                  const isParentActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/")
                  const isExpanded = expandedItems[item.label] || false
                  const currentTab = searchParams.get("tab")

                  if (hasSubItems) {
                    return (
                      <div key={item.label}>
                        <div onClick={() => toggleExpand(item.label)}>
                          <SidebarItem
                            icon={<Icon size={20} />}
                            label={item.label}
                            active={isParentActive}
                            isOpen={isOpen}
                            inverted={invertedWhenCollapsed}
                            hasChevron
                            isExpanded={isExpanded}
                          />
                        </div>

                        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded && isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
                          {item.subItems.map((sub) => {
                            const SubIcon = sub.icon
                            const subTabParam = new URL(sub.href, "http://x").searchParams.get("tab")
                            const isSubActive =
                              pathname === "/reconciliation" &&
                              currentTab === subTabParam
                            return (
                              <Link
                                key={sub.label}
                                href={sub.href}
                                onClick={() => {
                                  if (window.innerWidth < 768) closeSidebar()
                                }}
                              >
                                <SidebarSubItem
                                  icon={<SubIcon size={16} />}
                                  label={sub.label}
                                  active={isSubActive}
                                  isOpen={isOpen}
                                  inverted={invertedWhenCollapsed}
                                />
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 768) closeSidebar()
                      }}
                    >
                      <SidebarItem
                        icon={<Icon size={20} />}
                        label={item.label}
                        active={active}
                        isOpen={isOpen}
                        inverted={invertedWhenCollapsed}
                      />
                    </Link>
                  )
                })}
              </div>
            ))
          )}
        </nav>
      </aside>
    </>
  )
}

function SidebarSectionHeader({ label, isOpen }) {
  return (
    <div
      className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isOpen ? "max-h-10 opacity-100 mt-4 mb-2" : "max-h-0 opacity-0 mt-0 mb-0"}`}
    >
      <p className="text-[#919191] dark:text-[#71717a] text-sm font-medium px-3">
        {label}
      </p>
    </div>
  )
}

function SidebarItem({ icon, label, active, isOpen, inverted, hasChevron, isExpanded, onClick }) {
  return (
    <Tooltip content={label} side="right">
      <div
        onClick={onClick}
        className={`flex items-center ${isOpen ? "justify-start px-3 w-full gap-3" : "justify-center"
          } py-2 rounded-lg cursor-pointer mb-0.5 transition-colors overflow-hidden
          ${active
            ? "font-sfpro-medium bg-[#f4f4f5] dark:bg-[#27272a] text-black dark:text-[#f4f4f5]"
            : inverted
              ? "text-gray-100 hover:bg-white/10 hover:text-white dark:text-[#212121] dark:hover:bg-black/5 dark:hover:text-[#212121]"
              : "text-[#212121] dark:text-[#a1a1aa] hover:bg-gray-50 dark:hover:bg-white/5 dark:hover:text-[#f4f4f5]"
          }`}
      >
        <div className={`shrink-0 ${active ? "stroke-[2.5px]" : ""}`}>
          {icon}
        </div>
        <span
          className={`whitespace-nowrap text-sm transition-all duration-300 flex-1 ${isOpen ? "max-w-50 opacity-100" : "max-w-0 opacity-0"}`}
        >
          {label}
        </span>
        {hasChevron && isOpen && (
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        )}
      </div>
    </Tooltip>
  )
}

function SidebarSubItem({ icon, label, active, isOpen, inverted }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-colors overflow-hidden
        ${isOpen ? "pl-9 pr-3" : "justify-center px-1"}
        ${active
          ? "font-sfpro-medium bg-[#f4f4f5] dark:bg-[#27272a] text-black dark:text-[#f4f4f5]"
          : inverted
            ? "text-gray-100 hover:bg-white/10 hover:text-white dark:text-[#212121] dark:hover:bg-black/5 dark:hover:text-[#212121]"
            : "text-[#212121] dark:text-[#a1a1aa] hover:bg-gray-50 dark:hover:bg-white/5 dark:hover:text-[#f4f4f5]"
        }`}
    >
      <div className={`shrink-0 ${active ? "stroke-[2.5px]" : ""}`}>
        {icon}
      </div>
      <span
        className={`whitespace-nowrap text-[13px] transition-all duration-300 ${isOpen ? "max-w-50 opacity-100" : "max-w-0 opacity-0"}`}
      >
        {label}
      </span>
    </div>
  )
}