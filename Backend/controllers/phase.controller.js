import mongoose from "mongoose";
import Phase from "../models/phase.models.js";
import Project from "../models/project.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import Company from "../models/company.models.js";
import Document from "../models/document.models.js"
import { propagateFromPhase } from "../helpers/progressHelper.js";

// Add New Phase ------------------------------------------------------ @Sundar
export const addPhase = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    "Company Not Found",
                    "No active company found with the provided x-company-id"
                )
            );
        }
        const companyObjectId = company._id;
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Project ID",
                    "The provided projectId is not a valid MongoDB ObjectId"
                )
            );
        }
        const { phaseName, startDate, endDate, description, createdBy } = req.body;
        const missing = [];
        if (!phaseName || !phaseName.trim()) missing.push("phaseName");
        if (!startDate) missing.push("startDate");
        if (!endDate) missing.push("endDate");
        if (!createdBy || !createdBy.trim()) missing.push("createdBy");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Missing Required Fields",
                    `The following fields are required: ${missing.join(", ")}`,
                    missing
                )
            );
        }
        const trimmedName = phaseName.trim();
        if (trimmedName.length > 200) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Validation Failed",
                    "phaseName cannot exceed 200 characters"
                )
            );
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Date Format",
                    "startDate and endDate must be valid ISO date strings (e.g. 2024-06-01)"
                )
            );
        }
        if (end <= start) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Date Range",
                    "endDate must be strictly after startDate"
                )
            );
        }
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    "Project Not Found",
                    `No active project found with ID: ${projectId}`
                )
            );
        }
        if (start < project.startDate || end > project.endDate) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Phase Dates Out of Project Bounds",
                    `Phase dates must be within the project timeline: ${project.startDate
                        .toISOString()
                        .split("T")[0]} → ${project.endDate
                            .toISOString()
                            .split("T")[0]}`
                )
            );
        }
        const duplicate = await Phase.findOne({
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            phaseName: {
                $regex: new RegExp(
                    `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                    "i"
                ),
            },
            isDeleted: false,
        }).lean();
        if (duplicate) {
            return res.status(409).json(
                new ApiErrors(
                    409,
                    "Duplicate Phase Name",
                    `A phase named "${trimmedName}" already exists in this project`
                )
            );
        }
        const lastPhase = await Phase.findOne(
            {
                projectId: new mongoose.Types.ObjectId(projectId),
                isDeleted: false,
            },
            { sequence: 1 },
            { sort: { sequence: -1 } }
        ).lean();
        const sequence = lastPhase ? lastPhase.sequence + 1 : 1;
        const creatorUser = await User.findOne({
            keycloakId: createdBy.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    "Invalid createdBy",
                    `No user found with keycloakId: ${createdBy}`
                )
            );
        }
        const phase = await Phase.create({
            companyId: companyObjectId,
            projectId: new mongoose.Types.ObjectId(projectId),
            phaseName: trimmedName,
            description: description?.trim() || null,
            sequence,
            startDate: start,
            endDate: end,
            completionPercent: 0,
            createdBy: creatorUser._id,
        });
        await Project.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(projectId),
                companyId: companyObjectId,
                status: "planned",
                isDeleted: false,
            },
            { $set: { status: "active" } }
        );
        try {
            await propagateFromPhase(projectId);
        } catch (propagationError) {
            logger.error("addPhase: progress propagation failed", {
                phaseId: phase._id,
                projectId,
                error: propagationError.message,
            });
        }
        logger.info("Phase created successfully", {
            phaseId: phase._id,
            phaseName: phase.phaseName,
            projectId,
            sequence,
            createdBy: creatorUser._id,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    phaseId: phase._id,
                    phaseName: phase.phaseName,
                    description: phase.description,
                    sequence: phase.sequence,
                    startDate: phase.startDate,
                    endDate: phase.endDate,
                    completionPercent: phase.completionPercent,
                    projectId: phase.projectId,
                    companyId: phase.companyId,
                    createdBy: phase.createdBy,
                    createdAt: phase.createdAt,
                },
                "Phase Created",
                `Phase "${phase.phaseName}" has been successfully added to the project`
            )
        );
    } catch (error) {
        logger.error("addPhase failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to create phase. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Get All Phases ----------------------------------------------------- @Sundar
export const getAllPhases = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "sequence",
            order = "asc",
            startDateFrom,
            startDateTo,
            endDateFrom,
            endDateTo,
            minCompletion,
            maxCompletion,
        } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Page Number", "Page must be a positive number")
            );
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Limit", "Limit must be between 1 and 100")
            );
        }
        const filter = {
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        };
        if (search) {
            const regex = { $regex: search, $options: "i" };
            filter.$or = [{ phaseName: regex }, { description: regex }];
        }
        if (startDateFrom || startDateTo) {
            filter.startDate = {};
            if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
            if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
        }
        if (endDateFrom || endDateTo) {
            filter.endDate = {};
            if (endDateFrom) filter.endDate.$gte = new Date(endDateFrom);
            if (endDateTo) filter.endDate.$lte = new Date(endDateTo);
        }
        if (minCompletion || maxCompletion) {
            filter.completionPercent = {};
            if (minCompletion) filter.completionPercent.$gte = Number(minCompletion);
            if (maxCompletion) filter.completionPercent.$lte = Number(maxCompletion);
        }
        const allowedSortFields = ["sequence", "phaseName", "startDate", "endDate", "completionPercent", "createdAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "sequence";
        const sortOrder = order === "desc" ? -1 : 1;
        const phases = await Phase.find(filter)
            .select("_id phaseName description sequence startDate endDate completionPercent createdBy createdAt updatedAt")
            .populate("createdBy", "_id name email")
            .sort({ [sortField]: sortOrder })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .lean();
        const total = await Phase.countDocuments(filter);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    phases,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Phases Retrieved",
                `Successfully fetched ${phases.length} phases`
            )
        );
    } catch (error) {
        logger.error("getAllPhases failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch phases. Please try again later.", [error.message])
        );
    }
};

// Get All Phases (Dropdown / Lookup) --------------------------------- @Sundar
export const getAllPhasesLookup = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        const phases = await Phase.find({
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        })
            .select("_id phaseName sequence")
            .sort({ sequence: 1 })
            .lean();
        return res.status(200).json(
            new ApiResponse(
                200,
                { phases },
                "Phases Retrieved",
                `Successfully fetched ${phases.length} phases`
            )
        );
    } catch (error) {
        logger.error("getAllPhasesLookup failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch phases. Please try again later.", [error.message])
        );
    }
};

// Edit Phase --------------------------------------------------------- @Sundar
export const editPhase = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { projectId, phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const existingPhase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!existingPhase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId} under project: ${projectId}`)
            );
        }
        const { phaseName, startDate, endDate, description } = req.body;
        const allowedFields = ["phaseName", "startDate", "endDate", "description"];
        const provided = allowedFields.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "No Fields Provided",
                    `Provide at least one field to update: ${allowedFields.join(", ")}`,
                    allowedFields
                )
            );
        }
        const updateData = {};
        const errors = [];
        if (phaseName !== undefined) {
            const trimmed = phaseName.trim();
            if (!trimmed) {
                errors.push("phaseName cannot be empty");
            } else if (trimmed.length > 200) {
                errors.push("phaseName cannot exceed 200 characters");
            } else {
                const duplicate = await Phase.findOne({
                    projectId: new mongoose.Types.ObjectId(projectId),
                    companyId: companyObjectId,
                    phaseName: {
                        $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                    },
                    _id: { $ne: existingPhase._id },
                    isDeleted: false,
                }).lean();
                if (duplicate) {
                    errors.push(`A phase named "${trimmed}" already exists in this project`);
                } else {
                    updateData.phaseName = trimmed;
                }
            }
        }
        if (description !== undefined) {
            updateData.description = description === null || description === "" ? null : description.trim();
        }
        const newStart = startDate ? new Date(startDate) : existingPhase.startDate;
        const newEnd = endDate ? new Date(endDate) : existingPhase.endDate;
        if (startDate !== undefined) {
            if (isNaN(newStart.getTime())) {
                errors.push("startDate must be a valid date");
            } else {
                updateData.startDate = newStart;
            }
        }
        if (endDate !== undefined) {
            if (isNaN(newEnd.getTime())) {
                errors.push("endDate must be a valid date");
            } else {
                updateData.endDate = newEnd;
            }
        }
        if (!isNaN(newStart.getTime()) && !isNaN(newEnd.getTime()) && newEnd <= newStart) {
            errors.push("endDate must be strictly after startDate");
        }
        if (errors.length === 0 && (startDate !== undefined || endDate !== undefined)) {
            const project = await Project.findOne({
                _id: new mongoose.Types.ObjectId(projectId),
                companyId: companyObjectId,
                isDeleted: false,
            }).lean();
            if (!project) {
                return res.status(404).json(
                    new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
                );
            }
            if (newStart < project.startDate || newEnd > project.endDate) {
                errors.push(
                    `Phase dates must be within the project timeline: ${project.startDate.toISOString().split("T")[0]} → ${project.endDate.toISOString().split("T")[0]}`
                );
            }
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "One or more fields have invalid values", errors)
            );
        }
        const updatedBy = req.user?._id ?? null;
        if (updatedBy) {
            updateData.updatedBy = new mongoose.Types.ObjectId(updatedBy);
        }
        const updatedPhase = await Phase.findByIdAndUpdate(
            phaseId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted")
            .lean();
        if (!updatedPhase) {
            return res.status(500).json(
                new ApiErrors(500, "Update Failed", "Phase update failed unexpectedly")
            );
        }
        logger.info("Phase updated successfully", {
            phaseId: updatedPhase._id,
            projectId,
            updatedFields: Object.keys(updateData),
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    phaseId: updatedPhase._id,
                    phaseName: updatedPhase.phaseName,
                    description: updatedPhase.description,
                    sequence: updatedPhase.sequence,
                    startDate: updatedPhase.startDate,
                    endDate: updatedPhase.endDate,
                    updatedBy: updatedPhase.updatedBy,
                    updatedAt: updatedPhase.updatedAt,
                },
                "Phase Updated",
                `Phase "${updatedPhase.phaseName}" has been updated successfully`
            )
        );
    } catch (error) {
        logger.error("editPhase failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to update phase. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Get Particular Phase ----------------------------------------------- @Sundar
export const getPhaseById = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { projectId, phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("-__v -isDeleted")
            .populate("createdBy", "_id name email")
            .populate("updatedBy", "_id name email")
            .lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId} under project: ${projectId}`)
            );
        }
        logger.info("Phase fetched successfully", { phaseId, projectId, companyUUID });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    phaseId: phase._id,
                    phaseName: phase.phaseName,
                    description: phase.description,
                    sequence: phase.sequence,
                    startDate: phase.startDate,
                    endDate: phase.endDate,
                    completionPercent: phase.completionPercent,
                    projectId: phase.projectId,
                    companyId: phase.companyId,
                    createdBy: phase.createdBy,
                    updatedBy: phase.updatedBy,
                    createdAt: phase.createdAt,
                    updatedAt: phase.updatedAt,
                },
                "Phase Retrieved",
                `Phase "${phase.phaseName}" details fetched successfully`
            )
        );
    } catch (error) {
        logger.error("getPhaseById failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to fetch phase. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Delete Phase (Soft Delete)------------------------------------------ @Sundar
export const deletePhase = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { projectId, phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId} under project: ${projectId}`));
        }
        const deletedBy = req.user?._id ?? null;
        await Phase.findByIdAndUpdate(phaseId, {
            $set: {
                isDeleted: true,
                ...(deletedBy ? { updatedBy: new mongoose.Types.ObjectId(deletedBy) } : {}),
            },
        });
        try {
            await propagateFromPhase(projectId);
        } catch (propagationError) {
            logger.error("deletePhase: progress propagation failed", {
                phaseId,
                projectId,
                error: propagationError.message,
            });
        }
        logger.info("Phase soft-deleted successfully", {
            phaseId: phase._id,
            phaseName: phase.phaseName,
            projectId,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    phaseId: phase._id,
                    phaseName: phase.phaseName,
                    deletedAt: new Date().toISOString(),
                },
                "Phase Deleted",
                `Phase "${phase.phaseName}" has been deleted successfully`
            )
        );
    } catch (error) {
        logger.error("deletePhase failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to delete phase. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
}

// Reorder Phases (Drag & Drop) --------------------------------------- @Sundar
export const reorderPhases = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
            );
        }
        const { phases } = req.body;
        if (!phases || !Array.isArray(phases) || phases.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Payload", "phases must be a non-empty array of phaseIds in the desired order")
            );
        }
        const invalidIds = phases.filter((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase IDs", `These are not valid MongoDB ObjectIds: ${invalidIds.join(", ")}`)
            );
        }
        const existingPhases = await Phase.find({
            _id: { $in: phases },
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("_id")
            .lean();
        if (existingPhases.length !== phases.length) {
            const foundIds = existingPhases.map((p) => p._id.toString());
            const notFound = phases.filter((id) => !foundIds.includes(id));
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `These phaseIds were not found in this project: ${notFound.join(", ")}`)
            );
        }
        const bulkOps = phases.map((phaseId, index) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(phaseId) },
                update: { $set: { sequence: index + 1 } },
            },
        }));
        await Phase.bulkWrite(bulkOps);
        logger.info("Phases reordered successfully", {
            projectId,
            newOrder: phases,
        });
        const updatedPhases = await Phase.find({
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("_id phaseName sequence")
            .sort({ sequence: 1 })
            .lean();

        return res.status(200).json(
            new ApiResponse(
                200,
                { phases: updatedPhases },
                "Phases Reordered",
                "Phase order has been saved successfully"
            )
        );
    } catch (error) {
        logger.error("reorderPhases failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to reorder phases. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// This function returns all documents linked to a specific phase. Takes projectId and phaseId from params. Supports pagination and search by document name or date. -------------------------- Ayan
export const getPhaseDocuments = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId, phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "The provided projectId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId} under project: ${projectId}`)
            );
        }
        const {
            search,
            dateFrom,
            dateTo,
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
            projectId: new mongoose.Types.ObjectId(projectId),
            "linkedTo.refModel": "Phase",
            "linkedTo.refId": new mongoose.Types.ObjectId(phaseId),
            isDeleted: false,
        };
        if (search?.trim()) {
            filter.name = { $regex: search.trim(), $options: "i" };
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }
        const skip = (pageNum - 1) * limitNum;
        const [documents, total] = await Promise.all([
            Document.find(filter)
                .select("_id name fileName fileSize fileType mimeType category uploadedBy createdAt")
                .populate("uploadedBy", "keycloakId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Document.countDocuments(filter),
        ]);
        logger.info("Phase documents fetched successfully", { phaseId, projectId, total, page: pageNum });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    documents,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                    },
                },
                "Phase Documents Retrieved",
                total > 0 ? `Successfully fetched ${documents.length} documents linked to this phase` : "No documents linked to this phase"
            )
        );
    } catch (error) {
        logger.error("getPhaseDocuments failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch phase documents. Please try again later.", [error.message])
        );
    }
};

// Get Phase Start & End Date ------------------------------------------------------ @Sundar
export const getPhaseDates = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found")
            );
        }
        const companyObjectId = company._id;
        const { projectId, phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID")
            );
        }
        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("phaseName sequence startDate endDate")
            .lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found")
            );
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    phaseId: phase._id,
                    phaseName: phase.phaseName,
                    sequence: phase.sequence,
                    startDate: phase.startDate,
                    endDate: phase.endDate,
                },
                "Phase Dates Fetched",
                `Phase "${phase.phaseName}" dates fetched successfully`
            )
        );
    } catch (error) {
        logger.error("getPhaseDates failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to fetch phase dates",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};    