"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import { clearAuthStorage, getRefreshToken } from "@/lib/auth.js";
import { validateSession, scheduleRefresh, clearRefreshTimer, callRefreshApi } from "@/lib/tokenManager.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const router = useRouter();
    const hasInitialized = useRef(false);
    const [authState, setAuthState] = useState({
        status: "loading",
        userId: null,
        companyId: null,
        roleId: null,
        isOwner: false,
        avatar: null,   
    });

    const buildStateFromToken = useCallback((accessToken) => {
        const decoded = jwtDecode(accessToken);
        return {
            status: "authenticated",
            userId: localStorage.getItem("keycloakId"),
            companyId: decoded.companyId || localStorage.getItem("companyId"),
            roleId: decoded.roleId || localStorage.getItem("roleId"),
            isOwner: decoded.isOwner === "true" || decoded.isOwner === true,
            avatar: localStorage.getItem("avatar") || null, 
        };
    }, []);

    const handleExpired = useCallback(() => {
        clearRefreshTimer();
        clearAuthStorage();
        setAuthState({
            status: "unauthenticated",
            userId: null,
            companyId: null,
            roleId: null,
            isOwner: false,
            avatar: null,  
        });
        toast.error("Session expired", {
            description: "Please log in again to continue.",
        });
        router.push("/login");
    }, [router]);

    const handleRefreshed = useCallback((tokens) => {
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);
    }, []);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        async function boot() {
            const result = await validateSession();
            if (!result.valid) {
                setAuthState({
                    status: "unauthenticated",
                    userId: null,
                    companyId: null,
                    roleId: null,
                    isOwner: false,
                    avatar: null,   
                });
                return;
            }
            try {
                setAuthState(buildStateFromToken(result.accessToken));
                scheduleRefresh(result.accessToken, handleRefreshed, handleExpired);
            } catch {
                handleExpired();
            }
        }
        boot();
        return () => clearRefreshTimer();
    }, [buildStateFromToken, handleExpired, handleRefreshed]);

    const onLoginSuccess = useCallback((accessToken) => {
        try {
            setAuthState(buildStateFromToken(accessToken));
            scheduleRefresh(accessToken, handleRefreshed, handleExpired);
        } catch {
            handleExpired();
        }
    }, [buildStateFromToken, handleExpired, handleRefreshed]);

    const onLogout = useCallback(() => {
        clearRefreshTimer();
        clearAuthStorage();
        setAuthState({
            status: "unauthenticated",
            userId: null,
            companyId: null,
            roleId: null,
            isOwner: false,
            avatar: null,   
        });
    }, []);

    return (
        <AuthContext.Provider value={{ authState, onLoginSuccess, onLogout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}