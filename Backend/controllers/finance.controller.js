import mongoose from "mongoose";
import Payable from "../models/payable.models.js";
import PaymentTransaction from "../models/paymentTransaction.models.js";
import VendorAdvanceTxn from "../models/vendorAdvanceTxn.models.js";
import Vendor from "../models/vendors.models.js";
import Project from "../models/project.models.js";
import Expense from "../models/expense.models.js";
import Company from "../models/company.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import {
    resolveCompany,
    isValidObjectId,
    safeFixed,
    buildDateRangeFilter,
    getCurrentMonthBounds,
    buildPagination,
} from "../helpers/financeHelper.js";


// This function returns company-wide financial overview analytics. takes x-company-id in headers. computes payable totals, paid amounts, outstanding dues, vendor advance pool, overdue payables, active vendors, monthly spend and budget utilization KPIs. -------------------------- Ayan
export const getFinanceOverview = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { monthStart, monthEnd } = getCurrentMonthBounds();
        const [
            payableSummary,
            overdueCount,
            activeVendorCount,
            monthlySpend,
            budgetAgg,
        ] = await Promise.all([
            Payable.aggregate([
                { $match: { companyId } },
                {
                    $group: {
                        _id: null,
                        totalPayable: { $sum: "$totalAmount" },
                        totalPaid: { $sum: "$paidAmount" },
                        totalAdvanceDeducted: { $sum: "$advanceDeducted" },
                        totalDue: { $sum: "$dueAmount" },
                    },
                },
            ]),
            Payable.countDocuments({
                companyId,
                dueDate: { $lt: new Date() },
                status: { $in: ["Unpaid", "PartiallyPaid"] },
            }),
            Vendor.countDocuments({ companyId, isDeleted: false, isActive: true }),
            PaymentTransaction.aggregate([
                {
                    $match: {
                        companyId,
                        paymentDate: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSpend: { $sum: "$amount" },
                        txnCount: { $sum: 1 },
                    },
                },
            ]),
            Project.aggregate([
                { $match: { companyId, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalBudget: { $sum: "$budget" },
                    },
                },
            ]),
        ]);
        const ps = payableSummary[0] ?? {
            totalPayable: 0,
            totalPaid: 0,
            totalAdvanceDeducted: 0,
            totalDue: 0,
        };
        const totalBudget = budgetAgg[0]?.totalBudget ?? 0;
        const totalPaid = ps.totalPaid;
        const budgetUtilization =
            totalBudget > 0 ? safeFixed((totalPaid / totalBudget) * 100) : 0;
        const vendorAdvancePool = await Vendor.aggregate([
            { $match: { companyId, isDeleted: false, advanceBalance: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    totalAvailableBalance: { $sum: "$advanceBalance" },
                    vendorCount: { $sum: 1 },
                },
            },
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    totalPayables: safeFixed(ps.totalPayable),
                    totalPaid: safeFixed(ps.totalPaid),
                    outstandingDue: safeFixed(ps.totalDue),
                    vendorAdvancePool: {
                        totalAvailableBalance: safeFixed(vendorAdvancePool[0]?.totalAvailableBalance ?? 0),
                        vendorCount: vendorAdvancePool[0]?.vendorCount ?? 0,
                    },
                    overduePayables: overdueCount,
                    activeVendors: activeVendorCount,
                    monthlySpend: {
                        amount: safeFixed(monthlySpend[0]?.totalSpend ?? 0),
                        txnCount: monthlySpend[0]?.txnCount ?? 0,
                        month: monthStart.toISOString().slice(0, 7),
                    },
                    budgetUtilization: {
                        totalBudget: safeFixed(totalBudget),
                        totalSpent: safeFixed(totalPaid),
                        utilizationPercent: budgetUtilization,
                    },
                },
                "Financial Overview",
                "Company-wide financial KPI summary loaded"
            )
        );
    } catch (err) {
        logger.error("getFinanceOverview failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load overview", [err.message]));
    }
};



