import Notification from "../models/notification.models.js";
import Project from "../models/project.models.js";
import User from "../models/user.models.js";
import { emitToUser, emitToUsers, emitToCompany } from "../config/socket.config.js";
import logger from "../utils/logger.utils.js";

async function getProjectMemberIds(projectId) {
    const project = await Project.findById(projectId).select("assignedUsers projectName").lean();
    if (!project) return { recipientIds: [], projectName: "" };
    return {
        recipientIds: project.assignedUsers.map((u) => u.userId.toString()),
        projectName: project.projectName,
    };
}

async function getCompanyUserIds(companyId, excludeId = null) {
    const filter = { companyId, isDeleted: false, status: "Active" };
    if (excludeId) filter._id = { $ne: excludeId };
    const users = await User.find(filter).select("_id").lean();
    return users.map((u) => u._id.toString());
}

async function emitUnreadCount(recipientId, companyId) {
    try {
        const count = await Notification.countDocuments({
            companyId,
            recipientId,
            isRead: false,
            isDeleted: false,
        });
        emitToUser(recipientId.toString(), "notification:unreadCount", { count });
    } catch (err) {
        logger.error("[NotificationService] emitUnreadCount failed", { error: err.message });
    }
}

async function emitUnreadCounts(recipientIds, companyId) {
    await Promise.allSettled(recipientIds.map((id) => emitUnreadCount(id, companyId)));
}

async function fanOutAndEmit(recipientIds, opts) {
    if (!recipientIds?.length) return;

    const docs = await Notification.fanOut(recipientIds, opts);

    const notifsByRecipient = {};
    docs.forEach((doc) => {
        const rid = doc.recipientId.toString();
        if (!notifsByRecipient[rid]) notifsByRecipient[rid] = doc;
    });

    recipientIds.forEach((rid) => {
        const notif = notifsByRecipient[rid.toString()];
        if (notif) {
            emitToUser(rid.toString(), "notification:new", notif);
        }
    });

    await emitUnreadCounts(recipientIds, opts.companyId);
}

class NotificationService {
    static async notifyTaskAssigned({ companyId, projectId, taskId, taskName, recipientIds, triggeredBy }) {
        if (!recipientIds?.length) return;
        await fanOutAndEmit(recipientIds, {
            companyId,
            projectId,
            type: "TASK_ASSIGNED",
            channel: "user",
            title: "New Task Assigned",
            message: `You have been assigned to task "${taskName}". Open your project to view details.`,
            refModel: "Task",
            refId: taskId,
            triggeredBy,
            metadata: { projectId, taskId, taskName },
        });
    }

    static async notifySubtaskAssigned({ companyId, projectId, subtaskId, subtaskTitle, recipientIds, triggeredBy }) {
        if (!recipientIds?.length) return;
        await fanOutAndEmit(recipientIds, {
            companyId,
            projectId,
            type: "SUBTASK_ASSIGNED",
            channel: "user",
            title: "New Subtask Assigned",
            message: `You have been assigned to subtask "${subtaskTitle}". Open your project to view details.`,
            refModel: "SubTask",
            refId: subtaskId,
            triggeredBy,
            metadata: { projectId, subTaskId: subtaskId, subTaskTitle: subtaskTitle },
        });
    }

    static async notifyProjectAssigned({ companyId, projectId, projectName, recipientIds, triggeredBy }) {
        if (!recipientIds?.length) return;
        await fanOutAndEmit(recipientIds, {
            companyId,
            projectId,
            type: "PROJECT_ASSIGNED",
            channel: "user",
            title: "Added to a Project",
            message: `You have been added to project "${projectName}". Go to the Projects tab to get started.`,
            refModel: "Project",
            refId: projectId,
            triggeredBy,
            metadata: { projectId, projectName },
        });
    }

