"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useProjectSidebar } from "@/components/contexts/ProjectSidebarContext"
import { useState, useEffect, useRef, useMemo } from "react"
import {
    LayoutDashboard, Layers, CheckSquare, FileText,
    FolderOpen, ShieldCheck, Package, AlertTriangle,
    MessageSquare, X, Shuffle, BarChart3, Wrench,
    ClipboardList, ShoppingCart, ClipboardCheck, TrendingDown,
    Wallet, HandCoins, FileCheck,
} from "lucide-react"
import axios from "axios"
import { getBaseUrl, getAuthHeaders } from "@/lib/apiHelper.js"
import Tooltip from "@/components/ui/Tooltip"
import ProjectSwitcher from "@/components/ui/ProjectSwitcher"
const API_BASE_URL = getBaseUrl()

const projectMenu = [
    { label: "Dashboard", icon: LayoutDashboard, href: "", moduleKey: null },

    { label: "Phases", icon: Layers, href: "/phases", moduleKey: "project-phases" },
    { label: "Tasks", icon: CheckSquare, href: "/tasks", moduleKey: "project-tasks" },
    { label: "DPR Report", icon: FileText, href: "/dpr", moduleKey: "project-dpr" },
    { label: "Inventory", icon: Package, href: "/inventory", moduleKey: "project-inventory" },
    { label: "Stock Transfer", icon: Shuffle, href: "/stock_transfer", moduleKey: "project-stock-transfers" },
    { label: "Material Requisitions", icon: ClipboardList, href: "/material_requisition", moduleKey: "project-material-requisitions" },
    { label: "Purchase Orders", icon: ShoppingCart, href: "/purchase-order", moduleKey: "project-purchase-orders" },
    { label: "GRN", icon: ClipboardCheck, href: "/grn", moduleKey: "project-grn" },
    { label: "Work Orders", icon: Wrench, href: "/work-order", moduleKey: "project-work-orders" },
    { label: "Expenses", icon: Wallet, href: "/expenses", moduleKey: "project-expense" },
    { label: "Payables", icon: HandCoins, href: "/payables", moduleKey: "project-payables" },
    { label: "Three Way Match", icon: FileCheck, href: "/twm", moduleKey: "project-three-way-match"},
    { label: "Issues", icon: AlertTriangle, href: "/issues", moduleKey: "project-issues" },
    { label: "Documents", icon: FolderOpen, href: "/documents", moduleKey: "project-documents" },
    //   { label: "Roles", icon: ShieldCheck, href: "/roles", moduleKey: "project-roles" },
    { label: "Consumption", icon: TrendingDown, href: "/Consumption", moduleKey: "project-consumption" },
    { label: "Gantt", icon: BarChart3, href: "/gantt", moduleKey: "project-gantt" },
    { label: "Chat", icon: MessageSquare, href: "/chat", moduleKey: "project-chat" },
]
async function fetchRolePermissions(roleId, signal = null) {
    if (!roleId) return null
    try {
        const { data } = await axios.get(
            `${API_BASE_URL}/role/${roleId}`,
            { headers: getAuthHeaders(), signal }
        )
        if (data.statusCode !== 200 || !data.data) {
            return null
        }
        return data.data
    } catch (error) {
        if (error.name === "CanceledError") throw error
        console.error("Failed to fetch role permissions:", error)
        return null
    }
}

