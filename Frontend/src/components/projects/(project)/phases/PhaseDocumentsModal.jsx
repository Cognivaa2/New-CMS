"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { X, Search, Loader2, FileText, File, FileImage, FileType, Folder } from "lucide-react"
import { fetchPhaseDocuments, formatToastError, debounce } from "@/app/(companyname)/projects/[projectId]/phases/api"
import DocumentViewerModal from "@/components/projects/(project)/documents/DocumentViewerModal"


function getFileIcon(type, mimeType) {
    const t = type?.toLowerCase() || ""
    const m = mimeType?.toLowerCase() || ""
    if (t === "pdf" || m === "application/pdf") return FileType
    if (t === "image" || m.startsWith("image/")) return FileImage
    return File
}

function getFileTypeLabel(type, mimeType) {
    const t = type?.toLowerCase() || ""
    if (t === "pdf") return "PDF"
    if (t === "image") return "Image"
    if (t && t !== "other") return t.toUpperCase()
    return "File"
}

function getInitials(name = "") {
    const src = name?.trim() || "U"
    const parts = src.split(" ")
    return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : src[0].toUpperCase()
}

function AuthorAvatar({ name, avatarUrl }) {
    return (
        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-[8px] font-sfpro-bold text-gray-500 dark:text-[#888]">
                    {getInitials(name)}
                </span>
            )}
        </div>
    )
}

function SkeletonRows({ count = 5 }) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#222] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
                <div className="h-3.5 w-40 bg-gray-100 dark:bg-[#222] rounded animate-pulse" />
                <div className="h-2.5 w-24 bg-gray-100 dark:bg-[#222] rounded animate-pulse" />
            </div>
            <div className="h-6 w-14 bg-gray-100 dark:bg-[#222] rounded-full animate-pulse shrink-0" />
        </div>
    ))
}


