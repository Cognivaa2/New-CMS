import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { clearAuthStorage, getRefreshToken, getAccessToken, isTokenExpired } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

let _refreshTimer = null;
let _isRefreshing = false;
let _refreshPromise = null;


export async function callRefreshApi(refreshToken) {
    const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } }
    );
    if (!data.success) throw new Error(data.description || "Refresh failed");
    return data.data;
}

export function scheduleRefresh(accessToken, onRefreshed, onExpired) {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    try {
        const { exp } = jwtDecode(accessToken);
        const msUntilExpiry = exp * 1000 - Date.now();
        const delay = Math.max(msUntilExpiry - 60_000, 5_000);
        _refreshTimer = setTimeout(async () => {
            const refreshToken = getRefreshToken();
            if (!refreshToken) { onExpired(); return; }
            try {
                const tokens = await callRefreshApi(refreshToken);
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);
                onRefreshed(tokens);
                scheduleRefresh(tokens.accessToken, onRefreshed, onExpired);
            } catch {
                onExpired();
            }
        }, delay);
    } catch {
        onExpired();
    }
}

export function clearRefreshTimer() {
    if (_refreshTimer) {
        clearTimeout(_refreshTimer);
        _refreshTimer = null;
    }
}

export async function validateSession() {
    if (_isRefreshing && _refreshPromise) return _refreshPromise;
    const refreshToken = getRefreshToken();
    if (!refreshToken) return { valid: false };
    const accessToken = getAccessToken();
    if (accessToken && !isTokenExpired(accessToken)) {
        return { valid: true, accessToken };
    }
    _isRefreshing = true;
    _refreshPromise = callRefreshApi(refreshToken)
        .then((tokens) => {
            localStorage.setItem("accessToken", tokens.accessToken);
            localStorage.setItem("refreshToken", tokens.refreshToken);
            return { valid: true, accessToken: tokens.accessToken };
        })
        .catch(() => {
            clearAuthStorage();
            return { valid: false };
        })
        .finally(() => {
            _isRefreshing = false;
            _refreshPromise = null;
        });
    return _refreshPromise;
}