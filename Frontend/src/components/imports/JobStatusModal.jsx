"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, XCircle, Loader2, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { fetchImportStatus } from "@/app/(companyname)/imports/api"

const POLL_INTERVAL = 2500

function StatusBadge({ status }) {
  const config = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    partial: "Partial",
    failed: "Failed",
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-sfpro-medium border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-zinc-300">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 bg-gray-900 dark:bg-white ${
        status === "processing" || status === "pending" ? "animate-pulse" : ""
      }`} />
      {config[status] || status}
    </span>
  )
}

function ProgressBar({ value }) {
  return (
    <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 bg-gray-900 dark:bg-white"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

function ResultRow({ row, index }) {
  const isSuccess = row.status === "success"

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-[12px] font-sfpro border ${
      isSuccess
        ? "bg-gray-50 dark:bg-zinc-800/30 border-gray-100 dark:border-zinc-800"
        : "bg-gray-50 dark:bg-zinc-800/30 border-gray-200 dark:border-zinc-700"
    }`}>
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-sfpro-medium text-gray-500 dark:text-zinc-500">
          Row {row.row ?? index + 1}:
        </span>{" "}
        <span className={isSuccess
          ? "text-gray-900 dark:text-white"
          : "text-gray-500 dark:text-zinc-400"
        }>
          {isSuccess
            ? (row.identifier || "Imported successfully")
            : (row.error || "Failed")}
        </span>
      </div>
    </div>
  )
}

export default function JobStatusModal({ jobId, moduleName, open, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [job, setJob] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const pollerRef = useRef(null)
  const controllerRef = useRef(null)

  const isTerminal = job && ["completed", "failed", "partial"].includes(job.status)

  const poll = async () => {
    if (!jobId) return
    try {
      controllerRef.current?.abort()
      const ctrl = new AbortController()
      controllerRef.current = ctrl
      const data = await fetchImportStatus(jobId, ctrl.signal)
      setJob(data)
      if (["completed", "failed", "partial"].includes(data.status)) {
        clearInterval(pollerRef.current)
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "CanceledError") {
        clearInterval(pollerRef.current)
      }
    }
  }

  useEffect(() => {
    if (open && jobId) {
      setMounted(true)
      setJob(null)
      setShowResults(false)
      poll()
      pollerRef.current = setInterval(poll, POLL_INTERVAL)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      clearInterval(pollerRef.current)
      controllerRef.current?.abort()
      const t = setTimeout(() => {
        setMounted(false)
        setJob(null)
      }, 300)
      return () => clearTimeout(t)
    }
    return () => {
      clearInterval(pollerRef.current)
      controllerRef.current?.abort()
    }
  }, [open, jobId])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && isTerminal) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, isTerminal, onClose])

  if (!mounted) return null

  const successPct = job?.totalRows
    ? Math.round(((job.successCount ?? 0) / job.totalRows) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={isTerminal ? onClose : undefined}
      />

      <div
        className={`relative w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <div>
            <h2 className="text-[17px] font-sfpro-bold text-gray-900 dark:text-white">
              Import Status
            </h2>
            <p className="text-[12px] font-sfpro text-gray-400 dark:text-zinc-500 mt-0.5">
              {moduleName}
            </p>
          </div>
          {isTerminal && (
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-[#212121] dark:bg-white flex items-center justify-center hover:scale-90 transition-transform duration-200 cursor-pointer"
            >
              <X className="w-4 h-4 text-white dark:text-black" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="h-px bg-gray-100 dark:bg-zinc-800" />

        <div className="px-6 py-5 flex flex-col gap-5">
          {!job ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-zinc-500" />
              <p className="text-sm font-sfpro text-gray-500 dark:text-zinc-500">
                Connecting to job...
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <StatusBadge status={job.status} />
                {(job.status === "pending" || job.status === "processing") && (
                  <div className="flex items-center gap-1.5 text-[12px] font-sfpro text-gray-400 dark:text-zinc-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing…
                  </div>
                )}
              </div>

              {job.totalRows > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[12px] font-sfpro text-gray-500 dark:text-zinc-400">
                    <span>
                      Total rows:{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {job.totalRows}
                      </strong>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-sfpro-medium text-gray-900 dark:text-white">
                        {job.successCount ?? 0} success
                      </span>
                      {(job.failedCount ?? 0) > 0 && (
                        <span className="font-sfpro-medium text-gray-400 dark:text-zinc-500">
                          {job.failedCount} failed
                        </span>
                      )}
                    </div>
                  </div>
                  <ProgressBar value={successPct} />
                </div>
              )}

              {isTerminal && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: job.totalRows },
                    { label: "Imported", value: job.successCount ?? 0 },
                    { label: "Failed", value: job.failedCount ?? 0 },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl py-3 border border-gray-100 dark:border-zinc-700/50"
                    >
                      <span className="text-xl font-sfpro-bold text-gray-900 dark:text-white">
                        {value}
                      </span>
                      <span className="text-[11px] font-sfpro text-gray-400 dark:text-zinc-500">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {job.errorMessage && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-gray-900 dark:text-white shrink-0 mt-0.5" />
                  <p className="text-[12px] font-sfpro text-gray-600 dark:text-zinc-400">
                    {job.errorMessage}
                  </p>
                </div>
              )}

              {isTerminal && job.results?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowResults((v) => !v)}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                  >
                    <span className="text-[12px] font-sfpro-bold text-gray-700 dark:text-zinc-300">
                      Row Details ({job.results.length})
                    </span>
                    {showResults ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    )}
                  </button>

                  {showResults && (
                    <div
                      className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      {job.results.map((row, i) => (
                        <ResultRow key={i} row={row} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {isTerminal && (
          <>
            <div className="h-px bg-gray-100 dark:bg-zinc-800" />
            <div className="flex justify-end px-6 py-4">
              <button
                onClick={onClose}
                className="h-9 px-5 rounded-lg text-[13.5px] font-sfpro-bold bg-[#212121] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}