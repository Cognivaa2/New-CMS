import mongoose from "mongoose";
import Company from "../models/company.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import Project from "../models/project.models.js";
import Task from "../models/task.models.js";
import WorkOrder from "../models/workOrder.models.js";
import GRN from "../models/grn.models.js";
import Issue from "../models/issue.models.js";
import Payable from "../models/payable.models.js";
import Expense from "../models/expense.models.js";
import Inventory from "../models/inventory.models.js";
import MaterialMaster from "../models/materialMaster.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";



const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? "+100.0%" : "0.0%";
    }
    const diff = current - previous;
    const change = (diff / previous) * 100;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
};

const getMonthBounds = (now) => {
    const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfCurrentMonth = now;
    const startOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const endOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    return { startOfCurrentMonth, endOfCurrentMonth, startOfPreviousMonth, endOfPreviousMonth };
};


const buildCountFacet = (startOfCurrentMonth, endOfCurrentMonth, startOfPreviousMonth, endOfPreviousMonth) => ({
    allTime: [{ $count: "count" }],
    currentMonth: [
        { $match: { createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } } },
        { $count: "count" },
    ],
    previousMonth: [
        { $match: { createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } } },
        { $count: "count" },
    ],
});

const extractCount = (facetResult, key = "allTime") => facetResult?.[key]?.[0]?.count || 0;



export const getCompanyDashboardKPIs = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const companyObjectId = company._id;
        const now = new Date();
        const { startOfCurrentMonth, endOfCurrentMonth, startOfPreviousMonth, endOfPreviousMonth } = getMonthBounds(now);
        const facet = buildCountFacet(startOfCurrentMonth, endOfCurrentMonth, startOfPreviousMonth, endOfPreviousMonth);
        const [
            projectAgg,
            poAgg,
            woAgg,
            grnAgg,
            mrAgg,
            issueAgg,
            payableAgg,
            inventoryAgg,
            expenseAgg,
            taskAgg,
        ] = await Promise.all([
            Project.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
            PurchaseOrder.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
            WorkOrder.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
            GRN.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
            MaterialRequisition.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
            Issue.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
            Payable.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        status: { $in: ["Unpaid", "PartiallyPaid"] },
                    },
                },
                {
                    $facet: {
                        allTime: [{ $group: { _id: null, totalDue: { $sum: "$dueAmount" }, count: { $sum: 1 } } }],
                        currentMonth: [
                            { $match: { createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } } },
                            { $group: { _id: null, totalDue: { $sum: "$dueAmount" }, count: { $sum: 1 } } },
                        ],
                        previousMonth: [
                            { $match: { createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } } },
                            { $group: { _id: null, totalDue: { $sum: "$dueAmount" }, count: { $sum: 1 } } },
                        ],
                    },
                },
            ]),
            Inventory.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                {
                    $facet: {
                        allTime: [{ $count: "count" }],
                        currentMonth: [
                            { $match: { createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } } },
                            { $count: "count" },
                        ],
                        previousMonth: [
                            { $match: { createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } } },
                            { $count: "count" },
                        ],
                    },
                },
            ]),
            Expense.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isDeleted: false,
                        status: { $in: ["Committed", "Actual", "Approved"] },
                    },
                },
                {
                    $facet: {
                        allTime: [{ $group: { _id: null, totalAmount: { $sum: "$amount" } } }],
                        currentMonth: [
                            { $match: { createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } } },
                            { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
                        ],
                        previousMonth: [
                            { $match: { createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } } },
                            { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
                        ],
                    },
                },
            ]),
            Task.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                { $facet: facet },
            ]),
        ]);
        const proj = projectAgg[0];
        const po = poAgg[0];
        const wo = woAgg[0];
        const grn = grnAgg[0];
        const mr = mrAgg[0];
        const issue = issueAgg[0];
        const payable = payableAgg[0];
        const inv = inventoryAgg[0];
        const expense = expenseAgg[0];
        const task = taskAgg[0];
        const payload = {
            totalProjects: extractCount(proj, "allTime"),
            totalProjectsChange: calculatePercentageChange(extractCount(proj, "currentMonth"), extractCount(proj, "previousMonth")),
            totalPurchaseOrders: extractCount(po, "allTime"),
            totalPurchaseOrdersChange: calculatePercentageChange(extractCount(po, "currentMonth"), extractCount(po, "previousMonth")),
            totalWorkOrders: extractCount(wo, "allTime"),
            totalWorkOrdersChange: calculatePercentageChange(extractCount(wo, "currentMonth"), extractCount(wo, "previousMonth")),
            totalGRNs: extractCount(grn, "allTime"),
            totalGRNsChange: calculatePercentageChange(extractCount(grn, "currentMonth"), extractCount(grn, "previousMonth")),
            totalMRs: extractCount(mr, "allTime"),
            totalMRsChange: calculatePercentageChange(extractCount(mr, "currentMonth"), extractCount(mr, "previousMonth")),
            totalIssues: extractCount(issue, "allTime"),
            totalIssuesChange: calculatePercentageChange(extractCount(issue, "currentMonth"), extractCount(issue, "previousMonth")),
            openPayablesCount: payable?.allTime?.[0]?.count || 0,
            openPayablesDueAmount: Math.round((payable?.allTime?.[0]?.totalDue || 0) * 100) / 100,
            openPayablesChange: calculatePercentageChange(
                payable?.currentMonth?.[0]?.totalDue || 0,
                payable?.previousMonth?.[0]?.totalDue || 0
            ),
            totalInventoryItems: extractCount(inv, "allTime"),
            totalInventoryItemsChange: calculatePercentageChange(extractCount(inv, "currentMonth"), extractCount(inv, "previousMonth")),
            totalExpenseAmount: Math.round((expense?.allTime?.[0]?.totalAmount || 0) * 100) / 100,
            totalExpenseAmountChange: calculatePercentageChange(
                expense?.currentMonth?.[0]?.totalAmount || 0,
                expense?.previousMonth?.[0]?.totalAmount || 0
            ),
            totalTasks: extractCount(task, "allTime"),
            totalTasksChange: calculatePercentageChange(extractCount(task, "currentMonth"), extractCount(task, "previousMonth")),
        };
        logger.info("Company dashboard KPIs fetched successfully", { companyId: company._id });
        return res.status(200).json(new ApiResponse(200, payload, "Company Dashboard KPIs retrieved successfully", "KPI cards loaded"));
    } catch (error) {
        logger.error("getCompanyDashboardKPIs failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to fetch company dashboard KPIs", [error.message]));
    }
};




