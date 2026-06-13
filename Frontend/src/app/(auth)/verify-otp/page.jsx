"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { toast } from "sonner";
import { verifyOtp, resendOtp, maskEmail, createEmptyOtp, handleOtpChange, handleOtpKeyDown, handleOtpPaste, isOtpComplete, OTP_LENGTH } from "./api";

function VerifyOtpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const companyName = searchParams.get("companyName") || "";

    const [mounted, setMounted] = useState(false);
    const [otp, setOtp] = useState(createEmptyOtp());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && !email) router.replace("/register");
    }, [mounted, email, router]);

    useEffect(() => {
        if (resendTimer <= 0) { setCanResend(true); return; }
        const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    useEffect(() => {
        if (mounted && inputRefs.current[0]) inputRefs.current[0].focus();
    }, [mounted]);

    const resetOtp = () => {
        setOtp(createEmptyOtp());
        inputRefs.current[0]?.focus();
    };

    const handleResend = async () => {
        if (!canResend) return;
        try {
            setError("");
            const data = await resendOtp({ email, companyName });
            setResendTimer(30);
            setCanResend(false);
            resetOtp();

            toast.success(data.title || "OTP Resent", {
                description: data.description || "A new OTP has been sent to your email.",
            });
        } catch (err) {
            toast.error("Resend Failed", {
                description: err.message || "Failed to resend OTP. Please try again.",
            });
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const otpValue = otp.join("");
        if (otpValue.length !== OTP_LENGTH) {
            setError(`Please enter the complete ${OTP_LENGTH}-digit code.`);
            return;
        }

        try {
            setLoading(true);
            setError("");
            const data = await verifyOtp({ email, otp: otpValue });

            toast.success(data.title || "Verified Successfully", {
                description: data.description || "Your account has been verified. Redirecting to login...",
            });

            router.push("/login");
        } catch (err) {
            toast.error("Verification Failed", {
                description: err.message || "Invalid OTP. Please try again.",
            });
            setError(err.message || "Invalid OTP. Please try again.");
            resetOtp();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${mounted ? "animate-slideUp" : "opacity-0"} w-full max-w-225 rounded-[20px] p-px bg-[linear-gradient(180deg,#252525_0%,#0b0b0b_100%)]`}>
            <div className="w-full max-w-225 bg-[linear-gradient(135deg,#000000_0%,#1b1b1b_100%)] border border-white/[0.07] rounded-[20px] px-6 py-12 sm:px-16 sm:py-16 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#202020]" />
                <div className="text-center mb-10 lg:mb-16">
                    <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-sfpro-bold text-white tracking-tight leading-[1.15] mb-2.5">Verify Your Email</h1>
                    <p className="text-sm font-sfpro text-[#C2C2C2] leading-relaxed max-w-85 mx-auto">
                        We&apos;ve sent a {OTP_LENGTH}-digit verification code to{" "}
                        <span className="text-white font-sfpro-bold">{maskEmail(email)}</span>. Enter it below to continue.
                    </p>
                </div>
                <form onSubmit={handleVerify}>
                    <div className="w-full flex flex-col items-center gap-3 mb-10">
                        <div className="flex items-center justify-center gap-3 sm:gap-4">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange({ index, value: e.target.value, otp, setOtp, setError, inputRefs })}
                                    onKeyDown={(e) => handleOtpKeyDown({ index, otp, inputRefs, e })}
                                    onPaste={index === 0 ? (e) => handleOtpPaste({ e, setOtp, setError, inputRefs }) : undefined}
                                    disabled={loading}
                                    className="w-14 h-16 sm:w-16 sm:h-18 bg-black/22 rounded-[10px] border border-[#292929] text-center text-2xl font-sfpro-bold text-white outline-none focus:border-white/30 disabled:opacity-50 transition-all duration-200 appearance-none caret-white"
                                />
                            ))}
                        </div>
                        {error && <p className="text-sm font-sfpro text-red-400 text-center max-w-85 leading-snug mt-2">{error}</p>}
                        <div className="mt-4">
                            {canResend ? (
                                <button type="button" onClick={handleResend} className="cursor-pointer text-sm font-sfpro text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200 bg-transparent border-none">Resend Code</button>
                            ) : (
                                <p className="text-sm font-sfpro text-[#cfcfcf]">Resend code in{" "}<span className="text-white font-sfpro-bold">00:{resendTimer.toString().padStart(2, "0")}</span></p>
                            )}
                        </div>
                    </div>
                    <div className="text-center">
                        <button type="submit" disabled={!isOtpComplete(otp) || loading} className="cursor-pointer inline-flex items-center justify-center bg-white text-[#0a0a0a] border-none rounded-xl font-sfpro-bold text-base px-14 py-4 min-w-50 hover:opacity-85 hover:-translate-y-px active:translate-y-0 active:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Verifying...
                                </span>
                            ) : "Verify & Continue"}
                        </button>
                    </div>
                </form>
                <p className="text-center mt-5 text-[13px] font-sfpro text-[#cfcfcf]">
                    Entered wrong email?&nbsp;
                    <Link href="/register" className="text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200">Go back</Link>
                </p>
            </div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-225 flex items-center justify-center py-20">
                <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
        }>
            <VerifyOtpContent />
        </Suspense>
    );
}