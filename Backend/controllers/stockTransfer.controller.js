import mongoose from "mongoose";
import StockTransfer from "../models/stockTransfer.models.js";
import Inventory from "../models/inventory.models.js";
import Project from "../models/project.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import StockMovement from "../models/stockMovement.models.js";
import logger from "../utils/logger.utils.js";
import { isValidObjectId, resolveCompany, resolveUserByKeycloak, processTransferItems, createStockMovements, syncMovementStatus, softDeleteMovements } from "../helpers/stockTransferHelper.js";
import { createExpenseEntry, calcTransferExpenseAmount, recalcProjectHealth } from "../helpers/expenseHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import { enrichUser } from "../helpers/mrHelper.js";
import NotificationService from "../services/notification.service.js";


// This function creates a new stock transfer. takes x-company-id in headers, fromProjectId in params and toProjectId, items, reason, remarks, createdBy in body. validates projects, user and inventory items, and creates transfer in Draft state. -------------------------- Ayan
export const createTransfer = async (req, res) => {
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
        const { fromProjectId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params")
            );
        }
        const { toProjectId, items, reason, remarks, createdBy } = req.body;
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!toProjectId?.trim()) missing.push("toProjectId");
        if (!Array.isArray(items) || items.length === 0) missing.push("items (must be a non-empty array)");
        if (missing.length > 0) {
            return res.status(400).json(new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`));
        }
        if (!isValidObjectId(toProjectId.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid toProjectId", "toProjectId must be a valid MongoDB ObjectId")
            );
        }
        if (fromProjectId.trim() === toProjectId.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Transfer", "fromProjectId and toProjectId must be different projects")
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        const [fromProject, toProject] = await Promise.all([
            Project.findOne({ _id: fromProjectId, companyId, isDeleted: false }).lean(),
            Project.findOne({ _id: toProjectId.trim(), companyId, isDeleted: false }).lean(),
        ]);
        if (!fromProject) {
            return res.status(404).json(
                new ApiErrors(404, "Source Project Not Found", `No active project found with ID: ${fromProjectId}`)
            );
        }
        if (!toProject) {
            return res.status(404).json(
                new ApiErrors(404, "Destination Project Not Found", `No active project found with ID: ${toProjectId}`)
            );
        }
        const { processedItems, error } = await processTransferItems(items, fromProjectId, companyId);
        if (error) return res.status(error.statusCode).json(error);
        const transfer = await StockTransfer.create({
            companyId,
            fromProjectId: new mongoose.Types.ObjectId(fromProjectId),
            toProjectId: new mongoose.Types.ObjectId(toProjectId.trim()),
            items: processedItems,
            reason: reason?.trim() || null,
            remarks: remarks?.trim() || null,
            status: "Draft",
            createdBy: creatorUser._id,
        });
        await createStockMovements(transfer, companyId);
        await pushDprEvent({
            companyId,
            projectId: transfer.fromProjectId,
            actorId: creatorUser._id,
            module: "StockTransfer",
            action: "StockOutgoing",
            refId: transfer._id,
            refNumber: transfer.transferNumber || transfer._id.toString(),
            details: {
                transferType: "Outgoing",
                fromProjectId: transfer.fromProjectId,
                toProjectId: transfer.toProjectId,
                fromProjectName: fromProject.projectName,
                counterpartProjectName: toProject.projectName,
                itemCount: transfer.items.length,
                status: transfer.status,
                materials: transfer.items.map((item) => ({
                    materialName: item.materialName,
                    quantity: item.quantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });
        NotificationService.notifyStockTransferCreated({
            companyId,
            projectId: transfer.fromProjectId,
            projectName: fromProject.projectName,
            transferNumber: transfer.transferNumber || transfer._id.toString(),
            transferId: transfer._id,
        }).catch(err => logger.error("notifyStockTransferCreated failed (non-fatal)", { error: err.message }));
        logger.info("Stock Transfer created", { transferId: transfer._id, fromProjectId, toProjectId, companyId });
        return res.status(201).json(
            new ApiResponse(201, { transfer }, "Stock Transfer Created", "Stock Transfer created as Draft")
        );
    } catch (error) {
        logger.error("createTransfer failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to create Stock Transfer", [error.message])
        );
    }
};


// This function approves a stock transfer. takes x-company-id in headers, fromProjectId and transferId in params and actionBy in body. validates stock availability, moves stock between inventories using transaction and updates status to Approved. -------------------------- Ayan
export const approveTransfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const { fromProjectId, transferId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params")
            );
        }
        if (!transferId || !isValidObjectId(transferId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Transfer ID", "Valid transferId is required in params")
            );
        }
        const { actionBy } = req.body;
        if (!actionBy?.trim()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const transfer = await StockTransfer.findOne({
            _id: transferId,
            fromProjectId,
            companyId,
            isDeleted: false,
        }).session(session);
        if (!transfer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Transfer Not Found", "No Stock Transfer found with the given ID")
            );
        }
        if (transfer.status !== "Draft") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot approve a Transfer in '${transfer.status}' status. Only Draft transfers can be approved`)
            );
        }
        if (transfer.createdBy.toString() === actionUser._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json(
                new ApiErrors(403, "Self-Approval Not Allowed", "You cannot approve a Stock Transfer that you created")
            );
        }
        for (const item of transfer.items) {
            const srcInv = await Inventory.findOne({
                _id: item.inventoryId,
                projectId: new mongoose.Types.ObjectId(fromProjectId),
                companyId,
                isDeleted: false,
            })
                .lean()
                .session(session);
            if (!srcInv) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json(
                    new ApiErrors(404, "Source Inventory Not Found", `Inventory item "${item.materialName}" no longer exists in the source project`)
                );
            }
            if (srcInv.currentStock < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json(
                    new ApiErrors(400, "Insufficient Stock", `Cannot transfer ${item.quantity} ${item.unit} of "${item.materialName}". Current source stock is only ${srcInv.currentStock} ${item.unit}`)
                );
            }
            await Inventory.findByIdAndUpdate(
                srcInv._id,
                { $inc: { currentStock: -item.quantity } },
                { session, runValidators: false }
            );
            const destInv = await Inventory.findOne({
                materialMasterId: item.materialMasterId,
                projectId: transfer.toProjectId,
                companyId,
                isDeleted: false,
            })
                .lean()
                .session(session);
            if (destInv) {
                await Inventory.findByIdAndUpdate(
                    destInv._id,
                    {
                        $inc: { currentStock: item.quantity, totalReceived: item.quantity },
                        $set: { lastRestockedAt: new Date() },
                    },
                    { session, runValidators: false }
                );
            } else {
                const srcInv = await Inventory.findOne(
                    {
                        _id: item.inventoryId,
                        companyId,
                        isDeleted: false,
                    },
                    null,
                    { session }
                ).lean();
                await Inventory.create(
                    [
                        {
                            companyId,
                            projectId: transfer.toProjectId,
                            materialMasterId: item.materialMasterId,
                            name: item.materialName,
                            unit: item.unit,
                            category: srcInv?.category || null,
                            currentStock: item.quantity,
                            minimumLevel: 0,
                            pricePerUnit: srcInv?.pricePerUnit || 0,
                            supplierName: srcInv?.supplierName || null,
                            totalReceived: item.quantity,
                            lastRestockedAt: new Date(),
                            createdBy: actionUser._id,
                        },
                    ],
                    { session }
                );
                logger.info("Auto-allocated material to destination project via stock transfer", {
                    materialMasterId: item.materialMasterId,
                    materialName: item.materialName,
                    toProjectId: transfer.toProjectId,
                    quantity: item.quantity,
                });
            }
        }
        transfer.status = "Approved";
        transfer.approvedBy = actionUser._id;
        transfer.approvedAt = new Date();
        transfer.updatedBy = actionUser._id;
        await transfer.save({ session });
        await StockMovement.updateMany(
            { transferId: transfer._id, isDeleted: false },
            { $set: { status: "Approved" } },
            { session }
        );
        const transferExpenseAmount = await calcTransferExpenseAmount(
            transfer.items,
            fromProjectId,
            companyId,
            session
        );

        if (transferExpenseAmount > 0) {
            const itemSnapshots = await Promise.all(
                transfer.items.map(async (item) => {
                    const inv = await Inventory.findOne(
                        { _id: item.inventoryId, companyId, isDeleted: false },
                        { pricePerUnit: 1 },
                        { session }
                    ).lean();
                    return { materialName: item.materialName, qty: item.quantity, price: inv?.pricePerUnit ?? 0 };
                })
            );
            await createExpenseEntry({
                companyId,
                projectId: new mongoose.Types.ObjectId(fromProjectId),
                type: "Transfer_Debit",
                category: "Transfer",
                status: "Actual",
                amount: transferExpenseAmount,
                description: `Stock transferred to project ${transfer.toProjectId} — ${transfer.items.length} material(s). Prices snapshotted at transfer approval.`,
                expenseDate: new Date(),
                sourceModel: "StockTransfer",
                sourceId: transfer._id,
                sourceNumber: null,
                createdBy: actionUser._id,
                priceSnapshot: transferExpenseAmount,
            }, session);
        }
        await session.commitTransaction();
        const [fromProjectForDPR, toProjectForDPR] = await Promise.all([
            Project.findById(transfer.fromProjectId).select("projectName").lean(),
            Project.findById(transfer.toProjectId).select("projectName").lean(),
        ]);

        await pushDprEvent({
            companyId,
            projectId: transfer.fromProjectId,
            actorId: actionUser._id,
            module: "StockTransfer",
            action: "StockTransferApproved",
            refId: transfer._id,
            refNumber: transfer.transferNumber || transfer._id.toString(),
            details: {
                transferType: "Outgoing",
                fromProjectId: transfer.fromProjectId,
                toProjectId: transfer.toProjectId,
                fromProjectName: fromProjectForDPR?.projectName,
                counterpartProjectName: toProjectForDPR?.projectName,
                approvedBy: actionUser._id,
                itemCount: transfer.items.length,
                materials: transfer.items.map((item) => ({
                    materialName: item.materialName,
                    quantity: item.quantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });

        await pushDprEvent({
            companyId,
            projectId: transfer.toProjectId,
            actorId: actionUser._id,
            module: "StockTransfer",
            action: "StockIncoming",
            refId: transfer._id,
            refNumber: transfer.transferNumber || transfer._id.toString(),
            details: {
                transferType: "Incoming",
                fromProjectId: transfer.fromProjectId,
                toProjectId: transfer.toProjectId,
                fromProjectName: fromProjectForDPR?.projectName,
                counterpartProjectName: fromProjectForDPR?.projectName,
                toProjectName: toProjectForDPR?.projectName,
                approvedBy: actionUser._id,
                itemCount: transfer.items.length,
                materials: transfer.items.map((item) => ({
                    materialName: item.materialName,
                    quantity: item.quantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });
        recalcProjectHealth(fromProjectId, companyId).catch(() => { });
        logger.info("Stock Transfer approved and stock moved", {
            transferId: transfer._id,
            fromProjectId,
            toProjectId: transfer.toProjectId,
            companyId,
            approvedBy: actionUser._id,
        });
        return res.status(200).json(
            new ApiResponse(200, { transfer }, "Transfer Approved", "Stock Transfer approved and stock moved successfully")
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("approveTransfer failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to approve Stock Transfer", [error.message])
        );
    }
};


// This function rejects a stock transfer. takes x-company-id in headers, fromProjectId and transferId in params and actionBy with rejectionRemarks in body. validates state and updates status to Rejected with remarks. -------------------------- Ayan
export const rejectTransfer = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { fromProjectId, transferId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params")
            );
        }
        if (!transferId || !isValidObjectId(transferId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Transfer ID", "Valid transferId is required in params")
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
        const transfer = await StockTransfer.findOne({
            _id: transferId,
            fromProjectId,
            companyId,
            isDeleted: false,
        });
        if (!transfer) {
            return res.status(404).json(
                new ApiErrors(404, "Transfer Not Found", "No Stock Transfer found with the given ID")
            );
        }
        if (transfer.status !== "Draft") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot reject a Transfer in '${transfer.status}' status. Only Draft transfers can be rejected`)
            );
        }
        transfer.status = "Rejected";
        transfer.rejectedBy = actionUser._id;
        transfer.rejectedAt = new Date();
        transfer.rejectionRemarks = rejectionRemarks?.trim() || null;
        transfer.updatedBy = actionUser._id;
        await transfer.save();
        const [fromProjectForDPR, toProjectForDPR] = await Promise.all([
            Project.findById(transfer.fromProjectId).select("projectName").lean(),
            Project.findById(transfer.toProjectId).select("projectName").lean(),
        ]);

        await pushDprEvent({
            companyId,
            projectId: transfer.fromProjectId,
            actorId: actionUser._id,
            module: "StockTransfer",
            action: "StockTransferRejected",
            refId: transfer._id,
            refNumber: transfer.transferNumber || transfer._id.toString(),
            details: {
                fromProjectId: transfer.fromProjectId,
                toProjectId: transfer.toProjectId,
                fromProjectName: fromProjectForDPR?.projectName,
                counterpartProjectName: toProjectForDPR?.projectName,
                rejectionRemarks: transfer.rejectionRemarks || null,
                itemCount: transfer.items.length,
                materials: transfer.items.map((item) => ({
                    materialName: item.materialName,
                    quantity: item.quantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });
        logger.info("Stock Transfer rejected", {
            transferId: transfer._id,
            fromProjectId,
            companyId,
            rejectedBy: actionUser._id,
        });
        return res.status(200).json(
            new ApiResponse(200, { transfer }, "Transfer Rejected", "Stock Transfer has been rejected")
        );
    } catch (error) {
        logger.error("rejectTransfer failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to reject Stock Transfer", [error.message])
        );
    }
};


// This function updates a stock transfer. takes x-company-id in headers, fromProjectId and transferId in params and editable fields like toProjectId, items, reason, remarks and updatedBy in body. allows update only in Draft or Rejected state and resets rejected transfers to Draft. -------------------------- Ayan
export const editTransfer = async (req, res) => {
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
        const { fromProjectId, transferId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params"));
        }
        if (!transferId || !isValidObjectId(transferId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Transfer ID", "Valid transferId is required in params"));
        }
        const { updatedBy, toProjectId, items, reason, remarks } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body"));
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`));
        }
        const transfer = await StockTransfer.findOne({
            _id: transferId,
            fromProjectId,
            companyId,
            isDeleted: false,
        });
        if (!transfer) {
            return res.status(404).json(new ApiErrors(404, "Transfer Not Found", "No Stock Transfer found with the given ID"));
        }
        if (!["Draft", "Rejected"].includes(transfer.status)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", `Cannot edit a Transfer in '${transfer.status}' status. Only Draft or Rejected transfers can be edited`)
            );
        }
        const EDITABLE = ["toProjectId", "items", "reason", "remarks"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field to update")
            );
        }
        const updates = { updatedBy: editorUser._id };
        if (toProjectId !== undefined) {
            if (!toProjectId?.trim() || !isValidObjectId(toProjectId.trim())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid toProjectId", "toProjectId must be a valid MongoDB ObjectId")
                );
            }
            if (fromProjectId.trim() === toProjectId.trim()) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Transfer", "fromProjectId and toProjectId must be different projects")
                );
            }
            const toProject = await Project.findOne({
                _id: toProjectId.trim(),
                companyId,
                isDeleted: false,
            }).lean();
            if (!toProject) {
                return res.status(404).json(
                    new ApiErrors(404, "Destination Project Not Found", `No active project found with ID: ${toProjectId}`)
                );
            }
            updates.toProjectId = new mongoose.Types.ObjectId(toProjectId.trim());
        }
        if (items !== undefined) {
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "A Stock Transfer must contain at least one item")
                );
            }
            const existingItemsMap = (transfer.items || []).reduce((acc, it) => {
                acc[it.inventoryId.toString()] = it;
                return acc;
            }, {});
            const { processedItems, error } = await processTransferItems(
                items,
                fromProjectId,
                companyId,
                existingItemsMap
            );
            if (error) return res.status(error.statusCode).json(error);
            updates.items = processedItems;
        }
        if (reason !== undefined) updates.reason = reason?.trim() || null;
        if (remarks !== undefined) updates.remarks = remarks?.trim() || null;
        if (transfer.status === "Rejected") {
            updates.status = "Draft";
            updates.rejectedBy = null;
            updates.rejectedAt = null;
            updates.rejectionRemarks = null;
        }
        const updatedTransfer = await StockTransfer.findByIdAndUpdate(
            transferId,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted")
            .lean();
        if (items !== undefined || transfer.status === "Rejected") {
            await softDeleteMovements(transferId);
            await createStockMovements(updatedTransfer, companyId);
        }
        logger.info("Stock Transfer edited", {
            transferId,
            fromProjectId,
            companyId,
            updatedFields: Object.keys(updates),
            wasRejected: transfer.status === "Rejected",
        });
        return res.status(200).json(
            new ApiResponse(200, { transfer: updatedTransfer }, "Transfer Updated", "Stock Transfer updated successfully")
        );
    } catch (error) {
        logger.error("editTransfer failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to edit Stock Transfer", [error.message])
        );
    }
};


