"use client"

import Sidebar from "@/components/layouts/Sidebar"
import Navbar from "@/components/layouts/Navbar"
import NotificationsPanel from "@/components/layouts/NotiicationPanel"
import ProjectSidebar from "@/components/layouts/ProjectSidebar"
import { ProjectSidebarProvider } from "@/components/contexts/ProjectSidebarContext"
import { useProjectSidebar } from "@/components/contexts/ProjectSidebarContext"

function LayoutInner({ children }) {
  const { isInProject } = useProjectSidebar()

  return (
    <div className="font-sfpro flex h-screen w-full bg-white dark:bg-[#09090b] overflow-hidden transition-colors duration-300 fixed inset-0">
      <Sidebar />
      {isInProject && <ProjectSidebar />}
      <div className="flex-1 flex h-full min-w-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white dark:bg-[#09090b] transition-colors duration-300">
          <Navbar />
          <main className="p-1 lg:p-2 flex-1">{children}</main>
        </div>
        <NotificationsPanel />
      </div>
    </div>
  )
}

export default function CompanyLayout({ children }) {
  return (
    <ProjectSidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </ProjectSidebarProvider>
  )
}