// This function returns company cash flow trend analytics. takes x-company-id in headers and supports granularity (daily, weekly, monthly) with optional date range filters. computes payment spend trends, advance deductions, settlement totals and transaction volume over time. -------------------------- Ayan
export const getCashFlow = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { granularity = "monthly", dateFrom, dateTo } = req.query;
        const validGranularities = ["daily", "weekly", "monthly"];
        if (!validGranularities.includes(granularity))
            return res.status(400).json(new ApiErrors(400, "Invalid Granularity", "granularity must be daily, weekly or monthly"));
        const now = new Date();
        let rangeStart, rangeEnd;
        if (dateFrom && dateTo) {
            rangeStart = new Date(dateFrom);
            rangeEnd = new Date(dateTo);
            if (isNaN(rangeStart) || isNaN(rangeEnd))
                return res.status(400).json(new ApiErrors(400, "Invalid Date", "dateFrom and dateTo must be valid ISO strings"));
        } else {
            if (granularity === "daily") {
                rangeEnd = new Date(now);
                rangeStart = new Date(now);
                rangeStart.setDate(rangeStart.getDate() - 29);
            } else if (granularity === "weekly") {
                rangeEnd = new Date(now);
                rangeStart = new Date(now);
                rangeStart.setDate(rangeStart.getDate() - 83);
            } else {
                rangeEnd = new Date(now);
                rangeStart = new Date(now);
                rangeStart.setMonth(rangeStart.getMonth() - 11);
                rangeStart.setDate(1);
            }
        }
        rangeStart.setUTCHours(0, 0, 0, 0);
        rangeEnd.setUTCHours(23, 59, 59, 999);
        let dateGroupId;
        if (granularity === "daily") {
            dateGroupId = { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate", timezone: "UTC" } };
        } else if (granularity === "weekly") {
            dateGroupId = {
                year: { $isoWeekYear: "$paymentDate" },
                week: { $isoWeek: "$paymentDate" },
            };
        } else {
            dateGroupId = { $dateToString: { format: "%Y-%m", date: "$paymentDate", timezone: "UTC" } };
        }
        const pipeline = [
            {
                $match: {
                    companyId,
                    paymentDate: { $gte: rangeStart, $lte: rangeEnd },
                },
            },
            {
                $group: {
                    _id: dateGroupId,
                    totalSpend: { $sum: "$amount" },
                    advanceDeducted: { $sum: "$advanceDeducted" },
                    totalSettled: { $sum: "$totalSettled" },
                    paymentVolume: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];
        const rawData = await PaymentTransaction.aggregate(pipeline);
        const trend = rawData.map((row) => {
            let label;
            if (granularity === "weekly") {
                label = `W${String(row._id.week).padStart(2, "0")}-${row._id.year}`;
            } else {
                label = row._id;
            }
            return {
                label,
                totalSpend: safeFixed(row.totalSpend),
                advanceDeducted: safeFixed(row.advanceDeducted),
                totalSettled: safeFixed(row.totalSettled),
                paymentVolume: row.paymentVolume,
            };
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    trend,
                    meta: {
                        granularity,
                        dateFrom: rangeStart.toISOString(),
                        dateTo: rangeEnd.toISOString(),
                        buckets: trend.length,
                    },
                },
                "Cash Flow Trend",
                `${trend.length} data point(s) for ${granularity} granularity`
            )
        );
    } catch (err) {
        logger.error("getCashFlow failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load cash flow", [err.message]));
    }
};



// This function returns expense distribution analytics for a company. takes x-company-id in headers and supports filtering (date range, projectId). computes category-wise, type-wise and payment-mode-wise expense breakdowns. -------------------------- Ayan
export const getExpenseBreakdown = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { dateFrom, dateTo, projectId } = req.query;
        const baseMatch = {
            companyId,
            isDeleted: false,
            status: { $nin: ["Reversed", "Rejected"] },
        };
        if (dateFrom || dateTo) {
            baseMatch.expenseDate = buildDateRangeFilter(dateFrom, dateTo);
        }
        if (projectId && isValidObjectId(projectId)) {
            baseMatch.projectId = new mongoose.Types.ObjectId(projectId);
        }
        const [byCategory, byType, byPaymentMode] = await Promise.all([
            Expense.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { totalAmount: -1 } },
            ]),
            Expense.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: "$type",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { totalAmount: -1 } },
            ]),
            PaymentTransaction.aggregate([
                {
                    $match: {
                        companyId,
                        ...(dateFrom || dateTo
                            ? { paymentDate: buildDateRangeFilter(dateFrom, dateTo) }
                            : {}),
                        ...(projectId && isValidObjectId(projectId)
                            ? { projectId: new mongoose.Types.ObjectId(projectId) }
                            : {}),
                    },
                },
                {
                    $group: {
                        _id: "$paymentMode",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { totalAmount: -1 } },
            ]),
        ]);
        const formatRows = (rows) =>
            rows.map((r) => ({
                label: r._id ?? "Unknown",
                totalAmount: safeFixed(r.totalAmount),
                count: r.count,
            }));
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    categoryBreakdown: formatRows(byCategory),
                    typeBreakdown: formatRows(byType),
                    paymentModeBreakdown: formatRows(byPaymentMode),
                },
                "Expense Distribution",
                "Category, type and payment mode breakdown loaded"
            )
        );
    } catch (err) {
        logger.error("getExpenseBreakdown failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load expense breakdown", [err.message]));
    }
};



