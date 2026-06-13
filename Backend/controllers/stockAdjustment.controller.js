import mongoose from "mongoose";
import StockAdjustment from "../models/stockAdjustment.models.js";
import Inventory from "../models/inventory.models.js";
import Project from "../models/project.models.js";
import Company from "../models/company.models.js";
import Counter from "../models/counter.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import NotificationService from "../services/notification.service.js";
import { isValidObjectId, resolveCompany, resolveUserByKeycloak, enrichUser } from "../helpers/mrHelper.js";


const generateSANumber = async (companyId) => {
    const year = new Date().getFullYear();
    const key = `SA-${companyId.toString()}-${year}`;
    const counter = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return `SA-${year}-${String(counter.seq).padStart(4, "0")}`;
};

const enrichSAUsers = async (sa) => {
    const [createdBy, updatedBy, submittedBy, approvedBy, rejectedBy] = await Promise.all([
        enrichUser(sa.createdBy),
        enrichUser(sa.updatedBy),
        enrichUser(sa.submittedBy),
        enrichUser(sa.approvedBy),
        enrichUser(sa.rejectedBy),
    ]);
    return { ...sa, createdBy, updatedBy, submittedBy, approvedBy, rejectedBy };
};


// This function creates a new stock adjustment request in Draft state. takes x-company-id in headers, projectId in params and inventoryId, adjustmentType, quantity, reason, remarks, createdBy in body. Snapshots current stock at creation time. Stock does NOT change until approved. ----------------------- Ayan
export const createStockAdjustment = async (req, res) => {
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
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        const { inventoryId, adjustmentType, quantity, reason, remarks, createdBy } = req.body;
        const missing = [];
        if (!inventoryId?.trim()) missing.push("inventoryId");
        if (!adjustmentType?.trim()) missing.push("adjustmentType");
        if (quantity === undefined || quantity === null || quantity === "") missing.push("quantity");
        if (!reason?.trim()) missing.push("reason");
        if (!createdBy?.trim()) missing.push("createdBy");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`)
            );
        }
        if (!isValidObjectId(inventoryId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inventory ID", "inventoryId must be a valid MongoDB ObjectId")
            );
        }
        const validTypes = ["add", "subtract"];
        if (!validTypes.includes(adjustmentType)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid adjustmentType", `adjustmentType must be one of: ${validTypes.join(", ")}`)
            );
        }
        const validReasons = ["Damage", "Wastage", "Correction", "OpeningBalance", "Other"];
        if (!validReasons.includes(reason)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Reason", `reason must be one of: ${validReasons.join(", ")}`)
            );
        }
        const parsedQty = Number(quantity);
        if (isNaN(parsedQty) || parsedQty < 0.001) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Quantity", "quantity must be at least 0.001")
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        const invItem = await Inventory.findOne({
            _id: inventoryId,
            projectId,
            companyId,
            isDeleted: false,
        }).lean();
        if (!invItem) {
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", `No active inventory item found with ID: ${inventoryId} under project: ${projectId}`)
            );
        }
        if (adjustmentType === "subtract" && invItem.currentStock < parsedQty) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Insufficient Stock",
                    `Cannot subtract ${parsedQty} ${invItem.unit}. Current stock is only ${invItem.currentStock} ${invItem.unit}`
                )
            );
        }
        const saNumber = await generateSANumber(companyId);
        const sa = await StockAdjustment.create({
            companyId,
            projectId,
            inventoryId: invItem._id,
            materialMasterId: invItem.materialMasterId,
            materialName: invItem.name,
            unit: invItem.unit,
            saNumber,
            adjustmentType,
            quantity: parsedQty,
            stockBefore: invItem.currentStock,
            reason,
            remarks: remarks?.trim() || null,
            status: "Draft",
            createdBy: creatorUser._id,
        });
        logger.info("Stock adjustment created (Draft)", { saId: sa._id, saNumber, projectId, companyId });
        return res.status(201).json(
            new ApiResponse(
                201,
                { stockAdjustment: sa },
                "Stock Adjustment Created",
                `Adjustment ${saNumber} created as Draft. Submit for approval to apply the stock change.`
            )
        );
    } catch (error) {
        logger.error("createStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to create stock adjustment", [error.message])
        );
    }
};



// This function submits a stock adjustment for approval. takes x-company-id in headers, projectId and adjustmentId in params and updatedBy in body. Only Draft adjustments can be submitted. Re-validates stock sufficiency at submit time for subtract adjustments. ------------------ Ayan
export const submitStockAdjustment = async (req, res) => {
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
        const { projectId, adjustmentId } = req.params;
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        if (!isValidObjectId(adjustmentId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Adjustment ID", "Valid adjustmentId is required"));
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const actionUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const sa = await StockAdjustment.findOne({
            _id: adjustmentId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!sa) {
            return res.status(404).json(
                new ApiErrors(404, "Adjustment Not Found", "No stock adjustment found with the given ID")
            );
        }
        if (sa.status !== "Draft") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot submit an adjustment in '${sa.status}' status. Only Draft adjustments can be submitted`)
            );
        }
        if (sa.adjustmentType === "subtract") {
            const invItem = await Inventory.findOne({
                _id: sa.inventoryId,
                isDeleted: false,
            }).select("currentStock").lean();
            if (!invItem || invItem.currentStock < sa.quantity) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Insufficient Stock",
                        `Current stock (${invItem?.currentStock ?? 0} ${sa.unit}) is less than the requested adjustment quantity (${sa.quantity} ${sa.unit})`
                    )
                );
            }
            sa.stockBefore = invItem.currentStock;
        }
        sa.status = "Submitted";
        sa.submittedAt = new Date();
        sa.submittedBy = actionUser._id;
        sa.updatedBy = actionUser._id;
        await sa.save();
        logger.info("Stock adjustment submitted", { saId: sa._id, saNumber: sa.saNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { stockAdjustment: sa }, "Adjustment Submitted", `Stock adjustment ${sa.saNumber} submitted for approval`)
        );
    } catch (error) {
        logger.error("submitStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to submit stock adjustment", [error.message])
        );
    }
};



