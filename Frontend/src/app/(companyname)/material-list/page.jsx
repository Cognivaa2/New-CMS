"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { PlusSquare } from "lucide-react"

import {
  fetchMaterials,
  createMaterial,
  editMaterial,
  deleteMaterial,
  toggleMaterialStatus,
  fetchMaterialById,
  buildStats,
  formatMaterialError,
  getCurrentUserKeycloakId,
  debounce,
} from "./api"

import MaterialHeader from "@/components/material-list/MaterialHeader"
import MaterialTable from "@/components/material-list/MaterialTable"
import SummaryCard from "@/components/ui/SummaryCard"
import Loading from "./loading"
import AddMaterialModal from "@/components/material-list/AddMaterialModal"
import EditMaterialModal from "@/components/material-list/EditMaterialModal"
import DeleteMaterialModal from "@/components/ui/DeleteModal"

const MATERIAL_FILTERS = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    options: [
      { value: "createdAt", label: "Created Date" },
      { value: "name", label: "Name" },
      { value: "category", label: "Category" },
      { value: "unit", label: "Unit" },
      { value: "updatedAt", label: "Updated Date" },
    ],
  },
]

const PAGE_LIMIT = 15

export default function MaterialMasterPage() {
  const [materials, setMaterials] = useState([])
  const [stats, setStats] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
    hasNext: false,
  })

  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    isActive: undefined,
    page: 1,
    limit: PAGE_LIMIT,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [deletingMaterial, setDeletingMaterial] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const controllerRef = useRef(null)
  const editFetchRef = useRef(null)
  const isLoadingMoreRef = useRef(false)
  const isFirstRender = useRef(true)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const paginationRef = useRef(pagination)
  paginationRef.current = pagination

  const debouncedSetSearch = useRef(
    debounce((query) => {
      setFilters((prev) => ({ ...prev, search: query, page: 1 }))
    }, 400)
  ).current

  const loadMaterials = useCallback(async (showRefresh = false) => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    isLoadingMoreRef.current = false
    setIsLoadingMore(false)

    if (showRefresh) setIsRefreshing(true)

    try {
      const currentFilters = { ...filtersRef.current, page: 1 }

      const { materials: fetched, pagination: newPag } = await fetchMaterials({
        ...currentFilters,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      setMaterials(fetched)
      setPagination({
        total: newPag.total ?? 0,
        page: newPag.page ?? 1,
        limit: newPag.limit ?? PAGE_LIMIT,
        totalPages: newPag.totalPages ?? 0,
        hasNext: newPag.hasNext ?? (newPag.page < newPag.totalPages),
      })

      setFilters((prev) => ({ ...prev, page: 1 }))

      const [activeRes, inactiveRes] = await Promise.all([
        fetchMaterials({ limit: 1, isActive: true, signal: controller.signal }),
        fetchMaterials({ limit: 1, isActive: false, signal: controller.signal }),
      ])

      if (controller.signal.aborted) return

      const categoryCount = new Set(
        fetched.map((m) => m.category).filter(Boolean)
      ).size

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const recentCount = fetched.filter(
        (m) => m.createdAt && new Date(m.createdAt).getTime() >= sevenDaysAgo
      ).length

      setStats(buildStats(
        newPag,
        activeRes.pagination.total,
        inactiveRes.pagination.total,
        categoryCount,
        recentCount,
      ))
    } catch (err) {
      if (err.name === "CanceledError") return
      toast.error("Failed to load materials", {
        description: formatMaterialError(err),
      })
    } finally {
      setIsInitialLoad(false)
      setIsRefreshing(false)
      controllerRef.current = null
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current) return
    const { page, totalPages, hasNext } = paginationRef.current
    if (!hasNext && page >= totalPages) return

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)

    try {
      const nextPage = paginationRef.current.page + 1
      const currentFilters = filtersRef.current

      const { materials: fetched, pagination: newPag } = await fetchMaterials({
        ...currentFilters,
        page: nextPage,
      })

      if (!fetched.length) {
        setPagination((prev) => ({ ...prev, hasNext: false }))
        return
      }

      setMaterials((prev) => {
        const existingIds = new Set(prev.map((m) => m.id))
        const newItems = fetched.filter((m) => !existingIds.has(m.id))
        return [...prev, ...newItems]
      })

      setPagination({
        total: newPag.total ?? 0,
        page: newPag.page ?? nextPage,
        limit: newPag.limit ?? PAGE_LIMIT,
        totalPages: newPag.totalPages ?? 0,
        hasNext: newPag.hasNext ?? (newPag.page < newPag.totalPages),
      })

      // Sync filter page
      setFilters((prev) => ({ ...prev, page: nextPage }))

    } catch (err) {
      if (err.name === "CanceledError") return
      toast.error("Failed to load more", {
        description: formatMaterialError(err),
      })
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    loadMaterials(false)
    return () => {
      controllerRef.current?.abort()
      editFetchRef.current?.abort()
    }
  }, [loadMaterials])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    loadMaterials(true)
  }, [
    filters.search,
    filters.isActive,
    filters.sortBy,
    filters.sortOrder,
    loadMaterials,
  ])

  const handleSearch = useCallback(
    (query) => debouncedSetSearch(query),
    [debouncedSetSearch]
  )

  const handleFilter = useCallback((selected) => {
    const updates = {}

    const statusArr = selected?.status
    if (Array.isArray(statusArr) && statusArr.length > 0) {
      updates.isActive = statusArr[statusArr.length - 1]
    } else {
      updates.isActive = undefined
    }

    const sortArr = selected?.sortBy
    if (Array.isArray(sortArr) && sortArr.length > 0) {
      updates.sortBy = sortArr[sortArr.length - 1]
    } else {
      updates.sortBy = "createdAt"
    }

    setFilters((prev) => ({ ...prev, ...updates, page: 1 }))
  }, [])

  const handleSaveNewMaterial = async (formData) => {
    const keycloakId = getCurrentUserKeycloakId()
    const payload = {
      name: formData.name?.trim(),
      unit: formData.unit?.trim(),
      category: formData.category?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      createdBy: keycloakId,
    }
    const res = await createMaterial(payload)
    toast.success("Material Created", {
      description: res.description || `"${payload.name}" created successfully`,
    })
    setIsAddOpen(false)
    await loadMaterials(true)
  }

  const handleEditClick = useCallback((material) => {
    if (editFetchRef.current) editFetchRef.current.abort()
    const controller = new AbortController()
    editFetchRef.current = controller

    setEditingMaterial({ ...material })
    setIsEditLoading(true)
    setIsEditOpen(true)

    fetchMaterialById(material.id, controller.signal)
      .then((full) => {
        if (!controller.signal.aborted) setEditingMaterial(full)
      })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          toast.error("Could not load material details", {
            description: formatMaterialError(err),
          })
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
    setEditingMaterial(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEdit = async (formData) => {
    const keycloakId = getCurrentUserKeycloakId()
    const payload = {}
    if (formData.name !== undefined) payload.name = formData.name.trim()
    if (formData.unit !== undefined) payload.unit = formData.unit.trim()
    if (formData.category !== undefined) payload.category = formData.category.trim()
    if (formData.description !== undefined) payload.description = formData.description.trim()
    if (keycloakId) payload.updatedBy = keycloakId

    const res = await editMaterial(editingMaterial.id, payload)
    toast.success("Material Updated", {
      description: res.description || "Material updated successfully",
    })
    handleCloseEdit()
    await loadMaterials(true)
  }

  const handleToggleStatus = useCallback(async (material) => {
    const keycloakId = getCurrentUserKeycloakId()
    try {
      const res = await toggleMaterialStatus(material.id, keycloakId || null)
      const updated = res.data
      toast.success("Status Updated", {
        description: `"${updated?.name}" is now ${updated?.isActive ? "active" : "inactive"}`,
      })
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === material.id ? { ...m, isActive: !m.isActive } : m
        )
      )
    } catch (err) {
      toast.error("Status Toggle Failed", {
        description: formatMaterialError(err),
      })
    }
  }, [])

  const handleDeleteClick = useCallback((material) => {
    setDeletingMaterial(material)
    setIsDeleteOpen(true)
  }, [])

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setTimeout(() => setDeletingMaterial(null), 250)
  }, [isDeleting])

  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return
    const keycloakId = getCurrentUserKeycloakId()
    setIsDeleting(true)
    try {
      const res = await deleteMaterial(deletingMaterial.id, keycloakId || null)
      toast.success("Material Deleted", {
        description:
          res.description ||
          `"${deletingMaterial.name}" deleted successfully`,
      })
      setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id))
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }))
      setIsDeleteOpen(false)
      setDeletingMaterial(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatMaterialError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isInitialLoad) return <Loading />

  return (
    <div  className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] rounded-lg p-4 ">
      <MaterialHeader
        title="Material Master List"
        badgeCount={pagination.total}
        description="Manage your company's material catalogue  add, edit, or deactivate materials."
        actionText="Add Material"
        ActionIcon={PlusSquare}
        filters={MATERIAL_FILTERS}
        onSearch={handleSearch}
        onFilter={handleFilter}
        onAction={() => setIsAddOpen(true)}
        isRefreshing={isRefreshing}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
        {stats.map((stat, index) => (
          <SummaryCard key={stat.id} item={stat} index={index} />
        ))}
      </div>

      <MaterialTable
        data={materials}
        pagination={pagination}
        isRefreshing={isRefreshing}
        isLoadingMore={isLoadingMore}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onToggleStatus={handleToggleStatus}
        onLoadMore={loadMore}
      />

      <AddMaterialModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewMaterial}
      />

      <EditMaterialModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        material={editingMaterial}
        isLoading={isEditLoading}
      />

      <DeleteMaterialModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        itemName={deletingMaterial?.name}
        title="Delete Material"
        description="This action cannot be undone. This will permanently remove this material from your catalogue."
        isLoading={isDeleting}
      />
    </div>
  )
}