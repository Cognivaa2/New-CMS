"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/contexts/SidebarContext"

const ProjectSidebarContext = createContext()

export function ProjectSidebarProvider({ children }) {
    const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true)
    const pathname = usePathname()
    const { closeSidebar, openSidebar } = useSidebar()
    const isInProject = /\/projects\/[^/]/.test(pathname)
    useEffect(() => {
        if (isInProject) {
            closeSidebar()
            setIsProjectSidebarOpen(true)
        }
    }, [isInProject])
    const toggleProjectSidebar = () => setIsProjectSidebarOpen(prev => !prev)
    const closeProjectSidebar = () => setIsProjectSidebarOpen(false)
    return (
        <ProjectSidebarContext.Provider value={{
            isProjectSidebarOpen,
            toggleProjectSidebar,
            closeProjectSidebar,
            isInProject,
        }}>
            {children}
        </ProjectSidebarContext.Provider>
    )
}

export function useProjectSidebar() {
    return useContext(ProjectSidebarContext)
}