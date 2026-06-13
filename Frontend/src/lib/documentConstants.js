// src/lib/documentConstants.js

export const DOCUMENT_CATEGORIES = [
  { value: "drawing", label: "Drawing" },
  { value: "specification", label: "Specification" },
  { value: "report", label: "Report" },
  { value: "contract", label: "Contract" },
  { value: "safety", label: "Safety" },
  { value: "financial", label: "Financial" },
  { value: "other", label: "Other" },
]

export const FILE_TYPES = [
  { value: "PDF", label: "PDF Documents" },
  { value: "IMAGE", label: "Images" },
  { value: "EXCEL", label: "Excel Files" },
  { value: "WORD", label: "Word Documents" },
  { value: "CAD", label: "CAD Files" },
  { value: "OTHER", label: "Other" },
]

export const ALLOWED_FILE_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.dwg,.dxf"

export const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export function formatToastError(error) {
  const desc =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  return typeof desc === "string" ? desc : "Something went wrong"
}