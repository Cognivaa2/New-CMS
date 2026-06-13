import axios from "axios";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function getCompanyId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("companyId") || "";
}

function getAuthHeaders() {
  const companyId = getCompanyId();
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";

  const headers = {
    "x-company-id": companyId,
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

function handleError(error, fallbackMessage) {
  const message =
    error.response?.data?.description ||
    error.response?.data?.message ||
    error.message ||
    fallbackMessage;
  throw new Error(message);
}

export async function fetchRolesData({
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  order = "desc",
  isActive = "",
  search = "",
} = {}) {
  try {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    params.append("sortBy", sortBy);
    params.append("order", order);
    if (isActive === "true" || isActive === "false") {
      params.append("isActive", isActive);
    }
    if (search?.trim()) {
      params.append("search", search.trim());
    }

    const { data } = await axios.get(
      `${API_BASE_URL}/role/all?${params.toString()}`,
      { headers: getAuthHeaders() }
    );

    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to fetch roles"
      );
    }
    return data.data;
  } catch (error) {
    handleError(error, "Failed to fetch roles");
  }
}

export async function addRole(roleName, description) {
  try {
    const payload = {
      roleName: roleName.trim(),
      description: description?.trim() || "",
      companyId: getCompanyId(),
    };
    const { data } = await axios.post(`${API_BASE_URL}/role/add`, payload, {
      headers: getAuthHeaders(),
    });
    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to create role"
      );
    }
    return data;
  } catch (error) {
    handleError(error, "Failed to create role");
  }
}

export async function editRole(roleId, roleName, description) {
  try {
    const payload = {
      roleName: roleName.trim(),
      description: description?.trim() || "",
      companyId: getCompanyId(),
    };
    const { data } = await axios.put(
      `${API_BASE_URL}/role/edit/${roleId}`,
      payload,
      { headers: getAuthHeaders() }
    );
    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to update role"
      );
    }
    return data;
  } catch (error) {
    handleError(error, "Failed to update role");
  }
}

export async function deleteRole(roleId) {
  try {
    const { data } = await axios.delete(
      `${API_BASE_URL}/role/delete/${roleId}`,
      { headers: getAuthHeaders() }
    );
    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to delete role"
      );
    }
    return data;
  } catch (error) {
    handleError(error, "Failed to delete role");
  }
}

// FIXED: URL matches backend route /role/status/:roleId
export async function updateRoleStatus(roleId, isActive) {
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/role/status/${roleId}`,
      { isActive },
      { headers: getAuthHeaders() }
    );
    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to update role status"
      );
    }
    return data;
  } catch (error) {
    handleError(error, "Failed to update role status");
  }
}

export async function updateRolePermissions(roleId, permissions) {
  try {
    const { data } = await axios.put(
      `${API_BASE_URL}/role/setPermissions/${roleId}`,
      { permissions },
      { headers: getAuthHeaders() }
    );
    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to update permissions"
      );
    }
    return data;
  } catch (error) {
    handleError(error, "Failed to update permissions");
  }
}

export async function fetchRoleSchema() {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/role/meta/schema`, {
      headers: getAuthHeaders(),
    });
    if (!data.success) {
      throw new Error(data.description || data.message || "Failed to fetch schema");
    }
    return data.data;
  } catch (error) {
    handleError(error, "Failed to fetch role schema");
  }
}

export async function toggleAllRolePermissions(roleId, enable) {
  try {
    const { data } = await axios.patch(
      `${API_BASE_URL}/role/toggle/permissions/${roleId}`,
      { enable },
      { headers: getAuthHeaders() }
    );
    if (!data.success) {
      throw new Error(
        data.description || data.message || "Failed to toggle permissions"
      );
    }
    return data;
  } catch (error) {
    handleError(error, "Failed to toggle permissions");
  }
}


export function mapRoleToCardFormat(apiRole) {
  return {
    id: apiRole._id || apiRole.roleId,
    name: apiRole.roleName || "",
    description: apiRole.description || "",
    isActive: apiRole.isActive ?? true,
    createdBy: apiRole.createdBy || "System",
    createdAt: apiRole.createdAt ? formatDate(apiRole.createdAt) : "—",
    updatedAt: apiRole.updatedAt ? formatDate(apiRole.updatedAt) : null,
    permissions: apiRole.permissions || {},
    moduleStatus: apiRole.moduleStatus || {},
  };
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}