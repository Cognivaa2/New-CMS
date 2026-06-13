import mongoose from "mongoose";
import Expense from "../models/expense.models.js";
import Project from "../models/project.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { generateExpenseNumber, recalcProjectHealth, createExpenseEntry, reverseExpenseEntry, uploadExpenseProof, deleteExpenseProof, getProjectFinancialSummary, buildExpenseReportWorkbook, enrichExpenseUsers } from "../helpers/expenseHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import { createPayableFromManualExpense } from "../helpers/payableHelper.js";


const resolveCompany = async (companyUUID) =>
    Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();

const resolveUserByKeycloak = async (keycloakId, companyId) =>
    User.findOne({ keycloakId: keycloakId.trim(), companyId, isDeleted: false }).lean();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);



// This function creates a new manual expense entry. takes x-company-id in headers, projectId in params and createdBy, subType, amount, description, expenseDate, paymentMode, referenceNumber, category, phaseId with optional proof file in body. validates inputs, uploads proof and stores expense in Pending state. -------------------------- Ayan
export const createManualExpense = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found"));
        const {
            createdBy, subType, amount, description,
            expenseDate, paymentMode, referenceNumber,
            category, phaseId,
        } = req.body;
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!subType?.trim()) missing.push("subType");
        if (!amount) missing.push("amount");
        if (!description?.trim()) missing.push("description");
        if (!expenseDate) missing.push("expenseDate");
        if (missing.length) {
            return res.status(400).json(new ApiErrors(400, "Missing Required Fields", `Required: ${missing.join(", ")}`));
        }
        const validSubTypes = ["Petty Cash", "Miscellaneous", "Labour", "Other"];
        if (!validSubTypes.includes(subType)) {
            return res.status(400).json(new ApiErrors(400, "Invalid subType", `subType must be one of: ${validSubTypes.join(", ")}`));
        }
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json(new ApiErrors(400, "Invalid Amount", "amount must be a positive number"));
        }
        const parsedDate = new Date(expenseDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date", "expenseDate must be a valid ISO date string"));
        }
        const validPaymentModes = ["Cash", "Bank Transfer", "Cheque", "UPI", "Other"];
        if (paymentMode && !validPaymentModes.includes(paymentMode)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Payment Mode", `paymentMode must be one of: ${validPaymentModes.join(", ")}`));
        }
        if (phaseId && !isValidObjectId(phaseId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Phase ID", "phaseId must be a valid MongoDB ObjectId"));
        }
        const creator = await resolveUserByKeycloak(createdBy, companyId);
        if (!creator) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`));
        const resolvedCategory = category || subType;
        const validCategories = ["Material", "Labour", "Contractor", "Transfer", "Petty Cash", "Miscellaneous", "Other"];
        if (!validCategories.includes(resolvedCategory)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Category", `category must be one of: ${validCategories.join(", ")}`));
        }
        let proof = null;
        if (req.file) {
            try {
                proof = await uploadExpenseProof(req.file, creator._id);
            } catch (uploadErr) {
                logger.error("createManualExpense: proof upload failed", { message: uploadErr.message });
                return res.status(500).json(new ApiErrors(500, "Upload Failed", "Failed to upload proof image. Please try again."));
            }
        }
        const expenseNumber = await generateExpenseNumber(companyId);
        let expense;
        try {
            expense = await Expense.create({
                companyId,
                projectId: new mongoose.Types.ObjectId(projectId),
                expenseNumber,
                type: "Manual",
                category: resolvedCategory,
                status: "Pending",
                amount: parsedAmount,
                description: description.trim(),
                expenseDate: parsedDate,
                sourceModel: "Manual",
                sourceId: null,
                sourceNumber: null,
                phaseId: phaseId ? new mongoose.Types.ObjectId(phaseId) : null,
                createdBy: creator._id,
                submittedAt: new Date(),
                submittedBy: creator._id,
                manualEntryDetails: {
                    subType,
                    paymentMode: paymentMode || null,
                    referenceNumber: referenceNumber?.trim() || null,
                    proof,
                },
            });
        } catch (dbErr) {
            if (proof) await deleteExpenseProof(proof);
            throw dbErr;
        }
        logger.info("Manual expense created", { expenseId: expense._id, expenseNumber, projectId, companyId });
        await pushDprEvent({
            companyId,
            projectId: expense.projectId,
            actorId: creator._id,
            module: "Expense",
            action: "ExpenseCreated",
            refId: expense._id,
            refNumber: expense.expenseNumber,
            details: {
                expenseNumber: expense.expenseNumber,
                expenseType: expense.type,
                category: expense.category,
                subType,
                amount: expense.amount,
                status: expense.status,
                paymentMode: paymentMode || null,
                description: expense.description,
            },
            eventAt: new Date(),
        });
        return res.status(201).json(
            new ApiResponse(201, { expense }, "Manual Expense Created",
                `Manual expense ${expenseNumber} submitted for approval`)
        );
    } catch (error) {
        logger.error("createManualExpense failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to create manual expense", [error.message]));
    }
};


// This function approves a manual expense. takes x-company-id in headers, projectId and expenseId in params and actionBy in body. validates ownership, prevents self-approval and updates expense status to Approved with approval details. -------------------------- Ayan
export const approveManualExpense = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, expenseId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        if (!isValidObjectId(expenseId)) return res.status(400).json(new ApiErrors(400, "Invalid Expense ID", "Valid expenseId required"));
        const { actionBy } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));
        const expense = await Expense.findOne({ _id: expenseId, projectId, companyId, isDeleted: false });
        if (!expense) return res.status(404).json(new ApiErrors(404, "Expense Not Found", "No expense found with the given ID"));
        if (expense.type !== "Manual") return res.status(400).json(new ApiErrors(400, "Invalid Action", "Only Manual expenses can be approved via this endpoint"));
        if (expense.status !== "Pending") return res.status(400).json(new ApiErrors(400, "Invalid Status", `Cannot approve an expense in '${expense.status}' status. Only Pending expenses can be approved`));
        if (expense.submittedBy?.toString() === actionUser._id.toString()) {
            return res.status(403).json(new ApiErrors(403, "Self-Approval Not Allowed", "You cannot approve an expense you submitted"));
        }
        expense.status = "Approved";
        expense.approvedAt = new Date();
        expense.approvedBy = actionUser._id;
        expense.updatedBy = actionUser._id;
        await expense.save();
        await pushDprEvent({
            companyId,
            projectId: expense.projectId,
            actorId: actionUser._id,
            module: "Expense",
            action: "ExpenseApproved",
            refId: expense._id,
            refNumber: expense.expenseNumber,
            details: {
                expenseNumber: expense.expenseNumber,
                expenseType: expense.type,
                category: expense.category,
                amount: expense.amount,
                approvedAt: expense.approvedAt,
                status: expense.status,
                description: expense.description,
            },
            eventAt: new Date(),
        });
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("Manual expense approved", { expenseId: expense._id, expenseNumber: expense.expenseNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, { expense }, "Expense Approved", `Expense ${expense.expenseNumber} has been approved`));
    } catch (error) {
        logger.error("approveManualExpense failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to approve expense", [error.message]));
    }
};



// This function rejects a manual expense. takes x-company-id in headers, projectId and expenseId in params and actionBy with rejectionRemarks in body. validates ownership, prevents self-rejection and updates expense status to Rejected. -------------------------- Ayan
export const rejectManualExpense = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, expenseId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        if (!isValidObjectId(expenseId)) return res.status(400).json(new ApiErrors(400, "Invalid Expense ID", "Valid expenseId required"));
        const { actionBy, rejectionRemarks } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));
        const expense = await Expense.findOne({ _id: expenseId, projectId, companyId, isDeleted: false });
        if (!expense) return res.status(404).json(new ApiErrors(404, "Expense Not Found", "No expense found with the given ID"));
        if (expense.type !== "Manual") return res.status(400).json(new ApiErrors(400, "Invalid Action", "Only Manual expenses can be rejected via this endpoint"));
        if (expense.status !== "Pending") return res.status(400).json(new ApiErrors(400, "Invalid Status", `Cannot reject an expense in '${expense.status}' status`));
        if (expense.submittedBy?.toString() === actionUser._id.toString()) {
            return res.status(403).json(new ApiErrors(403, "Self-Rejection Not Allowed", "You cannot reject an expense you submitted"));
        }
        expense.status = "Rejected";
        expense.rejectedAt = new Date();
        expense.rejectedBy = actionUser._id;
        expense.rejectionRemarks = rejectionRemarks?.trim() || null;
        expense.updatedBy = actionUser._id;
        await expense.save();
        await pushDprEvent({
            companyId,
            projectId: expense.projectId,
            actorId: actionUser._id,
            module: "Expense",
            action: "ExpenseRejected",
            refId: expense._id,
            refNumber: expense.expenseNumber,
            details: {
                expenseNumber: expense.expenseNumber,
                expenseType: expense.type,
                category: expense.category,
                amount: expense.amount,
                rejectedAt: expense.rejectedAt,
                rejectionRemarks: expense.rejectionRemarks || null,
                status: expense.status,
                description: expense.description,
            },
            eventAt: new Date(),
        });
        logger.info("Manual expense rejected", { expenseId: expense._id, expenseNumber: expense.expenseNumber, projectId, companyId });
        return res.status(200).json(new ApiResponse(200, { expense }, "Expense Rejected", `Expense ${expense.expenseNumber} has been rejected`));
    } catch (error) {
        logger.error("rejectManualExpense failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to reject expense", [error.message]));
    }
};



// This function marks an expense as paid. takes x-company-id in headers, projectId and expenseId in params and actionBy with paymentRemarks in body. validates status transition from Committed to Actual and updates payment details. -------------------------- Ayan
export const markExpenseAsPaid = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;

        const { projectId, expenseId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        if (!isValidObjectId(expenseId)) return res.status(400).json(new ApiErrors(400, "Invalid Expense ID", "Valid expenseId required"));

        const { actionBy, paymentRemarks } = req.body;
        if (!actionBy?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required"));

        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`));

        const expense = await Expense.findOne({ _id: expenseId, projectId, companyId, isDeleted: false });
        if (!expense) return res.status(404).json(new ApiErrors(404, "Expense Not Found", "No expense found with the given ID"));
        if (expense.type !== "Manual") {
            return res.status(400).json(new ApiErrors(400, "Invalid Action",
                "Only Manual expenses can be marked as paid via this endpoint. PO/WO commitments are resolved through GRN and milestone completion flows."));
        }
        if (expense.status !== "Approved") {
            return res.status(400).json(new ApiErrors(400, "Invalid Status",
                `Only Approved manual expenses can be marked as paid. Current status: '${expense.status}'`));
        }
        expense.status = "Actual";
        expense.paidAt = new Date();
        expense.paidBy = actionUser._id;
        expense.paymentRemarks = paymentRemarks?.trim() || null;
        expense.updatedBy = actionUser._id;
        await expense.save();
        createPayableFromManualExpense({ expense }).catch((err) =>
            logger.error("createPayableFromManualExpense failed (non-critical)", { expenseId: expense._id, error: err.message })
        );
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("Manual expense marked as paid", { expenseId: expense._id, expenseNumber: expense.expenseNumber });

        return res.status(200).json(new ApiResponse(200, { expense }, "Expense Marked as Paid",
            `${expense.expenseNumber} approved and recorded as actual expense`));
    } catch (error) {
        logger.error("markExpenseAsPaid failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to mark expense as paid", [error.message]));
    }
};