export const getProjectCompletionChart = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const companyObjectId = company._id;
        const statusFilter = req.query.status
            ? { status: req.query.status }
            : {};
        const projects = await Project.find(
            { companyId: companyObjectId, isDeleted: false, ...statusFilter },
            { projectName: 1, projectCode: 1, status: 1, healthStatus: 1, completionPercent: 1, budget: 1, startDate: 1, endDate: 1 }
        )
            .sort({ completionPercent: -1 })
            .lean();
        const statusSummary = projects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {});
        const avgCompletion =
            projects.length > 0
                ? Math.round(projects.reduce((sum, p) => sum + (p.completionPercent || 0), 0) / projects.length * 10) / 10
                : 0;
        const payload = {
            totalProjects: projects.length,
            avgCompletionPercent: avgCompletion,
            statusSummary,
            projects: projects.map((p) => ({
                id: p._id,
                name: p.projectName,
                code: p.projectCode || null,
                status: p.status,
                healthStatus: p.healthStatus,
                completionPercent: p.completionPercent || 0,
                budget: p.budget,
                startDate: p.startDate,
                endDate: p.endDate,
            })),
        };
        logger.info("Project completion chart data fetched", { companyId: company._id, projectCount: projects.length });
        return res.status(200).json(new ApiResponse(200, payload, "Project completion chart data retrieved successfully", "Project growth chart loaded"));
    } catch (error) {
        logger.error("getProjectCompletionChart failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to fetch project completion chart data", [error.message]));
    }
};