// This function soft deletes a stock transfer. takes x-company-id in headers, fromProjectId and transferId in params and optional deletedBy. prevents deletion of Approved transfers and marks transfer as deleted. -------------------------- Ayan
export const deleteTransfer = async (req, res) => {
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
        const { fromProjectId, transferId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params")
            );
        }
        if (!transferId || !isValidObjectId(transferId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Transfer ID", "Valid transferId is required in params")
            );
        }
        const deletedByKc =
            req.body?.deletedBy?.trim() || req.headers["x-user-id"]?.trim();
        const transfer = await StockTransfer.findOne({
            _id: transferId,
            fromProjectId,
            companyId,
            isDeleted: false,
        });
        if (!transfer) {
            return res.status(404).json(
                new ApiErrors(404, "Transfer Not Found", "No Stock Transfer found with the given ID")
            );
        }
        if (transfer.status === "Approved") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", "Cannot delete an Approved Stock Transfer. Approved transfers are immutable.")
            );
        }
        let deletedByObjectId = null;
        if (deletedByKc) {
            const deleterUser = await resolveUserByKeycloak(deletedByKc, companyId);
            if (deleterUser) deletedByObjectId = deleterUser._id;
        }
        transfer.isDeleted = true;
        transfer.deletedAt = new Date();
        if (deletedByObjectId) transfer.updatedBy = deletedByObjectId;
        await transfer.save();
        await softDeleteMovements(transfer._id);
        logger.info("Stock Transfer soft-deleted", { transferId: transfer._id, fromProjectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, null, "Transfer Deleted", "Stock Transfer deleted successfully")
        );
    } catch (error) {
        logger.error("deleteTransfer failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to delete Stock Transfer", [error.message])
        );
    }
};



