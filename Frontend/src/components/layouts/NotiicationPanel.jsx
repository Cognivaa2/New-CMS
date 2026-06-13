"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"
import { PanelLeftOpen, Send, Search, X, Loader2 } from "lucide-react"
import { useNotification } from "@/components/contexts/NotificationContext"
import { notificationApi } from "./notification.api"
import { getSocket } from "@/lib/socket"
import SendNotificationModal from "./SendNotificationModal"
import { toast } from "sonner"

const STALE_TIME = 30 * 1000
const PAGE_SIZE = 20

function formatDate(dateString) {
  if (!dateString) return ""
  const now = new Date()
  const d = new Date(dateString)
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 3) return `${diffDays}d ago`

  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}


function NotifItem({ notif }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${!notif.isRead ? "bg-[#272727] dark:bg-white" : "bg-gray-200 dark:bg-[#333]"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-0.5">
          <p className="text-[13.5px] text-gray-700 dark:text-[#d4d4d8] leading-snug">{notif.message}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5 pl-6">
          {notif.type === "MANUAL" && notif.triggeredBy && (
            <span className="text-[11px] text-gray-500 dark:text-[#666]">
              from {notif.triggeredBy.name || notif.triggeredBy.email}
            </span>
          )}
          <span className="text-[11px] text-gray-400 dark:text-[#555]">{formatDate(notif.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-gray-100 dark:bg-[#222] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 bg-gray-100 dark:bg-[#222] rounded animate-pulse" />
        <div className="h-2.5 w-1/3 bg-gray-100 dark:bg-[#222] rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function NotificationsPanel() {
  const { isNotificationOpen, closeNotification, setUnread, socketReady } = useNotification()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)

  const hasFetchedRef = useRef(false)
  const lastFetchedRef = useRef(0)
  const scrollRef = useRef(null)
  const searchTimerRef = useRef(null)

  const fetchNotifications = useCallback(
    async (signal, force = false, currentPage = 1, currentSearch = "") => {
      if (!force && hasFetchedRef.current && Date.now() - lastFetchedRef.current < STALE_TIME && currentPage === 1) return

      if (currentPage === 1) setLoading(true)
      else setLoadingMore(true)

      try {
        const res = await notificationApi.getAll(
          { page: currentPage, limit: PAGE_SIZE, search: currentSearch || undefined },
          signal
        )
        const list = res?.data?.notifications || []
        const unread = res?.data?.unreadCount ?? 0
        const pagination = res?.data?.pagination || {}

        setNotifications((prev) => currentPage === 1 ? list : [...prev, ...list])
        setTotal(pagination.total || 0)
        setHasMore(currentPage < (pagination.totalPages || 1))
        setUnread(unread)

        if (currentPage === 1) {
          hasFetchedRef.current = true
          lastFetchedRef.current = Date.now()
        }
      } catch (err) {
        if (!axios.isCancel(err) && err?.name !== "AbortError") {
          console.error("Failed to fetch notifications:", err?.message || err)
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [setUnread]
  )

  useEffect(() => {
    if (!isNotificationOpen) return
    setPage(1)
    hasFetchedRef.current = false
    const controller = new AbortController()
    fetchNotifications(controller.signal, true, 1, debouncedSearch)
    return () => controller.abort()
  }, [isNotificationOpen, debouncedSearch, fetchNotifications])

  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(searchTimerRef.current)
  }, [search])

  useEffect(() => {
    if (!socketReady) return
    const socket = getSocket()
    if (!socket) return

    const handleNewNotification = (notification) => {
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notification._id)
        if (exists) return prev
        return [notification, ...prev]
      })
      setTotal((prev) => prev + 1)
      hasFetchedRef.current = false
      toast(notification.message)
    }

    const handleUnreadCount = ({ count }) => setUnread(count)

    const handleReconnect = () => {
      hasFetchedRef.current = false
      lastFetchedRef.current = 0
      if (isNotificationOpen) {
        const controller = new AbortController()
        fetchNotifications(controller.signal, true, 1, debouncedSearch)
      }
    }

    socket.on("notification:new", handleNewNotification)
    socket.on("notification:unreadCount", handleUnreadCount)
    socket.on("reconnect", handleReconnect)

    return () => {
      socket.off("notification:new", handleNewNotification)
      socket.off("notification:unreadCount", handleUnreadCount)
      socket.off("reconnect", handleReconnect)
    }
  }, [socketReady, setUnread, isNotificationOpen, fetchNotifications, debouncedSearch])

  function handleScroll() {
    const el = scrollRef.current
    if (!el || loadingMore || !hasMore) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80
    if (nearBottom) {
      const nextPage = page + 1
      setPage(nextPage)
      const controller = new AbortController()
      fetchNotifications(controller.signal, true, nextPage, debouncedSearch)
    }
  }

  function handleSearchClear() {
    setSearch("")
    setDebouncedSearch("")
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 ${isNotificationOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeNotification}
      />

      <div
        className={`fixed top-0 right-0 z-50 h-full 2xl:relative 2xl:top-auto 2xl:right-auto 2xl:z-auto 2xl:h-screen bg-white dark:bg-[#121212] border-l border-gray-100 dark:border-[#27272a] shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${isNotificationOpen ? "w-75 translate-x-0 opacity-100 shadow-xl md:shadow-none" : "w-0 translate-x-full md:translate-x-0 opacity-0 md:opacity-100 border-transparent"}`}
      >
        <div className="w-75 h-full flex flex-col">

          <div className="px-5 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <PanelLeftOpen
                size={20}
                className="text-gray-600 dark:text-gray-400 stroke-2 cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                onClick={closeNotification}
              />
              <div className="flex flex-col">
                <h2 className="text-lg text-gray-800 dark:text-gray-100 font-medium">Notifications</h2>
                <span className="text-[11px] text-gray-400 dark:text-[#555]">Notifications will be deleted after 3 days</span>
              </div>
            </div>
            <button
              onClick={() => setIsSendModalOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors"
              title="Send notification"
            >
              <Send size={16} className="text-gray-600 dark:text-gray-400 stroke-2" />
            </button>
          </div>

          <div className="px-5 pb-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#2c2c2e] bg-gray-50 dark:bg-[#1a1a1a] focus-within:border-gray-300 dark:focus-within:border-[#444] transition-all">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="flex-1 bg-transparent text-[13px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none"
              />
              {search && (
                <button onClick={handleSearchClear} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <X size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {total > 0 && (
            <p className="px-5 pb-2 text-[11px] text-gray-400 dark:text-[#555] shrink-0">
              {total} notification{total !== 1 ? "s" : ""}
            </p>
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
          >
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
                <p className="text-[13.5px] text-gray-400 dark:text-[#555]">
                  {debouncedSearch ? `No results for "${debouncedSearch}"` : "No notifications yet."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                {notifications.map((notif) => (
                  <NotifItem key={notif._id} notif={notif} />
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  </div>
                )}
                {!hasMore && notifications.length > 0 && (
                  <p className="text-center text-[11px] text-gray-300 dark:text-[#444] py-4">All caught up</p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {isSendModalOpen && (
        <SendNotificationModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
        />
      )}
    </>
  )
}