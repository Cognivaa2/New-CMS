import mongoose from "mongoose";
import Safety from "../models/safety.models.js";
import Project from "../models/project.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import NotificationService from "../services/notification.service.js";
import {
    isValidObjectId,
    resolveCompany,
    resolveUserByKeycloak,
    generateInspectionNumber,
    uploadSafetyAttachment,
    deleteSafetyAttachment,
    deleteAttachmentsBestEffort,
    enrichSafetyDocument,
    validateRawEntry,
    buildEntryObject,
} from "../helpers/safetyHelper.js";




// This function creates a new safety inspection for a project. takes x-company-id in headers, projectId in params and createdBy with inspection entries and optional attachments in body/files. validates inspectors, uploads attachments, creates inspection records and triggers safety notifications. -------------------------- Ayan
export const createSafetyInspection = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const uploadedAttachments = [];
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found for this company")
            );
        }
        const { createdBy } = req.body;
        if (!createdBy?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "createdBy (keycloakId) is required")
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        let rawEntries;
        try {
            rawEntries = typeof req.body.entries === "string"
                ? JSON.parse(req.body.entries)
                : req.body.entries;
        } catch {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Entries Format", "entries must be a valid JSON array")
            );
        }
        if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Entries", "entries must be a non-empty array")
            );
        }
        const resolvedInspectors = {};
        for (let i = 0; i < rawEntries.length; i++) {
            const entry = rawEntries[i];
            const validation = validateRawEntry(entry, i);
            if (!validation.valid) {
                await session.abortTransaction(); session.endSession();
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", validation.error)
                );
            }
            const kcId = entry.inspectedBy.trim();
            if (!resolvedInspectors[kcId]) {
                const inspector = await resolveUserByKeycloak(kcId, companyId);
                if (!inspector) {
                    await session.abortTransaction(); session.endSession();
                    return res.status(404).json(
                        new ApiErrors(
                            404,
                            "Inspector Not Found",
                            `entries[${i}].inspectedBy: No active user found with keycloakId: ${kcId}`
                        )
                    );
                }
                resolvedInspectors[kcId] = inspector;
            }
        }
        const attachmentMap = {};
        if (Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const match = file.fieldname.match(/^attachment_(\d+)$/);
                if (!match) continue;
                const entryIndex = parseInt(match[1], 10);
                if (entryIndex >= rawEntries.length) continue;
                try {
                    const att = await uploadSafetyAttachment(file, creatorUser._id);
                    attachmentMap[entryIndex] = att;
                    uploadedAttachments.push(att);
                } catch (uploadErr) {
                    deleteAttachmentsBestEffort(uploadedAttachments);
                    await session.abortTransaction(); session.endSession();
                    logger.error("Safety attachment upload failed", { message: uploadErr.message });
                    return res.status(500).json(
                        new ApiErrors(500, "Upload Failed", "Failed to upload attachment. Please try again.")
                    );
                }
            }
        }
        const processedEntries = rawEntries.map((raw, i) => {
            const inspector = resolvedInspectors[raw.inspectedBy.trim()];
            const attachment = attachmentMap[i] ?? null;
            return buildEntryObject(raw, inspector._id, attachment);
        });
        const inspectionNumber = await generateInspectionNumber(companyId);
        let inspection;
        try {
            [inspection] = await Safety.create(
                [
                    {
                        companyId,
                        projectId,
                        inspectionNumber,
                        entries: processedEntries,
                        createdBy: creatorUser._id,
                    },
                ],
                { session }
            );
        } catch (dbErr) {
            deleteAttachmentsBestEffort(uploadedAttachments);
            await session.abortTransaction(); session.endSession();
            throw dbErr;
        }
        await session.commitTransaction();
        session.endSession();
        NotificationService.notifySafetyInspectionCreated({
            companyId,
            projectId,
            projectName: project.projectName,
            inspectionNumber,
            inspectionId: inspection._id,
            entryCount: processedEntries.length,
        }).catch((err) =>
            logger.error("notifySafetyInspectionCreated failed (non-fatal)", { error: err.message })
        );
        logger.info("Safety inspection created", {
            inspectionId: inspection._id,
            inspectionNumber,
            projectId,
            companyId,
            entryCount: processedEntries.length,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                { inspection },
                "Inspection Created",
                `Safety inspection ${inspectionNumber} created with ${processedEntries.length} entr${processedEntries.length === 1 ? "y" : "ies"}`
            )
        );
    } catch (error) {
        deleteAttachmentsBestEffort(uploadedAttachments);
        await session.abortTransaction();
        session.endSession();
        logger.error("createSafetyInspection failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to create safety inspection", [error.message])
        );
    }
};




