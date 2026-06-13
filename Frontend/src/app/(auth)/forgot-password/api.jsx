import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function forgotPassword(email) {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/forgot-password`,
      { email },
      { headers: { "Content-Type": "application/json" } }
    )

    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to send OTP")
    }

    return data
  } catch (error) {
    const message =
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to send OTP"
    throw new Error(message)
  }
}
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return "Please enter your email address"
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address"
  }
  return null
}