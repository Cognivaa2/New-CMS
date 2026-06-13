import mongoose from "mongoose";
import MaterialConsumption from "../models/materialConsumption.models.js";
import Inventory from "../models/inventory.models.js";
import Project from "../models/project.models.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Company from "../models/company.models.js";
import WorkOrder from "../models/workOrder.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { createExpenseEntry, reverseExpenseEntry, recalcProjectHealth } from "../helpers/expenseHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import { enrichUser } from "../helpers/issueHelper.js";

const resolveCompany = async (companyUUID) => {
    return await Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
};

const formatConsumptionRecord = (record) => ({
    consumptionId: record._id,
    companyId: record.companyId,
    projectId: record.projectId,
    phaseId: record.phaseId,
    taskId: record.taskId,
    subTaskId: record.subTaskId,
    workOrderId: record.workOrderId ?? null,
    isWOConsumption: record.isWOConsumption ?? false,
    inventoryId: record.inventoryId,
    materialMasterId: record.materialMasterId,
    materialName: record.materialName,
    unit: record.unit,
    quantityConsumed: record.quantityConsumed,
    pricePerUnit: record.pricePerUnit,
    totalCost: record.totalCost,
    source: record.source,
    remarks: record.remarks,
    recordedBy: record.recordedBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});

/**
 * Enriches an array of raw consumption records with human-readable names
 * for project, phase, task, subtask, and a full recordedBy profile from Keycloak.
 *
 * Uses a batch-lookup strategy: collects all unique IDs across records first,
 * fetches them in parallel, then maps them onto each record — so we only hit
 * the DB once per entity type regardless of how many records are in the page.
 */
const enrichConsumptionRecords = async (records) => {
    if (!records.length) return [];

    // ── Collect unique IDs ────────────────────────────────────────────────────
    const phaseIds = [...new Set(records.map(r => r.phaseId?.toString()).filter(Boolean))];
    const taskIds = [...new Set(records.map(r => r.taskId?.toString()).filter(Boolean))];
    const subTaskIds = [...new Set(records.map(r => r.subTaskId?.toString()).filter(Boolean))];
    const recorderIds = [...new Set(records.map(r => r.recordedBy?.toString()).filter(Boolean))];

    // ── Batch fetch in parallel ───────────────────────────────────────────────
    const [phases, tasks, subTasks, recorders] = await Promise.all([
        phaseIds.length
            ? Phase.find({ _id: { $in: phaseIds } }).select("_id phaseName").lean()
            : [],
        taskIds.length
            ? Task.find({ _id: { $in: taskIds } }).select("_id taskName").lean()
            : [],
        subTaskIds.length
            ? SubTask.find({ _id: { $in: subTaskIds } }).select("_id title").lean()
            : [],
        // enrichUser hits Keycloak per user — run them concurrently
        Promise.all(recorderIds.map(id => enrichUser(id))),
    ]);

    // ── Build lookup maps ─────────────────────────────────────────────────────
    const phaseMap = Object.fromEntries(phases.map(p => [p._id.toString(), p.phaseName]));
    const taskMap = Object.fromEntries(tasks.map(t => [t._id.toString(), t.taskName]));
    const subTaskMap = Object.fromEntries(subTasks.map(s => [s._id.toString(), s.title]));
    const recorderMap = Object.fromEntries(
        recorderIds.map((id, idx) => [id, recorders[idx]])
    );

    // ── Merge into formatted records ──────────────────────────────────────────
    return records.map(record => {
        const base = formatConsumptionRecord(record);
        const recorderData = recorderMap[record.recordedBy?.toString()] ?? null;

        return {
            ...base,
            phaseName: phaseMap[record.phaseId?.toString()] ?? null,
            taskName: taskMap[record.taskId?.toString()] ?? null,
            subTaskName: subTaskMap[record.subTaskId?.toString()] ?? null,
            recordedBy: recorderData
                ? {
                    id: recorderData.id,
                    keycloakId: recorderData.keycloakId,
                    name: recorderData.name,
                    email: recorderData.email,
                    avatar: recorderData.avatar,
                    role: recorderData.role,
                }
                : base.recordedBy, // fall back to raw ObjectId if enrichment fails
        };
    });
};


