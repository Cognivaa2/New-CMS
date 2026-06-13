"use client"
import { useEffect, useState, useRef } from "react"
import { Download, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"
import { downloadDocument } from "@/app/(companyname)/projects/[projectId]/documents/api"

const API_BASE_URL = getBaseUrl()
function getCompanyId() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("companyId") || ""
}
function formatToastError(error) {
  if (typeof error === "string") return error
  if (error?.message) return error.message
  if (error?.description) return error.description
  return "An unexpected error occurred"
}
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
function formatDate(dateString) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
function getFileTypeFromUrl(url) {
  if (!url) return null
  try {
    const pathname = url.split("?")[0].split("#")[0]
    const ext = pathname.split(".").pop()?.toLowerCase()
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "ico", "tiff"]
    if (imageExts.includes(ext)) return "image"
    if (ext === "pdf") return "pdf"
    return null
  } catch {
    return null
  }
}
function resolveFileType(url, declaredType, mimeType) {
  const urlType = getFileTypeFromUrl(url)
  if (urlType) return urlType
  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf"
    if (mimeType.startsWith("image/")) return "image"
  }
  const normalized = declaredType?.toLowerCase()
  if (normalized === "pdf") return "pdf"
  if (normalized === "image") return "image"
  return "other"
}
async function fetchDocumentDetails(projectId, documentId, signal = null) {
  if (!projectId || !documentId) {
    throw new Error("Project ID and Document ID are required")
  }
  const companyId = getCompanyId()
  if (!companyId) throw new Error("Company ID is required")
  console.log("[DocumentViewer] Fetching document:", { projectId, documentId })
  const { data } = await axios.get(
    `${API_BASE_URL}/document/${projectId}/${documentId}`,
    {
      headers: {
        ...getAuthHeaders(),
        "x-company-id": companyId,
      },
      signal,
    }
  )
  console.log("[DocumentViewer] Raw API Response:", data)
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch document")
  }
  const docData = data.title || data.data || data
  console.log("[DocumentViewer] Extracted docData:", docData)
  return {
    id: docData.documentId || docData._id,
    title: docData.name || docData.fileName || "Untitled",
    fileName: docData.fileName || "",
    author: typeof docData.uploadedBy === "object" ? docData.uploadedBy?.name || docData.uploadedBy?.keycloakId || "Unknown" : docData.uploadedBy || "Unknown",
    avatarUrl: typeof docData.uploadedBy === "object" ? docData.uploadedBy?.avatarUrl ?? null : null,
    fileSize: docData.fileSize || 0,
    fileType: docData.fileType?.toLowerCase() || "other",
    mimeType: docData.mimeType || "",
    category: docData.category || "other",
    description: docData.description || "",
    tags: docData.tags || [],
    viewUrl: docData.viewUrl || "",
    fileUrl: docData.fileUrl || "",
    createdAt: docData.createdAt,
    updatedAt: docData.updatedAt,
  }
}
function Backdrop({ visible, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ transitionDuration: "400ms" }}
      className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity ease-in-out ${visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    />
  )
}
function LoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="text-sm font-sfpro text-gray-500">Loading document...</span>
      </div>
    </div>
  )
}
function ErrorState({ message, onRetry }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <p className="text-lg font-sfpro-medium text-gray-600 dark:text-gray-300">
          Failed to load document
        </p>
        <p className="text-sm font-sfpro text-gray-400 mt-1">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-[#27272a] text-gray-700 dark:text-gray-300 text-sm font-sfpro-medium hover:bg-gray-300 dark:hover:bg-[#3f3f46] transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
function PreviewNotAvailable({ onDownload, isDownloading, hasUrl }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <p className="text-lg font-sfpro-medium text-gray-600 dark:text-gray-300">
          Preview not available
        </p>
        <p className="text-sm font-sfpro text-gray-400 mt-1">
          Download the file to view it
        </p>
      </div>
      <button
        onClick={onDownload}
        disabled={isDownloading || !hasUrl}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2a2a] dark:bg-white text-white dark:text-black text-sm font-sfpro-medium hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download File
      </button>
    </div>
  )
}
function PdfViewer({ url, title }) {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  return (
    <>
      {!iframeLoaded && !iframeError && <LoadingState />}
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-500">Failed to load PDF preview</p>
        </div>
      )}
      <iframe
        src={`${url}#toolbar=0&view=Fit`}
        className={`absolute inset-0 w-full h-full border-none transition-opacity duration-300 ${iframeLoaded ? "opacity-100" : "opacity-0"
          }`}
        title={title}
        onLoad={() => setIframeLoaded(true)}
        onError={() => setIframeError(true)}
      />
    </>
  )
}
function ImageViewer({ url, title }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  return (
    <>
      {!loaded && !error && <LoadingState />}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-500">Failed to load image</p>
        </div>
      )}
      <div className={`absolute inset-0 flex items-center justify-center overflow-hidden p-2 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"
        }`}>
        <img
          src={url}
          alt={title}
          draggable={false}
          className="max-w-full max-h-full object-contain select-none"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </div>
    </>
  )
}
export default function DocumentViewerModal({ doc, open, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [fullDoc, setFullDoc] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const controllerRef = useRef(null)
  useEffect(() => {
    if (open && doc?.id && doc?.projectId) {
      setMounted(true)
      setIsLoading(true)
      setError(null)
      setFullDoc(doc)
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      fetchDocumentDetails(doc.projectId, doc.id, controller.signal)
        .then((fetchedDoc) => {
          if (!controller.signal.aborted) {
            console.log("[DocumentViewer] Fetched doc:", fetchedDoc)
            setFullDoc((prev) => ({
              ...prev,
              ...fetchedDoc,
            }))
            setIsLoading(false)
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setVisible(true))
            })
          }
        })
        .catch((err) => {
          if (err.name === "CanceledError" || err.name === "AbortError") {
            return
          }
          console.error("[DocumentViewer] Fetch error:", err)
          setError(err.message || "Failed to load document")
          setIsLoading(false)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setVisible(true))
          })
        })
      return () => controller.abort()
    } else {
      setVisible(false)
      const timer = setTimeout(() => {
        setMounted(false)
        setFullDoc(null)
        setError(null)
      }, 420)
      return () => clearTimeout(timer)
    }
  }, [open, doc?.id, doc?.projectId])
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])
  const handleRetry = () => {
    if (doc?.id && doc?.projectId) {
      setIsLoading(true)
      setError(null)
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      fetchDocumentDetails(doc.projectId, doc.id, controller.signal)
        .then((fetchedDoc) => {
          if (!controller.signal.aborted) {
            setFullDoc((prev) => ({ ...prev, ...fetchedDoc }))
          }
        })
        .catch((err) => {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            setError(err.message || "Failed to load document")
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        })
    }
  }
  
  const handleDownload = async () => {
    if (!fullDoc?.id || !fullDoc?.projectId) {
      toast.error("Download not available")
      return
    }
    setIsDownloading(true)
    try {
      await downloadDocument(
        fullDoc.projectId,
        fullDoc.id,
        fullDoc.fileName || fullDoc.title || "document"
      )
      toast.success("Download started")
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return
      console.error("Download error:", err)
      toast.error("Download failed", { description: formatToastError(err) })
    } finally {
      setIsDownloading(false)
    }
  }


  if (!mounted || !fullDoc) return null
  const displayUrl = fullDoc.viewUrl || fullDoc.fileUrl
  const resolvedType = resolveFileType(displayUrl, fullDoc.fileType || fullDoc.type, fullDoc.mimeType)
  const formattedSize = fullDoc.size || formatFileSize(fullDoc.fileSize || fullDoc.sizeBytes)
  const formattedDate = fullDoc.date || formatDate(fullDoc.createdAt)
  console.log("[DocumentViewer] Render state:", {
    displayUrl,
    resolvedType,
    isLoading,
    error,
    fullDoc,
  })
  return (
    <>
      <Backdrop visible={visible} onClose={onClose} />
      <div
        style={{
          transitionDuration: "600ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="w-full bg-white dark:bg-[#09090b] border-t-2 border-gray-200 dark:border-[#27272a] rounded-t-2xl h-[92dvh] flex flex-col overflow-hidden transition-colors duration-300">
          <div className="flex justify-center pt-3 shrink-0">
            <div className="w-9 lg:w-12 h-0.75 rounded-full bg-gray-300 dark:bg-[#3f3f46] transition-colors" />
          </div>
          <div className="flex items-center justify-between px-6 lg:px-8 pt-4 pb-4 shrink-0 border-b border-gray-100 dark:border-[#27272a] transition-colors">
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-lg lg:text-xl font-sfpro-bold text-[#212121] dark:text-[#f4f4f5] leading-tight transition-colors truncate pr-4">
                {fullDoc.title}
              </h2>
              <p className="text-xs font-sfpro-medium text-gray-500 dark:text-[#71717a] mt-1 transition-colors flex items-center gap-2 flex-wrap">
                {fullDoc.author && (
                  <>
                    <span>{typeof fullDoc.author === "string" ? fullDoc.author : "Unknown"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-[#52525b]" />
                  </>
                )}
                <span>{formattedDate}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-[#52525b]" />
                <span className="uppercase">{resolvedType}</span>
                {fullDoc.category && fullDoc.category !== "other" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-[#52525b]" />
                    <span className="capitalize">{fullDoc.category}</span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden bg-gray-100/50 dark:bg-[#121212] p-4 lg:p-8 transition-colors duration-300">
            <div className="relative w-full h-full rounded-xl border border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#18181b] overflow-hidden shadow-sm">
              {isLoading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} onRetry={handleRetry} />
              ) : !displayUrl ? (
                <PreviewNotAvailable
                  onDownload={handleDownload}
                  isDownloading={isDownloading}
                  hasUrl={false}
                />
              ) : resolvedType === "pdf" ? (
                <PdfViewer url={displayUrl} title={fullDoc.title} />
              ) : resolvedType === "image" ? (
                <ImageViewer url={displayUrl} title={fullDoc.title} />
              ) : (
                <PreviewNotAvailable
                  onDownload={handleDownload}
                  isDownloading={isDownloading}
                  hasUrl={!!displayUrl}
                />
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-between px-6 lg:px-8 py-4 bg-white dark:bg-[#09090b] border-t border-gray-100 dark:border-[#27272a] transition-colors">
            <div className="text-[13px] font-sfpro-medium text-gray-500 dark:text-[#71717a]">
              {formattedSize && `File Size: ${formattedSize}`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] transition-all duration-150"
              >
                Close
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading || !displayUrl}
                className="cursor-pointer h-9 px-4 rounded-lg text-[13.5px] font-sfpro-medium bg-[#2a2a2a] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}