import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
console.log(API_BASE_URL);


export async function registerCompany({ companyName, email }) {
    const formData = new FormData();
    formData.append("companyName", companyName);
    formData.append("email", email);

    try {
        const { data } = await axios.post(`${API_BASE_URL}/company/register`, formData);

        if (!data.success) {
            throw new Error(data.description || data.message || "Registration failed");
        }

        return data;
    } catch (error) {
        const message =
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Registration failed";
        throw new Error(message);
    }
}

export function validateRegisterForm({ companyName, email, agreed }) {
    if (!companyName.trim()) {
        return "Please enter your company name.";
    }
    if (!email.trim()) {
        return "Please enter your company email.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return "Please enter a valid email address.";
    }
    if (!agreed) {
        return "Please agree to the Terms and Privacy Policies.";
    }
    return null;
}