// This function fetches a specific stock transfer by ID. takes x-company-id in headers, fromProjectId and transferId in params. returns complete transfer details with user and project information. -------------------------- Ayan
export const getTransferById = async (req, res) => {
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
        const { fromProjectId, transferId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params")
            );
        }
        if (!transferId || !isValidObjectId(transferId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Transfer ID", "Valid transferId is required in params")
            );
        }
        const transfer = await StockTransfer.findOne({
            _id: transferId,
            fromProjectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .populate("createdBy", "name email")
            .populate("approvedBy", "name email")
            .populate("rejectedBy", "name email")
            .populate("updatedBy", "name email")
            .populate("fromProjectId", "projectName projectCode")
            .populate("toProjectId", "projectName projectCode")
            .lean();

        if (!transfer) {
            return res.status(404).json(
                new ApiErrors(404, "Transfer Not Found", "No Stock Transfer found with the given ID")
            );
        }
        logger.info("Stock Transfer fetched", { transferId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { transfer }, "Stock Transfer Retrieved", "Stock Transfer fetched successfully")
        );
    } catch (error) {
        logger.error("getTransferById failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch Stock Transfer", [error.message])
        );
    }
};


// This function returns stock transfers for a project. takes x-company-id in headers and fromProjectId in params. supports pagination, search (materialName), filtering (status) and sorting. -------------------------- Ayan
export const getTransfersByProject = async (req, res) => {
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

        const { fromProjectId } = req.params;
        if (!fromProjectId || !isValidObjectId(fromProjectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid fromProjectId is required in params")
            );
        }
        const project = await Project.findOne({
            _id: fromProjectId,
            companyId,
            isDeleted: false,
        })
            .select("_id")
            .lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found with the given ID")
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(parseInt(page), 1);
        const pageSize = Math.min(Math.max(parseInt(limit), 1), 100);
        const validStatuses = ["Draft", "Approved", "Rejected"];
        const allowedSortFields = ["createdAt", "status", "updatedAt"];

        const filter = {
            fromProjectId: new mongoose.Types.ObjectId(fromProjectId),
            companyId,
            isDeleted: false,
        };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (search?.trim()) {
            filter["items.materialName"] = { $regex: search.trim(), $options: "i" };
        }
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const [transfers, total] = await Promise.all([
            StockTransfer.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .populate("createdBy", "name email")
                .populate("approvedBy", "name email")
                .populate("rejectedBy", "name email")
                .populate("toProjectId", "projectName projectCode")
                .populate("fromProjectId", "projectName projectCode")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            StockTransfer.countDocuments(filter),
        ]);
        logger.info("Project Stock Transfers fetched", { total, page: pageNumber, fromProjectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    transfers,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Stock Transfers fetched successfully" : "No Stock Transfers found",
                `Fetched ${transfers.length} stock transfer(s)`
            )
        );
    } catch (error) {
        logger.error("getTransfersByProject failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch Stock Transfers", [error.message])
        );
    }
};


