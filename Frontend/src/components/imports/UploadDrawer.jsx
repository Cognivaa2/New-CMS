"use client"

import { useEffect, useState } from "react"
import { UploadCloud, Check, Loader2, X, FileSpreadsheet, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const MAX_FILE_SIZE = 20 * 1024 * 1024 
const ACCEPTED = ".xlsx,.csv"

function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  )
}

export default function UploadDrawer({ open, module, onClose, onSubmit, isUploading = false }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setSelectedFile(null)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setSelectedFile(null)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open && !submitting && !isUploading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submitting, isUploading, onClose])

  const isLoading = submitting || isUploading

  const validateAndSetFile = (file) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "Maximum file size is 20MB" })
      return
    }
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["xlsx", "csv"].includes(ext)) {
      toast.error("Invalid file type", { description: "Only .xlsx and .csv files are supported" })
      return
    }
    setSelectedFile(file)
  }

  const handleFileChange = (e) => validateAndSetFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    validateAndSetFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!selectedFile || !module) return
    setSubmitting(true)
    try {
      await onSubmit({ module: module.key, file: selectedFile })
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <>
      <Backdrop visible={visible} onClose={() => !isLoading && onClose()} />
      <div
        style={{
          transitionDuration: "700ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl max-h-[90dvh] lg:max-h-[60dvh] flex flex-col">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
          </div>

          <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
            <div>
              <h2 className="text-xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5]">
                Import {module?.label}
              </h2>
              <p className="text-sm font-sfpro text-gray-500 dark:text-zinc-500 mt-0.5">
                Upload an Excel or CSV file to import data
              </p>
            </div>
            <button
              onClick={() => !isLoading && onClose()}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-8 lg:px-24 xl:px-48 pb-28"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-sfpro-medium text-blue-700 dark:text-blue-300">
                    Expected columns for <strong>{module?.label}</strong>
                  </p>
                  <p className="text-[11px] font-sfpro text-blue-600/80 dark:text-blue-400/80 mt-0.5 font-mono">
                    {module?.templateHeaders?.join(", ")}
                  </p>
                </div>
              </div>

              <label
                className={`w-full h-44 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer relative overflow-hidden ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                } ${
                  isDragging
                    ? "border-[#545ceb] bg-[#545ceb]/5"
                    : selectedFile
                    ? "border-green-400 bg-green-50/50 dark:bg-green-500/5"
                    : "border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 hover:bg-gray-100 dark:hover:bg-zinc-800/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={isLoading ? undefined : handleDrop}
              >
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  accept={ACCEPTED}
                  onChange={handleFileChange}
                  disabled={isLoading}
                />

                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-3">
                      <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-[13.5px] font-sfpro-bold text-green-700 dark:text-green-400 text-center px-4 truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] font-sfpro text-gray-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm flex items-center justify-center mb-3">
                      <FileSpreadsheet
                        className={`w-6 h-6 ${isDragging ? "text-[#545ceb]" : "text-gray-400 dark:text-zinc-500"}`}
                      />
                    </div>
                    <p className="text-[13.5px] font-sfpro-medium text-gray-700 dark:text-zinc-300">
                      <span className="text-[#545ceb] font-sfpro-bold">Click to upload</span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-[11px] font-sfpro text-gray-400 dark:text-zinc-600 mt-1.5">
                      Excel (.xlsx) or CSV — max 20MB
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#09090b]">
            <button
              onClick={() => !isLoading && onClose()}
              disabled={isLoading}
              className="h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
              className={`h-9 px-5 rounded-lg text-[13.5px] font-sfpro-bold transition-all flex items-center gap-2 ${
                selectedFile && !isLoading
                  ? "bg-[#212121] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200"
                  : "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
              }`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Uploading..." : "Start Import"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}