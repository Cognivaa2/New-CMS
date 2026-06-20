// helpdesk.api.js
import axios from "axios"
import { getAuthHeaders, getBaseUrl, getCompanyId } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

export const helpdeskApi = {
  async raiseTicket({ category, priority, subject, description, attachments = [] }, signal = null) {
    const companyId = getCompanyId()
    const keycloakId = localStorage.getItem("keycloakId")

    if (!companyId) throw new Error("Company ID not found")
    if (!keycloakId) throw new Error("User not authenticated")

    const formData = new FormData()
    formData.append("category", category)
    formData.append("priority", priority || "Medium")
    formData.append("subject", subject.trim())
    formData.append("description", description.trim())
    formData.append("createdBy", keycloakId)

    // Append file attachments
    if (attachments && attachments.length > 0) {
      attachments.forEach((file) => {
        if (file instanceof File) {
          formData.append("attachments", file)
        }
      })
    }

    const headers = getAuthHeaders()
    headers["x-company-id"] = companyId
    delete headers["Content-Type"]

    const { data } = await axios.post(`${API_BASE_URL}/helpdesk`, formData, {
      headers,
      signal,
    })

    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to raise ticket")
    }

    return data.data || data.title
  },
  async getMyTickets({ page = 1, limit = 20, status, priority, category } = {}, signal = null) {
    const companyId = getCompanyId()
    const keycloakId = localStorage.getItem("keycloakId")

    if (!companyId) throw new Error("Company ID not found")
    if (!keycloakId) throw new Error("User not authenticated")

    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(limit))
    if (status) params.set("status", status)
    if (priority) params.set("priority", priority)
    if (category) params.set("category", category)

    const headers = getAuthHeaders()
    headers["x-company-id"] = companyId

    const { data } = await axios.get(
      `${API_BASE_URL}/helpdesk/${keycloakId}?${params.toString()}`,
      { headers, signal }
    )

    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to fetch tickets")
    }

    const result = data.data || data.title || {}
    return {
      tickets: result.tickets || [],
      pagination: result.pagination || {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    }
  },
}