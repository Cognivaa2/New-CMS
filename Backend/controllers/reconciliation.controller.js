import mongoose from "mongoose";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import GRN from "../models/grn.models.js";
import Payable from "../models/payable.models.js";
import PaymentTransaction from "../models/paymentTransaction.models.js";
import Vendor from "../models/vendors.models.js";
import Project from "../models/project.models.js";
import ContraEntry from "../models/contraEntry.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import MaterialConsumption from "../models/materialConsumption.models.js";
import StockAdjustment from "../models/stockAdjustment.models.js";
import StockTransfer from "../models/stockTransfer.models.js";
import StockMovement from "../models/stockMovement.models.js";
import Inventory from "../models/inventory.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import {
    isValidObjectId,
    resolveCompany,
    resolveUserByKeycloak,
    enrichUser,
    computeThreeWayMatchStatus,
    computeVariancePct,
    generateCENumber,
    computePurchaseMatchStatus,
    computePurchaseDiscrepancyFlags,
    computeFinancialDiscrepancyFlags,
    computeFinancialReconciliationStatus,
    computeMaterialReconciliationStatus,
    computeInventoryReconciliationStatus,
    computeInventoryDiscrepancyFlags,
} from "../helpers/reconciliationHelper.js";

export const getThreeWayMatchList = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const activeProjects = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const {
            projectId, vendorId, matchStatus,
            page = 1, limit = 10,
            sortBy = "createdAt", order = "desc",
            dateFrom, dateTo, search,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSortFields = ["createdAt", "poNumber", "totalOrderValue"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const poFilter = {
            companyId,
            isDeleted: false,
            status: { $in: ["Approved", "PartiallyDelivered", "Completed", "Cancelled"] },
            projectId: { $in: activeProjectIds },
        };
        if (projectId && isValidObjectId(projectId)) poFilter.projectId = new mongoose.Types.ObjectId(projectId);
        if (vendorId && isValidObjectId(vendorId)) poFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            poFilter.$or = [{ poNumber: regex }, { vendorName: regex }];
        }
        const allPOs = await PurchaseOrder.find(poFilter)
            .select("_id poNumber projectId vendorId vendorName totalOrderValue items status createdAt approvedAt")
            .sort({ [sortField]: sortOrder })
            .lean();
        if (allPOs.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Records", "No POs found for three-way match"));
        }
        const poIds = allPOs.map((p) => p._id);
        const [grns, payables, contraEntries] = await Promise.all([
            GRN.find({ companyId, poId: { $in: poIds }, isDeleted: false })
                .select("_id poId")
                .lean(),
            Payable.find({ companyId, poId: { $in: poIds } })
                .select("_id poId totalAmount paidAmount dueAmount advanceDeducted")
                .lean(),
            ContraEntry.find({ companyId, poId: { $in: poIds }, isDeleted: false })
                .select("_id poId adjustmentAmount direction status")
                .lean(),
        ]);
        const grnByPO = {};
        grns.forEach((g) => {
            const key = g.poId.toString();
            if (!grnByPO[key]) grnByPO[key] = [];
            grnByPO[key].push(g);
        });
        const payableByPO = {};
        payables.forEach((p) => {
            const key = p.poId.toString();
            if (!payableByPO[key]) payableByPO[key] = [];
            payableByPO[key].push(p);
        });
        const ceByPO = {};
        contraEntries.forEach((c) => {
            const key = c.poId.toString();
            if (!ceByPO[key]) ceByPO[key] = [];
            ceByPO[key].push(c);
        });
        const uniqueProjectIds = [...new Set(allPOs.map((p) => p.projectId?.toString()))];
        const projects = await Project.find({ _id: { $in: uniqueProjectIds } }, { _id: 1, projectName: 1 }).lean();
        const projectMap = {};
        projects.forEach((p) => { projectMap[p._id.toString()] = p.projectName; });
        const allRecords = allPOs.map((po) => {
            const poKey = po._id.toString();
            const poGRNs = grnByPO[poKey] || [];
            const poPayables = payableByPO[poKey] || [];
            const poCEs = ceByPO[poKey] || [];
            const orderedQty = po.items.reduce((s, i) => s + i.orderedQuantity, 0);
            const receivedQty = po.items.reduce((s, i) => s + i.receivedQuantity, 0);
            const itemUnits = [...new Set(po.items.map((i) => i.unit).filter(Boolean))];
            const displayUnit = itemUnits.length === 1 ? itemUnits[0] : "units";
            const orderedValue = po.totalOrderValue;
            const billedValue = poPayables.reduce((s, p) => s + p.totalAmount, 0);
            const paidValue = poPayables.reduce((s, p) => s + p.paidAmount, 0);
            const advanceDeducted = poPayables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
            const outstandingValue = poPayables.reduce((s, p) => s + p.dueAmount, 0);
            const approvedCEAdjustment = poCEs
                .filter((c) => c.status === "Approved")
                .reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
            const netBilled = billedValue + approvedCEAdjustment;
            const variancePct = computeVariancePct(orderedValue, netBilled);
            const computedMatchStatus = computeThreeWayMatchStatus({
                orderedQty,
                receivedQty,
                orderedValue,
                billedValue: netBilled,
                hasGRN: poGRNs.length > 0,
                hasPayable: poPayables.length > 0,
            });
            return {
                poId: po._id,
                poNumber: po.poNumber,
                projectId: po.projectId,
                projectName: projectMap[po.projectId?.toString()] || "Unknown",
                vendorId: po.vendorId,
                vendorName: po.vendorName,
                poStatus: po.status,
                matchStatus: computedMatchStatus,
                financials: {
                    orderedValue: Math.round(orderedValue * 100) / 100,
                    billedValue: Math.round(billedValue * 100) / 100,
                    paidValue: Math.round(paidValue * 100) / 100,
                    outstandingValue: Math.round(outstandingValue * 100) / 100,
                    advanceDeducted: Math.round(advanceDeducted * 100) / 100,
                    contraAdjustment: Math.round(approvedCEAdjustment * 100) / 100,
                    netBilledAfterContra: Math.round(netBilled * 100) / 100,
                    variancePct,
                    varianceWithinTolerance: variancePct < 2,
                },
                quantities: {
                    orderedQty: Math.round(orderedQty * 1000) / 1000,
                    receivedQty: Math.round(receivedQty * 1000) / 1000,
                    pendingQty: Math.round((orderedQty - receivedQty) * 1000) / 1000,
                    fulfilmentRate: orderedQty > 0 ? Math.round((receivedQty / orderedQty) * 1000) / 10 : 0,
                    unit: displayUnit,
                },
                grnCount: poGRNs.length,
                payableCount: poPayables.length,
                contraEntryCount: poCEs.length,
                createdAt: po.createdAt,
                approvedAt: po.approvedAt,
            };
        });
        const filteredRecords = matchStatus ? allRecords.filter((r) => r.matchStatus === matchStatus) : allRecords;
        const total = filteredRecords.length;
        const paginatedRecords = filteredRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        logger.info("Three-way match list fetched", { companyId, total, returned: paginatedRecords.length });
        return res.status(200).json(
            new ApiResponse(200, {
                records: paginatedRecords,
                pagination: {
                    total,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: pageNumber < Math.ceil(total / pageSize),
                    hasPrev: pageNumber > 1,
                },
            }, "Three-Way Match Retrieved", `Fetched ${paginatedRecords.length} match record(s)`)
        );
    } catch (error) {
        logger.error("getThreeWayMatchList failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch three-way match records"));
    }
};

export const getThreeWayMatchByPO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { poId } = req.params;
        if (!poId || !isValidObjectId(poId)) return res.status(400).json(new ApiErrors(400, "Invalid PO ID", "Valid poId is required"));
        const po = await PurchaseOrder.findOne({ _id: poId, companyId, isDeleted: false }).lean();
        if (!po) return res.status(404).json(new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID"));
        const [grns, payables, contraEntries] = await Promise.all([
            GRN.find({ companyId, poId: po._id, isDeleted: false }).lean(),
            Payable.find({ companyId, poId: po._id }).lean(),
            ContraEntry.find({ companyId, poId: po._id, isDeleted: false }).lean(),
        ]);
        const orderedQty = po.items.reduce((s, i) => s + i.orderedQuantity, 0);
        const receivedQty = po.items.reduce((s, i) => s + i.receivedQuantity, 0);
        const itemUnits = [...new Set(po.items.map((i) => i.unit).filter(Boolean))];
        const displayUnit = itemUnits.length === 1 ? itemUnits[0] : "units";
        const billedValue = payables.reduce((s, p) => s + p.totalAmount, 0);
        const paidValue = payables.reduce((s, p) => s + p.paidAmount, 0);
        const outstandingValue = payables.reduce((s, p) => s + p.dueAmount, 0);
        const advanceDeducted = payables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
        const approvedCEAdjustment = contraEntries
            .filter((c) => c.status === "Approved")
            .reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        const netBilled = billedValue + approvedCEAdjustment;
        const variancePct = computeVariancePct(po.totalOrderValue, netBilled);
        const matchStatus = computeThreeWayMatchStatus({
            orderedQty,
            receivedQty,
            orderedValue: po.totalOrderValue,
            billedValue: netBilled,
            hasGRN: grns.length > 0,
            hasPayable: payables.length > 0,
        });
        const itemLevelMatch = po.items.map((item) => {
            const itemGRNQty = grns.reduce((s, g) => {
                const found = g.items.find((gi) => gi.materialMasterId.toString() === item.materialMasterId.toString());
                return s + (found?.receivedQuantity || 0);
            }, 0);
            const itemStatus =
                Math.abs(itemGRNQty - item.orderedQuantity) < 0.001 ? "MATCHED" :
                    itemGRNQty < item.orderedQuantity ? "SHORT" : "EXCESS";
            return {
                materialMasterId: item.materialMasterId,
                materialName: item.materialName,
                unit: item.unit,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: itemGRNQty,
                pendingQuantity: Math.max(item.orderedQuantity - itemGRNQty, 0),
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                itemStatus,
            };
        });
        const enrichedCEs = await Promise.all(contraEntries.map(async (ce) => ({
            ...ce,
            createdBy: await enrichUser(ce.createdBy),
            approvedBy: await enrichUser(ce.approvedBy),
        })));
        logger.info("Three-way match detail fetched", { poId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                po: {
                    poId: po._id,
                    poNumber: po.poNumber,
                    poStatus: po.status,
                    vendorId: po.vendorId,
                    vendorName: po.vendorName,
                    projectId: po.projectId,
                    totalOrderValue: po.totalOrderValue,
                    expectedDeliveryDate: po.expectedDeliveryDate,
                    approvedAt: po.approvedAt,
                },
                matchStatus,
                itemLevelMatch,
                financials: {
                    orderedValue: Math.round(po.totalOrderValue * 100) / 100,
                    billedValue: Math.round(billedValue * 100) / 100,
                    paidValue: Math.round(paidValue * 100) / 100,
                    outstandingValue: Math.round(outstandingValue * 100) / 100,
                    advanceDeducted: Math.round(advanceDeducted * 100) / 100,
                    contraAdjustment: Math.round(approvedCEAdjustment * 100) / 100,
                    netBilledAfterContra: Math.round(netBilled * 100) / 100,
                    variancePct,
                    varianceWithinTolerance: variancePct < 2,
                },
                quantities: {
                    orderedQty: Math.round(orderedQty * 1000) / 1000,
                    receivedQty: Math.round(receivedQty * 1000) / 1000,
                    pendingQty: Math.round((orderedQty - receivedQty) * 1000) / 1000,
                    fulfilmentRate: orderedQty > 0 ? Math.round((receivedQty / orderedQty) * 1000) / 10 : 0,
                    unit: displayUnit,
                },
                grns: grns.map((g) => ({
                    grnId: g._id,
                    grnNumber: g.grnNumber,
                    deliveryDate: g.deliveryDate,
                    deliveryChallanNumber: g.deliveryChallanNumber,
                    itemCount: g.items.length,
                    createdAt: g.createdAt,
                })),
                payables: payables.map((p) => ({
                    payableId: p._id,
                    payableNumber: p.payableNumber,
                    sourceNumber: p.sourceNumber,
                    totalAmount: p.totalAmount,
                    paidAmount: p.paidAmount,
                    dueAmount: p.dueAmount,
                    advanceDeducted: p.advanceDeducted,
                    status: p.status,
                    dueDate: p.dueDate,
                })),
                contraEntries: enrichedCEs,
            }, "Three-Way Match Detail", `Match detail for PO ${po.poNumber}`)
        );
    } catch (error) {
        logger.error("getThreeWayMatchByPO failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch three-way match detail"));
    }
};