// This function returns all stock transfers company-wide. takes x-company-id in headers. supports pagination, search, filtering (status, fromProjectId, toProjectId) and sorting. -------------------------- Ayan
export const getAllTransfers = async (req, res) => {
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
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            fromProjectId: filterFromProject,
            toProjectId: filterToProject,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(parseInt(page), 1);
        const pageSize = Math.min(Math.max(parseInt(limit), 1), 100);
        const validStatuses = ["Draft", "Approved", "Rejected"];
        const allowedSortFields = ["createdAt", "status", "updatedAt"];
        const filter = { companyId, isDeleted: false };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (filterFromProject && isValidObjectId(filterFromProject)) {
            filter.fromProjectId = new mongoose.Types.ObjectId(filterFromProject);
        }
        if (filterToProject && isValidObjectId(filterToProject)) {
            filter.toProjectId = new mongoose.Types.ObjectId(filterToProject);
        }
        if (search?.trim()) {
            filter["items.materialName"] = { $regex: search.trim(), $options: "i" };
        }
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const [transfers, total] = await Promise.all([
            StockTransfer.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .populate("createdBy", "name email avatar")
                .populate("approvedBy", "name email avatar")
                .populate("rejectedBy", "name email avatar")
                .populate("updatedBy", "name email avatar")
                .populate("fromProjectId", "projectName projectCode")
                .populate("toProjectId", "projectName projectCode")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            StockTransfer.countDocuments(filter),
        ]);
        logger.info("All Stock Transfers fetched", { total, page: pageNumber, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    transfers,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Stock Transfers fetched successfully" : "No Stock Transfers found",
                `Fetched ${transfers.length} stock transfer(s)`
            )
        );
    } catch (error) {
        logger.error("getAllTransfers failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve Stock Transfers", [error.message])
        );
    }
};



