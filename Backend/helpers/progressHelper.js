import mongoose from "mongoose";
import SubTask from "../models/subTask.models.js";
import Task from "../models/task.models.js";
import Phase from "../models/phase.models.js";
import Project from "../models/project.models.js";
import WorkOrder from "../models/workOrder.models.js";
import logger from "../utils/logger.utils.js";
import {
    triggerMilestoneExpense,
    regressMilestoneExpense,
    convertWOCommitmentToActual,
    revertWOActualToCommitted,
    recalcProjectHealth,
} from "./expenseHelper.js";


const calcAverage = (percentages) => {
    if (!percentages || percentages.length === 0) return 0;
    const sum = percentages.reduce((acc, val) => acc + (val ?? 0), 0);
    return Math.round((sum / percentages.length) * 100) / 100;
};

const deriveStatus = (pct, currentStatus) => {
    if (currentStatus === "Blocked" || currentStatus === "OnHold") {
        if (pct === 100) return "Completed";
        return currentStatus;
    }
    if (pct === 0) return "NotStarted";
    if (pct === 100) return "Completed";
    return "InProgress";
};

const deriveProjectStatus = (pct, currentStatus) => {
    if (currentStatus === "cancelled" || currentStatus === "on_hold") {
        if (pct === 100) return "completed";
        return currentStatus;
    }
    if (pct === 100) return "completed";
    if (pct > 0 && currentStatus === "planned") return "active";
    return currentStatus;
};


const recalcTask = async (taskId, session) => {
    const subTasks = await SubTask.find(
        { taskId: new mongoose.Types.ObjectId(taskId), isDeleted: false },
        { completionPercent: 1 },
        { session }
    ).lean();
    const pct = calcAverage(subTasks.map((s) => s.completionPercent));
    const task = await Task.findById(
        taskId,
        { taskName: 1, status: 1, phaseId: 1, projectId: 1, workOrderId: 1 },
        { session }
    ).lean();
    if (!task) throw new Error(`Task not found during recalculation: ${taskId}`);
    const newStatus = deriveStatus(pct, task.status);
    await Task.findByIdAndUpdate(
        taskId,
        { $set: { completionPercent: pct, status: newStatus } },
        { session, new: true }
    );
    logger.debug("[progressHelper] Task recalculated", {
        taskId, completionPercent: pct, status: newStatus, subTaskCount: subTasks.length,
    });
    return {
        _id: task._id,
        taskName: task.taskName,
        completionPercent: pct,
        status: newStatus,
        phaseId: task.phaseId,
        projectId: task.projectId,
        workOrderId: task.workOrderId ?? null,
    };
};


const recalcPhase = async (phaseId, session) => {
    const tasks = await Task.find(
        { phaseId: new mongoose.Types.ObjectId(phaseId), isDeleted: false },
        { completionPercent: 1 },
        { session }
    ).lean();
    const pct = calcAverage(tasks.map((t) => t.completionPercent));
    const phase = await Phase.findById(phaseId, { phaseName: 1, projectId: 1 }, { session }).lean();
    if (!phase) throw new Error(`Phase not found during recalculation: ${phaseId}`);
    await Phase.findByIdAndUpdate(
        phaseId,
        { $set: { completionPercent: pct } },
        { session, new: true }
    );
    logger.debug("[progressHelper] Phase recalculated", {
        phaseId, completionPercent: pct, taskCount: tasks.length,
    });
    return {
        _id: phase._id,
        phaseName: phase.phaseName,
        completionPercent: pct,
        projectId: phase.projectId,
    };
};


const recalcProject = async (projectId, session) => {
    const phases = await Phase.find(
        { projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false },
        { completionPercent: 1 },
        { session }
    ).lean();
    const pct = calcAverage(phases.map((p) => p.completionPercent));
    const project = await Project.findById(projectId, { projectName: 1, status: 1 }, { session }).lean();
    if (!project) throw new Error(`Project not found during recalculation: ${projectId}`);
    const newStatus = deriveProjectStatus(pct, project.status);
    await Project.findByIdAndUpdate(
        projectId,
        { $set: { completionPercent: pct, status: newStatus } },
        { session, new: true }
    );
    logger.debug("[progressHelper] Project recalculated", {
        projectId, completionPercent: pct, status: newStatus, phaseCount: phases.length,
    });
    return {
        _id: project._id,
        projectName: project.projectName,
        completionPercent: pct,
        status: newStatus,
    };
};


