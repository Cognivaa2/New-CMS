import mongoose from "mongoose";
import Payable from "../models/payable.models.js";
import PaymentTransaction from "../models/paymentTransaction.models.js";
import Company from "../models/company.models.js";
import Project from "../models/project.models.js";
import User from "../models/user.models.js";
import Vendor from "../models/vendors.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { recordPayment } from "../helpers/payableHelper.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { generatePayableBillPdf } from "../helpers/billPdfGenerator.js";
import { enrichUser } from "../helpers/mrHelper.js";


const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const resolveCompany = async (uuid) =>
    Company.findOne({ companyId: uuid?.trim(), isDeleted: false }).lean();

const resolveUserByKeycloak = async (keycloakId, companyId) =>
    User.findOne({ keycloakId: keycloakId?.trim(), companyId, isDeleted: false }).lean();

const uploadPaymentProof = async (file, recordedByObjectId) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    const key = `payment-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await uploadToR2({ buffer: file.buffer, mimeType: file.mimetype, key });
    return { url, key };
};



// This function returns all payables for a project. takes x-company-id in headers and projectId in params. supports pagination, search (payableNumber, sourceNumber, vendorName), filtering (status, sourceType, vendorId, date range) and sorting with payable financial details. -------------------------- Ayan
export const getPayables = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { projectId } = req.params;
        if (!isValidObjectId(projectId))
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        const project = await Project.findOne({ _id: projectId, companyId: company._id, isDeleted: false }).lean();
        if (!project)
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found"));
        const {
            page = 1, limit = 20, sortBy = "createdAt", order = "desc",
            status, sourceType, vendorId: filterVendorId,
            dateFrom, dateTo, search = "",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSortFields = ["createdAt", "payableNumber", "totalAmount", "dueAmount", "dueDate", "status"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const validStatuses = ["Unpaid", "PartiallyPaid", "Paid", "Reversed"];
        const validSourceTypes = ["GRN", "WO", "ManualExpense"];
        const filter = {
            companyId: company._id,
            projectId: new mongoose.Types.ObjectId(projectId),
        };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (sourceType && validSourceTypes.includes(sourceType)) filter.sourceType = sourceType;
        if (filterVendorId && isValidObjectId(filterVendorId))
            filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { payableNumber: regex },
                { sourceNumber: regex },
                { vendorName: regex },
            ];
        }
        const [payables, total] = await Promise.all([
            Payable.find(filter)
                .select("-__v")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Payable.countDocuments(filter),
        ]);
        logger.info("getPayables", { total, page: pageNumber, projectId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    payables,
                    pagination: {
                        total, page: pageNumber, limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Payables Retrieved" : "No Payables Found",
                `Fetched ${payables.length} payable(s)`
            )
        );
    } catch (err) {
        logger.error("getPayables failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve payables", [err.message]));
    }
};



// This function returns payable summary analytics for a project. takes x-company-id in headers and projectId in params. computes payable totals, paid amounts, advance deductions, due balances, status breakdown and source-wise analytics. -------------------------- Ayan
export const getPayablesSummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { projectId } = req.params;
        if (!isValidObjectId(projectId))
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required"));
        const companyId = company._id;
        const projectObjId = new mongoose.Types.ObjectId(projectId);
        const baseMatch = { companyId, projectId: projectObjId };
        const [byStatus, bySource] = await Promise.all([
            Payable.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$totalAmount" },
                        paidAmount: { $sum: "$paidAmount" },
                        advanceDeducted: { $sum: "$advanceDeducted" },
                        dueAmount: { $sum: "$dueAmount" },
                    },
                },
            ]),
            Payable.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: "$sourceType",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$totalAmount" },
                        dueAmount: { $sum: "$dueAmount" },
                    },
                },
            ]),
        ]);
        const summary = {
            totalPayable: 0, totalPaid: 0, totalAdvanceDeducted: 0, totalDue: 0,
        };
        const statusBreakdown = {};
        for (const row of byStatus) {
            summary.totalPayable += row.totalAmount;
            summary.totalPaid += row.paidAmount;
            summary.totalAdvanceDeducted += row.advanceDeducted;
            summary.totalDue += row.dueAmount;
            statusBreakdown[row._id] = {
                count: row.count,
                totalAmount: parseFloat(row.totalAmount.toFixed(2)),
                paidAmount: parseFloat(row.paidAmount.toFixed(2)),
                advanceDeducted: parseFloat(row.advanceDeducted.toFixed(2)),
                dueAmount: parseFloat(row.dueAmount.toFixed(2)),
            };
        }
        for (const k of Object.keys(summary)) {
            summary[k] = parseFloat(summary[k].toFixed(2));
        }
        return res.status(200).json(
            new ApiResponse(200, {
                summary,
                statusBreakdown,
                sourceBreakdown: bySource.map((r) => ({
                    sourceType: r._id,
                    count: r.count,
                    totalAmount: parseFloat(r.totalAmount.toFixed(2)),
                    dueAmount: parseFloat(r.dueAmount.toFixed(2)),
                })),
            }, "Summary Retrieved", "Project payable summary loaded")
        );
    } catch (err) {
        logger.error("getPayablesSummary failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve summary", [err.message]));
    }
};



// This function fetches details of a specific payable. takes x-company-id in headers, projectId and payableId in params. returns payable details, payment transaction history and vendor advance balance information. -------------------------- Ayan
export const getSinglePayable = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { projectId, payableId } = req.params;
        if (!isValidObjectId(projectId) || !isValidObjectId(payableId))
            return res.status(400).json(new ApiErrors(400, "Invalid ID", "Valid projectId and payableId are required"));
        const payable = await Payable.findOne({
            _id: payableId, projectId, companyId: company._id,
        }).select("-__v").lean();
        if (!payable)
            return res.status(404).json(new ApiErrors(404, "Payable Not Found", "No payable found with the given ID"));
        const transactions = await PaymentTransaction.find({ payableId: payable._id })
            .select("-__v -proofKey")
            .sort({ createdAt: 1 })
            .lean();
        let vendorAdvanceBalance = null;
        if (payable.vendorId) {
            const v = await Vendor.findById(payable.vendorId).select("advanceBalance").lean();
            vendorAdvanceBalance = v?.advanceBalance ?? 0;
        }
        return res.status(200).json(
            new ApiResponse(200, {
                payable,
                transactions,
                vendorAdvanceBalance,
            }, "Payable Retrieved", "Payable fetched successfully")
        );
    } catch (err) {
        logger.error("getSinglePayable failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve payable", [err.message]));
    }
};



// This function returns all payment transactions for a payable. takes x-company-id in headers and payableId in params. returns payable payment history with transaction details and payment summary. -------------------------- Ayan
export const getPayablePayments = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { payableId } = req.params;
        if (!isValidObjectId(payableId))
            return res.status(400).json(new ApiErrors(400, "Invalid ID", "Valid payableId is required"));
        const payable = await Payable.findOne({
            _id: payableId, companyId: company._id,
        }).select("_id payableNumber totalAmount paidAmount dueAmount status").lean();
        if (!payable)
            return res.status(404).json(new ApiErrors(404, "Payable Not Found", "No payable found"));
        const transactions = await PaymentTransaction.find({ payableId: payable._id })
            .select("-__v -proofKey")
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json(
            new ApiResponse(200, {
                payable,
                transactions,
                total: transactions.length,
            }, "Payments Retrieved", `Fetched ${transactions.length} payment(s)`)
        );
    } catch (err) {
        logger.error("getPayablePayments failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve payments", [err.message]));
    }
};



// This function records payment against a payable. takes x-company-id in headers, projectId and payableId in params and payment details, advance deduction, proof file, notes and recordedBy in body. validates payable state, uploads proof document and records payment transaction with payable balance updates. -------------------------- Ayan
export const recordPaymentController = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { projectId, payableId } = req.params;
        if (!isValidObjectId(projectId) || !isValidObjectId(payableId))
            return res.status(400).json(new ApiErrors(400, "Invalid ID", "Valid projectId and payableId are required"));
        const {
            recordedBy, paymentDate, paymentMode, paymentModeOther,
            referenceNumber, notes,
        } = req.body;
        const amount = Number(req.body.amount ?? 0);
        const advanceDeducted = Number(req.body.advanceDeducted ?? 0);
        const missing = [];
        if (!recordedBy?.trim()) missing.push("recordedBy");
        if (!paymentDate) missing.push("paymentDate");
        if (!paymentMode) missing.push("paymentMode");
        if (missing.length)
            return res.status(400).json(new ApiErrors(400, "Missing Fields", `Required: ${missing.join(", ")}`));
        const validModes = ["Cash", "BankTransfer", "Cheque", "UPI", "NEFT", "RTGS", "DD", "Other"];
        if (!validModes.includes(paymentMode))
            return res.status(400).json(new ApiErrors(400, "Invalid Payment Mode", `paymentMode must be one of: ${validModes.join(", ")}`));
        if (paymentMode === "Other" && !paymentModeOther?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Field", "paymentModeOther is required when paymentMode is 'Other'"));
        if (isNaN(amount) || amount < 0)
            return res.status(400).json(new ApiErrors(400, "Invalid Amount", "amount must be a non-negative number"));
        if (isNaN(advanceDeducted) || advanceDeducted < 0)
            return res.status(400).json(new ApiErrors(400, "Invalid Advance", "advanceDeducted must be a non-negative number"));
        if (amount === 0 && advanceDeducted === 0)
            return res.status(400).json(new ApiErrors(400, "Invalid Payment", "Either amount or advanceDeducted must be greater than zero"));
        const recorder = await resolveUserByKeycloak(recordedBy, company._id);
        if (!recorder)
            return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${recordedBy}`));
        let proofImage = null;
        let proofKey = null;
        if (req.file) {
            try {
                const uploaded = await uploadPaymentProof(req.file, recorder._id);
                proofImage = uploaded.url;
                proofKey = uploaded.key;
            } catch (uploadErr) {
                logger.error("Payment proof upload failed", { message: uploadErr.message });
                return res.status(500).json(new ApiErrors(500, "Upload Failed", "Failed to upload proof. Please try again."));
            }
        }
        const { payable, transaction } = await recordPayment({
            payableId,
            companyId: company._id,
            amount,
            advanceDeducted,
            paymentDate,
            paymentMode,
            paymentModeOther: paymentModeOther || null,
            referenceNumber: referenceNumber || null,
            proofImage,
            proofKey,
            notes: notes || null,
            recordedBy: recorder._id,
        });
        logger.info("Payment recorded via controller", {
            payableId, txnId: transaction._id, amount, advanceDeducted,
        });
        return res.status(201).json(
            new ApiResponse(201, { payable, transaction }, "Payment Recorded",
                `Payment of ₹${(amount + advanceDeducted).toFixed(2)} recorded against ${payable.payableNumber}`)
        );
    } catch (err) {
        const knownErrors = [
            "already fully paid", "reversed payable", "exceeds the due amount",
            "exceeds vendor advance balance", "not linked to a vendor",
            "greater than zero", "Payable not found",
        ];
        if (knownErrors.some((msg) => err.message?.includes(msg))) {
            return res.status(400).json(new ApiErrors(400, "Payment Error", err.message));
        }
        logger.error("recordPaymentController failed", { message: err.message, stack: err.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to record payment", [err.message]));
    }
};



// This function exports a payable bill as a PDF document. takes x-company-id in headers, projectId and payableId in params. fetches payable, project, vendor, payment transactions and generates a formatted bill PDF for download. -------------------------- Ayan
export const exportPayableAsPdf = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { projectId, payableId } = req.params;
        if (!isValidObjectId(projectId) || !isValidObjectId(payableId))
            return res.status(400).json(new ApiErrors(400, "Invalid ID", "Valid projectId and payableId are required"));
        const payable = await Payable.findOne({
            _id: payableId,
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
        }).lean();
        if (!payable)
            return res.status(404).json(new ApiErrors(404, "Payable Not Found", "No payable found with the given ID"));
        const [project, vendor, transactions] = await Promise.all([
            Project.findOne({ _id: projectId, companyId: company._id, isDeleted: false })
                .select("projectName projectCode location clientName status startDate endDate")
                .lean(),
            payable.vendorId
                ? Vendor.findOne({ _id: payable.vendorId, companyId: company._id, isDeleted: false })
                    .select("name vendorType contactPerson phone email address legalDetails")
                    .lean()
                : Promise.resolve(null),
            PaymentTransaction.find({ payableId: payable._id })
                .select("-__v -proofKey")
                .sort({ createdAt: 1 })
                .lean(),
        ]);
        logger.info("Payable PDF export initiated", {
            payableId,
            payableNumber: payable.payableNumber,
            projectId,
            companyId: company._id,
        });
        await generatePayableBillPdf(res, { payable, company, project, vendor, transactions });
    } catch (error) {
        if (!res.headersSent) {
            logger.error("exportPayableAsPdf failed", { message: error.message, stack: error.stack });
            return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to generate Payable PDF", [error.message]));
        }
        logger.error("exportPayableAsPdf stream error (headers already sent)", { message: error.message });
    }
};



