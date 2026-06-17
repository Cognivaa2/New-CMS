"use client"
import { useEffect, useState, useRef } from "react"
import { X, Search, Loader2, Users } from "lucide-react"
import { Select } from "@/components/ui/DropDown"
import { fetchProjectMembers, updateProjectMember, fetchUsersForSelection, changeProjectMemberRole, fetchAllRoles } from "@/app/(companyname)/projects/api.jsx"
import DeleteModal from "@/components/ui/DeleteModal"
import Tooltip from "@/components/ui/Tooltip"

function getInitials(name = "", email = "") {
    const src = name?.trim() || email?.trim() || "U"
    const parts = src.split(" ")
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : src[0].toUpperCase()
}

function Avatar({ user }) {
    return (
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-[13px] font-sfpro-bold text-gray-500 dark:text-[#888]">{getInitials(user?.name, user?.email)}</span>
            }
        </div>
    )
}

function SkeletonRows({ count = 3 }) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#222] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 bg-gray-100 dark:bg-[#222] rounded animate-pulse" />
                <div className="h-2.5 w-36 bg-gray-100 dark:bg-[#222] rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-gray-100 dark:bg-[#222] rounded-lg animate-pulse shrink-0" />
            <div className="w-8 h-8 bg-gray-100 dark:bg-[#222] rounded-lg animate-pulse shrink-0" />
        </div>
    ))
}

