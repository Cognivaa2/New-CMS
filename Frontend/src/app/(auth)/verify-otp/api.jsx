import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


export async function verifyOtp({ email, otp }) {
    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/company/verifyOtp`,
            { email, otp },
            { headers: { "Content-Type": "application/json" } }
        );

        if (!data.success) {
            throw new Error(data.description || data.message || "OTP verification failed");
        }

        return data;
    } catch (error) {
        const message =
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "OTP verification failed";
        throw new Error(message);
    }
}

export async function resendOtp({ email, companyName }) {
    const formData = new FormData();
    formData.append("companyName", companyName || "");
    formData.append("email", email);

    try {
        const { data } = await axios.post(`${API_BASE_URL}/company/register`, formData);

        if (!data.success) {
            throw new Error(data.description || data.message || "Failed to resend OTP");
        }

        return data;
    } catch (error) {
        const message =
            error.response?.data?.description ||
            error.response?.data?.message ||
            error.message ||
            "Failed to resend OTP";
        throw new Error(message);
    }
}

export function maskEmail(email) {
    if (!email) return "";
    return email.replace(
        /^(.{2})(.*)(@.*)$/,
        (_, start, middle, end) => start + "*".repeat(Math.min(middle.length, 5)) + end
    );
}

export const OTP_LENGTH = 4;

export function createEmptyOtp() {
    return Array(OTP_LENGTH).fill("");
}

export function handleOtpChange({ index, value, otp, setOtp, setError, inputRefs }) {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
    }
}

export function handleOtpKeyDown({ index, otp, inputRefs, e }) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
    }
}

export function handleOtpPaste({ e, setOtp, setError, inputRefs }) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, OTP_LENGTH).split("");
    const newOtp = createEmptyOtp();
    digits.forEach((digit, i) => { newOtp[i] = digit; });
    setOtp(newOtp);
    setError("");

    const nextEmpty = newOtp.findIndex((val) => !val);
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
}

export function isOtpComplete(otp) {
    return otp.every((digit) => digit !== "");
}