// This function returns all safety inspections for a project. takes x-company-id in headers and projectId in params. supports pagination, search (inspection number, title, location, remarks, description), filtering (category, status, severity, resolution status, date range) and sorting with project safety KPI summary. -------------------------- Ayan
export const getAllInspectionsByProject = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found with the given ID")
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            category,
            status,
            severity,
            isResolved,
            dateFrom,
            dateTo,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const allowedSortFields = ["createdAt", "inspectionNumber", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false };
        if (category && ["Safety", "Quality"].includes(category)) {
            filter["entries.category"] = category;
        }
        if (status && ["Pass", "Fail", "Observation"].includes(status)) {
            filter["entries.status"] = status;
        }
        if (severity && ["Low", "Medium", "High"].includes(severity)) {
            filter["entries.severity"] = severity;
        }
        if (isResolved !== undefined && isResolved !== "") {
            filter["entries.isResolved"] = isResolved === "true";
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (!isNaN(from)) filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (!isNaN(to)) { to.setHours(23, 59, 59, 999); filter.createdAt.$lte = to; }
            }
        }
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { inspectionNumber: regex },
                { "entries.title": regex },
                { "entries.location": regex },
                { "entries.remarks": regex },
                { "entries.description": regex },
            ];
        }
        const [inspections, total] = await Promise.all([
            Safety.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Safety.countDocuments(filter),
        ]);
        const enriched = await Promise.all(inspections.map((doc) => enrichSafetyDocument(doc)));
        const [kpiAgg] = await Safety.aggregate([
            { $match: { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false } },
            { $unwind: "$entries" },
            {
                $facet: {
                    totalEntries: [{ $count: "count" }],
                    passCnt: [{ $match: { "entries.status": "Pass" } }, { $count: "count" }],
                    failCnt: [{ $match: { "entries.status": "Fail" } }, { $count: "count" }],
                    observationCnt: [{ $match: { "entries.status": "Observation" } }, { $count: "count" }],
                    safetyCnt: [{ $match: { "entries.category": "Safety" } }, { $count: "count" }],
                    qualityCnt: [{ $match: { "entries.category": "Quality" } }, { $count: "count" }],
                    unresolvedFailCnt: [{ $match: { "entries.status": "Fail", "entries.isResolved": false } }, { $count: "count" }],
                    totalInspections: [{ $group: { _id: "$_id" } }, { $count: "count" }],
                },
            },
        ]);
        const projectSummary = {
            totalInspections: kpiAgg?.totalInspections?.[0]?.count ?? 0,
            totalEntries: kpiAgg?.totalEntries?.[0]?.count ?? 0,
            pass: kpiAgg?.passCnt?.[0]?.count ?? 0,
            fail: kpiAgg?.failCnt?.[0]?.count ?? 0,
            observation: kpiAgg?.observationCnt?.[0]?.count ?? 0,
            safetyEntries: kpiAgg?.safetyCnt?.[0]?.count ?? 0,
            qualityEntries: kpiAgg?.qualityCnt?.[0]?.count ?? 0,
            unresolvedFails: kpiAgg?.unresolvedFailCnt?.[0]?.count ?? 0,
        };
        const totalE = projectSummary.totalEntries || 1;
        projectSummary.passRate = parseFloat(((projectSummary.pass / totalE) * 100).toFixed(1));
        logger.info("Safety inspections fetched for project", {
            projectId,
            companyId,
            total,
            page: pageNumber,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    inspections: enriched,
                    projectSummary,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Inspections Retrieved" : "No Inspections Found",
                `Fetched ${inspections.length} inspection(s) for project ${project.projectName}`
            )
        );
    } catch (error) {
        logger.error("getAllInspectionsByProject failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve safety inspections", [error.message])
        );
    }
};





