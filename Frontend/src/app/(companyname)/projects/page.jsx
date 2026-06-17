"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  fetchProjectsData,
  fetchProjectById,
  addProject,
  editProject,
  deleteProject,
  updateProjectStatus,
  getInitialActiveProject,
  exportProject,
  updateProjectInList,
  removeProjectFromList,
  formatToastError,
  debounce,
  getCurrentUserKeycloakId,
} from "./api"
import ProjectsHeader from "@/components/projects/ProjectsHeader"
import ProjectsGrid from "@/components/projects/ProjectsGrid"
import ProjectsLoading from "./loading"
import AddProjectModal from "@/components/projects/AddProjectModal"
import EditProjectModal from "@/components/projects/EditProjectModal"
import DeleteModal from "@/components/ui/DeleteModal"

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [activeProject, setActiveProject] = useState(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)

  const [filters, setFilters] = useState({
    page: 1, limit: 10, search: "", status: "", sortBy: "createdAt", order: "desc",
  })

  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const isInitialLoadRef = useRef(true)
  const fetchLockRef = useRef(false)
  const controllerRef = useRef(null)
  const editFetchRef = useRef(null)

  const debouncedSetSearch = useRef(
    debounce((query) => {
      setFilters((prev) => ({ ...prev, search: query, page: 1 }))
    }, 400)
  ).current

  const loadProjects = useCallback(async () => {
    if (fetchLockRef.current) return
    fetchLockRef.current = true
    if (controllerRef.current) controllerRef.current.abort()

    const controller = new AbortController()
    controllerRef.current = controller
    const currentFilters = filtersRef.current

    try {
      if (!isInitialLoadRef.current) setIsRefreshing(true)
      const { projects: fetched, pagination: newPag } = await fetchProjectsData({ ...currentFilters, signal: controller.signal })

      if (controller.signal.aborted) return

      setProjects(fetched)
      setPagination(newPag)

      if (isInitialLoadRef.current && fetched.length > 0) {
        setActiveProject(getInitialActiveProject(fetched))
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        toast.error("Failed to load projects", { description: formatToastError(err) })
        setProjects([])
        setActiveProject(null)
      }
    } finally {
      isInitialLoadRef.current = false
      setIsInitialLoad(false)
      setIsRefreshing(false)
      fetchLockRef.current = false
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    loadProjects()
    return () => { if (controllerRef.current) controllerRef.current.abort() }
  }, [filters.search, filters.status, filters.page, loadProjects])

  const handleSearch = useCallback((query) => {
    debouncedSetSearch(query)
  }, [debouncedSetSearch])

  const handleFilter = useCallback((selected) => {
    queueMicrotask(() => {
      const statusArr = selected?.status
      const statusValue = Array.isArray(statusArr) && statusArr.length > 0 ? statusArr[statusArr.length - 1] : ""
      setFilters((prev) => ({ ...prev, status: statusValue, page: 1 }))
    })
  }, [])

  const handleAddProjectClick = () => setIsAddOpen(true)
  const handleCloseAdd = useCallback(() => setIsAddOpen(false), [])

  const handleSaveNewProject = async (formData) => {
    try {
      const createdByKeycloakId = getCurrentUserKeycloakId()
      const payload = {
        ...formData,
        createdBy: createdByKeycloakId,
      }
      const res = await addProject(payload)
      toast.success("Project Created", {
        description: typeof res.description === "string" ? res.description : "Project has been created successfully",
      })
      await loadProjects()
      setIsAddOpen(false)
    } catch (err) {
      toast.error("Create Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleExportProject = async (project) => {
    const toastId = toast.loading("Exporting project data...", {
      description: "Preparing your ZIP file, please wait",
    })
    try {
      const result = await exportProject(
        project._id || project.id,
        project.projectName
      )
      toast.success("Export Successful", {
        id: toastId,
        description: `${result.filename} has been downloaded`,
      })
    } catch (err) {
      if (err.name !== "CanceledError") {
        toast.error("Export Failed", {
          id: toastId,
          description: formatToastError(err),
        })
      }
    }
  }

  const handleEditProjectClick = useCallback((project) => {
    if (editFetchRef.current) editFetchRef.current.abort()
    const controller = new AbortController()
    editFetchRef.current = controller

    const originalProject = { ...project }
    const originalUsers = [...(project.assignedUsers || [])]

    setEditingProject(originalProject)
    setIsEditLoading(true)
    setIsEditOpen(true)

    fetchProjectById(project.id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return
        const fullProject = res.project
        const fetchedUsers = fullProject.assignedUsers || []
        let mergedUsers = []
        if (fetchedUsers.length > 0) {
          mergedUsers = fetchedUsers.map((fetchedUser, index) => {
            const origUser = originalUsers.find(
              (ou) =>
                ou.mongoId === fetchedUser.mongoId ||
                ou.id === fetchedUser.id ||
                ou.keycloakId === fetchedUser.keycloakId
            ) || originalUsers[index] || {}

            return {
              ...origUser,
              ...fetchedUser,
              keycloakId: origUser.keycloakId || origUser.id || fetchedUser.keycloakId || "",
              id: origUser.keycloakId || origUser.id || fetchedUser.id || "",
              name: fetchedUser.name || origUser.name || "",
              email: fetchedUser.email || origUser.email || "",
              avatar: fetchedUser.avatar || origUser.avatar || null,
            }
          })
        } else {
          mergedUsers = [...originalUsers]
        }
        setEditingProject({
          ...fullProject,
          assignedUsers: mergedUsers,
        })
      })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          console.error("Failed to fetch full project details:", err)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsEditLoading(false)
        if (editFetchRef.current === controller) editFetchRef.current = null
      })
  }, [])

  const handleCloseEdit = useCallback(() => {
    if (editFetchRef.current) {
      editFetchRef.current.abort()
      editFetchRef.current = null
    }
    setIsEditOpen(false)
    setEditingProject(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedProject = async (formData) => {
    if (!editingProject) return
    try {
      const res = await editProject(editingProject.id, formData)
      toast.success("Project Updated", {
        description: typeof res.description === "string" ? res.description : "Project has been updated successfully",
      })
      await loadProjects()
      handleCloseEdit()
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleDeleteProject = (project) => {
    setProjectToDelete(project)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    try {
      setIsDeleting(true)
      const res = await deleteProject(projectToDelete.id)
      toast.success("Project Deleted", {
        description: typeof res.description === "string" ? res.description : "Project has been deleted successfully",
      })
      setProjects(removeProjectFromList(projects, projectToDelete.id))
      if (activeProject?.id === projectToDelete.id) {
        setActiveProject(getInitialActiveProject(projects.filter((p) => p.id !== projectToDelete.id)))
      }
      await loadProjects()
      setIsDeleteModalOpen(false)
      setProjectToDelete(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseDeleteModal = () => {
    if (isDeleting) return
    setIsDeleteModalOpen(false)
    setTimeout(() => setProjectToDelete(null), 250)
  }

  const handleToggleProjectStatus = async (project) => {
    try {
      const newStatus = project.status === "completed" ? "planned" : "completed"
      const res = await updateProjectStatus(project.id, newStatus)
      toast.success("Project Status Updated", {
        description: typeof res.description === "string" ? res.description : `Project marked as ${newStatus}`,
      })
      const updatedProject = { ...project, status: newStatus }
      setProjects(updateProjectInList(projects, updatedProject))
      if (activeProject?.id === project.id) setActiveProject(updatedProject)
    } catch (err) {
      toast.error("Status Update Failed", { description: formatToastError(err) })
    }
  }

  if (isInitialLoad) return <ProjectsLoading />

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212]  rounded-lg p-4 transition-colors duration-300">
      <ProjectsHeader
        count={pagination.total}
        description="Manage your company projects — create, update, track progress, and export project data from one place."
        onAction={handleAddProjectClick}
        onSearch={handleSearch}
        onFilter={handleFilter}
      />
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#18181b] border border-dashed border-gray-200 dark:border-[#27272a] rounded-3xl">
          <h3 className="text-lg font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] mb-2">
            No Projects Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mb-6 text-center px-4">
            {filters.search
              ? `No projects matching "${filters.search}"`
              : "Create your first project to get started"}
          </p>
          {!filters.search && (
            <button onClick={handleAddProjectClick}
              className="bg-[#2a2a2a] dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl text-sm font-sfpro-medium hover:opacity-90 transition-opacity">
              Create Project
            </button>
          )}
        </div>
      ) : (
        <ProjectsGrid
          projects={projects}
          activeProject={activeProject}
          onProjectChange={setActiveProject}
          onEdit={handleEditProjectClick}
          onDelete={handleDeleteProject}
          onToggleStatus={handleToggleProjectStatus}
          onMembersChanged={loadProjects}
          onExport={handleExportProject}
        />
      )}
      <AddProjectModal open={isAddOpen} onClose={handleCloseAdd} onSave={handleSaveNewProject} />
      <EditProjectModal open={isEditOpen} onClose={handleCloseEdit} onSave={handleSaveEditedProject} project={editingProject} isEditLoading={isEditLoading} />
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        description="This action cannot be undone. This will permanently remove the project and all its data from the system."
        itemName={projectToDelete?.projectName}
        isLoading={isDeleting}
      />
    </div>
  )
}