function DocumentRow({ doc, onView }) {
    const typeLabel = getFileTypeLabel(doc.type, doc.mimeType)
    return (
        <button onClick={() => onView(doc)} className="cursor-pointer w-full flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors duration-150 text-left group">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#2c2c2e] flex items-center justify-center shrink-0 group-hover:border-gray-300 dark:group-hover:border-[#3a3a3a] transition-colors">
                <Folder className="w-4 h-4 dark:text-blue-500 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-sfpro-bold text-gray-900 dark:text-white truncate leading-tight">
                    {doc.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11.5px] font-sfpro text-gray-400 dark:text-[#666] shrink-0">
                        {doc.date}
                    </span>
                    {doc.size && doc.size !== "0 B" && (
                        <>
                            <span className="text-gray-300 dark:text-[#444]">·</span>
                            <span className="text-[11.5px] font-sfpro text-gray-400 dark:text-[#666] shrink-0">
                                {doc.size}
                            </span>
                        </>
                    )}
                </div>
            </div>
            <span className="shrink-0 text-[11px] font-sfpro-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-gray-500 dark:text-[#888] uppercase tracking-wide">
                {typeLabel}
            </span>
        </button>
    )
}


export default function PhaseDocumentsModal({ isOpen, onClose, phase, projectId }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [documents, setDocuments] = useState([])
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingMore, setIsFetchingMore] = useState(false)
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [viewerDoc, setViewerDoc] = useState(null)
    const [isViewerOpen, setIsViewerOpen] = useState(false)
    const searchInputRef = useRef(null)
    const fetchControllerRef = useRef(null)
    const scrollContainerRef = useRef(null)
    const sentinelRef = useRef(null)
    const observerRef = useRef(null)

    const phaseId = phase?.id

    const debouncedSetQuery = useRef(
        debounce((val) => {
            setDebouncedQuery(val)
            setCurrentPage(1)
            setDocuments([])
        }, 400)
    ).current

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            setQuery("")
            setDebouncedQuery("")
            setCurrentPage(1)
            setDocuments([])
            setHasMore(false)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setDocuments([])
                setPagination({ page: 1, totalPages: 1, total: 0 })
                setHasMore(false)
            }, 300)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen || !projectId || !phaseId) return
        if (fetchControllerRef.current) fetchControllerRef.current.abort()
        const controller = new AbortController()
        fetchControllerRef.current = controller

        const isFirstPage = currentPage === 1
        if (isFirstPage) {
            setIsLoading(true)
        } else {
            setIsFetchingMore(true)
        }

        fetchPhaseDocuments({
            projectId,
            phaseId,
            page: currentPage,
            limit: 5,
            search: debouncedQuery,
            signal: controller.signal,
        })
            .then(({ documents: docs, pagination: pag }) => {
                if (!controller.signal.aborted) {
                    setDocuments((prev) => isFirstPage ? docs : [...prev, ...docs])
                    setPagination(pag)
                    setHasMore(pag.page < pag.totalPages)
                }
            })
            .catch((err) => {
                if (err.name !== "CanceledError") {
                    if (isFirstPage) setDocuments([])
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                    setIsFetchingMore(false)
                }
            })

        return () => controller.abort()
    }, [isOpen, projectId, phaseId, currentPage, debouncedQuery])

    useEffect(() => {
        if (!sentinelRef.current || !hasMore || isFetchingMore || isLoading) return
        observerRef.current?.disconnect()
        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
                    setCurrentPage((p) => p + 1)
                }
            },
            { root: scrollContainerRef.current, threshold: 0.1 }
        )
        observerRef.current.observe(sentinelRef.current)
        return () => observerRef.current?.disconnect()
    }, [hasMore, isFetchingMore, isLoading, documents])

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape" && isOpen && !isViewerOpen) onClose()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, isViewerOpen, onClose])

    useEffect(() => {
        return () => fetchControllerRef.current?.abort()
    }, [])

    const handleQueryChange = (e) => {
        const val = e.target.value
        setQuery(val)
        debouncedSetQuery(val)
    }

    const clearSearch = () => {
        setQuery("")
        setDebouncedQuery("")
        setCurrentPage(1)
        setDocuments([])
        searchInputRef.current?.focus()
    }

    const handleViewDoc = useCallback((doc) => {
        setViewerDoc({ ...doc, projectId })
        setIsViewerOpen(true)
    }, [projectId])

    const handleCloseViewer = useCallback(() => {
        setIsViewerOpen(false)
        setTimeout(() => setViewerDoc(null), 420)
    }, [])

    if (!mounted) return null

    const isEmpty = !isLoading && documents.length === 0

    return (
        <>
            <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div onClick={onClose} className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />

                <div className={`relative w-full max-w-135 bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"}`}>
                    <div className="flex items-start gap-4 p-6 pb-4">
                        <div className="flex-1 relative" ref={searchInputRef}>
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E] bg-gray-50/50 dark:bg-[#1A1A1A] focus-within:bg-white dark:focus-within:bg-[#1C1C1E] focus-within:border-gray-300 dark:focus-within:border-[#444] focus-within:shadow-sm transition-all">
                                {isLoading && query ? (
                                    <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
                                ) : (
                                    <Search size={16} className="text-gray-400 shrink-0" />
                                )}
                                <input
                                    type="text"
                                    value={query}
                                    onChange={handleQueryChange}
                                    placeholder="Search documents..."
                                    className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none font-sfpro min-w-0"
                                />
                                {query && (
                                    <button onClick={clearSearch} className="flex items-center justify-center p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                                        <X size={14} className="text-gray-500" strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <button onClick={onClose} className="p-1 rounded-full bg-[#212121] dark:bg-white transition-colors shrink-0 flex items-center justify-center mt-2 hover:scale-90 duration-200 cursor-pointer">
                            <X size={16} className="text-white dark:text-black" strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="px-6 pb-5 mt-2">
                        <h2 className="text-lg font-sfpro-bold text-gray-900 dark:text-white tracking-tight">Phase Documents</h2>
                        <p className="text-sm text-gray-500 dark:text-[#8d8d8d] mt-1 font-sfpro">Lorem ipsum dolor sit amet, consectetur adipiscing elit, </p>
                    </div>

                    <div className="px-6 py-5">
                        <p className="text-[12px] font-sfpro-bold text-gray-400 dark:text-[#666] uppercase tracking-wider mb-3">
                            {debouncedQuery ? `Results for "${debouncedQuery}"` : "All documents"}
                        </p>

                        <div ref={scrollContainerRef} className="min-h-60 max-h-80 overflow-y-auto -mx-2 px-2 space-y-0.5 scrollbar-hide">
                            {isLoading ? (
                                <SkeletonRows count={5} />
                            ) : isEmpty ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] flex items-center justify-center">
                                        <FileText size={20} className="text-gray-400 dark:text-[#555]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[13.5px] text-gray-500 dark:text-[#888] font-sfpro">
                                            {debouncedQuery
                                                ? `No documents found for "${debouncedQuery}"`
                                                : "No documents linked to this phase"}
                                        </p>
                                        {debouncedQuery && (
                                            <button onClick={clearSearch} className="mt-2 text-[12.5px] font-sfpro-medium text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white underline underline-offset-2 transition-colors">
                                                Clear search
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {documents.map((doc) => (
                                        <DocumentRow key={doc.id} doc={doc} onView={handleViewDoc} />
                                    ))}
                                    <div ref={sentinelRef} className="h-1" />
                                    {isFetchingMore && (
                                        <div className="flex justify-center py-3">
                                            <Loader2 size={16} className="text-gray-400 dark:text-[#555] animate-spin" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <DocumentViewerModal
                doc={viewerDoc}
                open={isViewerOpen}
                onClose={handleCloseViewer}
            />
        </>
    )
}