// This function approves a stock adjustment. takes x-company-id in headers, projectId and adjustmentId in params and actionBy in body. Self-approval is blocked. Stock is actually changed here via $inc on Inventory. stockAfter is recorded. Only Submitted adjustments can be approved. ---------------- Ayan
export const approveStockAdjustment = async (req, res) => {
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
        const { projectId, adjustmentId } = req.params;
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        if (!isValidObjectId(adjustmentId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Adjustment ID", "Valid adjustmentId is required"));
        }
        const { actionBy } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const sa = await StockAdjustment.findOne({
            _id: adjustmentId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!sa) {
            return res.status(404).json(
                new ApiErrors(404, "Adjustment Not Found", "No stock adjustment found with the given ID")
            );
        }
        if (sa.status !== "Submitted") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot approve an adjustment in '${sa.status}' status. Only Submitted adjustments can be approved`)
            );
        }
        if (sa.createdBy.toString() === actionUser._id.toString()) {
            return res.status(403).json(
                new ApiErrors(403, "Self-Approval Not Allowed", "You cannot approve a stock adjustment that you created")
            );
        }
        const invItem = await Inventory.findOne({
            _id: sa.inventoryId,
            isDeleted: false,
        }).select("currentStock unit").lean();
        if (!invItem) {
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", "The linked inventory item no longer exists")
            );
        }
        if (sa.adjustmentType === "subtract" && invItem.currentStock < sa.quantity) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Insufficient Stock",
                    `Cannot approve: current stock (${invItem.currentStock} ${sa.unit}) is less than the adjustment quantity (${sa.quantity} ${sa.unit}). Please reject this adjustment.`
                )
            );
        }
        const stockDelta = sa.adjustmentType === "add" ? sa.quantity : -sa.quantity;
        const updatedInventory = await Inventory.findByIdAndUpdate(
            sa.inventoryId,
            {
                $inc: { currentStock: stockDelta },
                $set: {
                    updatedBy: actionUser._id,
                    ...(sa.adjustmentType === "add" ? { lastRestockedAt: new Date() } : {}),
                },
            },
            { new: true }
        ).lean();
        sa.status = "Approved";
        sa.approvedAt = new Date();
        sa.approvedBy = actionUser._id;
        sa.stockAfter = updatedInventory.currentStock;
        sa.updatedBy = actionUser._id;
        await sa.save();
        const projectForNotif = await Project.findById(sa.projectId).select("projectName").lean();
        if (sa.adjustmentType === "add") {
            NotificationService.notifyInventoryAdded({
                companyId,
                projectId: sa.projectId,
                projectName: projectForNotif?.projectName || "",
                materialName: sa.materialName,
                triggeredBy: actionUser._id,
                inventoryId: sa.inventoryId,
            }).catch(err => logger.error("notifyInventoryAdded (stockAdjustment approve) failed (non-fatal)", { error: err.message }));
        }
        if (updatedInventory.currentStock <= updatedInventory.minimumLevel && updatedInventory.minimumLevel > 0) {
            NotificationService.notifyLowStock({
                companyId,
                projectId: sa.projectId,
                projectName: projectForNotif?.projectName || "",
                item: updatedInventory,
            }).catch(err => logger.error("notifyLowStock (stockAdjustment approve) failed (non-fatal)", { error: err.message }));
        }
        logger.info("Stock adjustment approved - stock updated", {
            saId: sa._id,
            saNumber: sa.saNumber,
            adjustmentType: sa.adjustmentType,
            quantity: sa.quantity,
            stockBefore: sa.stockBefore,
            stockAfter: sa.stockAfter,
            projectId,
            companyId,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    stockAdjustment: sa,
                    inventoryUpdated: {
                        inventoryId: sa.inventoryId,
                        materialName: sa.materialName,
                        previousStock: sa.stockBefore,
                        newStock: sa.stockAfter,
                    },
                },
                "Adjustment Approved",
                `Stock adjustment ${sa.saNumber} approved. "${sa.materialName}" stock updated from ${sa.stockBefore} to ${sa.stockAfter} ${sa.unit}`
            )
        );
    } catch (error) {
        logger.error("approveStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to approve stock adjustment", [error.message])
        );
    }
};



// This function rejects a stock adjustment. takes x-company-id in headers, projectId and adjustmentId in params and actionBy with optional rejectionRemarks in body. Stock is NOT changed. -------------------- Ayan
export const rejectStockAdjustment = async (req, res) => {
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
        const { projectId, adjustmentId } = req.params;
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        if (!isValidObjectId(adjustmentId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Adjustment ID", "Valid adjustmentId is required"));
        }
        const { actionBy, rejectionRemarks } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const sa = await StockAdjustment.findOne({
            _id: adjustmentId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!sa) {
            return res.status(404).json(
                new ApiErrors(404, "Adjustment Not Found", "No stock adjustment found with the given ID")
            );
        }
        if (sa.status !== "Submitted") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot reject an adjustment in '${sa.status}' status. Only Submitted adjustments can be rejected`)
            );
        }
        sa.status = "Rejected";
        sa.rejectedAt = new Date();
        sa.rejectedBy = actionUser._id;
        sa.rejectionRemarks = rejectionRemarks?.trim() || null;
        sa.updatedBy = actionUser._id;
        await sa.save();
        logger.info("Stock adjustment rejected", { saId: sa._id, saNumber: sa.saNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { stockAdjustment: sa }, "Adjustment Rejected", `Stock adjustment ${sa.saNumber} has been rejected`)
        );
    } catch (error) {
        logger.error("rejectStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to reject stock adjustment", [error.message])
        );
    }
};



