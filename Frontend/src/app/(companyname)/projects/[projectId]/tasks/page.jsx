"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
    fetchAllTasksData,
    fetchAllTasksByUser,        
    fetchTaskById,
    fetchProjectUsers,
    editTask,
    deleteTask,
    updateTaskMember,
    formatToastError,
} from "./api"
import TaskHeader from "@/components/projects/(project)/alltasks/TaskHeader"
import TaskGrid from "@/components/projects/(project)/alltasks/TaskGrid"
import TaskPageSkeleton from "./loding"
import EditTaskModal from "@/components/projects/(project)/alltasks/EditTaskModal"
import DeleteModal from "@/components/ui/DeleteModal"

function debounce(fn, delay = 400) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

const ITEMS_PER_PAGE = 20

export default function AllTasksPage() {
    const { projectId } = useParams()
    const [allTasks, setAllTasks] = useState([])
    const [phases, setPhases] = useState([])
    const [projectUsers, setProjectUsers] = useState([])
    const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
    const [pagination, setPagination] = useState({
        total: 0,
        displayed: 0,
        hasMore: false,
    })
    const [filters, setFilters] = useState({
        search: "",
        status: undefined,
        priority: undefined,
        sortBy: "createdAt",
        order: "desc",
        phaseFilter: undefined,
    })
    const [selectedUserKeycloakId, setSelectedUserKeycloakId] = useState(null)

    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isLoadingUsers, setIsLoadingUsers] = useState(false)
    const [isEditLoading, setIsEditLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingTask, setEditingTask] = useState(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [taskToDelete, setTaskToDelete] = useState(null)

    const controllerRef = useRef(null)
    const editFetchRef = useRef(null)
    const usersFetchRef = useRef(null)
    const filtersRef = useRef(filters)
    const selectedUserRef = useRef(null)         
    const isInitialLoadRef = useRef(true)
    const fetchLockRef = useRef(false)
    const sentinelRef = useRef(null)
    const hasMoreRef = useRef(true)

    filtersRef.current = filters
    selectedUserRef.current = selectedUserKeycloakId  

    const debouncedSetSearch = useRef(
        debounce((query) => {
            setFilters((prev) => ({ ...prev, search: query }))
        }, 400)
    ).current

    const projectUsersMap = useMemo(() => {
        const map = new Map()
        projectUsers.forEach((user) => {
            if (user.keycloakId) map.set(user.keycloakId, user)
            if (user.id) map.set(user.id, user)
            if (user._id) map.set(user._id, user)
            if (user.email) map.set(user.email, user)
        })
        return map
    }, [projectUsers])

    const displayedTasks = useMemo(() => {
        return allTasks.slice(0, displayCount)
    }, [allTasks, displayCount])

    const hasMore = displayCount < allTasks.length
    hasMoreRef.current = hasMore

    const uniqueAssignedUsers = useMemo(() => {
        if (!allTasks.length) return []
        const userMap = new Map()
        allTasks.forEach((task) => {
            const assignees = task.assignedTo || task.members || []
            assignees.forEach((user) => {
                const key = user.keycloakId || user.id || user.email
                if (key && !userMap.has(key)) {
                    const enrichedUser = projectUsersMap.get(key)
                    userMap.set(key, {
                        keycloakId: user.keycloakId || enrichedUser?.keycloakId || "",
                        name: enrichedUser?.name || user.name || "Unknown",
                        email: enrichedUser?.email || user.email || "",
                        avatar: enrichedUser?.avatar || user.avatar || null,
                    })
                }
            })
        })
        return Array.from(userMap.values())
    }, [allTasks, projectUsersMap])

    const enrichedTasks = useMemo(() => {
        if (!displayedTasks.length) return displayedTasks
        if (!projectUsers.length) return displayedTasks
        return displayedTasks.map((task) => {
            const taskUsers = task.assignedTo || task.members || []
            const enrichedUsers = taskUsers.map((assignee) => {
                const projectUser =
                    projectUsersMap.get(assignee.keycloakId) ||
                    projectUsersMap.get(assignee.id) ||
                    projectUsersMap.get(assignee._id) ||
                    projectUsersMap.get(assignee.email)
                if (projectUser) {
                    return {
                        ...assignee,
                        avatar: projectUser.avatar || assignee.avatar || null,
                        name: projectUser.name || assignee.name || "Unknown",
                        email: projectUser.email || assignee.email || "",
                    }
                }
                return assignee
            })
            return {
                ...task,
                assignedTo: enrichedUsers,
                members: enrichedUsers,
            }
        })
    }, [displayedTasks, projectUsers, projectUsersMap])

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
            if (err.name !== "CanceledError") console.error("Failed to load project users:", err)
        } finally {
            if (!controller.signal.aborted) setIsLoadingUsers(false)
            if (usersFetchRef.current === controller) usersFetchRef.current = null
        }
    }, [projectId])
    const loadTasks = useCallback(async () => {
    if (!projectId || fetchLockRef.current) return
    fetchLockRef.current = true

    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    const activeUser = selectedUserRef.current
    const activeFilters = filtersRef.current

    try {
        if (!isInitialLoadRef.current) setIsRefreshing(true)
        let fetchedTasks = []
        let fetchedPhases = phases
        if (activeUser) {
            const tasks = await fetchAllTasksByUser(
                projectId,
                activeUser,
                controller.signal
            )

            let mapped = tasks.map((t) => ({
                ...t,
                id: t._id || t.id,
                title: t.taskName || t.title || "",
                taskName: t.taskName || t.title || "",
                progress: t.completionPercent || 0,
                date: t.endDate || "",
                phaseId: t.phaseId?._id || t.phaseId || "",
                phaseName: t.phaseId?.phaseName || "",
                workOrderId: t.workOrderId || null, 
                members: (t.assignedTo || []).map((u) => ({
                    id: u._id || u.id,
                    keycloakId: u.keycloakId || "",
                    name: u.name || "Unknown",
                    email: u.email || "",
                    avatar: u.avatar || null,
                })),
                assignedTo: (t.assignedTo || []).map((u) => ({
                    id: u._id || u.id,
                    keycloakId: u.keycloakId || "",
                    name: u.name || "Unknown",
                    email: u.email || "",
                    avatar: u.avatar || null,
                })),
            }))
            if (activeFilters.phaseFilter) {
                mapped = mapped.filter(
                    (t) => t.phaseId === activeFilters.phaseFilter
                )
            }
            if (activeFilters.search?.trim()) {
                const q = activeFilters.search.trim().toLowerCase()
                mapped = mapped.filter(
                    (t) =>
                        t.taskName?.toLowerCase().includes(q) ||
                        t.description?.toLowerCase().includes(q)
                )
            }
            if (activeFilters.status) {
                mapped = mapped.filter((t) => t.status === activeFilters.status)
            }
            if (activeFilters.priority) {
                mapped = mapped.filter((t) => t.priority === activeFilters.priority)
            }
            const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 }
            mapped.sort((a, b) => {
                let aVal, bVal
                switch (activeFilters.sortBy) {
                    case "taskName":
                    case "title":
                        aVal = a.taskName?.toLowerCase() || ""
                        bVal = b.taskName?.toLowerCase() || ""
                        break
                    case "completionPercent":
                    case "progress":
                        aVal = a.progress || 0
                        bVal = b.progress || 0
                        break
                    case "endDate":
                    case "date":
                        aVal = new Date(a.date || 0).getTime()
                        bVal = new Date(b.date || 0).getTime()
                        break
                    case "priority":
                        aVal = priorityOrder[a.priority] || 0
                        bVal = priorityOrder[b.priority] || 0
                        break
                    case "status":
                        aVal = a.status || ""
                        bVal = b.status || ""
                        break
                    default:
                        aVal = new Date(a.createdAt || 0).getTime()
                        bVal = new Date(b.createdAt || 0).getTime()
                }
                return activeFilters.order === "asc"
                    ? aVal > bVal ? 1 : -1
                    : aVal < bVal ? 1 : -1
            })

            fetchedTasks = mapped

        } else {
            const res = await fetchAllTasksData({
                projectId,
                ...activeFilters,
                signal: controller.signal,
            })
            fetchedTasks = res.tasks
            fetchedPhases = res.phases
            setPhases(fetchedPhases)
        }
        if (controller.signal.aborted) return
        setAllTasks(fetchedTasks)
        setDisplayCount(ITEMS_PER_PAGE)
        setPagination({
            total: fetchedTasks.length,
            displayed: Math.min(ITEMS_PER_PAGE, fetchedTasks.length),
            hasMore: fetchedTasks.length > ITEMS_PER_PAGE,
        })
        hasMoreRef.current = fetchedTasks.length > ITEMS_PER_PAGE
    } catch (err) {
        if (err.name !== "CanceledError") {
            toast.error("Failed to load tasks", { description: formatToastError(err) })
            setAllTasks([])
            setDisplayCount(0)
            setPagination({ total: 0, displayed: 0, hasMore: false })
        }
    } finally {
        isInitialLoadRef.current = false
        setIsInitialLoad(false)
        setIsRefreshing(false)
        fetchLockRef.current = false
        controllerRef.current = null
    }
}, [projectId])

    const loadMoreTasks = useCallback(() => {
        if (isLoadingMore || !hasMoreRef.current || fetchLockRef.current) return
        setIsLoadingMore(true)
        setTimeout(() => {
            setDisplayCount((prev) => {
                const newCount = Math.min(prev + ITEMS_PER_PAGE, allTasks.length)
                setPagination((p) => ({
                    ...p,
                    displayed: newCount,
                    hasMore: newCount < allTasks.length,
                }))
                hasMoreRef.current = newCount < allTasks.length
                return newCount
            })
            setIsLoadingMore(false)
        }, 300)
    }, [isLoadingMore, allTasks.length])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (
                    entry.isIntersecting &&
                    hasMoreRef.current &&
                    !isLoadingMore &&
                    !fetchLockRef.current &&
                    !isRefreshing
                ) {
                    loadMoreTasks()
                }
            },
            { root: null, rootMargin: "100px", threshold: 0 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMoreTasks, isLoadingMore, isRefreshing])

    useEffect(() => {
        loadProjectUsers()
        return () => usersFetchRef.current?.abort()
    }, [loadProjectUsers])
    useEffect(() => {
    hasMoreRef.current = true
    setDisplayCount(ITEMS_PER_PAGE)
    loadTasks()
    return () => controllerRef.current?.abort()
}, [
    filters.search,
    filters.status,
    filters.priority,
    filters.sortBy,
    filters.order,
    filters.phaseFilter,
    loadTasks,
])
    useEffect(() => {
        hasMoreRef.current = true
        setDisplayCount(ITEMS_PER_PAGE)
        loadTasks()
        return () => controllerRef.current?.abort()
    }, [selectedUserKeycloakId, loadTasks])

    useEffect(() => {
        return () => {
            controllerRef.current?.abort()
            editFetchRef.current?.abort()
            usersFetchRef.current?.abort()
        }
    }, [])

    const handleSearch = useCallback(
        (query) => debouncedSetSearch(query),
        [debouncedSetSearch]
    )

    const handleFilterChange = useCallback((selectedFilters) => {
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
        setFilters((prev) => ({ ...prev, ...updates }))
    }, [])

    const handlePhaseChange = useCallback((phaseId) => {
        setFilters((prev) => ({
            ...prev,
            phaseFilter: phaseId === "all" ? undefined : phaseId,
        }))
    }, [])
    const handleUserAvatarClick = useCallback((keycloakId) => {
        setSelectedUserKeycloakId((prev) => (prev === keycloakId ? null : keycloakId))
    }, [])

    const handleEditClick = useCallback((task) => {
        if (!task.phaseId) {
            toast.error("Cannot edit task", { description: "Phase information is missing" })
            return
        }
        editFetchRef.current?.abort()
        const controller = new AbortController()
        editFetchRef.current = controller
        setEditingTask({ ...task })
        setIsEditLoading(true)
        setIsEditOpen(true)
        fetchTaskById(task.phaseId, task.id, controller.signal)
            .then((fullTask) => {
                if (!controller.signal.aborted) {
                    setEditingTask({ ...fullTask, phaseName: task.phaseName })
                }
            })
            .catch((err) => {
                if (err.name !== "CanceledError") {
                    console.error("Failed to fetch task details:", err)
                    toast.error("Warning", { description: "Could not load full task details" })
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsEditLoading(false)
                if (editFetchRef.current === controller) editFetchRef.current = null
            })
    }, [])

    const handleCloseEdit = useCallback(() => {
        editFetchRef.current?.abort()
        editFetchRef.current = null
        setIsEditOpen(false)
        setEditingTask(null)
        setIsEditLoading(false)
    }, [])

    const handleSaveEditedTask = async (formData) => {
        if (!editingTask?.phaseId || !editingTask?.id) return
        try {
            const res = await editTask(editingTask.phaseId, editingTask.id, formData)
            toast.success("Task Updated", {
                description: res.description || "Task has been updated successfully",
            })
            await loadTasks()
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
        if (!taskToDelete) return
        try {
            setIsDeleting(true)
            await deleteTask(taskToDelete.phaseId, taskToDelete.id)
            toast.success("Task Deleted", {
                description: `"${taskToDelete.taskName || taskToDelete.title}" has been deleted successfully`,
            })
            setAllTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id))
            setPagination((prev) => ({
                ...prev,
                total: prev.total - 1,
                displayed: Math.min(prev.displayed, prev.total - 1),
            }))
            setIsDeleteModalOpen(false)
            setTaskToDelete(null)
        } catch (err) {
            toast.error("Delete Failed", { description: formatToastError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleAssignMember = async (task, user) => {
        if (!task.phaseId) {
            toast.error("Cannot assign member", { description: "Phase information is missing" })
            throw new Error("Phase information is missing")
        }
        try {
            const userId = user.keycloakId || user.id
            await updateTaskMember(task.phaseId, task.id, userId, "add")
            toast.success("Member Assigned", {
                description: `${user.name} has been assigned to the task`,
            })
            setAllTasks((prev) =>
                prev.map((t) => {
                    if (t.id === task.id) {
                        const alreadyAssigned = (t.assignedTo || []).some(
                            (a) => (a.keycloakId || a.id) === (user.keycloakId || user.id)
                        )
                        if (!alreadyAssigned) {
                            const newUser = {
                                id: user.id,
                                keycloakId: user.keycloakId || user.id,
                                name: user.name || "Unknown",
                                email: user.email || "",
                                avatar: user.avatar || null,
                            }
                            return {
                                ...t,
                                assignedTo: [...(t.assignedTo || []), newUser],
                                members: [...(t.members || []), newUser],
                            }
                        }
                    }
                    return t
                })
            )
        } catch (err) {
            toast.error("Assignment Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleUnassignMember = async (task, user) => {
        if (!task.phaseId) {
            toast.error("Cannot remove member", { description: "Phase information is missing" })
            throw new Error("Phase information is missing")
        }
        try {
            const userId = user.keycloakId || user.id
            await updateTaskMember(task.phaseId, task.id, userId, "remove")
            toast.success("Member Removed", {
                description: `${user.name} has been removed from the task`,
            })
            setAllTasks((prev) =>
                prev.map((t) => {
                    if (t.id === task.id) {
                        return {
                            ...t,
                            assignedTo: (t.assignedTo || []).filter(
                                (a) => (a.keycloakId || a.id) !== (user.keycloakId || user.id)
                            ),
                            members: (t.members || []).filter(
                                (a) => (a.keycloakId || a.id) !== (user.keycloakId || user.id)
                            ),
                        }
                    }
                    return t
                })
            )
        } catch (err) {
            toast.error("Removal Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleMembersChanged = useCallback(() => {
  loadTasks()
}, [loadTasks])

    if (isInitialLoad) return <TaskPageSkeleton />

    return (
        <div className="w-full  mx-auto py-8 px-4 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300">
            <TaskHeader
                count={displayedTasks.length}
                total={allTasks.length}
                phases={phases}
                selectedPhase={filters.phaseFilter}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onPhaseChange={handlePhaseChange}
                isRefreshing={isRefreshing}
                assignedUsers={uniqueAssignedUsers}
                isLoadingUsers={isLoadingUsers}
                selectedUserKeycloakId={selectedUserKeycloakId}
                onUserAvatarClick={handleUserAvatarClick}
            />
            <TaskGrid
                tasks={enrichedTasks}
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
                {!isLoadingMore && !hasMore && allTasks.length > ITEMS_PER_PAGE && (
                    <p className="text-sm text-gray-400 dark:text-[#52525b] font-sfpro">
                        All {allTasks.length} tasks loaded
                    </p>
                )}
            </div>
            <EditTaskModal
                open={isEditOpen}
                onClose={handleCloseEdit}
                onSave={handleSaveEditedTask}
                task={editingTask}
                isEditLoading={isEditLoading}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                projectId={projectId}
            />
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Task"
                description="This action cannot be undone. This will permanently remove the task from the system."
                itemName={taskToDelete?.taskName || taskToDelete?.title}
                isLoading={isDeleting}
            />
        </div>
    )
}