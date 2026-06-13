import mongoose from "mongoose";
import WorkOrder from "../models/workOrder.models.js";
import Project from "../models/project.models.js";
import Vendor from "../models/vendors.models.js";
import Payable from "../models/payable.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { isValidObjectId, resolveCompany, resolveUserByKeycloak, generateWONumber, processWorkItems, processMilestones, enrichWOUsers, generateWOPdf, generateWCCPdf } from "../helpers/woHelper.js";
import {
    createWOCommitmentExpense,
    reverseExpenseEntry,
    recalcProjectHealth,
    convertWOCommitmentToActual,
    triggerMilestoneExpense
} from "../helpers/expenseHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import { createPayableFromWO, reversePayable } from "../helpers/payableHelper.js";
import NotificationService from "../services/notification.service.js";


// This function creates a new work order (WO). takes x-company-id in headers, projectId in params and createdBy, vendorId, title, description, workItems, hasMilestones, milestones, startDate, expectedEndDate, workLocation, paymentTerms, specialInstructions, phaseId in body. validates inputs, processes items and milestones, calculates contract value and creates WO in Draft state. -------------------------- Ayan
export const createWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found for this company"));
        }
        const {
            createdBy, vendorId, title, description,
            workItems, hasMilestones, milestones,
            startDate, expectedEndDate, workLocation,
            paymentTerms, specialInstructions, phaseId,
        } = req.body;
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!vendorId?.trim()) missing.push("vendorId");
        if (!title?.trim()) missing.push("title");
        if (!Array.isArray(workItems) || workItems.length === 0) missing.push("workItems (must be a non-empty array)");
        if (missing.length > 0) {
            return res.status(400).json(new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`));
        }
        if (!isValidObjectId(vendorId.trim())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid MongoDB ObjectId"));
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`));
        }
        const vendor = await Vendor.findOne({ _id: vendorId.trim(), companyId, isDeleted: false }).lean();
        if (!vendor) {
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No active vendor found with the given ID for this company"));
        }
        if (!vendor.isActive) {
            return res.status(400).json(new ApiErrors(400, "Vendor Inactive", `Vendor "${vendor.name}" is currently inactive and cannot be assigned to a Work Order`));
        }
        if (phaseId && !isValidObjectId(phaseId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Phase ID", "phaseId must be a valid MongoDB ObjectId"));
        }
        const { processedItems, error: itemError } = processWorkItems(workItems);
        if (itemError) return res.status(itemError.statusCode).json(itemError);
        const totalContractValue = parseFloat(
            processedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
        );
        const resolvedHasMilestones = hasMilestones === true || hasMilestones === "true";
        let processedMilestones = [];
        if (resolvedHasMilestones) {
            if (!Array.isArray(milestones) || milestones.length === 0) {
                return res.status(400).json(new ApiErrors(400, "Missing Milestones", "milestones array is required when hasMilestones is true"));
            }
            const { processedMilestones: ms, error: msError } = processMilestones(milestones, totalContractValue);
            if (msError) return res.status(msError.statusCode).json(msError);
            processedMilestones = ms;
        }
        let parsedStart = null;
        let parsedEnd = null;
        if (startDate) {
            parsedStart = new Date(startDate);
            if (isNaN(parsedStart.getTime())) {
                return res.status(400).json(new ApiErrors(400, "Invalid Date", "startDate must be a valid ISO date string"));
            }
        }
        if (expectedEndDate) {
            parsedEnd = new Date(expectedEndDate);
            if (isNaN(parsedEnd.getTime())) {
                return res.status(400).json(new ApiErrors(400, "Invalid Date", "expectedEndDate must be a valid ISO date string"));
            }
        }
        if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date Range", "expectedEndDate must be after startDate"));
        }
        const woNumber = await generateWONumber(companyId);
        const wo = await WorkOrder.create({
            companyId,
            projectId,
            phaseId: phaseId ? new mongoose.Types.ObjectId(phaseId) : null,
            vendorId: new mongoose.Types.ObjectId(vendorId.trim()),
            vendorName: vendor.name,
            woNumber,
            title: title.trim(),
            description: description?.trim() || null,
            workItems: processedItems,
            totalContractValue,
            hasMilestones: resolvedHasMilestones,
            milestones: processedMilestones,
            startDate: parsedStart,
            expectedEndDate: parsedEnd,
            workLocation: workLocation?.trim() || null,
            paymentTerms: paymentTerms?.trim() || null,
            specialInstructions: specialInstructions?.trim() || null,
            status: "Draft",
            createdBy: creatorUser._id,
        });
        logger.info("WO created (Draft)", { woId: wo._id, woNumber, projectId, companyId });
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: creatorUser._id,
            module: "WorkOrder",
            action: "WOCreated",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                totalContractValue: wo.totalContractValue,
                itemCount: wo.workItems.length,
                hasMilestones: wo.hasMilestones,
                milestoneCount: wo.milestones?.length || 0,
                status: wo.status,
            },
            eventAt: new Date(),
        });
        return res.status(201).json(
            new ApiResponse(201, { wo }, "Work Order Created", `Work Order ${woNumber} created as Draft`)
        );
    } catch (error) {
        logger.error("createWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to create Work Order", [error.message]));
    }
};



