"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftRight } from "lucide-react"
import {
  fetchTransferById,
  fetchProjectLookup,
  fetchInventoryByProject,
  fetchStockMovements,
  createTransfer,
  editTransfer,
  deleteTransfer,
  approveTransfer,
  rejectTransfer,
  formatToastError,
} from "./api"
import StockTransferHeader from "@/components/projects/(project)/stockt_ransfer/StockTransferHeader"
import SummaryCard from "@/components/ui/SummaryCard"
import TransferCard from "@/components/projects/(project)/stockt_ransfer/TransferCard"
import AddTransferModal from "@/components/projects/(project)/stockt_ransfer/AddTransferModal"
import EditTransferModal from "@/components/projects/(project)/stockt_ransfer/EditTransferModal"
import DeleteModal from "@/components/ui/DeleteModal"
import RejectModal from "@/components/projects/(project)/stockt_ransfer/RejectModal"
import Loading from "./loading"

const LIMIT = 20

function debounce(fn, ms = 400) {
  let t
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

function getKcId() {
  return typeof window !== "undefined" ? localStorage.getItem("keycloakId") || "" : ""
}
function toCard(m) {
  return {
    id: m.id,
    _transferId: m.transfer?.id || null,
    _isMovement: true,

    type: m.movementType,
    date: m.formattedDate,
    material: m.materialName,
    quantity: `${m.quantity} ${m.unit}`,
    items: [{ materialName: m.materialName, quantity: m.quantity, unit: m.unit }],
    fromProject: m.fromProject?.name || "—",
    toProject: m.toProject?.name || "—",
    fromProjectId: m.fromProject?.id || null,
    toProjectId: m.toProject?.id || null,
    status: m.transfer?.status || m.status || "Draft",
    reason: m.transfer?.reason || "",
    remarks: m.transfer?.remarks || "",
    rejectionRemarks: "",

    createdBy: m.createdBy || { name: "Unknown", email: "", avatar: null },
    approvedBy: null,
    rejectedBy: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: m.createdAt || "",
    updatedAt: m.updatedAt || "",
  }
}
function computeStatsFromMovements(movements) {
  const uniqueTransfers = new Map()
  let totalUnits = 0

  movements.forEach((m) => {
    const tid = m.transfer?.id
    if (tid && !uniqueTransfers.has(tid)) {
      uniqueTransfers.set(tid, { status: m.transfer?.status || m.status || "Draft" })
    }
    if (m.movementType === "Outgoing") {
      totalUnits += m.quantity || 0
    }
  })

  const values = Array.from(uniqueTransfers.values())
  const totalTransfers = uniqueTransfers.size
  const draft = values.filter((t) => t.status === "Draft").length
  const approved = values.filter((t) => t.status === "Approved").length
  const rejected = values.filter((t) => t.status === "Rejected").length

  return [
    { id: 1, title: "Total Transfers", value: totalTransfers, subtitle: "Across all projects", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 2, title: "Pending Transfers", value: draft, subtitle: "Awaiting approval", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 3, title: "Approved Transfers", value: approved, subtitle: "Stock moved", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
    { id: 4, title: "Rejected Transfers", value: rejected, subtitle: "Declined transfers", colorClass: "bg-[#eef5fc] dark:bg-[#1a202c]" },
    { id: 5, title: "Material Units", value: totalUnits, subtitle: "Total units moved", colorClass: "bg-[#f2f3fa] dark:bg-[#1e1e2e]" },
  ]
}
export default function StockTransferPage() {
  const { projectId } = useParams()
  const [movements, setMovements] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, hasNext: false })
  const [stats, setStats] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilters, setSelectedFilters] = useState({
    status: "", movementType: "", sortBy: "createdAt", order: "desc",
  })
  const [projects, setProjects] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [approvingId, setApprovingId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [toReject, setToReject] = useState(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const mainCtrl = useRef(null)
  const editCtrl = useRef(null)
  const dataCtrl = useRef(null)
  const searchRef = useRef(searchQuery)
  const filtersRef = useRef(selectedFilters)
  searchRef.current = searchQuery
  filtersRef.current = selectedFilters
  const allCards = useMemo(() => {
    const dir = filtersRef.current.order === "asc" ? 1 : -1

    return [...movements]
      .filter((m) => {
        if (m.movementType === "Incoming") {
          const transferStatus = m.transfer?.status || m.status || "Draft"
          return transferStatus === "Approved"
        }
        return true
      })
      .sort((a, b) => (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) * dir)
      .map(toCard)
  }, [movements])
  const loadAll = useCallback(async (
    search = "",
    showRefresh = false,
    filters = filtersRef.current,
  ) => {
    mainCtrl.current?.abort()
    const ctrl = new AbortController()
    mainCtrl.current = ctrl

    if (showRefresh) setIsRefreshing(true)
    setError(null)

    const { status, movementType, sortBy = "createdAt", order = "desc" } = filters

    try {
      const { movements: fetched, pagination: pag } = await fetchStockMovements({
        page: 1,
        limit: LIMIT,
        search,
        status: status || undefined,
        movementType: movementType || undefined,
        projectId: projectId || undefined,
        sortBy,
        order,
        signal: ctrl.signal,
      })

      if (ctrl.signal.aborted) return

      setMovements(fetched)
      setPagination(pag)
      setStats(computeStatsFromMovements(fetched))
    } catch (err) {
      if (err.name === "CanceledError") return
      setError(err.message || "Failed to load stock movements")
      toast.error("Failed to load movements", { description: formatToastError(err) })
    } finally {
      if (!ctrl.signal.aborted) {
        setIsInitialLoad(false)
        setIsRefreshing(false)
      }
    }
  }, [projectId])
  const loadSupportingData = useCallback(async (force = false) => {
    if (!projectId) return
    if (!force && projects.length > 0 && inventoryItems.length > 0) return

    dataCtrl.current?.abort()
    const ctrl = new AbortController()
    dataCtrl.current = ctrl
    setIsLoadingProjects(true)
    setIsLoadingInventory(true)

    const [pRes, iRes] = await Promise.allSettled([
      fetchProjectLookup(ctrl.signal),
      fetchInventoryByProject(projectId, ctrl.signal),
    ])

    if (ctrl.signal.aborted) return
    if (pRes.status === "fulfilled") setProjects(pRes.value)
    if (iRes.status === "fulfilled") setInventoryItems(iRes.value)
    setIsLoadingProjects(false)
    setIsLoadingInventory(false)
  }, [projectId, projects.length, inventoryItems.length])
  const debouncedSearch = useRef(
    debounce((q) => loadAll(q, true, filtersRef.current))
  ).current

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    debouncedSearch(q)
  }, [debouncedSearch])

  const handleFilterChange = useCallback((f) => {
    const next = {
      status: f.status || "",
      movementType: f.movementType || "",
      sortBy: f.sortBy || "createdAt",
      order: f.order || "desc",
    }
    setSelectedFilters(next)
    filtersRef.current = next
    loadAll(searchRef.current, true, next)
  }, [loadAll])
  useEffect(() => { loadAll("", false, filtersRef.current) }, [loadAll])
  useEffect(() => () => {
    mainCtrl.current?.abort()
    editCtrl.current?.abort()
    dataCtrl.current?.abort()
  }, [])
  const handleSaveNewTransfer = async (payload) => {
    if (!projectId) {
      toast.error("Project context missing")
      throw new Error("No project context")
    }
    const res = await createTransfer(projectId, { ...payload, createdBy: getKcId() })
    toast.success("Transfer Created", { description: res.description || "Created as Draft" })
    setAddOpen(false)
    await loadAll(searchRef.current, true, filtersRef.current)
  }
  const handleEditClick = useCallback((card) => {
    if (card.status === "Approved") {
      return toast.error("Cannot edit", { description: "Approved transfers are immutable" })
    }

    const transferId = card._transferId
    const fromProjectId = card.fromProjectId

    if (!transferId) {
      return toast.error("Cannot edit", { description: "Transfer ID is missing" })
    }
    if (!fromProjectId) {
      return toast.error("Cannot edit", { description: "Source project ID is missing" })
    }

    editCtrl.current?.abort()
    const ctrl = new AbortController()
    editCtrl.current = ctrl

    setEditingTransfer({ ...card })
    setIsEditLoading(true)
    setEditOpen(true)
    loadSupportingData()

    fetchTransferById(fromProjectId, transferId, ctrl.signal)
      .then((full) => {
        if (!ctrl.signal.aborted) {
          setEditingTransfer({
            ...full,
            _transferId: full._transferId || transferId,
            fromProjectId: full.fromProjectId || fromProjectId,
          })
        }
      })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          toast.error("Warning", { description: "Could not load full transfer details" })
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsEditLoading(false)
        if (editCtrl.current === ctrl) editCtrl.current = null
      })
  }, [loadSupportingData])

  const handleCloseEdit = useCallback(() => {
    editCtrl.current?.abort()
    editCtrl.current = null
    setEditOpen(false)
    setEditingTransfer(null)
    setIsEditLoading(false)
  }, [])

  const handleSaveEditedTransfer = async (payload) => {
    const fromProjectId = editingTransfer?.fromProjectId
    const transferId = editingTransfer?._transferId

    if (!transferId) {
      toast.error("Cannot save", { description: "Transfer ID is missing" })
      return
    }
    if (!fromProjectId) {
      toast.error("Cannot save", { description: "Source project ID is missing" })
      return
    }

    try {
      const res = await editTransfer(
        fromProjectId,
        transferId,
        { ...payload, updatedBy: getKcId() }
      )
      toast.success("Transfer Updated", { description: res.description || "Updated successfully" })
      await loadAll(searchRef.current, true, filtersRef.current)
      handleCloseEdit()
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
    }
  }
  const handleApproveClick = useCallback(async (card) => {
    if (card.status !== "Draft") {
      toast.error("Cannot approve", { description: "Only Draft transfers can be approved" })
      return
    }

    const transferId = card._transferId
    const fromProjectId = card.fromProjectId
    const kcId = getKcId()

    if (!transferId) {
      toast.error("Cannot approve", { description: "Transfer ID is missing" })
      return
    }
    if (!fromProjectId) {
      toast.error("Cannot approve", { description: "Source project ID is missing" })
      return
    }
    if (!kcId) {
      toast.error("Cannot approve", { description: "User session not found. Please log in again." })
      return
    }

    setApprovingId(card.id)
    try {
      await approveTransfer(fromProjectId, transferId, kcId)
      toast.success("Transfer Approved", { description: "Stock moved to destination project" })
      await loadAll(searchRef.current, true, filtersRef.current)
    } catch (err) {
      toast.error("Approval Failed", { description: formatToastError(err) })
    } finally {
      setApprovingId(null)
    }
  }, [loadAll])
  const handleRejectClick = useCallback((card) => {
    if (card.status !== "Draft") {
      toast.error("Cannot reject", { description: "Only Draft transfers can be rejected" })
      return
    }
    setToReject(card)
    setRejectOpen(true)
  }, [])

  const handleConfirmReject = async (remarks = "") => {
    if (!toReject) return

    const transferId = toReject._transferId
    const fromProjectId = toReject.fromProjectId
    const kcId = getKcId()

    if (!transferId || !fromProjectId || !kcId) {
      toast.error("Rejection Failed", { description: "Required information is missing" })
      return
    }

    setIsRejecting(true)
    try {
      await rejectTransfer(fromProjectId, transferId, kcId, remarks)
      toast.success("Transfer Rejected")
      await loadAll(searchRef.current, true, filtersRef.current)
      setRejectOpen(false)
      setToReject(null)
    } catch (err) {
      toast.error("Rejection Failed", { description: formatToastError(err) })
    } finally {
      setIsRejecting(false)
    }
  }
  const handleDeleteClick = useCallback((card) => {
    if (card.status === "Approved") {
      return toast.error("Cannot delete", { description: "Approved transfers are immutable" })
    }
    if (!card._transferId || !card.fromProjectId) {
      return toast.error("Cannot delete", { description: "Transfer details are missing" })
    }
    setToDelete(card)
    setDeleteOpen(true)
  }, [])

  const handleConfirmDelete = async () => {
    if (!toDelete) return

    const transferId = toDelete._transferId
    const fromProjectId = toDelete.fromProjectId
    if (!transferId || !fromProjectId) return

    setIsDeleting(true)
    try {
      await deleteTransfer(fromProjectId, transferId, getKcId())
      toast.success("Transfer Deleted")
      await loadAll(searchRef.current, true, filtersRef.current)
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }
  if (isInitialLoad) return <Loading />
  return (
    <div className="w-full mx-auto p-4 flex flex-col gap-2 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg min-h-screen font-sfpro">
      <StockTransferHeader
        title="Stock Transfer"
        description="Manage and track material transfers across projects"
        count={allCards.length}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onAction={() => { setAddOpen(true); loadSupportingData() }}
        isRefreshing={isRefreshing}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {stats.map((stat, i) => (
          <SummaryCard key={stat.id} item={stat} index={i} />
        ))}
      </div>
      {error && !isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-gray-400 dark:text-[#71717a]">{error}</p>
          <button
            onClick={() => loadAll(searchQuery, true, filtersRef.current)}
            className="text-sm underline underline-offset-2 text-gray-600 dark:text-gray-300"
          >
            Try again
          </button>
        </div>
      ) : allCards.length === 0 && !isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ArrowLeftRight className="w-10 h-10 text-gray-300 dark:text-[#3f3f46]" />
          <p className="text-sm text-gray-400 dark:text-[#71717a]">
            {searchQuery
              ? `No transfers found for "${searchQuery}"`
              : selectedFilters.status || selectedFilters.movementType
                ? "No transfers match the selected filters"
                : "No stock transfers yet"}
          </p>
        </div>
      ) : (
        <div
          className="grid gap-5 pb-10"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {isRefreshing
            ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 rounded-3xl bg-gray-100 dark:bg-[#1c1c1c] animate-pulse" />
            ))
            : allCards.map((card) => (
              <TransferCard
                key={card.id}
                transfer={card}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                isApproving={approvingId === card.id}
              />
            ))}
        </div>
      )}
      <AddTransferModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveNewTransfer}
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        inventoryItems={inventoryItems}
        isLoadingInventory={isLoadingInventory}
        fromProjectId={projectId}
      />
      <EditTransferModal
        open={editOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEditedTransfer}
        transfer={editingTransfer}
        isEditLoading={isEditLoading}
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        inventoryItems={inventoryItems}
        isLoadingInventory={isLoadingInventory}
        fromProjectId={projectId}
      />
      <RejectModal
        isOpen={rejectOpen}
        onClose={() => {
          if (!isRejecting) {
            setRejectOpen(false)
            setTimeout(() => setToReject(null), 250)
          }
        }}
        onConfirm={handleConfirmReject}
        transfer={toReject}
        isLoading={isRejecting}
      />
      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false)
            setTimeout(() => setToDelete(null), 250)
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Transfer"
        description="This action cannot be undone. This will permanently remove the stock transfer."
        itemName={toDelete?.material}
        isLoading={isDeleting}
      />
    </div>
  )
}