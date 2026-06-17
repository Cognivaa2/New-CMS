"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  fetchIssueSummary,
  fetchAllIssues,
  fetchIssueById,
  createIssue,
  editIssue,
  deleteIssue,
  formatToastError,
  debounce,
  resolveIssue,
  rejectIssue,
  assignUserToIssue,
  unassignUserFromIssue,
  fetchProjectUsers,
} from "./api"

import IssueHeader from "@/components/projects/(project)/issues/IssueHeader"
import SummaryCard from "@/components/ui/SummaryCard"
import IssueTable from "@/components/projects/(project)/issues/IssueTable"
import AddIssueModal from "@/components/projects/(project)/issues/AddIssueModal"
import EditIssueModal from "@/components/projects/(project)/issues/EditIssueModal"
import DeleteModal from "@/components/ui/DeleteModal"
import RejectModal from "@/components/ui/RejectModal"
import Loading from "./loading"

const ISSUE_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Resolved", label: "Resolved" },
      { value: "In Progress", label: "In Progress" },
      { value: "Blocked", label: "Blocked" },
    ],
  },
  {
    key: "priority",
    label: "Priority",
    options: [
      { value: "critical", label: "Critical" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { value: "createdAt", label: "Created Date" },
      { value: "updatedAt", label: "Updated Date" },
      { value: "priority", label: "Priority" },
      { value: "dueDate", label: "Due Date" },
      { value: "title", label: "Title" },
    ],
  },
]

