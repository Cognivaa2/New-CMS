"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { registerCompany, validateRegisterForm } from "./api";

export default function RegisterPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => { setMounted(true); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const validationError = validateRegisterForm({ companyName, email, agreed });
        if (validationError) { setError(validationError); return; }

        try {
            setLoading(true);
            const data = await registerCompany({ companyName: companyName.trim(), email: email.trim() });

            toast.success(data.title || "OTP Sent", {
                description: data.description || "OTP has been sent to your email.",
            });

            router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}&companyName=${encodeURIComponent(companyName.trim())}`);
        } catch (err) {
            toast.error("Registration Failed", {
                description: err.message || "Something went wrong. Please try again.",
            });
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => { if (error) setError(""); };

    return (
        <div className={`${mounted ? "animate-slideUp" : "opacity-0"} w-full max-w-225 rounded-[20px] p-px bg-[linear-gradient(180deg,#252525_0%,#0b0b0b_100%)]`}>
            <div className="w-full max-w-225 bg-[linear-gradient(135deg,#000000_0%,#1b1b1b_100%)] border border-white/[0.07] rounded-[20px] px-6 py-12 sm:px-16 sm:py-16 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#202020]" />
                <div className="text-center mb-10 lg:mb-16">
                    <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-sfpro-bold text-white tracking-tight leading-[1.15] mb-2.5">Create Your Account</h1>
                    <p className="text-sm font-sfpro text-[#C2C2C2] leading-relaxed max-w-85 mx-auto">Get started in seconds and take control of your projects, tasks, and team collaboration.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="w-full flex flex-col items-center gap-3 mb-5">
                        <div className="w-full flex items-center justify-center">
                            <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => { setCompanyName(e.target.value); clearError(); }} className="w-full xl:w-97 bg-black/22 rounded-[10px] border border-[#292929] px-6 py-4 text-sm font-sfpro text-white placeholder:text-[#CFCFCF] outline-none focus:border-white/20 transition-all duration-200 appearance-none" />
                        </div>
                        <div className="w-full flex items-center justify-center">
                            <input type="email" placeholder="Company Email" value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }} className="w-full xl:w-97 bg-black/22 rounded-[10px] border border-[#292929] px-6 py-4 text-sm font-sfpro text-white placeholder:text-[#CFCFCF] outline-none focus:border-white/20 transition-all duration-200 appearance-none" />
                        </div>
                        {error && (<p className="text-sm font-sfpro text-red-400 text-center max-w-85 leading-snug">{error}</p>)}
                        <div className="flex items-center gap-2.5 mb-8 mt-6">
                            <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); clearError(); }} className="w-4 h-4 min-w-4.5 accent-white cursor-pointer rounded" />
                            <label className="text-sm font-sfpro text-[#cfcfcf] leading-snug cursor-pointer">By continuing you agree to the{" "}
                                <Link href="/terms" className="underline underline-offset-2 hover:text-white transition-colors duration-200">Terms</Link>{" "}and{" "}
                                <Link href="/privacy" className="underline underline-offset-2 hover:text-white transition-colors duration-200">Privacy Policies</Link>
                            </label>
                        </div>
                    </div>
                    <div className="text-center">
                        <button type="submit" disabled={loading} className="cursor-pointer inline-flex items-center justify-center bg-white text-[#0a0a0a] border-none rounded-xl font-sfpro-bold text-base px-14 py-4 min-w-50 hover:opacity-85 hover:-translate-y-px active:translate-y-0 active:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Sending OTP...
                                </span>
                            ) : "Get Started"}
                        </button>
                    </div>
                </form>
                <p className="text-center mt-5 text-[13px] font-sfpro text-[#cfcfcf]">
                    Already have an account?&nbsp;
                    <Link href="/login" className="text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200">Log in</Link>
                </p>
            </div>
        </div>
    );
}