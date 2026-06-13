// components/ui/ProjectSelectDropdown.jsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, Building2, Loader2, X, FileText } from "lucide-react"
import axios from "axios"
import { getBaseUrl, getAuthHeaders } from "@/lib/apiHelper"

const STATUS_COLOR = {
  planned:   "text-slate-400",
  active:    "text-green-400",
  on_hold:   "text-amber-400",
  completed: "text-blue-400",
  cancelled: "text-red-400",
}

function getUserId() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("keycloakId")
}

function useOutsideClick(ref, cb) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, cb])
}

export default function ProjectSelectDropdown({
  value       = null,
  onChange,
  align       = "left",
  placeholder = "All Projects",
}) {
  const [open,     setOpen]     = useState(false)
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState("")

  const wrapRef   = useRef(null)
  const ctrlRef   = useRef(null)
  const inputRef  = useRef(null)
  const loadedRef = useRef(false)

  useOutsideClick(wrapRef, () => setOpen(false))

  const loadProjects = useCallback(async () => {
    if (loadedRef.current) return

    const userId = getUserId()
    if (!userId) {
      setError("User session not found. Please log in again.")
      return
    }

    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl

    setLoading(true)
    setError(null)

    try {
      const res = await axios.get(
        `${getBaseUrl()}/project/list/${userId}`,
        {
          headers: getAuthHeaders({ includeContentType: false }),
          signal: ctrl.signal,
        }
      )

      if (!ctrl.signal.aborted) {
        const list = res.data?.title?.projects ?? []
        setProjects(list)
        loadedRef.current = true
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      setError(err.response?.data?.message || err.message || "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  const retryLoad = useCallback(() => {
    loadedRef.current = false
    setProjects([])
    loadProjects()
  }, [loadProjects])
  useEffect(() => {
    if (open) {
      loadProjects()
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, loadProjects])

  useEffect(() => {
    return () => ctrlRef.current?.abort()
  }, [])

  const selected = projects.find(
    (p) => String(p.projectId) === String(value)
  ) ?? null

  const filtered = search.trim()
    ? projects.filter((p) =>
        p.projectName?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : projects

  const handleSelect = (project) => {
    onChange?.(project)   
    setOpen(false)
    setSearch("")
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange?.(null)
  }

  return (
    <div ref={wrapRef} className="relative inline-block">

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          inline-flex items-center gap-2 h-9 px-3 rounded-full border
          bg-white dark:bg-zinc-900 text-sm font-sfpro transition-all
          min-w-32 max-w-52
          ${open
            ? "border-zinc-400 dark:border-zinc-600"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          }
        `}
      >
        {selected?.coverImage ? (
          <img
            src={selected.coverImage}
            alt={selected.projectName}
            className="w-4 h-4 rounded object-cover shrink-0"
          />
        ) : (
          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        )}

        <span className="flex-1 text-left truncate">
          {selected ? (
            <span className="text-zinc-700 dark:text-zinc-300">
              {selected.projectName}
            </span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500">
              {placeholder}
            </span>
          )}
        </span>

        {selected ? (
          <X
            className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown
            className={`
              w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform
              ${open ? "rotate-180" : ""}
            `}
          />
        )}
      </button>

      {open && (
        <div
          className={`
            absolute top-[calc(100%+6px)] z-50 w-72
            bg-white dark:bg-[#09090b]
            border border-zinc-200 dark:border-[#252525]
            rounded-2xl shadow-xl overflow-hidden
            animate-in fade-in-0 zoom-in-95 duration-100
            ${align === "right" ? "right-0" : "left-0"}
          `}
        >
          <div className="px-3 pt-3 pb-2">
            <p className="text-[11px] font-sfpro-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Projects
            </p>
          </div>

          <div className="px-2 pb-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full px-3 py-1.5 text-[13px]
                bg-zinc-50 dark:bg-[#18181b]
                border border-zinc-100 dark:border-[#27272a]
                rounded-lg outline-none
                text-zinc-900 dark:text-zinc-100
                font-sfpro placeholder:text-zinc-400
              "
            />
          </div>

          <div
            className="overflow-y-auto max-h-64 px-1.5 pb-1.5"
            style={{ scrollbarWidth: "thin" }}
          >
            {loading && (
              <div className="flex flex-col gap-1 py-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-2 py-1.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-[#27272a] animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-3/4 rounded-full bg-zinc-100 dark:bg-[#27272a] animate-pulse" />
                      <div className="h-2 w-1/3 rounded-full bg-zinc-100 dark:bg-[#27272a] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && error && (
              <div className="px-3 py-6 text-center">
                <p className="text-[12px] text-rose-500 font-sfpro">{error}</p>
                <button
                  onClick={retryLoad}
                  className="mt-2 text-[12px] text-zinc-400 underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Loaded ── */}
            {!loading && !error && (
              <>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(null)}
                  className={`
                    w-full flex items-center gap-2.5 mb-0.5 px-2 py-1.5
                    rounded-lg text-left text-[13px] font-sfpro
                    transition-colors duration-150
                    ${!value
                      ? "bg-zinc-100 dark:bg-[#202020] text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-[#27272a]"
                    }
                  `}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-[#27272a] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span>All Projects</span>
                </button>

                {filtered.map((project) => {
                  const isSelected = String(project.projectId) === String(value)
                  return (
                    <button
                      key={project.projectId}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(project)}
                      className={`
                        w-full flex items-center gap-2.5 mb-0.5 px-2 py-1.5
                        rounded-lg text-left transition-colors duration-150
                        ${isSelected
                          ? "bg-zinc-100 dark:bg-[#202020]"
                          : "hover:bg-zinc-50 dark:hover:bg-[#27272a]"
                        }
                      `}
                    >
                      {/* Thumbnail */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-[#27272a]">
                        {project.coverImage ? (
                          <img
                            src={project.coverImage}
                            alt={project.projectName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-sfpro-bold text-zinc-400">
                            {project.projectName?.[0]?.toUpperCase() ?? "P"}
                          </div>
                        )}
                      </div>

                      {/* Name + status */}
                      <div className="flex-1 min-w-0">
                        <p className={`
                          text-[13px] truncate leading-tight
                          ${isSelected
                            ? "font-sfpro-medium text-zinc-900 dark:text-zinc-100"
                            : "font-sfpro text-zinc-700 dark:text-zinc-300"
                          }
                        `}>
                          {project.projectName}
                        </p>
                        <span className={`
                          text-[11px] font-sfpro capitalize
                          ${STATUS_COLOR[project.status] ?? "text-zinc-400"}
                        `}>
                          {project.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </button>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-[#202020] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-[13px] font-sfpro text-zinc-400 dark:text-zinc-500">
                      No projects found
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}