export const getInventoryPieChart = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const companyObjectId = company._id;
        const [stockStatusAgg, categoryAgg] = await Promise.all([
            Inventory.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        totalCurrentStock: { $sum: "$currentStock" },
                        totalConsumed: { $sum: "$totalConsumed" },
                        totalReceived: { $sum: "$totalReceived" },
                        belowMinimum: {
                            $sum: {
                                $cond: [{ $lt: ["$currentStock", "$minimumLevel"] }, 1, 0],
                            },
                        },
                        zeroStock: {
                            $sum: {
                                $cond: [{ $eq: ["$currentStock", 0] }, 1, 0],
                            },
                        },
                        adequateStock: {
                            $sum: {
                                $cond: [{ $gte: ["$currentStock", "$minimumLevel"] }, 1, 0],
                            },
                        },
                    },
                },
            ]),
            Inventory.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false } },
                {
                    $group: {
                        _id: { $ifNull: ["$category", "Uncategorized"] },
                        itemCount: { $sum: 1 },
                        totalCurrentStock: { $sum: "$currentStock" },
                        totalConsumed: { $sum: "$totalConsumed" },
                        totalReceived: { $sum: "$totalReceived" },
                    },
                },
                { $sort: { totalReceived: -1 } },
                { $limit: 8 },
            ]),
        ]);
        const stockStatus = stockStatusAgg[0] || {
            totalItems: 0,
            totalCurrentStock: 0,
            totalConsumed: 0,
            totalReceived: 0,
            belowMinimum: 0,
            zeroStock: 0,
            adequateStock: 0,
        };
        const payload = {
            stockStatusBreakdown: {
                adequateStock: stockStatus.adequateStock,
                belowMinimum: stockStatus.belowMinimum - stockStatus.zeroStock,
                zeroStock: stockStatus.zeroStock,
                totalItems: stockStatus.totalItems,
            },
            summary: {
                totalItems: stockStatus.totalItems,
                totalCurrentStock: Math.round(stockStatus.totalCurrentStock * 1000) / 1000,
                totalConsumed: Math.round(stockStatus.totalConsumed * 1000) / 1000,
                totalReceived: Math.round(stockStatus.totalReceived * 1000) / 1000,
            },
            categoryBreakdown: categoryAgg.map((c) => ({
                category: c._id,
                itemCount: c.itemCount,
                totalCurrentStock: Math.round(c.totalCurrentStock * 1000) / 1000,
                totalConsumed: Math.round(c.totalConsumed * 1000) / 1000,
                totalReceived: Math.round(c.totalReceived * 1000) / 1000,
            })),
        };
        logger.info("Inventory pie chart data fetched", { companyId: company._id });
        return res.status(200).json(new ApiResponse(200, payload, "Inventory pie chart data retrieved successfully", "Inventory overview loaded"));
    } catch (error) {
        logger.error("getInventoryPieChart failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to fetch inventory pie chart data", [error.message]));
    }
};




