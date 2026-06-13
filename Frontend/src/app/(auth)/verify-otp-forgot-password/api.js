import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function verifyOtp(email, otp) {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/verify-otp`,
      { email, otp },
      { headers: { "Content-Type": "application/json" } }
    )

    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "OTP verification failed")
    }

    return data
  } catch (error) {
    const message =
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "OTP verification failed"
    throw new Error(message)
  }
}
export async function resetPassword(email, newPassword, confirmPassword) {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/reset-password`,
      { email, newPassword, confirmPassword },
      { headers: { "Content-Type": "application/json" } }
    )

    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Password reset failed")
    }

    return data
  } catch (error) {
    const message =
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Password reset failed"
    throw new Error(message)
  }
}
export async function resendOtp(email) {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/forgot-password`,
      { email },
      { headers: { "Content-Type": "application/json" } }
    )

    if (!data.success && data.statusCode !== 200) {
      throw new Error(data.description || data.message || "Failed to resend OTP")
    }

    return data
  } catch (error) {
    const message =
      error.response?.data?.description ||
      error.response?.data?.message ||
      error.message ||
      "Failed to resend OTP"
    throw new Error(message)
  }
}

export function validateOtp(otp) {
  const otpString = Array.isArray(otp) ? otp.join("") : otp
  if (!otpString || otpString.length !== 6) {
    return "Please enter the complete 6-digit code"
  }
  if (!/^\d{6}$/.test(otpString)) {
    return "OTP must contain only numbers"
  }
  return null
}

export function validatePasswords(newPassword, confirmPassword) {
  if (!newPassword || !newPassword.trim()) {
    return "Please enter a new password"
  }
  if (newPassword.length < 8) {
    return "Password must be at least 8 characters long"
  }
  if (!confirmPassword || !confirmPassword.trim()) {
    return "Please confirm your password"
  }
  if (newPassword !== confirmPassword) {
    return "Passwords do not match"
  }
  return null
}


export function maskEmail(email) {
  if (!email) return ""
  return email.replace(
    /^(.{2})(.*)(@.*)$/,
    (_, start, middle, end) => start + "*".repeat(Math.min(middle.length, 5)) + end
  )
}

export const OTP_LENGTH = 6

export function createEmptyOtp() {
  return Array(OTP_LENGTH).fill("")
}

export function isOtpComplete(otp) {
  return otp.every((digit) => digit !== "")
}

export function handleOtpChange({ index, value, otp, setOtp, setError, inputRefs }) {
  if (value && !/^\d$/.test(value)) return

  const newOtp = [...otp]
  newOtp[index] = value
  setOtp(newOtp)
  if (setError) setError("")

  if (value && index < OTP_LENGTH - 1) {
    inputRefs.current[index + 1]?.focus()
  }
}

export function handleOtpKeyDown({ index, otp, inputRefs, e }) {
  if (e.key === "Backspace" && !otp[index] && index > 0) {
    inputRefs.current[index - 1]?.focus()
  }
}

export function handleOtpPaste({ e, setOtp, setError, inputRefs }) {
  e.preventDefault()
  const pastedData = e.clipboardData.getData("text").trim()
  if (!/^\d+$/.test(pastedData)) return

  const digits = pastedData.slice(0, OTP_LENGTH).split("")
  const newOtp = createEmptyOtp()
  digits.forEach((digit, i) => {
    newOtp[i] = digit
  })
  setOtp(newOtp)
  if (setError) setError("")
  const nextEmpty = newOtp.findIndex((val) => !val)
  inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus()
}