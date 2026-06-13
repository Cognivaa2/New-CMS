import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Inventory from "../models/inventory.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import StockMovement from "../models/stockMovement.models.js";

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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


export const processTransferItems = async (
    items,
    fromProjectId,
    companyId,
    existingItemsMap = {}
) => {
    const processedItems = [];
    for (const [index, item] of items.entries()) {
        if (!item.inventoryId || !isValidObjectId(item.inventoryId)) {
            return { error: new ApiErrors(400, "Validation Error",`Valid inventoryId is required at item index ${index}`) };
        }
        if (!item.materialMasterId || !isValidObjectId(item.materialMasterId)) {
            return {
                error: new ApiErrors(400,"Validation Error",`Valid materialMasterId is required at item index ${index}`),
            };
        }
        if (!item.materialName?.trim()) {
            return {error: new ApiErrors(400,"Validation Error",`materialName is required at item index ${index}`)};
        }
        if (!item.unit?.trim()) {
            return {error: new ApiErrors(400,"Validation Error", `unit is required at item index ${index}`)};
        }
        const qty = Number(item.quantity);
        if (!qty || qty < 0.001) {
            return {error: new ApiErrors(400, "Validation Error", `quantity must be at least 0.001 at item index ${index}`)};
        }
        const invItem = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(item.inventoryId),
            projectId: new mongoose.Types.ObjectId(fromProjectId),
            companyId,
            isDeleted: false,
        }).lean();
        if (!invItem) {
            return {
                error: new ApiErrors(404,"Inventory Item Not Found",`No active inventory item found for inventoryId "${item.inventoryId}" in the source project (index ${index})`),
            };
        }

        const existingItem = existingItemsMap[item.inventoryId.toString()];

        processedItems.push({
            inventoryId: invItem._id,
            materialMasterId: new mongoose.Types.ObjectId(item.materialMasterId),
            materialName: item.materialName.trim(),
            unit: item.unit.trim(),
            quantity: qty,
            stockAtTimeOfTransfer: existingItem
                ? existingItem.stockAtTimeOfTransfer
                : (invItem.currentStock ?? 0),
        });
    }

    return { processedItems };
};



export const createStockMovements = async (transfer, companyId) => {
    const movements = [];

    for (const item of transfer.items) {
        movements.push({
            companyId,
            transferId: transfer._id,
            projectId: transfer.fromProjectId,
            counterpartProjectId: transfer.toProjectId,
            inventoryId: item.inventoryId,
            materialMasterId: item.materialMasterId,
            materialName: item.materialName,
            unit: item.unit,
            quantity: item.quantity,
            movementType: "Outgoing",
            stockSnapshot: item.stockAtTimeOfTransfer,
            status: transfer.status,
            createdBy: transfer.createdBy,
        });
        movements.push({
            companyId,
            transferId: transfer._id,
            projectId: transfer.toProjectId,
            counterpartProjectId: transfer.fromProjectId,
            inventoryId: item.inventoryId,
            materialMasterId: item.materialMasterId,
            materialName: item.materialName,
            unit: item.unit,
            quantity: item.quantity,
            movementType: "Incoming",
            stockSnapshot: item.incomingStockSnapshot ?? 0,
            status: transfer.status,
            createdBy: transfer.createdBy,
        });
    }

    await StockMovement.insertMany(movements);
};


export const syncMovementStatus = async (transferId, newStatus) => {
    await StockMovement.updateMany(
        { transferId, isDeleted: false },
        { $set: { status: newStatus } }
    );
};


export const softDeleteMovements = async (transferId) => {
    await StockMovement.updateMany(
        { transferId },
        { $set: { isDeleted: true, deletedAt: new Date() } }
    );
};