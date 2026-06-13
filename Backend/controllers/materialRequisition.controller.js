import mongoose from "mongoose";
import MaterialRequisition from "../models/materialRequisition.models.js";
import Project from "../models/project.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import generateMrNumber from "../utils/generateMrNumber.utils.js";
import {
    isValidObjectId,
    resolveCompany,
    resolveUserByKeycloak,
    processMRItems,
    enrichMRUsers,
    enrichUser
} from "../helpers/mrHelper.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import NotificationService from "../services/notification.service.js";


// This function creates a new material requisition (MR). takes x-company-id in headers, projectId in params and createdBy, items, requiredByDate, reason, remarks, phaseId, taskId, subTaskId in body. validates inputs, processes items and creates MR in Draft state with generated MR number. -------------------------- Ayan
export const createMR = async (req, res) => {
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
        const {
            createdBy,
            items,
            requiredByDate,
            reason,
            remarks,
            phaseId,
            taskId,
            subTaskId,
        } = req.body;
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!Array.isArray(items) || items.length === 0) missing.push("items (must be a non-empty array)");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`)
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "Project not found for this company")
            );
        }
        const { processedItems, error } = await processMRItems(items, projectId, companyId);
        if (error) return res.status(error.statusCode).json(error);
        const mrNumber = await generateMrNumber(companyId);
        const mr = await MaterialRequisition.create({
            companyId,
            projectId,
            phaseId: phaseId && isValidObjectId(phaseId) ? phaseId : null,
            taskId: taskId && isValidObjectId(taskId) ? taskId : null,
            subTaskId: subTaskId && isValidObjectId(subTaskId) ? subTaskId : null,
            mrNumber,
            items: processedItems,
            requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
            reason: reason?.trim() || null,
            remarks: remarks?.trim() || null,
            status: "Draft",
            createdBy: creatorUser._id,
        });
        await pushDprEvent({
            companyId,
            projectId: mr.projectId,
            actorId: creatorUser._id,
            module: "MaterialRequisition",
            action: "MRCreated",
            refId: mr._id,
            refNumber: mr.mrNumber,
            details: {
                mrNumber: mr.mrNumber,
                itemCount: mr.items.length,
                requiredByDate: mr.requiredByDate,
                reason: mr.reason,
                status: mr.status,
                materials: mr.items.map((item) => ({
                    materialName: item.materialName,
                    quantity: item.quantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });
        logger.info("MR created (Draft)", { mrId: mr._id, mrNumber, projectId, companyId });
        return res.status(201).json(
            new ApiResponse(
                201,
                { mr },
                "MR Created",
                `Material Requisition ${mrNumber} created as Draft`
            )
        );
    } catch (error) {
        logger.error("createMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to create MR", [error.message])
        );
    }
};


// This function submits an MR for approval. takes x-company-id in headers, projectId and mrId in params and updatedBy in body. allows submission only from Draft or Rejected state and updates status to Submitted. -------------------------- Ayan
export const submitMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID")
            );
        }
        if (!["Draft", "Rejected"].includes(mr.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot submit an MR in '${mr.status}' status. Only Draft or Rejected MRs can be submitted`
                )
            );
        }
        mr.status = "Submitted";
        mr.submittedAt = new Date();
        mr.rejectionRemarks = null;
        mr.updatedBy = actionUser._id;
        await mr.save();
        // const projectForNotif = await Project.findById(mr.projectId).select("projectName").lean();
        // NotificationService.notifyMRSubmitted({
        //     companyId,
        //     projectId: mr.projectId,
        //     projectName: project?.projectName || mr.mrNumber,
        //     mrNumber: mr.mrNumber,
        //     mrId: mr._id,
        // }).catch(err => logger.error("notifyMRSubmitted failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: mr.projectId,
            actorId: actionUser._id,
            module: "MaterialRequisition",
            action: "MRSubmitted",
            refId: mr._id,
            refNumber: mr.mrNumber,
            details: {
                mrNumber: mr.mrNumber,
                submittedAt: mr.submittedAt,
                itemCount: mr.items.length,
                status: mr.status,
            },
            eventAt: new Date(),
        });
        logger.info("MR submitted", { mrId: mr._id, mrNumber: mr.mrNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { mr }, "MR Submitted", `MR ${mr.mrNumber} submitted for approval`)
        );
    } catch (error) {
        logger.error("submitMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to submit MR", [error.message])
        );
    }
};