export default function ManageMembersModal({ isOpen, onClose, project, onMembersChanged }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [members, setMembers] = useState([])
    const [membersLoading, setMembersLoading] = useState(false)
    const [roles, setRoles] = useState([])
    const [query, setQuery] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [actionLoading, setActionLoading] = useState({})
    const [confirmTarget, setConfirmTarget] = useState(null)
    const [isUnassigning, setIsUnassigning] = useState(false)

    const membersChangedRef = useRef(false)
    const searchInputRef = useRef(null)
    const dropdownRef = useRef(null)
    const searchTimerRef = useRef(null)
    const searchAbortRef = useRef(null)
    const membersAbortRef = useRef(null)

    const projectId = project?._id || project?.id

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            membersChangedRef.current = false
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false); setMembers([]); setQuery("")
                setSearchResults([]); setShowDropdown(false)
                setActionLoading({}); setConfirmTarget(null)
            }, 300)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen || !projectId) return
        if (membersAbortRef.current) membersAbortRef.current.abort()
        const ctrl = new AbortController()
        membersAbortRef.current = ctrl
        setMembersLoading(true)
        Promise.all([fetchProjectMembers(projectId, ctrl.signal), fetchAllRoles()])
            .then(([m, r]) => { setMembers(m); setRoles(r) })
            .catch(err => { if (err.name !== "CanceledError") setMembers([]) })
            .finally(() => setMembersLoading(false))
        return () => ctrl.abort()
    }, [isOpen, projectId])

    useEffect(() => {
        const handler = e => { if (e.key === "Escape" && isOpen && !confirmTarget) handleClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, confirmTarget])

    useEffect(() => {
        const handler = e => {
            if (dropdownRef.current?.contains(e.target) || searchInputRef.current?.contains(e.target)) return
            setShowDropdown(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    function handleClose() {
        if (membersChangedRef.current) onMembersChanged?.()
        onClose()
    }

    function handleQueryChange(e) {
        const val = e.target.value
        setQuery(val)
        clearTimeout(searchTimerRef.current)
        if (!val.trim()) { setSearchResults([]); setShowDropdown(false); return }
        searchTimerRef.current = setTimeout(async () => {
            if (searchAbortRef.current) searchAbortRef.current.abort()
            const ctrl = new AbortController()
            searchAbortRef.current = ctrl
            setSearching(true)
            try {
                const results = await fetchUsersForSelection(val.trim(), ctrl.signal)
                setSearchResults(results); setShowDropdown(true)
            } catch (err) { if (err.name !== "CanceledError") setSearchResults([]) }
            finally { setSearching(false) }
        }, 350)
    }

    function clearSearch() {
        setQuery(""); setSearchResults([]); setShowDropdown(false)
        searchInputRef.current?.focus()
    }

    async function handleAdd(user) {
        const uid = user.id || user.keycloakId
        clearSearch()
        setActionLoading(p => ({ ...p, [uid]: "adding" }))
        try {
            await updateProjectMember(projectId, uid, "add")
            setMembers(p => [...p, { keycloakId: uid, mongoId: user.mongoId || "", name: user.name || "Unknown", email: user.email || "", avatar: user.avatar || null, designation: null, assignedAt: new Date().toISOString() }])
            membersChangedRef.current = true
        } catch (err) { console.error(err.message) }
        finally { setActionLoading(p => ({ ...p, [uid]: null })) }
    }

    async function handleConfirmUnassign() {
        if (!confirmTarget) return
        const uid = confirmTarget.keycloakId
        setIsUnassigning(true)
        try {
            await updateProjectMember(projectId, uid, "remove")
            setMembers(p => p.filter(m => m.keycloakId !== uid))
            membersChangedRef.current = true
            setConfirmTarget(null)
        } catch (err) { console.error(err.message) }
        finally { setIsUnassigning(false) }
    }

    async function handleRoleChange(member, newRoleId) {
        const uid = member.keycloakId
        setActionLoading(p => ({ ...p, [uid]: "role" }))
        try {
            await changeProjectMemberRole(projectId, uid, newRoleId)
            const label = roles.find(r => r.value === newRoleId)?.label ?? null
            setMembers(p => p.map(m => m.keycloakId === uid ? { ...m, designation: label } : m))
            membersChangedRef.current = true
        } catch (err) { console.error(err.message) }
        finally { setActionLoading(p => ({ ...p, [uid]: null })) }
    }

    const assignedIds = new Set(members.map(m => m.keycloakId))
    const filteredResults = searchResults.filter(u => !assignedIds.has(u.id || u.keycloakId))

    if (!mounted) return null

    return (
        <>
            <div onClick={e => e.stopPropagation()} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div onClick={handleClose} className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />

                <div className={`relative w-full max-w-135 bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"}`}>

                    <div className="flex items-start gap-4 p-6 pb-4">
                        <div className="flex-1 relative" ref={searchInputRef}>
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E] bg-gray-50/50 dark:bg-[#1A1A1A] focus-within:bg-white dark:focus-within:bg-[#1C1C1E] focus-within:border-gray-300 dark:focus-within:border-[#444] focus-within:shadow-sm transition-all">
                                {searching ? <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" /> : <Search size={16} className="text-gray-400 shrink-0" />}
                                <input
                                    type="text"
                                    value={query}
                                    onChange={handleQueryChange}
                                    onFocus={() => filteredResults.length > 0 && setShowDropdown(true)}
                                    placeholder="Email, name..."
                                    className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none font-sfpro min-w-0"
                                />
                                {query &&
                                    <button onClick={clearSearch} className="flex items-center justify-center p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                                        <X size={14} className="text-gray-500" strokeWidth={2.5} />
                                    </button>}
                            </div>

                            {showDropdown && (
                                <div ref={dropdownRef} className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 bg-white dark:bg-[#09090b] rounded-2xl border border-gray-100 dark:border-[#1b1b1b] shadow-xl overflow-hidden py-2">
                                    {searching && !filteredResults.length ? (
                                        <div className="py-2 px-2"><SkeletonRows count={2} /></div>
                                    ) : !filteredResults.length ? (
                                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                                            <Users size={20} className="text-gray-300 dark:text-[#444]" />
                                            <p className="text-[13px] text-gray-500 dark:text-[#888] font-sfpro">{query ? `No results for "${query}"` : "No users found"}</p>
                                        </div>
                                    ) : (
                                        <ul className="max-h-70 overflow-y-auto">
                                            {filteredResults.map(user => {
                                                const uid = user.id || user.keycloakId
                                                return (
                                                    <li key={uid} className="flex items-center gap-3 px-4 py-2.5 transition-colors">
                                                        <Avatar user={user} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white truncate">{user.name || "Unknown"}</p>
                                                            <p className="text-[13px] text-gray-500 dark:text-[#888] truncate">{user.email || "—"}</p>
                                                        </div>
                                                        <Tooltip content="Add this member in this project" side="top">
                                                            <button
                                                                onClick={() => handleAdd(user)}
                                                                disabled={actionLoading[uid] === "adding"}
                                                                className="cursor-pointer shrink-0 flex items-center justify-center min-w-18 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-sfpro-bold hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
                                                                {actionLoading[uid] === "adding" ? <Loader2 size={14} className="animate-spin" /> : "Assign"}
                                                            </button>
                                                        </Tooltip>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                        <button onClick={handleClose} className="p-1 rounded-full bg-[#212121] dark:bg-white transition-colors shrink-0 flex items-center justify-center mt-2 hover:scale-90 duration-200 cursor-pointer">
                            <X size={16} className="text-white dark:text-black" strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="px-6 pb-5 mt-2">
                        <h2 className="text-[18px] font-sfpro-bold text-gray-900 dark:text-white tracking-tight">Manage Members</h2>
                        <p className="text-sm text-gray-500 dark:text-[#888] mt-1 font-sfpro">Manage who has access to this project. Assign new members or unassign existing ones anytime.</p>
                    </div>

                    <div className="h-0.5 bg-gray-100 dark:bg-[#272727] w-full" />

                    <div className="px-6 py-5">
                        <p className="text-[12px] font-sfpro-bold text-gray-400 dark:text-[#666] uppercase tracking-wider mb-3">People with access</p>
                        <div className="max-h-80 overflow-y-auto -mx-2 px-2 space-y-0.5">
                            {membersLoading ? <SkeletonRows count={3} /> : members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] flex items-center justify-center">
                                        <Users size={20} className="text-gray-400 dark:text-[#555]" />
                                    </div>
                                    <p className="text-[13.5px] text-gray-500 dark:text-[#888] font-sfpro">No members assigned yet</p>
                                </div>
                            ) : members.map(member => {
                                const uid = member.keycloakId
                                const currentRoleId = roles.find(r => r.label === member.designation)?.value ?? ""
                                return (
                                    <div key={uid} className="group flex items-center gap-3 p-2 rounded-2xl transition-colors duration-150">
                                        <Avatar user={member} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-sfpro-bold text-gray-900 dark:text-white truncate">{member.name || "Unknown"}</p>
                                            <p className="text-[13px] text-gray-500 dark:text-[#888] truncate">{member.email || "—"}</p>
                                        </div>
                                        {/* <Tooltip content="Change the role" side="top">
                                            <div className="shrink-0 w-28" onClick={e => e.stopPropagation()}>
                                                {actionLoading[uid] === "role"
                                                    ? <div className="flex items-center justify-center h-8"><Loader2 size={14} className="animate-spin text-gray-400" /></div>
                                                    : <Select options={roles} value={currentRoleId} onChange={newRoleId => handleRoleChange(member, newRoleId)} placeholder="Set role" width="w-full" disabled={!roles.length} />
                                                }
                                            </div>
                                        </Tooltip> */}
                                        <Tooltip content="Remove this member from this project" side="top">
                                            <button
                                                onClick={() => setConfirmTarget(member)}
                                                className="cursor-pointer text-xs px-3 py-1 shrink-0 flex items-center justify-center rounded-md font-sfpro-medium text-white bg-[#f03e3e] hover:bg-[#b10101] transition-all duration-200"
                                            > Unassign
                                            </button>
                                        </Tooltip>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>
            </div>

            <DeleteModal
                isOpen={!!confirmTarget}
                onClose={() => !isUnassigning && setConfirmTarget(null)}
                onConfirm={handleConfirmUnassign}
                description={`${confirmTarget?.name || "This member"} will be removed from the project.`}
                itemName=""
                confirmText="Unassign"
                isLoading={isUnassigning}
            />
        </>
    )
}