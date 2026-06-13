import mongoose from "mongoose";
import crypto from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Document from "../models/document.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Project from "../models/project.models.js";
import { r2Client } from "../config/r2.configs.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { deleteFromR2 } from "../utils/deleteFromR2.utils.js";
import { resolveMimeType } from "../utils/resolveMimeType.utils.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import resolveCompanyAndProject from "../helpers/resolveCompanyAndProject.helper.js";


const resolveFileType = (mimeType) => {
    if (mimeType === "application/pdf") return "PDF";
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (
        mimeType === "application/vnd.ms-excel" ||
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) return "EXCEL";
    if (
        mimeType === "application/msword" ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) return "WORD";
    if (
        mimeType === "image/vnd.dwg" ||
        mimeType === "application/dxf" ||
        mimeType === "application/x-dwf"
    ) return "CAD";
    return "OTHER";
};


// This function handles uploading a new file for any project. takes the x-company-id in headers and project id in params . -------------------------- Ayan
export const uploadDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId } = req.params;
        const { name, description, category, tags, uploadedBy: keycloakId } = req.body;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!req.file) {
            return res.status(400).json(
                new ApiErrors(400, "Missing File", "No file uploaded")
            );
        }
        if (!name?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "Document name is required")
            );
        }
        if (!keycloakId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "uploadedBy (keycloakId) is required")
            );
        }
        const uploader = await User.findOne({
            keycloakId: keycloakId.trim(),
            companyId: company._id,
            isDeleted: false,
        }).select("_id keycloakId name avatar").lean();
        if (!uploader) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No active user found with the provided keycloakId in this company")
            );
        }
        const { buffer, originalname, mimetype, size } = req.file;
        const resolvedMime = resolveMimeType(mimetype, originalname);
        const uniqueId = crypto.randomUUID();
        const sanitizedName = originalname.replace(/\s+/g, "_");
        const fileKey = `documents/${company._id}/${projectId}/${uniqueId}-${sanitizedName}`;
        const { url: fileUrl, key } = await uploadToR2({
            buffer,
            mimeType: resolvedMime,
            key: fileKey,
        });
        let parsedTags = [];
        if (tags) {
            try {
                parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
            } catch {
                parsedTags = [];
            }
        }
        const document = await Document.create({
            companyId: company._id,
            projectId: project._id,
            name: name.trim(),
            description: description?.trim() || null,
            fileUrl,
            fileKey: key,
            fileName: originalname,
            fileSize: size,
            mimeType: resolvedMime,
            fileType: resolveFileType(resolvedMime),
            category: category || "other",
            tags: parsedTags,
            uploadedBy: uploader._id,
        });
        logger.info("Document uploaded successfully", {
            documentId: document._id,
            projectId: project._id,
            uploadedBy: uploader._id,
        });
        return res.status(201).json(
            new ApiResponse(
                true,
                "Document uploaded successfully",
                {
                    documentId: document._id,
                    name: document.name,
                    description: document.description,
                    fileName: document.fileName,
                    fileSize: document.fileSize,
                    fileType: document.fileType,
                    mimeType: document.mimeType,
                    category: document.category,
                    tags: document.tags,
                    fileUrl: document.fileUrl,
                    uploadedBy: uploader.keycloakId,
                    createdAt: document.createdAt,
                }
            )
        );
    } catch (error) {
        logger.error("uploadDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// this function returns all the uploaded documents for a project . takes the project id in params . Implemented pagination feature. Also has the search feature on the following fields : file name , file type , category , tags and uploaded by. and sort & filter feature with fields : size , date uploaded.  ---------------------------- Ayan
export const getAllDocuments = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId } = req.params;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        const {
            search,
            category,
            fileType,
            tags,
            uploadedBy: keycloakId,
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 20,
        } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Page", "page must be a positive number")
            );
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Limit", "limit must be between 1 and 100")
            );
        }
        const filter = {
            companyId: company._id,
            projectId: project._id,
            isDeleted: false,
        };
        if (search?.trim()) {
            filter.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { fileName: { $regex: search.trim(), $options: "i" } },
                { tags: { $regex: search.trim(), $options: "i" } },
            ];
        }
        const validCategories = [
            "drawing", "specification", "report",
            "contract", "safety", "financial", "other",
        ];
        if (category) {
            if (!validCategories.includes(category)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Category",
                        `Valid categories: ${validCategories.join(", ")}`
                    )
                );
            }
            filter.category = category;
        }
        const validFileTypes = ["PDF", "IMAGE", "EXCEL", "WORD", "CAD", "OTHER"];
        if (fileType) {
            const normalized = fileType.toUpperCase();
            if (!validFileTypes.includes(normalized)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid File Type",
                        `Valid fileTypes: ${validFileTypes.join(", ")}`
                    )
                );
            }
            filter.fileType = normalized;
        }
        if (tags?.trim()) {
            const tagList = tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
            if (tagList.length > 0) {
                filter.tags = { $in: tagList };
            }
        }
        if (keycloakId?.trim()) {
            const uploader = await User.findOne({
                keycloakId: keycloakId.trim(),
                companyId: company._id,
                isDeleted: false,
            })
                .select("_id")
                .lean();
            if (!uploader) {
                return res.status(404).json(
                    new ApiErrors(
                        404,
                        "User Not Found",
                        "No active user found with the provided keycloakId in this company"
                    )
                );
            }
            filter.uploadedBy = uploader._id;
        }
        const allowedSortFields = {
            name: "name",
            fileName: "fileName",
            fileSize: "fileSize",
            fileType: "fileType",
            category: "category",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        };
        const sortField = allowedSortFields[sortBy] ?? "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const skip = (pageNum - 1) * limitNum;
        const [documents, total] = await Promise.all([
            Document.find(filter)
                .populate("uploadedBy", "keycloakId name avatar")
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Document.countDocuments(filter),
        ]);
        logger.info("Documents fetched successfully", {
            projectId: project._id,
            total,
            page: pageNum,
            filters: { category, fileType, tags, uploadedBy: keycloakId },
            sort: { sortBy: sortField, order },
        });
        const shaped = documents.map(doc => ({
            ...doc,
            uploadedBy: doc.uploadedBy
                ? {
                    keycloakId: doc.uploadedBy.keycloakId,
                    name: doc.uploadedBy.name,
                    avatarUrl: doc.uploadedBy.avatar ?? null,
                }
                : null,
        }));
        return res.status(200).json(
            new ApiResponse(
                true,
                total > 0 ? "Documents fetched successfully" : "No documents found",
                {
                    documents: shaped,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                    },
                }
            )
        );
    } catch (error) {
        logger.error("getAllDocuments failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// This function fetches details of a specific document using its documentId and project id from params. then generates a secure signed URL for viewing the file from cloud storage and returns complete document information along with this temporary access link. -------------------------- Ayan
export const getSingleDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, documentId } = req.params;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Document ID", "documentId must be a valid MongoDB ObjectId")
            );
        }
        const document = await Document.findOne({
            _id: documentId,
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        })
            .populate("uploadedBy", "keycloakId name avatar")
            .populate("updatedBy", "keycloakId name avatar")
            .lean();
        if (!document) {
            return res.status(404).json(
                new ApiErrors(404, "Document Not Found", "No document found with the given ID for this project")
            );
        }
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: document.fileKey,
        });
        const viewUrl = await getSignedUrl(r2Client, command, {
            expiresIn: 3600,
        });
        logger.info("Document fetched successfully", {
            documentId: document._id,
            projectId: project._id,
        });
        return res.status(200).json(
            new ApiResponse(
                true,
                "Document fetched successfully",
                {
                    documentId: document._id,
                    name: document.name,
                    description: document.description,
                    fileName: document.fileName,
                    fileSize: document.fileSize,
                    fileType: document.fileType,
                    mimeType: document.mimeType,
                    category: document.category,
                    tags: document.tags,
                    linkedTo: document.linkedTo,
                    uploadedBy: document.uploadedBy?.keycloakId ?? null,
                    createdAt: document.createdAt,
                    viewUrl,
                    uploadedBy: document.uploadedBy ? {
                        keycloakId: document.uploadedBy.keycloakId,
                        name: document.uploadedBy.name,
                        avatarUrl: document.uploadedBy.avatar ?? null,
                    } : null,
                    updatedBy: document.updatedBy ? {
                        keycloakId: document.updatedBy.keycloakId,
                        name: document.updatedBy.name,
                        avatarUrl: document.updatedBy.avatar ?? null,
                    } : null,
                }
            )
        );
    } catch (error) {
        logger.error("getSingleDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// This function updates the metadata of an existing document. Only name, description, category and tags are editable. Takes projectId and documentId from params. Takes updatedBy keycloakId from body. -------------------------- Ayan
export const editDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, documentId } = req.params;
        const { name, description, category, tags, updatedBy: keycloakId } = req.body;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Document ID", "documentId must be a valid MongoDB ObjectId")
            );
        }
        if (!keycloakId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const hasUpdates = name !== undefined ||
            description !== undefined ||
            category !== undefined ||
            tags !== undefined;
        if (!hasUpdates) {
            return res.status(400).json(new ApiErrors(400, "No Updates Provided", "Send at least one field to update: name, description, category, tags"));
        }
        const document = await Document.findOne({
            _id: documentId,
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!document) {
            return res.status(404).json(
                new ApiErrors(404, "Document Not Found", "No document found with the given ID for this project")
            );
        }
        const editor = await User.findOne({
            keycloakId: keycloakId.trim(),
            companyId: company._id,
            isDeleted: false,
        })
            .select("_id keycloakId")
            .lean();

        if (!editor) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No active user found with the provided keycloakId in this company")
            );
        }
        const updates = { updatedBy: editor._id };
        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Field", "name cannot be empty")
                );
            }
            updates.name = name.trim();
        }
        if (description !== undefined) {
            updates.description = description === null || description === ""
                ? null
                : description.trim();
        }
        if (category !== undefined) {
            const validCategories = [
                "drawing", "specification", "report",
                "contract", "safety", "financial", "other",
            ];
            if (!validCategories.includes(category)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Category",
                        `Valid categories: ${validCategories.join(", ")}`
                    )
                );
            }
            updates.category = category;
        }
        if (tags !== undefined) {
            let parsedTags = [];
            try {
                parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
                if (!Array.isArray(parsedTags)) parsedTags = [];
            } catch {
                parsedTags = [];
            }
            updates.tags = parsedTags;
        }
        const updated = await Document.findByIdAndUpdate(
            documentId,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        logger.info("Document updated successfully", {
            documentId: updated._id,
            projectId: project._id,
            updatedBy: editor._id,
            updatedFields: Object.keys(updates).filter((k) => k !== "updatedBy"),
        });
        return res.status(200).json(
            new ApiResponse(true, "Document updated successfully",
                {
                    documentId: updated._id,
                    name: updated.name,
                    description: updated.description,
                    category: updated.category,
                    tags: updated.tags,
                    updatedBy: editor.keycloakId,
                    updatedAt: updated.updatedAt,
                }
            )
        );
    } catch (error) {
        logger.error("editDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// Hard deletes the document by taking the project id and document id in the params. -------------------------------- Ayan
export const deleteDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, documentId } = req.params;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Document ID", "documentId must be a valid MongoDB ObjectId")
            );
        }
        const document = await Document.findOne({
            _id: documentId,
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!document) {
            return res.status(404).json(
                new ApiErrors(404, "Document Not Found", "No document found with the given ID for this project")
            );
        }
        await deleteFromR2(document.fileKey);
        await Document.deleteOne({ _id: documentId });
        logger.info("Document deleted successfully", {
            documentId: document._id,
            fileKey: document.fileKey,
            projectId: project._id,
        });
        return res.status(200).json(
            new ApiResponse(
                true,
                "Document deleted successfully",
                "Your document is deleted successfully from the project",
                {
                    documentId: document._id,
                    name: document.name,
                    deletedAt: new Date().toISOString(),
                }
            )
        );
    } catch (error) {
        logger.error("deleteDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};



// This function links a document to a specific Phase, Task, or SubTask. Validates that the refModel and refId are valid before saving the link. Takes projectId and documentId from params. -------------------------- Ayan
export const linkDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, documentId } = req.params;
        const { refModel, refId, updatedBy: keycloakId } = req.body;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Document ID", "documentId must be a valid MongoDB ObjectId")
            );
        }
        const validRefModels = ["Phase", "Task", "SubTask"];
        if (!refModel || !validRefModels.includes(refModel)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid refModel",
                    `refModel must be one of: ${validRefModels.join(", ")}`
                )
            );
        }
        if (!refId || !mongoose.Types.ObjectId.isValid(refId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid refId", "refId must be a valid MongoDB ObjectId")
            );
        }
        if (!keycloakId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const document = await Document.findOne({
            _id: documentId,
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!document) {
            return res.status(404).json(
                new ApiErrors(404, "Document Not Found", "No document found with the given ID for this project")
            );
        }
        const modelMap = {
            Phase: (await import("../models/phase.models.js")).default,
            Task: (await import("../models/task.models.js")).default,
            SubTask: (await import("../models/subTask.models.js")).default,
        };
        const TargetModel = modelMap[refModel];
        const refExists = await TargetModel.findOne({
            _id: refId,
            projectId: project._id,
            isDeleted: false,
        }).lean();
        if (!refExists) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    `${refModel} Not Found`,
                    `No active ${refModel} found with the provided refId in this project`
                )
            );
        }
        const editor = await User.findOne({
            keycloakId: keycloakId.trim(),
            companyId: company._id,
            isDeleted: false,
        })
            .select("_id keycloakId")
            .lean();

        if (!editor) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No active user found with the provided keycloakId in this company")
            );
        }
        const updated = await Document.findByIdAndUpdate(
            documentId,
            {
                $set: {
                    linkedTo: { refModel, refId },
                    updatedBy: editor._id,
                },
            },
            { new: true }
        ).lean();
        logger.info("Document linked successfully", {
            documentId: updated._id,
            refModel,
            refId,
            projectId: project._id,
            updatedBy: editor._id,
        });
        return res.status(200).json(
            new ApiResponse(
                true,
                "Document linked successfully",
                {
                    documentId: updated._id,
                    name: updated.name,
                    linkedTo: updated.linkedTo,
                    updatedBy: editor.keycloakId,
                    updatedAt: updated.updatedAt,
                }
            )
        );
    } catch (error) {
        logger.error("linkDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// This function removes the link between a document and any Phase, Task, or SubTask it was previously linked to. Resets linkedTo to null. Takes projectId and documentId from params. -------------------------- Ayan
export const unlinkDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, documentId } = req.params;
        const { updatedBy: keycloakId } = req.body;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Document ID", "documentId must be a valid MongoDB ObjectId")
            );
        }
        if (!keycloakId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const document = await Document.findOne({
            _id: documentId,
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!document) {
            return res.status(404).json(
                new ApiErrors(404, "Document Not Found", "No document found with the given ID for this project")
            );
        }
        if (!document.linkedTo?.refId) {
            return res.status(400).json(
                new ApiErrors(400, "Not Linked", "This document is not linked to any Phase, Task, or SubTask")
            );
        }
        const editor = await User.findOne({
            keycloakId: keycloakId.trim(),
            companyId: company._id,
            isDeleted: false,
        })
            .select("_id keycloakId")
            .lean();
        if (!editor) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No active user found with the provided keycloakId in this company")
            );
        }
        const updated = await Document.findByIdAndUpdate(
            documentId,
            {
                $set: {
                    "linkedTo.refModel": null,
                    "linkedTo.refId": null,
                    updatedBy: editor._id,
                },
            },
            { new: true }
        ).lean();
        logger.info("Document unlinked successfully", {
            documentId: updated._id,
            projectId: project._id,
            updatedBy: editor._id,
        });
        return res.status(200).json(
            new ApiResponse(true, "Document unlinked successfully",
                {
                    documentId: updated._id,
                    name: updated.name,
                    linkedTo: updated.linkedTo,
                    updatedBy: editor.keycloakId,
                    updatedAt: updated.updatedAt,
                }
            )
        );
    } catch (error) {
        logger.error("unlinkDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};



// This function generates a secure signed URL for downloading a specific documentand streams the file directly to the client with proper headers for download. Takes projectId and documentId from params. -------------------------- Ayan
export const downloadDocument = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, documentId } = req.params;
        const { company, project, error } = await resolveCompanyAndProject(
            companyUUID,
            projectId
        );
        if (error === "company") {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        if (error === "projectId") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (error === "project") {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Document ID", "documentId must be a valid MongoDB ObjectId")
            );
        }
        const document = await Document.findOne({
            _id: documentId,
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!document) {
            return res.status(404).json(
                new ApiErrors(404, "Document Not Found", "No document found with the given ID for this project")
            );
        }
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: document.fileKey,
        });
        const r2Response = await r2Client.send(command);
        const rawName = document.fileName;
        const encodedName = encodeURIComponent(rawName);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${rawName}"; filename*=UTF-8''${encodedName}`
        );
        res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
        if (r2Response.ContentLength) {
            res.setHeader("Content-Length", r2Response.ContentLength);
        }
        r2Response.Body.pipe(res);
        r2Response.Body.on("error", (streamError) => {
            logger.error("R2 stream error during download", {
                documentId: document._id,
                error: streamError.message,
            });
            if (!res.headersSent) {
                res.status(500).json(
                    new ApiErrors(500, "Stream Error", "Failed to stream file from storage")
                );
            } else {
                res.destroy();
            }
        });
        r2Response.Body.on("end", () => {
            logger.info("Document downloaded successfully", {
                documentId: document._id,
                fileName: document.fileName,
                projectId: project._id,
            });
        });
    } catch (error) {
        logger.error("downloadDocument failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};