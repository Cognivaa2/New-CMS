import Project from "../models/project.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Inventory from "../models/inventory.models.js";
import Issue from "../models/issue.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import StockTransfer from "../models/stockTransfer.models.js";
import {
    resolveCompanyOrError,
    resolveProjectOrError,
    enrichUser,
    todayUTC,
    daysFromNow,
    daysAgo,
    ymd,
    addDays,
    midnight,
    clamp,
    normalise,
    percentile,
    intensityBucket,
    isValidObjectId,
    pct
} from "../helpers/projectDashboardHelper.js";
import { generateAllAlerts, summariseAlerts } from "../services/alertEngine.service.js";



const deriveExecutionHealth = (overdueRate, blockedRate) => {
    if (overdueRate > 20 || blockedRate > 15) return "delayed";
    if (overdueRate > 10 || blockedRate > 8) return "at_risk";
    return "on_track";
};

const deriveWorkloadStatus = (totalAssigned) => {
    if (totalAssigned >= 8) return "overloaded";
    if (totalAssigned <= 2) return "underutilized";
    return "balanced";
};

// const pct = (numerator, denominator) =>
//     denominator === 0 ? 0 : parseFloat(((numerator / denominator) * 100).toFixed(2));



// This function returns detailed project overview. takes x-company-id in headers and projectId in params. calculates timeline progress, remaining days, overdue status and returns complete project metadata. -------------------------- Ayan
export const getProjectDetails = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const now = Date.now();
        const start = new Date(project.startDate).getTime();
        const end = new Date(project.endDate).getTime();
        const totalDuration = end - start;
        let timelineProgress = 0;
        if (totalDuration > 0) {
            timelineProgress = Math.min(
                100,
                Math.max(0, ((now - start) / totalDuration) * 100)
            );
        }
        const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        const payload = {
            projectId: project._id,
            projectName: project.projectName,
            projectCode: project.projectCode,
            description: project.description,
            location: project.location,
            clientName: project.clientName,
            coverImage: project.coverImage,
            budget: project.budget,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status,
            healthStatus: project.healthStatus,
            completionPercent: project.completionPercent,
            timelineProgress: parseFloat(timelineProgress.toFixed(2)),
            remainingDays,
            isOverdue: remainingDays < 0 && project.status !== "completed",
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
        logger.info("getProjectDetails success", { projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, payload, "Project Details Retrieved", "Project details fetched successfully")
        );
    } catch (error) {
        logger.error("getProjectDetails failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch project details", [error.message])
        );
    }
};


// This function returns all project members. takes x-company-id in headers and projectId in params. fetches assigned users, enriches user details and computes task and subtask counts for each member. -------------------------- Ayan
export const getProjectMembers = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const assignedUsers = project.assignedUsers || [];
        if (assignedUsers.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { members: [], totalMembers: 0 },
                    "No Members",
                    "No users are assigned to this project yet"
                )
            );
        }
        const userIds = assignedUsers.map((u) => u.userId);
        const [taskCounts, subTaskCounts] = await Promise.all([
            Task.aggregate([
                {
                    $match: {
                        projectId: project._id,
                        assignedTo: { $in: userIds },
                        isDeleted: false,
                    },
                },
                { $unwind: "$assignedTo" },
                {
                    $match: { assignedTo: { $in: userIds } },
                },
                {
                    $group: {
                        _id: "$assignedTo",
                        count: { $sum: 1 },
                    },
                },
            ]),
            SubTask.aggregate([
                {
                    $match: {
                        projectId: project._id,
                        assignedTo: { $in: userIds },
                        isDeleted: false,
                    },
                },
                { $unwind: "$assignedTo" },
                {
                    $match: { assignedTo: { $in: userIds } },
                },
                {
                    $group: {
                        _id: "$assignedTo",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const taskCountMap = {};
        taskCounts.forEach((t) => {
            taskCountMap[t._id.toString()] = t.count;
        });
        const subTaskCountMap = {};
        subTaskCounts.forEach((s) => {
            subTaskCountMap[s._id.toString()] = s.count;
        });
        const members = await Promise.all(
            assignedUsers.map(async (assigned) => {
                const enriched = await enrichUser(assigned.userId);
                const uid = assigned.userId.toString();
                return {
                    userId: assigned.userId,
                    keycloakId: enriched?.keycloakId || null,
                    name: enriched?.name || "Unknown",
                    email: enriched?.email || null,
                    avatar: enriched?.avatar || null,
                    role: enriched?.role || null,
                    designation: assigned.designation || null,
                    assignedAt: assigned.assignedAt,
                    taskCount: taskCountMap[uid] || 0,
                    subTaskCount: subTaskCountMap[uid] || 0,
                    totalAssigned: (taskCountMap[uid] || 0) + (subTaskCountMap[uid] || 0),
                };
            })
        );
        members.sort((a, b) => b.totalAssigned - a.totalAssigned);
        logger.info("getProjectMembers success", {
            projectId,
            companyId,
            memberCount: members.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                { members, totalMembers: members.length },
                "Members Retrieved",
                `Fetched ${members.length} project member(s)`
            )
        );
    } catch (error) {
        logger.error("getProjectMembers failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch project members", [error.message])
        );
    }
};


// This function returns phase growth analytics. takes x-company-id in headers and projectId in params. calculates phase-wise progress, planned vs actual deviation, task distribution and timeline health metrics. -------------------------- Ayan
export const getPhaseGrowth = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const pId = project._id;
        const today = todayUTC();
        const phases = await Phase.find({
            projectId: pId,
            companyId,
            isDeleted: false,
        })
            .select("_id phaseName sequence startDate endDate completionPercent description")
            .sort({ sequence: 1 })
            .lean();
        if (phases.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { phases: [], totalPhases: 0, projectCompletionPercent: project.completionPercent },
                    "No Phases",
                    "No phases found for this project"
                )
            );
        }
        const phaseIds = phases.map((p) => p._id);
        const taskAgg = await Task.aggregate([
            {
                $match: {
                    projectId: pId,
                    companyId,
                    phaseId: { $in: phaseIds },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: { phaseId: "$phaseId", status: "$status" },
                    count: { $sum: 1 },
                },
            },
        ]);
        const taskMap = {};
        taskAgg.forEach(({ _id, count }) => {
            const pid = _id.phaseId.toString();
            if (!taskMap[pid]) taskMap[pid] = {};
            taskMap[pid][_id.status] = count;
        });
        const enrichedPhases = phases.map((phase) => {
            const pid = phase._id.toString();
            const statusMap = taskMap[pid] || {};
            const completed = statusMap["Completed"] || 0;
            const inProgress = statusMap["InProgress"] || 0;
            const notStarted = statusMap["NotStarted"] || 0;
            const blocked = statusMap["Blocked"] || 0;
            const onHold = statusMap["OnHold"] || 0;
            const totalTasks = completed + inProgress + notStarted + blocked + onHold;
            const now = Date.now();
            const start = new Date(phase.startDate).getTime();
            const end = new Date(phase.endDate).getTime();
            const duration = end - start;
            let plannedProgress = 0;
            if (duration > 0) {
                plannedProgress = Math.min(
                    100,
                    Math.max(0, ((now - start) / duration) * 100)
                );
            }
            const daysRemaining = Math.ceil(
                (new Date(phase.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysRemaining < 0 && phase.completionPercent < 100;
            const deviation = plannedProgress - phase.completionPercent;
            let phaseHealth = "on_track";
            if (isOverdue) {
                phaseHealth = "delayed";
            } else if (deviation > 20) {
                phaseHealth = "at_risk";
            }
            return {
                phaseId: phase._id,
                phaseName: phase.phaseName,
                description: phase.description,
                sequence: phase.sequence,
                startDate: phase.startDate,
                endDate: phase.endDate,
                completionPercent: phase.completionPercent,
                plannedProgress: parseFloat(plannedProgress.toFixed(2)),
                deviation: parseFloat((plannedProgress - phase.completionPercent).toFixed(2)),
                taskSummary: {
                    total: totalTasks,
                    completed,
                    inProgress,
                    notStarted,
                    blocked,
                    onHold,
                },
                timeline: {
                    daysRemaining,
                    isOverdue,
                    phaseHealth,
                },
            };
        });
        const overallCompletion =
            enrichedPhases.length > 0
                ? parseFloat(
                    (
                        enrichedPhases.reduce((sum, p) => sum + p.completionPercent, 0) /
                        enrichedPhases.length
                    ).toFixed(2)
                )
                : 0;
        logger.info("getPhaseGrowth success", {
            projectId,
            companyId,
            phaseCount: phases.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    phases: enrichedPhases,
                    totalPhases: enrichedPhases.length,
                    projectCompletionPercent: project.completionPercent,
                    averagePhaseCompletion: overallCompletion,
                },
                "Phase Growth Retrieved",
                `Fetched growth data for ${enrichedPhases.length} phase(s)`
            )
        );
    } catch (error) {
        logger.error("getPhaseGrowth failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch phase growth data", [error.message])
        );
    }
};