// This function returns financial alerts for a company. takes x-company-id in headers. identifies overdue payables, upcoming dues, high-risk vendors and delayed settlements with summarized financial risk records. -------------------------- Ayan
export const getFinanceAlerts = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const now = new Date();
        const upcomingWindowEnd = new Date(now);
        upcomingWindowEnd.setDate(upcomingWindowEnd.getDate() + 7);
        const [overduePayables, upcomingDues, highRiskVendors, delayedSettlements] = await Promise.all([
            Payable.find({
                companyId,
                dueDate: { $lt: now },
                status: { $in: ["Unpaid", "PartiallyPaid"] },
            })
                .select("payableNumber projectId vendorId vendorName totalAmount dueAmount dueDate status sourceType")
                .sort({ dueDate: 1 })
                .limit(20)
                .lean(),
            Payable.find({
                companyId,
                dueDate: { $gte: now, $lte: upcomingWindowEnd },
                status: { $in: ["Unpaid", "PartiallyPaid"] },
            })
                .select("payableNumber projectId vendorId vendorName totalAmount dueAmount dueDate status sourceType")
                .sort({ dueDate: 1 })
                .limit(20)
                .lean(),
            Payable.aggregate([
                {
                    $match: {
                        companyId,
                        vendorId: { $ne: null },
                        status: { $in: ["Unpaid", "PartiallyPaid"] },
                        dueDate: { $lt: now },
                    },
                },
                {
                    $group: {
                        _id: "$vendorId",
                        vendorName: { $first: "$vendorName" },
                        overdueCount: { $sum: 1 },
                        totalOverdue: { $sum: "$dueAmount" },
                    },
                },
                { $sort: { totalOverdue: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        vendorId: "$_id",
                        vendorName: 1,
                        overdueCount: 1,
                        totalOverdue: { $round: ["$totalOverdue", 2] },
                    },
                },
            ]),
            Payable.find({
                companyId,
                status: "PartiallyPaid",
                dueDate: { $lt: now },
            })
                .select("payableNumber projectId vendorId vendorName totalAmount paidAmount dueAmount dueDate")
                .sort({ dueDate: 1 })
                .limit(15)
                .lean(),
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    overduePayables: {
                        count: overduePayables.length,
                        records: overduePayables,
                    },
                    upcomingDues: {
                        count: upcomingDues.length,
                        windowDays: 7,
                        records: upcomingDues,
                    },
                    highRiskVendors: {
                        count: highRiskVendors.length,
                        records: highRiskVendors,
                    },
                    delayedSettlements: {
                        count: delayedSettlements.length,
                        records: delayedSettlements,
                    },
                },
                "Financial Alerts",
                "Overdue, upcoming dues and risk alerts loaded"
            )
        );
    } catch (err) {
        logger.error("getFinanceAlerts failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load alerts", [err.message]));
    }
};