// This function returns all work orders for a project. takes x-company-id in headers and projectId in params. supports pagination, search (woNumber, title, vendorName), filtering (status, vendorId) and sorting with enriched user data. -------------------------- Ayan
export const getAllWOs = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found with the given ID"));
        }
        const {
            page = 1, limit = 10, search = "",
            status, vendorId: filterVendorId,
            sortBy = "createdAt", order = "desc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Draft", "Submitted", "Approved", "Rejected", "InProgress", "Completed", "Cancelled"];
        const allowedSortFields = ["createdAt", "woNumber", "totalContractValue", "expectedEndDate", "status", "title"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const filter = { companyId, projectId, isDeleted: false };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (filterVendorId && isValidObjectId(filterVendorId)) {
            filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { woNumber: searchRegex },
                { title: searchRegex },
                { vendorName: searchRegex },
            ];
        }
        const [wos, total] = await Promise.all([
            WorkOrder.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            WorkOrder.countDocuments(filter),
        ]);
        const enrichedWOs = await Promise.all(wos.map((wo) => enrichWOUsers(wo)));
        logger.info("WOs fetched", { total, page: pageNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                wos: enrichedWOs,
                pagination: {
                    total, page: pageNumber, limit: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: pageNumber < Math.ceil(total / pageSize),
                    hasPrev: pageNumber > 1,
                },
            },
                total > 0 ? "Work Orders Retrieved" : "No Work Orders Found",
                `Fetched ${wos.length} work order(s)`
            )
        );
    } catch (error) {
        logger.error("getAllWOs failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve Work Orders", [error.message]));
    }
};



// This function fetches a specific work order by ID. takes x-company-id in headers, projectId and woId in params. returns complete WO details with enriched user information. -------------------------- Ayan
export const getSingleWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        if (!woId || !isValidObjectId(woId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        }
        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false })
            .select("-__v -isDeleted")
            .lean();
        if (!wo) {
            return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        }
        const enrichedWO = await enrichWOUsers(wo);
        logger.info("WO fetched", { woId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { wo: enrichedWO }, "Work Order Retrieved", "Work Order fetched successfully")
        );
    } catch (error) {
        logger.error("getSingleWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve Work Order", [error.message]));
    }
};



// This function updates a work order. takes x-company-id in headers, projectId and woId in params and editable fields like vendorId, title, description, workItems, milestones, dates, phaseId and updatedBy in body. allows update only in Draft state and recalculates contract value and milestones. -------------------------- Ayan
export const editWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        if (!woId || !isValidObjectId(woId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required"));
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`));
        }
        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) {
            return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        }
        if (wo.status !== "Draft") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot edit a Work Order in '${wo.status}' status. Only Draft Work Orders can be edited`));
        }
        const EDITABLE = ["vendorId", "title", "description", "workItems", "hasMilestones", "milestones", "startDate", "expectedEndDate", "workLocation", "paymentTerms", "specialInstructions", "phaseId"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(new ApiErrors(400, "No Updates Provided", "Send at least one field to update"));
        }
        const updates = { updatedBy: editorUser._id };
        if (req.body.vendorId !== undefined) {
            const newVendorId = req.body.vendorId?.trim();
            if (!newVendorId || !isValidObjectId(newVendorId)) {
                return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid MongoDB ObjectId"));
            }
            const vendor = await Vendor.findOne({ _id: newVendorId, companyId, isDeleted: false }).lean();
            if (!vendor) return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No active vendor found with the given ID"));
            if (!vendor.isActive) return res.status(400).json(new ApiErrors(400, "Vendor Inactive", `Vendor "${vendor.name}" is currently inactive`));
            updates.vendorId = new mongoose.Types.ObjectId(newVendorId);
            updates.vendorName = vendor.name;
        }
        if (req.body.title !== undefined) {
            if (!req.body.title?.trim()) return res.status(400).json(new ApiErrors(400, "Validation Error", "title cannot be empty"));
            updates.title = req.body.title.trim();
        }
        if (req.body.description !== undefined) updates.description = req.body.description?.trim() || null;
        if (req.body.workLocation !== undefined) updates.workLocation = req.body.workLocation?.trim() || null;
        if (req.body.paymentTerms !== undefined) updates.paymentTerms = req.body.paymentTerms?.trim() || null;
        if (req.body.specialInstructions !== undefined) updates.specialInstructions = req.body.specialInstructions?.trim() || null;
        if (req.body.phaseId !== undefined) {
            if (req.body.phaseId && !isValidObjectId(req.body.phaseId)) {
                return res.status(400).json(new ApiErrors(400, "Invalid Phase ID", "phaseId must be a valid MongoDB ObjectId"));
            }
            updates.phaseId = req.body.phaseId ? new mongoose.Types.ObjectId(req.body.phaseId) : null;
        }
        let newTotalContractValue = wo.totalContractValue;
        if (req.body.workItems !== undefined) {
            const { processedItems, error: itemError } = processWorkItems(req.body.workItems);
            if (itemError) return res.status(itemError.statusCode).json(itemError);
            updates.workItems = processedItems;
            newTotalContractValue = parseFloat(processedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
            updates.totalContractValue = newTotalContractValue;
        }
        const newHasMilestones = req.body.hasMilestones !== undefined
            ? (req.body.hasMilestones === true || req.body.hasMilestones === "true")
            : wo.hasMilestones;
        updates.hasMilestones = newHasMilestones;
        if (newHasMilestones) {
            const milestonesSource = req.body.milestones !== undefined ? req.body.milestones : wo.milestones;
            const { processedMilestones: ms, error: msError } = processMilestones(milestonesSource, newTotalContractValue);
            if (msError) return res.status(msError.statusCode).json(msError);
            updates.milestones = ms;
        } else {
            updates.milestones = [];
        }
        const newStart = req.body.startDate !== undefined ? (req.body.startDate ? new Date(req.body.startDate) : null) : wo.startDate;
        const newEnd = req.body.expectedEndDate !== undefined ? (req.body.expectedEndDate ? new Date(req.body.expectedEndDate) : null) : wo.expectedEndDate;
        if (req.body.startDate !== undefined) updates.startDate = newStart;
        if (req.body.expectedEndDate !== undefined) updates.expectedEndDate = newEnd;
        if (newStart && newEnd && newEnd <= newStart) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date Range", "expectedEndDate must be after startDate"));
        }
        const updatedWO = await WorkOrder.findByIdAndUpdate(woId, { $set: updates }, { new: true, runValidators: true })
            .select("-__v -isDeleted")
            .lean();
        logger.info("WO edited", { woId, projectId, companyId, updatedFields: Object.keys(updates) });
        return res.status(200).json(
            new ApiResponse(200, { wo: updatedWO }, "Work Order Updated", `Work Order ${updatedWO.woNumber} updated successfully`)
        );
    } catch (error) {
        logger.error("editWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to update Work Order", [error.message]));
    }
};



