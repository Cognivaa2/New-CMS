import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Counter from "../models/counter.models.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { deleteFromR2 } from "../utils/deleteFromR2.utils.js";
import ApiErrors from "../utils/ApiErrors.js";



export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


export const resolveCompany = async (companyUUID) => {
    return await Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
};


export const resolveUserByKeycloak = async (keycloakId, companyId) => {
    return await User.findOne({
        keycloakId: keycloakId.trim(),
        companyId,
        isDeleted: false,
    }).lean();
};



export const generateInspectionNumber = async (companyId) => {
    const year = new Date().getFullYear();
    const counterKey = `INSP-${companyId.toString()}-${year}`;
    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return `INSP-${year}-${String(counter.seq).padStart(4, "0")}`;
};




export const uploadSafetyAttachment = async (file, uploaderObjectId) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    const key = `safety/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await uploadToR2({
        buffer: file.buffer,
        mimeType: file.mimetype,
        key,
    });
    return {
        fileName: file.originalname,
        fileUrl: url,
        fileKey: key,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: uploaderObjectId,
        uploadedAt: new Date(),
    };
};


export const deleteSafetyAttachment = async (attachment) => {
    if (!attachment?.fileKey) return;
    await deleteFromR2(attachment.fileKey);
};




export const uploadEntryAttachments = async (entryFiles, uploaderObjectId) => {
    const results = {};
    await Promise.all(
        entryFiles.map(async ({ entryIndex, file }) => {
            const attachment = await uploadSafetyAttachment(file, uploaderObjectId);
            results[entryIndex] = attachment;
        })
    );
    return results;
};




export const deleteAttachmentsBestEffort = (attachments) => {
    if (!Array.isArray(attachments)) return;
    attachments.forEach((att) => {
        if (att?.fileKey) {
            deleteFromR2(att.fileKey).catch(() => { });
        }
    });
};



export const enrichSafetyUser = async (userId) => {
    if (!userId) return null;
    const user = await User.findById(userId)
        .select("_id name avatar role keycloakId")
        .lean();
    if (!user) return null;
    return {
        _id: user._id,
        name: user.name ?? null,
        avatar: user.avatar ?? null,
        role: user.role ?? null,
        keycloakId: user.keycloakId ?? null,
    };
};



export const enrichSafetyDocument = async (doc) => {
    if (!doc) return doc;
    const idSet = new Set();
    const addId = (id) => { if (id) idSet.add(id.toString()); };
    addId(doc.createdBy);
    addId(doc.updatedBy);
    addId(doc.deletedBy);
    (doc.entries || []).forEach((e) => {
        addId(e.inspectedBy);
        addId(e.resolvedBy);
    });
    const ids = [...idSet].map((id) => new mongoose.Types.ObjectId(id));
    const users = ids.length
        ? await User.find({ _id: { $in: ids } })
            .select("_id name avatar role keycloakId")
            .lean()
        : [];
    const userMap = {};
    users.forEach((u) => {
        userMap[u._id.toString()] = {
            _id: u._id,
            name: u.name ?? null,
            avatar: u.avatar ?? null,
            role: u.role ?? null,
            keycloakId: u.keycloakId ?? null,
        };
    });
    const resolve = (id) => (id ? (userMap[id.toString()] ?? null) : null);
    const enrichedEntries = (doc.entries || []).map((e) => ({
        ...e,
        inspectedBy: resolve(e.inspectedBy),
        resolvedBy: resolve(e.resolvedBy),
    }));
    return {
        ...doc,
        createdBy: resolve(doc.createdBy),
        updatedBy: resolve(doc.updatedBy),
        deletedBy: resolve(doc.deletedBy),
        entries: enrichedEntries,
    };
};



const VALID_CATEGORIES = ["Safety", "Quality"];
const VALID_STATUSES = ["Pass", "Fail", "Observation"];
const VALID_SEVERITIES = ["Low", "Medium", "High"];



export const validateRawEntry = (entry, idx) => {
    const label = `entries[${idx}]`;
    if (!entry.title?.trim())
        return { error: `${label}.title is required` };
    if (!entry.category || !VALID_CATEGORIES.includes(entry.category))
        return { error: `${label}.category must be one of: ${VALID_CATEGORIES.join(", ")}` };
    if (!entry.status || !VALID_STATUSES.includes(entry.status))
        return { error: `${label}.status must be one of: ${VALID_STATUSES.join(", ")}` };
    if (!entry.inspectionDate)
        return { error: `${label}.inspectionDate is required` };
    if (isNaN(new Date(entry.inspectionDate)))
        return { error: `${label}.inspectionDate must be a valid date` };
    if (!entry.inspectedBy?.trim())
        return { error: `${label}.inspectedBy (keycloakId) is required` };
    if (
        entry.severity !== undefined &&
        entry.severity !== null &&
        entry.severity !== "" &&
        !VALID_SEVERITIES.includes(entry.severity)
    ) {
        return { error: `${label}.severity must be one of: ${VALID_SEVERITIES.join(", ")}` };
    }
    return { valid: true };
};




export const buildEntryObject = (raw, inspectedByObjectId, attachment = null) => ({
    title: raw.title.trim(),
    category: raw.category,
    status: raw.status,
    inspectionDate: new Date(raw.inspectionDate),
    inspectedBy: inspectedByObjectId,
    description: raw.description?.trim() || null,
    location: raw.location?.trim() || null,
    severity: raw.severity || null,
    remarks: raw.remarks?.trim() || null,
    attachment: attachment,
    isResolved: false,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
});