// This function returns project-wise financial overview analytics. takes x-company-id in headers. supports pagination, search (projectName, projectCode, clientName), filtering (status) and sorting with project budget, spend, payable and utilization metrics. -------------------------- Ayan
export const getProjectFinancialOverview = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const {
            page = 1,
            limit = 20,
            search = "",
            status,
            sortBy = "dueAmount",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSort = ["dueAmount", "totalPayable", "totalPaid", "budget", "utilizationPercent"];
        const sortField = allowedSort.includes(sortBy) ? sortBy : "dueAmount";
        const projectFilter = { companyId, isDeleted: false };
        if (status) projectFilter.status = status;
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            projectFilter.$or = [{ projectName: regex }, { projectCode: regex }, { clientName: regex }];
        }
        const [projects, total] = await Promise.all([
            Project.find(projectFilter)
                .select("_id projectName projectCode clientName budget status healthStatus startDate endDate")
                .lean(),
            Project.countDocuments(projectFilter),
        ]);
        if (!projects.length) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { projects: [], pagination: buildPagination(0, pageNumber, pageSize) },
                    "No Projects Found",
                    "No projects match the given filters"
                )
            );
        }
        const projectIds = projects.map((p) => p._id);
        const [payableAgg, expenseAgg] = await Promise.all([
            Payable.aggregate([
                {
                    $match: {
                        companyId,
                        projectId: { $in: projectIds },
                        status: { $nin: ["Reversed"] },
                    },
                },
                {
                    $group: {
                        _id: "$projectId",
                        totalPayable: { $sum: "$totalAmount" },
                        totalPaid: { $sum: "$paidAmount" },
                        totalAdvanceDeducted: { $sum: "$advanceDeducted" },
                        outstanding: { $sum: "$dueAmount" },
                    },
                },
            ]),
            Expense.aggregate([
                {
                    $match: {
                        companyId,
                        projectId: { $in: projectIds },
                        isDeleted: false,
                        status: { $nin: ["Reversed", "Rejected"] },
                    },
                },
                {
                    $group: {
                        _id: "$projectId",
                        actualSpend: {
                            $sum: { $cond: [{ $eq: ["$status", "Actual"] }, "$amount", 0] },
                        },
                        committedSpend: {
                            $sum: { $cond: [{ $eq: ["$status", "Committed"] }, "$amount", 0] },
                        },
                    },
                },
            ]),
        ]);
        const payableMap = {};
        for (const p of payableAgg) payableMap[p._id.toString()] = p;
        const expenseMap = {};
        for (const e of expenseAgg) expenseMap[e._id.toString()] = e;
        const enriched = projects.map((proj) => {
            const pid = proj._id.toString();
            const pay = payableMap[pid] ?? {};
            const exp = expenseMap[pid] ?? {};
            const budget = proj.budget ?? 0;
            const totalSpent = (exp.actualSpend ?? 0) + (exp.committedSpend ?? 0);
            const utilizationPercent = budget > 0 ? safeFixed((totalSpent / budget) * 100) : 0;
            return {
                projectId: proj._id,
                projectName: proj.projectName,
                projectCode: proj.projectCode,
                clientName: proj.clientName,
                status: proj.status,
                healthStatus: proj.healthStatus,
                startDate: proj.startDate,
                endDate: proj.endDate,
                budget: safeFixed(budget),
                actualSpend: safeFixed(exp.actualSpend ?? 0),
                committedSpend: safeFixed(exp.committedSpend ?? 0),
                totalPayable: safeFixed(pay.totalPayable ?? 0),
                totalPaid: safeFixed(pay.totalPaid ?? 0),
                outstanding: safeFixed(pay.outstanding ?? 0),
                utilizationPercent,
            };
        });
        enriched.sort((a, b) =>
            sortOrder === 1 ? a[sortField] - b[sortField] : b[sortField] - a[sortField]
        );
        const paginated = enriched.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    projects: paginated,
                    pagination: buildPagination(total, pageNumber, pageSize),
                },
                "Project Financial Overview",
                `Fetched ${paginated.length} project(s)`
            )
        );
    } catch (err) {
        logger.error("getProjectFinancialOverview failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load project overview", [err.message]));
    }
};



