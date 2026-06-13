"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { CloudUpload, Loader2 } from "lucide-react"
import {
  fetchDocumentsData,
  fetchDocumentById,
  uploadDocument,
  editDocument,
  deleteDocument,
  buildUploadFormData,
  removeDocumentFromList,
  formatToastError,
  debounce,
  DOCUMENT_CATEGORIES,
  FILE_TYPES,
} from "./api"
import PageHeader from "@/components/projects/(project)/documents/PageHeader"
import FolderGrid from "@/components/projects/(project)/documents/FolderGrid"
import Loading from "./loading"
import AddDocumentDrawer from "@/components/projects/(project)/documents/AddDocumentDrawer"
import EditDocumentModal from "@/components/projects/(project)/documents/EditDocumentModal"
import DeleteModal from "@/components/ui/DeleteModal"
import LinkDocumentModal from "@/components/projects/(project)/documents/LinkDocumentModal"
import UnlinkDocumentModal from "@/components/projects/(project)/documents/UnlinkDocumentModal"


function getResponseMessage(res, fallback = "Operation completed successfully") {
  if (!res) return fallback
  if (typeof res === "string") return res
  if (typeof res.message === "string") return res.message
  if (typeof res.description === "string") return res.description
  return fallback
}
export default function DocumentsPage() {
  const { projectId } = useParams()
  const [documents, setDocuments] = useState([])
  const [linkTarget, setLinkTarget] = useState(null)
  const [unlinkTarget, setUnlinkTarget] = useState(null)
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
    category: undefined,
    fileType: undefined,
    sortBy: "createdAt",
    order: "desc",
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const filtersRef = useRef(filters)
  const fetchLockRef = useRef(false)
  const controllerRef = useRef(null)
  const editFetchRef = useRef(null)
  const sentinelRef = useRef(null)
  const hasMoreRef = useRef(true)
  const isMountedRef = useRef(true)
  filtersRef.current = filters
  const debouncedSetSearch = useRef(
    debounce((query) => {
      setFilters((prev) => ({ ...prev, search: query, page: 1 }))
    }, 400)
  ).current
  const documentFilters = [
    {
      key: "category",
      label: "Category",
      options: DOCUMENT_CATEGORIES,
    },
    {
      key: "fileType",
      label: "File Type",
      options: FILE_TYPES,
    },
    {
      key: "sortBy",
      label: "Sort By",
      options: [
        { value: "createdAt", label: "Date Uploaded" },
        { value: "name", label: "Name" },
        { value: "fileSize", label: "File Size" },
        { value: "fileType", label: "File Type" },
      ],
    },
  ]
  const loadDocuments = useCallback(
    async (loadMore = false) => {
      if (!projectId || fetchLockRef.current) return
      if (loadMore && !hasMoreRef.current) return
      fetchLockRef.current = true
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
      const controller = new AbortController()
      controllerRef.current = controller
      const currentPage = loadMore ? filtersRef.current.page + 1 : 1
      try {
        if (loadMore) {
          setIsLoadingMore(true)
        } else {
          setIsRefreshing(true)
        }
        const { documents: fetched, pagination: newPag } = await fetchDocumentsData({
          projectId,
          ...filtersRef.current,
          page: currentPage,
          signal: controller.signal,
        })
        if (controller.signal.aborted || !isMountedRef.current) return
        if (loadMore) {
          setDocuments((prev) => [...prev, ...fetched])
        } else {
          setDocuments(fetched)
        }
        setPagination(newPag)
        setFilters((prev) => ({ ...prev, page: currentPage }))
        hasMoreRef.current = currentPage < newPag.totalPages
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") {
          return
        }
        console.error("Load documents error:", err)
        toast.error("Failed to load documents", {
          description: formatToastError(err),
        })
        if (!loadMore) setDocuments([])
      } finally {
        if (isMountedRef.current) {
          setIsInitialLoad(false)
          setIsRefreshing(false)
          setIsLoadingMore(false)
        }
        fetchLockRef.current = false
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    [projectId]
  )
  const loadMoreDocuments = useCallback(() => {
    if (!isLoadingMore && hasMoreRef.current && !fetchLockRef.current) {
      loadDocuments(true)
    }
  }, [isLoadingMore, loadDocuments])
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
          !fetchLockRef.current
        ) {
          loadMoreDocuments()
        }
      },
      { root: null, rootMargin: "100px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMoreDocuments, isLoadingMore])
  useEffect(() => {
    isMountedRef.current = true
    loadDocuments(false)
    return () => {
      isMountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])
  useEffect(() => {
    if (isInitialLoad) return
    hasMoreRef.current = true
    loadDocuments(false)
  }, [
    filters.search,
    filters.category,
    filters.fileType,
    filters.sortBy,
    filters.order,
  ])
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      editFetchRef.current?.abort()
    }
  }, [])
  const handleSearch = useCallback(
    (query) => debouncedSetSearch(query),
    [debouncedSetSearch]
  )
  const handleFilterChange = useCallback((selectedFilters) => {
    const updates = {}
    if (selectedFilters?.category?.length > 0) {
      updates.category =
        selectedFilters.category[selectedFilters.category.length - 1]
    } else {
      updates.category = undefined
    }
    if (selectedFilters?.fileType?.length > 0) {
      updates.fileType =
        selectedFilters.fileType[selectedFilters.fileType.length - 1]
    } else {
      updates.fileType = undefined
    }
    if (selectedFilters?.sortBy?.length > 0) {
      updates.sortBy =
        selectedFilters.sortBy[selectedFilters.sortBy.length - 1]
    }
    setFilters((prev) => ({ ...prev, ...updates, page: 1 }))
  }, [])


  const handleUploadDocument = async (payload) => {
    if (!projectId) return
    setIsUploading(true)
    try {
      const formData = buildUploadFormData({
        file: payload.file,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        tags: payload.tags || [],
      })
      const res = await uploadDocument(projectId, formData)
      toast.success("Document Uploaded", {
        description: getResponseMessage(res, "Document has been uploaded successfully"),
      })
      hasMoreRef.current = true
      setFilters((prev) => ({ ...prev, page: 1 }))
      await loadDocuments(false)
      setDrawerOpen(false)
    } catch (err) {
      toast.error("Upload Failed", { description: formatToastError(err) })
      throw err
    } finally {
      setIsUploading(false)
    }
  }


  const handleEditClick = useCallback(
    (doc) => {
      if (!projectId) return
      editFetchRef.current?.abort()
      const controller = new AbortController()
      editFetchRef.current = controller
      setEditingDocument({ ...doc })
      setIsEditLoading(true)
      setIsEditOpen(true)
      fetchDocumentById(projectId, doc.id, controller.signal)
        .then((fullDoc) => {
          if (!controller.signal.aborted) setEditingDocument(fullDoc)
        })
        .catch((err) => {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            console.error("Failed to fetch document details:", err)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsEditLoading(false)
          if (editFetchRef.current === controller) editFetchRef.current = null
        })
    },
    [projectId]
  )


  const handleCloseEdit = useCallback(() => {
    editFetchRef.current?.abort()
    editFetchRef.current = null
    setIsEditOpen(false)
    setEditingDocument(null)
    setIsEditLoading(false)
  }, [])
  const handleSaveEditedDocument = async (formData) => {
    if (!projectId || !editingDocument) return
    try {
      const res = await editDocument(projectId, editingDocument.id, formData)
      toast.success("Document Updated", {
        description: getResponseMessage(res, "Document has been updated successfully"),
      })
      hasMoreRef.current = true
      setFilters((prev) => ({ ...prev, page: 1 }))
      await loadDocuments(false)
      handleCloseEdit()
    } catch (err) {
      toast.error("Update Failed", { description: formatToastError(err) })
      throw err
    }
  }


  const handleDeleteClick = useCallback((doc) => {
    setDocumentToDelete(doc)
    setIsDeleteModalOpen(true)
  }, [])
  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return
    setIsDeleteModalOpen(false)
    setTimeout(() => setDocumentToDelete(null), 250)
  }, [isDeleting])
  const handleConfirmDelete = async () => {
    if (!projectId || !documentToDelete) return
    try {
      setIsDeleting(true)
      const res = await deleteDocument(projectId, documentToDelete.id)

      toast.success("Document Deleted", {
        description: getResponseMessage(res, "Document has been deleted successfully"),
      })

      setDocuments((prev) =>
        removeDocumentFromList(prev, documentToDelete.id)
      )
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      setIsDeleteModalOpen(false)
      setDocumentToDelete(null)
    } catch (err) {
      toast.error("Delete Failed", { description: formatToastError(err) })
    } finally {
      setIsDeleting(false)
    }
  }


  const handleRefresh = async () => {
    try {
      hasMoreRef.current = true
      setFilters((prev) => ({ ...prev, page: 1 }))
      await loadDocuments(false)
    } catch (err) {
      console.error("Refresh failed:", err)
    }
  }


  if (isInitialLoad) return <Loading />
  return (
    <div className="w-full  mx-auto py-8 px-4 flex flex-col gap-6 bg-[#FAFAFA] dark:bg-[#121212] rounded-lg  min-h-screen transition-colors duration-300">
      <PageHeader
        title="Documents"
        badge={pagination.total}
        description="Manage, view, and organize all your project files and assets in one place."
        searchPlaceholder="Search files or folders..."
        actionText={isUploading ? "Uploading..." : "Upload Document"}
        ActionIcon={CloudUpload}
        filters={documentFilters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onAction={() => setDrawerOpen(true)}
        isRefreshing={isRefreshing}
        actionDisabled={isUploading}
      />
      <FolderGrid
        folders={documents}
        projectId={projectId}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onLink={(doc) => setLinkTarget(doc)}
        onUnlink={(doc) => setUnlinkTarget(doc)}
      />
      <div
        ref={sentinelRef}
        className="w-full py-4 flex flex-col items-center justify-center"
      >
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-sfpro">Loading more documents...</span>
          </div>
        )}
        {!hasMoreRef.current && documents.length > 0 && !isLoadingMore && (
          <p className="text-sm text-gray-400 dark:text-gray-500 font-sfpro">
            You've reached the end
          </p>
        )}
      </div>
      <AddDocumentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleUploadDocument}
        isUploading={isUploading}
      />
      {isEditOpen && editingDocument && (
        <EditDocumentModal
          open={isEditOpen}
          onClose={handleCloseEdit}
          onSave={handleSaveEditedDocument}
          document={editingDocument}
          isEditLoading={isEditLoading}
        />
      )}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        description="This action cannot be undone. This will permanently remove the document from the system."
        itemName={documentToDelete?.title}
        isLoading={isDeleting}
      />

      <LinkDocumentModal
        isOpen={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        projectId={projectId}
        documentId={linkTarget?.id}
        documentName={linkTarget?.title}
        onSuccess={handleRefresh}
      />

      <UnlinkDocumentModal
        isOpen={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        projectId={projectId}
        documentId={unlinkTarget?.id}
        documentName={unlinkTarget?.title}
        onSuccess={handleRefresh}
      />

    </div>
  )
}