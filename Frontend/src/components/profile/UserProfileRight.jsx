"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import ProjectsTab from "@/components/profile/ProjectsTab"
import ActivitiesTab from "@/components/profile/ActivitiesTab"
import PermissionsTab from "@/components/profile/PermissionsTab"
import { Search } from "lucide-react"
import {
    fetchAssignedProjects,
    fetchRolePermissions,
    fetchRoleSchema,
} from "@/app/(companyname)/profile/[userId]/api.jsx"

const TABS = [
    { key: "projects", label: "Projects" },
    { key: "activities", label: "Activities" },
    { key: "permissions", label: "Permissions" },
]

const TAB_META = {
    projects: {
        title: "Your Assigned Projects",
        subtitle: "All projects you are currently assigned to",
    },
    activities: {
        title: "Your Recent Activities",
        subtitle: "A log of your recent actions in the system",
    },
    permissions: {
        title: "Your Permissions",
        subtitle: "Read-only view of your current role permissions",
    },
}

export default function UserProfileRight({ userId, roleId, activities }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("projects")

    const [projects, setProjects] = useState([])
    const [projectsLoading, setProjectsLoading] = useState(false)
    const [searchInput, setSearchInput] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const sentinelRef = useRef(null)
    const isFetchingRef = useRef(false)
    const hasNextRef = useRef(true)
    const pageRef = useRef(1)
    const debounceTimer = useRef(null)

    const [permissionsData, setPermissionsData] = useState(null)
    const [permissionsLoading, setPermissionsLoading] = useState(false)
    const [permissionsFetched, setPermissionsFetched] = useState(false)
    const [permissionsError, setPermissionsError] = useState(null)

    const handleSearchChange = (e) => {
        const val = e.target.value
        setSearchInput(val)
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => setSearchQuery(val), 400)
    }

    const loadProjects = useCallback(async (page, query) => {
        if (isFetchingRef.current) return
        isFetchingRef.current = true
        setProjectsLoading(true)
        try {
            const { projects: newProjects, pagination } =
                await fetchAssignedProjects(userId, page, 10, query)

            setProjects((prev) => (page === 1 ? newProjects : [...prev, ...newProjects]))
            hasNextRef.current = pagination?.hasNextPage ?? false
            pageRef.current = pagination?.page ?? page
        } finally {
            setProjectsLoading(false)
            isFetchingRef.current = false
        }
    }, [userId])

    useEffect(() => {
        setProjects([])
        hasNextRef.current = true
        pageRef.current = 1
        loadProjects(1, searchQuery)
    }, [loadProjects, searchQuery])

    useEffect(() => {
        if (activeTab !== "projects") return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextRef.current && !isFetchingRef.current) {
                    loadProjects(pageRef.current + 1, searchQuery)
                }
            },
            { threshold: 0.1 }
        )

        if (sentinelRef.current) observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [activeTab, loadProjects, searchQuery])

    useEffect(() => {
        setPermissionsData(null)
        setPermissionsError(null)
        setPermissionsFetched(false)
    }, [roleId])

    useEffect(() => {
        return () => clearTimeout(debounceTimer.current)
    }, [])

    useEffect(() => {
        if (activeTab !== "permissions") return
        if (permissionsFetched) return

        if (!roleId) {
            setPermissionsData(null)
            setPermissionsError("No role assigned to this user.")
            setPermissionsFetched(true)
            return
        }

        setPermissionsLoading(true)
        setPermissionsError(null)

        Promise.all([
            fetchRolePermissions(roleId),
            fetchRoleSchema(),
        ])
            .then(([role, schema]) => {
                const rawPermissions = role?.permissions ?? {}
                const permissions =
                    rawPermissions instanceof Map
                        ? Object.fromEntries(rawPermissions)
                        : rawPermissions

                setPermissionsData({
                    roleName: role?.roleName ?? "Unknown Role",
                    isActive: role?.isActive ?? false,
                    permissions,
                    schema,
                })
            })
            .catch((err) => {
                console.error("Failed to load permissions:", err)
                setPermissionsError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load permissions."
                )
            })
            .finally(() => {
                setPermissionsLoading(false)
                setPermissionsFetched(true)
            })
    }, [activeTab, roleId, permissionsFetched])

    const meta = TAB_META[activeTab]

    return (
        <div className="rounded-3xl p-4 sm:p-6 flex flex-col gap-6 transition-colors duration-300 font-sfpro min-w-0">
            <div className="w-full overflow-x-auto [scrollbar-width:none]">
                <div className="flex items-center gap-1 bg-[#F5F5F5] dark:bg-[#121212] border border-gray-100 dark:border-[#27272a] rounded-xl p-1 transition-colors w-max min-w-fit">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`cursor-pointer px-4 sm:px-5 py-1.5 rounded-lg text-[13px] font-sfpro-medium whitespace-nowrap transition-all duration-200 ${
                                activeTab === tab.key
                                    ? "bg-[#2a2a2a] dark:bg-white text-white dark:text-black"
                                    : "bg-white dark:bg-[#09090b] text-[#212121] dark:text-white hover:text-gray-800 dark:hover:text-[#d4d4d8]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-2">
                <div className="flex flex-col min-w-0">
                    <h3 className="text-xl xl:text-2xl font-sfpro-bold text-[#212121] dark:text-white transition-colors">
                        {meta.title}
                    </h3>
                    <p className="text-xs font-sfpro text-[#919191] dark:text-[#7a7a7a] transition-colors">
                        {meta.subtitle}
                    </p>
                </div>

                {activeTab === "projects" && (
                    <div className="relative flex items-center w-full sm:w-[320px] lg:w-65 xl:w-[320px] shrink-0">
                        <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={handleSearchChange}
                            placeholder="Search anything"
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-xl text-sm text-gray-700 dark:text-[#f4f4f5] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all duration-300 font-sfpro"
                        />
                        <div className="absolute right-2.5 hidden sm:flex items-center justify-center bg-[#f4f4f5] dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-500 dark:text-[#a1a1aa] text-xs rounded-md w-6 h-6 font-sfpro-medium transition-colors duration-300">
                            /
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0" style={{ scrollbarWidth: "none" }}>
                {activeTab === "projects" && (
                    <>
                        <ProjectsTab
                            projects={projects}
                            isLoading={projectsLoading}
                            onRowClick={(projectId) => router.push(`/projects/${projectId}`)}
                        />
                        <div ref={sentinelRef} className="h-1" />
                    </>
                )}

                {activeTab === "activities" && (
                    <ActivitiesTab activities={activities} />
                )}

                {activeTab === "permissions" && (
                    <PermissionsTab
                        permissionsData={permissionsData}
                        isLoading={permissionsLoading}
                        error={permissionsError}
                    />
                )}
            </div>
        </div>
    )
}