// This function returns global payables summary analytics across all projects. takes x-company-id in headers. computes payable counts, payable amounts, paid amounts, due amounts, status distribution, overdue payables and average settlement time KPIs. -------------------------- Ayan
export const getGlobalPayablesSummary = async (req, res) => {
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
        const activeProjects = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const now = new Date();
        const [agg] = await Payable.aggregate([
            { $match: { companyId, projectId: { $in: activeProjectIds } } },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalPayables: { $sum: 1 },
                                totalPayableAmount: { $sum: "$totalAmount" },
                                totalPaidAmount: { $sum: { $add: ["$paidAmount", "$advanceDeducted"] } },
                                totalDueAmount: { $sum: "$dueAmount" },
                            },
                        },
                    ],
                    statusCounts: [
                        { $group: { _id: "$status", count: { $sum: 1 } } },
                    ],
                    overduePayables: [
                        {
                            $match: {
                                status: { $in: ["Unpaid", "PartiallyPaid"] },
                                dueDate: { $ne: null, $lt: now },
                            },
                        },
                        { $count: "count" },
                    ],
                },
            },
        ]);
        const settleTimeAgg = await Payable.aggregate([
            { $match: { companyId, status: "Paid", projectId: { $in: activeProjectIds } } }, {
                $lookup: {
                    from: "paymenttransactions",
                    localField: "_id",
                    foreignField: "payableId",
                    as: "txns",
                },
            },
            {
                $project: {
                    createdAt: 1,
                    lastPaymentDate: { $max: "$txns.paymentDate" },
                },
            },
            {
                $match: { lastPaymentDate: { $ne: null } },
            },
            {
                $project: {
                    diffMs: { $subtract: ["$lastPaymentDate", "$createdAt"] },
                },
            },
            {
                $group: {
                    _id: null,
                    avgMs: { $avg: "$diffMs" },
                },
            },
        ]);
        const totals = agg?.totals?.[0] ?? {};
        const totalPayables = totals.totalPayables ?? 0;
        const totalPayableAmount = Math.round((totals.totalPayableAmount ?? 0) * 100) / 100;
        const totalPaidAmount = Math.round((totals.totalPaidAmount ?? 0) * 100) / 100;
        const totalDueAmount = Math.round((totals.totalDueAmount ?? 0) * 100) / 100;
        const statusMap = {};
        (agg?.statusCounts || []).forEach(({ _id, count }) => {
            statusMap[_id] = count;
        });
        const unpaidCount = statusMap["Unpaid"] || 0;
        const partiallyPaidCount = statusMap["PartiallyPaid"] || 0;
        const paidCount = statusMap["Paid"] || 0;
        const reversedCount = statusMap["Reversed"] || 0;
        const overduePayables = agg?.overduePayables?.[0]?.count ?? 0;
        const avgMs = settleTimeAgg?.[0]?.avgMs ?? null;
        const avgDaysToSettle =
            avgMs !== null
                ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
                : null;
        logger.info("Global Payables summary fetched", { companyId, totalPayables });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalPayables,
                        totalPayableAmount,
                        totalPaidAmount,
                        totalDueAmount,
                        unpaidCount,
                        partiallyPaidCount,
                        paidCount,
                        reversedCount,
                        overduePayables,
                        avgDaysToSettle,
                    },
                },
                "Global Payables Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalPayablesSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch global payables summary", [error.message])
        );
    }
};