// This function fetches details of a specific safety inspection. takes x-company-id in headers and projectId with inspectionId in params. returns complete enriched inspection details including entries, inspectors and attachments. -------------------------- Ayan
export const getSingleInspection = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, inspectionId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!inspectionId || !isValidObjectId(inspectionId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inspection ID", "Valid inspectionId is required in params")
            );
        }
        const inspection = await Safety.findOne({
            _id: inspectionId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted")
            .lean();
        if (!inspection) {
            return res.status(404).json(
                new ApiErrors(404, "Inspection Not Found", "No safety inspection found with the given ID")
            );
        }
        const enriched = await enrichSafetyDocument(inspection);
        logger.info("Safety inspection fetched", { inspectionId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { inspection: enriched },
                "Inspection Retrieved",
                "Safety inspection fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getSingleInspection failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve safety inspection", [error.message])
        );
    }
};





// This function updates an existing safety inspection. takes x-company-id in headers, projectId and inspectionId in params and updatedBy with updated entries and optional attachments in body/files. validates inspectors, replaces entries, manages attachments and preserves existing resolution history. -------------------------- Ayan
export const editInspection = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const uploadedAttachments = [];
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, inspectionId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!inspectionId || !isValidObjectId(inspectionId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inspection ID", "Valid inspectionId is required in params")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const inspection = await Safety.findOne({
            _id: inspectionId,
            projectId,
            companyId,
            isDeleted: false,
        }).session(session);
        if (!inspection) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Inspection Not Found", "No safety inspection found with the given ID")
            );
        }
        const hasNewEntries = req.body.entries !== undefined;
        const hasNewFiles = Array.isArray(req.files) && req.files.length > 0;
        if (!hasNewEntries && !hasNewFiles) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send entries or updated attachments to edit")
            );
        }
        const updates = { updatedBy: editorUser._id };
        if (hasNewEntries) {
            let rawEntries;
            try {
                rawEntries = typeof req.body.entries === "string"
                    ? JSON.parse(req.body.entries)
                    : req.body.entries;
            } catch {
                await session.abortTransaction(); session.endSession();
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Entries Format", "entries must be a valid JSON array")
                );
            }
            if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
                await session.abortTransaction(); session.endSession();
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "entries must be a non-empty array")
                );
            }
            const resolvedInspectors = {};
            for (let i = 0; i < rawEntries.length; i++) {
                const entry = rawEntries[i];
                const validation = validateRawEntry(entry, i);
                if (!validation.valid) {
                    await session.abortTransaction(); session.endSession();
                    return res.status(400).json(
                        new ApiErrors(400, "Validation Error", validation.error)
                    );
                }
                const kcId = entry.inspectedBy.trim();
                if (!resolvedInspectors[kcId]) {
                    const inspector = await resolveUserByKeycloak(kcId, companyId);
                    if (!inspector) {
                        await session.abortTransaction(); session.endSession();
                        return res.status(404).json(
                            new ApiErrors(
                                404,
                                "Inspector Not Found",
                                `entries[${i}].inspectedBy: No active user found with keycloakId: ${kcId}`
                            )
                        );
                    }
                    resolvedInspectors[kcId] = inspector;
                }
            }
            const attachmentMap = {};
            if (Array.isArray(req.files) && req.files.length > 0) {
                for (const file of req.files) {
                    const match = file.fieldname.match(/^attachment_(\d+)$/);
                    if (!match) continue;
                    const entryIndex = parseInt(match[1], 10);
                    if (entryIndex >= rawEntries.length) continue;
                    try {
                        const att = await uploadSafetyAttachment(file, editorUser._id);
                        attachmentMap[entryIndex] = att;
                        uploadedAttachments.push(att);
                    } catch (uploadErr) {
                        deleteAttachmentsBestEffort(uploadedAttachments);
                        await session.abortTransaction(); session.endSession();
                        logger.error("Safety edit attachment upload failed", { message: uploadErr.message });
                        return res.status(500).json(
                            new ApiErrors(500, "Upload Failed", "Failed to upload attachment. Please try again.")
                        );
                    }
                }
            }
            const oldAttachments = inspection.entries
                .map((e) => e.attachment)
                .filter(Boolean);
            const oldEntryMap = {};
            inspection.entries.forEach((e) => {
                oldEntryMap[e._id.toString()] = e;
            });
            const processedEntries = rawEntries.map((raw, i) => {
                const inspector = resolvedInspectors[raw.inspectedBy.trim()];
                const attachment = attachmentMap[i] ?? null;
                const built = buildEntryObject(raw, inspector._id, attachment);
                if (raw._id && isValidObjectId(raw._id) && oldEntryMap[raw._id]) {
                    const old = oldEntryMap[raw._id];
                    built.isResolved = old.isResolved;
                    built.resolvedAt = old.resolvedAt;
                    built.resolvedBy = old.resolvedBy;
                    built.resolutionNote = old.resolutionNote;
                    if (!attachment && old.attachment) {
                        built.attachment = old.attachment;
                        const idx = oldAttachments.findIndex(
                            (a) => a?.fileKey === old.attachment?.fileKey
                        );
                        if (idx !== -1) oldAttachments.splice(idx, 1);
                    }
                }
                return built;
            });
            updates.entries = processedEntries;
            inspection._oldAttachmentsToDelete = oldAttachments;
        }
        let updatedInspection;
        try {
            updatedInspection = await Safety.findByIdAndUpdate(
                inspectionId,
                { $set: updates },
                { new: true, runValidators: true, session }
            )
                .select("-__v -isDeleted")
                .lean();
        } catch (dbErr) {
            deleteAttachmentsBestEffort(uploadedAttachments);
            await session.abortTransaction(); session.endSession();
            throw dbErr;
        }
        await session.commitTransaction();
        session.endSession();
        if (inspection._oldAttachmentsToDelete?.length) {
            deleteAttachmentsBestEffort(inspection._oldAttachmentsToDelete);
        }
        const enriched = await enrichSafetyDocument(updatedInspection);
        logger.info("Safety inspection edited", {
            inspectionId,
            projectId,
            companyId,
            entriesReplaced: hasNewEntries,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                { inspection: enriched },
                "Inspection Updated",
                `Safety inspection ${updatedInspection.inspectionNumber} updated successfully`
            )
        );
    } catch (error) {
        deleteAttachmentsBestEffort(uploadedAttachments);
        await session.abortTransaction();
        session.endSession();
        logger.error("editInspection failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update safety inspection", [error.message])
        );
    }
};





