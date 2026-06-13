const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export function getCompanyId() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("companyId")
}

export function getAuthHeaders({ includeContentType = true } = {}) {
  const companyId = getCompanyId()
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  const headers = {}
  if (includeContentType) headers["Content-Type"] = "application/json"
  if (companyId) headers["x-company-id"] = companyId
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  return headers
}

export function getBaseUrl() {
  return BASE_URL
}