// This function returns smart alerts for a project. takes x-company-id in headers and projectId in params. generates alerts across modules, supports filtering (priority, module), limits results and returns summary with performance metrics. -------------------------- Ayan
export const getSmartAlerts = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const { priority, module: moduleFilter, limit = "50" } = req.query;
        const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        const validPriorities = ["critical", "warning", "info"];
        const validModules = [
            "task",
            "phase",
            "issue",
            "inventory",
            "material_requisition",
            "purchase_order",
            "stock_transfer",
            "project",
        ];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Filter",
                    `priority must be one of: ${validPriorities.join(", ")}`
                )
            );
        }
        if (moduleFilter && !validModules.includes(moduleFilter)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Filter",
                    `module must be one of: ${validModules.join(", ")}`
                )
            );
        }
        const startTime = Date.now();
        let alerts = await generateAllAlerts(project._id, companyId);
        const engineMs = Date.now() - startTime;
        const summary = summariseAlerts(alerts);
        if (priority) {
            alerts = alerts.filter((a) => a.priority === priority);
        }
        if (moduleFilter) {
            alerts = alerts.filter((a) => a.module === moduleFilter);
        }
        const totalFiltered = alerts.length;
        alerts = alerts.slice(0, maxLimit);
        logger.info("getSmartAlerts success", {
            projectId,
            companyId,
            totalAlerts: summary.total,
            critical: summary.critical,
            warning: summary.warning,
            info: summary.info,
            engineMs,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    alerts,
                    summary,
                    meta: {
                        totalFiltered,
                        returned: alerts.length,
                        limit: maxLimit,
                        filters: {
                            priority: priority || null,
                            module: moduleFilter || null,
                        },
                        engineMs,
                    },
                },
                summary.total > 0 ? "Smart Alerts Generated" : "No Alerts",
                summary.total > 0
                    ? `${summary.critical} critical, ${summary.warning} warning, ${summary.info} info alerts detected`
                    : "All systems are healthy — no alerts at this time"
            )
        );
    } catch (error) {
        logger.error("getSmartAlerts failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to generate smart alerts", [error.message])
        );
    }
};



// This function returns project KPI metrics. takes x-company-id in headers and projectId in params. computes schedule deviation, overdue tasks, critical issues, pending approvals and task status distribution with health indicators. -------------------------- Ayan
export const getProjectKPIs = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const today = todayUTC();
        const pId = project._id;
        const [
            overdueTasksCount,
            criticalIssuesCount,
            pendingMRCount,
            pendingPOCount,
            pendingStockTransferCount,
            taskStatusAgg,
        ] = await Promise.all([
            Task.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                endDate: { $lt: today },
                status: { $nin: ["Completed"] },
            }),

            Issue.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                priority: { $in: ["high", "critical"] },
                status: "submitted",
            }),

            MaterialRequisition.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                status: "Submitted",
            }),

            PurchaseOrder.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                status: "Submitted",
            }),

            StockTransfer.countDocuments({
                companyId,
                isDeleted: false,
                status: "Draft",
                $or: [{ fromProjectId: pId }, { toProjectId: pId }],
            }),

            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const now = Date.now();
        const start = new Date(project.startDate).getTime();
        const end = new Date(project.endDate).getTime();
        const totalDuration = end - start;
        let plannedProgress = 0;
        if (totalDuration > 0) {
            plannedProgress = Math.min(
                100,
                Math.max(0, ((now - start) / totalDuration) * 100)
            );
        }
        const actualProgress = project.completionPercent || 0;
        const scheduleDeviation = parseFloat(
            (plannedProgress - actualProgress).toFixed(2)
        );
        const allStatuses = ["NotStarted", "InProgress", "Completed", "Blocked", "OnHold"];
        const taskStatusSummary = {};
        allStatuses.forEach((s) => (taskStatusSummary[s] = 0));
        taskStatusAgg.forEach((row) => {
            if (taskStatusSummary.hasOwnProperty(row._id)) {
                taskStatusSummary[row._id] = row.count;
            }
        });
        const totalTasks = Object.values(taskStatusSummary).reduce((a, b) => a + b, 0);
        const totalPendingApprovals = pendingMRCount + pendingPOCount + pendingStockTransferCount;
        let computedHealth = "on_track";
        if (scheduleDeviation > 20) computedHealth = "delayed";
        logger.info("getProjectKPIs success", { projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    scheduleDeviation: {
                        value: scheduleDeviation,
                        plannedProgress: parseFloat(plannedProgress.toFixed(2)),
                        actualProgress,
                        label:
                            scheduleDeviation > 10
                                ? "Behind Schedule"
                                : scheduleDeviation < -10
                                    ? "Ahead of Schedule"
                                    : "On Track",
                        severity:
                            scheduleDeviation > 20
                                ? "critical"
                                : scheduleDeviation > 10
                                    ? "warning"
                                    : "good",
                    },
                    overdueTasksCount,
                    criticalIssuesCount,
                    pendingApprovals: {
                        mrCount: pendingMRCount,
                        poCount: pendingPOCount,
                        stockTransferCount: pendingStockTransferCount,
                        total: totalPendingApprovals,
                    },
                    taskStatusSummary,
                    totalTasks,
                    computedHealth,
                },
                "KPIs Retrieved",
                "Project KPIs fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getProjectKPIs failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch project KPIs", [error.message])
        );
    }
};



// This function returns execution summary for a project. takes x-company-id in headers and projectId in params. computes task and subtask metrics, completion rates, blocked rates, overdue statistics and overall execution health indicators. -------------------------- Ayan
export const getExecutionSummary = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const pId = project._id;
        const today = todayUTC();
        const [taskStatusAgg, subTaskStatusAgg, overdueTaskCount, overdueSubTaskCount] =
            await Promise.all([
                Task.aggregate([
                    { $match: { projectId: pId, companyId, isDeleted: false } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ]),
                SubTask.aggregate([
                    { $match: { projectId: pId, companyId, isDeleted: false } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ]),
                Task.countDocuments({
                    projectId: pId,
                    companyId,
                    isDeleted: false,
                    endDate: { $lt: today },
                    status: { $ne: "Completed" },
                }),
                SubTask.countDocuments({
                    projectId: pId,
                    companyId,
                    isDeleted: false,
                    endDate: { $lt: today, $ne: null },
                    status: { $ne: "Completed" },
                }),
            ]);
        const taskMap = {};
        taskStatusAgg.forEach(({ _id, count }) => (taskMap[_id] = count));
        const taskMetrics = {
            total:
                (taskMap["NotStarted"] || 0) +
                (taskMap["InProgress"] || 0) +
                (taskMap["Completed"] || 0) +
                (taskMap["Blocked"] || 0) +
                (taskMap["OnHold"] || 0),
            completed: taskMap["Completed"] || 0,
            inProgress: taskMap["InProgress"] || 0,
            blocked: taskMap["Blocked"] || 0,
            onHold: taskMap["OnHold"] || 0,
            notStarted: taskMap["NotStarted"] || 0,
        };
        const subMap = {};
        subTaskStatusAgg.forEach(({ _id, count }) => (subMap[_id] = count));
        const subTaskMetrics = {
            total:
                (subMap["NotStarted"] || 0) +
                (subMap["InProgress"] || 0) +
                (subMap["Completed"] || 0) +
                (subMap["Blocked"] || 0),
            completed: subMap["Completed"] || 0,
            inProgress: subMap["InProgress"] || 0,
            blocked: subMap["Blocked"] || 0,
            notStarted: subMap["NotStarted"] || 0,
        };
        const totalItems = taskMetrics.total + subTaskMetrics.total;
        const completedItems = taskMetrics.completed + subTaskMetrics.completed;
        const blockedItems = taskMetrics.blocked + subTaskMetrics.blocked;
        const totalOverdue = overdueTaskCount + overdueSubTaskCount;
        const nonCompletedItems = totalItems - completedItems;
        const overallCompletionRate = pct(completedItems, totalItems);
        const blockedRate = pct(blockedItems, totalItems);
        const overdueRate = pct(totalOverdue, nonCompletedItems || 1);
        const taskCompletionRate = pct(taskMetrics.completed, taskMetrics.total);
        const executionHealth = deriveExecutionHealth(overdueRate, blockedRate);
        logger.info("getExecutionSummary success", { projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    taskMetrics,
                    subTaskMetrics,
                    derivedMetrics: {
                        overallCompletionRate,
                        taskCompletionRate,
                        blockedRate,
                        overdueRate,
                        totalOverdue,
                        overdueTaskCount,
                        overdueSubTaskCount,
                    },
                    executionHealth,
                    executionHealthLabel:
                        executionHealth === "on_track"
                            ? "On Track"
                            : executionHealth === "at_risk"
                                ? "At Risk"
                                : "Delayed",
                },
                "Execution Summary Retrieved",
                "Execution summary fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getExecutionSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch execution summary", [error.message])
        );
    }
};