// This function marks a safety inspection entry as resolved. takes x-company-id in headers, projectId, inspectionId and entryId in params and resolvedBy with optional resolutionNote in body. validates resolution rules, updates resolution details and triggers safety notifications. -------------------------- Ayan
export const resolveEntry = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, inspectionId, entryId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!inspectionId || !isValidObjectId(inspectionId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inspection ID", "Valid inspectionId is required in params")
            );
        }
        if (!entryId || !isValidObjectId(entryId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Entry ID", "Valid entryId is required in params")
            );
        }
        const { resolvedBy, resolutionNote } = req.body;
        if (!resolvedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "resolvedBy (keycloakId) is required")
            );
        }
        const resolverUser = await resolveUserByKeycloak(resolvedBy, companyId);
        if (!resolverUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${resolvedBy}`)
            );
        }
        const inspection = await Safety.findOne({
            _id: inspectionId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!inspection) {
            return res.status(404).json(
                new ApiErrors(404, "Inspection Not Found", "No safety inspection found with the given ID")
            );
        }
        const entry = inspection.entries.id(entryId);
        if (!entry) {
            return res.status(404).json(
                new ApiErrors(404, "Entry Not Found", "No entry found with the given entryId in this inspection")
            );
        }
        if (entry.status === "Pass") {
            return res.status(400).json(
                new ApiErrors(400, "Cannot Resolve", "Only Fail or Observation entries can be marked as resolved")
            );
        }
        if (entry.isResolved) {
            return res.status(400).json(
                new ApiErrors(400, "Already Resolved", "This entry has already been marked as resolved")
            );
        }
        entry.isResolved = true;
        entry.resolvedAt = new Date();
        entry.resolvedBy = resolverUser._id;
        entry.resolutionNote = resolutionNote?.trim() || null;
        inspection.updatedBy = resolverUser._id;
        await inspection.save();
        NotificationService.notifySafetyEntryResolved({
            companyId,
            projectId,
            projectName: (await Project.findById(projectId).select("projectName").lean())?.projectName ?? "",
            inspectionNumber: inspection.inspectionNumber,
            inspectionId: inspection._id,
            entryTitle: entry.title,
        }).catch((err) =>
            logger.error("notifySafetyEntryResolved failed (non-fatal)", { error: err.message })
        );
        const enriched = await enrichSafetyDocument(inspection.toObject());
        logger.info("Safety entry resolved", { inspectionId, entryId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { inspection: enriched },
                "Entry Resolved",
                "Safety entry marked as resolved"
            )
        );
    } catch (error) {
        logger.error("resolveEntry failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to resolve entry", [error.message])
        );
    }
};





// This function soft deletes a safety inspection. takes x-company-id in headers, projectId and inspectionId in params and deletedBy in body. marks the inspection as deleted and removes associated attachments from storage. -------------------------- Ayan
export const deleteInspection = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, inspectionId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!inspectionId || !isValidObjectId(inspectionId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inspection ID", "Valid inspectionId is required in params")
            );
        }
        const { deletedBy } = req.body;
        if (!deletedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "deletedBy (keycloakId) is required")
            );
        }
        const deleterUser = await resolveUserByKeycloak(deletedBy, companyId);
        if (!deleterUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${deletedBy}`)
            );
        }
        const inspection = await Safety.findOne({
            _id: inspectionId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!inspection) {
            return res.status(404).json(
                new ApiErrors(404, "Inspection Not Found", "No safety inspection found with the given ID")
            );
        }
        const attachmentsToDelete = inspection.entries
            .map((e) => e.attachment)
            .filter(Boolean);
        inspection.isDeleted = true;
        inspection.deletedAt = new Date();
        inspection.deletedBy = deleterUser._id;
        inspection.updatedBy = deleterUser._id;
        await inspection.save();
        deleteAttachmentsBestEffort(attachmentsToDelete);
        logger.info("Safety inspection soft-deleted", {
            inspectionId,
            inspectionNumber: inspection.inspectionNumber,
            projectId,
            companyId,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                null,
                "Inspection Deleted",
                `Safety inspection ${inspection.inspectionNumber} deleted successfully`
            )
        );
    } catch (error) {
        logger.error("deleteInspection failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to delete safety inspection", [error.message])
        );
    }
};





