import mongoose from "mongoose";
import DPR from "../models/dpr.models.js";
import Project from "../models/project.models.js";
import Company from "../models/company.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import {
    normalizeToMidnightUTC,
    buildEventDescription,
    buildDprWorkbook,
    MODULE_LABELS,
    ACTION_LABELS,
    VALID_MODULES,
} from "../helpers/dprHelper.js";



const resolveCompanyId = async (req) => {
    const companyUUID = req.headers["x-company-id"];
    if (!companyUUID?.trim()) {
        throw new ApiErrors(400, "Missing Header", "x-company-id header is required");
    }
    const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
    if (!company) {
        throw new ApiErrors(404, "Company Not Found", "No active company found");
    }
    return company._id;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const formatEvent = (ev) => ({
    eventId: ev._id,
    module: ev.module,
    action: ev.action,
    actorId: ev.actorId,
    actorName: ev.actorName || "System",
    refId: ev.refId,
    refNumber: ev.refNumber,
    description: buildEventDescription(ev),
    details: ev.details,
    eventAt: ev.eventAt,
});


const EMPTY_SUMMARY = {
    totalSubTasks: 0,
    completedSubTasks: 0,
    overallProgressPercent: 0,
    totalConsumptionEntries: 0,
    totalMaterialCost: 0,
    totalOutgoingTransfers: 0,
    totalIncomingTransfers: 0,
    mrCount: 0,
    poCount: 0,
    grnCount: 0,
    woCount: 0,
    totalExpenseAmount: 0,
    totalEvents: 0,
    lastActivityAt: null,
};


// This function returns DPR summary for a project on a specific date. takes x-company-id in headers, projectId in params and optional date in query. returns summarized activity metrics including subtasks, material consumption, transfers, MR, PO, GRN, WO, expenses and total events. -------------------------- Ayan
export const getDprSummary = async (req, res) => {
    try {
        const companyId = await resolveCompanyId(req);
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const rawDate = req.query.date ? new Date(req.query.date) : new Date();
        if (isNaN(rawDate.getTime())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date", "date must be a valid ISO date string"));
        }
        const reportDate = normalizeToMidnightUTC(rawDate);
        const dpr = await DPR.findOne(
            { companyId, projectId: new mongoose.Types.ObjectId(projectId), reportDate, isDeleted: false },
            { summary: 1, reportDate: 1, createdAt: 1 }
        ).lean();
        if (!dpr) {
            return res.status(200).json(
                new ApiResponse(200, { exists: false, reportDate, summary: EMPTY_SUMMARY }, "No activity recorded for this date")
            );
        }
        return res.status(200).json(
            new ApiResponse(200, { exists: true, dprId: dpr._id, reportDate: dpr.reportDate, summary: dpr.summary }, "DPR summary fetched")
        );
    } catch (error) {
        if (error instanceof ApiErrors) return res.status(error.statusCode).json(error);
        logger.error("[DPR] getDprSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch DPR summary", [error.message]));
    }
};


// This function returns detailed DPR data for a project on a specific date. takes x-company-id in headers, projectId in params and optional date, module, page and limit in query. supports module-wise filtering, event pagination and returns formatted DPR activity timeline with summary analytics. -------------------------- Ayan
export const getDpr = async (req, res) => {
    try {
        const companyId = await resolveCompanyId(req);
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false })
            .select("projectName projectCode")
            .lean();
        if (!project) {
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found with the given ID"));
        }
        const rawDate = req.query.date ? new Date(req.query.date) : new Date();
        if (isNaN(rawDate.getTime())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date", "date query param must be a valid ISO date string"));
        }
        const reportDate = normalizeToMidnightUTC(rawDate);
        const requestedModule = req.query.module?.trim();
        const moduleFilter = requestedModule && requestedModule !== "all" ? requestedModule : null;
        if (moduleFilter && !VALID_MODULES.includes(moduleFilter)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Module", `module must be one of: ${VALID_MODULES.join(", ")} — or "all"`)
            );
        }
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        const dpr = await DPR.findOne(
            { companyId, projectId: new mongoose.Types.ObjectId(projectId), reportDate, isDeleted: false }
        ).lean();
        if (!dpr) {
            return res.status(200).json(
                new ApiResponse(200, {
                    exists: false,
                    dprId: null,
                    projectId,
                    projectName: project.projectName,
                    projectCode: project.projectCode,
                    reportDate,
                    summary: EMPTY_SUMMARY,
                    activeModule: moduleFilter || "all",
                    availableModules: [],
                    events: [],
                    pagination: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false },
                }, "No activity recorded for this date")
            );
        }
        const allEvents = dpr.events || [];
        const moduleCounts = {};
        for (const ev of allEvents) {
            moduleCounts[ev.module] = (moduleCounts[ev.module] || 0) + 1;
        }
        const availableModules = VALID_MODULES
            .filter((m) => moduleCounts[m] > 0)
            .map((m) => ({ module: m, label: MODULE_LABELS[m], count: moduleCounts[m] }));
        const filtered = moduleFilter
            ? allEvents.filter((ev) => ev.module === moduleFilter)
            : allEvents;
        const sorted = [...filtered].sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const total = sorted.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const pageSlice = sorted.slice(start, start + limit);
        const formattedEvents = pageSlice.map(formatEvent);
        logger.info("[DPR] getDpr", {
            dprId: dpr._id,
            projectId,
            reportDate,
            moduleFilter: moduleFilter || "all",
            totalFiltered: total,
            page,
            limit,
            returning: formattedEvents.length,
        });
        return res.status(200).json(
            new ApiResponse(200, {
                exists: true,
                dprId: dpr._id,
                projectId,
                projectName: project.projectName,
                projectCode: project.projectCode,
                reportDate: dpr.reportDate,
                summary: dpr.summary, 
                activeModule: moduleFilter || "all",
                availableModules,
                events: formattedEvents,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
                createdAt: dpr.createdAt,
                updatedAt: dpr.updatedAt,
            }, "DPR fetched successfully")
        );
    } catch (error) {
        if (error instanceof ApiErrors) return res.status(error.statusCode).json(error);
        logger.error("[DPR] getDpr failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch DPR", [error.message]));
    }
};