// This function approves an MR. takes x-company-id in headers, projectId and mrId in params and actionBy in body. validates state and updates status to Approved with approval details. -------------------------- Ayan
export const approveMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const { actionBy } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID")
            );
        }
        if (mr.status !== "Submitted") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot approve an MR in '${mr.status}' status. Only Submitted MRs can be approved`
                )
            );
        }
        if (mr.createdBy.toString() === actionUser._id.toString()) {
            return res.status(403).json(
                new ApiErrors(403, "Self-Approval Not Allowed", "You cannot approve a Material Requisition that you created")
            );
        }
        mr.status = "Approved";
        mr.approvedBy = actionUser._id;
        mr.approvedAt = new Date();
        mr.updatedBy = actionUser._id;
        await mr.save();
        const projectForNotif = await Project.findById(mr.projectId).select("projectName").lean();
        NotificationService.notifyMRApproved({
            companyId,
            projectId: mr.projectId,
            projectName: projectForNotif?.projectName || mr.mrNumber,
            mrNumber: mr.mrNumber,
            mrId: mr._id,
            creatorId: mr.createdBy,
            triggeredBy: actionUser._id,
        }).catch(err => logger.error("notifyMRApproved failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: mr.projectId,
            actorId: actionUser._id,
            module: "MaterialRequisition",
            action: "MRApproved",
            refId: mr._id,
            refNumber: mr.mrNumber,
            details: {
                mrNumber: mr.mrNumber,
                approvedAt: mr.approvedAt,
                itemCount: mr.items.length,
                status: mr.status,
            },
            eventAt: new Date(),
        });
        logger.info("MR approved", { mrId: mr._id, mrNumber: mr.mrNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { mr }, "MR Approved", `MR ${mr.mrNumber} has been approved`)
        );
    } catch (error) {
        logger.error("approveMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to approve MR", [error.message])
        );
    }
};


// This function rejects an MR. takes x-company-id in headers, projectId and mrId in params and actionBy with rejectionRemarks in body. validates state and updates status to Rejected with remarks. -------------------------- Ayan
export const rejectMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const { actionBy, rejectionRemarks } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID")
            );
        }
        if (mr.status !== "Submitted") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot reject an MR in '${mr.status}' status. Only Submitted MRs can be rejected`
                )
            );
        }
        mr.status = "Rejected";
        mr.rejectedBy = actionUser._id;
        mr.rejectedAt = new Date();
        mr.rejectionRemarks = rejectionRemarks?.trim() || null;
        mr.updatedBy = actionUser._id;
        await mr.save();
        const projectForNotif = await Project.findById(mr.projectId).select("projectName").lean();
        NotificationService.notifyMRRejected({
            companyId,
            projectId: mr.projectId,
            projectName: projectForNotif?.projectName || mr.mrNumber,
            mrNumber: mr.mrNumber,
            mrId: mr._id,
            creatorId: mr.createdBy,
            triggeredBy: actionUser._id,
        }).catch(err => logger.error("notifyMRRejected failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: mr.projectId,
            actorId: actionUser._id,
            module: "MaterialRequisition",
            action: "MRRejected",
            refId: mr._id,
            refNumber: mr.mrNumber,
            details: {
                mrNumber: mr.mrNumber,
                rejectedAt: mr.rejectedAt,
                rejectionRemarks: mr.rejectionRemarks || null,
                itemCount: mr.items.length,
                status: mr.status,
            },
            eventAt: new Date(),
        });
        logger.info("MR rejected", { mrId: mr._id, mrNumber: mr.mrNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { mr }, "MR Rejected", `MR ${mr.mrNumber} has been rejected`)
        );
    } catch (error) {
        logger.error("rejectMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to reject MR", [error.message])
        );
    }
};