function SkeletonItem({ isOpen }) {
    return (
        <div
            className={`flex items-center py-2 rounded-lg animate-pulse ${isOpen ? "justify-start px-3 gap-3" : "justify-center"
                }`}
        >
            <div className="w-4.5 h-4.5 rounded-md shrink-0 bg-gray-200 dark:bg-[#27272a]" />
            <div
                className={`transition-all duration-300 ${isOpen ? "max-w-50 opacity-100" : "max-w-0 opacity-0"
                    }`}
            >
                <div
                    className="h-3 rounded-md bg-gray-200 dark:bg-[#27272a]"
                    style={{ width: `${Math.floor(Math.random() * 30) + 50}px` }}
                />
            </div>
        </div>
    )
}
function ProjectSidebarSkeleton({ isOpen }) {
    const itemCount = 9
    return (
        <div className="space-y-0.5">
            {Array.from({ length: itemCount }).map((_, index) => (
                <SkeletonItem key={index} isOpen={isOpen} />
            ))}
        </div>
    )
}
function ProjectHeaderSkeleton({ isOpen }) {
    return (
        <div
            className={`rounded-xl flex items-center transition-all duration-300 ${isOpen ? "justify-between" : "justify-center"
                }`}
        >
            <div
                className={`flex items-center gap-2 transition-all duration-300 overflow-hidden animate-pulse ${isOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0 pointer-events-none"
                    }`}
            >
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg shrink-0 bg-gray-200 dark:bg-[#27272a]" />
                <div className="min-w-0">
                    <div className="h-3.5 w-20 rounded-md bg-gray-200 dark:bg-[#27272a]" />
                </div>
            </div>
            <div className="flex items-center shrink-0">
                <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-[#27272a] animate-pulse" />
            </div>
        </div>
    )
}
export default function ProjectSidebar() {
    const { isProjectSidebarOpen, closeProjectSidebar } = useProjectSidebar()
    const params = useParams()
    const pathname = usePathname()
    const projectId = params?.projectId
    const basePath = `/projects/${projectId}`
    const [projectName, setProjectName] = useState("")
    const [projectCover, setProjectCover] = useState(null)
    const [nameLoading, setNameLoading] = useState(true)
    const [switcherOpen, setSwitcherOpen] = useState(false)
    const [moduleStatus, setModuleStatus] = useState(null)
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)
    const switcherTriggerRef = useRef(null)
    useEffect(() => {
        const controller = new AbortController()
        async function loadPermissions() {
            setIsLoadingPermissions(true)
            try {
                const roleId = localStorage.getItem("roleId")
                if (!roleId) {
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
    const filteredMenu = useMemo(() => {
        return projectMenu.filter(item => {
            if (item.moduleKey === null) return true
            if (moduleStatus === null) return true
            return moduleStatus[item.moduleKey] === true
        })
    }, [moduleStatus])
    useEffect(() => {
        if (!projectId) return
        setNameLoading(true)
        setProjectName("")
        setProjectCover(null)
        axios.get(`${getBaseUrl()}/project/${projectId}`, {
            headers: getAuthHeaders({ includeContentType: false }),
        })
            .then(res => {
                const p = res.data?.data?.project
                if (p) {
                    setProjectName(p.projectName ?? "")
                    setProjectCover(p.coverImage ?? null)
                }
            })
            .catch(console.error)
            .finally(() => setNameLoading(false))
    }, [projectId])
    useEffect(() => { setSwitcherOpen(false) }, [pathname])
    const isLoading = nameLoading || isLoadingPermissions
    return (
        <>
            <div
                className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 ${isProjectSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={closeProjectSidebar}
            />
            <aside
                className={`fixed pt-6 md:relative z-50 md:z-auto h-full bg-white dark:bg-[#121212] border-r-2 border-[#EAEAEA] dark:border-[#27272a] flex flex-col transition-all duration-300 ease-in-out shrink-0 ${isProjectSidebarOpen ? "w-52 translate-x-0" : "md:w-18 -translate-x-full md:translate-x-0"
                    }`}
            >
                <div className={`pt-5 pb-3 overflow-hidden transition-all duration-300 ${isProjectSidebarOpen ? "px-4" : "px-0"
                    }`}>
                    {nameLoading ? (
                        <ProjectHeaderSkeleton isOpen={isProjectSidebarOpen} />
                    ) : (
                        <div className={`rounded-xl flex items-center transition-all duration-300 ${isProjectSidebarOpen ? "justify-between" : "justify-center"
                            }`}>
                            <div className={`flex items-center gap-2 transition-all duration-300 overflow-hidden ${isProjectSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0 pointer-events-none"
                                }`}>
                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg overflow-hidden shrink-0 bg-[#f4f4f5] dark:bg-[#27272a]">
                                    {projectCover ? (
                                        <img src={projectCover} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-sfpro-bold text-[#a1a1aa]">
                                            {projectName?.[0] ?? "P"}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-sfpro-bold text-sm text-[#212121] dark:text-[#f4f4f5] max-w-27 truncate">
                                        {projectName}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center shrink-0" ref={switcherTriggerRef}>
                                <Tooltip content="Switch Projects" side={isProjectSidebarOpen ? "bottom" : "right"}>
                                    <button
                                        onClick={() => setSwitcherOpen(o => !o)}
                                        className={`cursor-pointer transition-colors rounded-lg p-1 ${switcherOpen
                                            ? "text-black dark:text-white bg-[#f4f4f5] dark:bg-[#27272a]"
                                            : "text-[#212121] dark:text-white hover:text-black dark:hover:text-white"
                                            }`}
                                    >
                                        <Shuffle size={15} strokeWidth={2} className="-rotate-90" />
                                    </button>
                                </Tooltip>
                                <ProjectSwitcher
                                    currentProjectId={projectId}
                                    isOpen={switcherOpen}
                                    onClose={() => setSwitcherOpen(false)}
                                    triggerRef={switcherTriggerRef}
                                />
                            </div>
                            <button
                                onClick={closeProjectSidebar}
                                className="md:hidden text-[#8e8e8e] dark:text-[#71717a] hover:text-black dark:hover:text-white transition-colors ml-1"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-0.5">
                    {isLoadingPermissions ? (
                        <ProjectSidebarSkeleton isOpen={isProjectSidebarOpen} />
                    ) : (
                        filteredMenu.map((item) => {
                            const Icon = item.icon
                            const href = `${basePath}${item.href}`
                            const active = item.href === "" ? pathname === basePath : pathname.startsWith(href)
                            return (
                                <Tooltip key={item.label} content={item.label} side="right">
                                    <Link
                                        href={href}
                                        onClick={() => {
                                            if (window.innerWidth < 768) closeProjectSidebar()
                                        }}
                                    >
                                        <div
                                            className={`flex items-center py-2 rounded-lg cursor-pointer transition-colors overflow-hidden ${isProjectSidebarOpen ? "justify-start px-3 gap-3" : "justify-center"
                                                } ${active
                                                    ? "bg-[#f4f4f5] dark:bg-[#27272a] text-black dark:text-[#f4f4f5] font-sfpro-medium"
                                                    : "text-[#444444] dark:text-[#a1a1aa] hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-[#f4f4f5]"
                                                }`}
                                        >
                                            <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                                            <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isProjectSidebarOpen ? "max-w-50 opacity-100" : "max-w-0 opacity-0"
                                                }`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    </Link>
                                </Tooltip>
                            )
                        })
                    )}
                </nav>
            </aside>
        </>
    )
}
