"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
    fetchTasksData,
    fetchTasksByUser,
    fetchTaskById,
    fetchProjectUsers,
    fetchPhaseDetails,
    fetchPhaseDates,
    addTask,
    editTask,
    deleteTask,
    updateTaskMember,
    removeTaskFromList,
    formatToastError,
    debounce,
    getCurrentUserKeycloakId,
} from "./api"
import TaskHeader from "@/components/projects/(project)/tasks/TaskHeader"
import TaskGrid from "@/components/projects/(project)/tasks/TaskGrid"
import TasksLoading from "./loading"
import EditTaskModal from "@/components/projects/(project)/tasks/EditTaskModal"
import DeleteModal from "@/components/ui/DeleteModal"

export default function TasksPage() {
    const { projectId, phaseId } = useParams()
    const [tasks, setTasks] = useState([])
    const [phaseName, setPhaseName] = useState("Phase")
    const [projectUsers, setProjectUsers] = useState([])
    const [phaseDates, setPhaseDates] = useState({ startDate: null, endDate: null })
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    })
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        search: "",
        status: undefined,
        priority: undefined,
        sortBy: "createdAt",
        order: "desc",
    })

    const [selectedUserKeycloakId, setSelectedUserKeycloakId] = useState(null)
    const selectedUserRef = useRef(null)

    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isLoadingUsers, setIsLoadingUsers] = useState(false)
    const [isEditLoading, setIsEditLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState(null)
    const [taskToDelete, setTaskToDelete] = useState(null)

    const filtersRef = useRef(filters)
    const isInitialLoadRef = useRef(true)
    const fetchLockRef = useRef(false)
    const controllerRef = useRef(null)
    const editFetchRef = useRef(null)
    const usersFetchRef = useRef(null)
    const phaseFetchRef = useRef(null)
    const phaseDatesRef = useRef(null)
    const sentinelRef = useRef(null)
    const hasMoreRef = useRef(true)

    filtersRef.current = filters
    selectedUserRef.current = selectedUserKeycloakId

    const debouncedSetSearch = useRef(
        debounce((query) => {
            setFilters((prev) => ({ ...prev, search: query, page: 1 }))
        }, 400)
    ).current

    const projectUsersMap = useMemo(() => {
        const map = new Map()
        projectUsers.forEach((user) => {
            if (user.keycloakId) map.set(user.keycloakId, user)
            if (user.id) map.set(user.id, user)
        })
        return map
    }, [projectUsers])

    const enrichedTasks = useMemo(() => {
        if (!projectUsers.length || !tasks.length) return tasks
        return tasks.map((task) => ({
            ...task,
            assignedTo: (task.assignedTo || []).map((assignee) => {
                const projectUser =
                    projectUsersMap.get(assignee.keycloakId) ||
                    projectUsersMap.get(assignee.id)
                if (projectUser) {
                    return {
                        ...assignee,
                        keycloakId: projectUser.keycloakId || assignee.keycloakId,
                        avatar: projectUser.avatar || assignee.avatar,
                        name: projectUser.name || assignee.name,
                        email: projectUser.email || assignee.email,
                    }
                }
                return assignee
            }),
        }))
    }, [tasks, projectUsers, projectUsersMap])

    const loadPhaseDates = useCallback(async () => {
        if (!projectId || !phaseId) return
        if (phaseDatesRef.current) phaseDatesRef.current.abort()
        const controller = new AbortController()
        phaseDatesRef.current = controller
        try {
            const dates = await fetchPhaseDates(projectId, phaseId, controller.signal)
            if (!controller.signal.aborted) setPhaseDates(dates)
        } catch (err) {
            if (err.name !== "CanceledError") console.error("Failed to load phase dates:", err)
        } finally {
            if (phaseDatesRef.current === controller) phaseDatesRef.current = null
        }
    }, [projectId, phaseId])

    const loadPhaseDetails = useCallback(async () => {
        if (!projectId || !phaseId) return
        if (phaseFetchRef.current) phaseFetchRef.current.abort()
        const controller = new AbortController()
        phaseFetchRef.current = controller
        try {
            const phase = await fetchPhaseDetails(projectId, phaseId, controller.signal)
            if (!controller.signal.aborted) setPhaseName(phase.phaseName)
        } catch (err) {
            if (err.name !== "CanceledError") console.error("Failed to load phase details:", err)
        } finally {
            if (phaseFetchRef.current === controller) phaseFetchRef.current = null
        }
    }, [projectId, phaseId])

    const loadProjectUsers = useCallback(async () => {
        if (!projectId) return
        if (usersFetchRef.current) usersFetchRef.current.abort()
        const controller = new AbortController()
        usersFetchRef.current = controller
        setIsLoadingUsers(true)
        try {
            const users = await fetchProjectUsers(projectId, controller.signal)
            if (!controller.signal.aborted) setProjectUsers(users)
        } catch (err) {
            if (err.name !== "CanceledError") {
                console.error("Failed to load project users:", err)
                toast.error("Failed to load team members")
            }
        } finally {
            if (!controller.signal.aborted) setIsLoadingUsers(false)
            if (usersFetchRef.current === controller) usersFetchRef.current = null
        }
    }, [projectId])
    const uniqueAssignedUsers = useMemo(() => {
        if (!tasks.length) return []
        const userMap = new Map()
        tasks.forEach((task) => {
            ; (task.assignedTo || []).forEach((user) => {
                const key = user.keycloakId || user.id || user.email
                if (key && !userMap.has(key)) {
                    const enriched = projectUsersMap.get(user.keycloakId) || projectUsersMap.get(user.id)
                    userMap.set(key, {
                        keycloakId: enriched?.keycloakId || user.keycloakId || "",
                        name: enriched?.name || user.name || "Unknown",
                        email: enriched?.email || user.email || "",
                        avatar: enriched?.avatar || user.avatar || null,
                    })
                }
            })
        })
        return Array.from(userMap.values())
    }, [tasks, projectUsersMap])
    const loadTasks = useCallback(
        async (loadMore = false) => {
            if (!phaseId || fetchLockRef.current) return
            if (loadMore && !hasMoreRef.current) return
            fetchLockRef.current = true
            if (controllerRef.current) controllerRef.current.abort()
            const controller = new AbortController()
            controllerRef.current = controller
            const currentPage = loadMore ? filtersRef.current.page + 1 : 1
            const activeUser = selectedUserRef.current

            try {
                if (loadMore) {
                    setIsLoadingMore(true)
                } else if (!isInitialLoadRef.current) {
                    setIsRefreshing(true)
                }

                const fetchFn = activeUser ? fetchTasksByUser : fetchTasksData
                const fetchArgs = activeUser
                    ? {
                        phaseId,
                        keycloakId: activeUser,
                        ...filtersRef.current,
                        page: currentPage,
                        signal: controller.signal,
                    }
                    : {
                        phaseId,
                        ...filtersRef.current,
                        page: currentPage,
                        signal: controller.signal,
                    }

                const { tasks: fetched, pagination: newPag } = await fetchFn(fetchArgs)

                if (controller.signal.aborted) return

                if (loadMore) {
                    setTasks((prev) => [...prev, ...fetched])
                } else {
                    setTasks(fetched)
                }
                setPagination(newPag)
                setFilters((prev) => ({ ...prev, page: currentPage }))
                hasMoreRef.current = currentPage < newPag.totalPages
            } catch (err) {
                if (err.name !== "CanceledError") {
                    toast.error("Failed to load tasks", { description: formatToastError(err) })
                    if (!loadMore) setTasks([])
                }
            } finally {
                isInitialLoadRef.current = false
                setIsInitialLoad(false)
                setIsRefreshing(false)
                setIsLoadingMore(false)
                fetchLockRef.current = false
                controllerRef.current = null
            }
        },
        [phaseId]
    )
    const loadMoreTasks = useCallback(() => {
        if (!isLoadingMore && hasMoreRef.current && !fetchLockRef.current) {
            loadTasks(true)
        }
    }, [isLoadingMore, loadTasks])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry.isIntersecting && hasMoreRef.current && !isLoadingMore && !fetchLockRef.current) {
                    loadMoreTasks()
                }
            },
            { root: null, rootMargin: "100px", threshold: 0 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMoreTasks, isLoadingMore])

    useEffect(() => { loadPhaseDates(); return () => phaseDatesRef.current?.abort() }, [loadPhaseDates])
    useEffect(() => { loadPhaseDetails(); return () => phaseFetchRef.current?.abort() }, [loadPhaseDetails])
    useEffect(() => { loadProjectUsers(); return () => usersFetchRef.current?.abort() }, [loadProjectUsers])
    useEffect(() => {
        hasMoreRef.current = true
        setFilters((prev) => ({ ...prev, page: 1 }))
        loadTasks(false)
        return () => controllerRef.current?.abort()
    }, [
        filters.search,
        filters.status,
        filters.priority,
        filters.sortBy,
        filters.order,
        selectedUserKeycloakId,
        loadTasks,
    ])

    useEffect(() => {
        return () => {
            controllerRef.current?.abort()
            editFetchRef.current?.abort()
            usersFetchRef.current?.abort()
            phaseFetchRef.current?.abort()
            phaseDatesRef.current?.abort()
        }
    }, [])

    const handleSearch = useCallback((query) => debouncedSetSearch(query), [debouncedSetSearch])

    const handleFilter = useCallback((selectedFilters) => {
        const updates = {}
        if (selectedFilters?.status?.length > 0) {
            updates.status = selectedFilters.status[selectedFilters.status.length - 1]
        } else {
            updates.status = undefined
        }
        if (selectedFilters?.priority?.length > 0) {
            updates.priority = selectedFilters.priority[selectedFilters.priority.length - 1]
        } else {
            updates.priority = undefined
        }
        if (selectedFilters?.sortBy?.length > 0) {
            updates.sortBy = selectedFilters.sortBy[selectedFilters.sortBy.length - 1]
        }
        setFilters((prev) => ({ ...prev, ...updates, page: 1 }))
    }, [])

    const handleUserAvatarClick = useCallback((keycloakId) => {
        setSelectedUserKeycloakId((prev) => (prev === keycloakId ? null : keycloakId))
    }, [])

    const handleOpenAdd = useCallback(() => setIsAddOpen(true), [])
    const handleCloseAdd = useCallback(() => setIsAddOpen(false), [])

    const handleSaveNewTask = async (formData) => {
        if (!phaseId) return
        try {
            const createdByKeycloakId = getCurrentUserKeycloakId()
            const payload = { ...formData, createdBy: createdByKeycloakId }
            const res = await addTask(phaseId, payload)
            toast.success("Task Created", {
                description: res.description || "Task has been created successfully",
            })
            hasMoreRef.current = true
            setFilters((prev) => ({ ...prev, page: 1 }))
            await loadTasks(false)
            setIsAddOpen(false)
        } catch (err) {
            toast.error("Create Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleEditClick = useCallback((task) => {
        if (!phaseId) return
        editFetchRef.current?.abort()
        const controller = new AbortController()
        editFetchRef.current = controller
        setEditingTask({ ...task })
        setIsEditLoading(true)
        setIsEditOpen(true)
        fetchTaskById(phaseId, task.id, controller.signal)
            .then((fullTask) => { if (!controller.signal.aborted) setEditingTask(fullTask) })
            .catch((err) => { if (err.name !== "CanceledError") console.error("Failed to fetch task details:", err) })
            .finally(() => {
                if (!controller.signal.aborted) setIsEditLoading(false)
                if (editFetchRef.current === controller) editFetchRef.current = null
            })
    }, [phaseId])

    const handleCloseEdit = useCallback(() => {
        editFetchRef.current?.abort()
        editFetchRef.current = null
        setIsEditOpen(false)
        setEditingTask(null)
        setIsEditLoading(false)
    }, [])

    const handleSaveEditedTask = async (formData) => {
        if (!phaseId || !editingTask) return
        try {
            const res = await editTask(phaseId, editingTask.id, formData)
            toast.success("Task Updated", {
                description: res.description || "Task has been updated successfully",
            })
            hasMoreRef.current = true
            setFilters((prev) => ({ ...prev, page: 1 }))
            await loadTasks(false)
            handleCloseEdit()
        } catch (err) {
            toast.error("Update Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleDeleteClick = useCallback((task) => {
        setTaskToDelete(task)
        setIsDeleteModalOpen(true)
    }, [])

    const handleCloseDelete = useCallback(() => {
        if (isDeleting) return
        setIsDeleteModalOpen(false)
        setTimeout(() => setTaskToDelete(null), 250)
    }, [isDeleting])

    const handleConfirmDelete = async () => {
        if (!phaseId || !taskToDelete) return
        try {
            setIsDeleting(true)
            const res = await deleteTask(phaseId, taskToDelete.id)
            toast.success("Task Deleted", {
                description: res.description || "Task has been deleted successfully",
            })
            setTasks((prev) => removeTaskFromList(prev, taskToDelete.id))
            setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
            setIsDeleteModalOpen(false)
            setTaskToDelete(null)
        } catch (err) {
            toast.error("Delete Failed", { description: formatToastError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleAssignMember = async (taskId, user) => {
        try {
            const userId = user.keycloakId || user.id
            await updateTaskMember(phaseId, taskId, userId, "add")
            toast.success("Member Assigned", { description: `${user.name} has been assigned to the task` })
            await loadTasks(false)
        } catch (err) {
            toast.error("Assignment Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleUnassignMember = async (taskId, user) => {
        try {
            const userId = user.keycloakId || user.id
            await updateTaskMember(phaseId, taskId, userId, "remove")
            toast.success("Member Removed", { description: `${user.name} has been removed from the task` })
            await loadTasks(false)
        } catch (err) {
            toast.error("Removal Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleMembersChanged = useCallback(async () => {
        await loadTasks(false)
    }, [loadTasks])

    if (isInitialLoad) return <TasksLoading />

    return (
        <div className="w-full  mx-auto py-8 px-4 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300">
            <TaskHeader
                phaseId={phaseId}
                phaseName={phaseName}
                count={enrichedTasks.length}
                total={pagination.total}
                onSearch={handleSearch}
                onFilterChange={handleFilter}
                onAddTask={handleSaveNewTask}
                isAddOpen={isAddOpen}
                onOpenAdd={handleOpenAdd}
                onCloseAdd={handleCloseAdd}
                isRefreshing={isRefreshing}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                phaseDates={phaseDates}
                selectedUserKeycloakId={selectedUserKeycloakId}
                onUserAvatarClick={handleUserAvatarClick}
                assignedUsers={uniqueAssignedUsers}
            />
            <TaskGrid
                tasks={enrichedTasks}
                phaseName={phaseName}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                onAssignMember={handleAssignMember}
                onUnassignMember={handleUnassignMember}
                onMembersChanged={handleMembersChanged}
            />
            <div ref={sentinelRef} className="w-full py-4 flex flex-col items-center justify-center">
                {isLoadingMore && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-sfpro">Loading more tasks...</span>
                    </div>
                )}
            </div>
            <EditTaskModal
                open={isEditOpen}
                onClose={handleCloseEdit}
                onSave={handleSaveEditedTask}
                task={editingTask}
                isEditLoading={isEditLoading}
                phaseStartDate={phaseDates?.startDate}
                phaseEndDate={phaseDates?.endDate}
            />
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Task"
                description="This action cannot be undone. This will permanently remove the task from the system."
                itemName={taskToDelete?.taskName}
                isLoading={isDeleting}
            />
        </div>
    )
}