export const getVendorReconciliation = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { vendorId } = req.params;
        if (!vendorId || !isValidObjectId(vendorId)) return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "Valid vendorId is required"));
        const { projectId, dateFrom, dateTo } = req.query;
        const vendor = await Vendor.findOne({ _id: vendorId, companyId, isDeleted: false }).lean();
        if (!vendor) return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No vendor found with the given ID"));
        const poFilter = { companyId, vendorId: new mongoose.Types.ObjectId(vendorId), isDeleted: false, status: { $nin: ["Draft", "Rejected"] } };
        if (projectId && isValidObjectId(projectId)) poFilter.projectId = new mongoose.Types.ObjectId(projectId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }
        const pos = await PurchaseOrder.find(poFilter).select("_id poNumber projectId totalOrderValue status items createdAt approvedAt").lean();
        const poIds = pos.map((p) => p._id);
        const [payables, contraEntries] = await Promise.all([
            Payable.find({ companyId, poId: { $in: poIds } }).lean(),
            ContraEntry.find({ companyId, vendorId: new mongoose.Types.ObjectId(vendorId), isDeleted: false, status: "Approved" }).lean(),
        ]);
        const payablesByPO = {};
        payables.forEach((p) => {
            const key = p.poId?.toString();
            if (!key) return;
            if (!payablesByPO[key]) payablesByPO[key] = [];
            payablesByPO[key].push(p);
        });
        const totalCommitted = pos.reduce((s, p) => s + p.totalOrderValue, 0);
        const totalReceived = pos.reduce((s, p) => s + p.items.reduce((si, i) => si + (i.receivedQuantity * i.unitPrice), 0), 0);
        const totalBilled = payables.reduce((s, p) => s + p.totalAmount, 0);
        const totalPaid = payables.reduce((s, p) => s + p.paidAmount, 0);
        const totalAdvanceDeducted = payables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
        const totalOutstanding = payables.reduce((s, p) => s + p.dueAmount, 0);
        const totalContraAdjustment = contraEntries.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        const poBreakdown = pos.map((po) => {
            const poPayables = payablesByPO[po._id.toString()] || [];
            const billed = poPayables.reduce((s, p) => s + p.totalAmount, 0);
            const paid = poPayables.reduce((s, p) => s + p.paidAmount, 0);
            const outstanding = poPayables.reduce((s, p) => s + p.dueAmount, 0);
            const receivedValue = po.items.reduce((s, i) => s + (i.receivedQuantity * i.unitPrice), 0);
            const variancePct = computeVariancePct(po.totalOrderValue, billed);
            const discrepancyFlags = [];
            if (billed > po.totalOrderValue && variancePct >= 2) discrepancyFlags.push("OVERBILLED");
            if (receivedValue < po.totalOrderValue - 0.01 && po.status === "Completed") discrepancyFlags.push("PARTIAL_DELIVERY_MARKED_COMPLETE");
            if (poPayables.length === 0 && ["Approved", "PartiallyDelivered", "Completed"].includes(po.status)) discrepancyFlags.push("NO_PAYABLE_RAISED");
            return {
                poId: po._id,
                poNumber: po.poNumber,
                projectId: po.projectId,
                poStatus: po.status,
                orderedValue: Math.round(po.totalOrderValue * 100) / 100,
                receivedValue: Math.round(receivedValue * 100) / 100,
                billedValue: Math.round(billed * 100) / 100,
                paidValue: Math.round(paid * 100) / 100,
                outstandingValue: Math.round(outstanding * 100) / 100,
                variancePct,
                varianceWithinTolerance: variancePct < 2,
                discrepancyFlags,
                payableCount: poPayables.length,
                approvedAt: po.approvedAt,
                createdAt: po.createdAt,
            };
        });
        logger.info("Vendor reconciliation fetched", { vendorId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                vendor: {
                    vendorId: vendor._id,
                    name: vendor.name,
                    contactPerson: vendor.contactPerson,
                    phone: vendor.phone,
                    advanceBalance: vendor.advanceBalance,
                    gstin: vendor.legalDetails?.gstin || null,
                },
                summary: {
                    totalPOs: pos.length,
                    totalCommitted: Math.round(totalCommitted * 100) / 100,
                    totalReceived: Math.round(totalReceived * 100) / 100,
                    totalBilled: Math.round(totalBilled * 100) / 100,
                    totalPaid: Math.round(totalPaid * 100) / 100,
                    totalAdvanceDeducted: Math.round(totalAdvanceDeducted * 100) / 100,
                    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
                    totalContraAdjustment: Math.round(totalContraAdjustment * 100) / 100,
                    netPayable: Math.round((totalBilled + totalContraAdjustment - totalPaid - totalAdvanceDeducted) * 100) / 100,
                    overbillingAmount: Math.round(Math.max(totalBilled - totalCommitted, 0) * 100) / 100,
                    advanceBalance: vendor.advanceBalance,
                },
                poBreakdown,
                contraEntries: contraEntries.map((c) => ({
                    ceId: c._id,
                    ceNumber: c.ceNumber,
                    poId: c.poId,
                    type: c.type,
                    adjustmentAmount: c.adjustmentAmount,
                    direction: c.direction,
                    reason: c.reason,
                    approvedAt: c.approvedAt,
                })),
            }, "Vendor Reconciliation", `Reconciliation statement for vendor ${vendor.name}`)
        );
    } catch (error) {
        logger.error("getVendorReconciliation failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch vendor reconciliation"));
    }
};

export const getProjectReconciliation = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        const { vendorId, dateFrom, dateTo } = req.query;
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", "No project found with the given ID"));
        const poFilter = { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false, status: { $nin: ["Draft", "Rejected"] } };
        if (vendorId && isValidObjectId(vendorId)) poFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }
        const pos = await PurchaseOrder.find(poFilter).select("_id poNumber vendorId vendorName totalOrderValue status items createdAt approvedAt").lean();
        const poIds = pos.map((p) => p._id);
        const vendorIds = [...new Set(pos.map((p) => p.vendorId.toString()))];
        const [payables, contraEntries, vendors] = await Promise.all([
            Payable.find({ companyId, poId: { $in: poIds } }).lean(),
            ContraEntry.find({ companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false, status: "Approved" }).lean(),
            Vendor.find({ _id: { $in: vendorIds }, isDeleted: false }, { _id: 1, name: 1, advanceBalance: 1 }).lean(),
        ]);
        const vendorMap = {};
        vendors.forEach((v) => { vendorMap[v._id.toString()] = v; });
        const payablesByPO = {};
        payables.forEach((p) => {
            const key = p.poId?.toString();
            if (!key) return;
            if (!payablesByPO[key]) payablesByPO[key] = [];
            payablesByPO[key].push(p);
        });
        const vendorRollup = {};
        pos.forEach((po) => {
            const vKey = po.vendorId.toString();
            if (!vendorRollup[vKey]) {
                vendorRollup[vKey] = {
                    vendorId: po.vendorId,
                    vendorName: po.vendorName,
                    advanceBalance: vendorMap[vKey]?.advanceBalance || 0,
                    poCount: 0,
                    totalCommitted: 0,
                    totalBilled: 0,
                    totalPaid: 0,
                    totalOutstanding: 0,
                    discrepancyCount: 0,
                };
            }
            const vr = vendorRollup[vKey];
            vr.poCount++;
            vr.totalCommitted += po.totalOrderValue;
            const poPayables = payablesByPO[po._id.toString()] || [];
            poPayables.forEach((p) => {
                vr.totalBilled += p.totalAmount;
                vr.totalPaid += p.paidAmount;
                vr.totalOutstanding += p.dueAmount;
            });
            const variancePct = computeVariancePct(vr.totalCommitted, vr.totalBilled);
            if (variancePct >= 2 && vr.totalBilled > vr.totalCommitted) vr.discrepancyCount++;
        });
        const totalCommitted = pos.reduce((s, p) => s + p.totalOrderValue, 0);
        const totalBilled = payables.reduce((s, p) => s + p.totalAmount, 0);
        const totalPaid = payables.reduce((s, p) => s + p.paidAmount, 0);
        const totalOutstanding = payables.reduce((s, p) => s + p.dueAmount, 0);
        const totalAdvanceDeducted = payables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
        const totalContraAdjustment = contraEntries.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        logger.info("Project reconciliation fetched", { projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                project: { projectId: project._id, projectName: project.projectName },
                summary: {
                    totalPOs: pos.length,
                    totalCommitted: Math.round(totalCommitted * 100) / 100,
                    totalBilled: Math.round(totalBilled * 100) / 100,
                    totalPaid: Math.round(totalPaid * 100) / 100,
                    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
                    totalAdvanceDeducted: Math.round(totalAdvanceDeducted * 100) / 100,
                    totalContraAdjustment: Math.round(totalContraAdjustment * 100) / 100,
                    overbillingAmount: Math.round(Math.max(totalBilled - totalCommitted, 0) * 100) / 100,
                    netPayable: Math.round((totalBilled + totalContraAdjustment - totalPaid - totalAdvanceDeducted) * 100) / 100,
                },
                vendorBreakdown: Object.values(vendorRollup).map((v) => ({
                    ...v,
                    totalCommitted: Math.round(v.totalCommitted * 100) / 100,
                    totalBilled: Math.round(v.totalBilled * 100) / 100,
                    totalPaid: Math.round(v.totalPaid * 100) / 100,
                    totalOutstanding: Math.round(v.totalOutstanding * 100) / 100,
                })),
                contraEntries: contraEntries.map((c) => ({ ceId: c._id, ceNumber: c.ceNumber, poId: c.poId, vendorId: c.vendorId, vendorName: c.vendorName, type: c.type, adjustmentAmount: c.adjustmentAmount, direction: c.direction, reason: c.reason })),
            }, "Project Reconciliation", `Reconciliation statement for project ${project.projectName}`)
        );
    } catch (error) {
        logger.error("getProjectReconciliation failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch project reconciliation"));
    }
};