// This function updates an MR. takes x-company-id in headers, projectId and mrId in params and editable fields like items, requiredByDate, reason, remarks, phaseId, taskId, subTaskId and updatedBy in body. allows update only in Draft or Rejected state and resets rejected MRs to Draft. -------------------------- Ayan
export const editMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID")
            );
        }
        if (!["Draft", "Rejected"].includes(mr.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot edit an MR in '${mr.status}' status. Only Draft or Rejected MRs can be edited`
                )
            );
        }
        const EDITABLE = ["items", "requiredByDate", "reason", "remarks", "phaseId", "taskId", "subTaskId"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field to update")
            );
        }
        const updates = { updatedBy: editorUser._id };
        if (req.body.items !== undefined) {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "An MR must contain at least one item (items array is required)")
                );
            }
            const existingItemsMap = (mr.items || []).reduce((acc, it) => {
                acc[it.inventoryId.toString()] = it;
                return acc;
            }, {});
            const { processedItems, error } = await processMRItems(
                items,
                projectId,
                companyId,
                existingItemsMap
            );
            if (error) return res.status(error.statusCode).json(error);
            updates.items = processedItems;
        }
        if (req.body.requiredByDate !== undefined) {
            updates.requiredByDate = req.body.requiredByDate
                ? new Date(req.body.requiredByDate)
                : null;
        }
        if (req.body.reason !== undefined) updates.reason = req.body.reason?.trim() || null;
        if (req.body.remarks !== undefined) updates.remarks = req.body.remarks?.trim() || null;
        if (req.body.phaseId !== undefined) {
            updates.phaseId =
                req.body.phaseId && isValidObjectId(req.body.phaseId) ? req.body.phaseId : null;
        }
        if (req.body.taskId !== undefined) {
            updates.taskId =
                req.body.taskId && isValidObjectId(req.body.taskId) ? req.body.taskId : null;
        }
        if (req.body.subTaskId !== undefined) {
            updates.subTaskId =
                req.body.subTaskId && isValidObjectId(req.body.subTaskId) ? req.body.subTaskId : null;
        }
        if (mr.status === "Rejected") {
            updates.status = "Draft";
            updates.rejectedBy = null;
            updates.rejectedAt = null;
            updates.rejectionRemarks = null;
        }
        const updatedMR = await MaterialRequisition.findByIdAndUpdate(
            mrId,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted")
            .lean();
        logger.info("MR edited", {
            mrId,
            projectId,
            companyId,
            updatedFields: Object.keys(updates),
            wasRejected: mr.status === "Rejected",
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                { mr: updatedMR },
                "MR Updated",
                `MR ${updatedMR.mrNumber} updated successfully`
            )
        );
    } catch (error) {
        logger.error("editMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to edit MR", [error.message])
        );
    }
};


// This function returns all MRs for a project. takes x-company-id in headers and projectId in params. supports pagination, search (materialName, mrNumber), filtering (status), sorting and cursor-based pagination with enriched user data. -------------------------- Ayan
export const getAllMRs = async (req, res) => {
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
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            sortBy = "createdAt",
            order = "desc",
            lastId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Draft", "Submitted", "Approved", "Rejected", "ConvertedToPO"];
        const allowedSortFields = ["createdAt", "mrNumber", "requiredByDate"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, projectId, isDeleted: false };
        if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { "items.materialName": searchRegex },
                { mrNumber: searchRegex },
            ];
        }
        const countFilter = { ...filter };
        const useCursor = lastId && isValidObjectId(lastId) && sortField === "createdAt";
        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id = sortOrder === -1 ? { $lt: cursorObjectId } : { $gt: cursorObjectId };
        }
        const query = MaterialRequisition.find(filter)
            .select("-__v -isDeleted")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);
        if (!useCursor) {
            query.skip((pageNumber - 1) * pageSize);
        }
        const [mrs, total] = await Promise.all([
            query.lean(),
            MaterialRequisition.countDocuments(countFilter),
        ]);
        const enrichedMRs = await Promise.all(
            mrs.map((mr) => enrichMRUsers(mr))
        );
        const hasNextPage = mrs.length === pageSize;
        const nextCursor = hasNextPage ? mrs[mrs.length - 1]._id : null;
        logger.info("MRs fetched", { total, page: pageNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mrs: enrichedMRs,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                total > 0 ? "MRs Retrieved" : "No MRs Found",
                `Fetched ${mrs.length} material requisition(s)`
            )
        );
    } catch (error) {
        logger.error("getAllMRs failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve MRs", [error.message])
        );
    }
};


// This function fetches a specific MR by ID. takes x-company-id in headers, projectId and mrId in params. returns complete MR details with enriched user information. -------------------------- Ayan
export const getSingleMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted")
            .lean();
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID")
            );
        }
        const enrichedMR = await enrichMRUsers(mr);
        logger.info("MR fetched", { mrId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { mr: enrichedMR }, "MR Retrieved", "Material Requisition fetched successfully")
        );
    } catch (error) {
        logger.error("getSingleMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve MR", [error.message])
        );
    }
};


// This function soft deletes an MR. takes x-company-id in headers, projectId and mrId in params and deletedBy in body. prevents deletion of Approved or Converted MRs and marks MR as deleted. -------------------------- Ayan
export const deleteMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const { deletedBy } = req.body;
        if (!deletedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "deletedBy (keycloakId) is required in the request body")
            );
        }
        const deleterUser = await resolveUserByKeycloak(deletedBy, companyId);
        if (!deleterUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${deletedBy}`)
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID")
            );
        }
        if (["Approved", "ConvertedToPO"].includes(mr.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot delete an MR in '${mr.status}' status. Approved or Converted MRs cannot be deleted`
                )
            );
        }
        mr.isDeleted = true;
        mr.deletedAt = new Date();
        mr.updatedBy = deleterUser._id;
        await mr.save();
        logger.info("MR soft-deleted", { mrId: mr._id, mrNumber: mr.mrNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, null, "MR Deleted", `MR ${mr.mrNumber} deleted successfully`)
        );
    } catch (error) {
        logger.error("deleteMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to delete MR", [error.message])
        );
    }
};


// This function returns items of a specific MR. takes x-company-id in headers, projectId and mrId in params. returns only the items array with material details, useful for item selection while creating a PO. -------------------------- Ayan
export const getMRItems = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("mrNumber status items")
            .lean();
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID for this project")
            );
        }
        if (!["Approved", "ConvertedToPO"].includes(mr.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid MR Status",
                    `Cannot fetch items from an MR in '${mr.status}' status. Only Approved or ConvertedToPO MRs are eligible for PO creation`
                )
            );
        }
        const existingPOs = await PurchaseOrder.find(
            { companyId, mrId, isDeleted: false },
            { "items.materialMasterId": 1, "items.orderedQuantity": 1 }
        ).lean();
        const orderedQtyMap = {};
        existingPOs.forEach((po) => {
            po.items.forEach((it) => {
                const key = it.materialMasterId.toString();
                orderedQtyMap[key] = (orderedQtyMap[key] || 0) + it.orderedQuantity;
            });
        });
        const enrichedItems = (mr.items || []).map((item) => {
            const alreadyOrdered = orderedQtyMap[item.materialMasterId.toString()] || 0;
            const remainingQuantity = Math.max(item.quantity - alreadyOrdered, 0);
            return {
                ...item,
                alreadyOrderedQuantity: alreadyOrdered,
                remainingQuantity,
                fullyOrdered: remainingQuantity === 0,
            };
        });
        logger.info("MR items fetched", { mrId, projectId, companyId, itemCount: enrichedItems.length });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mrId: mr._id,
                    mrNumber: mr.mrNumber,
                    status: mr.status,
                    items: enrichedItems,
                    totalItems: enrichedItems.length,
                },
                "MR Items Retrieved",
                `Fetched ${enrichedItems.length} item(s) from MR ${mr.mrNumber}`
            )
        );
    } catch (error) {
        logger.error("getMRItems failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve MR items", [error.message])
        );
    }
};


// Lightweight MR Lookup  -------------------------------------------- @Ayan
export const getMRLookup = async (req, res) => {
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
        const { search = "" } = req.query;
        const filter = {
            companyId,
            projectId,
            isDeleted: false,
            status: { $in: ["Approved", "ConvertedToPO"] },
        };
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { mrNumber: searchRegex },
                { "items.materialName": searchRegex },
            ];
        }
        const mrs = await MaterialRequisition.find(filter)
            .select("_id mrNumber status requiredByDate reason items")
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mrs: mrs.map((mr) => ({
                        mrId: mr._id,
                        mrNumber: mr.mrNumber,
                        status: mr.status,
                        requiredByDate: mr.requiredByDate,
                        reason: mr.reason,
                        itemCount: mr.items?.length ?? 0,
                    })),
                    total: mrs.length,
                },
                "MR Lookup Retrieved",
                `Fetched ${mrs.length} MR(s) available for PO creation`
            )
        );
    } catch (error) {
        logger.error("getMRLookup failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve MR lookup", [error.message])
        );
    }
};


// This function returns global material requisition (MR) summary analytics across all projects. takes x-company-id in headers. computes MR status counts, total requested quantity, active project count, delayed requests and average approval time KPIs. -------------------------- Ayan
export const getGlobalMRSummary = async (req, res) => {
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
        const activeProjectDocs = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjectDocs.map((p) => p._id);
        const baseFilter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        const now = new Date();
        const [agg] = await MaterialRequisition.aggregate([
            { $match: baseFilter },
            {
                $facet: {
                    statusCounts: [
                        {
                            $group: {
                                _id: "$status",
                                count: { $sum: 1 },
                            },
                        },
                    ],
                    totalQuantity: [
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$items.requiredQuantity" },
                            },
                        },
                    ],
                    activeProjects: [
                        {
                            $group: { _id: "$projectId" },
                        },
                        { $count: "count" },
                    ],
                    delayedRequests: [
                        {
                            $match: {
                                status: { $in: ["Submitted", "Approved"] },
                                requiredByDate: { $lt: now },
                            },
                        },
                        { $count: "count" },
                    ],
                    avgApprovalTime: [
                        {
                            $match: {
                                status: { $in: ["Approved", "ConvertedToPO"] },
                                submittedAt: { $ne: null },
                                approvedAt: { $ne: null },
                            },
                        },
                        {
                            $project: {
                                diffMs: {
                                    $subtract: ["$approvedAt", "$submittedAt"],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                avgMs: { $avg: "$diffMs" },
                            },
                        },
                    ],
                },
            },
        ]);
        const statusMap = {};
        (agg?.statusCounts || []).forEach(({ _id, count }) => {
            statusMap[_id] = count;
        });
        const totalMRs =
            (statusMap["Draft"] || 0) +
            (statusMap["Submitted"] || 0) +
            (statusMap["Approved"] || 0) +
            (statusMap["Rejected"] || 0) +
            (statusMap["ConvertedToPO"] || 0);
        const pendingMRs = statusMap["Submitted"] || 0;
        const draftMRs = statusMap["Draft"] || 0;
        const approvedMRs = statusMap["Approved"] || 0;
        const convertedToPO = statusMap["ConvertedToPO"] || 0;
        const rejectedMRs = statusMap["Rejected"] || 0;
        const totalRequestedQty = agg?.totalQuantity?.[0]?.total ?? 0;
        const activeProjects = agg?.activeProjects?.[0]?.count ?? 0;
        const delayedRequests = agg?.delayedRequests?.[0]?.count ?? 0;
        const avgMs = agg?.avgApprovalTime?.[0]?.avgMs ?? null;
        const avgApprovalTimeDays =
            avgMs !== null
                ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
                : null;
        logger.info("Global MR summary fetched", { companyId, totalMRs });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalMRs,
                        pendingMRs,
                        draftMRs,
                        approvedMRs,
                        convertedToPO,
                        rejectedMRs,
                        totalRequestedQty: Math.round(totalRequestedQty * 1000) / 1000,
                        activeProjects,
                        delayedRequests,
                        avgApprovalTimeDays,
                    },
                },
                "Global MR Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalMRSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch global MR summary", [error.message])
        );
    }
};



// This function returns all material requisitions (MRs) across the company. takes x-company-id in headers. supports pagination, cursor pagination, search (mrNumber, materialName), filtering (status, projectId, date range) and sorting with enriched project, user and PO status details. -------------------------- Ayan
export const getAllMRsGlobal = async (req, res) => {
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
        const activeProjectDocs = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjectDocs.map((p) => p._id);
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            projectId,
            sortBy = "createdAt",
            order = "desc",
            dateFrom,
            dateTo,
            lastId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Draft", "Submitted", "Approved", "Rejected", "ConvertedToPO"];
        const allowedSortFields = ["createdAt", "mrNumber", "requiredByDate"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Project ID", "projectId query param must be a valid ObjectId")
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (isNaN(from)) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid Date", "dateFrom must be a valid ISO date string")
                    );
                }
                filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (isNaN(to)) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid Date", "dateTo must be a valid ISO date string")
                    );
                }
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { mrNumber: searchRegex },
                { "items.materialName": searchRegex },
            ];
        }
        const useCursor = lastId && isValidObjectId(lastId) && sortField === "createdAt";
        const countFilter = { ...filter };
        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id = sortOrder === -1 ? { $lt: cursorObjectId } : { $gt: cursorObjectId };
        }
        const mrQuery = MaterialRequisition.find(filter)
            .select("-__v -isDeleted")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);

        if (!useCursor) {
            mrQuery.skip((pageNumber - 1) * pageSize);
        }
        const [mrs, total] = await Promise.all([
            mrQuery.lean(),
            MaterialRequisition.countDocuments(countFilter),
        ]);
        if (mrs.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        mrs: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false,
                            nextCursor: null,
                        },
                    },
                    "No MRs Found",
                    "No material requisitions matched the given filters"
                )
            );
        }
        const uniqueProjectIds = [...new Set(mrs.map((m) => m.projectId.toString()))];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });
        const uniqueUserIds = [
            ...new Set([
                ...mrs.map((m) => m.createdBy?.toString()),
                ...mrs.map((m) => m.approvedBy?.toString()),
            ].filter(Boolean)),
        ];
        const userEnrichmentMap = {};
        await Promise.all(
            uniqueUserIds.map(async (uid) => {
                userEnrichmentMap[uid] = await enrichUser(new mongoose.Types.ObjectId(uid));
            })
        );
        const shaped = mrs.map((mr) => {
            const materials = (mr.items || []).map((it) => it.materialName);
            const totalItems = mr.items?.length ?? 0;
            const totalQuantity =
                Math.round(
                    (mr.items || []).reduce((sum, it) => sum + (it.requiredQuantity || 0), 0) * 1000
                ) / 1000;
            let poStatus;
            switch (mr.status) {
                case "ConvertedToPO":
                    poStatus = "PO Created";
                    break;
                case "Approved":
                    poStatus = "PO Pending";
                    break;
                default:
                    poStatus = "Not Applicable";
            }
            const requestedBy = userEnrichmentMap[mr.createdBy?.toString()] ?? null;
            const approvedBy = userEnrichmentMap[mr.approvedBy?.toString()] ?? null;
            return {
                mrId: mr._id,
                mrNumber: mr.mrNumber,
                projectId: mr.projectId,
                projectName: projectMap[mr.projectId?.toString()] ?? "Unknown Project",
                materials,
                totalItems,
                totalQuantity,
                neededBy: mr.requiredByDate ?? null,
                status: mr.status,
                poStatus,
                requestedBy,
                approvedBy,
                reason: mr.reason ?? null,
                remarks: mr.remarks ?? null,
                rejectionRemarks: mr.rejectionRemarks ?? null,
                createdAt: mr.createdAt,
                submittedAt: mr.submittedAt ?? null,
                approvedAt: mr.approvedAt ?? null,
                rejectedAt: mr.rejectedAt ?? null,
            };
        });
        const hasNextPage = mrs.length === pageSize;
        const nextCursor = hasNextPage ? mrs[mrs.length - 1]._id : null;
        logger.info("Global MRs fetched", {
            companyId,
            total,
            returned: mrs.length,
            page: pageNumber,
            filters: { status, projectId, search, dateFrom, dateTo },
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mrs: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                "Global MRs Retrieved",
                `Fetched ${shaped.length} material requisition(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllMRsGlobal failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global MRs", [error.message])
        );
    }
};