// This function returns recent financial transactions for a company. takes x-company-id in headers. supports pagination, tab-based filtering (Payments, Advances, Refunds), vendor/project filtering, paymentMode filtering and date range filtering with enriched project and vendor details. -------------------------- Ayan
export const getRecentTransactions = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const {
            page = 1,
            limit = 20,
            tab = "All",
            vendorId: filterVendorId,
            projectId: filterProjectId,
            paymentMode,
            dateFrom,
            dateTo,
        } = req.query;
        const validTabs = ["All", "Payments", "Advances", "Refunds"];
        if (!validTabs.includes(tab))
            return res.status(400).json(new ApiErrors(400, "Invalid Tab", `tab must be one of: ${validTabs.join(", ")}`));
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const vendorObjId =
            filterVendorId && isValidObjectId(filterVendorId)
                ? new mongoose.Types.ObjectId(filterVendorId)
                : null;
        const projectObjId =
            filterProjectId && isValidObjectId(filterProjectId)
                ? new mongoose.Types.ObjectId(filterProjectId)
                : null;
        const dateFilter = dateFrom || dateTo ? buildDateRangeFilter(dateFrom, dateTo) : null;
        const enrichWithNames = async (rawTxns) => {
            if (!rawTxns.length) return rawTxns;
            const projectIds = [...new Set(
                rawTxns.map((t) => t.projectId).filter(Boolean).map((id) => id.toString())
            )].map((id) => new mongoose.Types.ObjectId(id));
            const vendorIds = [...new Set(
                rawTxns.map((t) => t.vendorId).filter(Boolean).map((id) => id.toString())
            )].map((id) => new mongoose.Types.ObjectId(id));

            const [projects, vendors] = await Promise.all([
                projectIds.length
                    ? Project.find({ _id: { $in: projectIds } }).select("_id projectName").lean()
                    : [],
                vendorIds.length
                    ? Vendor.find({ _id: { $in: vendorIds } }).select("_id name").lean()
                    : [],
            ]);
            const projectMap = {};
            for (const p of projects) projectMap[p._id.toString()] = p.projectName;
            const vendorMap = {};
            for (const v of vendors) vendorMap[v._id.toString()] = v.name;
            return rawTxns.map((t) => ({
                ...t,
                projectName: t.projectId ? (projectMap[t.projectId.toString()] ?? null) : null,
                vendorName: t.vendorId ? (vendorMap[t.vendorId.toString()] ?? null) : null,
            }));
        };
        let transactions = [];
        let total = 0;
        if (tab === "Payments" || tab === "All") {
            const payFilter = { companyId };
            if (vendorObjId) payFilter.vendorId = vendorObjId;
            if (projectObjId) payFilter.projectId = projectObjId;
            if (paymentMode) payFilter.paymentMode = paymentMode;
            if (dateFilter) payFilter.paymentDate = dateFilter;

            if (tab === "Payments") {
                const [txns, count] = await Promise.all([
                    PaymentTransaction.find(payFilter)
                        .select("-__v -proofKey")
                        .sort({ paymentDate: -1 })
                        .skip((pageNumber - 1) * pageSize)
                        .limit(pageSize)
                        .lean(),
                    PaymentTransaction.countDocuments(payFilter),
                ]);
                const tagged = txns.map((t) => ({ ...t, txnCategory: "Payment" }));
                transactions = await enrichWithNames(tagged);
                total = count;
            } else {
                const advFilter = { companyId, txnType: { $in: ["Credit", "Debit", "Refund"] } };
                if (vendorObjId) advFilter.vendorId = vendorObjId;
                if (dateFilter) advFilter.paymentDate = dateFilter;

                const [payTxns, advTxns, payCount, advCount] = await Promise.all([
                    PaymentTransaction.find(payFilter)
                        .select("-__v -proofKey")
                        .sort({ paymentDate: -1 })
                        .lean(),
                    VendorAdvanceTxn.find(advFilter)
                        .select("-__v -proofKey")
                        .sort({ createdAt: -1 })
                        .lean(),
                    PaymentTransaction.countDocuments(payFilter),
                    VendorAdvanceTxn.countDocuments(advFilter),
                ]);
                const merged = [
                    ...payTxns.map((t) => ({
                        ...t,
                        txnCategory: "Payment",
                        sortDate: t.paymentDate,
                    })),
                    ...advTxns.map((t) => ({
                        ...t,
                        txnCategory:
                            t.txnType === "Refund"
                                ? "Refund"
                                : t.txnType === "Credit"
                                    ? "Advance"
                                    : "AdvanceDebit",
                        sortDate: t.createdAt,
                    })),
                ];
                merged.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
                total = payCount + advCount;
                const start = (pageNumber - 1) * pageSize;
                const paged = merged.slice(start, start + pageSize);
                transactions = await enrichWithNames(paged);
            }
        } else {
            const txnTypeMap = { Advances: ["Credit"], Refunds: ["Refund"] };
            const advFilter = {
                companyId,
                txnType: { $in: txnTypeMap[tab] },
            };
            if (vendorObjId) advFilter.vendorId = vendorObjId;
            if (dateFilter) advFilter.paymentDate = dateFilter;

            const [txns, count] = await Promise.all([
                VendorAdvanceTxn.find(advFilter)
                    .select("-__v -proofKey")
                    .sort({ createdAt: -1 })
                    .skip((pageNumber - 1) * pageSize)
                    .limit(pageSize)
                    .lean(),
                VendorAdvanceTxn.countDocuments(advFilter),
            ]);
            const tagged = txns.map((t) => ({
                ...t,
                txnCategory: tab === "Refunds" ? "Refund" : "Advance",
            }));
            transactions = await enrichWithNames(tagged);
            total = count;
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    transactions,
                    pagination: buildPagination(total, pageNumber, pageSize),
                    meta: { tab },
                },
                "Recent Transactions",
                `Fetched ${transactions.length} transaction(s)`
            )
        );
    } catch (err) {
        logger.error("getRecentTransactions failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load transactions", [err.message]));
    }
};