// This function returns all expenses for a project. takes x-company-id in headers and projectId in params. supports pagination, search (expenseNumber, description, vendorName, sourceNumber), filtering (status, type, category, vendorId, date range) and sorting with aggregated financial totals. -------------------------- Ayan
export const getAllExpenses = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found"));
        const {
            page = 1, limit = 20,
            status, type, category,
            vendorId: filterVendorId,
            sortBy = "expenseDate", order = "desc",
            search = "",
            dateFrom, dateTo,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSortFields = ["expenseDate", "amount", "createdAt", "expenseNumber", "status", "type", "category"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "expenseDate";

        const validStatuses = ["Committed", "Actual", "Pending", "Approved", "Rejected", "Reversed"];
        const validTypes = ["PO_Commitment", "WO_Commitment", "GRN_Actual", "Consumption_Actual", "Transfer_Debit", "Manual"];
        const validCategories = ["Material", "Labour", "Contractor", "Transfer", "Petty Cash", "Miscellaneous", "Other"];

        const filter = { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false };
        if (status && validStatuses.includes(status)) filter.status = status;
        if (type && validTypes.includes(type)) filter.type = type;
        if (category && validCategories.includes(category)) filter.category = category;
        if (filterVendorId && isValidObjectId(filterVendorId)) filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        if (dateFrom || dateTo) {
            filter.expenseDate = {};
            if (dateFrom) filter.expenseDate.$gte = new Date(dateFrom);
            if (dateTo) filter.expenseDate.$lte = new Date(dateTo);
        }
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { expenseNumber: regex },
                { description: regex },
                { vendorName: regex },
                { sourceNumber: regex },
            ];
        }
        const [expenses, total, aggregateSummary] = await Promise.all([
            Expense.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Expense.countDocuments(filter),
            Expense.aggregate([
                { $match: { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false } },
                {
                    $group: {
                        _id: "$status",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const totals = { actual: 0, committed: 0, pending: 0, approved: 0, reversed: 0, rejected: 0 };
        for (const row of aggregateSummary) {
            if (row._id === "Actual") totals.actual += row.total;
            else if (row._id === "Approved") totals.approved += row.total;
            else if (row._id === "Committed") totals.committed = row.total;
            else if (row._id === "Pending") totals.pending = row.total;
            else if (row._id === "Reversed") totals.reversed = row.total;
            else if (row._id === "Rejected") totals.rejected = row.total;
        }
        const enrichedExpenses = await Promise.all(expenses.map(enrichExpenseUsers));
        logger.info("Expenses fetched", { total, page: pageNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, {
                expenses: enrichedExpenses,
                totals: {
                    actualSpend: parseFloat(totals.actual.toFixed(2)),
                    approvedExpenses: parseFloat(totals.approved.toFixed(2)),
                    committedCosts: parseFloat(totals.committed.toFixed(2)),
                    pendingApproval: parseFloat(totals.pending.toFixed(2)),
                },
                pagination: {
                    total, page: pageNumber, limit: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: pageNumber < Math.ceil(total / pageSize),
                    hasPrev: pageNumber > 1,
                },
            },
                total > 0 ? "Expenses Retrieved" : "No Expenses Found",
                `Fetched ${expenses.length} expense record(s)`
            )
        );
    } catch (error) {
        logger.error("getAllExpenses failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve expenses", [error.message]));
    }
};



// This function fetches details of a specific expense. takes x-company-id in headers, projectId and expenseId in params. returns complete expense information. -------------------------- Ayan
export const getSingleExpense = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId, expenseId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        if (!isValidObjectId(expenseId)) return res.status(400).json(new ApiErrors(400, "Invalid Expense ID", "Valid expenseId required"));
        const expense = await Expense.findOne({ _id: expenseId, projectId, companyId, isDeleted: false })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!expense) return res.status(404).json(new ApiErrors(404, "Expense Not Found", "No expense found with the given ID"));
        const enrichedExpense = await enrichExpenseUsers(expense);
        return res.status(200).json(new ApiResponse(200, { expense: enrichedExpense }, "Expense Retrieved", "Expense fetched successfully"));
    } catch (error) {
        logger.error("getSingleExpense failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve expense", [error.message]));
    }
};


