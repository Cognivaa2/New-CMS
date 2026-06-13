import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Inventory from "../models/inventory.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import Role from "../models/role.models.js";
import keycloakService from "../services/keycloak.service.js";


export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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


export const enrichMRUsers = async (mr) => {
    const [
        createdBy,
        updatedBy,
        approvedBy,
        rejectedBy
    ] = await Promise.all([
        enrichUser(mr.createdBy),
        enrichUser(mr.updatedBy),
        enrichUser(mr.approvedBy),
        enrichUser(mr.rejectedBy),
    ]);
    return {
        ...mr,
        createdBy,
        updatedBy,
        approvedBy,
        rejectedBy,
    };
};


export const processMRItems = async (
    items,
    projectId,
    companyId,
    existingItemsMap = {}
) => {
    const processedItems = [];
    for (const [index, item] of items.entries()) {
        if (!item.inventoryId || !isValidObjectId(item.inventoryId)) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `Valid inventoryId is required at item index ${index}`
                ),
            };
        }
        const invItem = await Inventory.findOne({
            _id: item.inventoryId,
            projectId,
            companyId,
            isDeleted: false,
        }).lean();
        if (!invItem) {
            return {
                error: new ApiErrors(
                    404,
                    "Inventory Not Found",
                    `No inventory found for inventoryId "${item.inventoryId}" (index ${index})`
                ),
            };
        }
        const requiredQty = Number(item.requiredQuantity);
        if (!requiredQty || requiredQty < 0.001) {
            return {
                error: new ApiErrors(
                    400,
                    "Validation Error",
                    `requiredQuantity must be at least 0.001 at item index ${index}`
                ),
            };
        }
        const existingItem = existingItemsMap[item.inventoryId?.toString()];
        const stockSnapshot = existingItem
            ? existingItem.stockAtTimeOfMR
            : (invItem.currentStock ?? 0);
        processedItems.push({
            inventoryId: invItem._id,
            materialMasterId: invItem.materialMasterId,
            materialName: invItem.name,
            unit: invItem.unit,
            requiredQuantity: requiredQty,
            stockAtTimeOfMR: stockSnapshot,
        });
    }

    return { processedItems };
};