// This function returns team workload analytics for a project. takes x-company-id in headers and projectId in params. computes member-wise task distribution, completion rates, overdue tasks, blocked tasks, workload status and productivity insights. -------------------------- Ayan
export const getTeamWorkload = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const pId = project._id;
        const today = todayUTC();
        const assignedUsers = project.assignedUsers || [];
        if (assignedUsers.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        members: [],
                        totalMembers: 0,
                        insights: { mostActiveMember: null, highestWorkloadMember: null, averageWorkload: 0 },
                    },
                    "No Members",
                    "No users are assigned to this project yet"
                )
            );
        }
        const userIds = assignedUsers.map((u) => u.userId);
        const [
            taskAssignAgg,
            subTaskAssignAgg,
            overdueTaskAgg,
            blockedTaskAgg,
        ] = await Promise.all([
            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        assignedTo: { $in: userIds },
                    },
                },
                { $unwind: "$assignedTo" },
                { $match: { assignedTo: { $in: userIds } } },
                {
                    $group: {
                        _id: { userId: "$assignedTo", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            SubTask.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        assignedTo: { $in: userIds },
                    },
                },
                { $unwind: "$assignedTo" },
                { $match: { assignedTo: { $in: userIds } } },
                {
                    $group: {
                        _id: { userId: "$assignedTo", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        assignedTo: { $in: userIds },
                        endDate: { $lt: today },
                        status: { $ne: "Completed" },
                    },
                },
                { $unwind: "$assignedTo" },
                { $match: { assignedTo: { $in: userIds } } },
                { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
            ]),
            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        assignedTo: { $in: userIds },
                        status: "Blocked",
                    },
                },
                { $unwind: "$assignedTo" },
                { $match: { assignedTo: { $in: userIds } } },
                { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
            ]),
        ]);
        const taskStatusMap = {};
        taskAssignAgg.forEach(({ _id, count }) => {
            const uid = _id.userId.toString();
            if (!taskStatusMap[uid]) taskStatusMap[uid] = {};
            taskStatusMap[uid][_id.status] = count;
        });
        const subTaskStatusMap = {};
        subTaskAssignAgg.forEach(({ _id, count }) => {
            const uid = _id.userId.toString();
            if (!subTaskStatusMap[uid]) subTaskStatusMap[uid] = {};
            subTaskStatusMap[uid][_id.status] = count;
        });
        const overdueMap = {};
        overdueTaskAgg.forEach(({ _id, count }) => (overdueMap[_id.toString()] = count));
        const blockedMap = {};
        blockedTaskAgg.forEach(({ _id, count }) => (blockedMap[_id.toString()] = count));
        const members = await Promise.all(
            assignedUsers.map(async (assigned) => {
                const uid = assigned.userId.toString();
                const enriched = await enrichUser(assigned.userId);
                const tMap = taskStatusMap[uid] || {};
                const sMap = subTaskStatusMap[uid] || {};
                const assignedTaskCount =
                    (tMap["NotStarted"] || 0) +
                    (tMap["InProgress"] || 0) +
                    (tMap["Completed"] || 0) +
                    (tMap["Blocked"] || 0) +
                    (tMap["OnHold"] || 0);
                const assignedSubTaskCount =
                    (sMap["NotStarted"] || 0) +
                    (sMap["InProgress"] || 0) +
                    (sMap["Completed"] || 0) +
                    (sMap["Blocked"] || 0);
                const completedTaskCount = tMap["Completed"] || 0;
                const completedSubTaskCount = sMap["Completed"] || 0;
                const inProgressTaskCount = tMap["InProgress"] || 0;
                const totalAssigned = assignedTaskCount + assignedSubTaskCount;
                const totalCompleted = completedTaskCount + completedSubTaskCount;
                const overdueTaskCount = overdueMap[uid] || 0;
                const blockedTaskCount = blockedMap[uid] || 0;
                const completionRate = pct(totalCompleted, totalAssigned);
                const workloadStatus = deriveWorkloadStatus(totalAssigned);
                return {
                    userId: assigned.userId,
                    keycloakId: enriched?.keycloakId || null,
                    name: enriched?.name || "Unknown",
                    email: enriched?.email || null,
                    avatar: enriched?.avatar || null,
                    role: enriched?.role || null,
                    designation: assigned.designation || null,
                    assignedAt: assigned.assignedAt,
                    assignedTaskCount,
                    assignedSubTaskCount,
                    totalAssigned,
                    completedTaskCount,
                    completedSubTaskCount,
                    inProgressTaskCount,
                    totalCompleted,
                    completionRate,
                    overdueTaskCount,
                    blockedTaskCount,
                    workloadStatus,
                    workloadStatusLabel:
                        workloadStatus === "overloaded"
                            ? "Overloaded"
                            : workloadStatus === "underutilized"
                                ? "Underutilized"
                                : "Balanced",
                };
            })
        );
        const mostActiveMember =
            members.length > 0
                ? members.reduce((best, m) =>
                    m.totalCompleted > best.totalCompleted ? m : best
                )
                : null;
        const highestWorkloadMember =
            members.length > 0
                ? members.reduce((best, m) =>
                    m.totalAssigned > best.totalAssigned ? m : best
                )
                : null;
        const averageWorkload =
            members.length > 0
                ? parseFloat(
                    (
                        members.reduce((sum, m) => sum + m.totalAssigned, 0) / members.length
                    ).toFixed(2)
                )
                : 0;
        const workloadDistribution = { overloaded: 0, balanced: 0, underutilized: 0 };
        members.forEach((m) => workloadDistribution[m.workloadStatus]++);
        const workloadOrder = { overloaded: 0, balanced: 1, underutilized: 2 };
        members.sort(
            (a, b) =>
                workloadOrder[a.workloadStatus] - workloadOrder[b.workloadStatus] ||
                b.totalAssigned - a.totalAssigned
        );
        logger.info("getTeamWorkload success", {
            projectId,
            companyId,
            memberCount: members.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    members,
                    totalMembers: members.length,
                    insights: {
                        mostActiveMember: mostActiveMember
                            ? {
                                userId: mostActiveMember.userId,
                                name: mostActiveMember.name,
                                avatar: mostActiveMember.avatar,
                                totalCompleted: mostActiveMember.totalCompleted,
                            }
                            : null,
                        highestWorkloadMember: highestWorkloadMember
                            ? {
                                userId: highestWorkloadMember.userId,
                                name: highestWorkloadMember.name,
                                avatar: highestWorkloadMember.avatar,
                                totalAssigned: highestWorkloadMember.totalAssigned,
                                workloadStatus: highestWorkloadMember.workloadStatus,
                            }
                            : null,
                        averageWorkload,
                        workloadDistribution,
                    },
                },
                "Team Workload Retrieved",
                `Fetched workload data for ${members.length} member(s)`
            )
        );
    } catch (error) {
        logger.error("getTeamWorkload failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch team workload", [error.message])
        );
    }
};