// This function submits a work order for approval. takes x-company-id in headers, projectId and woId in params and updatedBy in body. allows submission only from Draft state and updates status to Submitted. -------------------------- Ayan
export const submitWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;

        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`));
        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (wo.status !== "Draft") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot submit a Work Order in '${wo.status}' status. Only Draft Work Orders can be submitted`));
        }
        wo.status = "Submitted";
        wo.submittedAt = new Date();
        wo.submittedBy = actionUser._id;
        wo.updatedBy = actionUser._id;
        await wo.save();
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: actionUser._id,
            module: "WorkOrder",
            action: "WOSubmitted",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                submittedAt: wo.submittedAt,
                totalContractValue: wo.totalContractValue,
                status: wo.status,
            },
            eventAt: new Date(),
        });
        logger.info("WO submitted", { woId: wo._id, woNumber: wo.woNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, { wo }, "Work Order Submitted", `Work Order ${wo.woNumber} submitted for approval`));
    } catch (error) {
        logger.error("submitWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to submit Work Order", [error.message]));
    }
};



// This function approves a work order. takes x-company-id in headers, projectId and woId in params and actionBy in body. validates state, prevents self-approval and updates status to Approved. -------------------------- Ayan
export const approveWO = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        const { actionBy } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));
        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (wo.status !== "Submitted") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot approve a Work Order in '${wo.status}' status. Only Submitted Work Orders can be approved`));
        }
        if (wo.createdBy.toString() === actionUser._id.toString()) {
            return res.status(403).json(new ApiErrors(403, "Self-Approval Not Allowed", "You cannot approve a Work Order that you created"));
        }
        wo.status = "Approved";
        wo.approvedBy = actionUser._id;
        wo.approvedAt = new Date();
        wo.updatedBy = actionUser._id;
        await wo.save({ session });
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: actionUser._id,
            module: "WorkOrder",
            action: "WOApproved",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                approvedAt: wo.approvedAt,
                totalContractValue: wo.totalContractValue,
                status: wo.status,
            },
            eventAt: new Date(),
        });
        await createWOCommitmentExpense({
            companyId,
            projectId: new mongoose.Types.ObjectId(projectId),
            woId: wo._id,
            woNumber: wo.woNumber,
            totalContractValue: wo.totalContractValue,
            vendorId: wo.vendorId,
            vendorName: wo.vendorName,
            phaseId: wo.phaseId || null,
            createdBy: actionUser._id,
        }, session);
        await session.commitTransaction();
        session.endSession();
        const projectForNotif = await Project.findById(wo.projectId).select("projectName").lean();
        NotificationService.notifyWOApproved({
            companyId,
            projectId: wo.projectId,
            projectName: projectForNotif?.projectName || wo.woNumber,
            woNumber: wo.woNumber,
            woId: wo._id,
        }).catch(err => logger.error("notifyWOApproved failed (non-fatal)", { error: err.message }));
        createPayableFromWO({ wo }).catch((err) =>
            logger.error("createPayableFromWO failed (non-critical)", { woId: wo._id, error: err.message })
        );
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("WO approved", { woId: wo._id, woNumber: wo.woNumber });
        return res.status(200).json(new ApiResponse(200, { wo }, "Work Order Approved", `Work Order ${wo.woNumber} has been approved`));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("approveWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to approve Work Order", [error.message]));
    }
};


// This function rejects a work order. takes x-company-id in headers, projectId and woId in params and actionBy with rejectionRemarks in body. validates state, prevents self-rejection and updates status to Rejected. -------------------------- Ayan
export const rejectWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        const { actionBy, rejectionRemarks } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));
        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (wo.status !== "Submitted") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot reject a Work Order in '${wo.status}' status. Only Submitted Work Orders can be rejected`));
        }
        if (wo.createdBy.toString() === actionUser._id.toString()) {
            return res.status(403).json(new ApiErrors(403, "Self-Rejection Not Allowed", "You cannot reject a Work Order that you created"));
        }
        wo.status = "Rejected";
        wo.rejectedBy = actionUser._id;
        wo.rejectedAt = new Date();
        wo.rejectionRemarks = rejectionRemarks?.trim() || null;
        wo.updatedBy = actionUser._id;
        await wo.save();
        const projectForNotif = await Project.findById(wo.projectId).select("projectName").lean();
        NotificationService.notifyWORejected({
            companyId,
            projectId: wo.projectId,
            projectName: projectForNotif?.projectName || wo.woNumber,
            woNumber: wo.woNumber,
            woId: wo._id,
            creatorId: wo.createdBy,
            triggeredBy: actionUser._id,
        }).catch(err => logger.error("notifyWORejected failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: actionUser._id,
            module: "WorkOrder",
            action: "WORejected",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                rejectedAt: wo.rejectedAt,
                rejectionRemarks: wo.rejectionRemarks || null,
                totalContractValue: wo.totalContractValue,
                status: wo.status,
            },
            eventAt: new Date(),
        });
        logger.info("WO rejected", { woId: wo._id, woNumber: wo.woNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, { wo }, "Work Order Rejected", `Work Order ${wo.woNumber} has been rejected`));
    } catch (error) {
        logger.error("rejectWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to reject Work Order", [error.message]));
    }
};


