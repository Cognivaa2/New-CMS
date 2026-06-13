import mongoose from "mongoose";
import Expense from "../models/expense.models.js";
import Project from "../models/project.models.js";
import Inventory from "../models/inventory.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import Counter from "../models/counter.models.js";
import logger from "../utils/logger.utils.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../config/r2.configs.js";
import ExcelJS from "exceljs";
import { enrichUser } from "./poHelper.js";

const C = {
    headerDark: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } },
    headerMid: { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } },
    accentLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } },
    accent: "FF6366F1",
    white: "FFFFFFFF",
    muted: "FF94A3B8",
    rowAlt: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
    greenLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFdcfce7" } },
    green: "FF16A34A",
    amberLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } },
    amber: "FFD97706",
    blueLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } },
    blue: "FF2563EB",
    redLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } },
    red: "FFDC2626",
    border: {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    },
};

const STATUS_COLORS = {
    Actual: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }, color: "FF16A34A" },
    Committed: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } }, color: "FFD97706" },
    Pending: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }, color: "FF2563EB" },
    Approved: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } }, color: "FF6366F1" },
    Reversed: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }, color: "FF64748B" },
    Rejected: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } }, color: "FFDC2626" },
};

const fmtCurrency = (val) =>
    `₹${(val ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const setCell = (ws, row, col, value, opts = {}) => {
    const cell = ws.getCell(row, col);
    cell.value = value;
    if (opts.fill) cell.fill = opts.fill;
    if (opts.border) cell.border = opts.border;
    cell.font = {
        bold: opts.bold ?? false,
        size: opts.size ?? 10,
        color: { argb: opts.color ?? "FF000000" },
    };
    cell.alignment = {
        horizontal: opts.align ?? "left",
        vertical: "middle",
        wrapText: true,
    };
};

const mergeHeader = (ws, row, fromCol, toCol, value, fill, color, size = 11) => {
    ws.mergeCells(row, fromCol, row, toCol);
    setCell(ws, row, fromCol, value, { fill, color, bold: true, size });
};


export const enrichExpenseUsers = async (expense) => {
    if (!expense) return expense;
    const [
        createdBy,
        submittedBy,
        approvedBy,
        rejectedBy,
        paidBy,
        reversedBy,
        updatedBy,
    ] = await Promise.all([
        enrichUser(expense.createdBy),
        enrichUser(expense.submittedBy),
        enrichUser(expense.approvedBy),
        enrichUser(expense.rejectedBy),
        enrichUser(expense.paidBy),
        enrichUser(expense.reversedBy),
        enrichUser(expense.updatedBy),
    ]);
    return {
        ...expense,
        createdBy,
        submittedBy,
        approvedBy,
        rejectedBy,
        paidBy,
        reversedBy,
        updatedBy,
    };
};


export const generateExpenseNumber = async (companyId) => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const counterKey = `EXP-${companyId.toString()}-${yyyymm}`;
    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return `EXP-${yyyymm}-${String(counter.seq).padStart(4, "0")}`;
};


export const recalcProjectHealth = async (projectId, companyId) => {
    try {
        const project = await Project.findOne({
            _id: projectId, companyId, isDeleted: false,
        }).select("budget healthStatus").lean();
        if (!project || !project.budget) return;
        const [actualResult, committedResult] = await Promise.all([
            Expense.aggregate([
                {
                    $match: {
                        projectId: new mongoose.Types.ObjectId(projectId),
                        companyId: new mongoose.Types.ObjectId(companyId),
                        status: "Actual",
                        isDeleted: false,
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            Expense.aggregate([
                {
                    $match: {
                        projectId: new mongoose.Types.ObjectId(projectId),
                        companyId: new mongoose.Types.ObjectId(companyId),
                        status: "Committed",
                        isDeleted: false,
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        ]);

        const totalActual = actualResult[0]?.total ?? 0;
        const totalCommitted = committedResult[0]?.total ?? 0;
        const budget = project.budget;

        let healthStatus = "on_track";
        if (totalActual > budget) {
            healthStatus = "over_budget";
        } else if (totalActual + totalCommitted >= budget * 0.9) {
            healthStatus = "delayed";
        }

        if (healthStatus !== project.healthStatus) {
            await Project.findByIdAndUpdate(projectId, { $set: { healthStatus } });
            logger.info("[expenseHelper] Project health updated", {
                projectId, healthStatus, totalActual, totalCommitted, budget,
            });
        }
    } catch (err) {
        logger.error("[expenseHelper] recalcProjectHealth failed", { projectId, error: err.message });
    }
};



export const createExpenseEntry = async (opts, session = null) => {
    const {
        companyId, projectId, type, category, status, amount,
        description, expenseDate, sourceModel, sourceId, sourceNumber,
        vendorId, vendorName, phaseId, milestoneId, milestoneTitle,
        createdBy, priceSnapshot,
    } = opts;
    if (sourceId && !milestoneId) {
        const existing = await Expense.findOne(
            {
                sourceModel,
                sourceId: new mongoose.Types.ObjectId(sourceId),
                status: { $nin: ["Reversed", "Rejected"] },
                isDeleted: false,
            },
            null,
            session ? { session } : {}
        ).lean();
        if (existing) {
            logger.warn("[expenseHelper] Duplicate expense skipped", {
                sourceModel, sourceId, existingId: existing._id,
            });
            return existing;
        }
    }

    const expenseNumber = await generateExpenseNumber(companyId);
    const docData = {
        companyId,
        projectId,
        expenseNumber,
        type,
        category,
        status,
        amount: parseFloat(amount.toFixed(2)),
        amountSnapshot: parseFloat(amount.toFixed(2)),
        priceSnapshot: priceSnapshot ? parseFloat(priceSnapshot.toFixed(2)) : null,
        description: description || null,
        expenseDate: expenseDate || new Date(),
        sourceModel,
        sourceId: sourceId || null,
        sourceNumber: sourceNumber || null,
        vendorId: vendorId || null,
        vendorName: vendorName || null,
        phaseId: phaseId || null,
        milestoneId: milestoneId || null,
        milestoneTitle: milestoneTitle || null,
        createdBy: createdBy || null,
    };

    const createOpts = session ? { session } : {};
    const [expense] = await Expense.create([docData], createOpts);

    logger.info("[expenseHelper] Expense entry created", {
        expenseId: expense._id, expenseNumber, type, status,
        amount: expense.amount, sourceModel, sourceId, projectId,
    });
    return expense;
};



export const reverseExpenseEntry = async (opts, session = null) => {
    const { sourceModel, sourceId, reversedBy, reversalReason, milestoneId, statusFilter } = opts;
    const filter = {
        sourceModel,
        sourceId: new mongoose.Types.ObjectId(sourceId),
        status: statusFilter ?? { $in: ["Committed", "Actual"] },
        isDeleted: false,
    };
    if (milestoneId) {
        filter.milestoneId = new mongoose.Types.ObjectId(milestoneId);
    }
    const updateOpts = session ? { session } : {};
    const result = await Expense.updateMany(
        filter,
        {
            $set: {
                status: "Reversed",
                reversedAt: new Date(),
                reversedBy: reversedBy || null,
                reversalReason: reversalReason || null,
            },
        },
        updateOpts
    );
    logger.info("[expenseHelper] Expense(s) reversed", {
        sourceModel, sourceId,
        milestoneId: milestoneId || null,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        reversalReason,
    });
    return result;
};



export const reducePOCommitmentByGRN = async ({
    poId, grnAmount, companyId, session,
}) => {
    const poExpense = await Expense.findOne(
        {
            sourceModel: "PurchaseOrder",
            sourceId: new mongoose.Types.ObjectId(poId),
            status: "Committed",
            isDeleted: false,
        },
        null,
        session ? { session } : {}
    );
    if (!poExpense) {
        logger.warn("[expenseHelper] reducePOCommitmentByGRN: no committed PO expense found", { poId });
        return;
    }
    const newAmount = Math.max(poExpense.amount - grnAmount, 0);
    if (newAmount === 0) {
        await Expense.findByIdAndDelete(poExpense._id, session ? { session } : {});
        logger.info("[expenseHelper] PO commitment fully settled and removed", {
            poId, previousAmount: poExpense.amount, grnAmount,
        });
    } else {
        await Expense.findByIdAndUpdate(
            poExpense._id,
            {
                $set: {
                    amount: parseFloat(newAmount.toFixed(2)),
                    "lastAmountUpdate.previousAmount": poExpense.amount,
                    "lastAmountUpdate.updatedAt": new Date(),
                    "lastAmountUpdate.reason": `Adjusted by GRN change of ${grnAmount}`,
                },
            },
            session ? { session } : {}
        );
        logger.info("[expenseHelper] PO commitment reduced after GRN", {
            poId, previousAmount: poExpense.amount, newAmount, grnAmount,
        });
    }
};



export const calcGRNExpenseAmount = (grnItems, poItems) => {
    let total = 0;
    for (const grnItem of grnItems) {
        const poItem = poItems.find(
            (pi) => pi.inventoryId.toString() === grnItem.inventoryId.toString()
        );
        if (poItem && poItem.orderedQuantity > 0) {
            const effectiveUnitRate = poItem.totalPrice / poItem.orderedQuantity;
            total += grnItem.receivedQuantity * effectiveUnitRate;
        }
    }
    return parseFloat(total.toFixed(2));
};



export const calcTransferExpenseAmount = async (transferItems, fromProjectId, companyId, session = null) => {
    let total = 0;
    for (const item of transferItems) {
        const findOpts = session ? { session } : {};
        const inv = await Inventory.findOne(
            {
                _id: item.inventoryId,
                projectId: new mongoose.Types.ObjectId(fromProjectId),
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
            },
            { pricePerUnit: 1 },
            findOpts
        ).lean();
        if (inv?.pricePerUnit) {
            total += item.quantity * inv.pricePerUnit;
        }
    }
    return parseFloat(total.toFixed(2));
};



export const updateGRNExpenseAmount = async ({ grnId, grnItems, poId, companyId, updatedBy, session }) => {
    const po = await PurchaseOrder.findOne(
        { _id: poId, companyId, isDeleted: false },
        { items: 1 },
        session ? { session } : {}
    ).lean();
    if (!po) {
        logger.warn("[expenseHelper] updateGRNExpenseAmount: PO not found", { poId });
        return null;
    }
    const newAmount = calcGRNExpenseAmount(grnItems, po.items);
    const existing = await Expense.findOne(
        {
            sourceModel: "GRN",
            sourceId: new mongoose.Types.ObjectId(grnId),
            status: { $in: ["Actual", "Committed"] },
            isDeleted: false,
        },
        null,
        session ? { session } : {}
    );
    if (!existing) {
        logger.warn("[expenseHelper] updateGRNExpenseAmount: no active expense for GRN", { grnId });
        return null;
    }
    const previousAmount = existing.amount;
    const updated = await Expense.findByIdAndUpdate(
        existing._id,
        {
            $set: {
                amount: newAmount,
                amountSnapshot: newAmount,
                updatedBy: updatedBy || null,
                "lastAmountUpdate.previousAmount": previousAmount,
                "lastAmountUpdate.updatedAt": new Date(),
                "lastAmountUpdate.updatedBy": updatedBy || null,
                "lastAmountUpdate.reason": "GRN items edited — amount recalculated",
            },
        },
        { new: true, ...(session ? { session } : {}) }
    ).lean();
    logger.info("[expenseHelper] GRN expense amount updated", {
        expenseId: existing._id, previousAmount, newAmount, grnId,
    });
    return updated;
};



export const uploadExpenseProof = async (file, uploadedByUserId) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `expense-proofs/${timestamp}-${safeName}`;
    const { url } = await uploadToR2({ buffer: file.buffer, mimeType: file.mimetype, key });
    return {
        fileName: file.originalname,
        fileUrl: url,
        fileKey: key,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: uploadedByUserId,
        uploadedAt: new Date(),
    };
};

export const deleteExpenseProof = async (proof) => {
    if (!proof?.fileKey) return;
    try {
        await r2Client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: proof.fileKey,
        }));
    } catch (err) {
        logger.error("[expenseHelper] deleteExpenseProof failed", { key: proof.fileKey, error: err.message });
    }
};



export const getProjectFinancialSummary = async (projectId, companyId) => {
    const projectObjId = new mongoose.Types.ObjectId(projectId);
    const companyObjId = new mongoose.Types.ObjectId(companyId);
    const baseMatch = { projectId: projectObjId, companyId: companyObjId, isDeleted: false };

    const [project, byStatus, byCategory, byType, byVendor] = await Promise.all([
        Project.findOne({ _id: projectObjId, companyId: companyObjId, isDeleted: false })
            .select("projectName projectCode budget healthStatus completionPercent startDate endDate")
            .lean(),
        Expense.aggregate([
            { $match: baseMatch },
            { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
            { $match: { ...baseMatch, status: "Actual" } },
            { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]),
        Expense.aggregate([
            { $match: baseMatch },
            { $group: { _id: { type: "$type", status: "$status" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
            {
                $match: {
                    ...baseMatch,
                    vendorId: { $ne: null },
                    status: { $in: ["Actual", "Committed"] },
                },
            },
            { $group: { _id: { vendorId: "$vendorId", vendorName: "$vendorName" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 10 },
        ]),
    ]);

    if (!project) return null;

    const statusMap = {};
    for (const row of byStatus) statusMap[row._id] = { total: row.total, count: row.count };

    const totalActual = statusMap["Actual"]?.total ?? 0;
    const totalCommitted = statusMap["Committed"]?.total ?? 0;
    const totalPending = statusMap["Pending"]?.total ?? 0;
    const totalApproved = statusMap["Approved"]?.total ?? 0;
    const totalSpend = totalActual + totalCommitted;
    const budget = project.budget ?? 0;
    const remaining = Math.max(budget - totalSpend, 0);
    const utilizationPct = budget > 0
        ? parseFloat(((totalSpend / budget) * 100).toFixed(2))
        : 0;

    return {
        project: {
            _id: project._id,
            projectName: project.projectName,
            projectCode: project.projectCode,
            budget,
            healthStatus: project.healthStatus,
            completionPercent: project.completionPercent,
            startDate: project.startDate,
            endDate: project.endDate,
        },
        summary: {
            totalActual: parseFloat(totalActual.toFixed(2)),
            totalCommitted: parseFloat(totalCommitted.toFixed(2)),
            totalPending: parseFloat(totalPending.toFixed(2)),
            totalApproved: parseFloat(totalApproved.toFixed(2)),
            totalSpend: parseFloat(totalSpend.toFixed(2)),
            remaining: parseFloat(remaining.toFixed(2)),
            utilizationPct,
        },
        byCategory: byCategory.map((r) => ({
            category: r._id,
            total: parseFloat(r.total.toFixed(2)),
            count: r.count,
        })),
        byType: byType.map((r) => ({
            type: r._id.type,
            status: r._id.status,
            total: parseFloat(r.total.toFixed(2)),
            count: r.count,
        })),
        topVendors: byVendor.map((r) => ({
            vendorId: r._id.vendorId,
            vendorName: r._id.vendorName,
            total: parseFloat(r.total.toFixed(2)),
            count: r.count,
        })),
    };
};



export const buildExpenseReportWorkbook = async (financialData, allExpenses, committedExpenses) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CMS - Expense Report";
    wb.created = new Date();

    const ws = wb.addWorksheet("Expense Report", {
        properties: { tabColor: { argb: "FF6366F1" } },
    });

    const cols = [22, 18, 18, 18, 14, 14, 20, 30, 20, 14];
    cols.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    let r = 1;

    ws.getRow(r).height = 28;
    mergeHeader(ws, r, 1, 10, `  EXPENSE REPORT — ${financialData.project.projectName}`, C.headerDark, C.white, 14);
    r++;

    ws.getRow(r).height = 18;
    mergeHeader(ws, r, 1, 10,
        `  Project Code: ${financialData.project.projectCode || "—"}   |   Generated: ${fmtDate(new Date())}   |   Health: ${financialData.project.healthStatus?.toUpperCase().replace("_", " ")}`,
        C.headerMid, C.muted, 9
    );
    r++;
    r++;

    const metrics = [
        { label: "Estimated Budget", value: fmtCurrency(financialData.project.budget), fill: C.accentLight, color: C.accent },
        { label: "Total Actual Spend", value: fmtCurrency(financialData.summary.totalActual), fill: C.greenLight, color: C.green },
        { label: "Total Committed", value: fmtCurrency(financialData.summary.totalCommitted), fill: C.amberLight, color: C.amber },
        { label: "Pending Approval", value: fmtCurrency(financialData.summary.totalPending), fill: C.blueLight, color: C.blue },
        { label: "Remaining Budget", value: fmtCurrency(financialData.summary.remaining), fill: financialData.summary.remaining < 0 ? C.redLight : C.greenLight, color: financialData.summary.remaining < 0 ? C.red : C.green },
    ];
    ws.getRow(r).height = 16;
    for (let i = 0; i < metrics.length; i++) {
        const col = i * 2 + 1;
        ws.mergeCells(r, col, r, col + 1);
        setCell(ws, r, col, metrics[i].label, { fill: metrics[i].fill, bold: true, color: metrics[i].color, size: 9, align: "center", border: C.border });
    }
    r++;
    ws.getRow(r).height = 22;
    for (let i = 0; i < metrics.length; i++) {
        const col = i * 2 + 1;
        ws.mergeCells(r, col, r, col + 1);
        setCell(ws, r, col, metrics[i].value, { fill: metrics[i].fill, bold: true, color: metrics[i].color, size: 12, align: "center", border: C.border });
    }
    r++;

    ws.getRow(r).height = 18;
    ws.mergeCells(r, 1, r, 5);
    setCell(ws, r, 1, `Budget Utilization: ${financialData.summary.utilizationPct}%  (Actual + Committed vs Budget)`, { fill: C.headerMid, bold: true, color: C.white, size: 10, align: "center", border: C.border });
    ws.mergeCells(r, 6, r, 10);
    setCell(ws, r, 6, `Completion: ${financialData.project.completionPercent ?? 0}%  |  Project: ${financialData.project.startDate ? fmtDate(financialData.project.startDate) : "—"} → ${financialData.project.endDate ? fmtDate(financialData.project.endDate) : "—"}`, { fill: C.headerMid, bold: true, color: C.white, size: 10, align: "center", border: C.border });
    r++;
    r++;
    ws.getRow(r).height = 18;
    mergeHeader(ws, r, 1, 10, "  SPEND BY CATEGORY (Actual + Approved only)", C.accent, C.white, 10);
    r++;

    ws.getRow(r).height = 16;
    const catHeaders = ["Category", "Amount (₹)", "Count", "% of Actual Spend"];
    const catCols = [1, 2, 3, 4];
    catHeaders.forEach((h, i) => {
        setCell(ws, r, catCols[i], h, { fill: C.headerDark, bold: true, color: C.white, size: 9, align: "center", border: C.border });
    });
    r++;

    const totalActual = financialData.summary.totalActual || 1;
    financialData.byCategory.forEach((cat, idx) => {
        ws.getRow(r).height = 16;
        const alt = idx % 2 === 0 ? C.white : C.rowAlt;
        setCell(ws, r, 1, cat.category, { fill: alt, border: C.border });
        setCell(ws, r, 2, fmtCurrency(cat.total), { fill: alt, align: "right", border: C.border });
        setCell(ws, r, 3, cat.count, { fill: alt, align: "center", border: C.border });
        setCell(ws, r, 4, `${((cat.total / totalActual) * 100).toFixed(1)}%`, { fill: alt, align: "center", border: C.border });
        r++;
    });
    if (!financialData.byCategory.length) {
        ws.mergeCells(r, 1, r, 4);
        setCell(ws, r, 1, "No actual expenses recorded yet", { fill: C.rowAlt, color: C.muted, align: "center", border: C.border });
        r++;
    }
    r++;

    ws.getRow(r).height = 20;
    mergeHeader(ws, r, 1, 10, "  COMPLETE EXPENSE LEDGER", C.headerDark, C.white, 11);
    r++;

    const ledgerHeaders = ["Expense #", "Date", "Type", "Category", "Status", "Amount (₹)", "Source", "Description", "Vendor", "Created By"];
    ws.getRow(r).height = 16;
    ledgerHeaders.forEach((h, i) => {
        setCell(ws, r, i + 1, h, { fill: C.headerMid, bold: true, color: C.white, size: 9, align: "center", border: C.border });
    });
    r++;

    const grouped = {};
    for (const exp of allExpenses) {
        const cat = exp.category || "Other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(exp);
    }

    let ledgerIdx = 0;
    for (const [cat, exps] of Object.entries(grouped)) {
        ws.getRow(r).height = 15;
        ws.mergeCells(r, 1, r, 10);
        setCell(ws, r, 1, `  ${cat}`, { fill: C.accentLight, bold: true, color: C.accent, size: 9, border: C.border });
        r++;

        let catTotal = 0;
        for (const exp of exps) {
            ws.getRow(r).height = 15;
            const alt = ledgerIdx % 2 === 0 ? C.white : C.rowAlt;
            const sc = STATUS_COLORS[exp.status] || { fill: C.rowAlt, color: C.muted };
            setCell(ws, r, 1, exp.expenseNumber, { fill: alt, size: 8, border: C.border });
            setCell(ws, r, 2, fmtDate(exp.expenseDate), { fill: alt, size: 8, align: "center", border: C.border });
            setCell(ws, r, 3, (exp.type || "").replace(/_/g, " "), { fill: alt, size: 8, border: C.border });
            setCell(ws, r, 4, exp.category, { fill: alt, size: 8, border: C.border });
            setCell(ws, r, 5, exp.status, { fill: sc.fill, bold: true, color: sc.color, size: 8, align: "center", border: C.border });
            setCell(ws, r, 6, fmtCurrency(exp.amount), { fill: alt, size: 8, align: "right", border: C.border });
            setCell(ws, r, 7, exp.sourceNumber || exp.sourceModel || "—", { fill: alt, size: 8, border: C.border });
            setCell(ws, r, 8, exp.description || "—", { fill: alt, size: 8, border: C.border });
            setCell(ws, r, 9, exp.vendorName || "—", { fill: alt, size: 8, border: C.border });
            setCell(ws, r, 10, exp._createdByName || "—", { fill: alt, size: 8, border: C.border });
            catTotal += exp.amount || 0;
            ledgerIdx++;
            r++;
        }

        ws.getRow(r).height = 15;
        ws.mergeCells(r, 1, r, 5);
        setCell(ws, r, 1, `  ${cat} Subtotal`, { fill: C.accentLight, bold: true, color: C.accent, size: 9, align: "right", border: C.border });
        setCell(ws, r, 6, fmtCurrency(catTotal), { fill: C.accentLight, bold: true, color: C.accent, size: 9, align: "right", border: C.border });
        r++;
    }

    if (!allExpenses.length) {
        ws.mergeCells(r, 1, r, 10);
        setCell(ws, r, 1, "No expense records found for this project", { fill: C.rowAlt, color: C.muted, align: "center", border: C.border });
        r++;
    }

    ws.getRow(r).height = 18;
    ws.mergeCells(r, 1, r, 5);
    setCell(ws, r, 1, "  TOTAL (All Active Expenses)", { fill: C.headerDark, bold: true, color: C.white, size: 10, align: "right", border: C.border });
    const grandTotal = allExpenses.filter(e => !["Reversed", "Rejected"].includes(e.status)).reduce((s, e) => s + (e.amount || 0), 0);
    setCell(ws, r, 6, fmtCurrency(grandTotal), { fill: C.headerDark, bold: true, color: C.white, size: 10, align: "right", border: C.border });
    r++;
    r++;

    ws.getRow(r).height = 20;
    mergeHeader(ws, r, 1, 10, "  COMMITTED COSTS (Outstanding Obligations — Not Yet Paid)", C.amber, C.white, 11);
    r++;

    const committedHeaders = ["Expense #", "Date", "Type", "Source #", "Description", "Vendor", "Amount (₹)", "Milestone", "Status", "Created By"];
    ws.getRow(r).height = 16;
    committedHeaders.forEach((h, i) => {
        setCell(ws, r, i + 1, h, { fill: C.headerMid, bold: true, color: C.white, size: 9, align: "center", border: C.border });
    });
    r++;

    let committedTotal = 0;
    committedExpenses.forEach((exp, idx) => {
        ws.getRow(r).height = 15;
        const alt = idx % 2 === 0 ? C.white : C.amberLight;
        setCell(ws, r, 1, exp.expenseNumber, { fill: alt, size: 8, border: C.border });
        setCell(ws, r, 2, fmtDate(exp.expenseDate), { fill: alt, size: 8, align: "center", border: C.border });
        setCell(ws, r, 3, (exp.type || "").replace(/_/g, " "), { fill: alt, size: 8, border: C.border });
        setCell(ws, r, 4, exp.sourceNumber || "—", { fill: alt, size: 8, border: C.border });
        setCell(ws, r, 5, exp.description || "—", { fill: alt, size: 8, border: C.border });
        setCell(ws, r, 6, exp.vendorName || "—", { fill: alt, size: 8, border: C.border });
        setCell(ws, r, 7, fmtCurrency(exp.amount), { fill: alt, size: 8, align: "right", border: C.border });
        setCell(ws, r, 8, exp.milestoneTitle || "—", { fill: alt, size: 8, border: C.border });
        setCell(ws, r, 9, exp.status, { fill: C.amberLight, bold: true, color: C.amber, size: 8, align: "center", border: C.border });
        setCell(ws, r, 10, exp._createdByName || "—", { fill: alt, size: 8, border: C.border });
        committedTotal += exp.amount || 0;
        r++;
    });

    if (!committedExpenses.length) {
        ws.mergeCells(r, 1, r, 10);
        setCell(ws, r, 1, "No committed costs outstanding", { fill: C.rowAlt, color: C.muted, align: "center", border: C.border });
        r++;
    }

    ws.getRow(r).height = 18;
    ws.mergeCells(r, 1, r, 6);
    setCell(ws, r, 1, "  TOTAL COMMITTED", { fill: C.amber, bold: true, color: C.white, size: 10, align: "right", border: C.border });
    setCell(ws, r, 7, fmtCurrency(committedTotal), { fill: C.amber, bold: true, color: C.white, size: 10, align: "right", border: C.border });
    r++;
    r++;
    ws.mergeCells(r, 1, r, 10);
    setCell(ws, r, 1,
        `Report generated on ${new Date().toLocaleString("en-IN")} · CMS Expense Module`,
        { fill: C.headerMid, color: C.muted, size: 8, align: "center" }
    );

    return wb;
};



// export const convertMilestoneCommitmentToActual = async (opts, session = null) => {
//     const { sourceId, milestoneId, resolvedBy, resolvedReason } = opts;
//     const filter = {
//         sourceModel: "WorkOrder",
//         sourceId: new mongoose.Types.ObjectId(sourceId),
//         milestoneId: new mongoose.Types.ObjectId(milestoneId),
//         status: "Committed",
//         isDeleted: false,
//     };
//     const updateOpts = session ? { session } : {};
//     const result = await Expense.updateMany(
//         filter,
//         {
//             $set: {
//                 status: "Actual",
//                 paidAt: new Date(),
//                 paidBy: resolvedBy || null,
//                 paymentRemarks: resolvedReason || "Milestone triggered — commitment converted to actual",
//             },
//         },
//         updateOpts
//     );
//     logger.info("[expenseHelper] Milestone commitment converted to actual", {
//         sourceId,
//         milestoneId,
//         matchedCount: result.matchedCount,
//         modifiedCount: result.modifiedCount,
//     });
//     return result;
// };


// export const revertActualToCommitted = async (opts, session = null) => {
//     const { sourceId, milestoneId, revertedBy, revertReason } = opts;
//     const filter = {
//         sourceModel: "WorkOrder",
//         sourceId: new mongoose.Types.ObjectId(sourceId),
//         status: { $in: ["Actual", "Paid"] },
//         isDeleted: false,
//     };
//     if (milestoneId) {
//         filter.milestoneId = new mongoose.Types.ObjectId(milestoneId);
//     } else {
//         filter.milestoneId = null;
//     }
//     const updateOpts = session ? { session } : {};
//     const result = await Expense.updateMany(
//         filter,
//         {
//             $set: {
//                 status: "Committed",
//                 paymentRemarks: revertReason || "WO progress regressed — actual reverted to committed",
//                 updatedBy: revertedBy || null,
//             },
//             $unset: {
//                 paidAt: "",
//                 paidBy: "",
//             },
//         },
//         updateOpts
//     );
//     logger.info("[expenseHelper] Expense(s) reverted from Actual → Committed", {
//         sourceId,
//         milestoneId: milestoneId || null,
//         matchedCount: result.matchedCount,
//         modifiedCount: result.modifiedCount,
//         revertReason,
//     });
//     return result;
// };



export const createWOCommitmentExpense = async (opts, session = null) => {
    const {
        companyId, projectId, woId, woNumber,
        totalContractValue, vendorId, vendorName,
        phaseId, createdBy,
    } = opts;
    const existing = await Expense.findOne(
        {
            sourceModel: "WorkOrder",
            sourceId: new mongoose.Types.ObjectId(woId),
            status: "Committed",
            isDeleted: false,
        },
        null,
        session ? { session } : {}
    ).lean();
    if (existing) {
        logger.warn("[expenseHelper] createWOCommitmentExpense: committed entry already exists — skipped", {
            woId, existingId: existing._id,
        });
        return existing;
    }
    const expenseNumber = await generateExpenseNumber(companyId);
    const docData = {
        companyId,
        projectId: new mongoose.Types.ObjectId(projectId),
        expenseNumber,
        type: "WO_Commitment",
        category: "Contractor",
        status: "Committed",
        amount: parseFloat(totalContractValue.toFixed(2)),
        amountSnapshot: parseFloat(totalContractValue.toFixed(2)),
        description: `Work Order ${woNumber} — contractor commitment`,
        expenseDate: new Date(),
        sourceModel: "WorkOrder",
        sourceId: new mongoose.Types.ObjectId(woId),
        sourceNumber: woNumber,
        vendorId: vendorId || null,
        vendorName: vendorName || null,
        phaseId: phaseId || null,
        milestoneId: null,
        milestoneTitle: null,
        createdBy: createdBy || null,
    };
    const createOpts = session ? { session } : {};
    const [expense] = await Expense.create([docData], createOpts);
    logger.info("[expenseHelper] WO committed expense created", {
        expenseId: expense._id, expenseNumber, woId, amount: expense.amount,
    });
    return expense;
};



export const triggerMilestoneExpense = async (opts) => {
    const {
        sourceId, woNumber, projectId, companyId,
        milestoneAmount, milestoneTitle,
        vendorId, vendorName, phaseId,
        resolvedBy, resolvedReason,
    } = opts;
    const woObjectId = new mongoose.Types.ObjectId(sourceId);
    const committed = await Expense.findOne({
        sourceModel: "WorkOrder",
        sourceId: woObjectId,
        status: "Committed",
        isDeleted: false,
    }).lean();

    if (committed) {
        const newCommitted = parseFloat((committed.amount - milestoneAmount).toFixed(2));
        if (newCommitted <= 0) {
            await Expense.findByIdAndDelete(committed._id);
            logger.info("[expenseHelper] triggerMilestoneExpense: committed entry fully settled and deleted", {
                sourceId, woNumber, committedId: committed._id,
            });
        } else {
            await Expense.findByIdAndUpdate(committed._id, {
                $set: {
                    amount: newCommitted,
                    "lastAmountUpdate.previousAmount": committed.amount,
                    "lastAmountUpdate.updatedAt": new Date(),
                    "lastAmountUpdate.updatedBy": resolvedBy || null,
                    "lastAmountUpdate.reason": `Milestone "${milestoneTitle}" triggered — committed reduced by ${milestoneAmount}`,
                },
            });
            logger.info("[expenseHelper] triggerMilestoneExpense: committed entry reduced", {
                sourceId, woNumber, previous: committed.amount, newCommitted, milestoneAmount,
            });
        }
    } else {
        logger.warn("[expenseHelper] triggerMilestoneExpense: no committed entry found to reduce", {
            sourceId, woNumber,
        });
    }
    const existingActual = await Expense.findOne({
        sourceModel: "WorkOrder",
        sourceId: woObjectId,
        status: "Actual",
        isDeleted: false,
    }).lean();
    if (existingActual) {
        const newActual = parseFloat((existingActual.amount + milestoneAmount).toFixed(2));
        await Expense.findByIdAndUpdate(existingActual._id, {
            $set: {
                amount: newActual,
                paidAt: new Date(),
                paidBy: resolvedBy || null,
                paymentRemarks: resolvedReason || `Milestone "${milestoneTitle}" triggered`,
                "lastAmountUpdate.previousAmount": existingActual.amount,
                "lastAmountUpdate.updatedAt": new Date(),
                "lastAmountUpdate.updatedBy": resolvedBy || null,
                "lastAmountUpdate.reason": `Milestone "${milestoneTitle}" triggered — actual increased by ${milestoneAmount}`,
            },
        });
        logger.info("[expenseHelper] triggerMilestoneExpense: actual entry updated", {
            sourceId, woNumber, previous: existingActual.amount, newActual, milestoneAmount,
        });
    } else {
        const expenseNumber = await generateExpenseNumber(companyId);
        const [newActualDoc] = await Expense.create([{
            companyId: new mongoose.Types.ObjectId(companyId),
            projectId: new mongoose.Types.ObjectId(projectId),
            expenseNumber,
            type: "WO_Commitment",
            category: "Contractor",
            status: "Actual",
            amount: parseFloat(milestoneAmount.toFixed(2)),
            amountSnapshot: parseFloat(milestoneAmount.toFixed(2)),
            description: `Work Order ${woNumber} — actual payments`,
            expenseDate: new Date(),
            sourceModel: "WorkOrder",
            sourceId: woObjectId,
            sourceNumber: woNumber,
            vendorId: vendorId || null,
            vendorName: vendorName || null,
            phaseId: phaseId || null,
            milestoneId: null,
            milestoneTitle: null,
            paidAt: new Date(),
            paidBy: resolvedBy || null,
            paymentRemarks: resolvedReason || `Milestone "${milestoneTitle}" triggered`,
            createdBy: resolvedBy || null,
        }]);
        logger.info("[expenseHelper] triggerMilestoneExpense: actual entry created", {
            sourceId, woNumber, expenseNumber, amount: milestoneAmount,
        });
    }
};



export const regressMilestoneExpense = async (opts) => {
    const {
        sourceId, woNumber, projectId, companyId,
        milestoneAmount, milestoneTitle,
        vendorId, vendorName, phaseId,
        revertedBy, revertReason,
    } = opts;
    const woObjectId = new mongoose.Types.ObjectId(sourceId);
    const actual = await Expense.findOne({
        sourceModel: "WorkOrder",
        sourceId: woObjectId,
        status: "Actual",
        isDeleted: false,
    }).lean();
    if (actual) {
        const newActual = parseFloat((actual.amount - milestoneAmount).toFixed(2));
        if (newActual <= 0) {
            await Expense.findByIdAndDelete(actual._id);
            logger.info("[expenseHelper] regressMilestoneExpense: actual entry fully reversed and deleted", {
                sourceId, woNumber, actualId: actual._id,
            });
        } else {
            await Expense.findByIdAndUpdate(actual._id, {
                $set: {
                    amount: newActual,
                    "lastAmountUpdate.previousAmount": actual.amount,
                    "lastAmountUpdate.updatedAt": new Date(),
                    "lastAmountUpdate.updatedBy": revertedBy || null,
                    "lastAmountUpdate.reason": `Milestone "${milestoneTitle}" regressed — actual reduced by ${milestoneAmount}`,
                },
            });
            logger.info("[expenseHelper] regressMilestoneExpense: actual entry reduced", {
                sourceId, woNumber, previous: actual.amount, newActual, milestoneAmount,
            });
        }
    } else {
        logger.warn("[expenseHelper] regressMilestoneExpense: no actual entry found to reduce", {
            sourceId, woNumber,
        });
    }
    const existingCommitted = await Expense.findOne({
        sourceModel: "WorkOrder",
        sourceId: woObjectId,
        status: "Committed",
        isDeleted: false,
    }).lean();
    if (existingCommitted) {
        const newCommitted = parseFloat((existingCommitted.amount + milestoneAmount).toFixed(2));
        await Expense.findByIdAndUpdate(existingCommitted._id, {
            $set: {
                amount: newCommitted,
                "lastAmountUpdate.previousAmount": existingCommitted.amount,
                "lastAmountUpdate.updatedAt": new Date(),
                "lastAmountUpdate.updatedBy": revertedBy || null,
                "lastAmountUpdate.reason": `Milestone "${milestoneTitle}" regressed — committed restored by ${milestoneAmount}`,
            },
        });
        logger.info("[expenseHelper] regressMilestoneExpense: committed entry restored", {
            sourceId, woNumber, previous: existingCommitted.amount, newCommitted, milestoneAmount,
        });
    } else {
        const expenseNumber = await generateExpenseNumber(companyId);
        await Expense.create([{
            companyId: new mongoose.Types.ObjectId(companyId),
            projectId: new mongoose.Types.ObjectId(projectId),
            expenseNumber,
            type: "WO_Commitment",
            category: "Contractor",
            status: "Committed",
            amount: parseFloat(milestoneAmount.toFixed(2)),
            amountSnapshot: parseFloat(milestoneAmount.toFixed(2)),
            description: `Work Order ${woNumber} — contractor commitment (restored)`,
            expenseDate: new Date(),
            sourceModel: "WorkOrder",
            sourceId: woObjectId,
            sourceNumber: woNumber,
            vendorId: vendorId || null,
            vendorName: vendorName || null,
            phaseId: phaseId || null,
            milestoneId: null,
            milestoneTitle: null,
            createdBy: revertedBy || null,
        }]);
        logger.info("[expenseHelper] regressMilestoneExpense: committed entry recreated", {
            sourceId, woNumber, expenseNumber, amount: milestoneAmount,
        });
    }
};



export const convertWOCommitmentToActual = async (opts, session = null) => {
    const { sourceId, resolvedBy, resolvedReason } = opts;

    const filter = {
        sourceModel: "WorkOrder",
        sourceId: new mongoose.Types.ObjectId(sourceId),
        milestoneId: null,
        status: "Committed",
        isDeleted: false,
    };
    const updateOpts = session ? { session } : {};
    const result = await Expense.updateMany(
        filter,
        {
            $set: {
                status: "Actual",
                paidAt: new Date(),
                paidBy: resolvedBy || null,
                paymentRemarks: resolvedReason || "WO completed — commitment converted to actual",
            },
        },
        updateOpts
    );
    logger.info("[expenseHelper] WO commitment converted to actual (non-milestone)", {
        sourceId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
    });
    return result;
};



export const revertWOActualToCommitted = async (opts, session = null) => {
    const { sourceId, revertedBy, revertReason } = opts;
    const filter = {
        sourceModel: "WorkOrder",
        sourceId: new mongoose.Types.ObjectId(sourceId),
        milestoneId: null,
        status: "Actual",
        isDeleted: false,
    };
    const updateOpts = session ? { session } : {};
    const result = await Expense.updateMany(
        filter,
        {
            $set: {
                status: "Committed",
                paymentRemarks: revertReason || "WO regressed — actual reverted to committed",
                updatedBy: revertedBy || null,
            },
            $unset: { paidAt: "", paidBy: "" },
        },
        updateOpts
    );
    logger.info("[expenseHelper] WO actual reverted to committed (non-milestone)", {
        sourceId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
    });
    return result;
};