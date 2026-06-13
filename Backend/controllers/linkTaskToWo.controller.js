import mongoose from "mongoose";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import WorkOrder from "../models/workOrder.models.js";
import Project from "../models/project.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { propagateFromWOTaskLink } from "../helpers/progressHelper.js";



// This function links or unlinks a task with a work order. takes x-company-id in headers, projectId, phaseId and taskId in params and action, workOrderId with updatedBy in body. validates task and WO state, updates linked subtasks and recalculates WO progress after changes. -------------------------- Ayan
export const linkTaskToWO = async (req, res) => {
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
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyObjectId = company._id;
        const { projectId, phaseId, taskId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
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
        const { action, workOrderId, updatedBy } = req.body;
        if (!["link", "unlink"].includes(action)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", 'action must be either "link" or "unlink"')
            );
        }
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        if (action === "link" && !workOrderId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "workOrderId is required when action is 'link'")
            );
        }
        if (action === "link" && !mongoose.Types.ObjectId.isValid(workOrderId.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid WO ID", "workOrderId must be a valid MongoDB ObjectId")
            );
        }
        const actionUser = await User.findOne({
            keycloakId: updatedBy.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const task = await Task.findOne({
            _id: new mongoose.Types.ObjectId(taskId),
            phaseId: new mongoose.Types.ObjectId(phaseId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!task) {
            return res.status(404).json(
                new ApiErrors(404, "Task Not Found", `No active task found with ID: ${taskId}`)
            );
        }
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found")
            );
        }
        if (action === "link") {
            if (task.workOrderId?.toString() === workOrderId.trim()) {
                return res.status(409).json(
                    new ApiErrors(409, "Already Linked", "This task is already linked to the specified Work Order")
                );
            }
            if (task.workOrderId) {
                return res.status(400).json(
                    new ApiErrors(400, "Task Already Linked", `This task is already linked to Work Order ${task.workOrderId}. Unlink it first before linking to another`)
                );
            }
            const wo = await WorkOrder.findOne({
                _id: new mongoose.Types.ObjectId(workOrderId.trim()),
                companyId: companyObjectId,
                projectId: new mongoose.Types.ObjectId(projectId),
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
                        `Cannot link tasks to a Work Order in '${wo.status}' status. WO must be Approved or InProgress`
                    )
                );
            }
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const woObjectId = new mongoose.Types.ObjectId(workOrderId.trim());
                await Task.findByIdAndUpdate(
                    taskId,
                    { $set: { workOrderId: woObjectId, updatedBy: actionUser._id } },
                    { session }
                );
                const subTaskUpdateResult = await SubTask.updateMany(
                    { taskId: new mongoose.Types.ObjectId(taskId), isDeleted: false },
                    { $set: { workOrderId: woObjectId, updatedBy: actionUser._id } },
                    { session }
                );
                await session.commitTransaction();
                logger.info("linkTaskToWO: task linked to WO", {
                    taskId,
                    workOrderId: workOrderId.trim(),
                    subtasksUpdated: subTaskUpdateResult.modifiedCount,
                    projectId,
                    companyId: companyObjectId,
                });
            } catch (txError) {
                await session.abortTransaction();
                throw txError;
            } finally {
                session.endSession();
            }
            let woResult = null;
            try {
                woResult = await propagateFromWOTaskLink(workOrderId.trim());
            } catch (progError) {
                logger.error("linkTaskToWO: WO progress recalc failed (non-fatal)", {
                    workOrderId: workOrderId.trim(),
                    error: progError.message,
                });
            }
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        taskId,
                        workOrderId: workOrderId.trim(),
                        action: "linked",
                        ...(woResult
                            ? {
                                wo: {
                                    completionPercent: woResult.completionPercent,
                                    status: woResult.status,
                                },
                            }
                            : {}),
                    },
                    "Task Linked to Work Order",
                    `Task "${task.taskName}" and its subtasks have been linked to Work Order successfully`
                )
            );
        }

        if (action === "unlink") {
            if (!task.workOrderId) {
                return res.status(400).json(
                    new ApiErrors(400, "Not Linked", "This task is not linked to any Work Order")
                );
            }
            const previousWOId = task.workOrderId.toString();
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                await Task.findByIdAndUpdate(
                    taskId,
                    { $set: { workOrderId: null, updatedBy: actionUser._id } },
                    { session }
                );
                const subTaskUpdateResult = await SubTask.updateMany(
                    { taskId: new mongoose.Types.ObjectId(taskId), isDeleted: false },
                    { $set: { workOrderId: null, updatedBy: actionUser._id } },
                    { session }
                );
                await session.commitTransaction();
                logger.info("linkTaskToWO: task unlinked from WO", {
                    taskId,
                    previousWOId,
                    subtasksUpdated: subTaskUpdateResult.modifiedCount,
                    projectId,
                    companyId: companyObjectId,
                });
            } catch (txError) {
                await session.abortTransaction();
                throw txError;
            } finally {
                session.endSession();
            }
            let woResult = null;
            try {
                woResult = await propagateFromWOTaskLink(previousWOId);
            } catch (progError) {
                logger.error("linkTaskToWO: WO progress recalc after unlink failed (non-fatal)", {
                    previousWOId,
                    error: progError.message,
                });
            }
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        taskId,
                        previousWorkOrderId: previousWOId,
                        action: "unlinked",
                        ...(woResult
                            ? {
                                wo: {
                                    id: previousWOId,
                                    completionPercent: woResult.completionPercent,
                                    status: woResult.status,
                                },
                            }
                            : {}),
                    },
                    "Task Unlinked from Work Order",
                    `Task "${task.taskName}" and its subtasks have been unlinked from the Work Order`
                )
            );
        }
    } catch (error) {
        logger.error("linkTaskToWO failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update Work Order link", [error.message])
        );
    }
};