// This function returns all payables company-wide. takes x-company-id in headers. supports pagination, search (payableNumber, sourceNumber, vendorName), filtering (status, sourceType, vendorId, projectId, date range) and sorting with payable financial details. -------------------------- Ayan
export const getAllPayables = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const {
            page = 1,
            limit = 20,
            sortBy = "createdAt",
            order = "desc",
            status,
            sourceType,
            vendorId: filterVendorId,
            projectId: filterProjectId,
            dateFrom,
            dateTo,
            search = "",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const sortOrder = order === "asc" ? 1 : -1;
        const allowedSort = ["createdAt", "payableNumber", "totalAmount", "dueAmount", "dueDate", "status"];
        const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
        const filter = { companyId: company._id };
        if (status && ["Unpaid", "PartiallyPaid", "Paid", "Reversed"].includes(status))
            filter.status = status;
        if (sourceType && ["GRN", "WO", "ManualExpense"].includes(sourceType))
            filter.sourceType = sourceType;
        if (filterVendorId && isValidObjectId(filterVendorId))
            filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        if (filterProjectId && isValidObjectId(filterProjectId))
            filter.projectId = new mongoose.Types.ObjectId(filterProjectId);
        if (dateFrom || dateTo) filter.createdAt = buildDateRangeFilter(dateFrom, dateTo);
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [{ payableNumber: regex }, { sourceNumber: regex }, { vendorName: regex }];
        }
        const [payables, total] = await Promise.all([
            Payable.find(filter)
                .select("payableNumber projectId vendorId vendorName sourceType sourceNumber totalAmount paidAmount dueAmount status dueDate createdAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Payable.countDocuments(filter),
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    payables,
                    pagination: buildPagination(total, pageNumber, pageSize),
                },
                total > 0 ? "Payables Retrieved" : "No Payables Found",
                `Fetched ${payables.length} payable(s)`
            )
        );
    } catch (err) {
        logger.error("getAllPayables failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve payables", [err.message]));
    }
};



// This function returns top vendors based on financial exposure. takes x-company-id in headers and supports limit with sorting (outstanding, totalPayable, totalPaid, payableCount). computes vendor payable analytics, outstanding balances and advance balances with vendor profile details. -------------------------- Ayan
export const getTopVendors = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { limit = 10, sortBy = "outstanding" } = req.query;
        const topN = Math.min(Math.max(Number(limit), 1), 50);
        const allowedSort = ["outstanding", "totalPayable", "totalPaid", "payableCount"];
        const sortField = allowedSort.includes(sortBy) ? sortBy : "outstanding";
        const vendorAgg = await Payable.aggregate([
            {
                $match: {
                    companyId,
                    vendorId: { $ne: null },
                    status: { $nin: ["Reversed"] },
                },
            },
            {
                $group: {
                    _id: "$vendorId",
                    vendorName: { $first: "$vendorName" },
                    totalPayable: { $sum: "$totalAmount" },
                    totalPaid: { $sum: "$paidAmount" },
                    outstanding: { $sum: "$dueAmount" },
                    payableCount: { $sum: 1 },
                },
            },
            { $sort: { [sortField]: -1 } },
            { $limit: topN },
        ]);
        const vendorIds = vendorAgg.map((v) => v._id);
        const vendors = await Vendor.find({
            _id: { $in: vendorIds },
            isDeleted: false,
        })
            .select("_id advanceBalance isActive vendorType photo")
            .lean();
        const vendorDetailMap = {};
        for (const v of vendors) vendorDetailMap[v._id.toString()] = v;
        const result = vendorAgg.map((v, idx) => {
            const detail = vendorDetailMap[v._id.toString()] ?? {};
            return {
                rank: idx + 1,
                vendorId: v._id,
                vendorName: v.vendorName,
                vendorType: detail.vendorType ?? null,
                isActive: detail.isActive ?? null,
                totalPayable: safeFixed(v.totalPayable),
                totalPaid: safeFixed(v.totalPaid),
                outstanding: safeFixed(v.outstanding),
                advanceBalance: safeFixed(detail.advanceBalance ?? 0),
                payableCount: v.payableCount,
                photo: detail.photo ?? null,
            };
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                { vendors: result, count: result.length },
                "Vendor Financial Exposure",
                `Top ${result.length} vendor(s) by ${sortField}`
            )
        );
    } catch (err) {
        logger.error("getTopVendors failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load top vendors", [err.message]));
    }
};