    static async notifyMRSubmitted({ companyId, projectId, projectName, mrNumber, mrId }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "MR_SUBMITTED",
            channel: "system",
            title: "Material Requisition Submitted",
            message: `${mrNumber} has been submitted for project "${projectName}". Go to the Requisitions tab to review.`,
            refModel: "MaterialRequisition",
            refId: mrId,
            metadata: { projectId, projectName, refNumber: mrNumber },
        });
    }

    static async notifyMRApproved({ companyId, projectId, projectName, mrNumber, mrId, creatorId, triggeredBy }) {
        if (!creatorId) return;
        await fanOutAndEmit([creatorId.toString()], {
            companyId,
            projectId,
            type: "MR_APPROVED",
            channel: "system",
            title: "Material Requisition Approved",
            message: `${mrNumber} has been approved for project "${projectName}". Go to the Requisitions tab to see details.`,
            refModel: "MaterialRequisition",
            refId: mrId,
            triggeredBy,
            metadata: { projectId, projectName, refNumber: mrNumber },
        });
    }

    static async notifyMRRejected({ companyId, projectId, projectName, mrNumber, mrId, creatorId, triggeredBy }) {
        if (!creatorId) return;
        await fanOutAndEmit([creatorId.toString()], {
            companyId,
            projectId,
            type: "MR_REJECTED",
            channel: "system",
            title: "Material Requisition Rejected",
            message: `${mrNumber} has been rejected for project "${projectName}". Go to the Requisitions tab to see details.`,
            refModel: "MaterialRequisition",
            refId: mrId,
            triggeredBy,
            metadata: { projectId, projectName, refNumber: mrNumber },
        });
    }

    static async notifyPOApproved({ companyId, projectId, projectName, poNumber, poId }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "PO_APPROVED",
            channel: "system",
            title: "Purchase Order Approved",
            message: `${poNumber} has been approved for project "${projectName}". Go to the Purchase Orders tab to see details.`,
            refModel: "PurchaseOrder",
            refId: poId,
            metadata: { projectId, projectName, refNumber: poNumber },
        });
    }

    static async notifyPORejected({ companyId, projectId, projectName, poNumber, poId, creatorId, triggeredBy }) {
        if (!creatorId) return;
        await fanOutAndEmit([creatorId.toString()], {
            companyId,
            projectId,
            type: "PO_REJECTED",
            channel: "system",
            title: "Purchase Order Rejected",
            message: `${poNumber} has been rejected for project "${projectName}". Go to the Purchase Orders tab to see details.`,
            refModel: "PurchaseOrder",
            refId: poId,
            triggeredBy,
            metadata: { projectId, projectName, refNumber: poNumber },
        });
    }

    static async notifyGRNCreated({ companyId, projectId, projectName, grnNumber, grnId }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "GRN_CREATED",
            channel: "system",
            title: "Goods Receipt Note Created",
            message: `${grnNumber} has been created for project "${projectName}". Go to the GRN tab to see details.`,
            refModel: "GRN",
            refId: grnId,
            metadata: { projectId, projectName, refNumber: grnNumber },
        });
    }

    static async notifyWOApproved({ companyId, projectId, projectName, woNumber, woId }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "WO_APPROVED",
            channel: "system",
            title: "Work Order Approved",
            message: `${woNumber} has been approved for project "${projectName}". Go to the Work Orders tab to see details.`,
            refModel: "WorkOrder",
            refId: woId,
            metadata: { projectId, projectName, refNumber: woNumber },
        });
    }

    static async notifyWORejected({ companyId, projectId, projectName, woNumber, woId, creatorId, triggeredBy }) {
        if (!creatorId) return;
        await fanOutAndEmit([creatorId.toString()], {
            companyId,
            projectId,
            type: "WO_REJECTED",
            channel: "system",
            title: "Work Order Rejected",
            message: `${woNumber} has been rejected for project "${projectName}". Go to the Work Orders tab to see details.`,
            refModel: "WorkOrder",
            refId: woId,
            triggeredBy,
            metadata: { projectId, projectName, refNumber: woNumber },
        });
    }

    static async notifyIssueRaised({ companyId, projectId, projectName, issueId, issueTitle }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "ISSUE_RAISED",
            channel: "system",
            title: "New Issue Raised",
            message: `A new issue "${issueTitle}" has been raised for project "${projectName}". Go to the Issues tab to see details.`,
            refModel: "Issue",
            refId: issueId,
            metadata: { projectId, projectName },
        });
    }

    static async notifyIssueResolved({ companyId, projectId, projectName, issueId, issueTitle, creatorId, triggeredBy }) {
        if (!creatorId) return;
        await fanOutAndEmit([creatorId.toString()], {
            companyId,
            projectId,
            type: "ISSUE_RESOLVED",
            channel: "system",
            title: "Issue Resolved",
            message: `Issue "${issueTitle}" in project "${projectName}" has been resolved. Go to the Issues tab to see details.`,
            refModel: "Issue",
            refId: issueId,
            triggeredBy,
            metadata: { projectId, projectName },
        });
    }

    static async notifyStockTransferCreated({ companyId, projectId, projectName, transferNumber, transferId }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "STOCK_TRANSFER_CREATED",
            channel: "system",
            title: "Stock Transfer Created",
            message: `A stock transfer has been created for project "${projectName}". Go to the Stock Transfer tab to see details.`,
            refModel: "StockTransfer",
            refId: transferId,
            metadata: { projectId, projectName, refNumber: transferNumber },
        });
    }

    static async notifyInventoryAdded({ companyId, projectId, projectName, materialName, inventoryId, triggeredBy }) {
        const allUserIds = await getCompanyUserIds(companyId);
        if (!allUserIds.length) return;
        await fanOutAndEmit(allUserIds, {
            companyId,
            projectId,
            type: "INVENTORY_ADDED",
            channel: "system",
            title: "Inventory Restocked",
            message: `Inventory for "${materialName}" has been added to project "${projectName}". Go to the Inventory tab to see details.`,
            refModel: "Inventory",
            refId: inventoryId,
            triggeredBy,
            metadata: { projectId, projectName, materialName, inventoryId },
        });
    }

    static async notifyLowStock({ companyId, projectId, projectName, item }) {
        const { recipientIds } = await getProjectMemberIds(projectId);
        if (!recipientIds.length) return;
        const isBelow = item.currentStock < item.minimumLevel;
        await fanOutAndEmit(recipientIds, {
            companyId,
            projectId,
            type: "INVENTORY_LOW_STOCK",
            channel: "system",
            title: isBelow ? "Critical Stock Level" : "Low Stock Warning",
            message: `Stock for "${item.name}" in project "${projectName}" is ${isBelow ? "critically low" : "below minimum level"}. Current: ${item.currentStock} ${item.unit}. Go to the Inventory tab to restock.`,
            refModel: "Inventory",
            refId: item._id,
            metadata: {
                projectId,
                projectName,
                inventoryId: item._id,
                materialName: item.name,
                currentStock: item.currentStock,
                minimumLevel: item.minimumLevel,
                unit: item.unit,
            },
        });
    }

    static async notifyTaskOverdue({ companyId, projectId, taskId, taskName, recipientIds, dueDate, daysOverdue }) {
        if (!recipientIds?.length) return;
        await fanOutAndEmit(recipientIds, {
            companyId,
            projectId,
            type: "TASK_OVERDUE",
            channel: "system",
            title: "Task Overdue",
            message: `Task "${taskName}" is overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}. Go to the Tasks tab to update its status.`,
            refModel: "Task",
            refId: taskId,
            metadata: { projectId, taskId, taskName, dueDate, daysOverdue },
        });
    }

    static async notifyPhaseOverdue({ companyId, projectId, projectName, phaseId, phaseName, recipientIds, dueDate, daysOverdue }) {
        if (!recipientIds?.length) return;
        await fanOutAndEmit(recipientIds, {
            companyId,
            projectId,
            type: "PHASE_OVERDUE",
            channel: "system",
            title: "Phase Overdue",
            message: `Phase "${phaseName}" in project "${projectName}" is overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}. Go to the project to review progress.`,
            refModel: "Phase",
            refId: phaseId,
            metadata: { projectId, projectName, phaseId, phaseName, dueDate, daysOverdue },
        });
    }

    static async notifyManual({ companyId, senderId, recipientIds, message }) {
        if (!recipientIds?.length || !message?.trim()) return;
        await fanOutAndEmit(recipientIds, {
            companyId,
            type: "MANUAL",
            channel: "manual",
            title: "New Message",
            message: message.trim(),
            triggeredBy: senderId,
            metadata: {},
        });
    }

    static async emitUnreadCount(userId, companyId) {
        return emitUnreadCount(userId, companyId);
    }
}

export default NotificationService;