import mongoose from "mongoose";
import Vendor from "../models/vendors.models.js";
import VendorAdvanceTxn from "../models/vendorAdvanceTxn.models.js";
import Company from "../models/company.models.js";
import PaymentTransaction from "../models/paymentTransaction.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { addVendorAdvance } from "../helpers/payableHelper.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const resolveCompany = async (uuid) =>
    Company.findOne({ companyId: uuid?.trim(), isDeleted: false }).lean();

const resolveUserByKeycloak = async (keycloakId, companyId) =>
    User.findOne({ keycloakId: keycloakId?.trim(), companyId, isDeleted: false }).lean();

const uploadProof = async (file) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    const key = `vendor-advance-proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await uploadToR2({ buffer: file.buffer, mimeType: file.mimetype, key });
    return { url, key };
};



// This function returns vendor advance summary details. takes x-company-id in headers and vendorId in params. computes total credited advance, debited advance, available balance and transaction count for the vendor. -------------------------- Ayan
export const getVendorAdvanceSummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { vendorId } = req.params;
        if (!isValidObjectId(vendorId))
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "Valid vendorId is required"));
        const vendor = await Vendor.findOne({
            _id: vendorId, companyId: company._id, isDeleted: false,
        }).select("_id name vendorType contactPerson phone email advanceBalance").lean();
        if (!vendor)
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No active vendor found"));
        const [aggResult] = await VendorAdvanceTxn.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), companyId: company._id } },
            {
                $group: {
                    _id: null,
                    totalCredit: {
                        $sum: { $cond: [{ $in: ["$txnType", ["Credit", "Refund"]] }, "$amount", 0] },
                    },
                    totalDebit: {
                        $sum: { $cond: [{ $eq: ["$txnType", "Debit"] }, "$amount", 0] },
                    },
                    txnCount: { $sum: 1 },
                },
            },
        ]);
        const totalCredit = parseFloat((aggResult?.totalCredit ?? 0).toFixed(2));
        const totalDebit = parseFloat((aggResult?.totalDebit ?? 0).toFixed(2));
        const availableBalance = parseFloat((vendor.advanceBalance ?? 0).toFixed(2));
        return res.status(200).json(
            new ApiResponse(200, {
                vendor: {
                    _id: vendor._id,
                    name: vendor.name,
                    vendorType: vendor.vendorType,
                    contactPerson: vendor.contactPerson,
                    phone: vendor.phone,
                    email: vendor.email,
                },
                advance: {
                    totalCredit,
                    totalDebit,
                    availableBalance,
                    txnCount: aggResult?.txnCount ?? 0,
                },
            }, "Advance Summary Retrieved", `Advance summary for ${vendor.name}`)
        );
    } catch (err) {
        logger.error("getVendorAdvanceSummary failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve advance summary", [err.message]));
    }
};



// This function adds advance balance for a vendor. takes x-company-id in headers, vendorId in params and amount, payment details, proof file, notes and recordedBy in body. validates inputs, uploads proof document and creates vendor advance transaction with updated balance. -------------------------- Ayan
export const addVendorAdvanceController = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { vendorId } = req.params;
        if (!isValidObjectId(vendorId))
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "Valid vendorId is required"));
        const { recordedBy, paymentDate, paymentMode, referenceNumber, notes } = req.body;
        const amount = Number(req.body.amount);
        const missing = [];
        if (!recordedBy?.trim()) missing.push("recordedBy");
        if (!amount || isNaN(amount) || amount <= 0) missing.push("amount (must be positive)");
        if (!paymentDate) missing.push("paymentDate");
        if (!paymentMode) missing.push("paymentMode");
        if (missing.length)
            return res.status(400).json(new ApiErrors(400, "Missing Fields", `Required: ${missing.join(", ")}`));
        const validModes = ["Cash", "BankTransfer", "Cheque", "UPI", "NEFT", "RTGS", "DD", "Other"];
        if (!validModes.includes(paymentMode))
            return res.status(400).json(new ApiErrors(400, "Invalid Mode", `paymentMode must be one of: ${validModes.join(", ")}`));
        const recorder = await resolveUserByKeycloak(recordedBy, company._id);
        if (!recorder)
            return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found: ${recordedBy}`));
        let proofImage = null;
        let proofKey = null;
        if (req.file) {
            try {
                const up = await uploadProof(req.file);
                proofImage = up.url;
                proofKey = up.key;
            } catch (uploadErr) {
                return res.status(500).json(new ApiErrors(500, "Upload Failed", "Failed to upload proof"));
            }
        }
        const { vendor, txn } = await addVendorAdvance({
            vendorId,
            companyId: company._id,
            amount,
            paymentDate,
            paymentMode,
            referenceNumber: referenceNumber || null,
            proofImage,
            proofKey,
            notes: notes || null,
            recordedBy: recorder._id,
        });
        return res.status(201).json(
            new ApiResponse(201, {
                vendorId: vendor._id,
                newBalance: vendor.advanceBalance,
                transaction: txn,
            }, "Advance Added", `₹${amount.toFixed(2)} advance added for ${vendor.name}`)
        );
    } catch (err) {
        logger.error("addVendorAdvanceController failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to add vendor advance", [err.message]));
    }
};