// This function records material consumption for a project or work order. takes x-company-id in headers, projectId in params and inventoryId, material details, quantityConsumed, recordedBy, source, phaseId, taskId, subTaskId, remarks in body. validates stock, updates inventory, creates consumption entry, generates expense records and pushes DPR events using transaction handling. -------------------------- Ayan
export const recordConsumption = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", ["projectId must be a valid MongoDB ObjectId"])
            );
        }
        const {
            inventoryId,
            subTaskId,
            phaseId,
            taskId,
            quantityConsumed,
            remarks,
            recordedBy,
            source,
            materialMasterId,
            materialName,
            unit,
            pricePerUnit,
            totalCost,
        } = req.body;
        const missing = [];
        if (!inventoryId?.trim()) missing.push("inventoryId");
        if (!recordedBy?.trim()) missing.push("recordedBy");
        if (!materialMasterId?.trim()) missing.push("materialMasterId");
        if (!materialName?.trim()) missing.push("materialName");
        if (!unit?.trim()) missing.push("unit");
        if (pricePerUnit === undefined || pricePerUnit === null || pricePerUnit === "") missing.push("pricePerUnit");
        if (totalCost === undefined || totalCost === null || totalCost === "") missing.push("totalCost");
        if (quantityConsumed === undefined || quantityConsumed === null || quantityConsumed === "") missing.push("quantityConsumed");
        if (missing.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", [`The following fields are required: ${missing.join(", ")}`], missing)
            );
        }
        if (!mongoose.Types.ObjectId.isValid(inventoryId.trim())) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid inventoryId", ["inventoryId must be a valid MongoDB ObjectId"]));
        }
        if (!mongoose.Types.ObjectId.isValid(materialMasterId.trim())) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid materialMasterId", ["materialMasterId must be a valid MongoDB ObjectId"]));
        }
        const parsedPricePerUnit = Number(pricePerUnit);
        if (isNaN(parsedPricePerUnit) || parsedPricePerUnit < 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid pricePerUnit", ["pricePerUnit must be a non-negative number"]));
        }
        const parsedTotalCost = Number(totalCost);
        if (isNaN(parsedTotalCost) || parsedTotalCost < 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid totalCost", ["totalCost must be a non-negative number"]));
        }
        if (subTaskId && !mongoose.Types.ObjectId.isValid(subTaskId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid subTaskId", ["subTaskId must be a valid MongoDB ObjectId"]));
        }
        if (phaseId && !mongoose.Types.ObjectId.isValid(phaseId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid phaseId", ["phaseId must be a valid MongoDB ObjectId"]));
        }
        if (taskId && !mongoose.Types.ObjectId.isValid(taskId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid taskId", ["taskId must be a valid MongoDB ObjectId"]));
        }
        const parsedQty = Number(quantityConsumed);
        if (isNaN(parsedQty) || parsedQty < 0.001) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid quantityConsumed", ["quantityConsumed must be a positive number (minimum 0.001)"]));
        }
        const validSources = ["StockIssue", "DPRSync"];
        const resolvedSource = source?.trim() || "StockIssue";
        if (!validSources.includes(resolvedSource)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid source", [`source must be one of: ${validSources.join(", ")}`]));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(new ApiErrors(404, "Company Not Found", ["No active company found with the provided x-company-id"]));
        }
        const companyObjectId = company._id;

        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean().session(session);
        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(new ApiErrors(404, "Project Not Found", [`No active project found with ID: ${projectId}`]));
        }
        const inventoryItem = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(inventoryId.trim()),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).session(session);
        if (!inventoryItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", ["No active inventory item found with the provided inventoryId in this project"])
            );
        }
        const recorder = await User.findOne({
            keycloakId: recordedBy.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean().session(session);
        if (!recorder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(new ApiErrors(404, "Recorder Not Found", [`No active user found with keycloakId: ${recordedBy}`]));
        }
        const isAssignedToProject = project.assignedUsers?.some(
            (au) => au.userId.toString() === recorder._id.toString()
        );
        if (!isAssignedToProject) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json(
                new ApiErrors(403, "Access Denied", [`User with keycloakId "${recordedBy}" is not assigned to project: ${projectId}`])
            );
        }
        let resolvedSubTask = null;
        let resolvedWorkOrderId = null;
        let isWOConsumption = false;
        if (subTaskId) {
            resolvedSubTask = await SubTask.findOne({
                _id: new mongoose.Types.ObjectId(subTaskId),
                projectId: new mongoose.Types.ObjectId(projectId),
                isDeleted: false,
            }).lean().session(session);
            if (!resolvedSubTask) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json(
                    new ApiErrors(404, "SubTask Not Found", [`No active subtask found with ID: ${subTaskId} under project: ${projectId}`])
                );
            }
            if (resolvedSubTask.workOrderId) {
                resolvedWorkOrderId = resolvedSubTask.workOrderId;
                isWOConsumption = true;
            }
        } else if (taskId) {
            const resolvedTask = await Task.findOne({
                _id: new mongoose.Types.ObjectId(taskId),
                projectId: new mongoose.Types.ObjectId(projectId),
                isDeleted: false,
            }).lean().session(session);
            if (resolvedTask?.workOrderId) {
                resolvedWorkOrderId = resolvedTask.workOrderId;
                isWOConsumption = true;
            }
        }
        if (!isWOConsumption) {
            if (inventoryItem.currentStock < parsedQty) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Insufficient Stock",
                        [
                            `Cannot consume ${parsedQty} ${inventoryItem.unit}. Current stock is only ${inventoryItem.currentStock} ${inventoryItem.unit} for "${inventoryItem.name}"`,
                        ]
                    )
                );
            }
        }
        if (!isWOConsumption) {
            await Inventory.findByIdAndUpdate(
                inventoryItem._id,
                { $inc: { currentStock: -parsedQty, totalConsumed: parsedQty } },
                { session, runValidators: false }
            );
        } else {
            logger.info("recordConsumption: WO-scoped — inventory NOT deducted", {
                workOrderId: resolvedWorkOrderId,
                inventoryId: inventoryItem._id,
                materialName: materialName.trim(),
                quantityConsumed: parsedQty,
            });
        }
        const [consumptionRecord] = await MaterialConsumption.create(
            [
                {
                    companyId: companyObjectId,
                    projectId: new mongoose.Types.ObjectId(projectId),
                    phaseId: phaseId ? new mongoose.Types.ObjectId(phaseId) : null,
                    taskId: taskId ? new mongoose.Types.ObjectId(taskId) : null,
                    subTaskId: subTaskId ? new mongoose.Types.ObjectId(subTaskId) : null,
                    workOrderId: resolvedWorkOrderId ?? null,
                    isWOConsumption,
                    inventoryId: inventoryItem._id,
                    materialMasterId: new mongoose.Types.ObjectId(materialMasterId.trim()),
                    materialName: materialName.trim(),
                    unit: unit.trim(),
                    quantityConsumed: parsedQty,
                    pricePerUnit: parsedPricePerUnit,
                    totalCost: parsedTotalCost,
                    source: resolvedSource,
                    remarks: remarks?.trim() || null,
                    recordedBy: recorder._id,
                },
            ],
            { session }
        );
        if (!isWOConsumption && parsedTotalCost > 0) {
            await createExpenseEntry({
                companyId: companyObjectId,
                projectId: new mongoose.Types.ObjectId(projectId),
                type: "Consumption_Actual",
                category: "Material",
                status: "Actual",
                amount: parsedTotalCost,
                description: `Material consumed: ${parsedQty} ${unit.trim()} of "${materialName.trim()}"`,
                expenseDate: new Date(),
                sourceModel: "MaterialConsumption",
                sourceId: consumptionRecord._id,
                sourceNumber: null,
                phaseId: phaseId ? new mongoose.Types.ObjectId(phaseId) : null,
                taskId: taskId ? new mongoose.Types.ObjectId(taskId) : null,
                createdBy: recorder._id,
                priceSnapshot: parsedPricePerUnit,
            }, session);
        }
        await session.commitTransaction();
        let resolvedWorkOrderNumber = null;
        if (resolvedWorkOrderId) {
            const wo = await WorkOrder.findById(resolvedWorkOrderId)
                .select("woNumber")
                .lean();
            resolvedWorkOrderNumber = wo?.woNumber || null;
        }
        session.endSession();
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: project._id,
            actorId: recorder._id,
            module: "MaterialConsumption",
            action: "MaterialConsumed",
            refId: consumptionRecord._id,
            refNumber: consumptionRecord.materialName,
            details: {
                materialName: consumptionRecord.materialName,
                quantityConsumed: consumptionRecord.quantityConsumed,
                unit: consumptionRecord.unit,
                totalCost: consumptionRecord.totalCost,
                inventoryId: inventoryItem._id,
                source: consumptionRecord.source,
                isWOConsumption: consumptionRecord.isWOConsumption,
                workOrderId: consumptionRecord.workOrderId || null,
                workOrderNumber: resolvedWorkOrderNumber,
                subTaskId: consumptionRecord.subTaskId || null,
                taskId: consumptionRecord.taskId || null,
            },
            eventAt: new Date(),
        });
        if (!isWOConsumption && parsedTotalCost > 0) {
            recalcProjectHealth(projectId, companyObjectId).catch(() => { });
        }
        logger.info("Material consumption recorded", {
            consumptionId: consumptionRecord._id,
            inventoryId: inventoryItem._id,
            materialName: materialName.trim(),
            quantityConsumed: parsedQty,
            projectId,
            subTaskId: subTaskId || null,
            workOrderId: resolvedWorkOrderId ?? null,
            isWOConsumption,
            inventoryDeducted: !isWOConsumption,
            recordedBy: recorder._id,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                formatConsumptionRecord(consumptionRecord),
                "Consumption Recorded",
                isWOConsumption
                    ? `${parsedQty} ${unit.trim()} of "${materialName.trim()}" recorded as WO consumption (project inventory unchanged)`
                    : `${parsedQty} ${unit.trim()} of "${materialName.trim()}" has been recorded as consumed`
            )
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("recordConsumption failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", ["Failed to record material consumption. Please try again later."], [error.message])
        );
    }
};