// This function returns execution KPI metrics for a project. takes x-company-id in headers and projectId in params. computes overdue tasks, blocked tasks, task velocity, completion time analytics, due-this-week tasks and high priority pending work metrics. -------------------------- Ayan
export const getExecutionKPIs = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const pId = project._id;
        const today = todayUTC();
        const in7Days = daysFromNow(7);
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [
            overdueTasksCount,
            blockedTasksCount,
            tasksDueThisWeek,
            highPriorityPending,
            completionTimeAgg,
            velocityCount,
            overdueSubTasksCount,
            blockedSubTasksCount,
        ] = await Promise.all([
            Task.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                endDate: { $lt: today },
                status: { $ne: "Completed" },
            }),
            Task.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                status: "Blocked",
            }),
            Task.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                endDate: { $gte: today, $lte: in7Days },
                status: { $ne: "Completed" },
            }),
            Task.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                priority: { $in: ["High", "Critical"] },
                status: { $ne: "Completed" },
            }),
            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        status: "Completed",
                        startDate: { $ne: null },
                        updatedAt: { $ne: null },
                    },
                },
                {
                    $project: {
                        durationDays: {
                            $divide: [
                                { $subtract: ["$updatedAt", "$startDate"] },
                                1000 * 60 * 60 * 24, // ms → days
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgDays: { $avg: "$durationDays" },
                        minDays: { $min: "$durationDays" },
                        maxDays: { $max: "$durationDays" },
                        totalCompleted: { $sum: 1 },
                    },
                },
            ]),
            Task.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                status: "Completed",
                updatedAt: { $gte: sevenDaysAgo },
            }),
            SubTask.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                endDate: { $lt: today, $ne: null },
                status: { $ne: "Completed" },
            }),
            SubTask.countDocuments({
                projectId: pId,
                companyId,
                isDeleted: false,
                status: "Blocked",
            }),
        ]);
        const ctRow = completionTimeAgg[0] || null;
        const avgCompletionTimeDays = ctRow
            ? parseFloat(Math.max(0, ctRow.avgDays).toFixed(1))
            : null;
        const minCompletionTimeDays = ctRow
            ? parseFloat(Math.max(0, ctRow.minDays).toFixed(1))
            : null;
        const maxCompletionTimeDays = ctRow
            ? parseFloat(Math.max(0, ctRow.maxDays).toFixed(1))
            : null;
        const totalCompletedForAvg = ctRow ? ctRow.totalCompleted : 0;
        let velocityLabel = "Low";
        if (velocityCount >= 10) velocityLabel = "High";
        else if (velocityCount >= 4) velocityLabel = "Moderate";
        logger.info("getExecutionKPIs success", { projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    overdueTasksCount,
                    blockedTasksCount,
                    tasksDueThisWeek,
                    highPriorityPendingCount: highPriorityPending,
                    averageCompletionTime: {
                        avgDays: avgCompletionTimeDays,
                        minDays: minCompletionTimeDays,
                        maxDays: maxCompletionTimeDays,
                        basedOnCompletedTasks: totalCompletedForAvg,
                        note:
                            avgCompletionTimeDays === null
                                ? "No completed tasks yet — avg completion time unavailable"
                                : null,
                    },
                    executionVelocity: {
                        tasksCompletedLast7Days: velocityCount,
                        label: velocityLabel,
                        perDayAverage: parseFloat((velocityCount / 7).toFixed(2)),
                    },
                    overdueSubTasksCount,
                    blockedSubTasksCount,
                },
                "Execution KPIs Retrieved",
                "Execution KPI cards fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getExecutionKPIs failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch execution KPIs", [error.message])
        );
    }
};



// This function returns execution trend analytics for a project. takes x-company-id in headers, projectId in params and optional days in query. computes task creation/completion trends, cumulative growth and execution pace insights over time. -------------------------- Ayan
export const getExecutionTrend = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const allowedDays = [7, 14, 30];
        const rawDays = parseInt(req.query.days, 10);
        const windowDays = allowedDays.includes(rawDays) ? rawDays : 7;
        const today = todayUTC();
        const windowStart = new Date(today.getTime() - windowDays * 24 * 60 * 60 * 1000);
        const pId = project._id;
        const [createdAgg, completedAgg] = await Promise.all([
            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        createdAt: { $gte: windowStart, $lte: today },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Task.aggregate([
                {
                    $match: {
                        projectId: pId,
                        companyId,
                        isDeleted: false,
                        status: "Completed",
                        updatedAt: { $gte: windowStart, $lte: today },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "UTC" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);
        const dateSpine = [];
        for (let i = 0; i < windowDays; i++) {
            const d = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
            dateSpine.push(d.toISOString().slice(0, 10));
        }
        const createdMap = {};
        createdAgg.forEach(({ _id, count }) => (createdMap[_id] = count));
        const completedMap = {};
        completedAgg.forEach(({ _id, count }) => (completedMap[_id] = count));
        let cumulativeCreated = 0;
        let cumulativeCompleted = 0;
        const tasksCreatedPerDay = [];
        const tasksCompletedPerDay = [];
        const cumulativeCreatedSeries = [];
        const cumulativeCompletedSeries = [];
        dateSpine.forEach((date) => {
            const created = createdMap[date] || 0;
            const completed = completedMap[date] || 0;
            cumulativeCreated += created;
            cumulativeCompleted += completed;
            tasksCreatedPerDay.push({ date, count: created });
            tasksCompletedPerDay.push({ date, count: completed });
            cumulativeCreatedSeries.push({ date, count: cumulativeCreated });
            cumulativeCompletedSeries.push({ date, count: cumulativeCompleted });
        });
        const totalCreatedInWindow = cumulativeCreated;
        const totalCompletedInWindow = cumulativeCompleted;
        const netPending = totalCreatedInWindow - totalCompletedInWindow;
        const half = Math.floor(windowDays / 2);
        const firstHalfCompleted = tasksCompletedPerDay
            .slice(0, half)
            .reduce((s, d) => s + d.count, 0);
        const secondHalfCompleted = tasksCompletedPerDay
            .slice(half)
            .reduce((s, d) => s + d.count, 0);
        let trendDirection = "stable";
        if (secondHalfCompleted > firstHalfCompleted * 1.2) trendDirection = "accelerating";
        else if (secondHalfCompleted < firstHalfCompleted * 0.8) trendDirection = "decelerating";
        logger.info("getExecutionTrend success", {
            projectId,
            companyId,
            windowDays,
            totalCreated: totalCreatedInWindow,
            totalCompleted: totalCompletedInWindow,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    windowDays,
                    windowStart: windowStart.toISOString().slice(0, 10),
                    windowEnd: today.toISOString().slice(0, 10),
                    tasksCreatedPerDay,
                    tasksCompletedPerDay,
                    cumulativeCreatedSeries,
                    cumulativeCompletedSeries,
                    summary: {
                        totalCreatedInWindow,
                        totalCompletedInWindow,
                        netPending,
                        trendDirection,
                        trendLabel:
                            trendDirection === "accelerating"
                                ? "Team is speeding up"
                                : trendDirection === "decelerating"
                                    ? "Team is slowing down"
                                    : "Steady pace",
                    },
                },
                "Execution Trend Retrieved",
                `Fetched execution trend for the last ${windowDays} days`
            )
        );
    } catch (error) {
        logger.error("getExecutionTrend failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch execution trend", [error.message])
        );
    }
};



// This function returns burn-down chart analytics for a project or phase. takes x-company-id in headers, projectId in params and optional scope with phaseId in query. generates ideal vs actual remaining task trends, completion forecast and projected delay analysis. -------------------------- Ayan
export const getBurnDownChart = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const { scope = "project", phaseId } = req.query;
        let scopeStart = midnight(new Date(project.startDate));
        let scopeEnd = midnight(new Date(project.endDate));
        let taskFilter = { projectId: project._id, companyId, isDeleted: false };
        let scopeLabel = project.projectName;
        if (scope === "phase") {
            if (!phaseId || !isValidObjectId(phaseId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Bad Request", "A valid phaseId query param is required when scope=phase")
                );
            }
            const phase = await Phase.findOne({
                _id: phaseId,
                projectId: project._id,
                companyId,
                isDeleted: false,
            }).lean();
            if (!phase) {
                return res.status(404).json(
                    new ApiErrors(404, "Not Found", "Phase not found or does not belong to this project")
                );
            }
            scopeStart = midnight(new Date(phase.startDate));
            scopeEnd = midnight(new Date(phase.endDate));
            taskFilter.phaseId = phase._id;
            scopeLabel = phase.phaseName;
        }
        const tasks = await Task.find(taskFilter)
            .select("_id status createdAt updatedAt startDate endDate")
            .lean();
        const totalTasks = tasks.length;
        if (totalTasks === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { series: [], totalTasks: 0, forecast: null, scopeLabel, scope },
                    "No Tasks",
                    "No tasks found for the selected scope"
                )
            );
        }
        const today = midnight(new Date());
        const spineEnd = today > scopeEnd ? today : scopeEnd;
        const dateSpine = [];
        for (let d = new Date(scopeStart); d <= spineEnd; d = addDays(d, 1)) {
            dateSpine.push(ymd(d));
        }
        const totalDays = dateSpine.length;
        const completedOnDate = {};
        let completedBeforeStart = 0;
        tasks.forEach((t) => {
            if (t.status !== "Completed") return;
            const completedAt = midnight(new Date(t.updatedAt));
            const dateStr = ymd(completedAt);
            if (completedAt < scopeStart) {
                completedBeforeStart++;
                return;
            }
            completedOnDate[dateStr] = (completedOnDate[dateStr] || 0) + 1;
        });
        const plannedDays = Math.max(
            1,
            Math.ceil((scopeEnd.getTime() - scopeStart.getTime()) / 86400000)
        );
        let remaining = totalTasks - completedBeforeStart;
        let cumulativeCompleted = completedBeforeStart;
        const idealSeries = [];
        const actualSeries = [];
        dateSpine.forEach((date, idx) => {
            const idealRemaining = Math.max(
                0,
                Math.round(totalTasks - (totalTasks * idx) / plannedDays)
            );
            idealSeries.push({ date, remaining: idealRemaining });
            const completedToday = completedOnDate[date] || 0;
            remaining = Math.max(0, remaining - completedToday);
            cumulativeCompleted += completedToday;
            const dateObj = new Date(date);
            if (dateObj <= today) {
                actualSeries.push({ date, remaining });
            }
        });
        const elapsedDays = Math.max(
            1,
            Math.ceil((today.getTime() - scopeStart.getTime()) / 86400000)
        );
        const velocity = cumulativeCompleted / elapsedDays;
        const currentRemaining = actualSeries.length > 0
            ? actualSeries[actualSeries.length - 1].remaining
            : totalTasks;
        let forecast = null;
        if (velocity > 0 && currentRemaining > 0) {
            const daysToFinish = Math.min(180, Math.ceil(currentRemaining / velocity));
            const predictedDate = addDays(today, daysToFinish);
            const predictedDateStr = ymd(predictedDate);
            const plannedEndStr = ymd(scopeEnd);
            const slippageDays =
                predictedDate > scopeEnd
                    ? Math.ceil((predictedDate.getTime() - scopeEnd.getTime()) / 86400000)
                    : 0;
            const forecastSeries = [];
            let fr = currentRemaining;
            for (let i = 0; i <= daysToFinish && fr > 0; i++) {
                const d = ymd(addDays(today, i));
                forecastSeries.push({ date: d, remaining: Math.max(0, Math.round(fr)) });
                fr -= velocity;
            }
            forecastSeries.push({ date: predictedDateStr, remaining: 0 });
            forecast = {
                predictedCompletionDate: predictedDateStr,
                plannedEndDate: plannedEndStr,
                slippageDays,
                onTrack: slippageDays === 0,
                currentVelocityPerDay: parseFloat(velocity.toFixed(2)),
                daysToCompletion: daysToFinish,
                forecastSeries,
            };
        } else if (velocity === 0) {
            forecast = {
                predictedCompletionDate: null,
                plannedEndDate: ymd(scopeEnd),
                slippageDays: null,
                onTrack: false,
                currentVelocityPerDay: 0,
                daysToCompletion: null,
                forecastSeries: [],
                note: "No tasks completed yet — unable to project completion date",
            };
        } else {
            forecast = {
                predictedCompletionDate: ymd(today),
                plannedEndDate: ymd(scopeEnd),
                slippageDays: 0,
                onTrack: true,
                currentVelocityPerDay: parseFloat(velocity.toFixed(2)),
                daysToCompletion: 0,
                forecastSeries: [],
            };
        }
        const openTasks = tasks.filter((t) => t.status !== "Completed").length;
        const completedTasks = totalTasks - openTasks;
        logger.info("getBurnDownChart success", { projectId, companyId, scope, totalTasks });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    scope,
                    scopeLabel,
                    scopeStart: ymd(scopeStart),
                    scopeEnd: ymd(scopeEnd),
                    totalTasks,
                    completedTasks,
                    openTasks,
                    idealSeries,
                    actualSeries,
                    forecast,
                },
                "Burn Down Chart Retrieved",
                `Burn-down data generated for ${totalDays} days`
            )
        );
    } catch (error) {
        logger.error("getBurnDownChart failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to generate burn-down chart", [error.message])
        );
    }
};



