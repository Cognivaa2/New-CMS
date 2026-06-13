import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Inventory from "../models/inventory.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import Role from "../models/role.models.js";
import keycloakService from "../services/keycloak.service.js";


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


export const getKcProfile = async (keycloakId) => {
    try {
        const kc = await keycloakService.getUserById(keycloakId);
        return {
            name: kc?.attributes?.name?.[0] || kc?.firstName || "Unknown",
            email: kc?.email || null,
            avatar: kc?.attributes?.avatar?.[0] || null,
        };
    } catch {
        return { name: "Unknown", email: null, avatar: null };
    }
};


export const enrichUser = async (mongoUserId) => {
    if (!mongoUserId) return null;
    try {
        const user = await User.findById(mongoUserId)
            .select("_id keycloakId roleId")
            .lean();
        if (!user) return null;
        const profile = await getKcProfile(user.keycloakId);
        let roleName = null;
        if (user.roleId) {
            const role = await Role.findOne({
                _id: new mongoose.Types.ObjectId(user.roleId),
                isDeleted: false,
            }).lean();
            roleName = role?.roleName || null;
        }
        return {
            id: user._id,
            keycloakId: user.keycloakId,
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: roleName,
        };
    } catch {
        return null;
    }
};


export const generatePONumber = async (companyId) => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `PO-${yyyymm}-`;
    const last = await PurchaseOrder.findOne(
        { companyId, poNumber: { $regex: `^${prefix}` } },
        { poNumber: 1 },
        { sort: { poNumber: -1 } }
    ).lean();
    let seq = 1;
    if (last?.poNumber) {
        const parts = last.poNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
};


export const processPOItems = async (items, projectId, companyId) => {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            error: new ApiErrors(
                400,
                "Validation Error",
                "PO must contain at least one item"
            ),
        };
    }
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
        const qty = Number(item.orderedQuantity);
        if (isNaN(qty) || qty <= 0) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `${idx}.orderedQuantity must be a positive number`
                ),
            };
        }
        const price = Number(item.unitPrice);
        if (isNaN(price) || price < 0) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `${idx}.unitPrice must be a non-negative number`
                ),
            };
        }
        const discountPercent = item.discountPercent !== undefined
            ? Number(item.discountPercent)
            : 0;
        if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `${idx}.discountPercent must be a number between 0 and 100`
                ),
            };
        }
        const gstPercent = item.gstPercent !== undefined
            ? Number(item.gstPercent)
            : 0;
        if (isNaN(gstPercent) || gstPercent < 0) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `${idx}.gstPercent must be a non-negative number`
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
        const basePrice = parseFloat((qty * price).toFixed(2));
        const discountAmount = parseFloat((basePrice * (discountPercent / 100)).toFixed(2));
        const priceAfterDiscount = parseFloat((basePrice - discountAmount).toFixed(2));
        const gstAmount = parseFloat((priceAfterDiscount * (gstPercent / 100)).toFixed(2));
        const totalPrice = parseFloat((priceAfterDiscount + gstAmount).toFixed(2));
        processedItems.push({
            inventoryId: inv._id,
            materialMasterId: inv.materialMasterId,
            materialName: inv.name,
            unit: inv.unit,
            orderedQuantity: qty,
            receivedQuantity: 0,
            unitPrice: price,
            discountPercent,
            discountAmount,
            gstPercent,
            gstAmount,
            totalPrice,
            remarks: item.remarks?.trim() || null,
        });
    }
    return { processedItems };
};


export const enrichPOUsers = async (po) => {
    if (!po) return po;
    const [
        createdBy,
        updatedBy,
        submittedBy,
        approvedBy,
        rejectedBy,
        cancelledBy,
        deletedBy,
    ] = await Promise.all([
        enrichUser(po.createdBy),
        enrichUser(po.updatedBy),
        enrichUser(po.submittedBy),
        enrichUser(po.approvedBy),
        enrichUser(po.rejectedBy),
        enrichUser(po.cancelledBy),
        enrichUser(po.deletedBy),
    ]);
    return {
        ...po,
        createdBy,
        updatedBy,
        submittedBy,
        approvedBy,
        rejectedBy,
        cancelledBy,
        deletedBy,
    };
};


export const shouldMarkMRAsConverted = async (mrId, companyId) => {
    const mr = await MaterialRequisition.findOne({
        _id: mrId,
        companyId,
        isDeleted: false,
    }).lean();
    if (!mr || !Array.isArray(mr.items) || mr.items.length === 0) return false;
    const mrMaterialIds = mr.items.map((it) => it.materialMasterId.toString());
    const existingPOs = await PurchaseOrder.find(
        { mrId, companyId, isDeleted: false },
        { "items.materialMasterId": 1 }
    ).lean();
    const coveredMaterials = new Set();
    existingPOs.forEach((po) => {
        po.items.forEach((it) => coveredMaterials.add(it.materialMasterId.toString()));
    });
    return mrMaterialIds.every((id) => coveredMaterials.has(id));
};