// This function edits a stock adjustment. takes x-company-id in headers, projectId and adjustmentId in params. Only Draft or Rejected adjustments can be edited. Rejected → resets to Draft. Re-validates stock if adjustmentType or quantity changes. ------------------ Ayan
export const editStockAdjustment = async (req, res) => {
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
        const { projectId, adjustmentId } = req.params;
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        if (!isValidObjectId(adjustmentId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Adjustment ID", "Valid adjustmentId is required"));
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const sa = await StockAdjustment.findOne({
            _id: adjustmentId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!sa) {
            return res.status(404).json(
                new ApiErrors(404, "Adjustment Not Found", "No stock adjustment found with the given ID")
            );
        }
        if (!["Draft", "Rejected"].includes(sa.status)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot edit an adjustment in '${sa.status}' status. Only Draft or Rejected adjustments can be edited`)
            );
        }
        const EDITABLE = ["adjustmentType", "quantity", "reason", "remarks"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field to update")
            );
        }
        const updates = { updatedBy: editorUser._id };
        const validTypes = ["add", "subtract"];
        const validReasons = ["Damage", "Wastage", "Correction", "OpeningBalance", "Other"];
        if (req.body.adjustmentType !== undefined) {
            if (!validTypes.includes(req.body.adjustmentType)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid adjustmentType", `Must be one of: ${validTypes.join(", ")}`)
                );
            }
            updates.adjustmentType = req.body.adjustmentType;
        }
        if (req.body.quantity !== undefined) {
            const parsedQty = Number(req.body.quantity);
            if (isNaN(parsedQty) || parsedQty < 0.001) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Quantity", "quantity must be at least 0.001")
                );
            }
            updates.quantity = parsedQty;
        }
        if (req.body.reason !== undefined) {
            if (!validReasons.includes(req.body.reason)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Reason", `Must be one of: ${validReasons.join(", ")}`)
                );
            }
            updates.reason = req.body.reason;
        }
        if (req.body.remarks !== undefined) {
            updates.remarks = req.body.remarks?.trim() || null;
        }
        const effectiveType = updates.adjustmentType ?? sa.adjustmentType;
        const effectiveQty = updates.quantity ?? sa.quantity;
        if (effectiveType === "subtract") {
            const invItem = await Inventory.findOne({ _id: sa.inventoryId, isDeleted: false })
                .select("currentStock")
                .lean();
            if (!invItem || invItem.currentStock < effectiveQty) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Insufficient Stock",
                        `Current stock (${invItem?.currentStock ?? 0} ${sa.unit}) is less than the adjustment quantity (${effectiveQty} ${sa.unit})`
                    )
                );
            }
            updates.stockBefore = invItem.currentStock;
        }
        if (sa.status === "Rejected") {
            updates.status = "Draft";
            updates.rejectedBy = null;
            updates.rejectedAt = null;
            updates.rejectionRemarks = null;
        }
        const updated = await StockAdjustment.findByIdAndUpdate(
            adjustmentId,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        logger.info("Stock adjustment edited", { saId: sa._id, saNumber: sa.saNumber, updatedFields: Object.keys(updates) });
        return res.status(200).json(
            new ApiResponse(200, { stockAdjustment: updated }, "Adjustment Updated", `Stock adjustment ${sa.saNumber} updated successfully`)
        );
    } catch (error) {
        logger.error("editStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to edit stock adjustment", [error.message])
        );
    }
};




// This function returns all stock adjustments for a project. takes x-company-id in headers and projectId in params. supports pagination, filtering (status, inventoryId), sorting and enriched user data. ------------------------ Ayan
export const getAllStockAdjustments = async (req, res) => {
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
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        const {
            page = 1,
            limit = 10,
            status,
            inventoryId,
            adjustmentType,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Draft", "Submitted", "Approved", "Rejected"];
        const allowedSortFields = ["createdAt", "saNumber", "quantity", "status"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, projectId, isDeleted: false };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (adjustmentType && ["add", "subtract"].includes(adjustmentType)) filter.adjustmentType = adjustmentType;
        if (inventoryId && isValidObjectId(inventoryId)) {
            filter.inventoryId = new mongoose.Types.ObjectId(inventoryId);
        }
        const [adjustments, total] = await Promise.all([
            StockAdjustment.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            StockAdjustment.countDocuments(filter),
        ]);
        const enriched = await Promise.all(adjustments.map(enrichSAUsers));
        logger.info("Stock adjustments fetched", { total, page: pageNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    adjustments: enriched,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Adjustments Retrieved" : "No Adjustments Found",
                `Fetched ${adjustments.length} stock adjustment(s)`
            )
        );
    } catch (error) {
        logger.error("getAllStockAdjustments failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve stock adjustments", [error.message])
        );
    }
};



// This function fetches a single stock adjustment by ID with enriched user data. ------------------- Ayan
export const getSingleStockAdjustment = async (req, res) => {
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
        const { projectId, adjustmentId } = req.params;
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        if (!isValidObjectId(adjustmentId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Adjustment ID", "Valid adjustmentId is required"));
        }
        const sa = await StockAdjustment.findOne({
            _id: adjustmentId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!sa) {
            return res.status(404).json(
                new ApiErrors(404, "Adjustment Not Found", "No stock adjustment found with the given ID")
            );
        }
        const enriched = await enrichSAUsers(sa);
        logger.info("Stock adjustment fetched", { adjustmentId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { stockAdjustment: enriched }, "Adjustment Retrieved", "Stock adjustment fetched successfully")
        );
    } catch (error) {
        logger.error("getSingleStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve stock adjustment", [error.message])
        );
    }
};




// This function soft deletes a stock adjustment. Only Draft or Rejected adjustments can be deleted. --------------------- Ayan
export const deleteStockAdjustment = async (req, res) => {
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
        const { projectId, adjustmentId } = req.params;
        if (!isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        }
        if (!isValidObjectId(adjustmentId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Adjustment ID", "Valid adjustmentId is required"));
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
        const sa = await StockAdjustment.findOne({
            _id: adjustmentId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!sa) {
            return res.status(404).json(
                new ApiErrors(404, "Adjustment Not Found", "No stock adjustment found with the given ID")
            );
        }
        if (!["Draft", "Rejected"].includes(sa.status)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot delete an adjustment in '${sa.status}' status. Only Draft or Rejected adjustments can be deleted`)
            );
        }
        sa.isDeleted = true;
        sa.deletedAt = new Date();
        sa.updatedBy = deleterUser._id;
        await sa.save();
        logger.info("Stock adjustment soft-deleted", { saId: sa._id, saNumber: sa.saNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, null, "Adjustment Deleted", `Stock adjustment ${sa.saNumber} deleted successfully`)
        );
    } catch (error) {
        logger.error("deleteStockAdjustment failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to delete stock adjustment", [error.message])
        );
    }
};