const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];
// This function returns productivity heatmap analytics for a project. takes x-company-id in headers, projectId in params and optional days in query. computes daily productivity intensity, weekday trends, hourly distribution, streaks and slowdown detection insights. -------------------------- Ayan
export const getProductivityHeatmap = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(
            projectId,
            companyId,
            res,
            Project
        );
        if (projectErr) return projectErr;
        const allowed = [30, 60, 90];
        const rawDays = parseInt(req.query.days, 10);
        const windowDays = allowed.includes(rawDays) ? rawDays : 30;
        const today = midnight(new Date());
        const windowStart = addDays(today, -windowDays);
        const pId = project._id;
        const [completedTasks, createdTasks] = await Promise.all([
            Task.find({
                projectId: pId,
                companyId,
                isDeleted: false,
                status: "Completed",
                updatedAt: { $gte: windowStart, $lte: today },
            })
                .select("updatedAt")
                .lean(),
            Task.find({
                projectId: pId,
                companyId,
                isDeleted: false,
                createdAt: { $gte: windowStart, $lte: today },
            })
                .select("createdAt")
                .lean(),
        ]);
        const completedByDate = {};
        const completedByHour = new Array(24).fill(0);
        const completedByWeekday = new Array(7).fill(0);
        completedTasks.forEach((t) => {
            const d = new Date(t.updatedAt);
            completedByDate[ymd(midnight(d))] = (completedByDate[ymd(midnight(d))] || 0) + 1;
            completedByHour[d.getUTCHours()]++;
            completedByWeekday[d.getUTCDay()]++;
        });
        const createdByDate = {};
        createdTasks.forEach((t) => {
            const d = new Date(t.createdAt);
            createdByDate[ymd(midnight(d))] = (createdByDate[ymd(midnight(d))] || 0) + 1;
        });
        const dateSpine = [];
        for (let d = new Date(windowStart); d <= today; d = addDays(d, 1)) {
            dateSpine.push(ymd(d));
        }
        const countsSorted = [...dateSpine.map((date) => completedByDate[date] || 0)].sort(
            (a, b) => a - b
        );
        const p25 = percentile(countsSorted, 25);
        const p50 = percentile(countsSorted, 50);
        const p75 = percentile(countsSorted, 75);
        const calendarGrid = dateSpine.map((date) => {
            const d = new Date(date);
            const completed = completedByDate[date] || 0;
            const created = createdByDate[date] || 0;
            return {
                date,
                weekday: WEEKDAYS[d.getUTCDay()],
                weekdayIndex: d.getUTCDay(),
                completedCount: completed,
                createdCount: created,
                netBurn: completed - created,
                intensity: intensityBucket(completed, p25, p50, p75),
            };
        });
        const weekdayOccurrences = new Array(7).fill(0);
        dateSpine.forEach((date) => {
            weekdayOccurrences[new Date(date).getUTCDay()]++;
        });
        const intensityScores = normalise(completedByWeekday);
        const weekdayMatrix = WEEKDAYS.map((name, idx) => ({
            weekday: name,
            weekdayIndex: idx,
            totalCompleted: completedByWeekday[idx],
            occurrencesInWindow: weekdayOccurrences[idx],
            avgCompletedPerWeek: weekdayOccurrences[idx] > 0
                ? parseFloat((completedByWeekday[idx] / (weekdayOccurrences[idx] / 7)).toFixed(2))
                : 0,
            intensityScore: intensityScores[idx], // 0-100
        }));
        const peakHourIdx = completedByHour.indexOf(Math.max(...completedByHour));
        const peakHourData = {
            hour: peakHourIdx,
            label: `${String(peakHourIdx).padStart(2, "0")}:00 UTC`,
            completedCount: completedByHour[peakHourIdx],
            distribution: completedByHour.map((c, h) => ({ hour: h, count: c })),
        };
        let currentStreak = 0;
        let longestStreak = 0;
        let tmpStreak = 0;
        for (let i = 0; i < dateSpine.length; i++) {
            if ((completedByDate[dateSpine[i]] || 0) > 0) {
                tmpStreak++;
                if (tmpStreak > longestStreak) longestStreak = tmpStreak;
            } else {
                tmpStreak = 0;
            }
        }
        for (let i = dateSpine.length - 1; i >= 0; i--) {
            if ((completedByDate[dateSpine[i]] || 0) > 0) {
                currentStreak++;
            } else {
                break;
            }
        }
        const slowdownPeriods = [];
        const bucketSize = 7;
        const buckets = [];
        for (let i = 0; i < dateSpine.length; i += bucketSize) {
            const slice = dateSpine.slice(i, i + bucketSize);
            const total = slice.reduce((s, d) => s + (completedByDate[d] || 0), 0);
            buckets.push({ start: slice[0], end: slice[slice.length - 1], total });
        }
        for (let i = 1; i < buckets.length; i++) {
            const prev = buckets[i - 1].total;
            const curr = buckets[i].total;
            if (prev > 0 && curr < prev * 0.7) {
                slowdownPeriods.push({
                    start: buckets[i].start,
                    end: buckets[i].end,
                    previousWeekCompleted: prev,
                    thisWeekCompleted: curr,
                    dropPercent: parseFloat((((prev - curr) / prev) * 100).toFixed(1)),
                });
            }
        }
        const activeDays = weekdayMatrix.filter((d) => d.occurrencesInWindow > 0);
        const peakDay = activeDays.reduce((best, d) => d.totalCompleted > best.totalCompleted ? d : best, activeDays[0] || { weekday: null });
        const slowestDay = activeDays
            .filter((d) => d.totalCompleted > 0)
            .reduce((worst, d) => d.totalCompleted < worst.totalCompleted ? d : worst, activeDays[0] || { weekday: null });
        const insights = {
            peakDay: peakDay?.weekday || null,
            slowestDay: slowestDay?.weekday || null,
            peakHour: peakHourData.label,
            currentStreak,
            longestStreak,
            totalCompleted: completedTasks.length,
            totalCreated: createdTasks.length,
            netBurn: completedTasks.length - createdTasks.length,
            slowdownPeriods,
        };
        logger.info("getProductivityHeatmap success", {
            projectId,
            companyId,
            windowDays,
            totalCompleted: completedTasks.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    windowDays,
                    windowStart: ymd(windowStart),
                    windowEnd: ymd(today),
                    calendarGrid,
                    weekdayMatrix,
                    hourlyDistribution: peakHourData.distribution,
                    insights,
                },
                "Productivity Heatmap Retrieved",
                `Heatmap data generated for the last ${windowDays} days`
            )
        );
    } catch (error) {
        logger.error("getProductivityHeatmap failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to generate productivity heatmap", [error.message])
        );
    }
};