// This function returns material consumption records for a specific subtask. takes x-company-id in headers, projectId and subTaskId in params. supports pagination and sorting with consumption summary including quantity, cost and unique material count. enriches each record with phase/task/subtask names and full recordedBy profile from Keycloak. -------------------------- Ayan
export const getConsumptionBySubTask = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", ["x-company-id header is required"]));
        }
        const { projectId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", ["projectId must be a valid MongoDB ObjectId"]));
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid SubTask ID", ["subTaskId must be a valid MongoDB ObjectId"]));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", ["No active company found"]));
        const companyObjectId = company._id;

        const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(projectId), companyId: companyObjectId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", [`No active project found with ID: ${projectId}`]));

        const subTask = await SubTask.findOne({ _id: new mongoose.Types.ObjectId(subTaskId), projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false }).lean();
        if (!subTask) return res.status(404).json(new ApiErrors(404, "SubTask Not Found", [`No active subtask found with ID: ${subTaskId}`]));

        const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        if (isNaN(pageNumber) || pageNumber < 1) return res.status(400).json(new ApiErrors(400, "Invalid Page Number", ["page must be a positive integer"]));
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) return res.status(400).json(new ApiErrors(400, "Invalid Limit", ["limit must be between 1 and 100"]));

        const allowedSortFields = ["materialName", "quantityConsumed", "totalCost", "createdAt", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const filter = { companyId: companyObjectId, projectId: new mongoose.Types.ObjectId(projectId), subTaskId: new mongoose.Types.ObjectId(subTaskId), isDeleted: false };

        const [records, total, summary] = await Promise.all([
            MaterialConsumption.find(filter).select("-__v -isDeleted -deletedAt").sort({ [sortField]: sortOrder }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
            MaterialConsumption.countDocuments(filter),
            MaterialConsumption.aggregate([
                { $match: filter },
                { $group: { _id: null, totalQuantityConsumed: { $sum: "$quantityConsumed" }, totalCost: { $sum: "$totalCost" }, uniqueMaterials: { $addToSet: "$materialName" } } },
            ]),
        ]);

        const enrichedRecords = await enrichConsumptionRecords(records);

        const summaryData = summary[0] || { totalQuantityConsumed: 0, totalCost: 0, uniqueMaterials: [] };
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    consumptionRecords: enrichedRecords,
                    summary: {
                        totalRecords: total,
                        totalQuantityConsumed: summaryData.totalQuantityConsumed,
                        totalCost: parsedRound(summaryData.totalCost),
                        uniqueMaterialCount: summaryData.uniqueMaterials.length,
                    },
                    pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
                },
                "SubTask Consumption Records Retrieved",
                total > 0 ? `Fetched ${records.length} consumption records for the subtask` : "No consumption records found for this subtask"
            )
        );
    } catch (error) {
        logger.error("getConsumptionBySubTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", ["Failed to fetch consumption records."], [error.message]));
    }
};