const recalcWO = async (workOrderId, session, triggeredByUserId = null) => {
    if (!workOrderId) return null;
    const wo = await WorkOrder.findOne(
        { _id: workOrderId, isDeleted: false },
        null,
        { session }
    );
    if (!wo) {
        logger.warn("[progressHelper] WO not found for recalc — skipping", { workOrderId });
        return null;
    }
    const recalcableStatuses = ["Approved", "InProgress", "Completed"];
    if (!recalcableStatuses.includes(wo.status)) {
        logger.debug("[progressHelper] WO recalc skipped — status not recalcable", {
            workOrderId, status: wo.status,
        });
        return null;
    }
    const linkedTasks = await Task.find(
        { workOrderId: new mongoose.Types.ObjectId(workOrderId), isDeleted: false },
        { completionPercent: 1 },
        { session }
    ).lean();
    let newPercent = 0;
    if (linkedTasks.length > 0) {
        newPercent = calcAverage(linkedTasks.map((t) => t.completionPercent));
    }
    const updates = { completionPercent: newPercent };
    const prevStatus = wo.status;
    const newlyTriggeredMilestones = [];
    const newlyRegressedMilestones = [];
    if (wo.hasMilestones && Array.isArray(wo.milestones) && wo.milestones.length > 0) {
        const updatedMilestones = wo.milestones.map((ms) => {
            const msObj = ms.toObject ? ms.toObject() : ms;
            if (msObj.status === "Pending" && newPercent >= msObj.triggerPercent) {
                newlyTriggeredMilestones.push(msObj);
                logger.info("[progressHelper] WO milestone triggered", {
                    workOrderId, milestoneTitle: msObj.title,
                    triggerPercent: msObj.triggerPercent, currentPercent: newPercent,
                });
                return { ...msObj, status: "Triggered", triggeredAt: new Date() };
            }
            if (
                (msObj.status === "Triggered" || msObj.status === "Paid") &&
                newPercent < msObj.triggerPercent
            ) {
                newlyRegressedMilestones.push(msObj);
                logger.info("[progressHelper] WO milestone regressed", {
                    workOrderId, milestoneTitle: msObj.title,
                    triggerPercent: msObj.triggerPercent, currentPercent: newPercent,
                    previousStatus: msObj.status,
                });
                return { ...msObj, status: "Pending", triggeredAt: null };
            }

            return msObj;
        });
        updates.milestones = updatedMilestones;
    }
    if (wo.status === "Completed" && newPercent < 100) {
        updates.status = newPercent > 0 ? "InProgress" : "Approved";
        updates.completedAt = null;
        updates.actualEndDate = null;
        logger.info("[progressHelper] WO regressed from Completed", {
            workOrderId, newPercent, newStatus: updates.status,
        });
    }
    if (newPercent > 0 && wo.status === "Approved") {
        updates.status = "InProgress";
        updates.inProgressAt = new Date();
        logger.info("[progressHelper] WO auto-moved to InProgress", { workOrderId, newPercent });
    }
    if (
        newPercent === 100 &&
        (wo.status === "InProgress" || updates.status === "InProgress")
    ) {
        updates.status = "Completed";
        updates.completedAt = new Date();
        updates.actualEndDate = new Date();
        logger.info("[progressHelper] WO auto-completed via task progress", { workOrderId });
    }
    if (newPercent === 0 && wo.status === "InProgress") {
        updates.status = "Approved";
        logger.info("[progressHelper] WO reset to Approved (0% after recalc)", { workOrderId });
    }
    await WorkOrder.findByIdAndUpdate(
        workOrderId,
        { $set: updates },
        { session, new: true }
    );
    logger.debug("[progressHelper] WO recalculated", {
        workOrderId,
        completionPercent: newPercent,
        prevStatus,
        newStatus: updates.status ?? wo.status,
        linkedTaskCount: linkedTasks.length,
        triggered: newlyTriggeredMilestones.length,
        regressed: newlyRegressedMilestones.length,
    });
    return {
        _id: wo._id,
        completionPercent: newPercent,
        status: updates.status ?? wo.status,
        _prevStatus: prevStatus,
        _newlyTriggeredMilestones: newlyTriggeredMilestones,
        _newlyRegressedMilestones: newlyRegressedMilestones,
        _hasMilestones: wo.hasMilestones,
        _woNumber: wo.woNumber,
        _projectId: wo.projectId,
        _companyId: wo.companyId,
        _vendorId: wo.vendorId,
        _vendorName: wo.vendorName,
        _phaseId: wo.phaseId,
    };
};