// This function returns DPR history for a project within a date range. takes x-company-id in headers, projectId in params and optional startDate, endDate, page and limit in query. returns paginated DPR summaries with project-level activity history. -------------------------- Ayan
export const getDprHistory = async (req, res) => {
    try {
        const companyId = await resolveCompanyId(req);
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false })
            .select("projectName projectCode")
            .lean();
        if (!project) {
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found with the given ID"));
        }
        const today = normalizeToMidnightUTC(new Date());
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const rawStart = req.query.startDate ? new Date(req.query.startDate) : thirtyDaysAgo;
        const rawEnd = req.query.endDate ? new Date(req.query.endDate) : today;
        if (isNaN(rawStart.getTime()) || isNaN(rawEnd.getTime())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date Range", "startDate and endDate must be valid ISO date strings"));
        }
        const startDate = normalizeToMidnightUTC(rawStart);
        const endDate = normalizeToMidnightUTC(rawEnd);
        if (endDate < startDate) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date Range", "endDate must be on or after startDate"));
        }
        const pageNumber = Math.max(Number(req.query.page) || 1, 1);
        const pageSize = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
        const filter = {
            companyId,
            projectId: new mongoose.Types.ObjectId(projectId),
            reportDate: { $gte: startDate, $lte: endDate },
            isDeleted: false,
        };
        const [dprs, total] = await Promise.all([
            DPR.find(filter, { events: 0 })
                .sort({ reportDate: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            DPR.countDocuments(filter),
        ]);
        logger.info("[DPR] getDprHistory", { projectId, total, page: pageNumber });
        return res.status(200).json(
            new ApiResponse(200, {
                projectId,
                projectName: project.projectName,
                projectCode: project.projectCode,
                dprs: dprs.map((d) => ({
                    dprId: d._id,
                    reportDate: d.reportDate,
                    summary: d.summary,
                    createdAt: d.createdAt,
                })),
                pagination: {
                    total,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: pageNumber < Math.ceil(total / pageSize),
                    hasPrev: pageNumber > 1,
                },
            }, total > 0 ? "DPR history fetched" : "No DPR records found for this date range")
        );
    } catch (error) {
        if (error instanceof ApiErrors) return res.status(error.statusCode).json(error);
        logger.error("[DPR] getDprHistory failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to fetch DPR history", [error.message]));
    }
};



// This function exports DPR report as an Excel file. takes x-company-id in headers, projectId in params and optional date in query. fetches DPR data and generates downloadable Excel workbook with project activity details and summary analytics. -------------------------- Ayan
export const exportDpr = async (req, res) => {
    try {
        const companyId = await resolveCompanyId(req);
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params"));
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false })
            .select("projectName projectCode")
            .lean();
        if (!project) {
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No active project found with the given ID"));
        }
        const rawDate = req.query.date ? new Date(req.query.date) : new Date();
        if (isNaN(rawDate.getTime())) {
            return res.status(400).json(new ApiErrors(400, "Invalid Date", "date must be a valid ISO date string"));
        }
        const reportDate = normalizeToMidnightUTC(rawDate);
        const dpr = await DPR.findOne(
            { companyId, projectId: new mongoose.Types.ObjectId(projectId), reportDate, isDeleted: false }
        ).lean();
        if (!dpr) {
            return res.status(404).json(
                new ApiErrors(404, "No DPR Found", `No DPR recorded for ${rawDate.toDateString()}. Nothing to export.`)
            );
        }
        const wb = await buildDprWorkbook({
            dpr,
            projectName: project.projectName,
            projectCode: project.projectCode,
            reportDate,
        });
        const safeName = (project.projectName || "Project").replace(/[^a-zA-Z0-9]/g, "_");
        const dateStr = rawDate.toISOString().split("T")[0];
        const filename = `DPR_${safeName}_${dateStr}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Cache-Control", "no-cache");
        logger.info("[DPR] exportDpr initiated", { projectId, reportDate, filename, totalEvents: dpr.events?.length });
        await wb.xlsx.write(res);
        res.end();
    } catch (error) {
        if (!res.headersSent) {
            if (error instanceof ApiErrors) return res.status(error.statusCode).json(error);
            logger.error("[DPR] exportDpr failed", { message: error.message, stack: error.stack });
            return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to export DPR", [error.message]));
        }
        logger.error("[DPR] exportDpr stream error (headers already sent)", { message: error.message });
    }
};