// This function returns project financial dashboard data. takes x-company-id in headers and projectId in params. fetches summarized financial metrics including budgets, actuals and commitments. -------------------------- Ayan
export const getProjectDashboard = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        const financialData = await getProjectFinancialSummary(projectId, companyId);
        if (!financialData) return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found"));
        return res.status(200).json(new ApiResponse(200, financialData, "Dashboard Retrieved", "Project financial dashboard loaded"));
    } catch (error) {
        logger.error("getProjectDashboard failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve dashboard", [error.message]));
    }
};


// This function returns committed cost expenses for a project. takes x-company-id in headers and projectId in params. supports filtering (type, vendorId) and returns committed expenses with total committed amount. -------------------------- Ayan
export const getCommittedCosts = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        const { type, vendorId: filterVendorId } = req.query;
        const validTypes = ["PO_Commitment", "WO_Commitment"];
        const filter = {
            companyId,
            projectId: new mongoose.Types.ObjectId(projectId),
            status: "Committed",
            isDeleted: false,
        };
        if (type && validTypes.includes(type)) filter.type = type;
        if (filterVendorId && isValidObjectId(filterVendorId)) filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        const [expenses, totalAmount] = await Promise.all([
            Expense.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ expenseDate: -1 })
                .lean(),
            Expense.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        ]);
        return res.status(200).json(
            new ApiResponse(200, {
                expenses,
                totalCommitted: parseFloat((totalAmount[0]?.total ?? 0).toFixed(2)),
                count: expenses.length,
            },
                expenses.length > 0 ? "Committed Costs Retrieved" : "No Committed Costs",
                `${expenses.length} outstanding committed cost(s)`
            )
        );
    } catch (error) {
        logger.error("getCommittedCosts failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve committed costs", [error.message]));
    }
};