const severityBand = (score) => {
    if (score < 25) return "low";
    if (score < 50) return "medium";
    if (score < 75) return "high";
    return "critical";
};

const riskLabel = (score) => {
    if (score < 25) return "Low Risk";
    if (score < 50) return "Moderate Risk";
    if (score < 75) return "High Risk";
    return "Critical Risk";
};

const riskColor = (score) => {
    if (score < 25) return "#22c55e";
    if (score < 50) return "#f59e0b";
    if (score < 75) return "#f97316";
    return "#ef4444";
};

const RISK_WEIGHTS = { execution: 0.35, issue: 0.25, procurement: 0.25, schedule: 0.15 };


async function dimensionExecution(pId, companyId, today) {
    const [totalOpen, blockedCount, blockedCriticalHigh, overdueCount, notStartedCritHigh] =
        await Promise.all([
            Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: { $ne: "Completed" } }),
            Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Blocked" }),
            Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Blocked", priority: { $in: ["Critical", "High"] } }),
            Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: { $ne: "Completed" }, endDate: { $lt: today } }),
            Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "NotStarted", priority: { $in: ["Critical", "High"] } }),
        ]);

    const blockedRate = pct(blockedCount, totalOpen || 1);
    const overdueRate = pct(overdueCount, totalOpen || 1);
    const notStartedRate = pct(notStartedCritHigh, totalOpen || 1);
    const s_blocked = clamp(blockedRate * 2.5, 0, 100);
    const s_overdue = clamp(overdueRate * 2, 0, 100);
    const s_notStarted = clamp(notStartedRate * 3, 0, 100);
    const rawScore = Math.round(s_blocked * 0.40 + s_overdue * 0.40 + s_notStarted * 0.20);

    const parts = [];
    if (blockedCount > 0) parts.push(`${blockedCount} task(s) are blocked`);
    if (overdueCount > 0) parts.push(`${overdueCount} task(s) are past due`);
    if (notStartedCritHigh > 0) parts.push(`${notStartedCritHigh} high-priority task(s) haven't started`);
    const narrative = parts.length === 0
        ? "Execution health is strong — no blocked, overdue, or stalled critical tasks."
        : `${parts.join("; ")}. ${rawScore >= 75 ? "Immediate intervention required." : rawScore >= 50 ? "Action needed soon." : "Monitor closely."}`;

    return {
        dimension: "execution_risk", label: "Execution Risk",
        rawScore: clamp(rawScore, 0, 100), weight: RISK_WEIGHTS.execution,
        severity: severityBand(rawScore),
        breakdown: { totalOpenTasks: totalOpen, blockedCount, blockedCriticalHigh, overdueCount, notStartedCriticalHigh: notStartedCritHigh, blockedRate, overdueRate, notStartedHighRate: notStartedRate },
        subScores: { blocked: Math.round(s_blocked), overdue: Math.round(s_overdue), notStarted: Math.round(s_notStarted) },
        narrative,
    };
}

async function dimensionIssueSeverity(pId, companyId, today) {
    const sevenDaysAgo = daysAgo(7);
    const openIssues = await Issue.find({ projectId: pId, companyId, isDeleted: false, status: "submitted" })
        .select("_id priority dueDate createdAt").lean();
    const criticalOpen = openIssues.filter((i) => i.priority === "critical").length;
    const highOpen = openIssues.filter((i) => i.priority === "high").length;
    const staleIssues = openIssues.filter((i) => new Date(i.createdAt) < sevenDaysAgo).length;
    const overdueIssues = openIssues.filter((i) => i.dueDate && new Date(i.dueDate) < today).length;
    const totalOpen = openIssues.length;
    const s_critical = clamp(criticalOpen * 25, 0, 100);
    const s_high = clamp(highOpen * 15, 0, 100);
    const s_stale = clamp((staleIssues / Math.max(totalOpen, 1)) * 100 * 0.6, 0, 60);
    const s_overdue = clamp(overdueIssues * 20, 0, 100);
    const rawScore = Math.round(s_critical * 0.40 + s_high * 0.25 + s_stale * 0.20 + s_overdue * 0.15);

    return {
        dimension: "issue_severity", label: "Issue Severity",
        rawScore: clamp(rawScore, 0, 100), weight: RISK_WEIGHTS.issue,
        severity: severityBand(rawScore),
        breakdown: { totalOpenIssues: totalOpen, criticalOpen, highOpen, staleIssues, overdueIssues },
        subScores: { criticalIssues: Math.round(s_critical), highIssues: Math.round(s_high), staleIssues: Math.round(s_stale), overdueIssues: Math.round(s_overdue) },
        narrative: totalOpen === 0
            ? "No open issues — issue board is clean."
            : `${totalOpen} open issue(s): ${criticalOpen} critical, ${highOpen} high priority. ${staleIssues} open >7 days. ${overdueIssues} past due date.`,
    };
}


async function dimensionProcurement(pId, companyId, today) {
    const twoDaysAgo = daysAgo(2);
    const [staleMRs, overdueDeliveryPOs, partialOverduePOs, pendingTransfers] = await Promise.all([
        MaterialRequisition.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Submitted", submittedAt: { $lt: twoDaysAgo } }),
        PurchaseOrder.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Approved", expectedDeliveryDate: { $lt: today, $ne: null } }),
        PurchaseOrder.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "PartiallyDelivered", expectedDeliveryDate: { $lt: today, $ne: null } }),
        StockTransfer.countDocuments({ companyId, isDeleted: false, status: "Draft", $or: [{ fromProjectId: pId }, { toProjectId: pId }] }),
    ]);
    const s_mr = clamp(staleMRs * 20, 0, 100);
    const s_poOver = clamp(overdueDeliveryPOs * 25, 0, 100);
    const s_partial = clamp(partialOverduePOs * 20, 0, 100);
    const s_transfer = clamp(pendingTransfers * 15, 0, 100);
    const rawScore = Math.round(s_mr * 0.30 + s_poOver * 0.40 + s_partial * 0.20 + s_transfer * 0.10);

    const parts = [];
    if (staleMRs > 0) parts.push(`${staleMRs} MR(s) awaiting approval >2 days`);
    if (overdueDeliveryPOs > 0) parts.push(`${overdueDeliveryPOs} PO delivery(ies) overdue`);
    if (partialOverduePOs > 0) parts.push(`${partialOverduePOs} partial delivery(ies) delayed`);
    if (pendingTransfers > 0) parts.push(`${pendingTransfers} stock transfer(s) pending`);

    return {
        dimension: "procurement_delays", label: "Procurement Delays",
        rawScore: clamp(rawScore, 0, 100), weight: RISK_WEIGHTS.procurement,
        severity: severityBand(rawScore),
        breakdown: { staleMRsAwaitingApproval: staleMRs, overdueDeliveryPOs, partialDeliveryOverdue: partialOverduePOs, pendingStockTransfers: pendingTransfers },
        subScores: { staleMRs: Math.round(s_mr), overdueDeliveries: Math.round(s_poOver), partialOverdue: Math.round(s_partial), pendingTransfers: Math.round(s_transfer) },
        narrative: parts.length === 0 ? "Procurement pipeline is clear — no bottlenecks detected." : parts.join("; ") + ".",
    };
}