// This function returns vendor advance pool summary for a company. takes x-company-id in headers. supports pagination and search (vendor name, vendorType, contactPerson) and computes vendor-wise advance balances, credited advances and utilized advances. -------------------------- Ayan
export const getVendorAdvanceSummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const companyId = company._id;
        const { page = 1, limit = 20, search = "" } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const [poolSummary, advanceTxnSummary] = await Promise.all([
            Vendor.aggregate([
                { $match: { companyId, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalVendors: { $sum: 1 },
                        vendorsWithAdvance: {
                            $sum: { $cond: [{ $gt: ["$advanceBalance", 0] }, 1, 0] },
                        },
                        totalAvailableBalance: { $sum: "$advanceBalance" },
                    },
                },
            ]),
            VendorAdvanceTxn.aggregate([
                { $match: { companyId } },
                {
                    $group: {
                        _id: null,
                        totalAdvancePaid: {
                            $sum: {
                                $cond: [{ $in: ["$txnType", ["Credit", "Refund"]] }, "$amount", 0],
                            },
                        },
                        totalAdvanceUsed: {
                            $sum: {
                                $cond: [{ $eq: ["$txnType", "Debit"] }, "$amount", 0],
                            },
                        },
                    },
                },
            ]),
        ]);
        const vendorFilter = { companyId, isDeleted: false };
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            vendorFilter.$or = [{ name: regex }, { vendorType: regex }, { contactPerson: regex }];
        }
        const [vendors, vendorTotal] = await Promise.all([
            Vendor.find(vendorFilter)
                .select("_id name vendorType contactPerson advanceBalance isActive")
                .sort({ advanceBalance: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Vendor.countDocuments(vendorFilter),
        ]);
        const vendorIds = vendors.map((v) => v._id);
        const advanceTxnByVendor = await VendorAdvanceTxn.aggregate([
            { $match: { companyId, vendorId: { $in: vendorIds } } },
            {
                $group: {
                    _id: "$vendorId",
                    totalCredited: {
                        $sum: {
                            $cond: [{ $in: ["$txnType", ["Credit", "Refund"]] }, "$amount", 0],
                        },
                    },
                    totalDebited: {
                        $sum: {
                            $cond: [{ $eq: ["$txnType", "Debit"] }, "$amount", 0],
                        },
                    },
                },
            },
        ]);
        const txnByVendorMap = {};
        for (const t of advanceTxnByVendor) txnByVendorMap[t._id.toString()] = t;
        const enrichedVendors = vendors.map((v) => {
            const txn = txnByVendorMap[v._id.toString()] ?? {};
            return {
                vendorId: v._id,
                name: v.name,
                vendorType: v.vendorType,
                contactPerson: v.contactPerson,
                isActive: v.isActive,
                totalAdvancePaid: safeFixed(txn.totalCredited ?? 0),
                totalAdvanceUsed: safeFixed(txn.totalDebited ?? 0),
                availableBalance: safeFixed(v.advanceBalance ?? 0),
            };
        });
        const pool = poolSummary[0] ?? {};
        const txn = advanceTxnSummary[0] ?? {};
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    poolSummary: {
                        totalAdvancePaid: safeFixed(txn.totalAdvancePaid ?? 0),
                        totalAdvanceUsed: safeFixed(txn.totalAdvanceUsed ?? 0),
                        totalAvailableBalance: safeFixed(pool.totalAvailableBalance ?? 0),
                        vendorsWithAdvance: pool.vendorsWithAdvance ?? 0,
                        totalVendors: pool.totalVendors ?? 0,
                    },
                    vendors: enrichedVendors,
                    pagination: buildPagination(vendorTotal, pageNumber, pageSize),
                },
                "Vendor Advance Pool",
                `${enrichedVendors.length} vendor(s) loaded`
            )
        );
    } catch (err) {
        logger.error("getVendorAdvanceSummary failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to load vendor advance summary", [err.message]));
    }
};



// This function returns overdue payables for a company. takes x-company-id in headers. supports pagination and filtering (vendorId, projectId) and returns unpaid or partially paid overdue payable records. -------------------------- Ayan
export const getOverduePayables = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const {
            page = 1,
            limit = 20,
            vendorId: filterVendorId,
            projectId: filterProjectId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const filter = {
            companyId: company._id,
            dueDate: { $lt: new Date() },
            status: { $in: ["Unpaid", "PartiallyPaid"] },
        };
        if (filterVendorId && isValidObjectId(filterVendorId))
            filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        if (filterProjectId && isValidObjectId(filterProjectId))
            filter.projectId = new mongoose.Types.ObjectId(filterProjectId);
        const [payables, total] = await Promise.all([
            Payable.find(filter)
                .select("-__v")
                .sort({ dueDate: 1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Payable.countDocuments(filter),
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    payables,
                    pagination: buildPagination(total, pageNumber, pageSize),
                },
                total > 0 ? "Overdue Payables Found" : "No Overdue Payables",
                `${total} overdue payable(s)`
            )
        );
    } catch (err) {
        logger.error("getOverduePayables failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve overdue payables", [err.message]));
    }
};



