"use client"

import { useEffect, useRef, useState } from "react"
import axios from "axios"
import { X, Search, Loader2, Send, Users } from "lucide-react"
import { toast } from "sonner"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"
import { notificationApi } from "./notification.api"

const API_BASE_URL = getBaseUrl()

function getInitials(name = "", email = "") {
  const src = name?.trim() || email?.trim() || "U"
  const parts = src.split(" ")
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : src[0].toUpperCase()
}

function Avatar({ user, size = "sm" }) {
  const dim = size === "sm" ? "w-8 h-8 text-[11px]" : "w-10 h-10 text-[13px]"
  return (
    <div
      className={`${dim} rounded-full bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] flex items-center justify-center overflow-hidden shrink-0`}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-gray-500 dark:text-[#888]">
          {getInitials(user?.name, user?.email)}
        </span>
      )}
    </div>
  )
}

async function fetchUsersForSelection(search = "", signal = null) {
  try {
    const companyId = getCompanyId()
    if (!companyId) return []
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    params.set("page", "1")
    params.set("limit", "50")
    params.set("status", "Active")
    params.set("sortBy", "name")
    params.set("order", "asc")

    const { data } = await axios.get(
      `${API_BASE_URL}/user/all/${companyId}?${params.toString()}`,
      { headers: getAuthHeaders(), signal }
    )

    const users = data.data?.users ?? []
    return users.map((u) => ({
      id: u.keycloakId,
      keycloakId: u.keycloakId,
      name: u.name || "Unknown",
      email: u.email || "",
      avatar: u.avatar || null,
    }))
  } catch {
    return []
  }
}

export default function SendNotificationModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const searchTimerRef = useRef(null)
  const searchAbortRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setQuery("")
        setSearchResults([])
        setShowDropdown(false)
        setSelectedUsers([])
        setMessage("")
        setSent(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target) || searchInputRef.current?.contains(e.target)) return
      setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleQueryChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(searchTimerRef.current)

    if (!val.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimerRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort()

      const ctrl = new AbortController()
      searchAbortRef.current = ctrl
      setSearching(true)

      try {
        const results = await fetchUsersForSelection(val.trim(), ctrl.signal)
        setSearchResults(results)
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  function clearSearch() {
    setQuery("")
    setSearchResults([])
    setShowDropdown(false)
    searchInputRef.current?.focus()
  }

  function handleSelect(user) {
    const alreadySelected = selectedUsers.some((u) => u.id === user.id)
    if (!alreadySelected) setSelectedUsers((prev) => [...prev, user])
    clearSearch()
  }

  function handleRemove(userId) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  async function handleSend() {
    if (!selectedUsers.length || !message.trim() || sending) return

    setSending(true)
    try {
      await notificationApi.sendManual({
        recipientIds: selectedUsers.map((u) => u.keycloakId),
        message: message.trim(),
      })

      setSent(true)

      toast.success("Notification sent successfully", {
        description: `Sent to ${selectedUsers.length} recipient${selectedUsers.length !== 1 ? "s" : ""}`,
      })

      setTimeout(() => onClose(), 1200)
    } catch (err) {
      console.error("sendManualNotification failed:", err?.message || err)
      toast.error("Failed to send notification", {
        description: err?.response?.data?.message || err?.message || "Something went wrong.",
      })
    } finally {
      setSending(false)
    }
  }

  const selectedIds = new Set(selectedUsers.map((u) => u.id))
  const filteredResults = searchResults.filter((u) => !selectedIds.has(u.id))
  const canSend = selectedUsers.length > 0 && message.trim().length > 0 && !sending

  if (!mounted) return null

  return (
    <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-visible transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white tracking-tight">
              Send Notification
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#888] mt-0.5">
              Send a message to one or more team members.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-[#212121] dark:bg-white transition-colors shrink-0 flex items-center justify-center hover:scale-90 duration-200 cursor-pointer"
          >
            <X size={16} className="text-white dark:text-black" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-[12px] font-semibold text-gray-400 dark:text-[#666] uppercase tracking-wider mb-2">
              Recipients
            </p>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2c2c2c]"
                  >
                    <Avatar user={user} size="sm" />
                    <span className="text-[13px] text-gray-800 dark:text-gray-200 max-w-25 truncate">
                      {user.name}
                    </span>
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors ml-0.5"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative" ref={searchInputRef}>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E] bg-gray-50/50 dark:bg-[#1A1A1A] focus-within:bg-white dark:focus-within:bg-[#1C1C1E] focus-within:border-gray-300 dark:focus-within:border-[#444] transition-all">
                {searching ? (
                  <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
                ) : (
                  <Search size={16} className="text-gray-400 shrink-0" />
                )}

                <input
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => filteredResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search by name or email..."
                  className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none min-w-0"
                />

                {query && (
                  <button
                    onClick={clearSearch}
                    className="flex items-center justify-center p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                  >
                    <X size={14} className="text-gray-500" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 bg-white dark:bg-[#09090b] rounded-2xl border border-gray-100 dark:border-[#1b1b1b] shadow-xl overflow-hidden py-2"
                >
                  {searching && !filteredResults.length ? (
                    <div className="py-4 px-4 flex items-center gap-2 text-gray-400 text-[13px]">
                      <Loader2 size={14} className="animate-spin" />
                      Searching...
                    </div>
                  ) : !filteredResults.length ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Users size={20} className="text-gray-300 dark:text-[#444]" />
                      <p className="text-[13px] text-gray-500 dark:text-[#888]">
                        {query ? `No results for "${query}"` : "No users found"}
                      </p>
                    </div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto">
                      {filteredResults.map((user) => (
                        <li
                          key={user.id}
                          onClick={() => handleSelect(user)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#111] cursor-pointer transition-colors"
                        >
                          <Avatar user={user} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                              {user.name}
                            </p>
                            <p className="text-[12px] text-gray-500 dark:text-[#888] truncate">
                              {user.email}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-gray-400 dark:text-[#666] uppercase tracking-wider mb-2">
              Message
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-gray-50/50 dark:bg-[#1A1A1A] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none resize-none focus:border-gray-300 dark:focus:border-[#444] focus:bg-white dark:focus:bg-[#1C1C1E] transition-all"
            />
            <p className="text-[11px] text-gray-400 dark:text-[#555] text-right mt-1">
              {message.length}/500
            </p>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 rounded-xl text-[14px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl text-[14px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sent ? (
              "Sent!"
            ) : sending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={14} />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 