"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef, Suspense } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import {
  verifyOtp,
  resetPassword,
  resendOtp,
  validateOtp,
  validatePasswords,
  maskEmail,
  createEmptyOtp,
  isOtpComplete,
  handleOtpChange,
  handleOtpKeyDown,
  handleOtpPaste,
  OTP_LENGTH,
} from "./api"

function VerifyOtpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const [step, setStep] = useState(1)
  const [otp, setOtp] = useState(createEmptyOtp())
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef([])
  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    if (mounted && !email) {
      router.replace("/forgot-password")
    }
  }, [mounted, email, router])
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true)
      return
    }
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])
  useEffect(() => {
    if (mounted && step === 1 && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [mounted, step])
  const clearError = () => {
    if (error) setError("")
  }
  const resetOtp = () => {
    setOtp(createEmptyOtp())
    inputRefs.current[0]?.focus()
  }
  const handleResendOtp = async () => {
    if (!canResend) return
    try {
      setError("")
      const data = await resendOtp(email)
      toast.success(data.title || "OTP Resent", {
        description: data.description || "A new OTP has been sent to your email",
      })
      setResendTimer(30)
      setCanResend(false)
      resetOtp()
    } catch (err) {
      toast.error("Resend Failed", {
        description: err.message || "Failed to resend OTP. Please try again.",
      })
    }
  }
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otpValue = otp.join("")
    const validationError = validateOtp(otpValue)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      setLoading(true)
      setError("")
      const data = await verifyOtp(email, otpValue)
      toast.success(data.title || "OTP Verified", {
        description: data.description || "You may now set your new password",
      })
      setStep(2)
    } catch (err) {
      toast.error("Verification Failed", {
        description: err.message || "Invalid OTP. Please try again.",
      })
      setError(err.message || "Invalid OTP. Please try again.")
      resetOtp()
    } finally {
      setLoading(false)
    }
  }
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError("")
    const validationError = validatePasswords(newPassword, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      setLoading(true)
      const data = await resetPassword(email, newPassword, confirmPassword)
      toast.success(data.title || "Password Reset", {
        description: data.description || "Your password has been reset successfully. Please log in.",
      })
      router.push("/login")
    } catch (err) {
      toast.error("Reset Failed", {
        description: err.message || "Failed to reset password. Please try again.",
      })
      setError(err.message || "Failed to reset password. Please try again.")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className={`${
        mounted ? "animate-slideUp" : "opacity-0"
      } w-full max-w-225 rounded-[20px] p-px bg-[linear-gradient(180deg,#252525_0%,#0b0b0b_100%)]`}
    >
      <div className="w-full max-w-225 bg-[linear-gradient(135deg,#000000_0%,#1b1b1b_100%)] border border-white/[0.07] rounded-[20px] px-6 py-12 sm:px-16 sm:py-16 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#202020]" />
        {step === 1 && (
          <div className="animate-slideUp">
            <div className="text-center mb-10 lg:mb-16">
              <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-sfpro-bold text-white tracking-tight leading-[1.15] mb-2.5">
                Enter OTP
              </h1>
              <p className="text-sm font-sfpro text-[#C2C2C2] leading-relaxed max-w-85 mx-auto">
                We've sent a {OTP_LENGTH}-digit code to{" "}
                <span className="text-white font-sfpro-medium">{maskEmail(email)}</span>.
                Enter it below to continue.
              </p>
            </div>
            <form onSubmit={handleVerifyOtp}>
              <div className="w-full flex flex-col items-center gap-3 mb-8">
                <div
                  className="flex items-center justify-center gap-2 sm:gap-3"
                  onPaste={(e) => handleOtpPaste({ e, setOtp, setError, inputRefs })}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange({
                          index,
                          value: e.target.value,
                          otp,
                          setOtp,
                          setError,
                          inputRefs,
                        })
                      }
                      onKeyDown={(e) => handleOtpKeyDown({ index, otp, inputRefs, e })}
                      disabled={loading}
                      className="w-11 h-13 sm:w-13 sm:h-15 text-center text-xl font-sfpro-bold text-white bg-black/22 rounded-[10px] border border-[#292929] outline-none focus:border-white/30 disabled:opacity-50 transition-all duration-200 appearance-none caret-white"
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-sm font-sfpro text-red-400 text-center max-w-85 leading-snug mt-2">
                    {error}
                  </p>
                )}
                <div className="mt-4">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="cursor-pointer text-sm font-sfpro text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200 bg-transparent border-none"
                    >
                      Resend Code
                    </button>
                  ) : (
                    <p className="text-sm font-sfpro text-[#cfcfcf]">
                      Resend code in{" "}
                      <span className="text-white font-sfpro-bold">
                        00:{resendTimer.toString().padStart(2, "0")}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-center mb-5">
                <button
                  type="submit"
                  disabled={!isOtpComplete(otp) || loading}
                  className="cursor-pointer inline-flex items-center justify-center bg-white text-[#0a0a0a] border-none rounded-xl font-sfpro-bold text-base px-14 py-4 min-w-50 hover:opacity-85 hover:-translate-y-px active:translate-y-0 active:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    "Verify OTP"
                  )}
                </button>
              </div>
              <p className="text-center text-[13px] font-sfpro text-[#cfcfcf]">
                Entered wrong email?&nbsp;
                <Link
                  href="/forgot-password"
                  className="text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200"
                >
                  Go back
                </Link>
              </p>
            </form>
          </div>
        )}
        {step === 2 && (
          <div className="animate-slideUp">
            <div className="text-center mb-10 lg:mb-16">
              <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-sfpro-bold text-white tracking-tight leading-[1.15] mb-2.5">
                Set New Password
              </h1>
              <p className="text-sm font-sfpro text-[#C2C2C2] leading-relaxed max-w-85 mx-auto">
                Your identity is verified. Create a strong new password for your account.
              </p>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="w-full flex flex-col items-center gap-3 mb-8">
                <div className="w-full flex items-center justify-center">
                  <div className="relative w-full xl:w-97">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        clearError()
                      }}
                      disabled={loading}
                      className="w-full bg-black/22 rounded-[10px] border border-[#292929] px-6 py-4 pr-12 text-sm font-sfpro text-white placeholder:text-[#CFCFCF] outline-none focus:border-white/20 transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-white transition-colors duration-200 disabled:opacity-50"
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="w-full flex items-center justify-center">
                  <div className="relative w-full xl:w-97">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearError()
                      }}
                      disabled={loading}
                      className="w-full bg-black/22 rounded-[10px] border border-[#292929] px-6 py-4 pr-12 text-sm font-sfpro text-white placeholder:text-[#CFCFCF] outline-none focus:border-white/20 transition-all duration-200 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-white transition-colors duration-200 disabled:opacity-50"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-sm font-sfpro text-red-400 text-center max-w-85 leading-snug">
                    {error}
                  </p>
                )}
                <p className="text-xs font-sfpro text-[#888] text-center max-w-85 mt-2">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer inline-flex items-center justify-center bg-white text-[#0a0a0a] border-none rounded-xl font-sfpro-bold text-base px-14 py-4 min-w-50 hover:opacity-85 hover:-translate-y-px active:translate-y-0 active:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Resetting...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
            <p className="text-center mt-5 text-[13px] font-sfpro text-[#cfcfcf]">
              Session expired?&nbsp;
              <Link
                href="/forgot-password"
                className="text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200"
              >
                Start over
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
export default function VerifyOtpForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-225 flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  )
}