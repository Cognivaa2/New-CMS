import axios from "axios";
import { jwtDecode } from "jwt-decode";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function loginUser({ identifier, password }) {
    const payload = { identifier, password };
    try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/login`, payload, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!data.success) {
            throw new Error(data.description || data.message || "Login failed");
        }
        const { accessToken, refreshToken, companyId, keycloakId, avatar } = data.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("companyId", companyId);
        localStorage.setItem("keycloakId", keycloakId);
        localStorage.setItem("avatar", avatar || "");  
        const decoded = jwtDecode(accessToken);
        localStorage.setItem("roleId", decoded.roleId || "");
        localStorage.setItem("isOwner", decoded.isOwner || "false");
        return data;
    } catch (error) {
        const message =
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Login failed";
        throw new Error(message);
    }
}

export function validateLoginForm({ identifier, password }) {
    if (!identifier.trim()) {
        return "Please enter your email or phone.";
    }
    if (!password.trim()) {
        return "Please enter your password.";
    }
    if (password.length < 6) {
        return "Password must be at least 6 characters.";
    }
    return null;
}

export async function logoutUserApi(refreshToken) {
    try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/logout`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
        );
        return data;
    } catch {
        return {};
    }
}