"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  fetchPhasesData,
  fetchPhaseById,
  addPhase,
  editPhase,
  deletePhase,
  reorderPhases,
  getInitialActivePhase,
  removePhaseFromList,
  formatToastError,
  debounce,
  getCurrentUserKeycloakId,
  fetchProjectDates
} from "./api"
import PhasesHeader from "@/components/projects/(project)/phases/PhasesHeader"
import PhasesGrid from "@/components/projects/(project)/phases/PhasesGrid"
import PhasesLoading from "./loading"
import EditPhaseModal from "@/components/projects/(project)/phases/EditPhaseModal"
import DeleteModal from "@/components/ui/DeleteModal"
import PhaseDocumentsModal from "@/components/projects/(project)/phases/PhaseDocumentsModal"

export default function Phases() {
  const params = useParams()
  const projectId = params?.projectId

  const [phases, setPhases] = useState([])
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
    sortBy: "sequence",
    order: "asc",
    minCompletion: undefined,
    maxCompletion: undefined,
  })
  const [activePhase, setActivePhase] = useState(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)

  const [editingPhase, setEditingPhase] = useState(null)
  const [phaseToDelete, setPhaseToDelete] = useState(null)
  const [documentsPhase, setDocumentsPhase] = useState(null)
  const [projectDates, setProjectDates] = useState({ startDate: null, endDate: null })

  const filtersRef = useRef(filters)
  const isInitialLoadRef = useRef(true)
  const fetchLockRef = useRef(false)
  const controllerRef = useRef(null)
  const editFetchRef = useRef(null)
  const reorderTimeoutRef = useRef(null)
  const previousPhasesRef = useRef([])
  const sentinelRef = useRef(null)
  const hasMoreRef = useRef(true)
  filtersRef.current = filters

  const debouncedSetSearch = useRef(
    debounce((query) => {
      setFilters((prev) => ({ ...prev, search: query, page: 1 }))
    }, 400)
  ).current

  useEffect(() => {
    if (!projectId) return
    fetchProjectDates(projectId)
      .then((dates) => {
        setProjectDates(dates)
      })
      .catch(err => console.error("Failed to load project dates:", err))
  }, [projectId])

  const hasMore = pagination.page < pagination.totalPages

  const loadPhases = useCallback(
    async (loadMore = false) => {
      if (!projectId || fetchLockRef.current) return
      if (loadMore && !hasMoreRef.current) return
      fetchLockRef.current = true
      if (controllerRef.current) controllerRef.current.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const currentFilters = filtersRef.current
      const currentPage = loadMore ? currentFilters.page + 1 : 1
      try {
        if (loadMore) {
          setIsLoadingMore(true)
        } else if (!isInitialLoadRef.current) {
          setIsRefreshing(true)
        }
        const { phases: fetched, pagination: newPag } = await fetchPhasesData({
          projectId,
          ...currentFilters,
          page: currentPage,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        const sortedPhases = [...fetched].sort((a, b) => a.sequence - b.sequence)
        if (loadMore) {
          setPhases((prev) => {
            const existingIds = new Set(prev.map((p) => p.id))
            const newPhases = sortedPhases.filter((p) => !existingIds.has(p.id))
            const combined = [...prev, ...newPhases]
            return combined.sort((a, b) => a.sequence - b.sequence)
          })
        } else {
          setPhases(sortedPhases)
          previousPhasesRef.current = sortedPhases
          if (isInitialLoadRef.current && sortedPhases.length > 0) {
            setActivePhase(getInitialActivePhase(sortedPhases))
          }
        }
        setPagination(newPag)
        setFilters((prev) => ({ ...prev, page: currentPage }))
        hasMoreRef.current = currentPage < newPag.totalPages
      } catch (err) {
        if (err.name !== "CanceledError") {
          toast.error("Failed to load phases", { description: formatToastError(err) })
          if (!loadMore) {
            setPhases([])
            setActivePhase(null)
          }
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
    [projectId]
  )

  const loadMorePhases = useCallback(() => {
    if (!isLoadingMore && hasMoreRef.current && !fetchLockRef.current && !isReordering) {
      loadPhases(true)
    }
  }, [isLoadingMore, isReordering, loadPhases])

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
          !isReordering
        ) {
          loadMorePhases()
        }
      },
      { root: null, rootMargin: "100px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMorePhases, isLoadingMore, isReordering])

  useEffect(() => {
    hasMoreRef.current = true
    setFilters((prev) => ({ ...prev, page: 1 }))
    loadPhases(false)
    return () => controllerRef.current?.abort()
  }, [filters.search, filters.sortBy, filters.minCompletion, filters.maxCompletion, loadPhases])

  useEffect(() => {
    return () => {
      if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current)
      if (controllerRef.current) controllerRef.current.abort()
      if (editFetchRef.current) editFetchRef.current.abort()
    }
  }, [])

  const handleSearch = useCallback(
    (query) => debouncedSetSearch(query),
    [debouncedSetSearch]
  )

  const handleFilter = useCallback((selectedFilters) => {
    queueMicrotask(() => {
      const updates = {}
      const completionArr = selectedFilters?.completion
      if (Array.isArray(completionArr) && completionArr.length > 0) {
        const range = completionArr[completionArr.length - 1]
        const [min, max] = range.split("-").map(Number)
        updates.minCompletion = min
        updates.maxCompletion = max
      } else {
        updates.minCompletion = undefined
        updates.maxCompletion = undefined
      }
      const sortByArr = selectedFilters?.sortBy
      if (Array.isArray(sortByArr) && sortByArr.length > 0) {
        updates.sortBy = sortByArr[sortByArr.length - 1]
      } else {
        updates.sortBy = "sequence"
      }
      setFilters((prev) => ({ ...prev, ...updates, page: 1 }))
    })
  }, [])

  const handleAddPhaseClick = useCallback(() => setIsAddOpen(true), [])
  const handleCloseAdd = useCallback(() => setIsAddOpen(false), [])

  const handleSaveNewPhase = async (formData) => {
    if (!projectId) return
    try {
      const createdByKeycloakId = getCurrentUserKeycloakId()
      const payload = { ...formData, createdBy: createdByKeycloakId }
      const res = await addPhase(projectId, payload)
      toast.success("Phase Created", {
        description: res.description || "Phase has been created successfully",
      })
      hasMoreRef.current = true
      setFilters((prev) => ({ ...prev, page: 1 }))
      await loadPhases(false)
      setIsAddOpen(false)
    } catch (err) {
      toast.error("Create Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleEditPhaseClick = useCallback(
    (phase) => {
      if (!projectId) return
      if (editFetchRef.current) editFetchRef.current.abort()
      const controller = new AbortController()
      editFetchRef.current = controller
      setEditingPhase({ ...phase })
      setIsEditLoading(true)
      setIsEditOpen(true)
      fetchPhaseById(projectId, phase.id, controller.signal)
        .then((fullPhase) => {
          if (!controller.signal.aborted) setEditingPhase(fullPhase)
        })
        .catch((err) => {
          if (err.name !== "CanceledError") console.error("Failed to fetch phase details:", err)
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsEditLoading(false)
          if (editFetchRef.current === controller) editFetchRef.current = null
        })
    },
    [projectId]
  )

  const handleCloseEdit = useCallback(() => {
    if (editFetchRef.current) {
      editFetchRef.current.abort()
      editFetchRef.current = null
    }
    setIsEditOpen(false)
    setEditingPhase(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedPhase = async (formData) => {
    if (!projectId || !editingPhase) return
    try {
      const res = await editPhase(projectId, editingPhase.id, formData)
      toast.success("Phase Updated", {
        description: res.description || "Phase has been updated successfully",
      })
      hasMoreRef.current = true
      setFilters((prev) => ({ ...prev, page: 1 }))
      await loadPhases(false)
      handleCloseEdit()
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
      throw err
    }
  }

  const handleDeletePhase = useCallback((phase) => {
    setPhaseToDelete(phase)
    setIsDeleteModalOpen(true)
  }, [])

  const handleCloseDeleteModal = useCallback(() => {
    if (isDeleting) return
    setIsDeleteModalOpen(false)
    setTimeout(() => setPhaseToDelete(null), 250)
  }, [isDeleting])

  const confirmDeletePhase = async () => {
    if (!projectId || !phaseToDelete) return
    try {
      setIsDeleting(true)
      const res = await deletePhase(projectId, phaseToDelete.id)
      toast.success("Phase Deleted", {
        description: res.description || "Phase has been deleted successfully",
      })
      setPhases((prev) => removePhaseFromList(prev, phaseToDelete.id))
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      if (activePhase?.id === phaseToDelete.id) {
        setActivePhase(
          getInitialActivePhase(phases.filter((p) => p.id !== phaseToDelete.id))
        )
      }
      setIsDeleteModalOpen(false)
      setPhaseToDelete(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReorderPhases = useCallback(
    async (newOrder) => {
      if (!projectId || isReordering) return
      const previousOrder = [...phases]
      previousPhasesRef.current = previousOrder
      setPhases(newOrder)
      setIsReordering(true)
      if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current)
      reorderTimeoutRef.current = setTimeout(async () => {
        try {
          const phaseIds = newOrder.map((p) => p.id)
          await reorderPhases(projectId, phaseIds)
          toast.success("Phases Reordered", {
            description: "Phase order has been saved successfully",
            duration: 2000,
          })
          previousPhasesRef.current = newOrder
        } catch (err) {
          setPhases(previousOrder)
          toast.error("Reorder Failed", {
            description: formatToastError(err),
            duration: 4000,
          })
        } finally {
          setIsReordering(false)
        }
      }, 300)
    },
    [projectId, phases, isReordering]
  )

  const handleViewDocuments = useCallback((phase) => {
    setDocumentsPhase(phase)
    setIsDocumentsModalOpen(true)
  }, [])

  const handleCloseDocumentsModal = useCallback(() => {
    setIsDocumentsModalOpen(false)
    setTimeout(() => setDocumentsPhase(null), 300)
  }, [])


  if (isInitialLoad) return <PhasesLoading />

  return (
    <div className="w-full mx-auto p-4 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen transition-colors duration-300">
      <PhasesHeader
        count={phases.length}
        total={pagination.total}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
        onAddPhase={handleSaveNewPhase}
        isAddOpen={isAddOpen}
        onOpenAdd={handleAddPhaseClick}
        onCloseAdd={handleCloseAdd}
        isRefreshing={isRefreshing}
        projectDates={projectDates}
      />
      <PhasesGrid
        phases={phases}
        onEdit={handleEditPhaseClick}
        onDelete={handleDeletePhase}
        onReorder={handleReorderPhases}
        onViewDocuments={handleViewDocuments}
        isReordering={isReordering}
      />
      <div ref={sentinelRef} className="w-full py-4 flex flex-col items-center justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-sfpro">Loading more phases...</span>
          </div>
        )}
      </div>

      <EditPhaseModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEditedPhase}
        phase={editingPhase}
        isEditLoading={isEditLoading}
        projectStartDate={projectDates?.startDate}
        projectEndDate={projectDates?.endDate}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDeletePhase}
        title="Delete Phase"
        description="This action cannot be undone. This will permanently remove the phase and all its tasks from the system."
        itemName={phaseToDelete?.phaseName}
        isLoading={isDeleting}
      />

      <PhaseDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={handleCloseDocumentsModal}
        phase={documentsPhase}
        projectId={projectId}
      />
    </div>
  )
}