import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export function getCompanyId() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("companyId") || "";
}
export function setCompanyId(id) {
    if (typeof window !== "undefined") localStorage.setItem("companyId", id);
}
function getAuthHeaders(isFormData = false) {
    const companyId = getCompanyId();
    const accessToken =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
    const headers = {
        "x-company-id": companyId,
    };
    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }
    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}
export async function fetchCompany(companyId) {
    try {
        const { data } = await axios.get(`${API_BASE_URL}/company/${companyId}`, {
            headers: getAuthHeaders(),
        });

        if (!data.success) {
            throw new Error(data.description || data.message || "Failed to fetch company");
        }
        return data;
    } catch (error) {
        const message =
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch company";
        throw new Error(message);
    }
}
export async function updateCompany(companyId, formState) {
    const hasLogo = formState.logo instanceof File;
    let payload;
    let headers;
    if (hasLogo) {
        payload = buildFormData(formState);
        headers = getAuthHeaders(true);
    } else {
        payload = buildJsonPayload(formState);
        headers = getAuthHeaders(false);
    }
    try {
        const { data } = await axios.put(
            `${API_BASE_URL}/company/update/${companyId}`,
            payload,
            { headers }
        );
        if (!data.success) {
            throw new Error(data.description || data.message || "Failed to update company");
        }
        return data;
    } catch (error) {
        const message =
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to update company";
        throw new Error(message);
    }
}
function buildJsonPayload(formState) {
    const payload = {};
    const fields = [
        "companyName",
        "companyType",
        "description",
        "gstin",
        "pan",
        "cin",
        "laborLicenseNo",
        "phone",
        "website",
    ];
    fields.forEach((key) => {
        if (formState[key] !== undefined) {
            payload[key] = formState[key] || "";
        }
    });
    if (formState.address) {
        payload.address = { ...formState.address };
    }
    if (Array.isArray(formState.tags)) {
        payload.tags = formState.tags;
    }

    return payload;
}
function buildFormData(formState) {
    const formData = new FormData();
    const fields = [
        "companyName",
        "companyType",
        "description",
        "gstin",
        "pan",
        "cin",
        "laborLicenseNo",
        "phone",
        "website",
    ];
    fields.forEach((key) => {
        if (formState[key] !== undefined) {
            formData.append(key, formState[key] || "");
        }
    });
    if (formState.address) {
        Object.entries(formState.address).forEach(([key, value]) => {
            formData.append(`address[${key}]`, value || "");
        });
    }
    if (Array.isArray(formState.tags)) {
        formData.append("tags", JSON.stringify(formState.tags));
    }
    if (formState.logo instanceof File) {
        formData.append("logo", formState.logo);
    }

    return formData;
}
export function toProfileData(company) {
    const tags = [];
    if (company.companyType) tags.push(company.companyType);
    if (company.tags?.length) {
        company.tags.forEach((tag) => {
            if (!tags.includes(tag)) tags.push(tag);
        });
    }
    if (tags.length === 0) tags.push("Construction");
    return {
        avatarUrl: company.logo || "/default-avatar.png",
        name: company.companyName || "",
        fullName: company.companyType
            ? `${company.companyName} ${company.companyType} pvt ltd`
            : company.companyName,
        tags,
        year: company.createdAt
            ? new Date(company.createdAt).getFullYear().toString()
            : "—",
        gstn: company.gstin ? `#GSTN${company.gstin}` : "",
        currentPlan: company.subscriptionId ? "Pro Plan" : "Free Plan",
    };
}
export function toInfoData(company) {
    const addressParts = [];
    if (company.address?.street) addressParts.push(company.address.street);
    const cityLine = [
        company.address?.city,
        company.address?.state,
        company.address?.country,
        company.address?.pincode,
    ].filter(Boolean);
    if (cityLine.length > 0) {
        addressParts.push(cityLine.join("  •  "));
    }
    return {
        email: company.email,
        phone: company.phone,
        address: addressParts.join("\n"),
        website: company.website,
    };
}
export function toStatsAndLegalData(company) {
    const s = company.stats || {};
    const stats = [
        { value: String(s.totalProjects ?? "—"), label: "Projects" },
        { value: String(s.totalUsers ?? "—"), label: "Total Users" },
        { value: String(s.totalVendors ?? "—"), label: "Vendors" },
        { value: String(s.totalRoles ?? "—"), label: "Total Roles" },
    ];

    const legal = [
        company.gstin && { label: "GSTIN", value: company.gstin },
        company.pan && { label: "PAN", value: company.pan },
        company.cin && { label: "CIN", value: company.cin },
        company.laborLicenseNo && { label: "Labor License", value: company.laborLicenseNo },
    ].filter(Boolean);

    return { stats, legal };
}
export function toEditFormState(company) {
    return {
        companyName: company.companyName || "",
        companyType: company.companyType || "",
        phone: company.phone || "",
        description: company.description || "",
        email: company.email || "",
        website: company.website || "",
        gstin: company.gstin || "",
        pan: company.pan || "",
        cin: company.cin || "",
        laborLicenseNo: company.laborLicenseNo || "",
        address: {
            street: company.address?.street || "",
            city: company.address?.city || "",
            state: company.address?.state || "",
            country: company.address?.country || "",
            pincode: company.address?.pincode || "",
        },
        tags: Array.isArray(company.tags) ? company.tags : [],
        logo: company.logo || "",
        logoPreview: company.logo || "",
    };
}
export function getFallbackCompany() {
    return {
        companyName: "—",
        companyType: "",
        gstin: "",
        pan: "",
        cin: "",
        laborLicenseNo: "",
        email: "—",
        phone: "—",
        website: "—",
        logo: "/default-avatar.png",
        address: { street: "", city: "", state: "", country: "", pincode: "" },
        tags: [],
        stats: { totalUsers: 0, totalVendors: 0, totalSuppliers: 0, totalProjects: 0 },
        createdAt: null,
        subscriptionId: null,
    };
}