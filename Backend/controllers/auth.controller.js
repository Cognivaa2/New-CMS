import logger from "../utils/logger.utils.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrors from "../utils/ApiErrors.js";
import User from "../models/user.models.js";
import Company from "../models/company.models.js";
import keycloakService from "../services/keycloak.service.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import PasswordOtp from "../models/passwordOtp.models.js";
import sendEmail from "../services/email.service.js";

const OTP_EXPIRY_MINUTES = 10;
const RESET_WINDOW_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

// user login with email, phone, userId attribute, or username. returns the access token, refresh token and company id.   ------------- Ayan
export const loginUser = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json(
            new ApiErrors(400, "Missing Fields", "identifier and password are required")
        );
        const clean = identifier.trim().toLowerCase();
        let kcUser = null;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
            kcUser = await keycloakService.getUserByEmail(clean).catch(() => null);
            if (!kcUser) {
                kcUser = await keycloakService.getUserByUsername(clean).catch(() => null);
            }
        } else if (/^\+?[\d\s\-()]{7,15}$/.test(clean)) {
            kcUser = await keycloakService.getUserByPhone(clean).catch(() => null);
        } else {
            kcUser = await keycloakService.getUserByUsername(clean).catch(() => null);
            if (!kcUser) {
                const byUserId = await keycloakService.getUserByUserId(identifier.trim()).catch(() => null);
                if (byUserId === null && /^[a-zA-Z0-9_-]{8,}$/.test(identifier.trim())) {
                    return res.status(404).json(
                        new ApiErrors(404, "User Not Found", `No user found with userId "${identifier.trim()}". Please check your identifier and try again`)
                    );
                }
                kcUser = byUserId;
            }
        }
        if (!kcUser) return res.status(401).json(
            new ApiErrors(401, "Invalid Credentials", "Identifier or password is incorrect")
        );
        const companyId = kcUser.attributes?.companyId?.[0];
        const avatar = kcUser.attributes?.avatar?.[0] ?? null;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "No Company Linked", "This account is not linked to any company")
            );
        }
        const mongoUser = await User.findOne({ keycloakId: kcUser.id, isDeleted: false })
            .select("status")
            .lean();
        if (!mongoUser) {
            return res.status(401).json(
                new ApiErrors(401, "Invalid Credentials", "Identifier or password is incorrect")
            );
        }
        if (mongoUser.status === "Inactive") {
            return res.status(403).json(
                new ApiErrors(403, "Account Disabled", "Your account has been deactivated. Please contact your administrator")
            );
        }
        let tokenData;
        try {
            tokenData = await keycloakService.generateToken(kcUser.username, password);
        } catch (err) {
            if (err.statusCode === 401) {
                return res.status(401).json(
                    new ApiErrors(401, "Invalid Credentials", "Identifier or password is incorrect")
                );
            }
            throw err;
        }
        User.findOneAndUpdate(
            { keycloakId: kcUser.id },
            { $set: { lastLoginAt: new Date() } },
            { new: true }
        ).catch((err) =>
            logger.error("Failed to update lastLoginAt", { error: err.message, keycloakId: kcUser.id })
        );
        return res.status(200).json(
            new ApiResponse(200, {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                companyId,
                keycloakId: kcUser.id,
                avatar,
            }, "Login Successful", "Welcome back!")
        );
    } catch (error) {
        logger.error("loginUser failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong during login. Please try again")
        );
    }
};

// This API generates a new access token using a valid refresh token issued by Keycloak.  ----------------- Ayan
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "refreshToken is required"));
        }
        let tokenData;
        try {
            tokenData = await keycloakService.refreshToken(refreshToken);
        } catch (err) {
            if (err.statusCode === 400 || err.statusCode === 401) {
                return res.status(401).json(
                    new ApiErrors(401, "Session Expired", "Your session has expired. Please log in again")
                );
            }
            throw err;
        }
        return res.status(200).json(
            new ApiResponse(200,
                { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token, expiresIn: tokenData.expires_in },
                "Token Refreshed", "Access token renewed successfully")
        );
    } catch (error) {
        logger.error("refreshAccessToken failed", { error: error.message });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Something went wrong. Please try again"));
    }
};

// Logs out the user by invalidating the Keycloak session via refresh token revocation.  --- Ayan
export const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "refreshToken is required to log out")
            );
        }
        try {
            await keycloakService.revokeToken(refreshToken);
        } catch (err) {
            logger.warn("Token revocation failed during logout", { error: err.message });
        }
        return res.status(200).json(
            new ApiResponse(200, null, "Logged Out", "You have been successfully logged out")
        );
    } catch (error) {
        logger.error("logoutUser failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong during logout. Please try again")
        );
    }
};