export default function IssuesPage() {
  const { projectId } = useParams()

  const [stats, setStats] = useState([])
  const [issues, setIssues] = useState([])
  const [pagination, setPagination] = useState({
    page: 1, limit: 20, total: 0, totalPages: 0,
  })
  const [filters, setFilters] = useState({
    page: 1, limit: 20, search: "", status: undefined,
    priority: undefined, sortBy: "createdAt", order: "desc",
  })

  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [isRejecting, setIsRejecting] = useState(false)

  const [projectUsers, setProjectUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const filtersRef = useRef(filters)
  const isInitialLoadRef = useRef(true)
  const fetchLockRef = useRef(false)
  const controllerRef = useRef(null)
  const summaryControllerRef = useRef(null)
  const editFetchRef = useRef(null)
  const usersControllerRef = useRef(null)

  filtersRef.current = filters

  const debouncedSetSearch = useRef(
    debounce((query) => {
      setFilters((prev) => ({ ...prev, search: query, page: 1 }))
    }, 400)
  ).current

  const loadSummary = useCallback(async () => {
    if (summaryControllerRef.current) summaryControllerRef.current.abort()
    const controller = new AbortController()
    summaryControllerRef.current = controller
    try {
      const result = await fetchIssueSummary(projectId || null, controller.signal)
      if (!controller.signal.aborted) {
        setStats(result.stats)
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("Failed to load issue summary:", err)
      }
    } finally {
      if (summaryControllerRef.current === controller) {
        summaryControllerRef.current = null
      }
    }
  }, [projectId])

  const loadIssues = useCallback(async () => {
    if (fetchLockRef.current) return
    fetchLockRef.current = true
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      if (!isInitialLoadRef.current) setIsRefreshing(true)
      const { issues: fetched, pagination: newPag } = await fetchAllIssues({
        ...filtersRef.current,
        projectId: projectId || undefined,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setIssues(fetched)
      setPagination(newPag)
    } catch (err) {
      if (err.name !== "CanceledError") {
        toast.error("Failed to load issues", { description: formatToastError(err) })
        setIssues([])
      }
    } finally {
      isInitialLoadRef.current = false
      setIsInitialLoad(false)
      setIsRefreshing(false)
      fetchLockRef.current = false
      controllerRef.current = null
    }
  }, [projectId])

  const loadProjectUsers = useCallback(async () => {
    if (!projectId) return
    if (usersControllerRef.current) usersControllerRef.current.abort()
    const controller = new AbortController()
    usersControllerRef.current = controller
    setIsLoadingUsers(true)
    try {
      const users = await fetchProjectUsers(projectId, controller.signal)
      if (!controller.signal.aborted) {
        setProjectUsers(users)
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("Failed to load project users:", err)
      }
    } finally {
      if (!controller.signal.aborted) setIsLoadingUsers(false)
      if (usersControllerRef.current === controller) usersControllerRef.current = null
    }
  }, [projectId])

  useEffect(() => {
    loadSummary()
    return () => summaryControllerRef.current?.abort()
  }, [loadSummary])

  useEffect(() => {
    loadIssues()
    return () => controllerRef.current?.abort()
  }, [
    filters.search, filters.status, filters.priority,
    filters.sortBy, filters.order, filters.page,
    loadIssues,
  ])

  useEffect(() => {
    loadProjectUsers()
    return () => usersControllerRef.current?.abort()
  }, [loadProjectUsers])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      summaryControllerRef.current?.abort()
      editFetchRef.current?.abort()
      usersControllerRef.current?.abort()
    }
  }, [])

  const handleResolve = useCallback(async (issue) => {
    if (issue.backendStatus !== "submitted") {
      toast.error("Cannot Resolve", {
        description: `Only in-progress issues can be resolved. Current status: "${issue.status}"`,
      })
      return
    }
    try {
      const res = await resolveIssue(issue.id)
      toast.success(res.message, { description: res.description })
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issue.id
            ? { ...i, status: "Resolved", backendStatus: "resolved", resolvedAt: new Date().toLocaleString() }
            : i
        )
      )
      loadSummary()
    } catch (err) {
      toast.error("Resolve Failed", { description: formatToastError(err) })
    }
  }, [loadSummary])

  const handleRejectClick = useCallback((issue) => {
    if (issue.backendStatus !== "submitted") {
      toast.error("Cannot Reject", {
        description: `Only in-progress issues can be rejected. Current status: "${issue.status}"`,
      })
      return
    }
    setRejectTarget(issue)
    setIsRejectModalOpen(true)
  }, [])

  const handleCloseReject = useCallback(() => {
    if (isRejecting) return
    setIsRejectModalOpen(false)
    setTimeout(() => setRejectTarget(null), 250)
  }, [isRejecting])

  const handleConfirmReject = async (remark) => {
    if (!rejectTarget || !remark?.trim()) return
    try {
      setIsRejecting(true)
      const res = await rejectIssue(rejectTarget.id, remark)
      toast.success(res.message, { description: res.description })
      setIssues((prev) =>
        prev.map((i) =>
          i.id === rejectTarget.id
            ? { ...i, status: "Blocked", backendStatus: "rejected", rejectionRemark: remark, rejectedAt: new Date().toLocaleString() }
            : i
        )
      )
      setIsRejectModalOpen(false)
      setRejectTarget(null)
      loadSummary()
    } catch (err) {
      toast.error("Reject Failed", { description: formatToastError(err) })
    } finally {
      setIsRejecting(false)
    }
  }

  const handleAssignMember = useCallback(async (issueId, user) => {
    const keycloakId = user.keycloakId || user.id
    if (!keycloakId) {
      toast.error("Invalid User", { description: "User keycloakId is missing" })
      throw new Error("User keycloakId is missing")
    }
    try {
      const res = await assignUserToIssue(issueId, keycloakId)
      toast.success(res.message, { description: res.description })
      setIssues((prev) =>
        prev.map((issue) => {
          if (issue.id === issueId) {
            const alreadyAssigned = (issue.assignedTo || []).some((a) => a.keycloakId === keycloakId)
            if (!alreadyAssigned) {
              return {
                ...issue,
                assignedTo: [
                  ...(issue.assignedTo || []),
                  {
                    keycloakId: user.keycloakId || user.id,
                    name: user.name || "Unknown",
                    email: user.email || "",
                    avatar: user.avatar || null,
                    role: user.role || "Team Member",
                  },
                ],
              }
            }
          }
          return issue
        })
      )
      return res
    } catch (err) {
      toast.error("Assign Failed", { description: formatToastError(err) })
      throw err
    }
  }, [])

  const handleUnassignMember = useCallback(async (issueId, user) => {
    const keycloakId = user.keycloakId || user.id
    if (!keycloakId) {
      toast.error("Invalid User", { description: "User keycloakId is missing" })
      throw new Error("User keycloakId is missing")
    }
    try {
      const res = await unassignUserFromIssue(issueId, keycloakId)
      toast.success(res.message, { description: res.description })
      setIssues((prev) =>
        prev.map((issue) => {
          if (issue.id === issueId) {
            return {
              ...issue,
              assignedTo: (issue.assignedTo || []).filter((a) => a.keycloakId !== keycloakId),
            }
          }
          return issue
        })
      )
      return res
    } catch (err) {
      toast.error("Unassign Failed", { description: formatToastError(err) })
      throw err
    }
  }, [])

  const handleSearch = useCallback(
    (query) => debouncedSetSearch(query),
    [debouncedSetSearch]
  )

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

  const handlePageChange = useCallback((newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }, [])

  const handleOpenAdd = useCallback(() => setIsAddOpen(true), [])
  const handleCloseAdd = useCallback(() => setIsAddOpen(false), [])

  const handleSaveNewIssue = async (payload) => {
    try {
      const res = await createIssue({ ...payload, projectId })
      toast.success(res.message, { description: res.description })
      setIsAddOpen(false)
      loadIssues()
      loadSummary()
    } catch (err) {
      toast.error("Create Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleEditClick = useCallback((issue) => {
    if (issue.backendStatus === "resolved") {
      toast.error("Cannot Edit", { description: "Resolved issues cannot be edited" })
      return
    }
    editFetchRef.current?.abort()
    const controller = new AbortController()
    editFetchRef.current = controller
    setEditingIssue({ ...issue })
    setIsEditLoading(true)
    setIsEditOpen(true)
    fetchIssueById(issue.id, controller.signal)
      .then((fullIssue) => {
        if (!controller.signal.aborted) setEditingIssue(fullIssue)
      })
      .catch((err) => {
        if (err.name !== "CanceledError") console.error("Failed to fetch issue details:", err)
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
    setEditingIssue(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedIssue = async (formData) => {
    if (!editingIssue) return
    try {
      const res = await editIssue(editingIssue.id, formData)
      toast.success(res.message, { description: res.description })
      handleCloseEdit()
      loadIssues()
      loadSummary()
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleDeleteClick = useCallback((issue) => {
    if (issue.backendStatus === "resolved") {
      toast.error("Cannot Delete", { description: "Resolved issues cannot be deleted" })
      return
    }
    setDeleteTarget(issue)
    setIsDeleteModalOpen(true)
  }, [])

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteModalOpen(false)
    setTimeout(() => setDeleteTarget(null), 250)
  }, [isDeleting])

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      const res = await deleteIssue(deleteTarget.id)
      toast.success(res.message, { description: res.description })
      setIssues((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      setIsDeleteModalOpen(false)
      setDeleteTarget(null)
      loadSummary()
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isInitialLoad) return <Loading />

  return (
    <div className="w-full mx-auto p-4 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300">
      <IssueHeader
        title="Issues"
        badgeCount={pagination.total}
        description="Track and manage all project issues, bugs and blockers"
        filters={ISSUE_FILTERS}
        onSearch={handleSearch}
        onFilter={handleFilter}
        onAction={handleOpenAdd}
        isRefreshing={isRefreshing}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat) => (
          <SummaryCard key={stat.id} item={stat} />
        ))}
      </div>

      <IssueTable
        data={issues}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        pagination={pagination}
        onPageChange={handlePageChange}
        projectUsers={projectUsers}
        isLoadingUsers={isLoadingUsers}
        onAssignMember={handleAssignMember}
        onUnassignMember={handleUnassignMember}
        onResolve={handleResolve}
        onReject={handleRejectClick}
      />

      <AddIssueModal
        open={isAddOpen}
        onClose={handleCloseAdd}
        onSave={handleSaveNewIssue}
      />

      <EditIssueModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEditedIssue}
        issue={editingIssue}
        isEditLoading={isEditLoading}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Issue"
        description="This action cannot be undone. This will permanently remove the issue from the system."
        itemName={deleteTarget?.title || deleteTarget?.issue}
        isLoading={isDeleting}
      />

      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={handleCloseReject}
        onConfirm={handleConfirmReject}
        title="Reject Issue"
        itemName={rejectTarget?.title || rejectTarget?.issue}
        remarkPlaceholder="Explain why this issue is being rejected..."
        isLoading={isRejecting}
      />
    </div>
  )
}