// This function returns all payables across the company. takes x-company-id in headers. supports pagination, search (payableNumber, sourceNumber, vendorName), filtering (status, sourceType, projectId, vendorId, date range, overdueOnly) and sorting with enriched project, user and overdue status details. -------------------------- Ayan
export const getAllPayablesGlobal = async (req, res) => {
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
        const activeProjects = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            sourceType,
            projectId,
            vendorId,
            sortBy = "createdAt",
            order = "desc",
            dateFrom,
            dateTo,
            overdueOnly,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Unpaid", "PartiallyPaid", "Paid", "Reversed"];
        const validSourceTypes = ["GRN", "WO", "ManualExpense"];
        const allowedSortFields = ["createdAt", "totalAmount", "dueAmount", "dueDate"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, projectId: { $in: activeProjectIds } };
        if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (sourceType && validSourceTypes.includes(sourceType)) {
            filter.sourceType = sourceType;
        }
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Project ID", "projectId must be a valid ObjectId")
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (vendorId) {
            if (!isValidObjectId(vendorId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid ObjectId")
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
        if (overdueOnly === "true") {
            filter.status = { $in: ["Unpaid", "PartiallyPaid"] };
            filter.dueDate = { $ne: null, $lt: new Date() };
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { payableNumber: searchRegex },
                { sourceNumber: searchRegex },
                { vendorName: searchRegex },
            ];
        }
        const [payables, total] = await Promise.all([
            Payable.find(filter)
                .select("-__v")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Payable.countDocuments(filter),
        ]);
        if (payables.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        payables: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNext: false,
                            hasPrev: pageNumber > 1,
                        },
                    },
                    "No Payables Found",
                    "No payables matched the given filters"
                )
            );
        }
        const uniqueProjectIds = [
            ...new Set(payables.map((p) => p.projectId?.toString()).filter(Boolean)),
        ];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });
        const uniqueUserIds = [
            ...new Set(payables.map((p) => p.createdBy?.toString()).filter(Boolean)),
        ];
        const userEnrichmentMap = {};
        await Promise.all(
            uniqueUserIds.map(async (uid) => {
                userEnrichmentMap[uid] = await enrichUser(new mongoose.Types.ObjectId(uid));
            })
        );
        const now = new Date();
        const shaped = payables.map((p) => {
            const isOverdue =
                ["Unpaid", "PartiallyPaid"].includes(p.status) &&
                p.dueDate != null &&
                new Date(p.dueDate) < now;
            return {
                payableId: p._id,
                payableNumber: p.payableNumber,
                projectId: p.projectId,
                projectName: projectMap[p.projectId?.toString()] ?? "Unknown Project",
                sourceType: p.sourceType,
                sourceNumber: p.sourceNumber ?? null,
                poId: p.poId ?? null,
                vendorId: p.vendorId ?? null,
                vendorName: p.vendorName ?? null,
                totalAmount: p.totalAmount,
                paidAmount: p.paidAmount,
                advanceDeducted: p.advanceDeducted,
                dueAmount: p.dueAmount,
                status: p.status,
                dueDate: p.dueDate ?? null,
                isOverdue,
                notes: p.notes ?? null,
                createdBy: userEnrichmentMap[p.createdBy?.toString()] ?? null,
                createdAt: p.createdAt,
            };
        });
        logger.info("Global payables fetched", {
            companyId,
            total,
            returned: payables.length,
            page: pageNumber,
            filters: { status, sourceType, projectId, vendorId, overdueOnly },
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    payables: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                "Global Payables Retrieved",
                `Fetched ${shaped.length} payable(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllPayablesGlobal failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global payables", [error.message])
        );
    }
};