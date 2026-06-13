import mongoose from "mongoose";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import ContraEntry from "../models/contraEntry.models.js";
import keycloakService from "../services/keycloak.service.js";
import Role from "../models/role.models.js";

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const resolveCompany = async (companyUUID) => {
    return await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
};

export const resolveUserByKeycloak = async (keycloakId, companyId) => {
    return await User.findOne({ keycloakId: keycloakId.trim(), companyId, isDeleted: false }).lean();
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
        const user = await User.findById(mongoUserId).select("_id keycloakId roleId").lean();
        if (!user) return null;
        const profile = await getKcProfile(user.keycloakId);
        let roleName = null;
        if (user.roleId) {
            const role = await Role.findOne({ _id: new mongoose.Types.ObjectId(user.roleId), isDeleted: false }).lean();
            roleName = role?.roleName || null;
        }
        return { id: user._id, keycloakId: user.keycloakId, name: profile.name, email: profile.email, avatar: profile.avatar, role: roleName };
    } catch {
        return null;
    }
};

export const computeVariancePct = (orderedValue, netBilledValue) => {
    if (orderedValue <= 0) return 0;
    return Math.round((Math.abs(netBilledValue - orderedValue) / orderedValue) * 10000) / 100;
};

export const computeThreeWayMatchStatus = ({ orderedQty, receivedQty, orderedValue, billedValue, hasGRN, hasPayable }) => {
    if (!hasGRN) return "PENDING_GRN";
    if (!hasPayable) return "PENDING_INVOICE";
    const variancePct = computeVariancePct(orderedValue, billedValue);
    const qtyMatched = Math.abs(receivedQty - orderedQty) < 0.001;
    if (qtyMatched && variancePct === 0) return "MATCHED";
    if (variancePct <= 2) return "TOLERATED";
    return "UNMATCHED";
};


export const generateCENumber = async (companyId) => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `CE-${yyyymm}-`;
    const last = await ContraEntry.findOne(
        { companyId, ceNumber: { $regex: `^${prefix}` } },
        { ceNumber: 1 },
        { sort: { ceNumber: -1 } }
    ).lean();
    let seq = 1;
    if (last?.ceNumber) {
        const parts = last.ceNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
};


export const computePurchaseMatchStatus = ({ hasGRN, hasPayable, orderedQty, receivedQty, orderedValue, netBilledValue }) => {
    if (!hasGRN && !hasPayable) return "PENDING_GRN";
    if (hasGRN && !hasPayable) return "PENDING_INVOICE";
    const qtyDiff = receivedQty - orderedQty;
    const variancePct = computeVariancePct(orderedValue, netBilledValue);
    if (qtyDiff > 0.001) return "OVER_RECEIVED";
    if (receivedQty < orderedQty - 0.001 && receivedQty > 0) {
        if (!hasPayable) return "PARTIAL_RECEIPT";
        return "PARTIAL_BILLING";
    }
    if (netBilledValue > orderedValue && variancePct >= 2) return "OVER_BILLED";
    if (netBilledValue < orderedValue && variancePct >= 2) return "UNDER_BILLED";
    if (variancePct === 0 && Math.abs(qtyDiff) < 0.001) return "MATCHED";
    if (variancePct <= 2) return "TOLERATED";
    return "UNMATCHED";
};

export const computePurchaseDiscrepancyFlags = ({ hasGRN, hasPayable, orderedQty, receivedQty, orderedValue, netBilledValue, variancePct, payableCount, grnCount, paymentPending }) => {
    const flags = [];
    if (!hasGRN) flags.push("NO_GRN");
    if (!hasPayable) flags.push("NO_PAYABLE");
    if (netBilledValue > orderedValue && variancePct >= 2) flags.push("OVER_BILLED");
    if (netBilledValue < orderedValue && variancePct >= 2) flags.push("UNDER_BILLED");
    if (receivedQty > orderedQty + 0.001) flags.push("OVER_RECEIVED");
    if (receivedQty < orderedQty - 0.001 && receivedQty > 0) flags.push("UNDER_RECEIVED");
    if (variancePct >= 10) flags.push("HIGH_VARIANCE");
    if (payableCount > 1) flags.push("MULTIPLE_PAYABLES");
    if (paymentPending) flags.push("PAYMENT_PENDING");
    return flags;
};

