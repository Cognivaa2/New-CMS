"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { loginUser, validateLoginForm } from "./api";
import { useAuth } from "@/components/contexts/AuthContext";

function LoadingCard() {
    return (
        <div className="w-full max-w-225 rounded-[20px] p-px bg-[linear-gradient(180deg,#252525_0%,#0b0b0b_100%)]">
            <div className="w-full max-w-225 bg-[linear-gradient(135deg,#000000_0%,#1b1b1b_100%)] border border-white/[0.07] rounded-[20px] px-6 py-12 sm:px-16 sm:py-16 flex items-center justify-center min-h-80">
                <svg className="animate-spin h-6 w-6 text-white/40" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        </div>
    );
}


export default function LoginPage() {
    const router = useRouter();
    const { authState, onLoginSuccess } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (authState.status === "authenticated") {
            router.replace("/dashboard");
        }
    }, [authState.status, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const validationError = validateLoginForm({ identifier, password });
        if (validationError) { setError(validationError); return; }
        try {
            setLoading(true);
            const data = await loginUser({
                identifier: identifier.trim(),
                password: password.trim(),
            });
            onLoginSuccess(data.data.accessToken);
            toast.success(data.title || "Login Successful", {
                description: data.description || "Welcome back!",
            });
            router.push("/dashboard");
        } catch (err) {
            toast.error("Login Failed", {
                description: err.message || "Invalid credentials. Please try again.",
            });
            setError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => { if (error) setError(""); };

    if (authState.status === "loading") return <LoadingCard />;

    if (authState.status === "authenticated") return null;

    return (
        <div className={`${mounted ? "animate-slideUp" : "opacity-0"} w-full max-w-225 rounded-[20px] p-px bg-[linear-gradient(180deg,#252525_0%,#0b0b0b_100%)`}>
            <div className="w-full max-w-225 bg-[linear-gradient(135deg,#000000_0%,#1b1b1b_100%)] border border-white/[0.07] rounded-[20px] px-6 py-12 sm:px-16 sm:py-16 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-3 rounded-2xl border border-[#202020]" />
                <div className="text-center mb-10 lg:mb-16">
                    <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-sfpro-bold text-white tracking-tight leading-[1.15] mb-2.5">
                        Welcome Back
                    </h1>
                    <p className="text-sm font-sfpro text-[#C2C2C2] leading-relaxed max-w-85 mx-auto">
                        Sign in to continue managing your workspace and stay on track with your projects.
                    </p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="w-full flex flex-col items-center gap-3 mb-5">
                        <div className="w-full flex items-center justify-center">
                            <input
                                type="text"
                                placeholder="Email or Phone"
                                value={identifier}
                                onChange={(e) => { setIdentifier(e.target.value); clearError(); }}
                                className="w-full xl:w-97 bg-black/22 rounded-[10px] border border-[#292929] px-6 py-4 text-sm font-sfpro text-white placeholder:text-[#CFCFCF] outline-none focus:border-white/20 transition-all duration-200 appearance-none"
                            />
                        </div>
                        <div className="w-full flex items-center justify-center">
                            <div className="relative w-full xl:w-97">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                                    className="w-full bg-black/22 rounded-[10px] border border-[#292929] px-6 py-4 pr-12 text-sm font-sfpro text-white placeholder:text-[#CFCFCF] outline-none focus:border-white/20 transition-all duration-200 appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CFCFCF] hover:text-white transition-colors duration-200 cursor-pointer outline-none"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword
                                        ? <EyeOff size={18} strokeWidth={1.8} />
                                        : <Eye size={18} strokeWidth={1.8} />}
                                </button>
                            </div>
                        </div>
                        {error && (
                            <p className="text-sm font-sfpro text-red-400 text-center max-w-85 leading-snug">{error}</p>
                        )}
                        <div className="w-full xl:w-97 flex items-center justify-end">
                            <p className="text-center mt-5 text-[13px] font-sfpro text-[#cfcfcf]">
                                <Link href="/forgot-password" className="text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200">
                                    Forgot Password
                                </Link>
                            </p>
                        </div>
                    </div>
                    <div className="text-center">
                        <button type="submit" disabled={loading} className="cursor-pointer inline-flex items-center justify-center bg-white text-[#0a0a0a] border-none rounded-xl font-sfpro-bold text-base px-14 py-4 min-w-50 hover:opacity-85 hover:-translate-y-px active:translate-y-0 active:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : "Log In"}
                        </button>
                    </div>
                </form>
                <p className="text-center mt-5 text-[13px] font-sfpro text-[#cfcfcf]">
                    Don't have an account?&nbsp;
                    <Link href="/register" className="text-[#cfcfcf] underline underline-offset-2 hover:text-white transition-colors duration-200">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}