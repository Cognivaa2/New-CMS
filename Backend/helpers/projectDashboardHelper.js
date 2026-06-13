import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Role from "../models/role.models.js";
import keycloakService from "../services/keycloak.service.js";


export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const resolveCompany = async (companyUUID) => {
    if (!companyUUID?.trim()) return null;
    return Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
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
        const [profile, role] = await Promise.all([
            getKcProfile(user.keycloakId),
            user.roleId
                ? Role.findOne({ _id: new mongoose.Types.ObjectId(user.roleId), isDeleted: false }).lean()
                : null,
        ]);
        return {
            id: user._id,
            keycloakId: user.keycloakId,
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: role?.roleName || null,
        };
    } catch {
        return null;
    }
};


export const resolveCompanyOrError = async (req, res) => {
    const companyUUID = req.headers["x-company-id"];
    if (!companyUUID?.trim()) {
        return {
            company: null,
            earlyReturn: res.status(400).json({
                success: false,
                message: "x-company-id header is required",
            }),
        };
    }
    const company = await resolveCompany(companyUUID);
    if (!company) {
        return {
            company: null,
            earlyReturn: res.status(404).json({
                success: false,
                message: "No active company found for the given x-company-id",
            }),
        };
    }
    return { company, earlyReturn: null };
};


export const resolveProjectOrError = async (projectId, companyId, res, Project) => {
    if (!projectId || !isValidObjectId(projectId)) {
        return {
            project: null,
            earlyReturn: res.status(400).json({
                success: false,
                message: "Valid projectId is required in params",
            }),
        };
    }
    const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
    if (!project) {
        return {
            project: null,
            earlyReturn: res.status(404).json({
                success: false,
                message: "Project not found or does not belong to this company",
            }),
        };
    }
    return { project, earlyReturn: null };
};



export const todayUTC = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
};


export const daysFromNow = (n) => {
    const d = todayUTC();
    d.setUTCDate(d.getUTCDate() + n);
    return d;
};


export const daysAgo = (n) => {
    const d = todayUTC();
    d.setUTCDate(d.getUTCDate() - n);
    return d;
};



export const ymd = (d) => d.toISOString().slice(0, 10);

export const addDays = (d, n) =>
    new Date(d.getTime() + n * 86400000);

export const midnight = (d) => {
    const c = new Date(d);
    c.setUTCHours(0, 0, 0, 0);
    return c;
};

export const clamp = (v, lo, hi) =>
    Math.max(lo, Math.min(hi, v));

export const pct = (n, d) =>
    d === 0 ? 0 : parseFloat(((n / d) * 100).toFixed(2));

export const normalise = (values) => {
    const max = Math.max(...values, 1);
    return values.map((v) =>
        parseFloat(((v / max) * 100).toFixed(1))
    );
};

export const percentile = (sorted, p) => {
    if (!sorted.length) return 0;
    const idx =
        Math.ceil((p / 100) * sorted.length) - 1;

    return sorted[Math.max(0, idx)];
};

export const intensityBucket = (count, p25, p50, p75) => {
    if (count === 0) return 0;
    if (count <= p25) return 1;
    if (count <= p50) return 2;
    if (count <= p75) return 3;

    return 4;
};