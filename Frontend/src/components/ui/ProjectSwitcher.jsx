"use client"

import { useState, useEffect, useRef, Activity } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { CircleCheck, FileText } from "lucide-react"
import axios from "axios"
import { getBaseUrl, getAuthHeaders } from "@/lib/apiHelper.js"

const STATUS_COLOR = {
    planned: "text-slate-400",    
    active: "text-green-400",
    on_hold: "text-amber-400",
    completed: "text-blue-400", 
    cancelled: "text-red-400", 
};

function getUserId() {
    if (typeof window === "undefined") return null
    return localStorage.getItem("keycloakId")
}

export default function ProjectSwitcher({ currentProjectId, isOpen, onClose, triggerRef }) {
    const router = useRouter()
    const dropdownRef = useRef(null)
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState({})
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])
    useEffect(() => {
        if (!isOpen || !triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        setDropdownStyle({
            position: "fixed",
            top: rect.top,
            left: rect.right + 8,
            zIndex: 9999,
            minWidth: "16rem",
        })
    }, [isOpen, triggerRef])

    useEffect(() => {
        if (!isOpen) return
        const update = () => {
            if (!triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            setDropdownStyle(s => ({
                ...s,
                top: rect.top,
                left: rect.right + 8,
            }))
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
        const userId = getUserId()
        if (!userId) return
        setLoading(true)
        axios.get(`${getBaseUrl()}/project/list/${userId}`, {
            headers: getAuthHeaders({ includeContentType: false }),
        })
            .then(res => setProjects(res.data?.title?.projects ?? []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const handler = (e) => {
            if (dropdownRef.current?.contains(e.target)) return
            if (triggerRef.current?.contains(e.target)) return
            onClose()
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [isOpen, onClose, triggerRef])

    const handleSwitch = (projectId) => {
        if (projectId === currentProjectId) { onClose(); return }
        onClose()
        router.push(`/projects/${projectId}`)
    }

    const dropdown = (
        <div ref={dropdownRef} style={dropdownStyle} className={` bg-white dark:bg-[#09090b] border border-[#EAEAEA] dark:border-[#252525] rounded-2xl shadow-xl p-1.5 transition-all duration-200 origin-top-left
                ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="px-2.5 pt-1.5 pb-2 mb-0.5">
                <p className="text-sm font-sfpro-medium text-[#212121] dark:text-white">
                    Your Projects
                </p>
            </div>

            <div className="overflow-y-auto max-h-72 py-0.5" style={{ scrollbarWidth: "thin" }}>
                {loading ? (
                    <div className="flex flex-col gap-1 px-1 py-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                                <div className="w-8 h-8 rounded-lg bg-[#f4f4f5] dark:bg-[#27272a] animate-pulse shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-2.5 w-3/4 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] animate-pulse" />
                                    <div className="h-2 w-1/3 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-6 gap-2 text-center">
                        <div className="w-10 h-10 rounded-md bg-[#f4f4f5] dark:bg-[#202020] flex items-center justify-center">
                            <FileText className="w-6 h-6 text-[#a1a1aa]" />
                        </div>
                        <div>
                            <p className="text-sm font-sfpro-medium text-[#3f3f46] dark:text-[#d4d4d8]">No projects yet</p>
                            <p className="text-xs font-sfpro text-[#a1a1aa] dark:text-[#71717a] mt-0.5">No projects assigned yet</p>
                        </div>
                    </div>
                ) : (
                    projects.map((project) => {
                        const isCurrent = project.projectId === currentProjectId
                        return (
                            <button key={project.projectId} type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => handleSwitch(project.projectId)}
                                className={`w-full flex items-center gap-2.5 mb-1 px-2 py-1.5 rounded-lg text-left transition-colors duration-150 cursor-pointer
                                    ${isCurrent ? "bg-[#f4f4f5] dark:bg-[#202020]" : "hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"}`}>
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-[#f4f4f5] dark:bg-[#27272a]">
                                    {project.coverImage ? (
                                        <img src={project.coverImage} alt={project.projectName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-sfpro-bold text-[#a1a1aa]">
                                            {project.projectName?.[0] ?? "P"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate leading-tight ${isCurrent ? "font-sfpro-medium text-[#212121] dark:text-[#f4f4f5]" : "font-sfpro text-[#3f3f46] dark:text-[#d4d4d8]"}`}>
                                        {project.projectName}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className={`text-xs font-sfpro capitalize ${STATUS_COLOR[project.status] ?? "text-[#a1a1aa]"}`}>
                                            {project.status?.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                </div>

                                {isCurrent && (
                                    <CircleCheck
                                        className="w-5 h-5 shrink-0 text-[#212121] dark:text-[#f4f4f5]"
                                        strokeWidth={2}
                                    />
                                )}
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )

    if (!mounted) return null
    return createPortal(dropdown, document.body)
}