// Takes the email in body and generates a 6 digit otp then stores in db and emails it to the user.   ------- Ayan
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "email is required")
            );
        }
        const cleanEmail = email.trim().toLowerCase();
        const kcUser = await keycloakService.getUserByEmail(cleanEmail).catch(() => null);
        if (!kcUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No account is registered with this email address")
            );
        }
        const mongoUser = await User.findOne({
            keycloakId: kcUser.id,
            isDeleted: false,
        }).select("+status");
        if (!mongoUser) {
            return res.status(200).json(
                new ApiResponse(200, null, "OTP Sent", "If this email is registered, an OTP has been sent")
            );
        }
        if (mongoUser.status === "Inactive") {
            return res.status(403).json(
                new ApiErrors(403, "Account Disabled", "Your account has been deactivated. Please contact your administrator")
            );
        }
        await PasswordOtp.deleteMany({ email: cleanEmail });
        const rawOtp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(rawOtp, BCRYPT_ROUNDS);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await PasswordOtp.create({
            email: cleanEmail,
            otp: hashedOtp,
            expiresAt,
        });
        await sendEmail({
            to: cleanEmail,
            subject: "Your Password Reset OTP",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
                    <h2>Password Reset Request</h2>
                    <p>Use the OTP below to reset your password. It is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0; color: #333;">
                        ${rawOtp}
                    </div>
                    <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
                </div>
            `,
        });

        return res.status(200).json(
            new ApiResponse(200, null, "OTP Sent", "If this email is registered, an OTP has been sent")
        );
    } catch (error) {
        logger.error("forgotPassword failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong. Please try again")
        );
    }
};


// Verifies the otp and unlocks the reset password window.   -------- Ayan
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Fields", "email and otp are required")
            );
        }
        const cleanEmail = email.trim().toLowerCase();

        const otpRecord = await PasswordOtp.findOne({
            email: cleanEmail,
            isUsed: false,
            isOtpVerified: false,
        });
        if (!otpRecord) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid OTP", "No active OTP found. Please request a new one")
            );
        }
        if (new Date() > otpRecord.expiresAt) {
            await PasswordOtp.deleteOne({ _id: otpRecord._id });
            return res.status(400).json(
                new ApiErrors(400, "OTP Expired", "Your OTP has expired. Please request a new one")
            );
        }
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await PasswordOtp.deleteOne({ _id: otpRecord._id });
            return res.status(429).json(
                new ApiErrors(429, "Too Many Attempts", "Maximum OTP attempts exceeded. Please request a new one")
            );
        }
        const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otp);
        if (!isMatch) {
            await PasswordOtp.findByIdAndUpdate(otpRecord._id, { $inc: { attempts: 1 } });
            return res.status(400).json(
                new ApiErrors(400, "Invalid OTP", `Incorrect OTP. ${MAX_OTP_ATTEMPTS - otpRecord.attempts - 1} attempt(s) remaining`)
            );
        }
        const resetGrantedAt = new Date();
        await PasswordOtp.findByIdAndUpdate(otpRecord._id, {
            isUsed: true,
            isOtpVerified: true,
            resetGrantedAt,
        });
        return res.status(200).json(
            new ApiResponse(200, null, "OTP Verified", "OTP verified successfully. You may now reset your password")
        );
    } catch (error) {
        logger.error("verifyOtp failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong. Please try again")
        );
    }
};

// Resets the user password after OTP verification.   ------- Ayan
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Fields", "email, newPassword and confirmPassword are required")
            );
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json(
                new ApiErrors(400, "Password Mismatch", "newPassword and confirmPassword do not match")
            );
        }
        if (newPassword.length < 8) {
            return res.status(400).json(
                new ApiErrors(400, "Weak Password", "Password must be at least 8 characters long")
            );
        }
        const cleanEmail = email.trim().toLowerCase();
        const otpRecord = await PasswordOtp.findOne({
            email: cleanEmail,
            isUsed: true,
            isOtpVerified: true,
        });
        if (!otpRecord) {
            return res.status(400).json(
                new ApiErrors(400, "Unauthorized", "OTP verification is required before resetting password")
            );
        }
        const windowMs = RESET_WINDOW_MINUTES * 60 * 1000;
        if (new Date() - new Date(otpRecord.resetGrantedAt) > windowMs) {
            await PasswordOtp.deleteOne({ _id: otpRecord._id });
            return res.status(400).json(
                new ApiErrors(400, "Session Expired", "Your reset session has expired. Please start again")
            );
        }
        const kcUser = await keycloakService.getUserByEmail(cleanEmail);
        if (!kcUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No account found with this email")
            );
        }
        await keycloakService.resetPassword(kcUser.id, newPassword);
        await PasswordOtp.deleteOne({ _id: otpRecord._id });
        return res.status(200).json(
            new ApiResponse(200, null, "Password Reset", "Your password has been reset successfully. Please log in")
        );
    } catch (error) {
        logger.error("resetPassword failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong. Please try again")
        );
    }
};