import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Inventory from "../models/inventory.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import GRN from "../models/grn.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import Counter from "../models/counter.models.js";
import { enrichUser } from "./poHelper.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { deleteFromR2 } from "../utils/deleteFromR2.utils.js";


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


export const generateGRNNumber = async (companyId) => {
    const year = new Date().getFullYear();
    const counterKey = `GRN-${companyId.toString()}-${year}`;
    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return `GRN-${year}-${String(counter.seq).padStart(4, "0")}`;
};


export const uploadGRNAttachment = async (file, uploaderObjectId) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    const key = `grn/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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


export const deleteGRNAttachment = async (attachment) => {
    if (!attachment?.fileKey) return;
    await deleteFromR2(attachment.fileKey);
};


export const checkDuplicateChallan = async (
    deliveryChallanNumber,
    companyId,
    vendorId,
    grnIdToExclude = null
) => {
    if (!deliveryChallanNumber?.trim()) return null;
    const filter = {
        companyId,
        vendorId,
        deliveryChallanNumber: deliveryChallanNumber.trim(),
        isDeleted: false,
    };
    if (grnIdToExclude) {
        filter._id = { $ne: grnIdToExclude };
    }
    const existing = await GRN.findOne(filter, { grnNumber: 1 }).lean();
    if (existing) {
        return new ApiErrors(
            409,
            "Duplicate Challan Number",
            `Delivery challan "${deliveryChallanNumber.trim()}" has already been used in GRN ${existing.grnNumber} for this vendor. Each challan number must be unique per vendor.`
        );
    }
    return null;
};



export const processGRNItems = async (
    items,
    projectId,
    companyId,
    po,
    grnIdToExclude = null
) => {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            error: new ApiErrors(400, "Validation Error", "GRN must contain at least one item"),
        };
    }
    const poItemMap = {};
    po.items.forEach((it) => {
        poItemMap[it.inventoryId.toString()] = it;
    });
    const existingGRNFilter = { poId: po._id, companyId, isDeleted: false };
    if (grnIdToExclude) {
        existingGRNFilter._id = { $ne: grnIdToExclude };
    }
    const existingGRNs = await GRN.find(existingGRNFilter, { items: 1 }).lean();
    const alreadyReceivedMap = {};
    existingGRNs.forEach((grn) => {
        grn.items.forEach((it) => {
            const key = it.inventoryId.toString();
            alreadyReceivedMap[key] = (alreadyReceivedMap[key] || 0) + it.receivedQuantity;
        });
    });
    const processedItems = [];
    const seenInventoryIds = new Set();
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const idx = `items[${i}]`;
        if (!item.inventoryId || !isValidObjectId(item.inventoryId)) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `${idx}.inventoryId must be a valid MongoDB ObjectId`
                ),
            };
        }
        if (seenInventoryIds.has(item.inventoryId.toString())) {
            return {
                error: new ApiErrors(
                    400,
                    "Duplicate Item",
                    `${idx}: Inventory item ${item.inventoryId} appears more than once in the items array`
                ),
            };
        }
        seenInventoryIds.add(item.inventoryId.toString());
        const qty = Number(item.receivedQuantity);
        if (isNaN(qty) || qty <= 0) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `${idx}.receivedQuantity must be a positive number`
                ),
            };
        }
        const inv = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(item.inventoryId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId,
            isDeleted: false,
        }).lean();
        if (!inv) {
            return {
                error: new ApiErrors(
                    404,
                    "Inventory Not Found",
                    `${idx}: No active inventory item found with ID ${item.inventoryId} in this project`
                ),
            };
        }
        const poItem = poItemMap[item.inventoryId.toString()];
        if (!poItem) {
            return {
                error: new ApiErrors(
                    400,
                    "Item Not In PO",
                    `${idx}: Inventory item "${inv.name}" is not part of the referenced Purchase Order`
                ),
            };
        }
        if (inv.unit.trim().toLowerCase() !== poItem.unit.trim().toLowerCase()) {
            return {
                error: new ApiErrors(
                    400,
                    "Unit Mismatch",
                    `${idx}: Unit mismatch for "${inv.name}". PO unit is "${poItem.unit}" but current inventory unit is "${inv.unit}". Please correct the inventory before creating this GRN.`
                ),
            };
        }
        const alreadyReceived = alreadyReceivedMap[item.inventoryId.toString()] || 0;
        const remainingAllowed = poItem.orderedQuantity - alreadyReceived;
        if (qty > remainingAllowed) {
            return {
                error: new ApiErrors(
                    400,
                    "Over-Receive Not Allowed",
                    `${idx}: Cannot receive ${qty} ${inv.unit} of "${inv.name}". ` +
                    `Ordered: ${poItem.orderedQuantity}, Already received: ${alreadyReceived}, ` +
                    `Remaining allowed: ${remainingAllowed}`
                ),
            };
        }
        processedItems.push({
            inventoryId: inv._id,
            materialMasterId: inv.materialMasterId,
            materialName: inv.name,
            unit: inv.unit,
            orderedQuantity: poItem.orderedQuantity,
            previouslyReceivedQuantity: alreadyReceived,
            receivedQuantity: qty,
            remarks: item.remarks?.trim() || null,
        });
    }
    return { processedItems };
};



export const checkStockRollbackSafety = async (grnItems, companyId, session) => {
    for (const item of grnItems) {
        const inv = await Inventory.findOne(
            { _id: item.inventoryId, companyId, isDeleted: false },
            { name: 1, unit: 1, currentStock: 1 },
            { session }
        ).lean();
        if (!inv) {
            continue;
        }
        if (inv.currentStock < item.receivedQuantity) {
            return new ApiErrors(
                400,
                "Cannot Reverse Stock",
                `Cannot reverse GRN for "${inv.name}": current stock is ${inv.currentStock} ${inv.unit} ` +
                `but GRN quantity to reverse is ${item.receivedQuantity} ${inv.unit}. ` +
                `This material has already been consumed or transferred. ` +
                `Please resolve the stock discrepancy before modifying this GRN.`
            );
        }
    }
    return null;
};



export const recalculatePOAfterGRN = async (poId, companyId, session) => {
    const po = await PurchaseOrder.findOne(
        { _id: poId, companyId, isDeleted: false },
        null,
        { session }
    );
    if (!po) return;
    const activeGRNs = await GRN.find(
        { poId, companyId, isDeleted: false },
        { items: 1 },
        { session }
    ).lean();
    const receivedMap = {};
    activeGRNs.forEach((grn) => {
        grn.items.forEach((it) => {
            const key = it.inventoryId.toString();
            receivedMap[key] = (receivedMap[key] || 0) + it.receivedQuantity;
        });
    });
    po.items.forEach((item) => {
        item.receivedQuantity = receivedMap[item.inventoryId.toString()] || 0;
    });
    const totalItems = po.items.length;
    const fullyReceivedCount = po.items.filter(
        (it) => it.receivedQuantity >= it.orderedQuantity
    ).length;
    const anyReceived = po.items.some((it) => it.receivedQuantity > 0);
    let newStatus;
    if (fullyReceivedCount === totalItems) {
        newStatus = "Completed";
    } else if (anyReceived) {
        newStatus = "PartiallyDelivered";
    } else {
        newStatus = "Approved";
    }
    const now = new Date();
    if (!po.firstDeliveryAt && anyReceived) {
        po.firstDeliveryAt = now;
    }
    if (newStatus === "Completed" && !po.completedAt) {
        po.completedAt = now;
    } else if (newStatus !== "Completed") {
        po.completedAt = null;
    }
    po.status = newStatus;
    await po.save({ session });
};



export const enrichGRNUsers = async (grn) => {
    if (!grn) return grn;
    const [createdBy, updatedBy, deletedBy] = await Promise.all([
        enrichUser(grn.createdBy),
        enrichUser(grn.updatedBy),
        enrichUser(grn.deletedBy),
    ]);
    return { ...grn, createdBy, updatedBy, deletedBy };
};


export const computeGRNTotal = (grnItems, poItems) => {
    return parseFloat(
        grnItems.reduce((sum, grnItem) => {
            const poItem = poItems.find(
                (p) => p.inventoryId.toString() === grnItem.inventoryId.toString()
            );
            if (!poItem || poItem.orderedQuantity <= 0) return sum;
            const effectiveUnitRate = poItem.totalPrice / poItem.orderedQuantity;
            return sum + grnItem.receivedQuantity * effectiveUnitRate;
        }, 0).toFixed(2)
    );
};