// This function returns global safety summary analytics across all projects. takes x-company-id in headers. computes inspection counts, entry statistics, pass/fail rates, unresolved failures, active projects and top failing project KPIs. -------------------------- Ayan
export const getGlobalSafetySummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const activeProjects = await Project.find(
            { companyId, isDeleted: false }, { _id: 1, projectName: 1 }
        ).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
        const [agg] = await Safety.aggregate([
            {
                $match: {
                    companyId,
                    isDeleted: false,
                    projectId: { $in: activeProjectIds },
                },
            },
            {
                $facet: {
                    totalInspections: [{ $count: "count" }],
                    inspectionsToday: [{ $match: { createdAt: { $gte: startOfToday } } }, { $count: "count" }],
                    inspectionsThisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: "count" }],
                    activeProjects: [{ $group: { _id: "$projectId" } }, { $count: "count" }],
                    entriesStats: [
                        { $unwind: "$entries" },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                pass: { $sum: { $cond: [{ $eq: ["$entries.status", "Pass"] }, 1, 0] } },
                                fail: { $sum: { $cond: [{ $eq: ["$entries.status", "Fail"] }, 1, 0] } },
                                observation: { $sum: { $cond: [{ $eq: ["$entries.status", "Observation"] }, 1, 0] } },
                                safetyEntries: { $sum: { $cond: [{ $eq: ["$entries.category", "Safety"] }, 1, 0] } },
                                qualityEntries: { $sum: { $cond: [{ $eq: ["$entries.category", "Quality"] }, 1, 0] } },
                                unresolvedFails: {
                                    $sum: {
                                        $cond: [{
                                            $and: [
                                                { $eq: ["$entries.status", "Fail"] },
                                                { $eq: ["$entries.isResolved", false] },
                                            ],
                                        }, 1, 0],
                                    }
                                },
                            },
                        },
                    ],
                    topFailingProjects: [
                        { $unwind: "$entries" },
                        { $match: { "entries.status": "Fail", "entries.isResolved": false } },
                        { $group: { _id: "$projectId", unresolvedFails: { $sum: 1 } } },
                        { $sort: { unresolvedFails: -1 } },
                        { $limit: 5 },
                    ],
                },
            },
        ]);
        const es = agg?.entriesStats?.[0] ?? {};
        const totalEntries = es.total ?? 0;
        const projectIdNameMap = {};
        activeProjects.forEach((p) => { projectIdNameMap[p._id.toString()] = p.projectName; });
        const topFailingProjects = (agg?.topFailingProjects ?? []).map((item) => ({
            projectId: item._id,
            projectName: projectIdNameMap[item._id.toString()] ?? "Unknown",
            unresolvedFails: item.unresolvedFails,
        }));
        const summary = {
            totalInspections: agg?.totalInspections?.[0]?.count ?? 0,
            inspectionsToday: agg?.inspectionsToday?.[0]?.count ?? 0,
            inspectionsThisMonth: agg?.inspectionsThisMonth?.[0]?.count ?? 0,
            activeProjects: agg?.activeProjects?.[0]?.count ?? 0,
            totalEntries,
            pass: es.pass ?? 0,
            fail: es.fail ?? 0,
            observation: es.observation ?? 0,
            safetyEntries: es.safetyEntries ?? 0,
            qualityEntries: es.qualityEntries ?? 0,
            unresolvedFails: es.unresolvedFails ?? 0,
            passRate: parseFloat((((es.pass ?? 0) / (totalEntries || 1)) * 100).toFixed(1)),
            topFailingProjects,
        };
        logger.info("Global safety summary fetched", { companyId, totalInspections: summary.totalInspections });
        return res.status(200).json(
            new ApiResponse(
                200,
                { summary },
                "Global Safety Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalSafetySummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch global safety summary", [error.message])
        );
    }
};