// This function returns all material consumption records for a project. takes x-company-id in headers and projectId in params. supports pagination, search (materialName), filtering (source, subTaskId, workOrderId, isWOConsumption) and sorting with project-level consumption analytics and top material summary. enriches each record with phase/task/subtask names and full recordedBy profile from Keycloak. -------------------------- Ayan
export const getConsumptionByProject = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", ["x-company-id header is required"]));
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", ["projectId must be a valid MongoDB ObjectId"]));

        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", ["No active company found"]));
        const companyObjectId = company._id;

        const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(projectId), companyId: companyObjectId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", [`No active project found with ID: ${projectId}`]));

        const {
            page = 1, limit = 10, sortBy = "createdAt", order = "desc",
            search = "", source, subTaskId: filterSubTaskId,
            isWOConsumption: filterIsWO,
            workOrderId: filterWOId,
        } = req.query;

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        if (isNaN(pageNumber) || pageNumber < 1) return res.status(400).json(new ApiErrors(400, "Invalid Page Number", ["page must be a positive integer"]));
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) return res.status(400).json(new ApiErrors(400, "Invalid Limit", ["limit must be between 1 and 100"]));

        const validSources = ["StockIssue", "DPRSync"];
        if (source && !validSources.includes(source)) return res.status(400).json(new ApiErrors(400, "Invalid source filter", [`source must be one of: ${validSources.join(", ")}`]));
        if (filterSubTaskId && !mongoose.Types.ObjectId.isValid(filterSubTaskId)) return res.status(400).json(new ApiErrors(400, "Invalid subTaskId filter", ["subTaskId must be a valid MongoDB ObjectId"]));
        if (filterWOId && !mongoose.Types.ObjectId.isValid(filterWOId)) return res.status(400).json(new ApiErrors(400, "Invalid workOrderId filter", ["workOrderId must be a valid MongoDB ObjectId"]));

        const filter = { companyId: companyObjectId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false };
        if (search.trim()) filter.materialName = { $regex: search.trim(), $options: "i" };
        if (source) filter.source = source;
        if (filterSubTaskId) filter.subTaskId = new mongoose.Types.ObjectId(filterSubTaskId);
        if (filterWOId) filter.workOrderId = new mongoose.Types.ObjectId(filterWOId);
        if (filterIsWO === "true") filter.isWOConsumption = true;
        if (filterIsWO === "false") filter.isWOConsumption = false;

        const allowedSortFields = ["materialName", "quantityConsumed", "totalCost", "createdAt", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const summaryFilter = { companyId: companyObjectId, projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false };
        const [records, total, summary] = await Promise.all([
            MaterialConsumption.find(filter).select("-__v -isDeleted -deletedAt").sort({ [sortField]: sortOrder }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
            MaterialConsumption.countDocuments(filter),
            MaterialConsumption.aggregate([
                { $match: summaryFilter },
                { $group: { _id: "$materialName", totalQuantityConsumed: { $sum: "$quantityConsumed" }, totalCost: { $sum: "$totalCost" }, unit: { $first: "$unit" }, recordCount: { $sum: 1 } } },
                { $sort: { totalCost: -1 } },
                { $limit: 20 },
            ]),
        ]);
        const enrichedRecords = await enrichConsumptionRecords(records);
        const overallTotalCost = summary.reduce((acc, m) => acc + m.totalCost, 0);
        const overallTotalQty = summary.reduce((acc, m) => acc + m.totalQuantityConsumed, 0);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    consumptionRecords: enrichedRecords,
                    summary: {
                        totalRecords: total,
                        overallTotalCost: parsedRound(overallTotalCost),
                        overallTotalQuantityConsumed: overallTotalQty,
                        uniqueMaterialCount: summary.length,
                        topMaterials: summary.map((m) => ({
                            materialName: m._id,
                            unit: m.unit,
                            totalQuantityConsumed: m.totalQuantityConsumed,
                            totalCost: parsedRound(m.totalCost),
                            recordCount: m.recordCount,
                        })),
                    },
                    pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
                },
                "Project Consumption Records Retrieved",
                total > 0 ? `Fetched ${records.length} consumption records for the project` : "No consumption records found for this project"
            )
        );
    } catch (error) {
        logger.error("getConsumptionByProject failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", ["Failed to fetch project consumption records."], [error.message]));
    }
};



