import axios from "axios"
import { getAuthHeaders, getBaseUrl } from "@/lib/apiHelper.js"
export { fetchUserProfile, updateUser } from "@/app/(companyname)/users/api.jsx"

export const fetchUserProfileData = async (userId) => {
    const { data } = await axios.get(`${getBaseUrl()}/user/profile/${userId}`, {
        headers: getAuthHeaders({ includeContentType: false }),
    })
    const d = data.data
    return {
        user: {
            id: d.keycloakId,
            name: d.name,
            role: d.role?.roleName ?? "—",
            roleId: d.role?.roleId ?? null,
            status: d.status,
            isVerified: d.emailVerified,
            avatarUrl: d.avatar,
            about: d.about,
            email: d.email,
            phone: d.phone,
            address: d.address,
            profileCompletion: d.profileCompletion,
        },
    }
}

export const changePassword = async (userId, { currentPassword, newPassword, confirmPassword }) => {
    const { data } = await axios.put(
        `${getBaseUrl()}/user/change/${userId}`,
        { currentPassword, newPassword, confirmPassword },
        { headers: getAuthHeaders() }
    )
    return data
}

export const fetchAssignedProjects = async (userId, page = 1, limit = 10, search = "") => {
    const { data } = await axios.get(
        `${getBaseUrl()}/user/projects/${userId}`,
        {
            params: { page, limit, ...(search && { search }) },
            headers: getAuthHeaders({ includeContentType: false }),
        }
    )
    const { projects, pagination } = data.data
    return { projects, pagination }
}

export const fetchRolePermissions = async (roleId) => {
    const { data } = await axios.get(`${getBaseUrl()}/role/${roleId}`, {
        headers: getAuthHeaders({ includeContentType: false }),
    })
    return data.data
}

export const fetchRoleSchema = async () => {
    const { data } = await axios.get(`${getBaseUrl()}/role/meta/schema`, {
        headers: getAuthHeaders({ includeContentType: false }),
    })
    return data.data
}