// This function returns all stock movement records for a company. takes x-company-id in headers. supports pagination, search (materialName), filtering (status, movementType, projectId) and sorting (createdAt, updatedAt, status, movementType) with populated project, user and transfer details. -------------------------- Ayan
export const getAllStockMovements = async (req, res) => {
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
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            movementType,
            projectId: filterProjectId,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(parseInt(page), 1);
        const pageSize = Math.min(Math.max(parseInt(limit), 1), 100);
        const validStatuses = ["Draft", "Approved", "Rejected"];
        const validMovementTypes = ["Incoming", "Outgoing"];
        const allowedSortFields = ["createdAt", "status", "updatedAt", "movementType"];
        const filter = { companyId, isDeleted: false };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (movementType && validMovementTypes.includes(movementType)) filter.movementType = movementType;
        if (filterProjectId && isValidObjectId(filterProjectId)) {
            filter.projectId = new mongoose.Types.ObjectId(filterProjectId);
        }
        if (search?.trim()) {
            filter.materialName = { $regex: search.trim(), $options: "i" };
        }
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const [rawMovements, total] = await Promise.all([
            StockMovement.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .populate("projectId", "projectName projectCode")
                .populate("counterpartProjectId", "projectName projectCode")
                .populate("createdBy", "name email avatar")
                .populate("transferId", "status reason remarks")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            StockMovement.countDocuments(filter),
        ]);
        const movements = rawMovements.map((item) => {
            const isOutgoing = item.movementType === "Outgoing";
            const fromProject = isOutgoing
                ? item.projectId
                : item.counterpartProjectId;

            const toProject = isOutgoing
                ? item.counterpartProjectId
                : item.projectId;
            return {
                ...item,
                fromProject: fromProject
                    ? {
                        _id: fromProject._id,
                        projectName: fromProject.projectName,
                        projectCode: fromProject.projectCode,
                    }
                    : null,
                toProject: toProject
                    ? {
                        _id: toProject._id,
                        projectName: toProject.projectName,
                        projectCode: toProject.projectCode,
                    }
                    : null,
            };
        });
        logger.info("All Stock Movements fetched", { total, page: pageNumber, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    movements,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Stock Movements fetched successfully" : "No Stock Movements found",
                `Fetched ${movements.length} stock movement(s)`
            )
        );
    } catch (error) {
        logger.error("getAllStockMovements failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch Stock Movements", [error.message])
        );
    }
};



