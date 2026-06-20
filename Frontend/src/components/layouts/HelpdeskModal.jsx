// HelpdeskModal.jsx
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
    X,
    Send,
    Loader2,
    Paperclip,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    FileText,
    Image as ImageIcon,
    File,
    Trash2,
    TicketCheck,
    Clock,
    CircleDot,
    Filter,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    MessageSquarePlus,
    Inbox,
} from "lucide-react"
import { toast } from "sonner"
import { helpdeskApi } from "./helpdesk.api"

const CATEGORIES = [
    { value: "Bug Report", label: "Bug Report" },
    { value: "Feature Request", label: "Feature Request" },
    { value: "Billing", label: "Billing" },
    { value: "Account", label: "Account" },
    { value: "Technical Support", label: "Technical Support" },
    { value: "General Inquiry", label: "General Inquiry" },
    { value: "Other", label: "Other" },
]

const PRIORITIES = [
    { value: "Low", label: "Low", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    { value: "Medium", label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { value: "High", label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    { value: "Urgent", label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
]

const STATUS_CONFIG = {
    Open: {
        label: "Open",
        icon: CircleDot,
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    "In Progress": {
        label: "In Progress",
        icon: Clock,
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    Resolved: {
        label: "Resolved",
        icon: CheckCircle2,
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    Closed: {
        label: "Closed",
        icon: X,
        color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    },
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
]

function formatDate(dateString) {
    if (!dateString) return "—"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file) {
    if (file.type.startsWith("image/")) return ImageIcon
    if (file.type === "application/pdf") return FileText
    return File
}

function getPriorityConfig(value) {
    return PRIORITIES.find((p) => p.value === value) || PRIORITIES[1]
}

function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.Open
}
function SelectDropdown({ label, value, onChange, options, placeholder, renderOption, renderSelected }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (!ref.current?.contains(e.target)) setOpen(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const selected = options.find((o) => o.value === value)

    return (
        <div className="space-y-1">
            {label && (
                <label className="text-[12px] font-semibold text-gray-400 dark:text-[#666] uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E]  hover:bg-white dark:hover:bg-[#1C1C1E] focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-gray-300 dark:focus:border-[#444] transition-all text-left cursor-pointer"
                >
                    {selected ? (
                        renderSelected ? (
                            renderSelected(selected)
                        ) : (
                            <span className="text-[14px] text-gray-900 dark:text-white">{selected.label}</span>
                        )
                    ) : (
                        <span className="text-[14px] text-gray-400 dark:text-[#666]">{placeholder || "Select..."}</span>
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                </button>

                {open && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white dark:bg-[#09090b] rounded-2xl border border-gray-100 dark:border-[#1b1b1b] shadow-xl overflow-hidden py-1.5">
                        <ul className="max-h-56 overflow-y-auto">
                            {options.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                    }}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                        value === option.value
                                            ? "bg-gray-50 dark:bg-[#111]"
                                            : "hover:bg-gray-50 dark:hover:bg-[#111]"
                                    }`}
                                >
                                    {renderOption ? (
                                        renderOption(option, value === option.value)
                                    ) : (
                                        <span className="text-[14px] text-gray-900 dark:text-white">{option.label}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}


function RaiseTicketView({ onClose, onTicketRaised }) {
    const [category, setCategory] = useState("")
    const [priority, setPriority] = useState("Medium")
    const [subject, setSubject] = useState("")
    const [description, setDescription] = useState("")
    const [files, setFiles] = useState([])
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const fileInputRef = useRef(null)

    function handleFileSelect(e) {
        const selected = Array.from(e.target.files || [])
        if (!selected.length) return
        const currentCount = files.length
        const remaining = MAX_FILES - currentCount
        if (remaining <= 0) { toast.error(`Maximum ${MAX_FILES} files allowed`); return }
        const toAdd = selected.slice(0, remaining)
        const errors = []
        const valid = toAdd.filter((file) => {
            if (!ALLOWED_TYPES.includes(file.type)) { errors.push(`"${file.name}" — unsupported file type`); return false }
            if (file.size > MAX_FILE_SIZE) { errors.push(`"${file.name}" — exceeds 10MB limit`); return false }
            return true
        })
        if (errors.length) toast.error("Some files were skipped", { description: errors.join("; ") })
        setFiles((prev) => [...prev, ...valid])
        e.target.value = ""
    }

    function removeFile(index) {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (sending || sent) return
        if (!category) { toast.error("Please select a category"); return }
        if (!subject.trim()) { toast.error("Please enter a subject"); return }
        if (!description.trim()) { toast.error("Please enter a description"); return }
        setSending(true)
        try {
            const result = await helpdeskApi.raiseTicket({ category, priority, subject, description, attachments: files })
            setSent(true)
            toast.success("Ticket raised successfully", {
                description: `Ticket ${result?.ticketNumber || ""} has been created. We'll get back to you shortly.`,
            })
            onTicketRaised?.()
            setTimeout(() => onClose(), 1500)
        } catch (err) {
            console.error("raiseTicket failed:", err)
            toast.error("Failed to raise ticket", {
                description: err?.response?.data?.description || err?.message || "Something went wrong.",
            })
        } finally {
            setSending(false)
        }
    }

    const canSubmit = category && subject.trim() && description.trim() && !sending && !sent

    return (
        <form onSubmit={handleSubmit} className="flex flex-col ">

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">

                <SelectDropdown
                    value={category}
                    onChange={setCategory}
                    options={CATEGORIES}
                    placeholder="Select a category..."
                />

                <SelectDropdown
                    value={priority}
                    onChange={setPriority}
                    options={PRIORITIES}
                    placeholder="Select priority..."
                    renderOption={(option) => (
                        <div className="flex items-center gap-3 flex-1">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${option.color}`}>
                                {option.label}
                            </span>
                        </div>
                    )}
                    renderSelected={(option) => (
                        <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium ${option.color}`}>
                            {option.label}
                        </span>
                    )}
                />

                <div>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of the issue..."
                        maxLength={200}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none focus:border-gray-300 dark:focus:border-[#444] focus:bg-white dark:focus:bg-[#1C1C1E] transition-all"
                    />
                    <p className="text-[11px] text-gray-400 dark:text-[#555] text-right mt-0.5">
                        {subject.length}/200
                    </p>
                </div>

                <div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the issue in detail. Include steps to reproduce, expected vs actual behavior, etc..."
                        rows={4}
                        maxLength={2000}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-[#2C2C2E] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] outline-none resize-none focus:border-gray-300 dark:focus:border-[#444] focus:bg-white dark:focus:bg-[#1C1C1E] transition-all"
                    />
                    <p className="text-[11px] text-gray-400 dark:text-[#555] text-right mt-0.5">
                        {description.length}/2000
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-gray-400 dark:text-[#666] uppercase tracking-wider">
                        Attachments
                        <span className="font-normal ml-1 normal-case tracking-normal">
                            (optional, max {MAX_FILES})
                        </span>
                    </label>

                    {files.length > 0 && (
                        <div className="space-y-1.5">
                            {files.map((file, index) => {
                                const Icon = getFileIcon(file)
                                return (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200/60 dark:border-[#2C2C2E]"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#222] flex items-center justify-center shrink-0">
                                            <Icon size={13} className="text-gray-500 dark:text-[#888]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-[#666]">{formatFileSize(file.size)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                                        >
                                            <Trash2 size={13} className="text-gray-400 hover:text-red-500 transition-colors" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {files.length < MAX_FILES && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ALLOWED_TYPES.join(",")}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-[#333] text-[13px] text-gray-500 dark:text-[#888] hover:border-gray-400 dark:hover:border-[#555] hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-all cursor-pointer"
                            >
                                <Paperclip size={13} />
                                Attach files
                            </button>
                            <p className="text-[11px] text-gray-400 dark:text-[#555]">
                                Images, PDFs, documents up to 10MB each
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="shrink-0 px-6 py-4 flex items-center justify-end gap-3  dark:border-[#1b1b1b]">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer px-4 py-2 rounded-xl text-[14px] text-gray-00 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl text-[14px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {sent ? (
                        <><CheckCircle2 size={14} /> Submitted!</>
                    ) : sending ? (
                        <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                    ) : (
                        <><Send size={14} /> Submit Ticket</>
                    )}
                </button>
            </div>
        </form>
    )
}

function TicketCard({ ticket }) {
    const statusConf = getStatusConfig(ticket.status)
    const priorityConf = getPriorityConfig(ticket.priority)
    const StatusIcon = statusConf.icon

    return (
        <div className="px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-[#1b1b1b] bg-gray-50/30 dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-mono text-gray-400 dark:text-[#666]">
                            {ticket.ticketNumber}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConf.color}`}>
                            <StatusIcon size={10} />
                            {statusConf.label}
                        </span>
                    </div>
                    <h4 className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                        {ticket.subject}
                    </h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${priorityConf.color}`}>
                    {priorityConf.label}
                </span>
            </div>

            <p className="text-[13px] text-gray-500 dark:text-[#888] line-clamp-2 mb-2.5">
                {ticket.description}
            </p>

            <div className="flex items-center justify-between">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A1A] text-gray-500 dark:text-[#888]">
                    {ticket.category}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-[#666]">
                    {formatDate(ticket.createdAt)}
                </span>
            </div>
        </div>
    )
}

function MyTicketsView({ onSwitchToRaise }) {
    const [tickets, setTickets] = useState([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filterStatus, setFilterStatus] = useState("")
    const [filterPriority, setFilterPriority] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const abortRef = useRef(null)

    const fetchTickets = useCallback(
        async (page = 1) => {
            if (abortRef.current) abortRef.current.abort()
            const ctrl = new AbortController()
            abortRef.current = ctrl
            setLoading(true)
            setError(null)

            try {
                const result = await helpdeskApi.getMyTickets(
                    { page, limit: 10, status: filterStatus || undefined, priority: filterPriority || undefined },
                    ctrl.signal
                )
                setTickets(result.tickets)
                setPagination(result.pagination)
            } catch (err) {
                if (err.name === "CanceledError" || err.name === "AbortError") return
                setError(err.message || "Failed to fetch tickets")
            } finally {
                setLoading(false)
            }
        },
        [filterStatus, filterPriority]
    )

    useEffect(() => {
        fetchTickets(1)
        return () => { if (abortRef.current) abortRef.current.abort() }
    }, [fetchTickets])

    const hasActiveFilters = filterStatus || filterPriority

    const statusOptions = [
        { value: "", label: "All Statuses" },
        { value: "Open", label: "Open" },
        { value: "In Progress", label: "In Progress" },
        { value: "Resolved", label: "Resolved" },
        { value: "Closed", label: "Closed" },
    ]

    const priorityOptions = [
        { value: "", label: "All Priorities" },
        ...PRIORITIES,
    ]

    return (
        <div className="flex flex-col ">

            <div className="shrink-0 px-6 py-3 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-[#1b1b1b]">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] transition-colors cursor-pointer ${
                            showFilters || hasActiveFilters
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1e1e1e]"
                        }`}
                    >
                        <Filter size={13} />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center text-[10px]">
                                {(filterStatus ? 1 : 0) + (filterPriority ? 1 : 0)}
                            </span>
                        )}
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={() => { setFilterStatus(""); setFilterPriority("") }}
                            className="text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchTickets(pagination.page)}
                        disabled={loading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors cursor-pointer disabled:opacity-40"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>

                    <button
                        onClick={onSwitchToRaise}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                        <MessageSquarePlus size={13} />
                        New Ticket
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="shrink-0 px-6 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-[#1b1b1b] bg-gray-50/50 dark:bg-[#0d0d0d]">
                    <div className="flex-1">
                        <SelectDropdown
                            value={filterStatus}
                            onChange={setFilterStatus}
                            options={statusOptions}
                            placeholder="Status"
                        />
                    </div>
                    <div className="flex-1">
                        <SelectDropdown
                            value={filterPriority}
                            onChange={setFilterPriority}
                            options={priorityOptions}
                            placeholder="Priority"
                            renderOption={(option) => (
                                <div className="flex items-center gap-2 flex-1">
                                    {option.color ? (
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${option.color}`}>
                                            {option.label}
                                        </span>
                                    ) : (
                                        <span className="text-[14px] text-gray-600 dark:text-gray-400">
                                            {option.label}
                                        </span>
                                    )}
                                </div>
                            )}
                            renderSelected={(option) =>
                                option.color ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${option.color}`}>
                                        {option.label}
                                    </span>
                                ) : (
                                    <span className="text-[14px] text-gray-900 dark:text-white">{option.label}</span>
                                )
                            }
                        />
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-y-auto">
                {loading && !tickets.length ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 size={24} className="text-gray-300 dark:text-[#444] animate-spin" />
                        <p className="text-[13px] text-gray-400 dark:text-[#666]">Loading tickets...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <AlertCircle size={24} className="text-red-300 dark:text-red-400/50" />
                        <p className="text-[13px] text-red-500 dark:text-red-400">{error}</p>
                        <button
                            onClick={() => fetchTickets(1)}
                            className="text-[13px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline cursor-pointer"
                        >
                            Try again
                        </button>
                    </div>
                ) : !tickets.length ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Inbox size={28} className="text-gray-300 dark:text-[#444]" />
                        <p className="text-[14px] text-gray-500 dark:text-[#888]">
                            {hasActiveFilters ? "No tickets match your filters" : "No tickets yet"}
                        </p>
                        {!hasActiveFilters && (
                            <button
                                onClick={onSwitchToRaise}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-colors cursor-pointer mt-1"
                            >
                                <MessageSquarePlus size={13} />
                                Raise your first ticket
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="px-6 py-4 space-y-2.5">
                        {tickets.map((ticket) => (
                            <TicketCard key={ticket._id || ticket.ticketNumber} ticket={ticket} />
                        ))}
                    </div>
                )}
            </div>
            {pagination.totalPages > 1 && (
                <div className="shrink-0 px-6 py-3 flex items-center justify-between border-t border-gray-100 dark:border-[#1b1b1b]">
                    <span className="text-[12px] text-gray-400 dark:text-[#666]">
                        {pagination.total} ticket{pagination.total !== 1 ? "s" : ""} total
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => fetchTickets(pagination.page - 1)}
                            disabled={pagination.page <= 1 || loading}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[12px] text-gray-500 dark:text-[#888] min-w-15 text-center">
                            {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => fetchTickets(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || loading}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1e1e1e] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
export default function HelpdeskModal({ isOpen, onClose }) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [activeTab, setActiveTab] = useState("raise")

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
            setVisible(false)
            const t = setTimeout(() => {
                setMounted(false)
                setActiveTab("raise")
            }, 300)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape" && isOpen) onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, onClose])

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
                className={`relative w-full max-w-lg bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"
                }`}
            >
                <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-2">
                    <div>
                        <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white ">
                            Helpdesk
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-[#888] mt-0.5">
                            {activeTab === "raise" ? "Raise a support ticket" : "View your submitted tickets"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full bg-[#212121] dark:bg-white transition-colors shrink-0 flex items-center justify-center hover:scale-90 duration-200 cursor-pointer"
                    >
                        <X size={16} className="text-white dark:text-black" strokeWidth={2.5} />
                    </button>
                </div>

                <div className="shrink-0 px-6 pt-2 pb-3">
                    <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80 dark:bg-[#1A1A1A]">
                        <button
                            onClick={() => setActiveTab("raise")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                                activeTab === "raise"
                                    ? "bg-black dark:bg-[#fdfdfd] text-white dark:text-black shadow-sm"
                                    : "text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            <MessageSquarePlus size={14} />
                            Raise Ticket
                        </button>
                        <button
                            onClick={() => setActiveTab("tickets")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                                activeTab === "tickets"
                                    ? "bg-black dark:bg-[#fdfdfd] text-white dark:text-black shadow-sm"
                                    : "text-gray-500 dark:text-[#888] hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            <TicketCheck size={14} />
                            My Tickets
                        </button>
                    </div>
                </div>

                <div className="flex-1 ">
                    {activeTab === "raise" ? (
                        <RaiseTicketView onClose={onClose} onTicketRaised={() => {}} />
                    ) : (
                        <MyTicketsView onSwitchToRaise={() => setActiveTab("raise")} />
                    )}
                </div>
            </div>
        </div>
    )
}