// This function exports expense report as an Excel file. takes x-company-id in headers and projectId in params. fetches financial summary and expenses, enriches user data and generates downloadable Excel report. -------------------------- Ayan
export const exportExpenseReport = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!isValidObjectId(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        const baseFilter = { companyId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false };
        const [financialData, allExpenses, committedExpenses] = await Promise.all([
            getProjectFinancialSummary(projectId, companyId),
            Expense.find(baseFilter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ expenseDate: -1 })
                .lean(),
            Expense.find({ ...baseFilter, status: "Committed" })
                .select("-__v -isDeleted -deletedAt")
                .sort({ expenseDate: -1 })
                .lean(),
        ]);

        if (!financialData) return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found"));
        const allUserIds = [...new Set([
            ...allExpenses.map(e => e.createdBy?.toString()),
            ...committedExpenses.map(e => e.createdBy?.toString()),
        ].filter(Boolean))];
        const users = await User.find({ _id: { $in: allUserIds } }).select("_id keycloakId name").lean();
        const userMap = {};
        for (const u of users) userMap[u._id.toString()] = u.name || u.keycloakId || "Unknown";

        const enrichName = (exp) => ({
            ...exp,
            _createdByName: exp.createdBy ? (userMap[exp.createdBy.toString()] || "—") : "—",
        });

        const enrichedAll = allExpenses.map(enrichName);
        const enrichedCommitted = committedExpenses.map(enrichName);
        const wb = await buildExpenseReportWorkbook(financialData, enrichedAll, enrichedCommitted);
        const projectCode = financialData.project.projectCode || financialData.project._id.toString();
        const safeName = projectCode.replace(/[^a-zA-Z0-9\-_]/g, "_");
        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `Expense_Report_${safeName}_${dateStr}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        await wb.xlsx.write(res);
        res.end();
        logger.info("Expense report exported", { projectId, companyId, filename });
    } catch (error) {
        if (!res.headersSent) {
            logger.error("exportExpenseReport failed", { message: error.message, stack: error.stack });
            return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to generate expense report", [error.message]));
        }
        logger.error("exportExpenseReport stream error", { message: error.message });
    }
};



//This function returns daily/weekly/monthly expense totals for the bar chart. Takes x-company-id in headers, projectId in params.Query params: dateFrom (ISO), dateTo (ISO), granularity (day). Defaults: last 30 days, granularity = day . Returns: array of { label, total, count } sorted by date ascending. ---------------------------- Ayan
export const getExpenseTrend = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { projectId } = req.params;
        if (!isValidObjectId(projectId))
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId required"));
        const { granularity = "day" } = req.query;
        if (granularity !== "day") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Granularity", "Only granularity=day is supported")
            );
        }
        let dateTo = req.query.dateTo ? new Date(req.query.dateTo) : new Date();
        let dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom)
            : new Date(dateTo.getTime() - 6 * 24 * 60 * 60 * 1000);
        if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date", "dateFrom and dateTo must be valid ISO date strings"));
        }
        dateFrom.setUTCHours(0, 0, 0, 0);
        dateTo.setUTCHours(23, 59, 59, 999);
        const pipeline = [
            {
                $match: {
                    companyId,
                    projectId: new mongoose.Types.ObjectId(projectId),
                    isDeleted: false,
                    status: { $in: ["Actual"] },
                    expenseDate: { $gte: dateFrom, $lte: dateTo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$expenseDate",
                            timezone: "Asia/Kolkata",
                        },
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    label: "$_id",
                    total: { $round: ["$total", 2] },
                    count: 1,
                },
            },
        ];
        const trendData = await Expense.aggregate(pipeline);
        logger.info("Expense trend fetched", {
            projectId,
            companyId,
            granularity,
            dateFrom,
            dateTo,
            buckets: trendData.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    trend: trendData,
                    meta: {
                        granularity,
                        dateFrom: dateFrom.toISOString(),
                        dateTo: dateTo.toISOString(),
                        buckets: trendData.length,
                    },
                },
                "Expense Trend Retrieved",
                `${trendData.length} data point(s) for ${granularity} granularity`
            )
        );
    } catch (error) {
        logger.error("getExpenseTrend failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve expense trend", [error.message])
        );
    }
};