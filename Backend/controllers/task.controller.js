import mongoose from "mongoose";
import Task from "../models/task.models.js";
import Phase from "../models/phase.models.js";
import Project from "../models/project.models.js";
import User from "../models/user.models.js";
import Company from "../models/company.models.js";
import Document from "../models/document.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { propagateFromTask } from "../helpers/progressHelper.js";
import WorkOrder from "../models/workOrder.models.js";
import { propagateFromWOTaskLink } from "../helpers/progressHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import NotificationService from "../services/notification.service.js";


// Add New Task ---------------------------------------------------------------- @Sundar
export const addTask = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Missing Header",
                    "x-company-id header is required"
                )
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const { taskName, description, priority, startDate, endDate, assignedTo, createdBy, workOrderId } = req.body;
        const missing = [];
        if (!taskName || !taskName.trim()) missing.push("taskName");
        if (!startDate) missing.push("startDate");
        if (!endDate) missing.push("endDate");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Date Format", "startDate and endDate must be valid ISO date strings (e.g. 2024-06-01)")
            );
        }
        if (end <= start) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Date Range", "endDate must be strictly after startDate")
            );
        }
        const allowedPriorities = ["Low", "Medium", "High", "Critical"];
        if (priority && !allowedPriorities.includes(priority)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Priority", `priority must be one of: ${allowedPriorities.join(", ")}`)
            );
        }
        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId}`)
            );
        }
        if (start < phase.startDate || end > phase.endDate) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Task Dates Out of Phase Bounds",
                    `Task dates must be within the phase timeline: ${phase.startDate.toISOString().split("T")[0]} → ${phase.endDate.toISOString().split("T")[0]}`
                )
            );
        }
        let resolvedWorkOrderId = null;
        if (workOrderId?.trim()) {
            if (!mongoose.Types.ObjectId.isValid(workOrderId.trim())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid WO ID", "workOrderId must be a valid MongoDB ObjectId")
                );
            }
            const wo = await WorkOrder.findOne({
                _id: new mongoose.Types.ObjectId(workOrderId.trim()),
                companyId: companyObjectId,
                projectId: phase.projectId,
                isDeleted: false,
            }).lean();
            if (!wo) {
                return res.status(404).json(
                    new ApiErrors(
                        404,
                        "Work Order Not Found",
                        "No active Work Order found with the given ID for this project"
                    )
                );
            }
            if (!["Approved", "InProgress"].includes(wo.status)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid WO Status",
                        `Cannot link a task to a Work Order in '${wo.status}' status. WO must be Approved or InProgress`
                    )
                );
            }
            resolvedWorkOrderId = wo._id;
        }
        let assignees = [];
        if (assignedTo && assignedTo.length > 0) {
            let parsedKeycloakIds = assignedTo;
            if (typeof assignedTo === "string") {
                try {
                    parsedKeycloakIds = JSON.parse(assignedTo);
                } catch {
                    parsedKeycloakIds = assignedTo
                        .replace(/[\[\]]/g, "")
                        .split(",")
                        .map((id) => id.trim())
                        .filter(Boolean);
                }
            }
            const foundUsers = await User.find({
                keycloakId: { $in: parsedKeycloakIds },
                companyId: companyObjectId,
                isDeleted: false,
            }).lean();
            if (foundUsers.length !== parsedKeycloakIds.length) {
                const foundKeycloakIds = foundUsers.map((u) => u.keycloakId);
                const invalidIds = parsedKeycloakIds.filter(
                    (id) => !foundKeycloakIds.includes(id)
                );
                return res.status(404).json(
                    new ApiErrors(404, "Invalid Assigned Users", [
                        `These keycloakIds were not found in your company: ${invalidIds.join(", ")}`,
                    ])
                );
            }
            const project = await Project.findOne({
                _id: phase.projectId,
                isDeleted: false,
            }).lean();
            if (!project) {
                return res.status(404).json(
                    new ApiErrors(404, "Project Not Found", "The project linked to this phase no longer exists")
                );
            }
            const projectAssignedUserIds = project.assignedUsers.map(
                (u) => u.userId.toString()
            );
            const notInProject = foundUsers.filter(
                (u) => !projectAssignedUserIds.includes(u._id.toString())
            );
            if (notInProject.length > 0) {
                const notInProjectKeycloakIds = notInProject.map((u) => u.keycloakId);
                return res.status(403).json(
                    new ApiErrors(
                        403,
                        "Users Not Assigned To Project",
                        `These users are not assigned to this project and cannot be added to its tasks: ${notInProjectKeycloakIds.join(", ")}`
                    )
                );
            }
            assignees = foundUsers.map((u) => u._id);
        }
        if (!createdBy || !createdBy.trim()) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Missing Required Fields",
                    "createdBy (keycloakId) is required",
                    ["createdBy"]
                )
            );
        }
        const creatorUser = await User.findOne({
            keycloakId: createdBy.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    "Invalid createdBy",
                    `No user found with keycloakId: ${createdBy}`
                )
            );
        }
        const task = await Task.create({
            companyId: companyObjectId,
            projectId: phase.projectId,
            phaseId: new mongoose.Types.ObjectId(phaseId),
            workOrderId: resolvedWorkOrderId,
            taskName: taskName.trim(),
            description: description?.trim() || null,
            priority: priority || "Medium",
            startDate: start,
            endDate: end,
            assignedTo: assignees,
            createdBy: creatorUser._id,
        });
        try {
            await propagateFromTask(
                phaseId,
                phase.projectId.toString()
            );
        } catch (propagationError) {
            logger.error("addTask: progress propagation failed", {
                taskId: task._id,
                phaseId,
                error: propagationError.message,
            });
        }
        if (resolvedWorkOrderId) {
            try {
                await propagateFromWOTaskLink(resolvedWorkOrderId.toString());
            } catch (woProgError) {
                logger.error("addTask: WO progress recalc failed (non-fatal)", {
                    taskId: task._id,
                    workOrderId: resolvedWorkOrderId,
                    error: woProgError.message,
                });
            }
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: phase.projectId,
            actorId: creatorUser._id,
            module: "Task",
            action: "TaskCreated",
            refId: task._id,
            refNumber: task.taskName,
            details: {
                taskName: task.taskName,
                priority: task.priority,
                status: task.status,
                startDate: task.startDate,
                endDate: task.endDate,
                assignedUserCount: assignees.length,
                workOrderId: resolvedWorkOrderId || null,
            },
            eventAt: new Date(),
        });
        // Send notifications to assigned users
        if (assignees.length > 0) {
            NotificationService.notifyTaskAssigned({
                companyId: companyObjectId,
                projectId: phase.projectId,
                taskId: task._id,
                taskName: task.taskName,
                recipientIds: assignees.map(id => id.toString()),
                triggeredBy: creatorUser._id,
            }).catch(err => logger.error("notifyTaskAssigned failed (non-fatal)", { error: err.message }));
        }
        logger.info("Task created successfully", {
            taskId: task._id,
            taskName: task.taskName,
            phaseId,
            assignedTo: assignees,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    taskId: task._id,
                    taskName: task.taskName,
                    description: task.description,
                    priority: task.priority,
                    workOrderId: task.workOrderId ?? null,
                    status: task.status,
                    startDate: task.startDate,
                    endDate: task.endDate,
                    completionPercent: task.completionPercent,
                    assignedTo: task.assignedTo,
                    phaseId: task.phaseId,
                    projectId: task.projectId,
                    companyId: task.companyId,
                    createdBy: task.createdBy,
                    createdAt: task.createdAt,
                },
                "Task Created",
                `Task "${task.taskName}" has been successfully added to the phase`
            )
        );
    } catch (error) {
        logger.error("addTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to create task. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// All Tasks List -------------------------------------------------------------- @Sundar
export const allTasks = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            priority,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Page Number", "Page must be a positive number")
            );
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Limit", "Limit must be between 1 and 100")
            );
        }
        const filter = {
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        };
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) {
            filter.$or = [
                { taskName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        const allowedSortFields = ["taskName", "priority", "status", "startDate", "endDate", "completionPercent", "createdAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const tasks = await Task.find(filter)
            .select("-__v -isDeleted -dependencies")
            .populate("assignedTo", "_id name email")
            .populate("createdBy", "_id name email")
            .sort({ [sortField]: sortOrder })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .lean();
        const total = await Task.countDocuments(filter);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    tasks,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Tasks Retrieved",
                `Successfully fetched ${tasks.length} tasks.`
            )
        );
    } catch (error) {
        logger.error("allTasks failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "An unexpected error occurred while fetching tasks",
                [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Get Particular Task by ID --------------------------------------------------- @Sundar
export const getTask = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("-__v -isDeleted")
            .populate("assignedTo", "_id name email")
            .populate("createdBy", "_id name email")
            .populate("updatedBy", "_id name email")
            .populate("dependencies", "_id taskName status")
            .lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId} under phase: ${phaseId}`)
            );
        }
        logger.info("Task fetched successfully", { taskId, phaseId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { task },
                "Task Retrieved",
                `Task "${task.taskName}" retrieved successfully`
            )
        );
    } catch (error) {
        logger.error("getTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to retrieve task. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Edit Task ------------------------------------------------------------------- @Sundar
export const editTask = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        const existingTask = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!existingTask) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId} under phase: ${phaseId}`)
            );
        }
        const allowedFields = ["taskName", "description", "priority", "status", "startDate", "endDate", "dependencies"];
        const provided = allowedFields.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "No Fields Provided",
                    `Provide at least one field to update: ${allowedFields.join(", ")}`,
                    allowedFields
                )
            );
        }
        const { taskName, description, priority, status, startDate, endDate, dependencies } = req.body;
        const updateData = {};
        const errors = [];
        if (taskName !== undefined) {
            const trimmed = taskName.trim();
            if (!trimmed) {
                errors.push("taskName cannot be empty");
            } else if (trimmed.length > 300) {
                errors.push("taskName cannot exceed 300 characters");
            } else {
                updateData.taskName = trimmed;
            }
        }
        if (description !== undefined) {
            updateData.description = description === null || description === "" ? null : description.trim();
        }
        if (priority !== undefined) {
            const allowedPriorities = ["Low", "Medium", "High", "Critical"];
            if (!allowedPriorities.includes(priority)) {
                errors.push(`priority must be one of: ${allowedPriorities.join(", ")}`);
            } else {
                updateData.priority = priority;
            }
        }
        if (status !== undefined) {
            const allowedStatuses = ["NotStarted", "InProgress", "Completed", "Blocked", "OnHold"];
            if (!allowedStatuses.includes(status)) {
                errors.push(`status must be one of: ${allowedStatuses.join(", ")}`);
            } else {
                updateData.status = status;
            }
        }
        const newStart = startDate ? new Date(startDate) : existingTask.startDate;
        const newEnd = endDate ? new Date(endDate) : existingTask.endDate;
        if (startDate !== undefined) {
            if (isNaN(newStart.getTime())) {
                errors.push("startDate must be a valid date");
            } else {
                updateData.startDate = newStart;
            }
        }
        if (endDate !== undefined) {
            if (isNaN(newEnd.getTime())) {
                errors.push("endDate must be a valid date");
            } else {
                updateData.endDate = newEnd;
            }
        }
        if (!isNaN(newStart.getTime()) && !isNaN(newEnd.getTime()) && newEnd <= newStart) {
            errors.push("endDate must be strictly after startDate");
        }
        if (errors.length === 0 && (startDate !== undefined || endDate !== undefined)) {
            const phase = await Phase.findOne({
                _id: new mongoose.Types.ObjectId(phaseId),
                companyId: companyObjectId,
                isDeleted: false,
            }).lean();
            if (!phase) {
                return res.status(404).json(
                    new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId}`)
                );
            }
            if (newStart < phase.startDate || newEnd > phase.endDate) {
                errors.push(
                    `Task dates must be within the phase timeline: ${phase.startDate.toISOString().split("T")[0]} → ${phase.endDate.toISOString().split("T")[0]}`
                );
            }
        }
        if (dependencies !== undefined) {
            if (!Array.isArray(dependencies)) {
                errors.push("dependencies must be an array of task IDs");
            } else {
                const deps = [];
                for (const id of dependencies) {
                    if (!mongoose.Types.ObjectId.isValid(id)) {
                        errors.push(`The value "${id}" in dependencies is not a valid MongoDB ObjectId`);
                        break;
                    }
                    if (id === taskId) {
                        errors.push("A task cannot depend on itself");
                        break;
                    }
                    deps.push(new mongoose.Types.ObjectId(id));
                }
                if (!errors.length) updateData.dependencies = deps;
            }
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "One or more fields have invalid values", errors)
            );
        }
        const updatedBy = req.user?._id ?? null;
        if (updatedBy) {
            updateData.updatedBy = new mongoose.Types.ObjectId(updatedBy);
        }
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted")
            .populate("updatedBy", "_id name email")
            .populate("dependencies", "_id taskName status")
            .lean();
        if (!updatedTask) {
            return res.status(500).json(
                new ApiErrors(500, "Update Failed", "Task update failed unexpectedly")
            );
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: updatedTask.projectId,
            actorId: updatedBy,
            module: "Task",
            action: "TaskUpdated",
            refId: updatedTask._id,
            refNumber: updatedTask.taskName,
            details: {
                taskName: updatedTask.taskName,
                updatedFields: Object.keys(updateData),
                priority: updatedTask.priority,
                status: updatedTask.status,
                startDate: updatedTask.startDate,
                endDate: updatedTask.endDate,
            },

            eventAt: new Date(),
        });
        logger.info("Task updated successfully", {
            taskId: updatedTask._id,
            phaseId,
            updatedFields: Object.keys(updateData),
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    taskId: updatedTask._id,
                    taskName: updatedTask.taskName,
                    description: updatedTask.description,
                    priority: updatedTask.priority,
                    status: updatedTask.status,
                    startDate: updatedTask.startDate,
                    endDate: updatedTask.endDate,
                    dependencies: updatedTask.dependencies,
                    phaseId: updatedTask.phaseId,
                    projectId: updatedTask.projectId,
                    companyId: updatedTask.companyId,
                    updatedBy: updatedTask.updatedBy,
                    updatedAt: updatedTask.updatedAt,
                },
                "Task Updated",
                `Task "${updatedTask.taskName}" has been updated successfully`
            )
        );
    } catch (error) {
        logger.error("editTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to update task. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Delete Task (Soft Delete) ---------------------------------------------------- @Sundar
export const deleteTask = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId} under phase: ${phaseId}`)
            );
        }
        const deletedBy = req.user?._id ?? null;
        const projectId = task.projectId.toString();
        await Task.findByIdAndUpdate(taskId, {
            $set: {
                isDeleted: true,
                ...(deletedBy ? { updatedBy: new mongoose.Types.ObjectId(deletedBy) } : {}),
            },
        });
        try {
            await propagateFromTask(phaseId, projectId);
        } catch (propagationError) {
            logger.error("deleteTask: progress propagation failed", {
                taskId,
                phaseId,
                error: propagationError.message,
            });
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: task.projectId,
            actorId: deletedBy,
            module: "Task",
            action: "TaskDeleted",
            refId: task._id,
            refNumber: task.taskName,
            details: {
                taskName: task.taskName,
                priority: task.priority,
                status: task.status,
            },
            eventAt: new Date(),
        });
        logger.info("Task soft-deleted successfully", {
            taskId: task._id,
            taskName: task.taskName,
            phaseId,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    taskId: task._id,
                    taskName: task.taskName,
                    deletedAt: new Date().toISOString(),
                },
                "Task Deleted",
                `Task "${task.taskName}" has been deleted successfully`
            )
        );
    } catch (error) {
        logger.error("deleteTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to delete task. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Add or Remove any assigned user in a task. takes the keyacloak id and action = "add" or "remove" ---------------- Ayan
export const updateTaskMember = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;
        const { phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "phaseId must be a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "taskId must be a valid MongoDB ObjectId")
            );
        }
        const { userId, action } = req.body;
        if (!userId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "userId (keycloakId) is required")
            );
        }
        if (!["add", "remove"].includes(action)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", 'action must be either "add" or "remove"')
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId} under phase: ${phaseId}`)
            );
        }
        const targetUser = await User.findOne({
            keycloakId: userId.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!targetUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${userId} in your company`)
            );
        }
        const alreadyAssigned = task.assignedTo.some(
            (id) => id.toString() === targetUser._id.toString()
        );
        if (action === "add") {
            if (alreadyAssigned) {
                return res.status(409).json(
                    new ApiErrors(409, "Already Assigned", "This user is already assigned to this task")
                );
            }
            await Task.findByIdAndUpdate(taskId, {
                $push: { assignedTo: targetUser._id },
            });
            // Notify user
            NotificationService.notifyTaskAssigned({
                companyId: companyObjectId,
                projectId: task.projectId,
                taskId: task._id,
                taskName: task.taskName,
                recipientIds: [targetUser._id.toString()],
                triggeredBy: req.user?._id || null,
            }).catch(err => logger.error("notifyTaskAssigned (updateTaskMember) failed (non-fatal)", { error: err.message }));
            logger.info("updateTaskMember: user added", { taskId, phaseId, userId });
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        taskId, action: "add", member: {
                            userId: userId.trim(),
                            mongoId: targetUser._id,
                            name: targetUser.name,
                            email: targetUser.email,
                        },
                    },
                    "Member Added", `User "${targetUser.name}" has been successfully added to the task`
                )
            );
        }
        if (!alreadyAssigned) {
            return res.status(404).json(
                new ApiErrors(404, "Not Assigned", "This user is not assigned to this task")
            );
        }
        await Task.findByIdAndUpdate(taskId, {
            $pull: { assignedTo: targetUser._id },
        });
        logger.info("updateTaskMember: user removed", { taskId, phaseId, userId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    taskId,
                    action: "remove",
                    member: {
                        userId: userId.trim(),
                        mongoId: targetUser._id,
                        name: targetUser.name,
                        email: targetUser.email,
                    },
                },
                "Member Removed", `User "${targetUser.name}" has been successfully removed from the task`
            )
        );
    } catch (error) {
        logger.error("updateTaskMember failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update task member. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// This function returns all documents linked to a specific task. Takes phaseId and taskId from params. Supports pagination and search by document name or date.  -------------------------- Ayan
export const getTaskDocuments = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!task) {
            return res.status(404).json(new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId} under phase: ${phaseId}`));
        }
        const {
            search,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20,
        } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Page", "page must be a positive number")
            );
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Limit", "limit must be between 1 and 100")
            );
        }
        const filter = {
            companyId: company._id,
            "linkedTo.refModel": "Task",
            "linkedTo.refId": new mongoose.Types.ObjectId(taskId),
            isDeleted: false,
        };
        if (search?.trim()) {
            filter.name = { $regex: search.trim(), $options: "i" };
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }
        const skip = (pageNum - 1) * limitNum;
        const [documents, total] = await Promise.all([
            Document.find(filter)
                .select("_id name fileName fileSize fileType mimeType category uploadedBy createdAt")
                .populate("uploadedBy", "keycloakId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Document.countDocuments(filter),
        ]);
        logger.info("Task documents fetched successfully", {
            taskId,
            phaseId,
            total,
            page: pageNum,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    documents,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                    },
                },
                "Task Documents Retrieved",
                total > 0 ? `Successfully fetched ${documents.length} documents linked to this task` : "No documents linked to this task"
            )
        );
    } catch (error) {
        logger.error("getTaskDocuments failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch task documents. Please try again later.", [error.message])
        );
    }
};

