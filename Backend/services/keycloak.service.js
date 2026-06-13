import axios from "axios";
import keycloakConfig, { validateKeycloakConfig } from "../config/keycloak.configs.js";
import logger from "../utils/logger.utils.js";
import { mapKeycloakError } from "../utils/errorHandler.utils.js";

class KeycloakService {

    constructor() {
        this.adminToken = null;
        this.tokenExpiry = null;
        this.baseUrl = `${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}`;
        try {
            validateKeycloakConfig();
            logger.info("Keycloak service initialized successfully");
        } catch (error) {
            logger.error("Keycloak configuration validation failed", {
                error: error.message,
            });
            throw error;
        }
    }

    async getAdminToken() {
        const now = Date.now();
        if (this.adminToken && this.tokenExpiry && now < this.tokenExpiry - 30_000) {
            return this.adminToken;
        }
        try {
            const params = new URLSearchParams({
                grant_type: "password",
                client_id: "admin-cli",
                username: keycloakConfig.adminUsername,
                password: keycloakConfig.adminPassword,
            });
            const response = await axios.post(
                `${keycloakConfig.url}/realms/master/protocol/openid-connect/token`,
                params,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
            this.adminToken = response.data.access_token;
            this.tokenExpiry = now + response.data.expires_in * 1000;
            logger.info("Keycloak admin token refreshed");
            return this.adminToken;
        } catch (error) {
            logger.error("Failed to obtain Keycloak admin token", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async authHeaders() {
        const token = await this.getAdminToken();
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }

    async createUser({ name, email, username, password, phone, address, companyId, about, status, isOwner, roleId }) {
        try {
            const headers = await this.authHeaders();
            const userRepresentation = {
                username,
                email,
                emailVerified: true,
                enabled: true,
                credentials: [
                    {
                        type: "password",
                        value: password,
                        temporary: false,
                    },
                ],
                attributes: {
                    name: [name],
                    phone: [phone ?? ""],
                    address: [address ?? ""],
                    companyId: [String(companyId ?? "")],
                    about: [about ?? ""],
                    status: [status ?? "Active"],
                    isOwner: [String(isOwner ?? false)],
                    roleId: [String(roleId ?? "")],
                },
            };
            const response = await axios.post(
                `${this.baseUrl}/users`,
                userRepresentation,
                { headers }
            );
            const location = response.headers?.location;
            const keycloakId = location ? location.split("/").pop() : null;
            logger.info("User created in Keycloak", { email, username, keycloakId, roleId });
            return keycloakId;
        } catch (error) {
            logger.error("Failed to create user in Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async getUserByEmail(email) {
        try {
            const headers = await this.authHeaders();
            const response = await axios.get(`${this.baseUrl}/users`, {
                headers,
                params: { email, exact: true },
            });
            const users = response.data;
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error("Failed to search user in Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async getUserById(keycloakId) {
        try {
            const headers = await this.authHeaders();
            const response = await axios.get(`${this.baseUrl}/users/${keycloakId}`, { headers });
            return response.data;
        } catch (error) {
            logger.error("Failed to fetch user from Keycloak", { keycloakId, error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async getUserByUsername(username) {
        try {
            const headers = await this.authHeaders();
            const response = await axios.get(`${this.baseUrl}/users`, {
                headers,
                params: { username, exact: true },
            });
            const users = response.data;
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error("Failed to search user by username in Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async getUserByPhone(phone) {
        try {
            const headers = await this.authHeaders();
            const response = await axios.get(`${this.baseUrl}/users`, {
                headers,
                params: { q: `phone:${phone}`, exact: true },
            });
            const users = response.data;
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error("Failed to search user by phone in Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async getUserByUserId(userId) {
        try {
            const headers = await this.authHeaders();
            const response = await axios.get(`${this.baseUrl}/users`, {
                headers,
                params: { q: `userId:${userId}` },
            });
            const users = response.data;
            const matched = users.find(
                (u) => u.attributes?.userId?.[0] === userId
            );
            return matched ?? null;
        } catch (error) {
            logger.error("Failed to search user by userId attribute in Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async updateUser(keycloakId, updates, existingUser = null) {
        try {
            const headers = await this.authHeaders();
            const existing = existingUser ?? await this.getUserById(keycloakId);
            const payload = {
                username: existing.username,
                email: existing.email,
                emailVerified: existing.emailVerified ?? true,
                enabled: existing.enabled ?? true,
                firstName: existing.firstName,
                lastName: existing.lastName,
            };
            if (updates.attributes) {
                payload.attributes = {
                    ...existing.attributes,
                    ...Object.fromEntries(
                        Object.entries(updates.attributes).map(([k, v]) => [k, [String(v)]])
                    ),
                };
            }
            if (updates.email !== undefined) {
                payload.email = updates.email;
                payload.emailVerified = true;
            }
            await axios.put(`${this.baseUrl}/users/${keycloakId}`, payload, { headers });
            logger.info("User updated in Keycloak", { keycloakId });
        } catch (error) {
            logger.error("Failed to update user in Keycloak", { keycloakId, error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async deleteUser(keycloakId) {
        try {
            const headers = await this.authHeaders();
            await axios.delete(`${this.baseUrl}/users/${keycloakId}`, { headers });
            logger.info("User deleted from Keycloak", { keycloakId });
        } catch (error) {
            logger.error("Failed to delete user from Keycloak", { keycloakId, error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async resetPassword(keycloakId, newPassword) {
        try {
            const headers = await this.authHeaders();
            await axios.put(
                `${this.baseUrl}/users/${keycloakId}/reset-password`,
                { type: "password", value: newPassword, temporary: false },
                { headers }
            );
            logger.info("Password reset in Keycloak", { keycloakId });
        } catch (error) {
            logger.error("Failed to reset password in Keycloak", { keycloakId, error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async generateToken(username, password) {
        try {
            const body = new URLSearchParams({
                grant_type: "password",
                client_id: keycloakConfig.clientId,
                client_secret: keycloakConfig.clientSecret,
                username,
                password,
                scope: "openid profile email",
            });
            const { data } = await axios.post(
                `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
                body.toString(),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10_000 }
            );
            return data;
        } catch (error) {
            logger.error("Failed to generate token from Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }

    async refreshToken(refreshToken) {
        try {
            const body = new URLSearchParams({
                grant_type: "refresh_token",
                client_id: keycloakConfig.clientId,
                client_secret: keycloakConfig.clientSecret,
                refresh_token: refreshToken,
            });
            const { data } = await axios.post(
                `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
                body.toString(),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10_000 }
            );
            return data;
        } catch (error) {
            logger.error("Failed to refresh token", { error: error.message });
            throw mapKeycloakError(error);
        }
    }


    async revokeToken(refreshToken) {
        try {
            const body = new URLSearchParams({
                client_id: keycloakConfig.clientId,
                client_secret: keycloakConfig.clientSecret,
                token: refreshToken,
                token_type_hint: "refresh_token",
            });
            await axios.post(
                `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/revoke`,
                body.toString(),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    timeout: 10_000,
                }
            );
            logger.info("Refresh token revoked in Keycloak");
        } catch (error) {
            logger.error("Failed to revoke token in Keycloak", { error: error.message });
            throw mapKeycloakError(error);
        }
    }
}

const keycloakService = new KeycloakService();
export default keycloakService;