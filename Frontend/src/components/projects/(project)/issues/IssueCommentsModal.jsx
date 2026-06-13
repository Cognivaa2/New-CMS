"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import {
    X, Send, Loader2, MessageSquare,
    Pencil, Trash2, MoreHorizontal, Check, Search
} from "lucide-react"
import {
    fetchComments,
    addComment,
    editComment,
    deleteComment,
    getCurrentUserKeycloakId,
    formatToastError,
} from "@/app/(companyname)/projects/[projectId]/issues/api"
import DeleteModal from "@/components/ui/DeleteModal"
import ThreeDotMenu from "@/components/ui/ThreeDotMenu"

function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function timeAgo(dateString) {
    if (!dateString) return ""
    const now = new Date()
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return "Just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

function Avatar({ user, size = 28 }) {
    const [imageError, setImageError] = useState(false)
    const hasAvatar = user?.avatar && user.avatar.trim() !== "" && !imageError
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gray-100 dark:bg-[#222] border border-gray-200/50 dark:border-[#333] flex items-center justify-center overflow-hidden shrink-0"
        >
            {hasAvatar ? (
                <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className="text-[9px] font-sfpro-bold text-gray-500 dark:text-[#888]">
                    {getInitials(user?.name)}
                </span>
            )}
        </div>
    )
}

function CommentSkeleton({ count = 3 }) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex gap-3 p-3 animate-pulse ${i % 2 === 0 ? "flex-row" : "flex-row-reverse"}`}>
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#1A1A1A] shrink-0" />
            <div className={`space-y-2 max-w-[70%] ${i % 2 === 0 ? "items-start" : "items-end flex flex-col"}`}>
                <div className="h-10 w-48 bg-gray-100 dark:bg-[#1A1A1A] rounded-2xl" />
                <div className="h-2 w-12 bg-gray-100 dark:bg-[#1A1A1A] rounded" />
            </div>
        </div>
    ))
}

function CommentItem({
    comment,
    currentUserId,
    onEdit,
    onDelete,
    isEditing,
    editText,
    setEditText,
    onSaveEdit,
    onCancelEdit,
    isSavingEdit,
}) {
    const isOwner = comment.createdBy?.keycloakId === currentUserId

    const menuItems = [
        {
            label: "Edit",
            icon: <Pencil size={14} />,
            onClick: () => onEdit(comment)
        },
        {
            label: "Delete",
            icon: <Trash2 size={14} />,
            variant: "danger",
            onClick: () => onDelete(comment)
        }
    ]

    return (
        <div className={`group flex gap-2.5 mb-5 ${isOwner ? "flex-row-reverse" : "flex-row"}`}>
            <div className="shrink-0 flex items-end mb-1">
                <Avatar user={comment.createdBy} size={28} />
            </div>

            <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] ${isOwner ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-2 mb-1 px-1 ${isOwner ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[11px] font-sfpro-bold text-gray-900 dark:text-white/90">
                        {comment.createdBy?.name || "Unknown"}
                    </span>
                    <span className="text-[10px] font-sfpro text-gray-400 dark:text-[#555]">
                        {timeAgo(comment.rawCreatedAt)}
                    </span>
                </div>

                <div className={`relative flex items-center gap-2 ${isOwner ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`
                        px-4 py-2.5 rounded-[20px] text-[13.5px] font-sfpro leading-relaxed transition-all shadow-sm
                        ${isOwner
                            ? "bg-gray-100 dark:bg-[#222] text-gray-900 dark:text-gray-100 rounded-tr-none"
                            : "bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#272727] text-gray-800 dark:text-gray-200 rounded-tl-none"}
                    `}>
                        {isEditing ? (
                            <div className="min-w-50 py-1">
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={2}
                                    autoFocus
                                    className="w-full bg-transparent text-[13.5px] font-sfpro outline-none resize-none border-b border-gray-300 dark:border-[#444] mb-2"
                                />
                                <div className="flex items-center gap-2">
                                    <button onClick={onSaveEdit} disabled={isSavingEdit} className="text-[11px] font-sfpro-bold text-gray-900 dark:text-white cursor-pointer">
                                        {isSavingEdit ? "Saving..." : "Save"}
                                    </button>
                                    <button onClick={onCancelEdit} className="text-[11px] font-sfpro-medium text-gray-400 cursor-pointer">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <p className="whitespace-pre-wrap warp-break-words">{comment.text}</p>
                        )}
                    </div>

                    {isOwner && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ThreeDotMenu items={menuItems} size="sm" />
                        </div>
                    )}
                </div>

                {comment.editedAt && (
                    <span className="text-[9px] font-sfpro italic text-gray-300 dark:text-[#333] mt-1 px-1">edited</span>
                )}
            </div>
        </div>
    )
}