// This Function Returens all unique user KeycloakId, Name, Designation (Email) for all tasks -------------------------------------------@Sundar
export const getAllUniqueAssignedUsers = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { phaseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const uniqueUserIds = await Task.distinct("assignedTo", {
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: company._id,
            isDeleted: false,
        });
        if (!uniqueUserIds || uniqueUserIds.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, { users: [] }, "Users Retrieved", "No users assigned to any task in this phase")
            );
        }
        const users = await User.find({
            _id: { $in: uniqueUserIds },
            isDeleted: false
        })
            .select("keycloakId name email avatar _id")
            .lean();
        return res.status(200).json(
            new ApiResponse(
                200,
                { users },
                "Users Retrieved",
                `Successfully fetched ${users.length} unique assigned users from tasks in this phase.`
            )
        );
    } catch (error) {
        logger.error("getAllUniqueAssignedUsers failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "An unexpected error occurred while fetching assigned users",
                [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Get Task Start & End Date ------------------------------------------------------ @Sundar
export const getTaskDates = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found")
            );
        }
        const companyObjectId = company._id;
        const { phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID")
            );
        }
        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        }).select("_id").lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found")
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("taskName priority status startDate endDate")
            .lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found")
            );
        }
        logger.info("Task dates fetched successfully", { taskId, phaseId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    taskId: task._id,
                    taskName: task.taskName,
                    priority: task.priority,
                    status: task.status,
                    startDate: task.startDate,
                    endDate: task.endDate,
                },
                "Task Dates Fetched",
                `Dates for task "${task.taskName}" fetched successfully`
            )
        );
    } catch (error) {
        logger.error("getTaskDates failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch task dates", [error.message], process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};
// Get Tasks by Assigned User (keycloakId) ------------------------------------- @Souvik
export const getTasksByUser = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyObjectId = company._id;

        const { phaseId, keycloakId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(phaseId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Phase ID", "The provided phaseId is not a valid MongoDB ObjectId")
            );
        }
        if (!keycloakId || !keycloakId.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Parameter", "keycloakId is required")
            );
        }

        const phase = await Phase.findOne({
            _id: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!phase) {
            return res.status(404).json(
                new ApiErrors(404, "Phase Not Found", `No active phase found with ID: ${phaseId}`)
            );
        }

        const targetUser = await User.findOne({
            keycloakId: keycloakId.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!targetUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${keycloakId} in your company`)
            );
        }

        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            priority,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);

        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Page Number", "Page must be a positive number")
            );
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Limit", "Limit must be between 1 and 100")
            );
        }

        const filter = {
            phaseId: new mongoose.Types.ObjectId(phaseId),
            companyId: companyObjectId,
            assignedTo: targetUser._id,
            isDeleted: false,
        };

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) {
            filter.$or = [
                { taskName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const allowedSortFields = ["taskName", "priority", "status", "startDate", "endDate", "completionPercent", "createdAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const [tasks, total] = await Promise.all([
            Task.find(filter)
                .select("-__v -isDeleted -dependencies")
                .populate("assignedTo", "_id name email")
                .populate("createdBy", "_id name email")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Task.countDocuments(filter),
        ]);

        logger.info("getTasksByUser: fetched successfully", {
            phaseId,
            keycloakId,
            total,
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    tasks,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Tasks Retrieved",
                `Successfully fetched ${tasks.length} tasks assigned to this user`
            )
        );
    } catch (error) {
        logger.error("getTasksByUser failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to fetch tasks. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};
// Get All Tasks By User (Across Project) ------------------------------- @Souvik
export const getAllTasksByUser = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }

        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();

        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found")
            );
        }

        const { projectId, keycloakId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID")
            );
        }

        const user = await User.findOne({
            keycloakId,
            companyId: company._id,
            isDeleted: false,
        }).lean();

        if (!user) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found")
            );
        }

        const tasks = await Task.find({
            projectId: new mongoose.Types.ObjectId(projectId),
            assignedTo: user._id,
            companyId: company._id,
            isDeleted: false,
        })
            .populate("assignedTo", "_id name email")
            .populate("createdBy", "_id name email")
            .lean();

        return res.status(200).json(
            new ApiResponse(
                200,
                { tasks },
                "Tasks Retrieved",
                `Fetched ${tasks.length} tasks assigned to this user`
            )
        );

    } catch (error) {
        return res.status(500).json(
            new ApiErrors(500, "Server Error", error.message)
        );
    }
};