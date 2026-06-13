"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
    fetchSubTasksData,
    fetchSubTasksByUser,
    fetchSubTaskById,
    fetchTaskDetails,
    fetchPhaseDetails,
    fetchProjectUsers,
    addSubTask,
    editSubTask,
    deleteSubTask,
    assignSubTaskMember,
    unassignSubTaskMember,
    updateSubTaskProgress,
    removeSubTaskFromList,
    formatToastError,
    debounce,
    getCurrentUserKeycloakId,
    fetchTaskDates,
    fetchInventoryLookup,
    recordMaterialConsumption,
} from "./api"
import SubTasksHeader from "@/components/projects/(project)/subTasks/SubTasksHeader"
import SubTasksTable from "@/components/projects/(project)/subTasks/SubTasksTable"
import SubTasksLoading from "./loading"
import EditSubTaskModal from "@/components/projects/(project)/subTasks/EditSubTaskModal"
import DeleteModal from "@/components/ui/DeleteModal"
import UpdateProgressModal from "@/components/projects/(project)/subTasks/UpdateProgressModal"

export default function SubTasksPage() {
    const { projectId, phaseId, taskId } = useParams()
    const [subTasks, setSubTasks] = useState([])
    const [taskName, setTaskName] = useState("Task")
    const [phaseName, setPhaseName] = useState("Phase")
    const [projectUsers, setProjectUsers] = useState([])
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
    const [filters, setFilters] = useState({ page: 1, limit: 50, search: "", status: undefined, sortBy: "createdAt", order: "desc" })
    const [selectedUserKeycloakId, setSelectedUserKeycloakId] = useState(null)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isLoadingUsers, setIsLoadingUsers] = useState(false)
    const [isEditLoading, setIsEditLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingSubTask, setEditingSubTask] = useState(null)
    const [subTaskToDelete, setSubTaskToDelete] = useState(null)
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
    const [progressSubTask, setProgressSubTask] = useState(null)
    const [isProgressUpdating, setIsProgressUpdating] = useState(false)
    const [taskDates, setTaskDates] = useState({ startDate: null, endDate: null })

    const [inventoryList, setInventoryList] = useState([])
    const [isLoadingInventory, setIsLoadingInventory] = useState(false)
    const inventoryFetchRef = useRef(null)
    const selectedUserRef = useRef(null)
    const filtersRef = useRef(filters)
    const isInitialLoadRef = useRef(true)
    const fetchLockRef = useRef(false)
    const controllerRef = useRef(null)
    const editFetchRef = useRef(null)
    const usersFetchRef = useRef(null)
    const taskFetchRef = useRef(null)
    const phaseFetchRef = useRef(null)
    const sentinelRef = useRef(null)
    const hasMoreRef = useRef(true)
    const taskDatesRef = useRef(null)

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

    const enrichedSubTasks = useMemo(() => {
        if (!projectUsers.length || !subTasks.length) return subTasks
        return subTasks.map((subTask) => ({
            ...subTask,
            assignedTo: (subTask.assignedTo || []).map((assignee) => {
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
    }, [subTasks, projectUsers, projectUsersMap])
    const loadTaskDetails = useCallback(async () => {
        if (!phaseId || !taskId) return
        if (taskFetchRef.current) taskFetchRef.current.abort()
        const controller = new AbortController()
        taskFetchRef.current = controller
        try {
            const task = await fetchTaskDetails(phaseId, taskId, controller.signal)
            if (!controller.signal.aborted) setTaskName(task.taskName)
        } catch (err) {
            if (err.name !== "CanceledError") console.error("Failed to load task details:", err)
        } finally {
            if (taskFetchRef.current === controller) taskFetchRef.current = null
        }
    }, [phaseId, taskId])

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
    const loadInventoryForConsumption = useCallback(async () => {
        if (!projectId) return
        if (inventoryFetchRef.current) inventoryFetchRef.current.abort()
        const controller = new AbortController()
        inventoryFetchRef.current = controller
        setIsLoadingInventory(true)
        try {
            const items = await fetchInventoryLookup(projectId, "", controller.signal)
            if (!controller.signal.aborted) setInventoryList(items)
        } catch (err) {
            if (err.name !== "CanceledError") {
                console.error("Failed to load inventory:", err)
                toast.error("Could not load inventory", {
                    description: formatToastError(err),
                })
            }
        } finally {
            if (!controller.signal.aborted) setIsLoadingInventory(false)
            if (inventoryFetchRef.current === controller) inventoryFetchRef.current = null
        }
    }, [projectId])

    const loadSubTasks = useCallback(
        async (loadMore = false) => {
            if (!taskId || fetchLockRef.current) return
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
                const fetchFn = activeUser ? fetchSubTasksByUser : fetchSubTasksData
                const fetchArgs = activeUser
                    ? { taskId, keycloakId: activeUser, ...filtersRef.current, page: currentPage, signal: controller.signal }
                    : { taskId, ...filtersRef.current, page: currentPage, signal: controller.signal }

                const { subTasks: fetched, pagination: newPag } = await fetchFn(fetchArgs)
                if (controller.signal.aborted) return

                if (loadMore) {
                    setSubTasks((prev) => [...prev, ...fetched])
                } else {
                    setSubTasks(fetched)
                }
                setPagination(newPag)
                setFilters((prev) => ({ ...prev, page: currentPage }))
                hasMoreRef.current = currentPage < newPag.totalPages
            } catch (err) {
                if (err.name !== "CanceledError") {
                    toast.error("Failed to load subtasks", { description: formatToastError(err) })
                    if (!loadMore) setSubTasks([])
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
        [taskId]
    )

    const loadMoreSubTasks = useCallback(() => {
        if (!isLoadingMore && hasMoreRef.current && !fetchLockRef.current) {
            loadSubTasks(true)
        }
    }, [isLoadingMore, loadSubTasks])

    const loadTaskDates = useCallback(async () => {
        if (!phaseId || !taskId) return
        if (taskDatesRef.current) taskDatesRef.current.abort()
        const controller = new AbortController()
        taskDatesRef.current = controller
        try {
            const dates = await fetchTaskDates(phaseId, taskId, controller.signal)
            if (!controller.signal.aborted) setTaskDates(dates)
        } catch (err) {
            if (err.name !== "CanceledError") console.error("Failed to load task dates:", err)
        } finally {
            if (taskDatesRef.current === controller) taskDatesRef.current = null
        }
    }, [phaseId, taskId])
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry.isIntersecting && hasMoreRef.current && !isLoadingMore && !fetchLockRef.current) {
                    loadMoreSubTasks()
                }
            },
            { root: null, rootMargin: "100px", threshold: 0 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMoreSubTasks, isLoadingMore])

    useEffect(() => { loadTaskDetails(); return () => taskFetchRef.current?.abort() }, [loadTaskDetails])
    useEffect(() => { loadPhaseDetails(); return () => phaseFetchRef.current?.abort() }, [loadPhaseDetails])
    useEffect(() => { loadProjectUsers(); return () => usersFetchRef.current?.abort() }, [loadProjectUsers])
    useEffect(() => { loadTaskDates(); return () => taskDatesRef.current?.abort() }, [loadTaskDates])

    useEffect(() => {
        hasMoreRef.current = true
        setFilters((prev) => ({ ...prev, page: 1 }))
        loadSubTasks(false)
        return () => controllerRef.current?.abort()
    }, [filters.search, filters.status, filters.sortBy, filters.order, selectedUserKeycloakId, loadSubTasks])
    useEffect(() => {
        if (isProgressModalOpen) {
            loadInventoryForConsumption()
        } else {
            inventoryFetchRef.current?.abort()
        }
    }, [isProgressModalOpen, loadInventoryForConsumption])
    useEffect(() => {
        return () => {
            controllerRef.current?.abort()
            editFetchRef.current?.abort()
            usersFetchRef.current?.abort()
            taskFetchRef.current?.abort()
            phaseFetchRef.current?.abort()
            taskDatesRef.current?.abort()
            inventoryFetchRef.current?.abort()  // ← NEW
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

    const handleSaveNewSubTask = async (formData) => {
        if (!taskId) return
        try {
            const createdByKeycloakId = getCurrentUserKeycloakId()
            const res = await addSubTask(taskId, { ...formData, createdBy: createdByKeycloakId })
            toast.success(res.message, { description: res.description })
            hasMoreRef.current = true
            setFilters((prev) => ({ ...prev, page: 1 }))
            await loadSubTasks(false)
            setIsAddOpen(false)
        } catch (err) {
            toast.error("Create Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleEditClick = useCallback((subTask) => {
        if (!taskId) return
        editFetchRef.current?.abort()
        const controller = new AbortController()
        editFetchRef.current = controller
        setEditingSubTask({ ...subTask })
        setIsEditLoading(true)
        setIsEditOpen(true)
        fetchSubTaskById(taskId, subTask.id, controller.signal)
            .then((fullSubTask) => { if (!controller.signal.aborted) setEditingSubTask(fullSubTask) })
            .catch((err) => { if (err.name !== "CanceledError") console.error("Failed to fetch subtask details:", err) })
            .finally(() => {
                if (!controller.signal.aborted) setIsEditLoading(false)
                if (editFetchRef.current === controller) editFetchRef.current = null
            })
    }, [taskId])

    const handleCloseEdit = useCallback(() => {
        editFetchRef.current?.abort()
        editFetchRef.current = null
        setIsEditOpen(false)
        setEditingSubTask(null)
        setIsEditLoading(false)
    }, [])

    const handleSaveEditedSubTask = async (formData) => {
        if (!taskId || !editingSubTask) return
        try {
            const res = await editSubTask(taskId, editingSubTask.id, formData)
            toast.success(res.message, { description: res.description })
            hasMoreRef.current = true
            setFilters((prev) => ({ ...prev, page: 1 }))
            await loadSubTasks(false)
            handleCloseEdit()
        } catch (err) {
            toast.error("Update Failed", { description: formatToastError(err) })
            throw err
        }
    }

    const handleDeleteClick = useCallback((subTask) => { setSubTaskToDelete(subTask); setIsDeleteModalOpen(true) }, [])
    const handleCloseDelete = useCallback(() => {
        if (isDeleting) return
        setIsDeleteModalOpen(false)
        setTimeout(() => setSubTaskToDelete(null), 250)
    }, [isDeleting])

    const handleConfirmDelete = async () => {
        if (!taskId || !subTaskToDelete) return
        try {
            setIsDeleting(true)
            const res = await deleteSubTask(taskId, subTaskToDelete.id)
            toast.success(res.message, { description: res.description })
            setSubTasks((prev) => removeSubTaskFromList(prev, subTaskToDelete.id))
            setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
            setIsDeleteModalOpen(false)
            setSubTaskToDelete(null)
        } catch (err) {
            toast.error("Delete Failed", { description: formatToastError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleAssignMember = useCallback(async (subTaskId, user) => {
        if (!taskId || !subTaskId) return
        const keycloakId = user.keycloakId || user.id
        if (!keycloakId) {
            toast.error("Invalid User", { description: "User keycloakId is missing" })
            throw new Error("User keycloakId is missing")
        }
        try {
            const res = await assignSubTaskMember(taskId, subTaskId, keycloakId)
            toast.success(res.message, { description: res.description })
            setSubTasks((prev) =>
                prev.map((st) => {
                    if (st.id === subTaskId) {
                        const alreadyAssigned = (st.assignedTo || []).some(
                            (a) => (a.keycloakId || a.id) === keycloakId
                        )
                        if (!alreadyAssigned) {
                            return {
                                ...st,
                                assignedTo: [
                                    ...(st.assignedTo || []),
                                    { id: user.id, keycloakId: user.keycloakId || user.id, name: user.name || "Unknown", email: user.email || "", avatar: user.avatar || null },
                                ],
                            }
                        }
                    }
                    return st
                })
            )
            return res
        } catch (err) {
            toast.error("Assign Failed", { description: formatToastError(err) })
            throw err
        }
    }, [taskId])

    const handleUnassignMember = useCallback(async (subTaskId, user) => {
        if (!taskId || !subTaskId) return
        const keycloakId = user.keycloakId || user.userId || user.id
        if (!keycloakId) {
            toast.error("Invalid User", { description: "User keycloakId is missing" })
            throw new Error("User keycloakId is missing")
        }
        try {
            const res = await unassignSubTaskMember(taskId, subTaskId, keycloakId)
            toast.success(res.message, { description: res.description })
            setSubTasks((prev) =>
                prev.map((st) => {
                    if (st.id === subTaskId) {
                        return {
                            ...st,
                            assignedTo: (st.assignedTo || []).filter(
                                (a) => (a.keycloakId || a.id) !== keycloakId
                            ),
                        }
                    }
                    return st
                })
            )
            return res
        } catch (err) {
            toast.error("Unassign Failed", { description: formatToastError(err) })
            throw err
        }
    }, [taskId])

    const handleMembersChanged = useCallback(() => { }, [])

    const handleUpdateProgressClick = useCallback((subTask) => {
        setProgressSubTask(subTask)
        setIsProgressModalOpen(true)
    }, [])

    const handleCloseProgressModal = useCallback(() => {
        if (isProgressUpdating) return
        setIsProgressModalOpen(false)
        setTimeout(() => setProgressSubTask(null), 250)
    }, [isProgressUpdating])

    const handleSaveProgress = async (percent) => {
        if (!taskId || !progressSubTask) return
        try {
            setIsProgressUpdating(true)
            const res = await updateSubTaskProgress(taskId, progressSubTask.id, percent)
            toast.success(res.message, { description: res.description })
            setSubTasks((prev) =>
                prev.map((st) => {
                    if (st.id === progressSubTask.id) {
                        return {
                            ...st,
                            completionPercent: res.subTask.completionPercent ?? percent,
                            status: res.subTask.status || st.status,
                        }
                    }
                    return st
                })
            )
            handleCloseProgressModal()
        } catch (err) {
            toast.error("Progress Update Failed", { description: formatToastError(err) })
        } finally {
            setIsProgressUpdating(false)
        }
    }
    const handleSaveConsumption = useCallback(async (rows) => {
        if (!projectId || !progressSubTask) return

        const recordedBy = getCurrentUserKeycloakId()
        const results = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
                const res = await recordMaterialConsumption(
                    projectId,
                    progressSubTask.id,
                    taskId,
                    phaseId,
                    { ...row, recordedBy },
                )
                results.push(res)
            } catch (err) {
                toast.error(
                    `Failed to record "${row.materialName}"`,
                    { description: formatToastError(err) }
                )
                throw err
            }
        }
        const totalMaterials = results.length
        toast.success(
            totalMaterials === 1
                ? "Consumption Recorded"
                : `${totalMaterials} Materials Recorded`,
            {
                description:
                    totalMaterials === 1
                        ? results[0]?.description || "Material consumption recorded successfully"
                        : `All ${totalMaterials} material consumption records saved successfully`,
            }
        )
        loadInventoryForConsumption()
    }, [projectId, progressSubTask, taskId, phaseId, loadInventoryForConsumption])

    if (isInitialLoad) return <SubTasksLoading />

    return (
        <div className="w-full  mx-auto py-8 px-4 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300">
            <SubTasksHeader
                taskId={taskId}
                phaseName={phaseName}
                taskName={taskName.length > 20 ? taskName.substring(0, 20) + "..." : taskName}
                count={enrichedSubTasks.length}
                total={pagination.total}
                onSearch={handleSearch}
                onFilterChange={handleFilter}
                onAddSubTask={handleSaveNewSubTask}
                isAddOpen={isAddOpen}
                onOpenAdd={handleOpenAdd}
                onCloseAdd={handleCloseAdd}
                isRefreshing={isRefreshing}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                taskDates={taskDates}
                selectedUserKeycloakId={selectedUserKeycloakId}
                onUserAvatarClick={handleUserAvatarClick}
                subTasks={enrichedSubTasks}
            />
            <SubTasksTable
                subtasks={enrichedSubTasks}
                taskId={taskId}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                projectUsers={projectUsers}
                isLoadingUsers={isLoadingUsers}
                onAssignMember={handleAssignMember}
                onUnassignMember={handleUnassignMember}
                onMembersChanged={handleMembersChanged}
                onUpdateProgress={handleUpdateProgressClick}
                projectId={projectId}
            />
            <div ref={sentinelRef} className="w-full py-4 flex flex-col items-center justify-center">
                {isLoadingMore && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-sfpro">Loading more subtasks...</span>
                    </div>
                )}
            </div>
            <EditSubTaskModal
                open={isEditOpen}
                onClose={handleCloseEdit}
                onSave={handleSaveEditedSubTask}
                subTask={editingSubTask}
                isEditLoading={isEditLoading}
                isLoadingUsers={isLoadingUsers}
                taskStartDate={taskDates?.startDate}
                taskEndDate={taskDates?.endDate}
            />
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
                title="Delete SubTask"
                description="This action cannot be undone. This will permanently remove the subtask from the system."
                itemName={subTaskToDelete?.title}
                isLoading={isDeleting}
            />

            <UpdateProgressModal
                isOpen={isProgressModalOpen}
                onClose={handleCloseProgressModal}
                subtask={progressSubTask}
                onSave={handleSaveProgress}
                isLoading={isProgressUpdating}
                showConsumption={true}
                projectId={projectId}
                inventoryList={inventoryList}
                isLoadingInventory={isLoadingInventory}
                recordedBy={getCurrentUserKeycloakId()}
                onSaveConsumption={handleSaveConsumption}
            />
        </div>
    )
}