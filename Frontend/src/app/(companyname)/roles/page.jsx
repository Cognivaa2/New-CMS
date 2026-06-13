"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import {
  fetchRolesData,
  fetchRoleSchema,
  addRole,
  editRole,
  deleteRole,
  updateRoleStatus,
  updateRolePermissions,
  mapRoleToCardFormat,
  toggleAllRolePermissions,
} from "./api"
import PageHeader from "@/components/roles/PageHeader"
import RoleCard from "@/components/roles/RoleCard"
import PermissionsTable from "@/components/roles/PermissionsTable"
import RolesLoading from "./loading"
import AddRoleModal from "@/components/roles/AddRoleModal"
import DeleteModal from "@/components/ui/DeleteModal"

const ROLE_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "true", label: "Active Roles" },
      { value: "false", label: "Inactive Roles" },
    ],
  },
]

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [activeRole, setActiveRole] = useState(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [schema, setSchema] = useState(null)  // ← dynamic schema
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    isActive: "",
    sortBy: "createdAt",
    order: "desc",
  })

  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const isInitialLoadRef = useRef(true)

  useEffect(() => {
    fetchRoleSchema()
      .then((s) => setSchema(s))
      .catch((err) =>
        toast.error("Failed to load permission schema", {
          description: err.message,
        })
      )
  }, [])

  const loadRoles = useCallback(async () => {
    const currentFilters = filtersRef.current
    try {
      if (!isInitialLoadRef.current) setIsRefreshing(true)
      const data = await fetchRolesData(currentFilters)
      const formattedRoles = data.roles.map(mapRoleToCardFormat)
      setRoles(formattedRoles)
      setPagination(data.pagination)

      if (formattedRoles.length > 0) {
        setActiveRole((prev) =>
          prev
            ? formattedRoles.find((r) => r.id === prev.id) ?? formattedRoles[0]
            : formattedRoles[0]
        )
      } else {
        setActiveRole(null)
      }
    } catch (err) {
      toast.error("Failed to load roles", { description: err.message })
      setRoles([])
      setActiveRole(null)
    } finally {
      isInitialLoadRef.current = false
      setIsInitialLoad(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
  }, [filters.search, filters.isActive, filters.page, loadRoles])

  const handleSearch = useCallback((query) => {
    setFilters((prev) => ({ ...prev, search: query, page: 1 }))
  }, [])

  const handleFilter = useCallback((selected) => {
    const statusArr = selected?.status
    const statusValue =
      Array.isArray(statusArr) && statusArr.length > 0
        ? statusArr[statusArr.length - 1]
        : ""
    setFilters((prev) => ({ ...prev, isActive: statusValue, page: 1 }))
  }, [])

  const handleRoleChange = (role) => setActiveRole(role)

  const handleToggleAllPermissions = async (roleId, enable) => {
    const res = await toggleAllRolePermissions(roleId, enable)
    const updatedPermissions = res?.data?.permissions || {}

    // Sync the active role's permissions in local state
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, permissions: updatedPermissions } : r
      )
    )
    if (activeRole?.id === roleId) {
      setActiveRole((prev) =>
        prev ? { ...prev, permissions: updatedPermissions } : prev
      )
    }
    return res
  }

  const handleSaveRole = async (roleName, description) => {
    try {
      if (editingRole) {
        const res = await editRole(editingRole.id, roleName, description)
        toast.success(res.title || "Role Updated", {
          description: res.description || "Role updated successfully",
        })
      } else {
        const res = await addRole(roleName, description)
        toast.success(res.title || "Role Created", {
          description: res.description || "Role created successfully",
        })
      }
      await loadRoles()
      handleCloseModal()
    } catch (err) {
      toast.error("Operation Failed", { description: err.message })
      throw err
    }
  }

  const handleAddRoleClick = () => {
    setEditingRole(null)
    setIsAddRoleModalOpen(true)
  }

  const handleEditRoleClick = (role) => {
    setEditingRole(role)
    setIsAddRoleModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsAddRoleModalOpen(false)
    setEditingRole(null)
  }

  const handleDeleteRole = (role) => {
    setRoleToDelete(role)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return
    try {
      setIsDeleting(true)
      const res = await deleteRole(roleToDelete.id)
      toast.success(res.title || "Role Deleted", {
        description: res.description || "Role deleted successfully",
      })
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id))
      if (activeRole?.id === roleToDelete.id) {
        const remaining = roles.filter((r) => r.id !== roleToDelete.id)
        setActiveRole(remaining.length > 0 ? remaining[0] : null)
      }
      await loadRoles()
      setIsDeleteModalOpen(false)
      setRoleToDelete(null)
    } catch (err) {
      toast.error("Delete Failed", { description: err.message })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseDeleteModal = () => {
    if (isDeleting) return
    setIsDeleteModalOpen(false)
    setTimeout(() => setRoleToDelete(null), 200)
  }

  const handleToggleRoleStatus = async (role) => {
    try {
      const newStatus = !role.isActive
      const res = await updateRoleStatus(role.id, newStatus)
      toast.success(res.title || "Status Updated", {
        description:
          res.description || `Role is now ${newStatus ? "Active" : "Inactive"}`,
      })

      const responsePermissions = res?.data?.permissions || {}
      const updatedRole = {
        ...role,
        isActive: newStatus,
        permissions: newStatus ? role.permissions : responsePermissions,
        moduleStatus: newStatus ? role.moduleStatus : {},
      }

      setRoles((prev) => prev.map((r) => (r.id === role.id ? updatedRole : r)))
      if (activeRole?.id === role.id) setActiveRole(updatedRole)
    } catch (err) {
      toast.error("Status Update Failed", { description: err.message })
    }
  }

  const handleUpdatePermissions = async (roleId, permissions) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions } : r))
    )
    if (activeRole?.id === roleId) {
      setActiveRole((prev) => (prev ? { ...prev, permissions } : prev))
    }
    await updateRolePermissions(roleId, permissions)
  }

  if (isInitialLoad) return <RolesLoading />

  return (
    <div className="w-full mx-auto p-4 md:p-8 min-h-screen transition-colors duration-300">
      <PageHeader
        title="Roles & Permissions"
        description="Configure access levels and module permissions for your organization roles."
        actionText="Add Role"
        ActionIcon={UserPlus}
        onAction={handleAddRoleClick}
        filters={ROLE_FILTERS}
        onFilter={handleFilter}
        onSearch={handleSearch}
      />

      {roles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#18181b] border border-dashed border-gray-200 dark:border-[#27272a] rounded-3xl">
          <UserPlus className="w-16 h-16 text-gray-400 dark:text-[#71717a] mb-4" />
          <h3 className="text-lg font-sfpro-medium text-gray-900 dark:text-[#f4f4f5] mb-2">
            No Roles Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mb-6 text-center px-4">
            {filters.search
              ? `No roles matching "${filters.search}"`
              : "Create your first role to get started"}
          </p>
          {!filters.search && (
            <button
              onClick={handleAddRoleClick}
              className="bg-[#2a2a2a] dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl text-sm font-sfpro-medium hover:opacity-90 transition-opacity"
            >
              Create Role
            </button>
          )}
        </div>
      )}

      {roles.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isActive={activeRole?.id === role.id}
                onClick={() => handleRoleChange(role)}
                onToggleStatus={() => handleToggleRoleStatus(role)}
                onEdit={handleEditRoleClick}
                onDelete={handleDeleteRole}
              />
            ))}
          </div>

          {activeRole && schema && (
            <PermissionsTable
              roles={roles}
              activeRoleId={activeRole.id}
              activeRoleName={activeRole.name}
              activeRoleIsActive={activeRole.isActive}
              permissions={activeRole.permissions || {}}
              schema={schema}
              onRoleChange={handleRoleChange}
              onUpdatePermissions={handleUpdatePermissions}
              onToggleAllPermissions={handleToggleAllPermissions}
            />
          )}
        </>
      )}

      <AddRoleModal
        open={isAddRoleModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRole}
        initialRole={editingRole}
        mode={editingRole ? "edit" : "add"}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDeleteRole}
        title="Delete Role"
        description="This action cannot be undone. This will permanently remove the role and its permissions from the system."
        itemName={roleToDelete?.name}
        isLoading={isDeleting}
      />
    </div>
  )
}