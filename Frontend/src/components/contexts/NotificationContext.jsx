"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { connectSocket, disconnectSocket } from "@/lib/socket"

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    let attempts = 0
    const MAX_ATTEMPTS = 20
    const INTERVAL = 200
    let timer = null

    const tryConnect = () => {
      const token = localStorage.getItem("accessToken")
      const userId = localStorage.getItem("userId")
      const companyId = localStorage.getItem("companyId")

      if (!token || !userId || !companyId) {
        attempts++
        if (attempts < MAX_ATTEMPTS) {
          timer = setTimeout(tryConnect, INTERVAL)
        }
        return
      }

      const socket = connectSocket()
      if (!socket) return

      socketRef.current = socket

      const handleUnreadCount = ({ count }) => {
        setUnreadCount(typeof count === "number" ? count : 0)
      }

      const handleNewNotification = () => {
        setUnreadCount((prev) => prev + 1)
        setHasNewNotification(true)
      }

      socket.on("notification:unreadCount", handleUnreadCount)
      socket.on("notification:new", handleNewNotification)

      return () => {
        socket.off("notification:unreadCount", handleUnreadCount)
        socket.off("notification:new", handleNewNotification)
      }
    }

    const cleanup = tryConnect()

    return () => {
      if (timer) clearTimeout(timer)
      cleanup?.()
    }
  }, [])

  const toggleNotification = () => {
    setIsNotificationOpen((prev) => {
      const willOpen = !prev
      if (willOpen) setHasNewNotification(false)
      return willOpen
    })
  }

  const closeNotification = () => setIsNotificationOpen(false)

  const openNotification = () => {
    setIsNotificationOpen(true)
    setHasNewNotification(false)
  }

  const setUnread = useCallback((countOrUpdater) => {
    setUnreadCount((prev) => {
      if (typeof countOrUpdater === "function") return countOrUpdater(prev)
      return typeof countOrUpdater === "number" ? countOrUpdater : prev
    })
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        isNotificationOpen,
        toggleNotification,
        closeNotification,
        openNotification,
        unreadCount,
        setUnread,
        hasNewNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}