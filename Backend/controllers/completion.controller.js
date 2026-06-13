import mongoose from "mongoose";
import SubTask from "../models/subTask.models.js";
import Task from "../models/task.models.js";
import Phase from "../models/phase.models.js";
import Project from "../models/project.models.js";
import WorkOrder from "../models/workOrder.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { propagateFromSubTask } from "../helpers/progressHelper.js";
import { parsePercent, resolveCompany, resolveObjectId } from "../validations/completion.validation.js";
import NotificationService from "../services/notification.service.js";
import { pushDprEvent } from "../helpers/dprHelper.js";

const deriveSubTaskStatus = (pct, currentStatus) => {
    if (currentStatus === "Blocked") {
        return pct === 100 ? "Completed" : "Blocked";
    }
    if (pct === 0) return "NotStarted";
    if (pct === 100) return "Completed";
    return "InProgress";
};


// Updates a specific subtask's completionPercent and auto-recalculates parent task, phase, and project progress. Takes x-company-id in headers, subTaskId in params, and completionPercent in body. ------------------------ Ayan
export const updateSubTaskCompletion = async (req, res) => {
    try {
        const company = await resolveCompany(req, res);
        if (!company) return;
        const subTaskId = resolveObjectId(req.params.subTaskId, "subTaskId", res);
        if (!subTaskId) return;
        const pct = parsePercent(req.body.completionPercent, res);
        if (pct === null) return;
        const subTask = await SubTask
            .findOne({
                _id: new mongoose.Types.ObjectId(subTaskId),
                companyId: company._id,
                isDeleted: false,
            })
            .select("_id title taskId phaseId projectId companyId completionPercent status createdBy updatedBy")
            .lean();
        if (!subTask) {
            return res.status(404).json(
                new ApiErrors(404, "SubTask Not Found", `No active subtask found with ID: ${subTaskId}`)
            );
        }
        if (subTask.completionPercent === pct) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { subTaskId: subTask._id, completionPercent: pct, note: "No change — already at this percentage" },
                    "No Update Needed",
                    "SubTask already has this completionPercent"
                )
            );
        }
        const newStatus = deriveSubTaskStatus(pct, subTask.status);
        await SubTask.findByIdAndUpdate(subTaskId, {
            $set: { completionPercent: pct, status: newStatus },
        });
        const hierarchy = await propagateFromSubTask(
            subTask.taskId.toString(),
            subTask.phaseId.toString(),
            subTask.projectId.toString()
        );

        // --- DPR Events ---
        try {
            const actorId = req.user?._id || subTask.updatedBy || subTask.createdBy || null;
            await pushDprEvent({
                companyId: subTask.companyId,
                projectId: subTask.projectId,
                actorId,
                module: "SubTask",
                action: "ProgressUpdated",
                refId: subTask._id,
                refNumber: subTask.title,
                details: {
                    subTaskTitle: subTask.title,
                    previousPercent: subTask.completionPercent,
                    completionPercent: pct,
                    status: newStatus,
                },
                eventAt: new Date(),
            });
            if (hierarchy.wo) {
                const prevWOStatus = hierarchy.wo._prevStatus;
                const newWOStatus = hierarchy.wo.status;
                if (prevWOStatus !== newWOStatus) {
                    const woAction =
                        newWOStatus === "Completed" ? "WOCompleted" : newWOStatus === "InProgress" ? "WOInProgress" : null;
                    if (woAction) {
                        const wo = await WorkOrder.findById(hierarchy.wo._id)
                            .select("woNumber title vendorName totalContractValue completionPercent")
                            .lean();
                        if (wo) {
                            await pushDprEvent({
                                companyId: subTask.companyId,
                                projectId: subTask.projectId,
                                actorId,
                                module: "WorkOrder",
                                action: woAction,
                                refId: wo._id,
                                refNumber: wo.woNumber,
                                details: {
                                    woNumber: wo.woNumber,
                                    title: wo.title,
                                    vendorName: wo.vendorName,
                                    totalContractValue: wo.totalContractValue,
                                    completionPercent: hierarchy.wo.completionPercent,
                                    status: newWOStatus,
                                    triggeredBySubTask: subTask._id,
                                    triggeredBySubTaskTitle: subTask.title,
                                },
                                eventAt: new Date(),
                            });
                        }
                    }
                }
            }
        } catch (dprError) {
            logger.error("updateSubTaskCompletion: DPR push failed", {
                subTaskId,
                error: dprError.message,
            });
        }

        // --- Notifications ---
        try {
            const actorId = req.user?._id || subTask.updatedBy || subTask.createdBy || null;
            const projectName = hierarchy.project?.projectName || "Project";

            // 1. Notify SubTask completion
            if (pct === 100) {
                await NotificationService.notifyCompletion({
                    type: "SubTask",
                    refId: subTask._id,
                    name: subTask.title,
                    companyId: subTask.companyId,
                    projectId: subTask.projectId,
                    projectName,
                    triggeredBy: actorId,
                });
            }

            // 2. Notify Task completion
            if (hierarchy.task?.completionPercent === 100) {
                await NotificationService.notifyCompletion({
                    type: "Task",
                    refId: subTask.taskId,
                    name: hierarchy.task.taskName || "Task",
                    companyId: subTask.companyId,
                    projectId: subTask.projectId,
                    projectName,
                    triggeredBy: actorId,
                });
            }

            // 3. Notify Phase completion
            if (hierarchy.phase?.completionPercent === 100) {
                await NotificationService.notifyCompletion({
                    type: "Phase",
                    refId: subTask.phaseId,
                    name: hierarchy.phase.phaseName || "Phase",
                    companyId: subTask.companyId,
                    projectId: subTask.projectId,
                    projectName,
                    triggeredBy: actorId,
                });
            }
        } catch (notifError) {
            logger.error("updateSubTaskCompletion: notification push failed", {
                subTaskId,
                error: notifError.message,
            });
        }
        // ---------------------

        logger.info("[completion] subtask updated → hierarchy recalculated", {
            subTaskId,
            newPct: pct,
            newStatus,
            task: hierarchy.task,
            phase: hierarchy.phase,
            project: hierarchy.project,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subTask: {
                        id: subTask._id,
                        title: subTask.title,
                        completionPercent: pct,
                        status: newStatus,
                    },
                    task: {
                        id: subTask.taskId,
                        completionPercent: hierarchy.task.completionPercent,
                        status: hierarchy.task.status,
                    },
                    phase: {
                        id: subTask.phaseId,
                        completionPercent: hierarchy.phase.completionPercent,
                    },
                    project: {
                        id: subTask.projectId,
                        completionPercent: hierarchy.project.completionPercent,
                    },
                },
                "Completion Updated",
                `SubTask set to ${pct}% — Task, Phase & Project recalculated automatically`
            )
        );
    } catch (error) {
        logger.error("updateSubTaskCompletion failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500, "Server Error", "Failed to update subtask completion",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};


// Returns a full hierarchical progress snapshot of a project including all phases, tasks, and subtasks with their completion percentages. Takes x-company-id in headers and projectId in params. ------------------- Ayan
export const getProjectCompletionSnapshot = async (req, res) => {
    try {
        const company = await resolveCompany(req, res);
        if (!company) return;
        const projectId = resolveObjectId(req.params.projectId, "projectId", res);
        if (!projectId) return;
        const project = await Project
            .findOne({
                _id: new mongoose.Types.ObjectId(projectId),
                companyId: company._id,
                isDeleted: false,
            })
            .select("_id projectName status completionPercent updatedAt")
            .lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
            );
        }
        const [phases, tasks, subTasks] = await Promise.all([
            Phase.find({ projectId: project._id, isDeleted: false })
                .select("_id phaseName sequence completionPercent")
                .sort({ sequence: 1 })
                .lean(),
            Task.find({ projectId: project._id, isDeleted: false })
                .select("_id taskName phaseId status completionPercent")
                .lean(),
            SubTask.find({ projectId: project._id, isDeleted: false })
                .select("_id title taskId status completionPercent")
                .lean(),
        ]);
        const subTasksByTask = subTasks.reduce((acc, st) => {
            const key = st.taskId.toString();
            (acc[key] = acc[key] || []).push({
                subTaskId: st._id,
                title: st.title,
                status: st.status,
                completionPercent: st.completionPercent,
            });
            return acc;
        }, {});
        const tasksByPhase = tasks.reduce((acc, t) => {
            const key = t.phaseId.toString();
            (acc[key] = acc[key] || []).push({
                taskId: t._id,
                taskName: t.taskName,
                status: t.status,
                completionPercent: t.completionPercent,
                subTasks: subTasksByTask[t._id.toString()] ?? [],
            });
            return acc;
        }, {});
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    projectId: project._id,
                    projectName: project.projectName,
                    status: project.status,
                    completionPercent: project.completionPercent,
                    summary: {
                        totalPhases: phases.length,
                        totalTasks: tasks.length,
                        completedTasks: tasks.filter((t) => t.completionPercent === 100).length,
                        totalSubTasks: subTasks.length,
                        completedSubTasks: subTasks.filter((s) => s.completionPercent === 100).length,
                    },
                    phases: phases.map((p) => ({
                        phaseId: p._id,
                        phaseName: p.phaseName,
                        sequence: p.sequence,
                        completionPercent: p.completionPercent,
                        tasks: tasksByPhase[p._id.toString()] ?? [],
                    })),
                },
                "Completion Snapshot",
                `Snapshot for project "${project.projectName}"`
            )
        );
    } catch (error) {
        logger.error("getProjectCompletionSnapshot failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(
                500, "Server Error", "Failed to fetch completion snapshot",
                [error.message],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};