export default function IssueCommentsModal({ isOpen, onClose, issueId, issueTitle }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [comments, setComments] = useState([])
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingMore, setIsFetchingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [reloadTrigger, setReloadTrigger] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [newText, setNewText] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState("")
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const scrollRef = useRef(null)
    const sentinelRef = useRef(null)
    const textareaRef = useRef(null)
    const fetchControllerRef = useRef(null)

    const currentUserId = getCurrentUserKeycloakId()

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1)
            setComments([])
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setComments([])
                setSearchQuery("")
            }, 300)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen || !issueId) return
        if (fetchControllerRef.current) fetchControllerRef.current.abort()
        const ctrl = new AbortController()
        fetchControllerRef.current = ctrl
        const isFirst = currentPage === 1
        if (isFirst) setIsLoading(true)
        else setIsFetchingMore(true)

        fetchComments(issueId, { page: currentPage, limit: 20, search: debouncedSearch }, ctrl.signal)
            .then(({ comments: fetched, pagination: pag }) => {
                if (!ctrl.signal.aborted) {
                    setComments((prev) => isFirst ? fetched : [...prev, ...fetched])
                    setPagination(pag)
                    setHasMore(pag.page < pag.totalPages)
                }
            })
            .catch((err) => {
                if (err.name !== "CanceledError") console.error(err)
            })
            .finally(() => {
                if (!ctrl.signal.aborted) {
                    setIsLoading(false)
                    setIsFetchingMore(false)
                }
            })
        return () => ctrl.abort()
    }, [isOpen, issueId, currentPage, reloadTrigger, debouncedSearch])

    useEffect(() => {
        if (!sentinelRef.current || !hasMore || isFetchingMore || isLoading) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
                    setCurrentPage((p) => p + 1)
                }
            },
            { root: scrollRef.current, threshold: 0.1 }
        )
        observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [hasMore, isFetchingMore, isLoading, comments])

    const handleSend = async () => {
        const text = newText.trim()
        if (!text || isSending) return
        setIsSending(true)
        try {
            await addComment(issueId, { text })
            setNewText("")
            setCurrentPage(1)
            setComments([])
            setReloadTrigger((t) => t + 1)
        } catch (err) {
            toast.error("Failed to add comment", { description: formatToastError(err) })
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const saveEdit = async () => {
        if (!editText?.trim() || isSavingEdit) return
        setIsSavingEdit(true)
        try {
            await editComment(issueId, editingId, { text: editText })
            setComments((prev) =>
                prev.map((c) =>
                    c.id === editingId ? { ...c, text: editText.trim(), editedAt: new Date().toISOString() } : c
                )
            )
            setEditingId(null)
            toast.success("Updated")
        } catch (err) {
            toast.error("Failed to edit", { description: formatToastError(err) })
        } finally {
            setIsSavingEdit(false)
        }
    }

    const confirmDelete = async () => {
        if (!deleteTarget || isDeleting) return
        setIsDeleting(true)
        try {
            await deleteComment(issueId, deleteTarget.id)
            setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id))
            setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }))
            setDeleteTarget(null)
            toast.success("Deleted")
        } catch (err) {
            toast.error("Failed to delete", { description: formatToastError(err) })
        } finally {
            setIsDeleting(false)
        }
    }

    if (!mounted) return null

    return (
        <>
            <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div onClick={onClose} className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
                />

                <div className={`relative w-full max-w-135 bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col max-h-[85vh] ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"}`}>

                    <div className="px-6 p-6">
                        <h2 className="text-[18px] font-sfpro-bold text-gray-900 dark:text-white tracking-tight">
                            Comments
                        </h2>
                        <p className="text-[13px] text-gray-500 dark:text-[#888] font-sfpro mt-0.5 truncate">
                            {issueTitle || "Discussion thread"}
                        </p>
                    </div>

                    <div className="flex items-start gap-4 px-6 pb-4 shrink-0">
                        <div className="flex-1 relative">
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E] bg-gray-50/50 dark:bg-[#1A1A1A] focus-within:bg-white dark:focus-within:bg-[#1C1C1E] focus-within:border-gray-300 dark:focus-within:border-[#444] focus-within:shadow-sm transition-all">
                                {isLoading && searchQuery ? (
                                    <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
                                ) : (
                                    <Search size={16} className="text-gray-400 shrink-0" />
                                )}
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search comments..."
                                    className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none font-sfpro min-w-0"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#333]">
                                        <X size={14} className="text-gray-500" strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-gray-900 dark:bg-white transition-transform hover:scale-90 duration-200 mt-2"
                        >
                            <X size={14} className="text-white dark:text-black" strokeWidth={3} />
                        </button>
                    </div>


                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ scrollbarWidth: "none" }}>
                        <p className="px-2 pb-2 text-[11px] font-sfpro-bold text-gray-400 dark:text-[#555] uppercase tracking-wider">
                            {pagination.total} {pagination.total === 1 ? 'Comment' : 'Comments'}
                        </p>

                        {isLoading ? (
                            <CommentSkeleton count={4} />
                        ) : comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] flex items-center justify-center mb-3">
                                    <MessageSquare size={20} className="text-gray-300 dark:text-[#333]" />
                                </div>
                                <p className="text-[13px] text-gray-500 dark:text-[#888] font-sfpro">
                                    {debouncedSearch ? "No matching comments" : "No comments yet"}
                                </p>
                            </div>
                        ) : (
                            <>
                                {comments.map((comment) => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        currentUserId={currentUserId}
                                        onEdit={(c) => { setEditingId(c.id); setEditText(c.text) }}
                                        onDelete={setDeleteTarget}
                                        isEditing={editingId === comment.id}
                                        editText={editText}
                                        setEditText={setEditText}
                                        onSaveEdit={saveEdit}
                                        onCancelEdit={() => setEditingId(null)}
                                        isSavingEdit={isSavingEdit}
                                    />
                                ))}
                                <div ref={sentinelRef} className="h-4" />
                                {isFetchingMore && (
                                    <div className="flex justify-center py-2">
                                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="shrink-0 p-6 pt-4 bg-white dark:bg-[#121212]">
                        <div className="flex items-end gap-3">
                            <div className="flex-1 flex items-end px-4 py-3 rounded-2xl border-gray-200/80 dark:border-[#2C2C2E] bg-gray-50/50 dark:bg-[#111111] focus-within:bg-white dark:focus-within:bg-[#111111] focus-within:border-gray-300 dark:focus-within:border-[#444] transition-all border-2">
                                <textarea
                                    ref={textareaRef}
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Write a comment..."
                                    rows={1}
                                    className="flex-1 bg-transparent text-[14px] font-sfpro text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none resize-none max-h-32 min-h-5"
                                />
                            </div>
                            <button onClick={handleSend} disabled={!newText.trim() || isSending}
                                className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-20 transition-all"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <DeleteModal
                isOpen={!!deleteTarget}
                onClose={() => !isDeleting && setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete Comment"
                description="This comment will be permanently removed from this issue."
                confirmText="Delete"
                isLoading={isDeleting}
            />
        </>
    )
}