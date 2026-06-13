import axios from "axios"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper"

const API_BASE_URL = getBaseUrl()

function getAxiosConfig(signal) {
  return {
    baseURL: API_BASE_URL,
    headers: getAuthHeaders(),
    signal,
  }
}

export const notificationApi = {
  getAll(params = {}, signal) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, value)
      }
    })
    const qs = query.toString()
    return axios
      .get(`/notifications${qs ? `?${qs}` : ""}`, getAxiosConfig(signal))
      .then((res) => res.data)
  },

  sendManual({ recipientIds, message }, signal) {
    return axios
      .post(`/notifications/send`, { recipientIds, message }, getAxiosConfig(signal))
      .then((res) => res.data)
  },
}