// This function returns global stock transfer summary analytics across all projects. takes x-company-id in headers. computes transfer status counts, total materials moved, item line count, active projects, stale draft transfers, unique materials transferred and average approval time KPIs. -------------------------- Ayan
export const getGlobalTransferSummary = async (req, res) => {
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
        const baseFilter = {
            companyId,
            isDeleted: false,
            $or: [
                { fromProjectId: { $in: activeProjectIds } },
                { toProjectId: { $in: activeProjectIds } },
            ],
        }; const staleCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const [agg] = await StockTransfer.aggregate([
            { $match: baseFilter },
            {
                $facet: {
                    statusCounts: [
                        { $group: { _id: "$status", count: { $sum: 1 } } },
                    ],
                    totalMaterialsMoved: [
                        { $match: { status: "Approved" } },
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$items.quantity" },
                            },
                        },
                    ],
                    totalItemLines: [
                        {
                            $project: {
                                itemCount: { $size: { $ifNull: ["$items", []] } },
                            },
                        },
                        { $group: { _id: null, total: { $sum: "$itemCount" } } },
                    ],
                    activeProjects: [
                        { $group: { _id: "$fromProjectId" } },
                        { $count: "count" },
                    ],
                    staleDrafts: [
                        {
                            $match: {
                                status: "Draft",
                                createdAt: { $lt: staleCutoff },
                            },
                        },
                        { $count: "count" },
                    ],
                    uniqueMaterials: [
                        { $match: { status: "Approved" } },
                        { $unwind: "$items" },
                        { $group: { _id: "$items.materialMasterId" } },
                        { $count: "count" },
                    ],
                    avgApprovalTime: [
                        {
                            $match: {
                                status: "Approved",
                                approvedAt: { $ne: null },
                            },
                        },
                        {
                            $project: {
                                diffMs: { $subtract: ["$approvedAt", "$createdAt"] },
                            },
                        },
                        { $group: { _id: null, avgMs: { $avg: "$diffMs" } } },
                    ],
                },
            },
        ]);
        const statusMap = {};
        (agg?.statusCounts || []).forEach(({ _id, count }) => {
            statusMap[_id] = count;
        });
        const totalTransfers =
            (statusMap["Draft"] || 0) +
            (statusMap["Approved"] || 0) +
            (statusMap["Rejected"] || 0);
        const draftTransfers = statusMap["Draft"] || 0;
        const approvedTransfers = statusMap["Approved"] || 0;
        const rejectedTransfers = statusMap["Rejected"] || 0;
        const totalMaterialsMoved =
            Math.round((agg?.totalMaterialsMoved?.[0]?.total ?? 0) * 1000) / 1000;
        const totalItemLines = agg?.totalItemLines?.[0]?.total ?? 0;
        const activeProjects = agg?.activeProjects?.[0]?.count ?? 0;
        const staleDraftTransfers = agg?.staleDrafts?.[0]?.count ?? 0;
        const uniqueMaterialsTransferred = agg?.uniqueMaterials?.[0]?.count ?? 0;
        const avgMs = agg?.avgApprovalTime?.[0]?.avgMs ?? null;
        const avgApprovalTimeDays =
            avgMs !== null
                ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
                : null;
        logger.info("Global Transfer summary fetched", { companyId, totalTransfers });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalTransfers,
                        draftTransfers,
                        approvedTransfers,
                        rejectedTransfers,
                        totalMaterialsMoved,
                        totalItemLines,
                        activeProjects,
                        staleDraftTransfers,
                        uniqueMaterialsTransferred,
                        avgApprovalTimeDays,
                    },
                },
                "Global Transfer Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalTransferSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch global transfer summary", [error.message])
        );
    }
};



