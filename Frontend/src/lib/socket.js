// lib/socket.js
import { io } from "socket.io-client"
import { getBaseUrl } from "@/lib/apiHelper"

let socket = null

export function getSocket() {
  return socket
}

export function connectSocket() {
  if (socket?.connected) return socket

  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  if (typeof window === "undefined") return null

  const baseUrl = getBaseUrl()?.replace("/api/v1", "")
  const userId = localStorage.getItem("userId")
  const companyId = localStorage.getItem("companyId")
  const token = localStorage.getItem("accessToken")

  if (!userId || !companyId || !token) {
    console.warn("[Socket] Missing credentials — skipping connect")
    return null
  }

  socket = io(baseUrl, {
    auth: { userId, companyId },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  })

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id)
  })

  socket.on("reconnect", (attempt) => {
    console.log("[Socket] Reconnected after", attempt, "attempts")
  })

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason)
  })

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    console.log("[Socket] Manually disconnected")
  }
}