async function dimensionScheduleAdherence(pId, companyId, today, project) {
    const now = Date.now();
    const projStart = new Date(project.startDate).getTime();
    const projEnd = new Date(project.endDate).getTime();
    const projDur = projEnd - projStart;
    const plannedPct = projDur > 0 ? Math.min(100, Math.max(0, ((now - projStart) / projDur) * 100)) : 0;
    const actualPct = project.completionPercent || 0;
    const projGap = parseFloat((plannedPct - actualPct).toFixed(2));
    const [overduePhases, totalPhases] = await Promise.all([
        Phase.countDocuments({ projectId: pId, companyId, isDeleted: false, completionPercent: { $lt: 100 }, endDate: { $lt: today } }),
        Phase.countDocuments({ projectId: pId, companyId, isDeleted: false }),
    ]);
    const phaseOverdueRate = pct(overduePhases, totalPhases || 1);
    const s_gap = clamp(Math.max(0, projGap) * 2, 0, 100);
    const s_phaseOver = clamp(phaseOverdueRate * 1.5, 0, 100);
    const rawScore = Math.round(s_gap * 0.60 + s_phaseOver * 0.40);
    const parts = [];
    if (projGap > 5) parts.push(`Project is ${projGap.toFixed(0)}% behind planned timeline`);
    if (overduePhases > 0) parts.push(`${overduePhases} phase(s) are overdue`);
    return {
        dimension: "schedule_adherence", label: "Schedule Adherence",
        rawScore: clamp(rawScore, 0, 100), weight: RISK_WEIGHTS.schedule,
        severity: severityBand(rawScore),
        breakdown: { plannedProgressPercent: parseFloat(plannedPct.toFixed(2)), actualProgressPercent: actualPct, scheduleGap: projGap, overduePhases, totalPhases, phaseOverdueRate },
        subScores: { scheduleGap: Math.round(s_gap), phaseOverdue: Math.round(s_phaseOver) },
        narrative: parts.length === 0 ? "Project is tracking closely to the planned schedule." : parts.join("; ") + ".",
    };
}



// This function returns execution risk score analytics for a project. takes x-company-id in headers and projectId in params. evaluates execution, issue severity, procurement delays and schedule adherence risks with weighted scoring and action recommendations. -------------------------- Ayan
export const getExecutionRiskScore = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(projectId, companyId, res, Project);
        if (projectErr) return projectErr;
        const today = todayUTC();
        const pId = project._id;
        const [d1, d2, d3, d4] = await Promise.all([
            dimensionExecution(pId, companyId, today),
            dimensionIssueSeverity(pId, companyId, today),
            dimensionProcurement(pId, companyId, today),
            dimensionScheduleAdherence(pId, companyId, today, project),
        ]);

        const dimensions = [d1, d2, d3, d4];
        const executionRiskScore = parseFloat(
            (d1.rawScore * RISK_WEIGHTS.execution + d2.rawScore * RISK_WEIGHTS.issue +
                d3.rawScore * RISK_WEIGHTS.procurement + d4.rawScore * RISK_WEIGHTS.schedule).toFixed(1)
        );

        const sortedDimensions = [...dimensions].sort((a, b) => b.rawScore - a.rawScore);
        const dominantRisk = sortedDimensions[0];

        const actionItems = dimensions
            .filter((d) => d.severity === "high" || d.severity === "critical")
            .sort((a, b) => b.rawScore - a.rawScore)
            .map((d) => ({
                dimension: d.label,
                severity: { low: "Low", medium: "Medium", high: "High", critical: "Critical" }[d.severity],
                score: d.rawScore,
                action: {
                    execution_risk: "Unblock tasks and resolve overdue items within 48 hours. Escalate critical blockers.",
                    issue_severity: "Resolve all critical and high-priority issues. Schedule a dedicated issue triage session.",
                    procurement_delays: "Approve pending MRs and POs. Follow up with vendors on overdue deliveries.",
                    schedule_adherence: "Align phase leads with project manager. Reassess timelines and escalate to stakeholders.",
                }[d.dimension] || "Review and take corrective action.",
            }));

        logger.info("getExecutionRiskScore success", { projectId, companyId, executionRiskScore });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    executionRiskScore,
                    riskLabel: riskLabel(executionRiskScore),
                    riskColor: riskColor(executionRiskScore),
                    severity: severityBand(executionRiskScore),
                    dominantRiskDimension: dominantRisk
                        ? { label: dominantRisk.label, score: dominantRisk.rawScore, severity: dominantRisk.severity }
                        : null,
                    dimensions,
                    dimensionWeights: RISK_WEIGHTS,
                    actionItems,
                    scoredAt: new Date().toISOString(),
                },
                "Execution Risk Score Retrieved",
                `Risk score: ${executionRiskScore}/100 — ${riskLabel(executionRiskScore)}`
            )
        );
    } catch (error) {
        logger.error("getExecutionRiskScore failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to calculate execution risk score", [error.message])
        );
    }
};




const DELAY_WEIGHTS = { velocity: 0.30, burnRate: 0.25, overdue: 0.20, blocked: 0.15, phaseGap: 0.10 };


async function signalVelocityTrend(pId, companyId, today) {
    const d14ago = addDays(today, -14);
    const d7ago = addDays(today, -7);
    const [prevWeek, thisWeek] = await Promise.all([
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Completed", updatedAt: { $gte: d14ago, $lt: d7ago } }),
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Completed", updatedAt: { $gte: d7ago, $lte: today } }),
    ]);
    if (prevWeek === 0 && thisWeek === 0) {
        return { name: "velocity_trend", score: 50, severity: "warning", finding: "No task completions in the past 14 days — velocity cannot be assessed.", data: { prevWeekCompleted: 0, thisWeekCompleted: 0, changePercent: null }, confidence: "low" };
    }
    let changePercent = null;
    let score = 0;
    if (prevWeek === 0) { changePercent = 100; score = 20; }
    else {
        changePercent = parseFloat((((thisWeek - prevWeek) / prevWeek) * 100).toFixed(1));
        if (changePercent >= 10) score = 10;
        else if (changePercent >= -10) score = 30;
        else if (changePercent >= -30) score = 55;
        else if (changePercent >= -50) score = 75;
        else score = 90;
    }
    return {
        name: "velocity_trend", score,
        severity: score >= 70 ? "critical" : score >= 40 ? "warning" : "ok",
        finding: changePercent >= 0
            ? `Team velocity improved by ${changePercent}% this week vs last week.`
            : `Team velocity dropped by ${Math.abs(changePercent)}% this week vs last week — execution is slowing down.`,
        data: { prevWeekCompleted: prevWeek, thisWeekCompleted: thisWeek, changePercent },
        confidence: (prevWeek + thisWeek) >= 5 ? "high" : "medium",
    };
}



