import mongoose from "mongoose";
import SubTask from "../models/subTask.models.js";
import Task from "../models/task.models.js";
import Project from "../models/project.models.js";
import User from "../models/user.models.js";
import Role from "../models/role.models.js";
import Company from "../models/company.models.js";
import Document from "../models/document.models.js";
import WorkOrder from "../models/workOrder.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import keycloakService from "../services/keycloak.service.js";
import { propagateFromSubTask } from "../helpers/progressHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import NotificationService from "../services/notification.service.js";

// Add New SubTask ------------------------------------------------------------- @Sundar
export const addSubTask = async (req, res) => {
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
        const { taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        const {
            title,
            description,
            assignedTo,
            startDate,
            endDate,
            createdBy,
        } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "The following fields are required: title", ["title"])
            );
        }
        if (title.trim().length > 300) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "title cannot exceed 300 characters")
            );
        }
        if (!createdBy || !createdBy.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "createdBy (keycloakId) is required", ["createdBy"])
            );
        }
        let start = null;
        let end = null;
        if (startDate) {
            start = new Date(startDate);
            if (isNaN(start.getTime())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Date Format", "startDate must be a valid ISO date string (e.g. 2024-06-01)")
                );
            }
        }
        if (endDate) {
            end = new Date(endDate);
            if (isNaN(end.getTime())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Date Format", "endDate must be a valid ISO date string (e.g. 2024-06-01)"
                    )
                );
            }
        }
        if (start && end && end <= start) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Date Range", "endDate must be strictly after startDate"
                )
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            isDeleted: false,
        }).lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    "Task Not Found",
                    `No active task found with ID: ${taskId}`
                )
            );
        }
        const project = await Project.findOne({
            _id: task.projectId,
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(403).json(
                new ApiErrors(
                    403,
                    "Access Denied",
                    "This task does not belong to your company"
                )
            );
        }
        if (start && task.startDate && start < task.startDate) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "SubTask Dates Out of Task Bounds",
                    `SubTask startDate cannot be before task startDate: ${task.startDate.toISOString().split("T")[0]
                    }`
                )
            );
        }
        if (end && task.endDate && end > task.endDate) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "SubTask Dates Out of Task Bounds",
                    `SubTask endDate cannot be after task endDate: ${task.endDate.toISOString().split("T")[0]
                    }`
                )
            );
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
            if (!Array.isArray(parsedKeycloakIds) || parsedKeycloakIds.length === 0) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid assignedTo",
                        "assignedTo must be a non-empty array of keycloakIds"
                    )
                );
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
                    new ApiErrors(
                        404,
                        "Invalid Assigned Users",
                        `These keycloakIds were not found in your company: ${invalidIds.join(", ")}`
                    )
                );
            }
            const projectAssignedUserIds = project.assignedUsers.map(
                (u) => u.userId.toString()
            );
            const notInProject = foundUsers.filter(
                (u) => !projectAssignedUserIds.includes(u._id.toString())
            );
            if (notInProject.length > 0) {
                const notInProjectKeycloakIds = notInProject.map(
                    (u) => u.keycloakId
                );
                return res.status(403).json(
                    new ApiErrors(
                        403,
                        "Users Not Assigned To Project",
                        `These users are not assigned to this project: ${notInProjectKeycloakIds.join(", ")}`
                    )
                );
            }
            assignees = foundUsers.map((u) => u._id);
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
        const subTask = await SubTask.create({
            companyId: companyObjectId,
            projectId: task.projectId,
            phaseId: task.phaseId,
            workOrderId: task.workOrderId ?? null,
            taskId: new mongoose.Types.ObjectId(taskId),
            title: title.trim(),
            description: description?.trim() || null,
            assignedTo: assignees,
            startDate: start,
            endDate: end,
            createdBy: creatorUser._id,
        });
        try {
            await propagateFromSubTask(
                task._id.toString(),
                task.phaseId.toString(),
                task.projectId.toString()
            );
        } catch (propagationError) {
            logger.error("addSubTask: progress propagation failed", {
                subTaskId: subTask._id,
                taskId,
                error: propagationError.message,
            });
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: task.projectId,
            actorId: creatorUser._id,
            module: "SubTask",
            action: "SubTaskCreated",
            refId: subTask._id,
            refNumber: subTask.title,
            details: {
                subTaskTitle: subTask.title,
                taskName: task.taskName,
                status: subTask.status,
                completionPercent: subTask.completionPercent,
                assignedUserCount: assignees.length,
                startDate: subTask.startDate,
                endDate: subTask.endDate,
            },
            eventAt: new Date(),
        });
        // Send notifications to assigned users
        if (assignees.length > 0) {
            NotificationService.notifySubtaskAssigned({
                companyId: companyObjectId,
                projectId: task.projectId,
                subtaskId: subTask._id,
                subtaskTitle: subTask.title,
                recipientIds: assignees.map(id => id.toString()),
                triggeredBy: creatorUser._id,
            }).catch(err => logger.error("notifySubtaskAssigned failed (non-fatal)", { error: err.message }));
        }
        logger.info("SubTask created successfully", {
            subTaskId: subTask._id,
            title: subTask.title,
            taskId,
            projectId: task.projectId,
            assignedTo: assignees,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    subTaskId: subTask._id,
                    title: subTask.title,
                    workOrderId: subTask.workOrderId ?? null,
                    description: subTask.description,
                    status: subTask.status,
                    completionPercent: subTask.completionPercent,
                    assignedTo: subTask.assignedTo,
                    startDate: subTask.startDate,
                    endDate: subTask.endDate,
                    taskId: subTask.taskId,
                    phaseId: subTask.phaseId,
                    projectId: subTask.projectId,
                    companyId: subTask.companyId,
                    createdBy: subTask.createdBy,
                    createdAt: subTask.createdAt,
                },
                "SubTask Created",
                `SubTask "${subTask.title}" has been successfully added to the task`
            )
        );
    } catch (error) {
        logger.error("addSubTask failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to create subtask. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// All SubTasks List ----------------------------------------------------------- @Sundar
export const allSubTasks = async (req, res) => {
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
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyObjectId = company._id;
        const { taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID")
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            isDeleted: false,
        }).select("projectId").lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found")
            );
        }
        const project = await Project.findOne({
            _id: task.projectId,
            companyId: companyObjectId,
            isDeleted: false,
        }).select("assignedUsers").lean();
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const filter = {
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            isDeleted: false,
        };
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        const sortField = ["title", "status", "startDate", "endDate", "completionPercent", "createdAt"]
            .includes(sortBy)
            ? sortBy
            : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const [subTasks, total] = await Promise.all([
            SubTask.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            SubTask.countDocuments(filter),
        ]);
        const allUserIds = [
            ...new Set(
                subTasks.flatMap((st) => {
                    const ids = (st.assignedTo || []).map((id) => id.toString());
                    if (st.createdBy) ids.push(st.createdBy.toString());
                    return ids;
                })
            ),
        ];
        const userInfoMap = {};
        if (allUserIds.length > 0) {
            const mongoUsers = await User.find({ _id: { $in: allUserIds }, isDeleted: false })
                .select("_id keycloakId roleId")
                .lean();
            for (const u of mongoUsers) {
                let kcUser = null;
                try {
                    kcUser = await keycloakService.getUserById(u.keycloakId);
                } catch (err) {
                    logger.warn("Keycloak fetch failed", { keycloakId: u.keycloakId, error: err.message });
                }
                const projectEntry = project?.assignedUsers?.find(
                    (pu) => pu.userId.toString() === u._id.toString()
                );
                let designationName = null;
                const designationRoleId =
                    projectEntry?.designation ?? u.roleId ?? null;
                if (designationRoleId) {
                    let role = null;
                    if (mongoose.Types.ObjectId.isValid(designationRoleId)) {
                        role = await Role.findOne(
                            { _id: designationRoleId, isDeleted: false },
                            { roleName: 1 }
                        ).lean();
                    } else {
                        role = await Role.findOne(
                            { roleName: designationRoleId, isDeleted: false },
                            { roleName: 1 }
                        ).lean();
                    }
                    if (role) designationName = role.roleName;
                }
                userInfoMap[u._id.toString()] = {
                    userId: u.keycloakId,
                    name:
                        kcUser?.attributes?.name?.[0] ||
                        `${kcUser?.firstName || ""} ${kcUser?.lastName || ""}`.trim() ||
                        null,
                    email: kcUser?.email || null,
                    avatar: kcUser?.attributes?.avatar?.[0] || null,
                    designation: designationName,
                };
            }
        }
        const formattedSubTasks = subTasks.map((st) => ({
            ...st,
            assignedTo: (st.assignedTo || []).map(
                (id) =>
                    userInfoMap[id.toString()] || {
                        userId: id,
                        name: null,
                        email: null,
                        avatar: null,
                        designation: null,
                    }
            ),
            createdBy: st.createdBy
                ? userInfoMap[st.createdBy.toString()] || {
                    userId: st.createdBy,
                    name: null,
                    email: null,
                    avatar: null,
                    designation: null,
                }
                : null,
        }));
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTasks: formattedSubTasks,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "SubTasks Retrieved",
                `Successfully fetched ${formattedSubTasks.length} subtasks`
            )
        );
    } catch (error) {
        logger.error("allSubTasks failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch subtasks", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};

// Get Particular SubTask ------------------------------------------------------ @Sundar
export const getSubTask = async (req, res) => {
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
        const { taskId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid SubTask ID", "The provided subTaskId is not a valid MongoDB ObjectId")
            );
        }
        const subTask = await SubTask.findOne({
            _id: new mongoose.Types.ObjectId(subTaskId),
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .populate("assignedTo", "_id name email")
            .populate("createdBy", "_id name email")
            .populate("updatedBy", "_id name email")
            .lean();
        if (!subTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId} under task: ${taskId}`)
            );
        }
        logger.info("SubTask fetched successfully", { subTaskId, taskId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { subTask },
                "SubTask Retrieved",
                `SubTask "${subTask.title}" retrieved successfully`
            )
        );
    } catch (error) {
        logger.error("getSubTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to retrieve subtask. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Edit SubTask ---------------------------------------------------------------- @Sundar
export const editSubTask = async (req, res) => {
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
        const { taskId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid SubTask ID", "The provided subTaskId is not a valid MongoDB ObjectId")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body")
            );
        }
        const editorUser = await User.findOne({
            keycloakId: updatedBy.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!editorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const existingSubTask = await SubTask.findOne({
            _id: new mongoose.Types.ObjectId(subTaskId),
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!existingSubTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId} under task: ${taskId}`)
            );
        }
        const EDITABLE = ["title", "description", "status", "startDate", "endDate"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", `Send at least one field to update: ${EDITABLE.join(", ")}`)
            );
        }
        const updates = { updatedBy: editorUser._id };
        if (req.body.title !== undefined) {
            const trimmed = req.body.title?.trim();
            if (!trimmed) {
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "title cannot be empty")
                );
            }
            if (trimmed.length > 300) {
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "title cannot exceed 300 characters")
                );
            }
            updates.title = trimmed;
        }
        if (req.body.description !== undefined) {
            updates.description = req.body.description?.trim() || null;
        }
        if (req.body.status !== undefined) {
            const allowedStatuses = ["NotStarted", "InProgress", "Completed", "Blocked"];
            if (!allowedStatuses.includes(req.body.status)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Status", `status must be one of: ${allowedStatuses.join(", ")}`)
                );
            }
            updates.status = req.body.status;
        }
        const newStart = req.body.startDate !== undefined
            ? (req.body.startDate ? new Date(req.body.startDate) : null)
            : existingSubTask.startDate;
        const newEnd = req.body.endDate !== undefined
            ? (req.body.endDate ? new Date(req.body.endDate) : null)
            : existingSubTask.endDate;
        if (req.body.startDate !== undefined) {
            if (req.body.startDate && isNaN(newStart?.getTime())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Date", "startDate must be a valid ISO date string")
                );
            }
            updates.startDate = newStart;
        }
        if (req.body.endDate !== undefined) {
            if (req.body.endDate && isNaN(newEnd?.getTime())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Date", "endDate must be a valid ISO date string")
                );
            }
            updates.endDate = newEnd;
        }
        if (newStart && newEnd && newEnd <= newStart) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Date Range", "endDate must be strictly after startDate")
            );
        }
        if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
            const task = await Task.findOne({
                _id: new mongoose.Types.ObjectId(taskId),
                companyId: companyObjectId,
                isDeleted: false,
            }).lean();
            if (!task) {
                return res.status(404).json(
                    new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId}`)
                );
            }
            if (newStart && task.startDate && newStart < task.startDate) {
                return res.status(400).json(
                    new ApiErrors(400, "SubTask Dates Out of Task Bounds",
                        `SubTask startDate cannot be before task startDate: ${task.startDate.toISOString().split("T")[0]}`)
                );
            }
            if (newEnd && task.endDate && newEnd > task.endDate) {
                return res.status(400).json(
                    new ApiErrors(400, "SubTask Dates Out of Task Bounds",
                        `SubTask endDate cannot be after task endDate: ${task.endDate.toISOString().split("T")[0]}`)
                );
            }
        }
        const updatedSubTask = await SubTask.findByIdAndUpdate(
            subTaskId,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!updatedSubTask) {
            return res.status(500).json(
                new ApiErrors(500, "Update Failed", "SubTask update failed unexpectedly")
            );
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: updatedSubTask.projectId,
            actorId: editorUser._id,
            module: "SubTask",
            action: "SubTaskUpdated",
            refId: updatedSubTask._id,
            refNumber: updatedSubTask.title,
            details: {
                subTaskTitle: updatedSubTask.title,
                updatedFields: Object.keys(updates).filter((k) => k !== "updatedBy"),
                status: updatedSubTask.status,
                startDate: updatedSubTask.startDate,
                endDate: updatedSubTask.endDate,
            },
            eventAt: new Date(),
        });
        logger.info("SubTask updated successfully", {
            subTaskId: updatedSubTask._id,
            taskId,
            updatedFields: Object.keys(updates),
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTaskId: updatedSubTask._id,
                    title: updatedSubTask.title,
                    description: updatedSubTask.description,
                    status: updatedSubTask.status,
                    startDate: updatedSubTask.startDate,
                    endDate: updatedSubTask.endDate,
                    taskId: updatedSubTask.taskId,
                    phaseId: updatedSubTask.phaseId,
                    projectId: updatedSubTask.projectId,
                    companyId: updatedSubTask.companyId,
                    updatedBy: editorUser._id,
                    updatedAt: updatedSubTask.updatedAt,
                },
                "SubTask Updated",
                `SubTask "${updatedSubTask.title}" has been updated successfully`
            )
        );
    } catch (error) {
        logger.error("editSubTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to update subtask. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Delete SubTask (Soft Delete) ------------------------------------------------ @Sundar
export const deleteSubTask = async (req, res) => {
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
        const { taskId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid SubTask ID", "The provided subTaskId is not a valid MongoDB ObjectId")
            );
        }
        const subTask = await SubTask.findOne({
            _id: new mongoose.Types.ObjectId(subTaskId),
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!subTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId} under task: ${taskId}`)
            );
        }
        const deletedBy = req.user?._id ?? null;
        await SubTask.findByIdAndUpdate(subTaskId, {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                ...(deletedBy ? { updatedBy: new mongoose.Types.ObjectId(deletedBy) } : {}),
            },
        });
        try {
            await propagateFromSubTask(
                subTask.taskId.toString(),
                subTask.phaseId.toString(),
                subTask.projectId.toString()
            );
        } catch (propagationError) {
            logger.error("deleteSubTask: progress propagation failed", {
                subTaskId,
                taskId,
                error: propagationError.message,
            });
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: subTask.projectId,
            actorId: deletedBy,
            module: "SubTask",
            action: "SubTaskDeleted",
            refId: subTask._id,
            refNumber: subTask.title,
            details: {
                subTaskTitle: subTask.title,
                status: subTask.status,
                completionPercent: subTask.completionPercent,
            },
            eventAt: new Date(),
        });
        logger.info("SubTask soft-deleted successfully", {
            subTaskId: subTask._id,
            title: subTask.title,
            taskId,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTaskId: subTask._id,
                    title: subTask.title,
                    deletedAt: new Date().toISOString(),
                },
                "SubTask Deleted",
                `SubTask "${subTask.title}" has been deleted successfully`
            )
        );
    } catch (error) {
        logger.error("deleteSubTask failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to delete subtask. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Add or Remove any assigned user in a sub task. takes the keyacloak id and action = "add" or "remove" ---------------- Ayan
export const updateSubTaskMember = async (req, res) => {
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
        const { taskId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "taskId must be a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid SubTask ID", "subTaskId must be a valid MongoDB ObjectId")
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
        const subTask = await SubTask.findOne({
            _id: new mongoose.Types.ObjectId(subTaskId),
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!subTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId} under task: ${taskId}`)
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
        const alreadyAssigned = subTask.assignedTo.some(
            (id) => id.toString() === targetUser._id.toString()
        );
        if (action === "add") {
            if (alreadyAssigned) {
                return res.status(409).json(
                    new ApiErrors(409, "Already Assigned", "This user is already assigned to this subtask")
                );
            }
            await SubTask.findByIdAndUpdate(subTaskId, {
                $push: { assignedTo: targetUser._id },
            });
            // Notify user
            NotificationService.notifySubtaskAssigned({
                companyId: companyObjectId,
                projectId: subTask.projectId,
                subtaskId: subTask._id,
                subtaskTitle: subTask.title,
                recipientIds: [targetUser._id.toString()],
                triggeredBy: req.user?._id || null,
            }).catch(err => logger.error("notifySubtaskAssigned (updateSubTaskMember) failed (non-fatal)", { error: err.message }));
            logger.info("updateSubTaskMember: user added", { subTaskId, taskId, userId });
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        subTaskId, action: "add",
                        member: {
                            userId: userId.trim(),
                            mongoId: targetUser._id,
                            name: targetUser.name,
                            email: targetUser.email,
                        },
                    },
                    "Member Added", `User "${targetUser.name}" has been successfully added to the subtask`
                )
            );
        }
        if (!alreadyAssigned) {
            return res.status(404).json(
                new ApiErrors(404, "Not Assigned", "This user is not assigned to this subtask")
            );
        }
        await SubTask.findByIdAndUpdate(subTaskId, {
            $pull: { assignedTo: targetUser._id },
        });
        logger.info("updateSubTaskMember: user removed", { subTaskId, taskId, userId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTaskId, action: "remove",
                    member: {
                        userId: userId.trim(),
                        mongoId: targetUser._id,
                        name: targetUser.name,
                        email: targetUser.email,
                    },
                },
                "Member Removed", `User "${targetUser.name}" has been successfully removed from the subtask`
            )
        );
    } catch (error) {
        logger.error("updateSubTaskMember failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update subtask member. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

//  Update SubTask Completion Percent . when completionPercent is 100 status changed to "Completed". ------------------ Ayan
export const updateSubTaskProgress = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
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
        const { taskId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "taskId must be a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid SubTask ID", "subTaskId must be a valid MongoDB ObjectId")
            );
        }
        const { completionPercent } = req.body;
        if (completionPercent === undefined || completionPercent === null || completionPercent === "") {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "completionPercent is required")
            );
        }
        const percent = Number(completionPercent);
        if (isNaN(percent)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Value", "completionPercent must be a valid number")
            );
        }
        if (percent < 0 || percent > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Out of Range", "completionPercent must be between 0 and 100")
            );
        }
        const subTask = await SubTask.findOne({
            _id: new mongoose.Types.ObjectId(subTaskId),
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!subTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId} under task: ${taskId}`)
            );
        }
        let newStatus = subTask.status;
        if (percent === 100) {
            newStatus = "Completed";
        } else if (percent > 0 && subTask.status === "NotStarted") {
            newStatus = "InProgress";
        } else if (subTask.status === "Completed" && percent < 100) {
            newStatus = "InProgress";
        }
        const updatedSubTask = await SubTask.findByIdAndUpdate(
            subTaskId,
            {
                $set: {
                    completionPercent: percent,
                    status: newStatus,
                    ...(req.user?._id
                        ? { updatedBy: new mongoose.Types.ObjectId(req.user._id) }
                        : {}),
                },
            },
            { new: true }
        ).lean();
        const task = await Task.findById(updatedSubTask.taskId).select("taskName").lean();
        try {
            await propagateFromSubTask(
                updatedSubTask.taskId.toString(),
                updatedSubTask.phaseId.toString(),
                updatedSubTask.projectId.toString()
            );

            const updatedTask = await Task.findById(updatedSubTask.taskId).lean();
            if (updatedTask) {
                updatedTask.updatedBy = updatedSubTask.updatedBy || updatedTask.updatedBy;
            }
        } catch (propagationError) {
            logger.error("updateSubTaskProgress: progress propagation or task dpr fail", {
                subTaskId,
                error: propagationError.message,
            });
        }
        await pushDprEvent({
            companyId: companyObjectId,
            projectId: updatedSubTask.projectId,
            actorId: req.user?._id || null,
            module: "SubTask",
            action: "ProgressUpdated",
            refId: updatedSubTask._id,
            refNumber: updatedSubTask.title,
            details: {
                subTaskTitle: updatedSubTask.title,
                taskName: task?.taskName || null,
                previousPercent: subTask.completionPercent,
                completionPercent: updatedSubTask.completionPercent,
                status: updatedSubTask.status,
            },
            eventAt: new Date(),
        });
        try {
            const propagationResult = await propagateFromSubTask(
                updatedSubTask.taskId.toString(),
                updatedSubTask.phaseId.toString(),
                updatedSubTask.projectId.toString()
            );
            if (propagationResult?.wo && propagationResult.wo._prevStatus !== propagationResult.wo.status) {
                const woAction =
                    propagationResult.wo.status === "Completed" ? "WOCompleted" : propagationResult.wo.status === "InProgress" ? "WOInProgress" : null;
                if (woAction) {
                    const wo = await WorkOrder.findById(propagationResult.wo._id)
                        .select("woNumber title vendorName totalContractValue completionPercent")
                        .lean();
                    if (wo) {
                        await pushDprEvent({
                            companyId: companyObjectId,
                            projectId: updatedSubTask.projectId,
                            actorId: req.user?._id || null,
                            module: "WorkOrder",
                            action: woAction,
                            refId: wo._id,
                            refNumber: wo.woNumber,
                            details: {
                                woNumber: wo.woNumber,
                                title: wo.title,
                                vendorName: wo.vendorName,
                                totalContractValue: wo.totalContractValue,
                                completionPercent: propagationResult.wo.completionPercent,
                                status: propagationResult.wo.status,
                                triggeredBySubTask: updatedSubTask._id,
                                triggeredBySubTaskTitle: updatedSubTask.title,
                            },
                            eventAt: new Date(),
                        });
                    }
                }
            }
        } catch (woDprError) {
            logger.error("updateSubTaskProgress: WO DPR push failed", {
                subTaskId,
                error: woDprError.message,
            });
        }
        logger.info("updateSubTaskProgress: updated", {
            subTaskId,
            taskId,
            completionPercent: percent,
            status: newStatus,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTaskId: updatedSubTask._id,
                    title: updatedSubTask.title,
                    completionPercent: updatedSubTask.completionPercent,
                    status: updatedSubTask.status,
                    updatedAt: updatedSubTask.updatedAt,
                },
                "Progress Updated", `SubTask progress updated to ${percent}%`
            )
        );
    } catch (error) {
        logger.error("updateSubTaskProgress failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update subtask progress. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// This function returns all documents linked to a specific subtask. Takes taskId and subTaskId from params. Supports pagination and search by document name or date. -------------------------- Ayan
export const getSubTaskDocuments = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { taskId, subTaskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid SubTask ID", "The provided subTaskId is not a valid MongoDB ObjectId")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const subTask = await SubTask.findOne({
            _id: new mongoose.Types.ObjectId(subTaskId),
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!subTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId} under task: ${taskId}`)
            );
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
            return res.status(400).json(new ApiErrors(400, "Invalid Page", "page must be a positive number"));
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json(new ApiErrors(400, "Invalid Limit", "limit must be between 1 and 100"));
        }
        const filter = {
            companyId: company._id,
            "linkedTo.refModel": "SubTask",
            "linkedTo.refId": new mongoose.Types.ObjectId(subTaskId),
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
        logger.info("SubTask documents fetched successfully", {
            subTaskId,
            taskId,
            total,
            page: pageNum,
        });
        return res.status(200).json(
            new ApiResponse(200,
                {
                    documents,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                    },
                },
                "SubTask Documents Retrieved",
                total > 0 ? `Successfully fetched ${documents.length} documents linked to this subtask` : "No documents linked to this subtask"
            )
        );
    } catch (error) {
        logger.error("getSubTaskDocuments failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch subtask documents. Please try again later.", [error.message])
        );
    }
};

// This Function Returens all unique user KeycloakId, Name, Designation (Email) for all subtasks
export const getAllUniqueAssignedUsers = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { taskId } = req.params;
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
        const uniqueUserIds = await SubTask.distinct("assignedTo", {
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: company._id,
            isDeleted: false,
        });
        if (!uniqueUserIds || uniqueUserIds.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, { users: [] }, "Users Retrieved", "No users assigned to any subtask in this task")
            );
        }
        const mongoUsers = await User.find({
            _id: { $in: uniqueUserIds },
            isDeleted: false
        }).select("_id keycloakId").lean();
        const usersData = [];
        await Promise.all(
            mongoUsers.map(async (u) => {
                let kcUser = null;
                try {
                    kcUser = await keycloakService.getUserById(u.keycloakId);
                } catch { }
                usersData.push({
                    keycloakId: u.keycloakId,
                    name: kcUser?.attributes?.name?.[0] || kcUser?.firstName || null,
                    email: kcUser?.email || null,
                    avatar: kcUser?.attributes?.avatar?.[0] || null,
                });
            })
        );
        return res.status(200).json(
            new ApiResponse(
                200,
                { users: usersData },
                "Users Retrieved",
                `Successfully fetched ${usersData.length} unique assigned users from subtasks in this task.`
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

// Get SubTasks by Assigned User (keycloakId) --------------------------------- @Souvik
export const getSubTasksByUser = async (req, res) => {
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

        const { taskId, keycloakId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Task ID", "The provided taskId is not a valid MongoDB ObjectId")
            );
        }
        if (!keycloakId || !keycloakId.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Parameter", "keycloakId is required")
            );
        }

        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            isDeleted: false,
        }).select("projectId").lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId}`)
            );
        }

        const project = await Project.findOne({
            _id: task.projectId,
            companyId: companyObjectId,
            isDeleted: false,
        }).select("assignedUsers").lean();
        if (!project) {
            return res.status(403).json(
                new ApiErrors(403, "Access Denied", "This task does not belong to your company")
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
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);

        const filter = {
            taskId: new mongoose.Types.ObjectId(taskId),
            companyId: companyObjectId,
            assignedTo: targetUser._id,
            isDeleted: false,
        };

        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const sortField = ["title", "status", "startDate", "endDate", "completionPercent", "createdAt"]
            .includes(sortBy)
            ? sortBy
            : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const [subTasks, total] = await Promise.all([
            SubTask.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            SubTask.countDocuments(filter),
        ]);

        const allUserIds = [
            ...new Set(
                subTasks.flatMap((st) => {
                    const ids = (st.assignedTo || []).map((id) => id.toString());
                    if (st.createdBy) ids.push(st.createdBy.toString());
                    return ids;
                })
            ),
        ];

        const userInfoMap = {};
        if (allUserIds.length > 0) {
            const mongoUsers = await User.find({
                _id: { $in: allUserIds },
                isDeleted: false,
            })
                .select("_id keycloakId roleId")
                .lean();

            for (const u of mongoUsers) {
                let kcUser = null;
                try {
                    kcUser = await keycloakService.getUserById(u.keycloakId);
                } catch (err) {
                    logger.warn("Keycloak fetch failed", {
                        keycloakId: u.keycloakId,
                        error: err.message,
                    });
                }

                const projectEntry = project?.assignedUsers?.find(
                    (pu) => pu.userId.toString() === u._id.toString()
                );
                let designationName = null;
                const designationRoleId = projectEntry?.designation ?? u.roleId ?? null;
                if (designationRoleId) {
                    let role = null;
                    if (mongoose.Types.ObjectId.isValid(designationRoleId)) {
                        role = await Role.findOne(
                            { _id: designationRoleId, isDeleted: false },
                            { roleName: 1 }
                        ).lean();
                    } else {
                        role = await Role.findOne(
                            { roleName: designationRoleId, isDeleted: false },
                            { roleName: 1 }
                        ).lean();
                    }
                    if (role) designationName = role.roleName;
                }

                userInfoMap[u._id.toString()] = {
                    userId: u.keycloakId,
                    name:
                        kcUser?.attributes?.name?.[0] ||
                        `${kcUser?.firstName || ""} ${kcUser?.lastName || ""}`.trim() ||
                        null,
                    email: kcUser?.email || null,
                    avatar: kcUser?.attributes?.avatar?.[0] || null,
                    designation: designationName,
                };
            }
        }

        const formattedSubTasks = subTasks.map((st) => ({
            ...st,
            assignedTo: (st.assignedTo || []).map(
                (id) =>
                    userInfoMap[id.toString()] || {
                        userId: id,
                        name: null,
                        email: null,
                        avatar: null,
                        designation: null,
                    }
            ),
            createdBy: st.createdBy
                ? userInfoMap[st.createdBy.toString()] || {
                    userId: st.createdBy,
                    name: null,
                    email: null,
                    avatar: null,
                    designation: null,
                }
                : null,
        }));

        logger.info("getSubTasksByUser: fetched successfully", {
            taskId,
            keycloakId,
            total,
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTasks: formattedSubTasks,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "SubTasks Retrieved",
                `Successfully fetched ${formattedSubTasks.length} subtasks assigned to this user`
            )
        );
    } catch (error) {
        logger.error("getSubTasksByUser failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to fetch subtasks. Please try again later.",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};



// This function returns lightweight subtask list data for a company. takes x-company-id in headers and supports pagination, search (title, description), filtering (status, taskId) and sorting with minimal subtask details for optimized listing performance. -------------------------- Ayan
export const lightweightSubTaskList = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            taskId,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
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
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(
                    404,
                    "Company Not Found",
                    "No active company found with the provided x-company-id"
                )
            );
        }
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = {
            companyId: company._id,
            isDeleted: false,
        };
        if (taskId) {
            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Task ID",
                        "taskId must be a valid MongoDB ObjectId"
                    )
                );
            }
            filter.taskId = new mongoose.Types.ObjectId(taskId);
        }
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                {
                    title: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }
        const allowedSortFields = [
            "title",
            "status",
            "completionPercent",
            "startDate",
            "endDate",
            "createdAt",
            "updatedAt",
        ];
        const finalSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";
        const [subTasks, total] = await Promise.all([
            SubTask.find(filter)
                .select(
                    "_id title description status completionPercent startDate endDate phaseId projectId "
                )
                .sort({ [finalSortBy]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),

            SubTask.countDocuments(filter),
        ]);
        const formattedSubTasks = subTasks.map((subTask) => ({
            subTaskId: subTask._id,
            title: subTask.title,
            description: subTask.description,
            status: subTask.status,
            completionPercent: subTask.completionPercent,
            startDate: subTask.startDate,
            endDate: subTask.endDate,
            taskId: subTask.taskId,
            phaseId: subTask.phaseId,
            projectId: subTask.projectId,
            createdAt: subTask.createdAt,
            updatedAt: subTask.updatedAt,
        }));
        logger.info("Lightweight subtask list fetched", {
            total,
            page: pageNumber,
            companyId: companyUUID,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTasks: formattedSubTasks,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "SubTasks Retrieved",
                `Successfully fetched ${formattedSubTasks.length} lightweight subtask(s)`
            )
        );
    } catch (error) {
        logger.error("lightweightSubTaskList failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while fetching lightweight subtasks",
                [], process.env.NODE_ENV === "development"
                ? error.stack
                : ""
            )
        );
    }
};