const handleWOExpenseChanges = async (woResult, triggeredByUserId) => {
    if (!woResult) return;
    const {
        _id: woId,
        _hasMilestones,
        _newlyTriggeredMilestones,
        _newlyRegressedMilestones,
        _prevStatus,
        status,
        completionPercent,
        _woNumber,
        _projectId,
        _companyId,
        _vendorId,
        _vendorName,
        _phaseId,
    } = woResult;
    if (_hasMilestones && _newlyTriggeredMilestones?.length > 0) {
        for (const ms of _newlyTriggeredMilestones) {
            try {
                await triggerMilestoneExpense({
                    sourceId: woId,
                    woNumber: _woNumber,
                    projectId: _projectId,
                    companyId: _companyId,
                    milestoneAmount: ms.paymentAmount,
                    milestoneTitle: ms.title,
                    vendorId: _vendorId,
                    vendorName: _vendorName,
                    phaseId: _phaseId || null,
                    resolvedBy: triggeredByUserId,
                    resolvedReason: `Milestone "${ms.title}" triggered at ${completionPercent}% (auto)`,
                });
            } catch (err) {
                logger.error("[progressHelper] milestone forward expense failed", {
                    workOrderId: woId, milestoneTitle: ms.title, error: err.message,
                });
            }
        }
    }
    if (_hasMilestones && _newlyRegressedMilestones?.length > 0) {
        for (const ms of _newlyRegressedMilestones) {
            try {
                await regressMilestoneExpense({
                    sourceId: woId,
                    woNumber: _woNumber,
                    projectId: _projectId,
                    companyId: _companyId,
                    milestoneAmount: ms.paymentAmount,
                    milestoneTitle: ms.title,
                    vendorId: _vendorId,
                    vendorName: _vendorName,
                    phaseId: _phaseId || null,
                    revertedBy: triggeredByUserId,
                    revertReason: `Milestone "${ms.title}" regressed — WO dropped to ${completionPercent}% (below ${ms.triggerPercent}% trigger)`,
                });
            } catch (err) {
                logger.error("[progressHelper] milestone regression expense failed", {
                    workOrderId: woId, milestoneTitle: ms.title, error: err.message,
                });
            }
        }
    }
    const didComplete = status === "Completed" && _prevStatus !== "Completed";
    if (didComplete && !_hasMilestones) {
        try {
            await convertWOCommitmentToActual({
                sourceId: woId,
                resolvedBy: triggeredByUserId,
                resolvedReason: `WO ${_woNumber} auto-completed via task progress`,
            });
        } catch (err) {
            logger.error("[progressHelper] WO commitment forward conversion failed", {
                workOrderId: woId, error: err.message,
            });
        }
    }
    const didRegress = _prevStatus === "Completed" && status !== "Completed";
    if (didRegress && !_hasMilestones) {
        try {
            await revertWOActualToCommitted({
                sourceId: woId,
                revertedBy: triggeredByUserId,
                revertReason: `WO ${_woNumber} regressed from Completed — actual reverted to committed`,
            });
        } catch (err) {
            logger.error("[progressHelper] WO actual regression revert failed", {
                workOrderId: woId, error: err.message,
            });
        }
    }
    if (status !== _prevStatus) {
        recalcProjectHealth(
            woResult._projectId.toString(),
            woResult._companyId.toString()
        ).catch(() => { });
    }
};