// This function returns all stock transfers across the company. takes x-company-id in headers. supports pagination, search (materialName), filtering (status, projectId, fromProjectId, toProjectId, date range) and sorting with enriched project details, transfer direction and user information. -------------------------- Ayan
export const getAllTransfersGlobal = async (req, res) => {
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
            fromProjectId,
            toProjectId,
            sortBy = "createdAt",
            order = "desc",
            dateFrom,
            dateTo,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Draft", "Approved", "Rejected"];
        const allowedSortFields = ["createdAt", "status", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = {
            companyId,
            isDeleted: false,
            $or: [
                { fromProjectId: { $in: activeProjectIds } },
                { toProjectId: { $in: activeProjectIds } },
            ],
        }; if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid projectId", "projectId must be a valid ObjectId")
                );
            }
            const pid = new mongoose.Types.ObjectId(projectId);
            const existingOr = filter.$or;
            delete filter.$or;
            filter.$and = [
                { $or: existingOr },
                { $or: [{ fromProjectId: pid }, { toProjectId: pid }] },
            ];
        }
        if (!projectId) {
            if (fromProjectId) {
                if (!isValidObjectId(fromProjectId)) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid fromProjectId", "fromProjectId must be a valid ObjectId")
                    );
                }
                filter.fromProjectId = new mongoose.Types.ObjectId(fromProjectId);
            }
            if (toProjectId) {
                if (!isValidObjectId(toProjectId)) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid toProjectId", "toProjectId must be a valid ObjectId")
                    );
                }
                filter.toProjectId = new mongoose.Types.ObjectId(toProjectId);
            }
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
            const searchCondition = { "items.materialName": { $regex: search.trim(), $options: "i" } };
            if (filter.$and) {
                filter.$and.push(searchCondition);
            } else {
                filter.$and = [searchCondition];
            }
        }
        const [transfers, total] = await Promise.all([
            StockTransfer.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            StockTransfer.countDocuments(filter),
        ]);
        if (transfers.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        transfers: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNext: false,
                            hasPrev: pageNumber > 1,
                        },
                    },
                    "No Transfers Found",
                    "No stock transfers matched the given filters"
                )
            );
        }
        const allProjectIds = [
            ...new Set([
                ...transfers.map((t) => t.fromProjectId?.toString()),
                ...transfers.map((t) => t.toProjectId?.toString()),
            ].filter(Boolean)),
        ];
        const projects = await Project.find(
            { _id: { $in: allProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1, projectCode: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = {
                name: p.projectName || "Unknown Project",
                code: p.projectCode || null,
            };
        });
        const uniqueUserIds = [
            ...new Set([
                ...transfers.map((t) => t.createdBy?.toString()),
                ...transfers.map((t) => t.approvedBy?.toString()),
                ...transfers.map((t) => t.rejectedBy?.toString()),
            ].filter(Boolean)),
        ];
        const userEnrichmentMap = {};
        await Promise.all(
            uniqueUserIds.map(async (uid) => {
                userEnrichmentMap[uid] = await enrichUser(new mongoose.Types.ObjectId(uid));
            })
        );
        const shaped = transfers.map((t) => {
            const materials = (t.items || []).map((it) => it.materialName);
            const totalItems = t.items?.length ?? 0;
            const totalQuantity =
                Math.round(
                    (t.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0) * 1000
                ) / 1000;
            const fromProjId = t.fromProjectId?.toString();
            const toProjId = t.toProjectId?.toString();
            let transferDirection = null;
            if (projectId) {
                transferDirection = fromProjId === projectId ? "Outgoing" : "Incoming";
            }
            return {
                transferId: t._id,
                transferDirection,
                fromProject: {
                    id: t.fromProjectId,
                    name: projectMap[fromProjId]?.name ?? "Unknown Project",
                    code: projectMap[fromProjId]?.code ?? null,
                },
                toProject: {
                    id: t.toProjectId,
                    name: projectMap[toProjId]?.name ?? "Unknown Project",
                    code: projectMap[toProjId]?.code ?? null,
                },
                materials,
                totalItems,
                totalQuantity,
                status: t.status,
                reason: t.reason ?? null,
                remarks: t.remarks ?? null,
                rejectionRemarks: t.rejectionRemarks ?? null,
                createdBy: userEnrichmentMap[t.createdBy?.toString()] ?? null,
                approvedBy: userEnrichmentMap[t.approvedBy?.toString()] ?? null,
                rejectedBy: userEnrichmentMap[t.rejectedBy?.toString()] ?? null,
                createdAt: t.createdAt,
                approvedAt: t.approvedAt ?? null,
                rejectedAt: t.rejectedAt ?? null,
            };
        });
        logger.info("Global transfers fetched", {
            companyId,
            total,
            returned: transfers.length,
            page: pageNumber,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    transfers: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                "Global Transfers Retrieved",
                `Fetched ${shaped.length} stock transfer(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllTransfersGlobal failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global transfers", [error.message])
        );
    }
};