export const createContraEntry = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { createdBy, poId, payableId, type, adjustmentAmount, direction, reason, remarks } = req.body;
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!poId?.trim()) missing.push("poId");
        if (!type?.trim()) missing.push("type");
        if (adjustmentAmount === undefined || adjustmentAmount === null) missing.push("adjustmentAmount");
        if (!direction?.trim()) missing.push("direction");
        if (!reason?.trim()) missing.push("reason");
        if (missing.length > 0) return res.status(400).json(new ApiErrors(400, "Missing Fields", `Required: ${missing.join(", ")}`));
        if (!isValidObjectId(poId)) return res.status(400).json(new ApiErrors(400, "Invalid PO ID", "poId must be a valid ObjectId"));
        if (Number(adjustmentAmount) <= 0) return res.status(400).json(new ApiErrors(400, "Invalid Amount", "adjustmentAmount must be a positive number"));
        const validTypes = ["QUANTITY_CORRECTION", "PRICE_CORRECTION", "OTHER"];
        if (!validTypes.includes(type)) return res.status(400).json(new ApiErrors(400, "Invalid Type", `type must be one of: ${validTypes.join(", ")}`));
        if (!["DEBIT_VENDOR", "CREDIT_VENDOR"].includes(direction)) return res.status(400).json(new ApiErrors(400, "Invalid Direction", "direction must be DEBIT_VENDOR or CREDIT_VENDOR"));
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`));
        const po = await PurchaseOrder.findOne({ _id: poId, companyId, isDeleted: false }).lean();
        if (!po) return res.status(404).json(new ApiErrors(404, "PO Not Found", "No PO found with the given ID for this company"));
        const payables = await Payable.find({ companyId, poId: po._id }).lean();
        const billedValue = payables.reduce((s, p) => s + p.totalAmount, 0);
        const existingCEs = await ContraEntry.find({ companyId, poId: po._id, isDeleted: false, status: "Approved" }).lean();
        const existingCEAdjustment = existingCEs.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        const netBilled = billedValue + existingCEAdjustment;
        const variancePct = computeVariancePct(po.totalOrderValue, netBilled);
        if (variancePct < 2) {
            return res.status(400).json(new ApiErrors(400, "Match Within Tolerance", `This PO's variance is ${variancePct}% which is within the 2% tolerance threshold. Contra entries are only allowed when variance ≥ 2%`));
        }
        if (payableId) {
            if (!isValidObjectId(payableId)) return res.status(400).json(new ApiErrors(400, "Invalid Payable ID", "payableId must be a valid ObjectId"));
            const payable = await Payable.findOne({ _id: payableId, companyId }).lean();
            if (!payable) return res.status(404).json(new ApiErrors(404, "Payable Not Found", "No payable found with the given ID"));
        }
        const ceNumber = await generateCENumber(companyId);
        const ce = await ContraEntry.create({
            companyId,
            projectId: po.projectId,
            ceNumber,
            poId: po._id,
            poNumber: po.poNumber,
            vendorId: po.vendorId,
            vendorName: po.vendorName,
            payableId: payableId ? new mongoose.Types.ObjectId(payableId) : null,
            type,
            adjustmentAmount: Number(adjustmentAmount),
            direction,
            reason: reason.trim(),
            remarks: remarks?.trim() || null,
            status: "Draft",
            createdBy: creatorUser._id,
        });
        logger.info("Contra entry created", { ceId: ce._id, ceNumber, poId, companyId, variancePct });
        return res.status(201).json(new ApiResponse(201, { contraEntry: ce, variancePct }, "Contra Entry Created", `Contra Entry ${ceNumber} created as Draft`));
    } catch (error) {
        logger.error("createContraEntry failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to create contra entry"));
    }
};

export const submitContraEntry = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { ceId } = req.params;
        const { updatedBy } = req.body;
        if (!ceId || !isValidObjectId(ceId)) return res.status(400).json(new ApiErrors(400, "Invalid CE ID", "Valid ceId is required"));
        if (!updatedBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "updatedBy is required"));
        const actionUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`));
        const ce = await ContraEntry.findOne({ _id: ceId, companyId, isDeleted: false });
        if (!ce) return res.status(404).json(new ApiErrors(404, "Not Found", "No contra entry found with the given ID"));
        if (ce.status !== "Draft") return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot submit a contra entry in '${ce.status}' status`));
        ce.status = "Submitted";
        ce.submittedAt = new Date();
        ce.submittedBy = actionUser._id;
        ce.updatedBy = actionUser._id;
        await ce.save();
        logger.info("Contra entry submitted", { ceId: ce._id, ceNumber: ce.ceNumber });
        return res.status(200).json(new ApiResponse(200, { contraEntry: ce }, "Submitted", `Contra Entry ${ce.ceNumber} submitted for approval`));
    } catch (error) {
        logger.error("submitContraEntry failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to submit contra entry"));
    }
};

