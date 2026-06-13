// app/vendors/page.js
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"

import {
  fetchVendors,
  fetchVendorById,
  addVendor,
  editVendor,
  deleteVendor,
  buildVendorFormData,
  formatVendorError,
  getCurrentUserKeycloakId,
  debounce,
} from "./api"

import VendorList from "@/components/vendors/VendorList"
import VendorDetails from "@/components/vendors/VendorDetails"
import Loading from "./loading"
import DeleteModal from "@/components/ui/DeleteModal"
import AddVendorModal from "@/components/vendors/AddVendorModal"
import EditVendorModal from "@/components/vendors/EditVendorModal"

export default function VendorsPage() {
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 })

  const [activeTab, setActiveTab] = useState("Overview")
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const [filters, setFilters] = useState({
    search: "", page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc", isActive: undefined, isVerified: undefined,
  })

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const [editingVendor, setEditingVendor] = useState(null)
  const [deletingVendor, setDeletingVendor] = useState(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const controllerRef = useRef(null)
  const detailRef = useRef(null)
  const editFetchRef = useRef(null)
  const isFirstRender = useRef(true)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const debouncedSetSearch = useRef(
    debounce((query) => {
      setFilters((prev) => ({ ...prev, search: query, page: 1 }))
    }, 400)
  ).current

  const loadVendors = useCallback(async (showRefresh = false) => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    if (showRefresh) setIsRefreshing(true)

    try {
      const { vendors: fetched, pagination: newPag } = await fetchVendors({
        ...filtersRef.current,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      setVendors(fetched)
      setPagination(newPag)
      if (isFirstRender.current && fetched.length > 0) {
        loadVendorDetail(fetched[0].id, controller.signal)
      }
    } catch (err) {
      if (err.name === "CanceledError") return
      toast.error("Failed to load vendors", { description: formatVendorError(err) })
    } finally {
      setIsInitialLoad(false)
      setIsRefreshing(false)
      controllerRef.current = null
    }
  }, [])
  const loadVendorDetail = useCallback(async (vendorId) => {
    if (!vendorId) return
    if (detailRef.current) detailRef.current.abort()
    const controller = new AbortController()
    detailRef.current = controller

    setIsDetailLoading(true)

    try {
      const full = await fetchVendorById(vendorId, controller.signal)
      if (!controller.signal.aborted) {
        setSelectedVendor(full)
        setActiveTab("Overview")
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        toast.error("Failed to load vendor details", {
          description: formatVendorError(err),
        })
      }
    } finally {
      if (!controller.signal.aborted) setIsDetailLoading(false)
      if (detailRef.current === controller) detailRef.current = null
    }
  }, [])
  useEffect(() => {
    loadVendors(false)
    return () => controllerRef.current?.abort()
  }, [loadVendors])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    loadVendors(true)
  }, [filters.search, filters.page, filters.sortBy, filters.sortOrder, filters.isActive, filters.isVerified, loadVendors])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      detailRef.current?.abort()
      editFetchRef.current?.abort()
    }
  }, [])
  const handleToggleVerify = useCallback(async (vendor) => {
    const keycloakId = getCurrentUserKeycloakId()
    try {
      const newVerified = !vendor.isVerified
      const fd = buildVendorFormData({
        isVerified: newVerified,
        updatedBy: keycloakId || undefined,
      })
      await editVendor(vendor.id, fd)

      toast.success(
        newVerified ? "Vendor Verified" : "Verification Removed",
        { description: `"${vendor.name}" is now ${newVerified ? "verified" : "unverified"}` }
      )
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendor.id ? { ...v, isVerified: newVerified } : v
        )
      )
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor((prev) =>
          prev ? { ...prev, isVerified: newVerified } : prev
        )
      }
    } catch (err) {
      toast.error("Failed to update verification", {
        description: formatVendorError(err),
      })
    }
  }, [selectedVendor])
  const handleFilter = useCallback((selected) => {
    const updates = {}
    const activeArr = selected?.isActive
    if (Array.isArray(activeArr) && activeArr.length > 0) {
      updates.isActive = activeArr[activeArr.length - 1]
    } else {
      updates.isActive = undefined
    }
    const verifiedArr = selected?.isVerified
    if (Array.isArray(verifiedArr) && verifiedArr.length > 0) {
      updates.isVerified = verifiedArr[verifiedArr.length - 1]
    } else {
      updates.isVerified = undefined
    }
    const sortArr = selected?.sortBy
    if (Array.isArray(sortArr) && sortArr.length > 0) {
      updates.sortBy = sortArr[sortArr.length - 1]
    } else {
      updates.sortBy = "createdAt"
    }
    setFilters((prev) => ({ ...prev, ...updates, page: 1 }))
  }, [])
  const handleSearch = useCallback(
    (query) => debouncedSetSearch(query),
    [debouncedSetSearch]
  )
  const handleSelectVendor = useCallback(
    (vendorId) => loadVendorDetail(vendorId),
    [loadVendorDetail]
  )
  const handleSaveNewVendor = async (formFields, photoFile) => {
    const keycloakId = getCurrentUserKeycloakId()
    const fd = buildVendorFormData(
      { ...formFields, createdBy: keycloakId },
      photoFile
    )
    const res = await addVendor(fd)
    toast.success("Vendor Created", {
      description: res.description || `"${formFields.name}" created successfully`,
    })
    setIsAddOpen(false)
    await loadVendors(true)
  }
  const handleEditClick = useCallback((vendor) => {
    if (editFetchRef.current) editFetchRef.current.abort()
    const controller = new AbortController()
    editFetchRef.current = controller
    setEditingVendor({ ...vendor })
    setIsEditLoading(true)
    setIsEditOpen(true)

    fetchVendorById(vendor.id, controller.signal)
      .then((full) => {
        if (!controller.signal.aborted) setEditingVendor(full)
      })
      .catch((err) => {
        if (err.name !== "CanceledError") {
          toast.error("Could not load vendor details", {
            description: formatVendorError(err),
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
    setEditingVendor(null)
    setIsEditLoading(false)
  }, [])
  const handleSaveEdit = async (formFields, photoFile) => {
    const keycloakId = getCurrentUserKeycloakId()
    const fd = buildVendorFormData(
      { ...formFields, updatedBy: keycloakId },
      photoFile
    )
    const res = await editVendor(editingVendor.id, fd)
    toast.success("Vendor Updated", {
      description: res.description || "Vendor updated successfully",
    })
    handleCloseEdit()
    await loadVendors(true)
    if (selectedVendor?.id === editingVendor.id) {
      loadVendorDetail(editingVendor.id)
    }
  }
  const handleDeleteClick = useCallback((vendor) => {
    setDeletingVendor(vendor)
    setIsDeleteOpen(true)
  }, [])

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteOpen(false)
    setTimeout(() => setDeletingVendor(null), 250)
  }, [isDeleting])

  const handleConfirmDelete = async () => {
    if (!deletingVendor) return
    const keycloakId = getCurrentUserKeycloakId()
    setIsDeleting(true)
    try {
      const res = await deleteVendor(deletingVendor.id, keycloakId || null)
      toast.success("Vendor Deleted", {
        description: res.description || `"${deletingVendor.name}" deleted successfully`,
      })
      setVendors((prev) => prev.filter((v) => v.id !== deletingVendor.id))
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      if (selectedVendor?.id === deletingVendor.id) setSelectedVendor(null)
      setIsDeleteOpen(false)
      setDeletingVendor(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatVendorError(err) })
    } finally {
      setIsDeleting(false)
    }
  }
  if (isInitialLoad) return <Loading />

  return (
    <div className="w-full mx-auto py-6 px-4 sm:px-8 bg-[#fdfdfd] dark:bg-[#09090b] min-h-screen font-sfpro">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        <div className="xl:col-span-4">
          <VendorList
            vendors={vendors}
            selectedId={selectedVendor?.id}
            onSelect={handleSelectVendor}
            onAdd={() => setIsAddOpen(true)}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onToggleVerify={handleToggleVerify}
            isRefreshing={isRefreshing}
          />
        </div>

        <div className="xl:col-span-8">
          <VendorDetails
            vendor={selectedVendor}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isLoading={isDetailLoading}
          />
        </div>

      </div>
      <AddVendorModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewVendor}
      />

      <EditVendorModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        vendor={editingVendor}
        isLoading={isEditLoading}
      />

      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Vendor"
        description="This action cannot be undone. This will permanently remove this vendor from your company."
        itemName={deletingVendor?.name}
        isLoading={isDeleting}
      />
    </div>
  )
}