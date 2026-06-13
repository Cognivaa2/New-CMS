import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Role from "../models/role.models.js";
import keycloakService from "../services/keycloak.service.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

export const resolveCompany = async (companyUUID) => {
    if (!companyUUID?.trim()) return null;
    return Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
};


export const resolveUserByKeycloak = async (keycloakId, companyId) => {
    if (!keycloakId?.trim()) return null;
    return User.findOne({
        keycloakId: keycloakId.trim(),
        companyId,
        isDeleted: false,
    }).lean();
};


export const getKcProfile = async (keycloakId) => {
    try {
        const kc = await keycloakService.getUserById(keycloakId);
        return {
            name: kc?.attributes?.name?.[0] || kc?.firstName || "Unknown",
            email: kc?.email || null,
            avatar: kc?.attributes?.avatar?.[0] || null,
        };
    } catch {
        return { name: "Unknown", email: null, avatar: null };
    }
};


export const enrichUser = async (mongoUserId) => {
    if (!mongoUserId) return null;
    try {
        const user = await User.findById(mongoUserId)
            .select("_id keycloakId roleId")
            .lean();

        if (!user) return null;
        const profile = await getKcProfile(user.keycloakId);
        let roleName = null;
        if (user.roleId) {
            const role = await Role.findOne({
                _id: new mongoose.Types.ObjectId(user.roleId),
                isDeleted: false,
            }).lean();
            roleName = role?.roleName || null;
        }
        return {
            id: user._id,
            keycloakId: user.keycloakId,
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: roleName,
        };
    } catch {
        return null;
    }
};


export const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean);
    if (typeof tags === "string") {
        try {
            const parsed = JSON.parse(tags);
            if (Array.isArray(parsed)) return parsed.map((t) => t.trim()).filter(Boolean);
        } catch {
            return tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
    }
    return [];
};



export const parseAttachments = async (req, folder, uploadedBy) => {
    const files = req.files?.length
        ? req.files
        : req.file
            ? [req.file]
            : [];
    if (!files.length) return [];
    const uploaded = await Promise.all(
        files.map(async (file) => {
            try {
                if (!file.buffer) {
                    console.warn(`parseAttachments: No buffer found for file: ${file.originalname}`);
                    return null;
                }
                const ext = path.extname(file.originalname) || "";
                const key = `${folder}/${uuidv4()}${ext}`;
                const { url } = await uploadToR2({
                    buffer: file.buffer,
                    mimeType: file.mimetype,
                    key,
                });
                return {
                    fileName: file.originalname,
                    fileUrl: url,
                    fileType: file.mimetype,
                    fileSize: file.size,
                    uploadedBy,
                    uploadedAt: new Date(),
                };
            } catch (err) {
                console.error(`parseAttachments: Failed to upload file ${file.originalname}:`, err.message);
                return null;
            }
        })
    );
    return uploaded.filter(Boolean);
};