async function signalBurnRate(pId, companyId, today, project) {
    const d30ago = addDays(today, -30);
    const plannedEnd = midnight(new Date(project.endDate));
    const [totalOpen, completedLast30] = await Promise.all([
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: { $ne: "Completed" } }),
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Completed", updatedAt: { $gte: d30ago, $lte: today } }),
    ]);
    if (totalOpen === 0) return { name: "burn_rate", score: 0, severity: "ok", finding: "All tasks are complete.", data: { totalOpen: 0, dailyBurnRate: 0, daysRemaining: Math.ceil((plannedEnd - today) / 86400000), predictedExtradays: 0 }, confidence: "high" };
    const dailyBurnRate = completedLast30 / 30;
    const daysToEnd = Math.ceil((plannedEnd.getTime() - today.getTime()) / 86400000);
    let score = 0; let predictedExtradays = 0; let finding = "";
    if (dailyBurnRate === 0) { score = 95; predictedExtradays = 999; finding = "No tasks completed in the last 30 days. At this rate the project will not complete."; }
    else {
        const daysNeeded = Math.ceil(totalOpen / dailyBurnRate);
        predictedExtradays = Math.max(0, daysNeeded - Math.max(daysToEnd, 0));
        const ratio = daysNeeded / Math.max(daysToEnd, 1);
        score = clamp(Math.round((ratio - 1) * 100 + 20), 0, 100);
        finding = predictedExtradays === 0
            ? `At the current burn rate (${dailyBurnRate.toFixed(1)} tasks/day), all ${totalOpen} open tasks can be completed within the planned deadline.`
            : `At the current burn rate (${dailyBurnRate.toFixed(1)} tasks/day), ${totalOpen} remaining tasks will take ~${daysNeeded} more days — approximately ${predictedExtradays} day(s) beyond the planned end date.`;
    }
    return { name: "burn_rate", score: clamp(score, 0, 100), severity: score >= 70 ? "critical" : score >= 40 ? "warning" : "ok", finding, data: { totalOpen, dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)), daysRemaining: daysToEnd, predictedExtradays }, confidence: completedLast30 >= 10 ? "high" : completedLast30 >= 3 ? "medium" : "low" };
}



async function signalOverdueGrowth(pId, companyId, today) {
    const [overdueCount, totalOpen] = await Promise.all([
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: { $ne: "Completed" }, endDate: { $lt: today } }),
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: { $ne: "Completed" } }),
    ]);
    const overdueRate = pct(overdueCount, totalOpen || 1);
    const score = overdueRate === 0 ? 5 : overdueRate <= 5 ? 20 : overdueRate <= 15 ? 45 : overdueRate <= 30 ? 65 : overdueRate <= 50 ? 80 : 95;
    return { name: "overdue_growth", score, severity: score >= 70 ? "critical" : score >= 40 ? "warning" : "ok", finding: overdueCount === 0 ? "No overdue tasks — excellent execution discipline." : `${overdueCount} of ${totalOpen} open tasks (${overdueRate}%) are past their due date.`, data: { overdueCount, totalOpen, overdueRate }, confidence: totalOpen >= 5 ? "high" : "medium" };
}


async function signalBlockedWeight(pId, companyId) {
    const [blockedAll, blockedCritical, totalOpen] = await Promise.all([
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Blocked" }),
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: "Blocked", priority: { $in: ["Critical", "High"] } }),
        Task.countDocuments({ projectId: pId, companyId, isDeleted: false, status: { $ne: "Completed" } }),
    ]);
    const weighted = (blockedAll - blockedCritical) + blockedCritical * 2;
    const blockedRate = pct(weighted, totalOpen || 1);
    const score = blockedRate === 0 ? 5 : blockedRate <= 5 ? 25 : blockedRate <= 10 ? 50 : blockedRate <= 20 ? 70 : 90;
    return { name: "blocked_weight", score, severity: score >= 70 ? "critical" : score >= 40 ? "warning" : "ok", finding: blockedAll === 0 ? "No blocked tasks — execution flow is clear." : `${blockedAll} blocked task(s), of which ${blockedCritical} are Critical/High priority. Weighted block rate: ${blockedRate}%.`, data: { blockedAll, blockedCritical, totalOpen, weightedBlockRate: blockedRate }, confidence: totalOpen >= 5 ? "high" : "medium" };
}


async function signalPhaseDeviation(pId, companyId) {
    const phases = await Phase.find({ projectId: pId, companyId, isDeleted: false, completionPercent: { $lt: 100 } }).select("startDate endDate completionPercent").lean();
    if (phases.length === 0) return { name: "phase_deviation", score: 0, severity: "ok", finding: "No active phases or all phases are complete.", data: { activePhases: 0, avgDeviation: 0 }, confidence: "low" };
    const now = Date.now();
    const deviations = phases.map((p) => {
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.endDate).getTime();
        const dur = end - start;
        return dur > 0 ? clamp(((now - start) / dur) * 100, 0, 100) - p.completionPercent : 0;
    });
    const avgDev = parseFloat((deviations.reduce((s, d) => s + d, 0) / deviations.length).toFixed(2));
    const worstDev = Math.max(...deviations);
    const score = avgDev <= 5 ? 10 : avgDev <= 15 ? 35 : avgDev <= 25 ? 60 : avgDev <= 40 ? 80 : 95;
    return { name: "phase_deviation", score, severity: score >= 70 ? "critical" : score >= 40 ? "warning" : "ok", finding: avgDev <= 5 ? "Phases are tracking close to plan." : `Active phases are on average ${avgDev.toFixed(0)}% behind plan. Worst deviation: ${worstDev.toFixed(0)}%.`, data: { activePhases: phases.length, avgDeviation: avgDev, worstDeviation: parseFloat(worstDev.toFixed(2)) }, confidence: phases.length >= 3 ? "high" : "medium" };
}



// This function returns delay prediction analytics for a project. takes x-company-id in headers and projectId in params. predicts project delay probability using execution velocity, burn rate, overdue growth, blocked tasks and phase deviation signals with recommendations. -------------------------- Ayan
export const getDelayPrediction = async (req, res) => {
    try {
        const { company, earlyReturn: companyErr } = await resolveCompanyOrError(req, res);
        if (companyErr) return companyErr;
        const companyId = company._id;
        const { projectId } = req.params;
        const { project, earlyReturn: projectErr } = await resolveProjectOrError(projectId, companyId, res, Project);
        if (projectErr) return projectErr;
        const today = todayUTC();
        const pId = project._id;
        const [s1, s2, s3, s4, s5] = await Promise.all([
            signalVelocityTrend(pId, companyId, today),
            signalBurnRate(pId, companyId, today, project),
            signalOverdueGrowth(pId, companyId, today),
            signalBlockedWeight(pId, companyId),
            signalPhaseDeviation(pId, companyId),
        ]);
        const signals = [s1, s2, s3, s4, s5];
        const delayProbability = parseFloat((s1.score * DELAY_WEIGHTS.velocity + s2.score * DELAY_WEIGHTS.burnRate + s3.score * DELAY_WEIGHTS.overdue + s4.score * DELAY_WEIGHTS.blocked + s5.score * DELAY_WEIGHTS.phaseGap).toFixed(1));
        const predictedSlipDays = s2.data.predictedExtradays === 999 ? null : s2.data.predictedExtradays;

        const verdictMap = (s) => s < 25 ? "on_track" : s < 50 ? "at_risk" : s < 75 ? "likely_delayed" : "critically_delayed";
        const verdictLabels = { on_track: "On Track", at_risk: "At Risk", likely_delayed: "Likely Delayed", critically_delayed: "Critically Delayed" };
        const finalVerdict = verdictMap(delayProbability);
        const levels = { low: 0, medium: 1, high: 2 };
        const avgConf = signals.reduce((s, sg) => s + levels[sg.confidence], 0) / signals.length;
        const confidence = avgConf >= 1.5 ? "high" : avgConf >= 0.8 ? "medium" : "low";
        const recMap = {
            velocity_trend: "Hold a velocity review with the team. Identify task-completion blockers from the last two weeks.",
            burn_rate: "Increase daily throughput by parallelising work or reducing scope. Consider deprioritising low-impact tasks.",
            overdue_growth: "Conduct a sweep of all overdue tasks. Re-schedule or reassign them within the next 48 hours.",
            blocked_weight: "Escalate blocked tasks immediately — especially Critical/High priority ones. Assign an owner to each blocker.",
            phase_deviation: "Align with phase leads to close the completion gap. Flag at-risk phases to stakeholders.",
        };
        const recommendations = [...signals].sort((a, b) => b.score - a.score).filter((s) => s.score >= 40).map((s) => recMap[s.name]).filter(Boolean);
        const daysToEnd = Math.ceil((new Date(project.endDate).getTime() - today.getTime()) / 86400000);

        logger.info("getDelayPrediction success", { projectId, companyId, delayProbability, finalVerdict });
        return res.status(200).json(new ApiResponse(200, { verdict: finalVerdict, verdictLabel: verdictLabels[finalVerdict], delayProbability, predictedSlipDays, confidence, plannedEndDate: project.endDate, daysToPlannedEnd: daysToEnd, signals, signalWeights: DELAY_WEIGHTS, recommendations }, "Delay Prediction Retrieved", `Delay prediction: ${verdictLabels[finalVerdict]} (risk score ${delayProbability}/100)`));
    } catch (error) {
        logger.error("getDelayPrediction failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to generate delay prediction", [error.message]));
    }
};