// This function cancels a work order. takes x-company-id in headers, projectId and woId in params and actionBy with cancellationRemarks in body. allows cancellation only in Approved or InProgress state and updates status to Cancelled. -------------------------- Ayan
export const cancelWO = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        const { actionBy, cancellationRemarks } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));

        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (!["Approved", "InProgress"].includes(wo.status)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot cancel a Work Order in '${wo.status}' status. Only Approved or InProgress Work Orders can be cancelled`));
        }
        const linkedPayable = await Payable.findOne({
            sourceType: "WO",
            sourceId: wo._id,
            status: { $in: ["Paid", "PartiallyPaid"] },
        }).lean();
        if (linkedPayable) {
            await session.abortTransaction(); session.endSession();
            const statusLabel = linkedPayable.status === "Paid" ? "fully paid" : "partially paid";
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Cancellation Not Allowed",
                    `Work Order ${wo.woNumber} cannot be cancelled because its linked payable (${linkedPayable.payableNumber}) has already been ${statusLabel}. Please reverse or adjust the payment before cancelling this Work Order.`
                )
            );
        }
        wo.status = "Cancelled";
        wo.cancelledBy = actionUser._id;
        wo.cancelledAt = new Date();
        wo.cancellationRemarks = cancellationRemarks?.trim() || null;
        wo.updatedBy = actionUser._id;
        await wo.save({ session });
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: actionUser._id,
            module: "WorkOrder",
            action: "WOCancelled",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                cancelledAt: wo.cancelledAt,
                cancellationRemarks: wo.cancellationRemarks || null,
                totalContractValue: wo.totalContractValue,
                status: wo.status,
            },
            eventAt: new Date(),
        });
        await reverseExpenseEntry({
            sourceModel: "WorkOrder",
            sourceId: wo._id,
            reversedBy: actionUser._id,
            reversalReason: `WO ${wo.woNumber} cancelled`,
            statusFilter: { $in: ["Committed", "Actual"] },
        }, session);
        await session.commitTransaction();
        session.endSession();
        reversePayable({
            sourceType: "WO",
            sourceId: wo._id,
            reversalReason: `Reversed because WO-${wo.woNumber} has been cancelled on ${new Date().toLocaleDateString("en-IN")}`,
            reversedBy: actionUser._id,
        }).catch((err) =>
            logger.error("reversePayable (WO) failed (non-critical)", { woId: wo._id, error: err.message })
        );
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("WO cancelled", { woId: wo._id, woNumber: wo.woNumber });
        return res.status(200).json(new ApiResponse(200, { wo }, "Work Order Cancelled", `Work Order ${wo.woNumber} has been cancelled`));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("cancelWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to cancel Work Order", [error.message]));
    }
};


// This function marks a work order as InProgress. takes x-company-id in headers, projectId and woId in params and actionBy in body. validates state transition from Approved and updates execution details. -------------------------- Ayan
export const markWOInProgress = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));

        const { actionBy } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));

        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (wo.status !== "Approved") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot mark a Work Order as InProgress from '${wo.status}' status. Only Approved Work Orders can be started`));
        }
        wo.status = "InProgress";
        wo.inProgressAt = new Date();
        wo.inProgressBy = actionUser._id;
        wo.updatedBy = actionUser._id;
        await wo.save();
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: actionUser._id,
            module: "WorkOrder",
            action: "WOInProgress",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                inProgressAt: wo.inProgressAt,
                totalContractValue: wo.totalContractValue,
                completionPercent: wo.completionPercent,
                status: wo.status,
            },

            eventAt: new Date(),
        });
        logger.info("WO marked InProgress", { woId: wo._id, woNumber: wo.woNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, { wo }, "Work Order Started", `Work Order ${wo.woNumber} is now InProgress`));
    } catch (error) {
        logger.error("markWOInProgress failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to mark Work Order as InProgress", [error.message]));
    }
};