// This function soft deletes a material consumption record. takes x-company-id in headers, projectId and consumptionId in params and optional deletedBy in body. restores inventory stock for non-WO consumption, reverses expense entries and pushes DPR events using transaction handling. --------------------------Ayan
export const deleteConsumptionRecord = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Missing Header", ["x-company-id header is required"]));
        }
        const { projectId, consumptionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", ["projectId must be a valid MongoDB ObjectId"]));
        }
        if (!mongoose.Types.ObjectId.isValid(consumptionId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(new ApiErrors(400, "Invalid Consumption ID", ["consumptionId must be a valid MongoDB ObjectId"]));
        }

        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(new ApiErrors(404, "Company Not Found", ["No active company found"]));
        }
        const companyObjectId = company._id;
        const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(projectId), companyId: companyObjectId, isDeleted: false }).lean().session(session);
        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(new ApiErrors(404, "Project Not Found", [`No active project found with ID: ${projectId}`]));
        }
        const record = await MaterialConsumption.findOne({
            _id: new mongoose.Types.ObjectId(consumptionId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean().session(session);
        if (!record) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Consumption Record Not Found", [`No active consumption record found with ID: ${consumptionId}`])
            );
        }
        const { deletedBy } = req.body;
        let deletedByObjectId = null;
        if (deletedBy?.trim()) {
            const deleter = await User.findOne({ keycloakId: deletedBy.trim(), companyId: companyObjectId, isDeleted: false }).lean().session(session);
            if (!deleter) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json(new ApiErrors(404, "User Not Found", [`No active user found with keycloakId: ${deletedBy}`]));
            }
            deletedByObjectId = deleter._id;
        }
        await MaterialConsumption.findByIdAndUpdate(
            record._id,
            { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: deletedByObjectId } },
            { session }
        );
        if (!record.isWOConsumption) {
            await Inventory.findByIdAndUpdate(
                record.inventoryId,
                { $inc: { currentStock: record.quantityConsumed, totalConsumed: -record.quantityConsumed } },
                { session, runValidators: false }
            );
            logger.info("deleteConsumptionRecord: inventory stock reversed", {
                consumptionId: record._id,
                inventoryId: record.inventoryId,
                quantityReversed: record.quantityConsumed,
            });
            await reverseExpenseEntry({
                sourceModel: "MaterialConsumption",
                sourceId: record._id,
                reversedBy: deletedByObjectId,
                reversalReason: `Consumption record deleted — ${record.materialName} (${record.quantityConsumed} ${record.unit})`,
            }, session);
        } else {
            logger.info("deleteConsumptionRecord: WO consumption — no inventory reversal", {
                consumptionId: record._id,
                workOrderId: record.workOrderId,
                quantityConsumed: record.quantityConsumed,
            });
        }
        await session.commitTransaction();
        session.endSession();
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: record.projectId,
            actorId: deletedByObjectId || null,
            module: "MaterialConsumption",
            action: "MaterialConsumptionDeleted",
            refId: record._id,
            refNumber: record.materialName,
            details: {
                materialName: record.materialName,
                quantityConsumed: record.quantityConsumed,
                unit: record.unit,
                totalCost: record.totalCost,
                inventoryRestored: !record.isWOConsumption,
                isWOConsumption: record.isWOConsumption,
                workOrderId: record.workOrderId || null,
            },
            eventAt: new Date(),
        });
        if (!record.isWOConsumption) {
            recalcProjectHealth(record.projectId.toString(), record.companyId.toString()).catch(() => { });
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    consumptionId: record._id,
                    materialName: record.materialName,
                    quantityConsumed: record.quantityConsumed,
                    unit: record.unit,
                    isWOConsumption: record.isWOConsumption,
                    inventoryReversed: !record.isWOConsumption,
                    deletedAt: new Date().toISOString(),
                },
                "Consumption Record Deleted",
                record.isWOConsumption
                    ? `WO consumption record for "${record.materialName}" deleted (project inventory was not affected)`
                    : `Consumption record for "${record.materialName}" (${record.quantityConsumed} ${record.unit}) deleted and inventory stock restored`
            )
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("deleteConsumptionRecord failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", ["Failed to delete consumption record."], [error.message]));
    }
};