export const propagateFromSubTask = async (taskId, phaseId, projectId, triggeredByUserId = null) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const taskResult = await recalcTask(taskId, session);
        const phaseResult = await recalcPhase(phaseId, session);
        const projectResult = await recalcProject(projectId, session);
        let woResult = null;
        if (taskResult.workOrderId) {
            woResult = await recalcWO(taskResult.workOrderId, session, triggeredByUserId);
        }
        await session.commitTransaction();
        await handleWOExpenseChanges(woResult, triggeredByUserId);
        logger.info("[progressHelper] propagateFromSubTask completed", {
            taskId, phaseId, projectId,
            task: { completionPercent: taskResult.completionPercent, status: taskResult.status },
            phase: { completionPercent: phaseResult.completionPercent },
            project: { completionPercent: projectResult.completionPercent, status: projectResult.status },
            ...(woResult ? {
                wo: {
                    completionPercent: woResult.completionPercent,
                    status: woResult.status,
                    triggered: woResult._newlyTriggeredMilestones?.length ?? 0,
                    regressed: woResult._newlyRegressedMilestones?.length ?? 0,
                }
            } : {}),
        });
        return {
            task: { _id: taskResult._id, completionPercent: taskResult.completionPercent, status: taskResult.status, taskName: taskResult.taskName },
            phase: { _id: phaseResult._id, completionPercent: phaseResult.completionPercent, phaseName: phaseResult.phaseName },
            project: { _id: projectResult._id, completionPercent: projectResult.completionPercent, status: projectResult.status, projectName: projectResult.projectName },
            ...(woResult ? { wo: { _id: woResult._id, completionPercent: woResult.completionPercent, status: woResult.status, _prevStatus: woResult._prevStatus } } : {}),
        };
    } catch (error) {
        await session.abortTransaction();
        logger.error("[progressHelper] propagateFromSubTask FAILED — transaction rolled back", {
            taskId, phaseId, projectId, error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};


export const propagateFromTask = async (phaseId, projectId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const phaseResult = await recalcPhase(phaseId, session);
        const projectResult = await recalcProject(projectId, session);
        await session.commitTransaction();
        logger.info("[progressHelper] propagateFromTask completed", {
            phaseId, projectId,
            phase: { completionPercent: phaseResult.completionPercent },
            project: { completionPercent: projectResult.completionPercent, status: projectResult.status },
        });
        return {
            phase: { _id: phaseResult._id, completionPercent: phaseResult.completionPercent },
            project: { _id: projectResult._id, completionPercent: projectResult.completionPercent, status: projectResult.status },
        };
    } catch (error) {
        await session.abortTransaction();
        logger.error("[progressHelper] propagateFromTask FAILED — transaction rolled back", {
            phaseId, projectId, error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};



export const propagateFromPhase = async (projectId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const projectResult = await recalcProject(projectId, session);
        await session.commitTransaction();
        logger.info("[progressHelper] propagateFromPhase completed", {
            projectId,
            project: { completionPercent: projectResult.completionPercent, status: projectResult.status },
        });
        return {
            project: { _id: projectResult._id, completionPercent: projectResult.completionPercent, status: projectResult.status },
        };
    } catch (error) {
        await session.abortTransaction();
        logger.error("[progressHelper] propagateFromPhase FAILED — transaction rolled back", {
            projectId, error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};


export const propagateFromWOTaskLink = async (workOrderId, triggeredByUserId = null) => {
    if (!workOrderId) return null;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const woResult = await recalcWO(workOrderId, session, triggeredByUserId);
        await session.commitTransaction();
        await handleWOExpenseChanges(woResult, triggeredByUserId);
        logger.info("[progressHelper] propagateFromWOTaskLink completed", {
            workOrderId,
            ...(woResult ? {
                wo: {
                    completionPercent: woResult.completionPercent,
                    status: woResult.status,
                    triggered: woResult._newlyTriggeredMilestones?.length ?? 0,
                    regressed: woResult._newlyRegressedMilestones?.length ?? 0,
                }
            } : { wo: null }),
        });
        return woResult;
    } catch (error) {
        await session.abortTransaction();
        logger.error("[progressHelper] propagateFromWOTaskLink FAILED", { workOrderId, error: error.message });
        throw error;
    } finally {
        session.endSession();
    }
};