// This function marks a work order as completed. takes x-company-id in headers, projectId and woId in params and actionBy, completionRemarks, actualEndDate in body. validates state, updates completion details, milestones and sets completion to 100%. -------------------------- Ayan
export const markWOComplete = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));
        const { actionBy, completionRemarks, actualEndDate } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));

        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (wo.status !== "InProgress") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot complete a Work Order in '${wo.status}' status. Only InProgress Work Orders can be completed`));
        }
        let parsedActualEnd = new Date();
        if (actualEndDate) {
            parsedActualEnd = new Date(actualEndDate);
            if (isNaN(parsedActualEnd.getTime())) {
                return res.status(400).json(new ApiErrors(400, "Invalid Date", "actualEndDate must be a valid ISO date string"));
            }
        }
        const previouslyPendingMilestones = wo.hasMilestones
            ? wo.milestones.filter((ms) => ms.status === "Pending").map((ms) => ms.toObject())
            : [];
        const updatedMilestones = wo.hasMilestones
            ? wo.milestones.map((ms) => {
                if (ms.status === "Pending") {
                    return { ...ms.toObject(), status: "Triggered", triggeredAt: new Date() };
                }
                return ms.toObject();
            })
            : wo.milestones;
        wo.status = "Completed";
        wo.completedAt = new Date();
        wo.completedBy = actionUser._id;
        wo.completionRemarks = completionRemarks?.trim() || null;
        wo.actualEndDate = parsedActualEnd;
        wo.completionPercent = 100;
        wo.milestones = updatedMilestones;
        wo.updatedBy = actionUser._id;
        await wo.save();
        if (wo.hasMilestones && previouslyPendingMilestones.length > 0) {
            for (const ms of previouslyPendingMilestones) {
                try {
                    await triggerMilestoneExpense({
                        sourceId: wo._id,
                        woNumber: wo.woNumber,
                        projectId: wo.projectId,
                        companyId: wo.companyId,
                        milestoneAmount: ms.paymentAmount,
                        milestoneTitle: ms.title,
                        vendorId: wo.vendorId,
                        vendorName: wo.vendorName,
                        phaseId: wo.phaseId || null,
                        resolvedBy: actionUser._id,
                        resolvedReason: `Milestone "${ms.title}" triggered — WO ${wo.woNumber} manually completed`,
                    });
                } catch (err) {
                    logger.error("markWOComplete: milestone expense trigger failed", {
                        woId: wo._id, milestoneTitle: ms.title, error: err.message,
                    });
                }
            }
        } else if (!wo.hasMilestones) {
            try {
                await convertWOCommitmentToActual({
                    sourceId: wo._id,
                    resolvedBy: actionUser._id,
                    resolvedReason: `WO ${wo.woNumber} manually completed`,
                });
            } catch (err) {
                logger.error("markWOComplete: WO commitment conversion failed", {
                    woId: wo._id, error: err.message,
                });
            }
        }
        await pushDprEvent({
            companyId,
            projectId: wo.projectId,
            actorId: actionUser._id,
            module: "WorkOrder",
            action: "WOCompleted",
            refId: wo._id,
            refNumber: wo.woNumber,
            details: {
                woNumber: wo.woNumber,
                title: wo.title,
                vendorName: wo.vendorName,
                completedAt: wo.completedAt,
                actualEndDate: wo.actualEndDate,
                completionPercent: wo.completionPercent,
                totalContractValue: wo.totalContractValue,
                status: wo.status,
            },
            eventAt: new Date(),
        });
        logger.info("WO marked complete", { woId: wo._id, woNumber: wo.woNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, { wo }, "Work Order Completed", `Work Order ${wo.woNumber} has been marked as completed`));
    } catch (error) {
        logger.error("markWOComplete failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to complete Work Order", [error.message]));
    }
};


// This function soft deletes a work order. takes x-company-id in headers, projectId and woId in params and deletedBy in body. allows deletion only in Draft or Rejected state and marks WO as deleted. -------------------------- Ayan
export const deleteWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;

        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));

        const { deletedBy } = req.body;
        if (!deletedBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "deletedBy (keycloakId) is required"));
        const deleterUser = await resolveUserByKeycloak(deletedBy, companyId);
        if (!deleterUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${deletedBy}`));

        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false });
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));
        if (!["Draft", "Rejected"].includes(wo.status)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot delete a Work Order in '${wo.status}' status. Only Draft or Rejected Work Orders can be deleted`));
        }
        const linkedPayable = await Payable.findOne({
            sourceType: "WO",
            sourceId: wo._id,
            status: { $in: ["Paid", "PartiallyPaid"] },
        }).lean();
        if (linkedPayable) {
            const statusLabel = linkedPayable.status === "Paid" ? "fully paid" : "partially paid";
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Deletion Not Allowed",
                    `Work Order ${wo.woNumber} cannot be deleted because its linked payable (${linkedPayable.payableNumber}) has already been ${statusLabel}. Please reverse or adjust the payment before deleting this Work Order.`
                )
            );
        }
        wo.isDeleted = true;
        wo.deletedAt = new Date();
        wo.deletedBy = deleterUser._id;
        wo.updatedBy = deleterUser._id;
        await wo.save();

        logger.info("WO soft-deleted", { woId: wo._id, woNumber: wo.woNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, null, "Work Order Deleted", `Work Order ${wo.woNumber} deleted successfully`));
    } catch (error) {
        logger.error("deleteWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to delete Work Order", [error.message]));
    }
};


// This function exports a work order as PDF. takes x-company-id in headers, projectId and woId in params. fetches project, vendor and user details and generates formatted WO document for download. -------------------------- Ayan
export const exportWOAsPdf = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;

        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));

        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));

        if (!["Approved", "InProgress", "Completed"].includes(wo.status)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Status", `Cannot export a Work Order in '${wo.status}' status. PDF is available for Approved, InProgress, or Completed Work Orders`));
        }

        const [project, vendor, enrichedWO] = await Promise.all([
            Project.findOne({ _id: projectId, companyId, isDeleted: false })
                .select("projectName projectCode location clientName status startDate endDate")
                .lean(),
            Vendor.findOne({ _id: wo.vendorId, companyId, isDeleted: false })
                .select("name vendorType contactPerson phone email address legalDetails")
                .lean(),
            enrichWOUsers(wo),
        ]);

        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", "Project linked to this Work Order no longer exists"));

        logger.info("WO PDF export initiated", { woId, woNumber: wo.woNumber, projectId, companyId });
        await generateWOPdf(res, { wo: enrichedWO, company, vendor, project, createdByUser: enrichedWO.createdBy });
    } catch (error) {
        if (!res.headersSent) {
            logger.error("exportWOAsPdf failed", { message: error.message, stack: error.stack });
            return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to generate Work Order PDF", [error.message]));
        }
        logger.error("exportWOAsPdf stream error (headers already sent)", { message: error.message });
    }
};


// This function exports work completion certificate (WCC) as PDF. takes x-company-id in headers, projectId and woId in params. allows export only for Completed WOs and generates completion certificate document. -------------------------- Ayan
export const exportWCCAsPdf = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, woId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        if (!woId || !isValidObjectId(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", "Valid woId is required in params"));

        const wo = await WorkOrder.findOne({ _id: woId, projectId, companyId, isDeleted: false })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!wo) return res.status(404).json(new ApiErrors(404, "Work Order Not Found", "No Work Order found with the given ID"));

        if (wo.status !== "Completed") {
            return res.status(400).json(new ApiErrors(400, "Work Order Not Completed", `Work Completion Certificate can only be generated for Completed Work Orders. Current status: '${wo.status}'`));
        }
        const [project, vendor, enrichedWO] = await Promise.all([
            Project.findOne({ _id: projectId, companyId, isDeleted: false })
                .select("projectName projectCode location clientName status startDate endDate")
                .lean(),
            Vendor.findOne({ _id: wo.vendorId, companyId, isDeleted: false })
                .select("name vendorType contactPerson phone email address legalDetails")
                .lean(),
            enrichWOUsers(wo),
        ]);
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", "Project linked to this Work Order no longer exists"));
        logger.info("WCC PDF export initiated", { woId, woNumber: wo.woNumber, projectId, companyId });
        await generateWCCPdf(res, { wo: enrichedWO, company, vendor, project, completedByUser: enrichedWO.completedBy });
    } catch (error) {
        if (!res.headersSent) {
            logger.error("exportWCCAsPdf failed", { message: error.message, stack: error.stack });
            return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to generate WCC PDF", [error.message]));
        }
        logger.error("exportWCCAsPdf stream error (headers already sent)", { message: error.message });
    }
};


// This function returns vendor lookup data for WO creation. takes x-company-id in headers and optional search in query. returns active vendors with minimal details for selection. -------------------------- Ayan
export const getVendorLookupForWO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { search = "" } = req.query;
        const filter = { companyId, isDeleted: false, isActive: true };
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [{ name: searchRegex }, { vendorType: searchRegex }, { contactPerson: searchRegex }];
        }
        const vendors = await Vendor.find(filter)
            .select("_id name vendorType contactPerson phone email isVerified")
            .sort({ name: 1 })
            .lean();
        return res.status(200).json(
            new ApiResponse(200, { vendors, total: vendors.length }, "Vendors Retrieved", `Fetched ${vendors.length} active vendor(s) for Work Order assignment`)
        );
    } catch (error) {
        logger.error("getVendorLookupForWO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve vendors", [error.message]));
    }
};


// This function returns work order lookup data. takes x-company-id in headers and projectId in params with optional search. returns active WOs (Approved/InProgress) with minimal details for linking. -------------------------- Ayan
export const getWOLookup = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        const { search = "" } = req.query;
        const filter = {
            companyId, projectId, isDeleted: false,
            status: { $in: ["Approved", "InProgress"] },
        };
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [{ woNumber: searchRegex }, { title: searchRegex }, { vendorName: searchRegex }];
        }
        const wos = await WorkOrder.find(filter)
            .select("_id woNumber title status vendorName totalContractValue completionPercent hasMilestones expectedEndDate")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json(
            new ApiResponse(200, {
                wos: wos.map((wo) => ({
                    woId: wo._id,
                    woNumber: wo.woNumber,
                    title: wo.title,
                    status: wo.status,
                    vendorName: wo.vendorName,
                    totalContractValue: wo.totalContractValue,
                    completionPercent: wo.completionPercent,
                    hasMilestones: wo.hasMilestones,
                    expectedEndDate: wo.expectedEndDate,
                })),
                total: wos.length,
            },
                "WO Lookup Retrieved",
                `Fetched ${wos.length} active Work Order(s) for task linking`
            )
        );
    } catch (error) {
        logger.error("getWOLookup failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve Work Order lookup", [error.message]));
    }
};




// This function returns global work order (WO) summary analytics across all projects. takes x-company-id in headers. computes WO status counts, total contract value, active projects, active vendors, overdue WOs, milestone stats and average approval time KPIs. -------------------------- Ayan
export const getGlobalWOSummary = async (req, res) => {
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
        const [agg] = await WorkOrder.aggregate([
            { $match: baseFilter },
            {
                $facet: {
                    statusCounts: [
                        { $group: { _id: "$status", count: { $sum: 1 } } },
                    ],
                    totalContractValue: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$totalContractValue" },
                            },
                        },
                    ],
                    activeProjects: [
                        { $group: { _id: "$projectId" } },
                        { $count: "count" },
                    ],
                    activeVendors: [
                        { $group: { _id: "$vendorId" } },
                        { $count: "count" },
                    ],
                    overdueWOs: [
                        {
                            $match: {
                                status: { $in: ["Approved", "InProgress"] },
                                expectedEndDate: { $ne: null, $lt: now },
                            },
                        },
                        { $count: "count" },
                    ],
                    withMilestones: [
                        { $match: { hasMilestones: true } },
                        { $count: "count" },
                    ],
                    totalMilestones: [
                        { $match: { hasMilestones: true } },
                        { $unwind: "$milestones" },
                        { $count: "count" },
                    ],
                    triggeredMilestones: [
                        { $match: { hasMilestones: true } },
                        { $unwind: "$milestones" },
                        {
                            $match: {
                                "milestones.status": { $in: ["Triggered", "Paid"] },
                            },
                        },
                        { $count: "count" },
                    ],
                    avgApprovalTime: [
                        {
                            $match: {
                                status: {
                                    $in: [
                                        "Approved",
                                        "InProgress",
                                        "Completed",
                                        "Cancelled",
                                    ],
                                },
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
                    avgCompletionPercent: [
                        {
                            $match: {
                                status: { $in: ["InProgress", "Approved"] },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                avg: { $avg: "$completionPercent" },
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
        const totalWOs =
            (statusMap["Draft"] || 0) +
            (statusMap["Submitted"] || 0) +
            (statusMap["Approved"] || 0) +
            (statusMap["Rejected"] || 0) +
            (statusMap["InProgress"] || 0) +
            (statusMap["Completed"] || 0) +
            (statusMap["Cancelled"] || 0);
        const draftWOs = statusMap["Draft"] || 0;
        const submittedWOs = statusMap["Submitted"] || 0;
        const approvedWOs = statusMap["Approved"] || 0;
        const rejectedWOs = statusMap["Rejected"] || 0;
        const inProgressWOs = statusMap["InProgress"] || 0;
        const completedWOs = statusMap["Completed"] || 0;
        const cancelledWOs = statusMap["Cancelled"] || 0;
        const totalContractValue = Math.round((agg?.totalContractValue?.[0]?.total ?? 0) * 100) / 100;
        const activeProjects = agg?.activeProjects?.[0]?.count ?? 0;
        const activeVendors = agg?.activeVendors?.[0]?.count ?? 0;
        const overdueWOs = agg?.overdueWOs?.[0]?.count ?? 0;
        const wosWithMilestones = agg?.withMilestones?.[0]?.count ?? 0;
        const totalMilestones = agg?.totalMilestones?.[0]?.count ?? 0;
        const triggeredMilestones = agg?.triggeredMilestones?.[0]?.count ?? 0;
        const avgMs = agg?.avgApprovalTime?.[0]?.avgMs ?? null;
        const avgApprovalTimeDays =
            avgMs !== null
                ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
                : null;
        const avgCompletionPercent =
            agg?.avgCompletionPercent?.[0]?.avg != null
                ? Math.round(agg.avgCompletionPercent[0].avg * 10) / 10
                : null;
        logger.info("Global WO summary fetched", { companyId, totalWOs });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalWOs,
                        draftWOs,
                        submittedWOs,
                        approvedWOs,
                        rejectedWOs,
                        inProgressWOs,
                        completedWOs,
                        cancelledWOs,
                        totalContractValue,
                        activeProjects,
                        activeVendors,
                        overdueWOs,
                        wosWithMilestones,
                        totalMilestones,
                        triggeredMilestones,
                        avgApprovalTimeDays,
                        avgCompletionPercent,
                    },
                },
                "Global WO Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalWOSummary failed", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to fetch global WO summary",
                [error.message]
            )
        );
    }
};


// This function returns all work orders (WOs) across the company. takes x-company-id in headers. supports pagination, cursor pagination, search (woNumber, title, vendorName), filtering (status, projectId, vendorId, date range, overdueOnly) and sorting with enriched project, user and milestone details. -------------------------- Ayan
export const getAllWOsGlobal = async (req, res) => {
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
            vendorId,
            sortBy = "createdAt",
            order = "desc",
            dateFrom,
            dateTo,
            lastId,
            overdueOnly,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = [
            "Draft",
            "Submitted",
            "Approved",
            "Rejected",
            "InProgress",
            "Completed",
            "Cancelled",
        ];
        const allowedSortFields = [
            "createdAt",
            "woNumber",
            "totalContractValue",
            "expectedEndDate",
            "status",
        ];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Project ID",
                        "projectId query param must be a valid ObjectId"
                    )
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (vendorId) {
            if (!isValidObjectId(vendorId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Vendor ID",
                        "vendorId query param must be a valid ObjectId"
                    )
                );
            }
            filter.vendorId = new mongoose.Types.ObjectId(vendorId);
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (isNaN(from)) {
                    return res.status(400).json(
                        new ApiErrors(
                            400,
                            "Invalid Date",
                            "dateFrom must be a valid ISO date string"
                        )
                    );
                }
                filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (isNaN(to)) {
                    return res.status(400).json(
                        new ApiErrors(
                            400,
                            "Invalid Date",
                            "dateTo must be a valid ISO date string"
                        )
                    );
                }
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }
        if (overdueOnly === "true") {
            filter.status = { $in: ["Approved", "InProgress"] };
            filter.expectedEndDate = { $ne: null, $lt: new Date() };
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { woNumber: searchRegex },
                { title: searchRegex },
                { vendorName: searchRegex },
            ];
        }
        const useCursor = lastId && isValidObjectId(lastId) && sortField === "createdAt";
        const countFilter = { ...filter };
        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id =
                sortOrder === -1
                    ? { $lt: cursorObjectId }
                    : { $gt: cursorObjectId };
        }
        const woQuery = WorkOrder.find(filter)
            .select("-__v -isDeleted -deletedAt")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);

        if (!useCursor) {
            woQuery.skip((pageNumber - 1) * pageSize);
        }
        const [wos, total] = await Promise.all([
            woQuery.lean(),
            WorkOrder.countDocuments(countFilter),
        ]);
        if (wos.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        wos: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false,
                            nextCursor: null,
                        },
                    },
                    "No Work Orders Found",
                    "No work orders matched the given filters"
                )
            );
        }
        const uniqueProjectIds = [
            ...new Set(wos.map((w) => w.projectId?.toString()).filter(Boolean)),
        ];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });
        const enrichedWOs = await Promise.all(wos.map((wo) => enrichWOUsers(wo)));
        const now = new Date();
        const shaped = enrichedWOs.map((wo) => {
            const totalItems = wo.workItems?.length ?? 0;
            const totalContractValue = wo.totalContractValue ?? 0;
            const milestoneSummary = wo.hasMilestones
                ? {
                    total: wo.milestones?.length ?? 0,
                    pending: (wo.milestones || []).filter(
                        (ms) => ms.status === "Pending"
                    ).length,
                    triggered: (wo.milestones || []).filter(
                        (ms) => ms.status === "Triggered"
                    ).length,
                    paid: (wo.milestones || []).filter(
                        (ms) => ms.status === "Paid"
                    ).length,
                }
                : null;
            const isOverdue =
                ["Approved", "InProgress"].includes(wo.status) &&
                wo.expectedEndDate != null &&
                new Date(wo.expectedEndDate) < now;
            return {
                woId: wo._id,
                woNumber: wo.woNumber,
                projectId: wo.projectId,
                projectName:
                    projectMap[wo.projectId?.toString()] ?? "Unknown Project",
                title: wo.title,
                description: wo.description ?? null,
                vendorId: wo.vendorId,
                vendorName: wo.vendorName,
                totalItems,
                totalContractValue,
                completionPercent: wo.completionPercent ?? 0,
                hasMilestones: wo.hasMilestones,
                milestoneSummary,
                isOverdue,
                status: wo.status,
                workLocation: wo.workLocation ?? null,
                paymentTerms: wo.paymentTerms ?? null,
                startDate: wo.startDate ?? null,
                expectedEndDate: wo.expectedEndDate ?? null,
                actualEndDate: wo.actualEndDate ?? null,
                createdBy: wo.createdBy ?? null,
                submittedBy: wo.submittedBy ?? null,
                approvedBy: wo.approvedBy ?? null,
                rejectedBy: wo.rejectedBy ?? null,
                cancelledBy: wo.cancelledBy ?? null,
                inProgressBy: wo.inProgressBy ?? null,
                completedBy: wo.completedBy ?? null,
                rejectionRemarks: wo.rejectionRemarks ?? null,
                cancellationRemarks: wo.cancellationRemarks ?? null,
                completionRemarks: wo.completionRemarks ?? null,
                createdAt: wo.createdAt,
                submittedAt: wo.submittedAt ?? null,
                approvedAt: wo.approvedAt ?? null,
                rejectedAt: wo.rejectedAt ?? null,
                cancelledAt: wo.cancelledAt ?? null,
                inProgressAt: wo.inProgressAt ?? null,
                completedAt: wo.completedAt ?? null,
            };
        });
        const hasNextPage = wos.length === pageSize;
        const nextCursor = hasNextPage ? wos[wos.length - 1]._id : null;
        logger.info("Global WOs fetched", {
            companyId,
            total,
            returned: wos.length,
            page: pageNumber,
            filters: { status, projectId, vendorId, search, dateFrom, dateTo, overdueOnly },
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    wos: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                "Global WOs Retrieved",
                `Fetched ${shaped.length} work order(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllWOsGlobal failed", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to retrieve global work orders",
                [error.message]
            )
        );
    }
};