// This function returns vendor financial summary list for a company. takes x-company-id in headers. supports pagination and search (vendor name, vendorType, contactPerson) and returns payable, paid, due, advance and utilization analytics for each vendor. -------------------------- Ayan
export const getVendorFinancialList = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim())
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        const company = await resolveCompany(companyUUID);
        if (!company)
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        const { page = 1, limit = 20, search = "" } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const payablesByVendor = await Payable.aggregate([
            {
                $match: {
                    companyId: company._id,
                    vendorId: { $ne: null },
                    status: { $nin: ["Reversed"] },
                },
            },
            {
                $group: {
                    _id: "$vendorId",
                    totalPayable: { $sum: "$totalAmount" },
                    totalPaid: { $sum: "$paidAmount" },
                    totalAdvanceUsed: { $sum: "$advanceDeducted" },
                    totalDue: { $sum: "$dueAmount" },
                    payableCount: { $sum: 1 },
                },
            },
        ]);
        const payableMap = {};
        for (const p of payablesByVendor) payableMap[p._id.toString()] = p;
        const vendorFilter = { companyId: company._id, isDeleted: false };
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            vendorFilter.$or = [{ name: regex }, { vendorType: regex }, { contactPerson: regex }];
        }
        const [vendors, total] = await Promise.all([
            Vendor.find(vendorFilter)
                .select("_id name vendorType contactPerson phone email isActive advanceBalance")
                .sort({ name: 1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Vendor.countDocuments(vendorFilter),
        ]);
        const enriched = vendors.map((v) => {
            const p = payableMap[v._id.toString()] ?? {};
            return {
                ...v,
                totalPayable: safeFixed(p.totalPayable ?? 0),
                totalPaid: safeFixed(p.totalPaid ?? 0),
                totalAdvanceUsed: safeFixed(p.totalAdvanceUsed ?? 0),
                totalDue: safeFixed(p.totalDue ?? 0),
                payableCount: p.payableCount ?? 0,
                availableAdvance: safeFixed(v.advanceBalance ?? 0),
            };
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    vendors: enriched,
                    pagination: buildPagination(total, pageNumber, pageSize),
                },
                "Vendor Finance List Retrieved",
                `Fetched ${vendors.length} vendor(s)`
            )
        );
    } catch (err) {
        logger.error("getVendorFinancialList failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve vendors", [err.message]));
    }
};



// This function returns detailed financial profile of a vendor. takes x-company-id in headers and vendorId in params. returns vendor details, payable summaries, advance summaries, payment history, payable records and vendor advance transactions. -------------------------- Ayan
export const getVendorFinancialProfile = async (req, res) => {
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
        const companyId = company._id;
        const vendor = await Vendor.findOne({
            _id: vendorId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!vendor)
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found", "No vendor found"));
        const vendorObjId = new mongoose.Types.ObjectId(vendorId);
        const [payables, advanceTxns, paymentTxns, advanceAgg] = await Promise.all([
            Payable.find({ companyId, vendorId: vendorObjId })
                .select("-__v")
                .sort({ createdAt: -1 })
                .lean(),
            VendorAdvanceTxn.find({ companyId, vendorId: vendorObjId })
                .select("-__v -proofKey")
                .sort({ createdAt: -1 })
                .limit(50)
                .lean(),
            PaymentTransaction.find({ companyId, vendorId: vendorObjId })
                .select("-__v -proofKey")
                .sort({ paymentDate: -1 })
                .limit(50)
                .lean(),
            VendorAdvanceTxn.aggregate([
                { $match: { companyId, vendorId: vendorObjId } },
                {
                    $group: {
                        _id: null,
                        totalAdvancePaid: {
                            $sum: {
                                $cond: [{ $in: ["$txnType", ["Credit", "Refund"]] }, "$amount", 0],
                            },
                        },
                        totalAdvanceUsed: {
                            $sum: {
                                $cond: [{ $eq: ["$txnType", "Debit"] }, "$amount", 0],
                            },
                        },
                    },
                },
            ]),
        ]);
        const payableSummary = payables.reduce(
            (acc, p) => {
                if (p.status !== "Reversed") {
                    acc.totalPayable += p.totalAmount;
                    acc.totalPaid += p.paidAmount;
                    acc.totalDue += p.dueAmount;
                }
                return acc;
            },
            { totalPayable: 0, totalPaid: 0, totalDue: 0 }
        );
        for (const k of Object.keys(payableSummary)) {
            payableSummary[k] = safeFixed(payableSummary[k]);
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    vendor,
                    advanceSummary: {
                        totalAdvancePaid: safeFixed(advanceAgg[0]?.totalAdvancePaid ?? 0),
                        totalAdvanceUsed: safeFixed(advanceAgg[0]?.totalAdvanceUsed ?? 0),
                        availableBalance: safeFixed(vendor.advanceBalance ?? 0),
                    },
                    payableSummary,
                    payables,
                    advanceTransactions: advanceTxns,
                    recentPayments: paymentTxns,
                },
                "Vendor Financial Profile Retrieved",
                `Financial profile for ${vendor.name}`
            )
        );
    } catch (err) {
        logger.error("getVendorFinancialProfile failed", { message: err.message });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to retrieve vendor profile", [err.message]));
    }
};