export const getProjectExpenseChart = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const companyObjectId = company._id;
        const projects = await Project.find(
            { companyId: companyObjectId, isDeleted: false },
            { projectName: 1, budget: 1, status: 1, completionPercent: 1 }
        ).lean();
        if (projects.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, { projects: [], summary: { totalBudget: 0, totalExpense: 0, overBudgetCount: 0 } }, "No projects found", "Expense chart loaded")
            );
        }
        const projectIds = projects.map((p) => p._id);
        const expenseAgg = await Expense.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    projectId: { $in: projectIds },
                    isDeleted: false,
                    status: { $in: ["Committed", "Actual", "Approved"] },
                },
            },
            {
                $group: {
                    _id: "$projectId",
                    totalExpense: { $sum: "$amount" },
                    committedAmount: {
                        $sum: { $cond: [{ $eq: ["$status", "Committed"] }, "$amount", 0] },
                    },
                    actualAmount: {
                        $sum: { $cond: [{ $in: ["$status", ["Actual", "Approved"]] }, "$amount", 0] },
                    },
                },
            },
        ]);
        const expenseMap = {};
        expenseAgg.forEach((e) => {
            expenseMap[e._id.toString()] = {
                totalExpense: Math.round(e.totalExpense * 100) / 100,
                committedAmount: Math.round(e.committedAmount * 100) / 100,
                actualAmount: Math.round(e.actualAmount * 100) / 100,
            };
        });
        let totalBudget = 0;
        let totalExpense = 0;
        let overBudgetCount = 0;
        const projectData = projects.map((p) => {
            const expense = expenseMap[p._id.toString()] || { totalExpense: 0, committedAmount: 0, actualAmount: 0 };
            const budget = p.budget || 0;
            const spent = expense.totalExpense;
            const utilization = budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0;
            const isOverBudget = spent > budget;
            totalBudget += budget;
            totalExpense += spent;
            if (isOverBudget) overBudgetCount++;
            return {
                id: p._id,
                name: p.projectName,
                status: p.status,
                completionPercent: p.completionPercent || 0,
                budget,
                totalExpense: spent,
                committedAmount: expense.committedAmount,
                actualAmount: expense.actualAmount,
                remainingBudget: Math.round((budget - spent) * 100) / 100,
                utilizationPercent: utilization,
                isOverBudget,
            };
        });
        projectData.sort((a, b) => b.totalExpense - a.totalExpense);
        const payload = {
            projects: projectData,
            summary: {
                totalBudget: Math.round(totalBudget * 100) / 100,
                totalExpense: Math.round(totalExpense * 100) / 100,
                overallUtilizationPercent: totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 1000) / 10 : 0,
                overBudgetCount,
                withinBudgetCount: projects.length - overBudgetCount,
            },
        };
        logger.info("Project expense chart data fetched", { companyId: company._id, projectCount: projects.length });
        return res.status(200).json(new ApiResponse(200, payload, "Project expense chart data retrieved successfully", "Expense chart loaded"));
    } catch (error) {
        logger.error("getProjectExpenseChart failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to fetch project expense chart data", [error.message]));
    }
};



export const getCompanyTasksFlow = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const companyObjectId = company._id;
        const days = parseInt(req.query.days, 10) || 12;
        const windowDays = Math.min(Math.max(days, 1), 90);
        const today = new Date();
        const windowStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - windowDays + 1, 0, 0, 0, 0));
        const [createdAgg, completedAgg] = await Promise.all([
            Task.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false, createdAt: { $gte: windowStart, $lte: today } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Task.aggregate([
                { $match: { companyId: companyObjectId, isDeleted: false, status: "Completed", updatedAt: { $gte: windowStart, $lte: today } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "UTC" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);
        const dateSpine = [];
        for (let i = 0; i < windowDays; i++) {
            const d = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
            dateSpine.push(d.toISOString().slice(0, 10));
        }
        const createdMap = Object.fromEntries(createdAgg.map(({ _id, count }) => [_id, count]));
        const completedMap = Object.fromEntries(completedAgg.map(({ _id, count }) => [_id, count]));
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let totalCreatedInWindow = 0;
        let totalCompletedInWindow = 0;
        const trends = dateSpine.map((dateStr) => {
            const created = createdMap[dateStr] || 0;
            const completed = completedMap[dateStr] || 0;
            totalCreatedInWindow += created;
            totalCompletedInWindow += completed;
            const [, month, day] = dateStr.split("-").map(Number);
            return { date: dateStr, formattedDate: `${day} ${monthNames[month - 1]}`, created, completed };
        });
        const payload = {
            windowDays,
            windowStart: windowStart.toISOString().slice(0, 10),
            windowEnd: today.toISOString().slice(0, 10),
            trends,
            summary: {
                totalCreatedInWindow,
                totalCompletedInWindow,
                netChange: totalCreatedInWindow - totalCompletedInWindow,
                completionRate: totalCreatedInWindow > 0
                    ? `${((totalCompletedInWindow / totalCreatedInWindow) * 100).toFixed(1)}%`
                    : "0.0%",
            },
        };
        logger.info("Company dashboard tasks flow fetched successfully", { companyId: company._id, windowDays });
        return res.status(200).json(new ApiResponse(200, payload, "Company tasks flow metrics retrieved successfully", "Daily task creation and completion trends loaded"));
    } catch (error) {
        logger.error("getCompanyTasksFlow failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to fetch company tasks flow metrics", [error.message]));
    }
};