// This function returns material consumption records linked to a specific work order. takes x-company-id in headers, projectId and woId in params. supports pagination, search (materialName) and sorting with consumption summary including quantity, cost and unique material count. -------------------------- Ayan
export const getConsumptionByWorkOrder = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) return res.status(400).json(new ApiErrors(400, "Missing Header", ["x-company-id header is required"]));
        const { projectId, woId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json(new ApiErrors(400, "Invalid Project ID", ["projectId must be a valid MongoDB ObjectId"]));
        if (!mongoose.Types.ObjectId.isValid(woId)) return res.status(400).json(new ApiErrors(400, "Invalid WO ID", ["woId must be a valid MongoDB ObjectId"]));
        const company = await resolveCompany(companyUUID);
        if (!company) return res.status(404).json(new ApiErrors(404, "Company Not Found", ["No active company found"]));
        const companyObjectId = company._id;
        const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(projectId), companyId: companyObjectId, isDeleted: false }).lean();
        if (!project) return res.status(404).json(new ApiErrors(404, "Project Not Found", [`No active project found with ID: ${projectId}`]));
        const { page = 1, limit = 10, sortBy = "createdAt", order = "desc", search = "" } = req.query;
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        if (isNaN(pageNumber) || pageNumber < 1) return res.status(400).json(new ApiErrors(400, "Invalid Page Number", ["page must be a positive integer"]));
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) return res.status(400).json(new ApiErrors(400, "Invalid Limit", ["limit must be between 1 and 100"]));

        const filter = {
            companyId: companyObjectId,
            projectId: new mongoose.Types.ObjectId(projectId),
            workOrderId: new mongoose.Types.ObjectId(woId),
            isDeleted: false,
        };
        if (search.trim()) filter.materialName = { $regex: search.trim(), $options: "i" };

        const allowedSortFields = ["materialName", "quantityConsumed", "totalCost", "createdAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const [records, total, summary] = await Promise.all([
            MaterialConsumption.find(filter).select("-__v -isDeleted -deletedAt").sort({ [sortField]: sortOrder }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
            MaterialConsumption.countDocuments(filter),
            MaterialConsumption.aggregate([
                { $match: filter },
                { $group: { _id: null, totalCost: { $sum: "$totalCost" }, totalQuantity: { $sum: "$quantityConsumed" }, uniqueMaterials: { $addToSet: "$materialName" } } },
            ]),
        ]);
        const summaryData = summary[0] || { totalCost: 0, totalQuantity: 0, uniqueMaterials: [] };
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    consumptionRecords: records.map(formatConsumptionRecord),
                    summary: {
                        totalRecords: total,
                        totalCost: parsedRound(summaryData.totalCost),
                        totalQuantityConsumed: summaryData.totalQuantity,
                        uniqueMaterialCount: summaryData.uniqueMaterials.length,
                    },
                    pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize), hasNext: pageNumber < Math.ceil(total / pageSize), hasPrev: pageNumber > 1 },
                },
                "WO Consumption Records Retrieved",
                total > 0 ? `Fetched ${records.length} consumption records for this Work Order` : "No consumption records found for this Work Order"
            )
        );
    } catch (error) {
        logger.error("getConsumptionByWorkOrder failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", ["Failed to fetch WO consumption records."], [error.message]));
    }
};

const parsedRound = (value) => Math.round(value * 100) / 100;