// This function returns vendor advance transaction history. takes x-company-id in headers and vendorId in params. supports pagination and filtering (txnType, date range) and returns vendor advance transaction records with balance details. -------------------------- Ayan
export const getVendorAdvanceTransactions = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { vendorId } = req.params;
        if (!isValidObjectId(vendorId))
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "Valid vendorId is required"));
        const vendor = await Vendor.findOne({
            _id: vendorId, companyId: company._id, isDeleted: false,
        }).select("_id name advanceBalance").lean();
        if (!vendor)
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No active vendor found"));
        const {
            page = 1, limit = 20, txnType, dateFrom, dateTo,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const filter = { vendorId: new mongoose.Types.ObjectId(vendorId), companyId: company._id };
        if (txnType && ["Credit", "Debit", "Refund"].includes(txnType)) filter.txnType = txnType;
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }
        const [txns, total] = await Promise.all([
            VendorAdvanceTxn.find(filter)
                .select("-__v -proofKey")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            VendorAdvanceTxn.countDocuments(filter),
        ]);
        return res.status(200).json(
            new ApiResponse(200, {
                vendor: { _id: vendor._id, name: vendor.name, availableBalance: vendor.advanceBalance ?? 0 },
                transactions: txns,
                pagination: {
                    total, page: pageNumber, limit: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: pageNumber < Math.ceil(total / pageSize),
                    hasPrev: pageNumber > 1,
                },
            }, "Advance Transactions Retrieved", `Fetched ${txns.length} advance record(s)`)
        );
    } catch (err) {
        logger.error("getVendorAdvanceTransactions failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve transactions", [err.message]));
    }
};