export const computeFinancialDiscrepancyFlags = ({ orderedValue, billedValue, paidValue, advanceDeducted, contraAdjustment, netPayable, variancePct }) => {
    const flags = [];
    const totalSettled = paidValue + advanceDeducted;
    if (billedValue > orderedValue && variancePct >= 2) flags.push("OVER_BILLED");
    if (billedValue < orderedValue && variancePct >= 2) flags.push("UNDER_BILLED");
    if (variancePct >= 10) flags.push("HIGH_VARIANCE");
    if (totalSettled === 0 && billedValue > 0) flags.push("UNPAID");
    if (totalSettled > 0 && totalSettled < billedValue + contraAdjustment) flags.push("PARTIALLY_PAID");
    if (netPayable < 0) flags.push("NEGATIVE_BALANCE");
    if (totalSettled > billedValue + contraAdjustment) flags.push("OVERPAYMENT");
    if (contraAdjustment !== 0) flags.push("CONTRA_APPROVED");
    return flags;
};

export const computeFinancialReconciliationStatus = ({ variancePct, totalSettled, netBilled }) => {
    if (netBilled <= 0) return "NO_BILLING";
    if (totalSettled >= netBilled) return "SETTLED";
    if (variancePct >= 2) return "UNMATCHED";
    if (variancePct > 0) return "TOLERATED";
    if (totalSettled === 0) return "UNPAID";
    return "PARTIALLY_PAID";
};

export const computeMaterialReconciliationStatus = ({ requiredQty, orderedQty, receivedQty, issuedQty, adjustedQty }) => {
    if (orderedQty === 0) return "NOT_ORDERED";
    if (receivedQty === 0) return "PENDING_DELIVERY";
    const netStock = receivedQty + adjustedQty - issuedQty;
    if (netStock < 0) return "OVER_ISSUED";
    if (receivedQty < orderedQty - 0.001) return "PARTIAL_DELIVERY";
    if (Math.abs(orderedQty - requiredQty) < 0.001 && Math.abs(receivedQty - orderedQty) < 0.001) return "MATCHED";
    if (orderedQty > requiredQty) return "EXCESS_ORDERED";
    if (orderedQty < requiredQty) return "SHORT_ORDERED";
    return "RECONCILED";
};

export const computeInventoryReconciliationStatus = ({ expectedClosingStock, currentStock, currentStock: _cs }) => {
    if (currentStock < 0) return "NEGATIVE_STOCK";
    if (currentStock === 0) return "ZERO_STOCK";
    const diff = currentStock - expectedClosingStock;
    if (Math.abs(diff) < 0.001) return "MATCHED";
    if (diff < 0) return "SHORTAGE";
    if (diff > 0) return "EXCESS";
    return "STOCK_MISMATCH";
};

export const computeInventoryDiscrepancyFlags = ({ currentStock, expectedClosingStock, adjustmentCount }) => {
    const flags = [];
    if (currentStock < 0) flags.push("NEGATIVE_STOCK");
    const diff = currentStock - expectedClosingStock;
    if (Math.abs(diff) > 0.001) flags.push("COUNT_MISMATCH");
    if (Math.abs(diff) / Math.max(expectedClosingStock, 1) > 0.1) flags.push("HIGH_VARIANCE");
    if (adjustmentCount > 2) flags.push("MULTIPLE_ADJUSTMENTS");
    if (adjustmentCount > 0) flags.push("OVER_ADJUSTED");
    return flags;
};