export const approveContraEntry = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { ceId } = req.params;
        const { actionBy } = req.body;
        if (!ceId || !isValidObjectId(ceId)) return res.status(400).json(new ApiErrors(400, "Invalid CE ID", "Valid ceId is required"));
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));
        const ce = await ContraEntry.findOne({ _id: ceId, companyId, isDeleted: false });
        if (!ce) return res.status(404).json(new ApiErrors(404, "Not Found", "No contra entry found with the given ID"));
        if (ce.status !== "Submitted") return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot approve a contra entry in '${ce.status}' status`));
        if (ce.createdBy.toString() === actionUser._id.toString()) return res.status(403).json(new ApiErrors(403, "Self-Approval Not Allowed", "You cannot approve a contra entry you created"));
        ce.status = "Approved";
        ce.approvedAt = new Date();
        ce.approvedBy = actionUser._id;
        ce.updatedBy = actionUser._id;
        await ce.save();
        logger.info("Contra entry approved", { ceId: ce._id, ceNumber: ce.ceNumber });
        return res.status(200).json(new ApiResponse(200, { contraEntry: ce }, "Approved", `Contra Entry ${ce.ceNumber} has been approved`));
    } catch (error) {
        logger.error("approveContraEntry failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to approve contra entry"));
    }
};

export const rejectContraEntry = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { ceId } = req.params;
        const { actionBy, rejectionRemarks } = req.body;
        if (!ceId || !isValidObjectId(ceId)) return res.status(400).json(new ApiErrors(400, "Invalid CE ID", "Valid ceId is required"));
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));
        const ce = await ContraEntry.findOne({ _id: ceId, companyId, isDeleted: false });
        if (!ce) return res.status(404).json(new ApiErrors(404, "Not Found", "No contra entry found with the given ID"));
        if (ce.status !== "Submitted") return res.status(400).json(new ApiErrors(400, "Invalid Action", `Cannot reject a contra entry in '${ce.status}' status`));
        if (ce.createdBy.toString() === actionUser._id.toString()) return res.status(403).json(new ApiErrors(403, "Self-Rejection Not Allowed", "You cannot reject a contra entry you created"));
        ce.status = "Rejected";
        ce.rejectedAt = new Date();
        ce.rejectedBy = actionUser._id;
        ce.rejectionRemarks = rejectionRemarks?.trim() || null;
        ce.updatedBy = actionUser._id;
        await ce.save();
        logger.info("Contra entry rejected", { ceId: ce._id, ceNumber: ce.ceNumber });
        return res.status(200).json(new ApiResponse(200, { contraEntry: ce }, "Rejected", `Contra Entry ${ce.ceNumber} has been rejected`));
    } catch (error) {
        logger.error("rejectContraEntry failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to reject contra entry"));
    }
};

export const getAllContraEntries = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const activeProjects = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const { projectId, vendorId, poId, status, type, page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSortFields = ["createdAt", "ceNumber", "adjustmentAmount"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        if (projectId && isValidObjectId(projectId)) filter.projectId = new mongoose.Types.ObjectId(projectId);
        if (vendorId && isValidObjectId(vendorId)) filter.vendorId = new mongoose.Types.ObjectId(vendorId);
        if (poId && isValidObjectId(poId)) filter.poId = new mongoose.Types.ObjectId(poId);
        if (status) filter.status = status;
        if (type) filter.type = type;
        const [ces, total] = await Promise.all([
            ContraEntry.find(filter).select("-__v -isDeleted -deletedAt").sort({ [sortField]: sortOrder }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
            ContraEntry.countDocuments(filter),
        ]);
        const enrichedCEs = await Promise.all(ces.map(async (ce) => ({
            ...ce,
            createdBy: await enrichUser(ce.createdBy),
            updatedBy: await enrichUser(ce.updatedBy),
            submittedBy: await enrichUser(ce.submittedBy),
            approvedBy: await enrichUser(ce.approvedBy),
            rejectedBy: await enrichUser(ce.rejectedBy),
        })));
        logger.info("Contra entries fetched", { companyId, total });
        return res.status(200).json(
            new ApiResponse(200, {
                contraEntries: enrichedCEs,
                pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
            }, total > 0 ? "Contra Entries Retrieved" : "No Contra Entries Found", `Fetched ${ces.length} contra entr${ces.length === 1 ? "y" : "ies"}`)
        );
    } catch (error) {
        logger.error("getAllContraEntries failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch contra entries"));
    }
};

export const getMaterialReconciliation = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const {
            projectId, status: filterStatus, search,
            page = 1, limit = 20, sortBy = "materialName", order = "asc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;

        const invFilter = { companyId, isDeleted: false };
        if (projectId && isValidObjectId(projectId)) invFilter.projectId = new mongoose.Types.ObjectId(projectId);
        if (search?.trim()) invFilter.name = new RegExp(search.trim(), "i");

        const inventories = await Inventory.find(invFilter).lean();
        if (inventories.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalMaterials: 0, matchedCount: 0, reconciledCount: 0, shortageCount: 0, overIssuedCount: 0, notOrderedCount: 0, pendingDeliveryCount: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Materials", "No inventory found for this company"));
        }

        const inventoryIds = inventories.map((i) => i._id);
        const materialMasterIds = inventories.map((i) => i.materialMasterId);
        const projectIds = [...new Set(inventories.map((i) => i.projectId.toString()))];

        const activeProjects = await Project.find({ _id: { $in: projectIds }, companyId, isDeleted: false }, { _id: 1, projectName: 1 }).lean();
        const activeProjectIds = new Set(activeProjects.map((p) => p._id.toString()));
        const projectMap = {};
        activeProjects.forEach((p) => { projectMap[p._id.toString()] = p.projectName; });

        const activeInventories = inventories.filter((i) => activeProjectIds.has(i.projectId.toString()));
        if (activeInventories.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalMaterials: 0, matchedCount: 0, reconciledCount: 0, shortageCount: 0, overIssuedCount: 0, notOrderedCount: 0, pendingDeliveryCount: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Materials", "No inventory found for active projects"));
        }

        const activeInventoryIds = activeInventories.map((i) => i._id);
        const activeProjectObjIds = activeProjects.map((p) => p._id);

        const [mrs, pos, consumptions, approvedAdjustments, approvedMovements] = await Promise.all([
            MaterialRequisition.find({ companyId, projectId: { $in: activeProjectObjIds }, isDeleted: false, status: { $in: ["Approved", "ConvertedToPO"] } }).select("projectId items").lean(),
            PurchaseOrder.find({ companyId, projectId: { $in: activeProjectObjIds }, isDeleted: false, status: { $nin: ["Draft", "Rejected"] } }).select("projectId items").lean(),
            MaterialConsumption.find({ companyId, inventoryId: { $in: activeInventoryIds }, isDeleted: false }).select("inventoryId quantityConsumed").lean(),
            StockAdjustment.find({ companyId, inventoryId: { $in: activeInventoryIds }, isDeleted: false, status: "Approved" }).select("inventoryId adjustmentType quantity").lean(),
            StockMovement.find({ companyId, inventoryId: { $in: activeInventoryIds }, isDeleted: false, status: "Approved" }).select("inventoryId quantity movementType").lean(),
        ]);

        const requiredByMaterial = {};
        mrs.forEach((mr) => {
            mr.items.forEach((item) => {
                const key = item.materialMasterId.toString();
                if (!requiredByMaterial[key]) requiredByMaterial[key] = 0;
                requiredByMaterial[key] += item.requiredQuantity;
            });
        });

        const orderedByMaterial = {};
        pos.forEach((po) => {
            po.items.forEach((item) => {
                const key = item.materialMasterId.toString();
                if (!orderedByMaterial[key]) orderedByMaterial[key] = { qty: 0, value: 0 };
                orderedByMaterial[key].qty += item.orderedQuantity;
                orderedByMaterial[key].value += item.totalPrice;
            });
        });

        const receivedByMaterial = {};
        pos.forEach((po) => {
            po.items.forEach((item) => {
                const key = item.materialMasterId.toString();
                if (!receivedByMaterial[key]) receivedByMaterial[key] = 0;
                receivedByMaterial[key] += item.receivedQuantity;
            });
        });

        const issuedByInventory = {};
        consumptions.forEach((c) => {
            const key = c.inventoryId.toString();
            if (!issuedByInventory[key]) issuedByInventory[key] = 0;
            issuedByInventory[key] += c.quantityConsumed;
        });

        const adjustmentByInventory = {};
        approvedAdjustments.forEach((a) => {
            const key = a.inventoryId.toString();
            if (!adjustmentByInventory[key]) adjustmentByInventory[key] = { positive: 0, negative: 0 };
            if (a.adjustmentType === "add") adjustmentByInventory[key].positive += a.quantity;
            else adjustmentByInventory[key].negative += a.quantity;
        });

        const transferByInventory = {};
        approvedMovements.forEach((m) => {
            const key = m.inventoryId.toString();
            if (!transferByInventory[key]) transferByInventory[key] = { in: 0, out: 0 };
            if (m.movementType === "Incoming") transferByInventory[key].in += m.quantity;
            else transferByInventory[key].out += m.quantity;
        });

        let allRecords = activeInventories.map((inv) => {
            const mmKey = inv.materialMasterId.toString();
            const invKey = inv._id.toString();

            const requiredQty = requiredByMaterial[mmKey] || 0;
            const orderedQty = orderedByMaterial[mmKey]?.qty || 0;
            const receivedQty = receivedByMaterial[mmKey] || 0;
            const issuedQty = issuedByInventory[invKey] || 0;
            const positiveAdj = adjustmentByInventory[invKey]?.positive || 0;
            const negativeAdj = adjustmentByInventory[invKey]?.negative || 0;
            const netAdjusted = positiveAdj - negativeAdj;

            const reconciliationStatus = computeMaterialReconciliationStatus({
                requiredQty,
                orderedQty,
                receivedQty,
                issuedQty,
                adjustedQty: netAdjusted,
            });

            const discrepancyFlags = [];
            if (orderedQty > requiredQty + 0.001) discrepancyFlags.push("EXCESS_ORDERED");
            if (orderedQty < requiredQty - 0.001 && requiredQty > 0) discrepancyFlags.push("SHORT_ORDERED");
            if (receivedQty < orderedQty - 0.001 && orderedQty > 0) discrepancyFlags.push("PARTIAL_DELIVERY");
            if (issuedQty > receivedQty + netAdjusted + 0.001) discrepancyFlags.push("OVER_ISSUED");

            return {
                inventoryId: inv._id,
                materialMasterId: inv.materialMasterId,
                materialName: inv.name,
                unit: inv.unit,
                category: inv.category || null,
                projectId: inv.projectId,
                projectName: projectMap[inv.projectId.toString()],
                requiredQty: Math.round(requiredQty * 1000) / 1000,
                orderedQty: Math.round(orderedQty * 1000) / 1000,
                receivedQty: Math.round(receivedQty * 1000) / 1000,
                issuedQty: Math.round(issuedQty * 1000) / 1000,
                currentStock: Math.round(inv.currentStock * 1000) / 1000,
                shortageQty: Math.round(Math.max(requiredQty - receivedQty, 0) * 1000) / 1000,
                reconciliationStatus,
                discrepancyFlags,
            };
        });

        if (filterStatus) allRecords = allRecords.filter((r) => r.reconciliationStatus === filterStatus);

        allRecords.sort((a, b) => {
            const va = a[sortBy] ?? a.materialName;
            const vb = b[sortBy] ?? b.materialName;
            if (typeof va === "string") return sortOrder === 1 ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortOrder === 1 ? va - vb : vb - va;
        });

        const total = allRecords.length;
        const paginatedRecords = allRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

        const summary = {
            totalMaterials: total,
            matchedCount: allRecords.filter((r) => r.reconciliationStatus === "MATCHED").length,
            reconciledCount: allRecords.filter((r) => r.reconciliationStatus === "RECONCILED").length,
            shortageCount: allRecords.filter((r) => r.reconciliationStatus === "PARTIAL_DELIVERY").length,
            overIssuedCount: allRecords.filter((r) => r.reconciliationStatus === "OVER_ISSUED").length,
            notOrderedCount: allRecords.filter((r) => r.reconciliationStatus === "NOT_ORDERED").length,
            pendingDeliveryCount: allRecords.filter((r) => r.reconciliationStatus === "PENDING_DELIVERY").length,
        };

        logger.info("Material reconciliation fetched", { companyId, total });
        return res.status(200).json(
            new ApiResponse(200, {
                summary,
                records: paginatedRecords,
                pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
            }, "Material Reconciliation Retrieved", `Fetched ${paginatedRecords.length} material record(s)`)
        );
    } catch (error) {
        logger.error("getMaterialReconciliation failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch material reconciliation"));
    }
};

export const getInventoryReconciliation = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const {
            projectId, materialId, categoryId, status: filterStatus, search,
            page = 1, limit = 20, sortBy = "materialName", order = "asc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;

        const invFilter = { companyId, isDeleted: false };
        if (projectId && isValidObjectId(projectId)) invFilter.projectId = new mongoose.Types.ObjectId(projectId);
        if (materialId && isValidObjectId(materialId)) invFilter.materialMasterId = new mongoose.Types.ObjectId(materialId);
        if (categoryId) invFilter.category = categoryId;
        if (search?.trim()) invFilter.name = new RegExp(search.trim(), "i");

        const inventories = await Inventory.find(invFilter).lean();
        if (inventories.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalItems: 0, totalInventoryValue: 0, matchedItemCount: 0, shortageItemCount: 0, excessItemCount: 0, zeroStockCount: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Inventory", "No inventory records found"));
        }

        const projectIds = [...new Set(inventories.map((i) => i.projectId.toString()))];
        const activeProjects = await Project.find({ _id: { $in: projectIds }, companyId, isDeleted: false }, { _id: 1, projectName: 1 }).lean();
        const activeProjectIds = new Set(activeProjects.map((p) => p._id.toString()));
        const projectMap = {};
        activeProjects.forEach((p) => { projectMap[p._id.toString()] = p.projectName; });

        const activeInventories = inventories.filter((i) => activeProjectIds.has(i.projectId.toString()));
        if (activeInventories.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalItems: 0, totalInventoryValue: 0, matchedItemCount: 0, shortageItemCount: 0, excessItemCount: 0, zeroStockCount: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Inventory", "No inventory found for active projects"));
        }

        const activeInventoryIds = activeInventories.map((i) => i._id);

        const [approvedAdjustments, approvedMovements, consumptions] = await Promise.all([
            StockAdjustment.find({ companyId, inventoryId: { $in: activeInventoryIds }, isDeleted: false, status: "Approved" }).select("inventoryId adjustmentType quantity").lean(),
            StockMovement.find({ companyId, inventoryId: { $in: activeInventoryIds }, isDeleted: false, status: "Approved" }).select("inventoryId quantity movementType").lean(),
            MaterialConsumption.find({ companyId, inventoryId: { $in: activeInventoryIds }, isDeleted: false }).select("inventoryId quantityConsumed").lean(),
        ]);

        const adjByInventory = {};
        approvedAdjustments.forEach((a) => {
            const key = a.inventoryId.toString();
            if (!adjByInventory[key]) adjByInventory[key] = { positive: 0, negative: 0 };
            if (a.adjustmentType === "add") adjByInventory[key].positive += a.quantity;
            else adjByInventory[key].negative += a.quantity;
        });

        const moveByInventory = {};
        approvedMovements.forEach((m) => {
            const key = m.inventoryId.toString();
            if (!moveByInventory[key]) moveByInventory[key] = { in: 0, out: 0 };
            if (m.movementType === "Incoming") moveByInventory[key].in += m.quantity;
            else moveByInventory[key].out += m.quantity;
        });

        const consumeByInventory = {};
        consumptions.forEach((c) => {
            const key = c.inventoryId.toString();
            if (!consumeByInventory[key]) consumeByInventory[key] = 0;
            consumeByInventory[key] += c.quantityConsumed;
        });

        let allRecords = activeInventories.map((inv) => {
            const key = inv._id.toString();
            const posAdj = adjByInventory[key]?.positive || 0;
            const negAdj = adjByInventory[key]?.negative || 0;
            const transferIn = moveByInventory[key]?.in || 0;
            const transferOut = moveByInventory[key]?.out || 0;
            const issuedQty = consumeByInventory[key] || 0;
            const totalReceived = inv.totalReceived || 0;

            const expectedClosingStock = Math.max(totalReceived + posAdj + transferIn - issuedQty - negAdj - transferOut, 0);
            const currentStock = inv.currentStock;
            const varianceQuantity = Math.round((currentStock - expectedClosingStock) * 1000) / 1000;
            const reconciliationStatus = computeInventoryReconciliationStatus({ expectedClosingStock, currentStock });

            return {
                inventoryId: inv._id,
                materialMasterId: inv.materialMasterId,
                materialName: inv.name,
                category: inv.category || null,
                projectId: inv.projectId,
                projectName: projectMap[inv.projectId.toString()],
                unit: inv.unit,
                totalReceived: Math.round(totalReceived * 1000) / 1000,
                totalConsumed: Math.round(issuedQty * 1000) / 1000,
                currentStock: Math.round(currentStock * 1000) / 1000,
                expectedClosingStock: Math.round(expectedClosingStock * 1000) / 1000,
                varianceQuantity,
                inventoryValue: Math.round(currentStock * inv.pricePerUnit * 100) / 100,
                pricePerUnit: inv.pricePerUnit,
                reconciliationStatus,
                lastRestockedAt: inv.lastRestockedAt,
            };
        });

        if (filterStatus) allRecords = allRecords.filter((r) => r.reconciliationStatus === filterStatus);

        allRecords.sort((a, b) => {
            const va = a[sortBy] ?? a.materialName;
            const vb = b[sortBy] ?? b.materialName;
            if (typeof va === "string") return sortOrder === 1 ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortOrder === 1 ? va - vb : vb - va;
        });

        const total = allRecords.length;
        const paginatedRecords = allRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

        const summary = {
            totalItems: total,
            totalInventoryValue: Math.round(allRecords.reduce((s, r) => s + r.inventoryValue, 0) * 100) / 100,
            matchedItemCount: allRecords.filter((r) => r.reconciliationStatus === "MATCHED").length,
            shortageItemCount: allRecords.filter((r) => r.reconciliationStatus === "SHORTAGE").length,
            excessItemCount: allRecords.filter((r) => r.reconciliationStatus === "EXCESS").length,
            zeroStockCount: allRecords.filter((r) => r.reconciliationStatus === "ZERO_STOCK").length,
        };

        logger.info("Inventory reconciliation fetched", { companyId, total });
        return res.status(200).json(
            new ApiResponse(200, {
                summary,
                records: paginatedRecords,
                pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
            }, "Inventory Reconciliation Retrieved", `Fetched ${paginatedRecords.length} inventory record(s)`)
        );
    } catch (error) {
        logger.error("getInventoryReconciliation failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch inventory reconciliation"));
    }
};

export const getPurchaseReconciliation = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const {
            projectId, vendorId, matchStatus, search,
            page = 1, limit = 20, sortBy = "createdAt", order = "desc",
            dateFrom, dateTo,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSortFields = ["createdAt", "poNumber", "totalOrderValue"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

        const activeProjectFilter = { companyId, isDeleted: false };
        if (projectId && isValidObjectId(projectId)) activeProjectFilter._id = new mongoose.Types.ObjectId(projectId);
        const activeProjects = await Project.find(activeProjectFilter, { _id: 1, projectName: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const projectMap = {};
        activeProjects.forEach((p) => { projectMap[p._id.toString()] = p.projectName; });

        if (activeProjectIds.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalPOs: 0, totalOrderValue: 0, totalBilledValue: 0, totalPaidValue: 0, totalOutstandingAmount: 0, matchedPOCount: 0, unmatchedPOCount: 0, pendingGRNCount: 0, pendingInvoiceCount: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Records", "No active projects found"));
        }

        const poFilter = {
            companyId,
            projectId: { $in: activeProjectIds },
            isDeleted: false,
            status: { $in: ["Approved", "PartiallyDelivered", "Completed", "Cancelled"] },
        };
        if (vendorId && isValidObjectId(vendorId)) poFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            poFilter.$or = [{ poNumber: regex }, { vendorName: regex }];
        }

        const allPOs = await PurchaseOrder.find(poFilter)
            .select("_id poNumber projectId vendorId vendorName totalOrderValue items status createdAt approvedAt")
            .sort({ [sortField]: sortOrder })
            .lean();

        if (allPOs.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalPOs: 0, totalOrderValue: 0, totalBilledValue: 0, totalPaidValue: 0, totalOutstandingAmount: 0, matchedPOCount: 0, unmatchedPOCount: 0, pendingGRNCount: 0, pendingInvoiceCount: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Records", "No POs found"));
        }

        const poIds = allPOs.map((p) => p._id);

        const [grns, payables, contraEntries] = await Promise.all([
            GRN.find({ companyId, poId: { $in: poIds }, isDeleted: false }).select("_id poId items").lean(),
            Payable.find({ companyId, poId: { $in: poIds } }).select("_id poId totalAmount paidAmount dueAmount advanceDeducted status").lean(),
            ContraEntry.find({ companyId, poId: { $in: poIds }, isDeleted: false, status: "Approved" }).select("_id poId adjustmentAmount direction").lean(),
        ]);

        const grnByPO = {};
        grns.forEach((g) => {
            const key = g.poId.toString();
            if (!grnByPO[key]) grnByPO[key] = [];
            grnByPO[key].push(g);
        });
        const payableByPO = {};
        payables.forEach((p) => {
            const key = p.poId.toString();
            if (!payableByPO[key]) payableByPO[key] = [];
            payableByPO[key].push(p);
        });
        const ceByPO = {};
        contraEntries.forEach((c) => {
            const key = c.poId.toString();
            if (!ceByPO[key]) ceByPO[key] = [];
            ceByPO[key].push(c);
        });

        let allRecords = allPOs.map((po) => {
            const poKey = po._id.toString();
            const poGRNs = grnByPO[poKey] || [];
            const poPayables = payableByPO[poKey] || [];
            const poCEs = ceByPO[poKey] || [];

            const orderedQty = po.items.reduce((s, i) => s + i.orderedQuantity, 0);
            const receivedQty = po.items.reduce((s, i) => s + i.receivedQuantity, 0);
            const orderedValue = po.totalOrderValue;
            const receivedValue = po.items.reduce((s, i) => s + (i.receivedQuantity * i.unitPrice), 0);
            const billedValue = poPayables.reduce((s, p) => s + p.totalAmount, 0);
            const paidValue = poPayables.reduce((s, p) => s + p.paidAmount, 0);
            const outstandingAmount = poPayables.reduce((s, p) => s + p.dueAmount, 0);
            const advanceDeducted = poPayables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
            const contraAdjustment = poCEs.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
            const netBilledAmount = billedValue + contraAdjustment;
            const variancePercentage = computeVariancePct(orderedValue, netBilledAmount);

            const matchStatus = computePurchaseMatchStatus({
                hasGRN: poGRNs.length > 0,
                hasPayable: poPayables.length > 0,
                orderedQty,
                receivedQty,
                orderedValue,
                netBilledValue: netBilledAmount,
            });

            const discrepancyFlags = computePurchaseDiscrepancyFlags({
                hasGRN: poGRNs.length > 0,
                hasPayable: poPayables.length > 0,
                orderedQty,
                receivedQty,
                orderedValue,
                netBilledValue: netBilledAmount,
                variancePct: variancePercentage,
                payableCount: poPayables.length,
                grnCount: poGRNs.length,
                paymentPending: outstandingAmount > 0,
            });

            return {
                poId: po._id,
                poNumber: po.poNumber,
                projectId: po.projectId,
                projectName: projectMap[po.projectId?.toString()] || null,
                vendorId: po.vendorId,
                vendorName: po.vendorName,
                poStatus: po.status,
                orderedValue: Math.round(orderedValue * 100) / 100,
                receivedValue: Math.round(receivedValue * 100) / 100,
                billedValue: Math.round(billedValue * 100) / 100,
                paidValue: Math.round(paidValue * 100) / 100,
                outstandingAmount: Math.round(outstandingAmount * 100) / 100,
                advanceDeducted: Math.round(advanceDeducted * 100) / 100,
                netBilledAmount: Math.round(netBilledAmount * 100) / 100,
                variancePercentage,
                varianceWithinTolerance: variancePercentage < 2,
                matchStatus,
                discrepancyFlags,
                grnCount: poGRNs.length,
                payableCount: poPayables.length,
                approvedAt: po.approvedAt,
                createdAt: po.createdAt,
            };
        });

        if (matchStatus) allRecords = allRecords.filter((r) => r.matchStatus === matchStatus);

        const total = allRecords.length;
        const paginatedRecords = allRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

        const summary = {
            totalPOs: allRecords.length,
            totalOrderValue: Math.round(allRecords.reduce((s, r) => s + r.orderedValue, 0) * 100) / 100,
            totalBilledValue: Math.round(allRecords.reduce((s, r) => s + r.billedValue, 0) * 100) / 100,
            totalPaidValue: Math.round(allRecords.reduce((s, r) => s + r.paidValue, 0) * 100) / 100,
            totalOutstandingAmount: Math.round(allRecords.reduce((s, r) => s + r.outstandingAmount, 0) * 100) / 100,
            totalNetBilledAmount: Math.round(allRecords.reduce((s, r) => s + r.netBilledAmount, 0) * 100) / 100,
            matchedPOCount: allRecords.filter((r) => r.matchStatus === "MATCHED").length,
            toleratedPOCount: allRecords.filter((r) => r.matchStatus === "TOLERATED").length,
            unmatchedPOCount: allRecords.filter((r) => r.matchStatus === "UNMATCHED").length,
            pendingGRNCount: allRecords.filter((r) => r.matchStatus === "PENDING_GRN").length,
            pendingInvoiceCount: allRecords.filter((r) => r.matchStatus === "PENDING_INVOICE").length,
            overBilledCount: allRecords.filter((r) => r.matchStatus === "OVER_BILLED").length,
            underBilledCount: allRecords.filter((r) => r.matchStatus === "UNDER_BILLED").length,
        };

        logger.info("Purchase reconciliation fetched", { companyId, total });
        return res.status(200).json(
            new ApiResponse(200, {
                summary,
                records: paginatedRecords,
                pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
            }, "Purchase Reconciliation Retrieved", `Fetched ${paginatedRecords.length} purchase record(s)`)
        );
    } catch (error) {
        logger.error("getPurchaseReconciliation failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch purchase reconciliation"));
    }
};

export const getPurchaseReconciliationByPO = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { poId } = req.params;
        if (!poId || !isValidObjectId(poId)) return res.status(400).json(new ApiErrors(400, "Invalid PO ID", "Valid poId is required"));

        const po = await PurchaseOrder.findOne({ _id: poId, companyId, isDeleted: false }).lean();
        if (!po) return res.status(404).json(new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID"));

        const [grns, payables, contraEntries] = await Promise.all([
            GRN.find({ companyId, poId: po._id, isDeleted: false }).lean(),
            Payable.find({ companyId, poId: po._id }).lean(),
            ContraEntry.find({ companyId, poId: po._id, isDeleted: false }).lean(),
        ]);

        const orderedQty = po.items.reduce((s, i) => s + i.orderedQuantity, 0);
        const receivedQty = po.items.reduce((s, i) => s + i.receivedQuantity, 0);
        const orderedValue = po.totalOrderValue;
        const receivedValue = po.items.reduce((s, i) => s + (i.receivedQuantity * i.unitPrice), 0);
        const billedValue = payables.reduce((s, p) => s + p.totalAmount, 0);
        const paidValue = payables.reduce((s, p) => s + p.paidAmount, 0);
        const outstandingAmount = payables.reduce((s, p) => s + p.dueAmount, 0);
        const advanceDeducted = payables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
        const approvedCEs = contraEntries.filter((c) => c.status === "Approved");
        const contraAdjustment = approvedCEs.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        const netBilledAmount = billedValue + contraAdjustment;
        const varianceAmount = Math.round((netBilledAmount - orderedValue) * 100) / 100;
        const variancePercentage = computeVariancePct(orderedValue, netBilledAmount);

        const matchStatus = computePurchaseMatchStatus({
            hasGRN: grns.length > 0,
            hasPayable: payables.length > 0,
            orderedQty,
            receivedQty,
            orderedValue,
            netBilledValue: netBilledAmount,
        });

        const discrepancyFlags = computePurchaseDiscrepancyFlags({
            hasGRN: grns.length > 0,
            hasPayable: payables.length > 0,
            orderedQty,
            receivedQty,
            orderedValue,
            netBilledValue: netBilledAmount,
            variancePct: variancePercentage,
            payableCount: payables.length,
            grnCount: grns.length,
            paymentPending: outstandingAmount > 0,
        });

        const itemLevelReconciliation = po.items.map((item) => {
            const itemReceivedQty = grns.reduce((s, g) => {
                const found = g.items.find((gi) => gi.materialMasterId.toString() === item.materialMasterId.toString());
                return s + (found?.receivedQuantity || 0);
            }, 0);
            const itemReceivedValue = itemReceivedQty * item.unitPrice;
            const itemVarianceQty = itemReceivedQty - item.orderedQuantity;
            const itemVariancePct = item.orderedQuantity > 0
                ? Math.round((Math.abs(itemVarianceQty) / item.orderedQuantity) * 10000) / 100
                : 0;
            const itemStatus = Math.abs(itemVarianceQty) < 0.001 ? "MATCHED"
                : itemReceivedQty < item.orderedQuantity ? "SHORT"
                    : "EXCESS";
            return {
                materialMasterId: item.materialMasterId,
                materialName: item.materialName,
                unit: item.unit,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: Math.round(itemReceivedQty * 1000) / 1000,
                pendingQuantity: Math.round(Math.max(item.orderedQuantity - itemReceivedQty, 0) * 1000) / 1000,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                receivedValue: Math.round(itemReceivedValue * 100) / 100,
                varianceQuantity: Math.round(itemVarianceQty * 1000) / 1000,
                variancePercentage: itemVariancePct,
                itemStatus,
            };
        });

        const payableIds = payables.map((p) => p._id);
        const paymentTransactions = await PaymentTransaction.find({ payableId: { $in: payableIds } })
            .select("payableId amount advanceDeducted totalSettled paymentDate paymentMode referenceNumber createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const enrichedCEs = await Promise.all(contraEntries.map(async (ce) => ({
            ceId: ce._id,
            ceNumber: ce.ceNumber,
            type: ce.type,
            adjustmentAmount: ce.adjustmentAmount,
            direction: ce.direction,
            reason: ce.reason,
            status: ce.status,
            createdBy: await enrichUser(ce.createdBy),
            approvedBy: await enrichUser(ce.approvedBy),
            approvedAt: ce.approvedAt,
            createdAt: ce.createdAt,
        })));

        logger.info("Purchase reconciliation by PO fetched", { poId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                po: {
                    poId: po._id,
                    poNumber: po.poNumber,
                    poStatus: po.status,
                    vendorId: po.vendorId,
                    vendorName: po.vendorName,
                    projectId: po.projectId,
                    totalOrderValue: po.totalOrderValue,
                    expectedDeliveryDate: po.expectedDeliveryDate,
                    approvedAt: po.approvedAt,
                    createdAt: po.createdAt,
                },
                matchStatus,
                discrepancyFlags,
                financials: {
                    orderedValue: Math.round(orderedValue * 100) / 100,
                    receivedValue: Math.round(receivedValue * 100) / 100,
                    billedValue: Math.round(billedValue * 100) / 100,
                    paidValue: Math.round(paidValue * 100) / 100,
                    outstandingAmount: Math.round(outstandingAmount * 100) / 100,
                    advanceDeducted: Math.round(advanceDeducted * 100) / 100,
                    contraAdjustment: Math.round(contraAdjustment * 100) / 100,
                    netBilledAmount: Math.round(netBilledAmount * 100) / 100,
                    varianceAmount,
                    variancePercentage,
                    varianceWithinTolerance: variancePercentage < 2,
                },
                quantities: {
                    orderedQty: Math.round(orderedQty * 1000) / 1000,
                    receivedQty: Math.round(receivedQty * 1000) / 1000,
                    pendingQty: Math.round(Math.max(orderedQty - receivedQty, 0) * 1000) / 1000,
                    fulfilmentRate: orderedQty > 0 ? Math.round((receivedQty / orderedQty) * 1000) / 10 : 0,
                },
                itemLevelReconciliation,
                grns: grns.map((g) => ({
                    grnId: g._id,
                    grnNumber: g.grnNumber,
                    deliveryDate: g.deliveryDate,
                    deliveryChallanNumber: g.deliveryChallanNumber,
                    itemCount: g.items.length,
                    createdAt: g.createdAt,
                })),
                payables: payables.map((p) => ({
                    payableId: p._id,
                    payableNumber: p.payableNumber,
                    sourceNumber: p.sourceNumber,
                    totalAmount: p.totalAmount,
                    paidAmount: p.paidAmount,
                    dueAmount: p.dueAmount,
                    advanceDeducted: p.advanceDeducted,
                    status: p.status,
                    dueDate: p.dueDate,
                })),
                paymentSummary: {
                    totalTransactions: paymentTransactions.length,
                    totalCashPaid: Math.round(paymentTransactions.reduce((s, t) => s + (t.amount || 0), 0) * 100) / 100,
                    totalAdvanceUsed: Math.round(paymentTransactions.reduce((s, t) => s + (t.advanceDeducted || 0), 0) * 100) / 100,
                    totalSettled: Math.round(paymentTransactions.reduce((s, t) => s + (t.totalSettled || 0), 0) * 100) / 100,
                    transactions: paymentTransactions,
                },
                contraEntries: enrichedCEs,
            }, "Purchase Reconciliation Detail", `Purchase reconciliation for PO ${po.poNumber}`)
        );
    } catch (error) {
        logger.error("getPurchaseReconciliationByPO failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch purchase reconciliation detail"));
    }
};



export const getFinancialReconciliation = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const {
            projectId, vendorId, status: filterStatus, search,
            page = 1, limit = 20, sortBy = "vendorName", order = "asc",
            dateFrom, dateTo,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;

        const activeProjectFilter = { companyId, isDeleted: false };
        if (projectId && isValidObjectId(projectId)) activeProjectFilter._id = new mongoose.Types.ObjectId(projectId);
        const activeProjects = await Project.find(activeProjectFilter, { _id: 1, projectName: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const projectMap = {};
        activeProjects.forEach((p) => { projectMap[p._id.toString()] = p.projectName; });

        if (activeProjectIds.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalVendors: 0, totalCommittedAmount: 0, totalBilledAmount: 0, totalPaidAmount: 0, totalOutstandingAmount: 0, totalNetPayable: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Records", "No active projects found"));
        }

        const poFilter = {
            companyId,
            projectId: { $in: activeProjectIds },
            isDeleted: false,
            status: { $nin: ["Draft", "Rejected"] },
        };
        if (vendorId && isValidObjectId(vendorId)) poFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }

        const pos = await PurchaseOrder.find(poFilter).select("_id poNumber projectId vendorId vendorName totalOrderValue status items").lean();
        if (pos.length === 0) {
            return res.status(200).json(new ApiResponse(200, {
                summary: { totalVendors: 0, totalCommittedAmount: 0, totalBilledAmount: 0, totalPaidAmount: 0, totalOutstandingAmount: 0, totalNetPayable: 0 },
                records: [],
                pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false },
            }, "No Records", "No POs found"));
        }

        const poIds = pos.map((p) => p._id);
        const vendorIds = [...new Set(pos.map((p) => p.vendorId.toString()))];

        const [payables, contraEntries, vendors] = await Promise.all([
            Payable.find({ companyId, poId: { $in: poIds } }).select("_id poId vendorId totalAmount paidAmount dueAmount advanceDeducted status").lean(),
            ContraEntry.find({ companyId, poId: { $in: poIds }, isDeleted: false, status: "Approved" }).select("_id poId vendorId adjustmentAmount direction").lean(),
            Vendor.find({ _id: { $in: vendorIds }, companyId, isDeleted: false }, { _id: 1, name: 1, advanceBalance: 1 }).lean(),
        ]);

        const vendorMap = {};
        vendors.forEach((v) => { vendorMap[v._id.toString()] = v; });

        const payablesByPO = {};
        payables.forEach((p) => {
            const key = p.poId?.toString();
            if (!key) return;
            if (!payablesByPO[key]) payablesByPO[key] = [];
            payablesByPO[key].push(p);
        });

        const cesByPO = {};
        contraEntries.forEach((c) => {
            const key = c.poId?.toString();
            if (!key) return;
            if (!cesByPO[key]) cesByPO[key] = [];
            cesByPO[key].push(c);
        });

        const vendorRollup = {};
        pos.forEach((po) => {
            const vKey = po.vendorId.toString();
            if (!vendorRollup[vKey]) {
                vendorRollup[vKey] = {
                    vendorId: po.vendorId,
                    vendorName: po.vendorName,
                    advanceBalance: vendorMap[vKey]?.advanceBalance || 0,
                    poCount: 0,
                    committedAmount: 0,
                    billedAmount: 0,
                    paidAmount: 0,
                    advanceDeducted: 0,
                    outstandingAmount: 0,
                    contraAdjustment: 0,
                };
            }
            const vr = vendorRollup[vKey];
            vr.poCount++;
            vr.committedAmount += po.totalOrderValue;

            const poPayables = payablesByPO[po._id.toString()] || [];
            poPayables.forEach((p) => {
                vr.billedAmount += p.totalAmount;
                vr.paidAmount += p.paidAmount;
                vr.advanceDeducted += p.advanceDeducted || 0;
                vr.outstandingAmount += p.dueAmount;
            });

            const poCEs = cesByPO[po._id.toString()] || [];
            poCEs.forEach((c) => {
                vr.contraAdjustment += c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount;
            });
        });

        let allRecords = Object.values(vendorRollup).map((vr) => {
            const netBilled = vr.billedAmount + vr.contraAdjustment;
            const netPayable = netBilled - vr.paidAmount - vr.advanceDeducted;
            const variancePct = computeVariancePct(vr.committedAmount, netBilled);
            const totalSettled = vr.paidAmount + vr.advanceDeducted;
            const reconciliationStatus = computeFinancialReconciliationStatus({ variancePct, totalSettled, netBilled });

            return {
                vendorId: vr.vendorId,
                vendorName: vr.vendorName,
                advanceBalance: vr.advanceBalance,
                poCount: vr.poCount,
                committedAmount: Math.round(vr.committedAmount * 100) / 100,
                billedAmount: Math.round(vr.billedAmount * 100) / 100,
                paidAmount: Math.round(vr.paidAmount * 100) / 100,
                advanceDeducted: Math.round(vr.advanceDeducted * 100) / 100,
                outstandingAmount: Math.round(vr.outstandingAmount * 100) / 100,
                contraAdjustment: Math.round(vr.contraAdjustment * 100) / 100,
                netBilledAmount: Math.round(netBilled * 100) / 100,
                netPayable: Math.round(netPayable * 100) / 100,
                variancePercentage: variancePct,
                reconciliationStatus,
            };
        });

        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            allRecords = allRecords.filter((r) => regex.test(r.vendorName));
        }
        if (filterStatus) allRecords = allRecords.filter((r) => r.reconciliationStatus === filterStatus);

        allRecords.sort((a, b) => {
            const va = a[sortBy] ?? a.vendorName;
            const vb = b[sortBy] ?? b.vendorName;
            if (typeof va === "string") return sortOrder === 1 ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortOrder === 1 ? va - vb : vb - va;
        });

        const total = allRecords.length;
        const paginatedRecords = allRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

        const summary = {
            totalVendors: total,
            totalCommittedAmount: Math.round(allRecords.reduce((s, r) => s + r.committedAmount, 0) * 100) / 100,
            totalBilledAmount: Math.round(allRecords.reduce((s, r) => s + r.billedAmount, 0) * 100) / 100,
            totalPaidAmount: Math.round(allRecords.reduce((s, r) => s + r.paidAmount, 0) * 100) / 100,
            totalOutstandingAmount: Math.round(allRecords.reduce((s, r) => s + r.outstandingAmount, 0) * 100) / 100,
            totalNetPayable: Math.round(allRecords.reduce((s, r) => s + r.netPayable, 0) * 100) / 100,
            settledCount: allRecords.filter((r) => r.reconciliationStatus === "SETTLED").length,
            unpaidCount: allRecords.filter((r) => r.reconciliationStatus === "UNPAID").length,
            partiallyPaidCount: allRecords.filter((r) => r.reconciliationStatus === "PARTIALLY_PAID").length,
            unmatchedCount: allRecords.filter((r) => r.reconciliationStatus === "UNMATCHED").length,
        };

        logger.info("Financial reconciliation fetched", { companyId, total });
        return res.status(200).json(
            new ApiResponse(200, {
                summary,
                records: paginatedRecords,
                pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
            }, "Financial Reconciliation Retrieved", `Fetched ${paginatedRecords.length} vendor record(s)`)
        );
    } catch (error) {
        logger.error("getFinancialReconciliation failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch financial reconciliation"));
    }
};



export const getFinancialReconciliationByVendor = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { vendorId } = req.params;
        if (!vendorId || !isValidObjectId(vendorId)) return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "Valid vendorId is required"));
        const { projectId, dateFrom, dateTo } = req.query;

        const vendor = await Vendor.findOne({ _id: vendorId, companyId, isDeleted: false }).lean();
        if (!vendor) return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No vendor found with the given ID"));

        const poFilter = { companyId, vendorId: new mongoose.Types.ObjectId(vendorId), isDeleted: false, status: { $nin: ["Draft", "Rejected"] } };
        if (projectId && isValidObjectId(projectId)) poFilter.projectId = new mongoose.Types.ObjectId(projectId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }

        const pos = await PurchaseOrder.find(poFilter).select("_id poNumber projectId totalOrderValue status items createdAt approvedAt").lean();
        const poIds = pos.map((p) => p._id);

        const [payables, contraEntries] = await Promise.all([
            Payable.find({ companyId, poId: { $in: poIds } }).lean(),
            ContraEntry.find({ companyId, vendorId: new mongoose.Types.ObjectId(vendorId), isDeleted: false, status: "Approved" }).lean(),
        ]);

        const payableIds = payables.map((p) => p._id);
        const paymentTransactions = await PaymentTransaction.find({ payableId: { $in: payableIds } })
            .select("payableId amount advanceDeducted totalSettled paymentDate paymentMode referenceNumber createdAt")
            .lean();

        const payablesByPO = {};
        payables.forEach((p) => {
            const key = p.poId?.toString();
            if (!key) return;
            if (!payablesByPO[key]) payablesByPO[key] = [];
            payablesByPO[key].push(p);
        });

        const txnsByPayable = {};
        paymentTransactions.forEach((t) => {
            const key = t.payableId.toString();
            if (!txnsByPayable[key]) txnsByPayable[key] = [];
            txnsByPayable[key].push(t);
        });

        const totalCommitted = pos.reduce((s, p) => s + p.totalOrderValue, 0);
        const totalReceived = pos.reduce((s, p) => s + p.items.reduce((si, i) => si + (i.receivedQuantity * i.unitPrice), 0), 0);
        const totalBilled = payables.reduce((s, p) => s + p.totalAmount, 0);
        const totalPaid = payables.reduce((s, p) => s + p.paidAmount, 0);
        const totalAdvanceDeducted = payables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
        const totalOutstanding = payables.reduce((s, p) => s + p.dueAmount, 0);
        const totalContraAdjustment = contraEntries.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        const netPayable = totalBilled + totalContraAdjustment - totalPaid - totalAdvanceDeducted;
        const variancePct = computeVariancePct(totalCommitted, totalBilled + totalContraAdjustment);
        const totalSettled = totalPaid + totalAdvanceDeducted;
        const netBilledTotal = totalBilled + totalContraAdjustment;

        const discrepancyFlags = computeFinancialDiscrepancyFlags({
            orderedValue: totalCommitted,
            billedValue: totalBilled,
            paidValue: totalPaid,
            advanceDeducted: totalAdvanceDeducted,
            contraAdjustment: totalContraAdjustment,
            netPayable,
            variancePct,
        });

        const reconciliationStatus = computeFinancialReconciliationStatus({
            variancePct,
            totalSettled,
            netBilled: netBilledTotal,
        });

        const poBreakdown = pos.map((po) => {
            const poPayables = payablesByPO[po._id.toString()] || [];
            const billed = poPayables.reduce((s, p) => s + p.totalAmount, 0);
            const paid = poPayables.reduce((s, p) => s + p.paidAmount, 0);
            const advDed = poPayables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
            const outstanding = poPayables.reduce((s, p) => s + p.dueAmount, 0);
            const receivedVal = po.items.reduce((s, i) => s + (i.receivedQuantity * i.unitPrice), 0);
            const poVariancePct = computeVariancePct(po.totalOrderValue, billed);
            const poNetPayable = billed - paid - advDed;
            const poSettled = paid + advDed;

            return {
                poId: po._id,
                poNumber: po.poNumber,
                projectId: po.projectId,
                poStatus: po.status,
                orderedValue: Math.round(po.totalOrderValue * 100) / 100,
                receivedValue: Math.round(receivedVal * 100) / 100,
                billedValue: Math.round(billed * 100) / 100,
                paidValue: Math.round(paid * 100) / 100,
                outstandingAmount: Math.round(outstanding * 100) / 100,
                advanceDeducted: Math.round(advDed * 100) / 100,
                netBilledAmount: Math.round(billed * 100) / 100,
                varianceAmount: Math.round((billed - po.totalOrderValue) * 100) / 100,
                variancePercentage: poVariancePct,
                paymentStatus: poSettled >= billed ? "PAID" : poSettled > 0 ? "PARTIALLY_PAID" : "UNPAID",
                reconciliationStatus: computeFinancialReconciliationStatus({ variancePct: poVariancePct, totalSettled: poSettled, netBilled: billed }),
                payables: poPayables.map((p) => ({
                    payableId: p._id,
                    payableNumber: p.payableNumber,
                    totalAmount: p.totalAmount,
                    paidAmount: p.paidAmount,
                    dueAmount: p.dueAmount,
                    status: p.status,
                    dueDate: p.dueDate,
                    payments: txnsByPayable[p._id.toString()] || [],
                })),
                approvedAt: po.approvedAt,
                createdAt: po.createdAt,
            };
        });

        logger.info("Financial reconciliation by vendor fetched", { vendorId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                vendor: {
                    vendorId: vendor._id,
                    vendorName: vendor.name,
                    contactPerson: vendor.contactPerson,
                    phone: vendor.phone,
                    gstin: vendor.legalDetails?.gstin || null,
                    advanceBalance: vendor.advanceBalance,
                },
                summary: {
                    poCount: pos.length,
                    payableCount: payables.length,
                    committedAmount: Math.round(totalCommitted * 100) / 100,
                    receivedAmount: Math.round(totalReceived * 100) / 100,
                    billedAmount: Math.round(totalBilled * 100) / 100,
                    paidAmount: Math.round(totalPaid * 100) / 100,
                    outstandingAmount: Math.round(totalOutstanding * 100) / 100,
                    advanceDeducted: Math.round(totalAdvanceDeducted * 100) / 100,
                    advanceBalance: vendor.advanceBalance,
                    contraAdjustment: Math.round(totalContraAdjustment * 100) / 100,
                    netPayable: Math.round(netPayable * 100) / 100,
                    varianceAmount: Math.round((netBilledTotal - totalCommitted) * 100) / 100,
                    variancePercentage: variancePct,
                    discrepancyFlags,
                    reconciliationStatus,
                },
                poBreakdown,
                contraEntries: contraEntries.map((c) => ({
                    ceId: c._id,
                    ceNumber: c.ceNumber,
                    poId: c.poId,
                    type: c.type,
                    adjustmentAmount: c.adjustmentAmount,
                    direction: c.direction,
                    reason: c.reason,
                    approvedAt: c.approvedAt,
                })),
            }, "Financial Reconciliation", `Financial reconciliation for vendor ${vendor.name}`)
        );
    } catch (error) {
        logger.error("getFinancialReconciliationByVendor failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch financial reconciliation by vendor"));
    }
};

export const getFinancialReconciliationByProject = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        const { vendorId, dateFrom, dateTo } = req.query;

        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", "No project found with the given ID"));

        const poFilter = { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false, status: { $nin: ["Draft", "Rejected"] } };
        if (vendorId && isValidObjectId(vendorId)) poFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }

        const pos = await PurchaseOrder.find(poFilter).select("_id poNumber vendorId vendorName totalOrderValue status items createdAt approvedAt").lean();
        const poIds = pos.map((p) => p._id);
        const vendorIds = [...new Set(pos.map((p) => p.vendorId.toString()))];

        const [payables, contraEntries, vendors] = await Promise.all([
            Payable.find({ companyId, poId: { $in: poIds } }).lean(),
            ContraEntry.find({ companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false, status: "Approved" }).lean(),
            Vendor.find({ _id: { $in: vendorIds }, isDeleted: false }, { _id: 1, name: 1, advanceBalance: 1, legalDetails: 1, contactPerson: 1, phone: 1 }).lean(),
        ]);

        const vendorMap = {};
        vendors.forEach((v) => { vendorMap[v._id.toString()] = v; });

        const payablesByPO = {};
        payables.forEach((p) => {
            const key = p.poId?.toString();
            if (!key) return;
            if (!payablesByPO[key]) payablesByPO[key] = [];
            payablesByPO[key].push(p);
        });

        const totalCommitted = pos.reduce((s, p) => s + p.totalOrderValue, 0);
        const totalReceived = pos.reduce((s, p) => s + p.items.reduce((si, i) => si + (i.receivedQuantity * i.unitPrice), 0), 0);
        const totalBilled = payables.reduce((s, p) => s + p.totalAmount, 0);
        const totalPaid = payables.reduce((s, p) => s + p.paidAmount, 0);
        const totalAdvanceDeducted = payables.reduce((s, p) => s + (p.advanceDeducted || 0), 0);
        const totalOutstanding = payables.reduce((s, p) => s + p.dueAmount, 0);
        const totalContraAdjustment = contraEntries.reduce((s, c) => s + (c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount), 0);
        const netPayable = totalBilled + totalContraAdjustment - totalPaid - totalAdvanceDeducted;

        const vendorRollup = {};
        pos.forEach((po) => {
            const vKey = po.vendorId.toString();
            if (!vendorRollup[vKey]) {
                const vInfo = vendorMap[vKey] || {};
                vendorRollup[vKey] = {
                    vendorId: po.vendorId,
                    vendorName: po.vendorName,
                    contactPerson: vInfo.contactPerson || null,
                    phone: vInfo.phone || null,
                    gstin: vInfo.legalDetails?.gstin || null,
                    advanceBalance: vInfo.advanceBalance || 0,
                    poCount: 0,
                    committedAmount: 0,
                    receivedAmount: 0,
                    billedAmount: 0,
                    paidAmount: 0,
                    outstandingAmount: 0,
                    advanceDeducted: 0,
                    contraAdjustment: 0,
                    netPayable: 0,
                };
            }
            const vr = vendorRollup[vKey];
            vr.poCount++;
            vr.committedAmount += po.totalOrderValue;
            vr.receivedAmount += po.items.reduce((si, i) => si + (i.receivedQuantity * i.unitPrice), 0);
            const poPayables = payablesByPO[po._id.toString()] || [];
            poPayables.forEach((p) => {
                vr.billedAmount += p.totalAmount;
                vr.paidAmount += p.paidAmount;
                vr.outstandingAmount += p.dueAmount;
                vr.advanceDeducted += p.advanceDeducted || 0;
            });
        });

        const vCEs = contraEntries;
        vCEs.forEach((c) => {
            const vKey = c.vendorId?.toString();
            if (vKey && vendorRollup[vKey]) {
                vendorRollup[vKey].contraAdjustment += c.direction === "DEBIT_VENDOR" ? -c.adjustmentAmount : c.adjustmentAmount;
            }
        });

        Object.values(vendorRollup).forEach((vr) => {
            vr.netPayable = vr.billedAmount + vr.contraAdjustment - vr.paidAmount - vr.advanceDeducted;
            vr.varianceAmount = Math.round((vr.billedAmount + vr.contraAdjustment - vr.committedAmount) * 100) / 100;
            vr.variancePercentage = computeVariancePct(vr.committedAmount, vr.billedAmount + vr.contraAdjustment);
            vr.reconciliationStatus = computeFinancialReconciliationStatus({
                variancePct: vr.variancePercentage,
                totalSettled: vr.paidAmount + vr.advanceDeducted,
                netBilled: vr.billedAmount + vr.contraAdjustment,
            });
            vr.committedAmount = Math.round(vr.committedAmount * 100) / 100;
            vr.receivedAmount = Math.round(vr.receivedAmount * 100) / 100;
            vr.billedAmount = Math.round(vr.billedAmount * 100) / 100;
            vr.paidAmount = Math.round(vr.paidAmount * 100) / 100;
            vr.outstandingAmount = Math.round(vr.outstandingAmount * 100) / 100;
            vr.advanceDeducted = Math.round(vr.advanceDeducted * 100) / 100;
            vr.contraAdjustment = Math.round(vr.contraAdjustment * 100) / 100;
            vr.netPayable = Math.round(vr.netPayable * 100) / 100;
        });

        logger.info("Financial reconciliation by project fetched", { projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                project: { projectId: project._id, projectName: project.projectName },
                summary: {
                    vendorCount: vendorIds.length,
                    poCount: pos.length,
                    payableCount: payables.length,
                    committedAmount: Math.round(totalCommitted * 100) / 100,
                    receivedAmount: Math.round(totalReceived * 100) / 100,
                    billedAmount: Math.round(totalBilled * 100) / 100,
                    paidAmount: Math.round(totalPaid * 100) / 100,
                    outstandingAmount: Math.round(totalOutstanding * 100) / 100,
                    totalAdvanceDeducted: Math.round(totalAdvanceDeducted * 100) / 100,
                    contraAdjustment: Math.round(totalContraAdjustment * 100) / 100,
                    netPayable: Math.round(netPayable * 100) / 100,
                    varianceAmount: Math.round((totalBilled + totalContraAdjustment - totalCommitted) * 100) / 100,
                    overbillingAmount: Math.round(Math.max(totalBilled - totalCommitted, 0) * 100) / 100,
                },
                vendorBreakdown: Object.values(vendorRollup),
                contraEntries: contraEntries.map((c) => ({
                    ceId: c._id,
                    ceNumber: c.ceNumber,
                    poId: c.poId,
                    vendorId: c.vendorId,
                    vendorName: c.vendorName,
                    type: c.type,
                    adjustmentAmount: c.adjustmentAmount,
                    direction: c.direction,
                    reason: c.reason,
                    approvedAt: c.approvedAt,
                })),
            }, "Financial Reconciliation", `Financial reconciliation for project ${project.projectName}`)
        );
    } catch (error) {
        logger.error("getFinancialReconciliationByProject failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch financial reconciliation by project"));
    }
};

export const getFinancialReconciliationCompany = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { dateFrom, dateTo } = req.query;

        const poFilter = { companyId, isDeleted: false, status: { $nin: ["Draft", "Rejected"] } };
        if (dateFrom || dateTo) {
            poFilter.createdAt = {};
            if (dateFrom) poFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                poFilter.createdAt.$lte = to;
            }
        }

        const [payableAgg, ceAgg, poAgg, vendorCountAgg, projectCountAgg, txnAgg] = await Promise.all([
            Payable.aggregate([
                { $match: { companyId } },
                { $group: { _id: null, totalBilled: { $sum: "$totalAmount" }, totalPaid: { $sum: "$paidAmount" }, totalAdvanceDeducted: { $sum: "$advanceDeducted" }, totalOutstanding: { $sum: "$dueAmount" }, payableCount: { $sum: 1 } } },
            ]),
            ContraEntry.aggregate([
                { $match: { companyId, isDeleted: false, status: "Approved" } },
                { $group: { _id: null, totalDebitVendor: { $sum: { $cond: [{ $eq: ["$direction", "DEBIT_VENDOR"] }, "$adjustmentAmount", 0] } }, totalCreditVendor: { $sum: { $cond: [{ $eq: ["$direction", "CREDIT_VENDOR"] }, "$adjustmentAmount", 0] } } } },
            ]),
            PurchaseOrder.aggregate([
                { $match: poFilter },
                { $group: { _id: null, totalCommitted: { $sum: "$totalOrderValue" }, totalReceived: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", { $multiply: ["$$this.receivedQuantity", "$$this.unitPrice"] }] } } } }, poCount: { $sum: 1 } } },
            ]),
            PurchaseOrder.distinct("vendorId", { companyId, isDeleted: false }),
            PurchaseOrder.distinct("projectId", { companyId, isDeleted: false }),
            PaymentTransaction.aggregate([
                { $match: { companyId } },
                { $group: { _id: null, paymentCount: { $sum: 1 } } },
            ]),
        ]);

        const p = payableAgg[0] || {};
        const ce = ceAgg[0] || {};
        const po = poAgg[0] || {};

        const totalBilled = p.totalBilled || 0;
        const totalPaid = p.totalPaid || 0;
        const totalAdvanceDeducted = p.totalAdvanceDeducted || 0;
        const totalOutstanding = p.totalOutstanding || 0;
        const totalContraAdjustment = (ce.totalCreditVendor || 0) - (ce.totalDebitVendor || 0);
        const totalCommitted = po.totalCommitted || 0;
        const totalReceived = po.totalReceived || 0;
        const netBilled = totalBilled + totalContraAdjustment;
        const netPayable = netBilled - totalPaid - totalAdvanceDeducted;
        const overBilledAmount = Math.max(totalBilled - totalCommitted, 0);
        const underBilledAmount = Math.max(totalCommitted - totalBilled, 0);

        const [payablesByStatus] = await Payable.aggregate([
            { $match: { companyId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const statusMap = {};
        const statusRows = await Payable.aggregate([
            { $match: { companyId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        statusRows.forEach((r) => { statusMap[r._id] = r.count; });

        const now = new Date();
        const overdueCount = await Payable.countDocuments({
            companyId,
            status: { $in: ["Unpaid", "PartiallyPaid"] },
            dueDate: { $ne: null, $lt: now },
        });

        logger.info("Financial reconciliation company-wide fetched", { companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                summary: {
                    vendorCount: vendorCountAgg.length,
                    projectCount: projectCountAgg.length,
                    poCount: po.poCount || 0,
                    payableCount: p.payableCount || 0,
                    paymentCount: txnAgg[0]?.paymentCount || 0,
                    totalCommittedAmount: Math.round(totalCommitted * 100) / 100,
                    totalReceivedAmount: Math.round(totalReceived * 100) / 100,
                    totalBilledAmount: Math.round(totalBilled * 100) / 100,
                    totalPaidAmount: Math.round(totalPaid * 100) / 100,
                    totalOutstandingAmount: Math.round(totalOutstanding * 100) / 100,
                    totalAdvanceDeducted: Math.round(totalAdvanceDeducted * 100) / 100,
                    totalContraAdjustment: Math.round(totalContraAdjustment * 100) / 100,
                    totalNetBilledAmount: Math.round(netBilled * 100) / 100,
                    totalNetPayable: Math.round(netPayable * 100) / 100,
                    totalLiability: Math.round(totalOutstanding * 100) / 100,
                    overBilledAmount: Math.round(overBilledAmount * 100) / 100,
                    underBilledAmount: Math.round(underBilledAmount * 100) / 100,
                    unpaidCount: statusMap["Unpaid"] || 0,
                    partiallyPaidCount: statusMap["PartiallyPaid"] || 0,
                    paidCount: statusMap["Paid"] || 0,
                    overduePayableCount: overdueCount,
                },
            }, "Company Financial Reconciliation", "Company-wide financial reconciliation summary")
        );
    } catch (error) {
        logger.error("getFinancialReconciliationCompany failed", { message: error.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch company financial reconciliation"));
    }
};