// This function returns unified vendor transaction history merging both advance transactions and direct payment transactions. takes x-company-id in headers and vendorId in params. returns all financial activity for the vendor in chronological order. -------------------------- Ayan
export const getVendorFullTransactionHistory = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { vendorId } = req.params;
        if (!isValidObjectId(vendorId))
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID", "Valid vendorId is required"));
        const vendor = await Vendor.findOne({
            _id: vendorId, companyId: company._id, isDeleted: false,
        }).select("_id name advanceBalance").lean();
        if (!vendor)
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No active vendor found"));
        const vendorObjId = new mongoose.Types.ObjectId(vendorId);
        const companyId = company._id;
        const {
            page = 1, limit = 20, txnType, dateFrom, dateTo,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const advanceFilter = { vendorId: vendorObjId, companyId };
        if (txnType && ["Credit", "Debit", "Refund"].includes(txnType))
            advanceFilter.txnType = txnType;
        if (dateFrom || dateTo) {
            advanceFilter.createdAt = {};
            if (dateFrom) advanceFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) advanceFilter.createdAt.$lte = new Date(dateTo);
        }
        const shouldFetchPayments = !txnType || txnType === "Payment";
        const shouldFetchAdvance = !txnType || ["Credit", "Debit", "Refund"].includes(txnType);
        const paymentFilter = { vendorId: vendorObjId, companyId, amount: { $gt: 0 } };
        if (dateFrom || dateTo) {
            paymentFilter.createdAt = {};
            if (dateFrom) paymentFilter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) paymentFilter.createdAt.$lte = new Date(dateTo);
        }
        const [advanceTxns, paymentTxns] = await Promise.all([
            shouldFetchAdvance
                ? VendorAdvanceTxn.find(advanceFilter).select("-__v -proofKey").lean()
                : [],
            shouldFetchPayments
                ? PaymentTransaction.find(paymentFilter)
                    .select("-__v -proofKey")
                    .populate("payableId", "payableNumber sourceType sourceNumber")
                    .lean()
                : [],
        ]);
        const normalizedAdvance = advanceTxns.map((t) => ({
            _id: t._id,
            entryType: "AdvanceTxn",
            txnType: t.txnType,
            amount: t.amount,
            balanceAfter: t.balanceAfter,
            paymentMode: t.paymentMode || null,
            paymentModeOther: null,
            referenceNumber: t.referenceNumber || null,
            proofImage: t.proofImage || null,
            notes: t.notes || null,
            payableId: t.payableId || null,
            payableNumber: t.payableNumber || null,
            paymentTransactionId: t.paymentTransactionId || null,
            date: t.paymentDate || t.createdAt,
            createdAt: t.createdAt,
        }));
        const normalizedPayments = paymentTxns.map((t) => ({
            _id: t._id,
            entryType: "Payment",
            txnType: "Payment",
            amount: t.amount,
            advanceDeducted: t.advanceDeducted,
            totalSettled: t.totalSettled,
            balanceAfter: null,
            paymentMode: t.paymentMode,
            paymentModeOther: t.paymentModeOther || null,
            referenceNumber: t.referenceNumber || null,
            proofImage: t.proofImage || null,
            notes: t.notes || null,
            payableId: t.payableId?._id || t.payableId || null,
            payableNumber: t.payableId?.payableNumber || null,
            sourceType: t.payableId?.sourceType || null,
            sourceNumber: t.payableId?.sourceNumber || null,
            projectId: t.projectId || null,
            date: t.paymentDate || t.createdAt,
            createdAt: t.createdAt,
        }));
        const merged = [...normalizedAdvance, ...normalizedPayments]
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        const total = merged.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (pageNumber - 1) * pageSize;
        const paginated = merged.slice(start, start + pageSize);
        const totalCredited = advanceTxns
            .filter((t) => ["Credit", "Refund"].includes(t.txnType))
            .reduce((s, t) => s + t.amount, 0);
        const totalAdvanceUsed = advanceTxns
            .filter((t) => t.txnType === "Debit")
            .reduce((s, t) => s + t.amount, 0);
        const totalCashPaid = paymentTxns
            .reduce((s, t) => s + t.amount, 0);
        return res.status(200).json(
            new ApiResponse(200, {
                vendor: {
                    _id: vendor._id,
                    name: vendor.name,
                    availableBalance: vendor.advanceBalance ?? 0,
                },
                summary: {
                    totalCredited: parseFloat(totalCredited.toFixed(2)),
                    totalAdvanceUsed: parseFloat(totalAdvanceUsed.toFixed(2)),
                    totalCashPaid: parseFloat(totalCashPaid.toFixed(2)),
                    totalEntries: total,
                    advanceTxnCount: advanceTxns.length,
                    paymentTxnCount: paymentTxns.length,
                },
                transactions: paginated,
                pagination: {
                    total, page: pageNumber, limit: pageSize,
                    totalPages,
                    hasNext: pageNumber < totalPages,
                    hasPrev: pageNumber > 1,
                },
            }, "Transaction History Retrieved", `Fetched ${paginated.length} record(s)`)
        );
    } catch (err) {
        logger.error("getVendorFullTransactionHistory failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve history", [err.message]));
    }
};