// This function returns all safety inspections across the company. takes x-company-id in headers. supports pagination, cursor pagination, search (inspection number, title, location, description), filtering (projectId, category, status, severity, resolution status, date range) and sorting with enriched inspection and project details. -------------------------- Ayan
export const getAllInspectionsGlobal = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const activeProjects = await Project.find(
            { companyId, isDeleted: false }, { _id: 1, projectName: 1 }
        ).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const projectIdNameMap = {};
        activeProjects.forEach((p) => { projectIdNameMap[p._id.toString()] = p.projectName; });
        const {
            page = 1,
            limit = 10,
            search = "",
            projectId,
            category,
            status,
            severity,
            isResolved,
            dateFrom,
            dateTo,
            sortBy = "createdAt",
            order = "desc",
            lastId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const allowedSortFields = ["createdAt", "inspectionNumber", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = {
            companyId,
            isDeleted: false,
            projectId: { $in: activeProjectIds },
        };
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Project ID", "projectId must be a valid ObjectId")
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (category && ["Safety", "Quality"].includes(category)) {
            filter["entries.category"] = category;
        }
        if (status && ["Pass", "Fail", "Observation"].includes(status)) {
            filter["entries.status"] = status;
        }
        if (severity && ["Low", "Medium", "High"].includes(severity)) {
            filter["entries.severity"] = severity;
        }
        if (isResolved !== undefined && isResolved !== "") {
            filter["entries.isResolved"] = isResolved === "true";
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (!isNaN(from)) filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (!isNaN(to)) { to.setHours(23, 59, 59, 999); filter.createdAt.$lte = to; }
            }
        }
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { inspectionNumber: regex },
                { "entries.title": regex },
                { "entries.location": regex },
                { "entries.description": regex },
            ];
        }
        const useCursor = lastId && isValidObjectId(lastId) && sortField === "createdAt";
        const countFilter = { ...filter };
        if (useCursor) {
            const cursorId = new mongoose.Types.ObjectId(lastId);
            filter._id = sortOrder === -1 ? { $lt: cursorId } : { $gt: cursorId };
        }
        const query = Safety.find(filter)
            .select("-__v -isDeleted")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);
        if (!useCursor) query.skip((pageNumber - 1) * pageSize);
        const [inspections, total] = await Promise.all([
            query.lean(),
            Safety.countDocuments(countFilter),
        ]);
        if (inspections.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        inspections: [],
                        pagination: {
                            total, page: pageNumber, limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false, nextCursor: null,
                        },
                    },
                    "No Inspections Found",
                    "No safety inspections matched the given filters"
                )
            );
        }
        const enriched = await Promise.all(inspections.map((doc) => enrichSafetyDocument(doc)));
        const shaped = enriched.map((doc) => ({
            ...doc,
            projectName: projectIdNameMap[doc.projectId?.toString()] ?? "Unknown Project",
        }));
        const hasNextPage = inspections.length === pageSize;
        const nextCursor = hasNextPage ? inspections[inspections.length - 1]._id : null;
        logger.info("Global safety inspections fetched", {
            companyId, total, returned: inspections.length, page: pageNumber,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    inspections: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                "Global Inspections Retrieved",
                `Fetched ${shaped.length} inspection(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllInspectionsGlobal failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global safety inspections", [error.message])
        );
    }
};