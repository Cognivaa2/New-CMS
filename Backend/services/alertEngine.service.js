import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Phase from "../models/phase.models.js";
import Issue from "../models/issue.models.js";
import Inventory from "../models/inventory.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import StockTransfer from "../models/stockTransfer.models.js";
import { todayUTC, daysFromNow, daysAgo } from "../helpers/projectDashboardHelper.js";


const CRITICAL = "critical";
const WARNING = "warning";
const INFO = "info";

const MODULE = {
    TASK: "task",
    PHASE: "phase",
    ISSUE: "issue",
    INVENTORY: "inventory",
    MR: "material_requisition",
    PO: "purchase_order",
    STOCK_TRANSFER: "stock_transfer",
    PROJECT: "project",
};


const makeAlert = ({ id, module, priority, title, message, meta = {} }) => ({
    id,
    module,
    priority,
    title,
    message,
    meta,
    generatedAt: new Date(),
});


// This function generates alerts for tasks. takes projectId and companyId. identifies overdue, due soon, blocked, unassigned, high priority not started and near completion tasks based on status, priority, assignment and deadlines. -------------------------- Ayan
async function generateTaskAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const in1Day = daysFromNow(1);
    const in3Days = daysFromNow(3);
    const tasks = await Task.find({
        projectId,
        companyId,
        isDeleted: false,
    })
        .select("_id taskName status priority endDate completionPercent assignedTo phaseId")
        .lean();
    tasks.forEach((task) => {
        const end = new Date(task.endDate);
        const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
        const isCompleted = task.status === "Completed";
        const isBlocked = task.status === "Blocked";
        if (!isCompleted && end < today) {
            alerts.push(
                makeAlert({
                    id: `task-overdue-${task._id}`,
                    module: MODULE.TASK,
                    priority: task.priority === "Critical" || task.priority === "High" ? CRITICAL : WARNING,
                    title: "Task Overdue",
                    message: `"${task.taskName}" was due on ${end.toDateString()} and is still ${task.status}. Immediate action required.`,
                    meta: { taskId: task._id, taskName: task.taskName, daysOverdue: Math.abs(daysLeft), status: task.status, priority: task.priority },
                })
            );
            return;
        }
        if (!isCompleted && daysLeft <= 1 && daysLeft >= 0) {
            alerts.push(
                makeAlert({
                    id: `task-due-tomorrow-${task._id}`,
                    module: MODULE.TASK,
                    priority: task.priority === "Critical" ? CRITICAL : WARNING,
                    title: "Task Due Tomorrow",
                    message: `"${task.taskName}" is due tomorrow. Ensure completion before the deadline.`,
                    meta: { taskId: task._id, taskName: task.taskName, daysLeft, status: task.status },
                })
            );
        }
        else if (!isCompleted && daysLeft <= 3 && daysLeft > 1) {
            alerts.push(
                makeAlert({
                    id: `task-due-soon-${task._id}`,
                    module: MODULE.TASK,
                    priority: INFO,
                    title: "Task Due Soon",
                    message: `"${task.taskName}" is due in ${daysLeft} days. Review progress to avoid delays.`,
                    meta: { taskId: task._id, taskName: task.taskName, daysLeft, status: task.status },
                })
            );
        }
        if (isBlocked) {
            alerts.push(
                makeAlert({
                    id: `task-blocked-${task._id}`,
                    module: MODULE.TASK,
                    priority: task.priority === "Critical" || task.priority === "High" ? CRITICAL : WARNING,
                    title: "Task Blocked",
                    message: `"${task.taskName}" is currently blocked. Resolve the blocker to keep the project on track.`,
                    meta: { taskId: task._id, taskName: task.taskName, priority: task.priority },
                })
            );
        }
        if (
            !isCompleted &&
            task.completionPercent >= 90 &&
            task.status !== "Blocked"
        ) {
            alerts.push(
                makeAlert({
                    id: `task-near-complete-${task._id}`,
                    module: MODULE.TASK,
                    priority: INFO,
                    title: "Task Nearly Complete",
                    message: `"${task.taskName}" is ${task.completionPercent}% complete. Mark it as Completed if work is done to update project progress.`,
                    meta: { taskId: task._id, taskName: task.taskName, completionPercent: task.completionPercent },
                })
            );
        }
        if (
            !isCompleted &&
            (!task.assignedTo || task.assignedTo.length === 0) &&
            daysLeft <= 7
        ) {
            alerts.push(
                makeAlert({
                    id: `task-unassigned-${task._id}`,
                    module: MODULE.TASK,
                    priority: WARNING,
                    title: "Unassigned Task",
                    message: `"${task.taskName}" has no assigned team members and is due in ${daysLeft} day(s). Assign someone to avoid delays.`,
                    meta: { taskId: task._id, taskName: task.taskName, daysLeft },
                })
            );
        }

        if (
            ["High", "Critical"].includes(task.priority) &&
            task.status === "NotStarted" &&
            daysLeft <= 5 &&
            daysLeft >= 0
        ) {
            alerts.push(
                makeAlert({
                    id: `task-not-started-critical-${task._id}`,
                    module: MODULE.TASK,
                    priority: CRITICAL,
                    title: "High Priority Task Not Started",
                    message: `"${task.taskName}" is a ${task.priority} priority task due in ${daysLeft} day(s) and hasn't been started yet.`,
                    meta: { taskId: task._id, taskName: task.taskName, priority: task.priority, daysLeft },
                })
            );
        }
    });

    return alerts;
}


// This function generates alerts for subtasks. takes projectId and companyId. identifies overdue and blocked subtasks that may impact parent tasks. -------------------------- Ayan
async function generateSubTaskAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const subtasks = await SubTask.find({
        projectId,
        companyId,
        isDeleted: false,
        endDate: { $ne: null },
        status: { $ne: "Completed" },
    })
        .select("_id title status endDate completionPercent taskId")
        .lean();
    subtasks.forEach((sub) => {
        const end = new Date(sub.endDate);
        const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
        if (end < today) {
            alerts.push(
                makeAlert({
                    id: `subtask-overdue-${sub._id}`,
                    module: MODULE.TASK,
                    priority: WARNING,
                    title: "Subtask Overdue",
                    message: `Subtask "${sub.title}" is overdue by ${Math.abs(daysLeft)} day(s) and is still ${sub.status}.`,
                    meta: { subTaskId: sub._id, taskId: sub.taskId, title: sub.title, daysOverdue: Math.abs(daysLeft) },
                })
            );
        }

        if (sub.status === "Blocked") {
            alerts.push(
                makeAlert({
                    id: `subtask-blocked-${sub._id}`,
                    module: MODULE.TASK,
                    priority: WARNING,
                    title: "Subtask Blocked",
                    message: `Subtask "${sub.title}" is blocked. This may delay its parent task.`,
                    meta: { subTaskId: sub._id, taskId: sub.taskId, title: sub.title },
                })
            );
        }
    });

    return alerts;
}


// This function generates alerts for project phases. takes projectId and companyId. detects overdue phases, schedule deviations, and low completion near deadlines based on planned vs actual progress. -------------------------- Ayan
async function generatePhaseAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const phases = await Phase.find({
        projectId,
        companyId,
        isDeleted: false,
    })
        .select("_id phaseName startDate endDate completionPercent sequence")
        .lean();
    const now = Date.now();
    phases.forEach((phase) => {
        const end = new Date(phase.endDate);
        const start = new Date(phase.startDate);
        const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
        const duration = end.getTime() - start.getTime();

        let plannedProgress = 0;
        if (duration > 0) {
            plannedProgress = Math.min(100, Math.max(0, ((now - start.getTime()) / duration) * 100));
        }

        if (end < today && phase.completionPercent < 100) {
            alerts.push(
                makeAlert({
                    id: `phase-overdue-${phase._id}`,
                    module: MODULE.PHASE,
                    priority: CRITICAL,
                    title: "Phase Overdue",
                    message: `Phase "${phase.phaseName}" (Seq. ${phase.sequence}) ended on ${end.toDateString()} but is only ${phase.completionPercent}% complete. This is delaying project progress.`,
                    meta: { phaseId: phase._id, phaseName: phase.phaseName, completionPercent: phase.completionPercent, daysOverdue: Math.abs(daysLeft) },
                })
            );
            return;
        }

        const deviation = plannedProgress - phase.completionPercent;
        if (deviation > 20 && phase.completionPercent < 100) {
            alerts.push(
                makeAlert({
                    id: `phase-at-risk-${phase._id}`,
                    module: MODULE.PHASE,
                    priority: WARNING,
                    title: "Phase Behind Schedule",
                    message: `Phase "${phase.phaseName}" should be ~${plannedProgress.toFixed(0)}% done but is only at ${phase.completionPercent}%. It is ${deviation.toFixed(0)}% behind the planned timeline.`,
                    meta: { phaseId: phase._id, phaseName: phase.phaseName, plannedProgress: parseFloat(plannedProgress.toFixed(2)), actualProgress: phase.completionPercent, deviation: parseFloat(deviation.toFixed(2)) },
                })
            );
        }

        if (daysLeft >= 0 && daysLeft <= 3 && phase.completionPercent < 70) {
            alerts.push(
                makeAlert({
                    id: `phase-ending-soon-low-${phase._id}`,
                    module: MODULE.PHASE,
                    priority: CRITICAL,
                    title: "Phase Ending Soon — Low Completion",
                    message: `Phase "${phase.phaseName}" ends in ${daysLeft} day(s) but is only ${phase.completionPercent}% complete. Escalate immediately.`,
                    meta: { phaseId: phase._id, phaseName: phase.phaseName, daysLeft, completionPercent: phase.completionPercent },
                })
            );
        }
    });

    return alerts;
}


// This function generates alerts for issues. takes projectId and companyId. identifies high/critical unresolved issues, overdue issues, stale issues and high volume of open issues. -------------------------- Ayan
async function generateIssueAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const sevenDaysAgo = daysAgo(7);
    const openIssues = await Issue.find({
        projectId,
        companyId,
        isDeleted: false,
        status: "submitted",
    })
        .select("_id title priority dueDate createdAt issueType")
        .lean();
    openIssues.forEach((issue) => {
        const isPriorityCritical = issue.priority === "critical";
        const isPriorityHigh = issue.priority === "high";

        if (isPriorityCritical || isPriorityHigh) {
            alerts.push(
                makeAlert({
                    id: `issue-high-open-${issue._id}`,
                    module: MODULE.ISSUE,
                    priority: isPriorityCritical ? CRITICAL : WARNING,
                    title: `${isPriorityCritical ? "Critical" : "High"} Issue Unresolved`,
                    message: `${isPriorityCritical ? "⚠ Critical" : "High priority"} issue "${issue.title}" (${issue.issueType.replace(/_/g, " ")}) is still open. Resolve it to avoid project impact.`,
                    meta: { issueId: issue._id, title: issue.title, priority: issue.priority, issueType: issue.issueType },
                })
            );
        }

        if (issue.dueDate && new Date(issue.dueDate) < today) {
            const daysOverdue = Math.ceil(
                (today.getTime() - new Date(issue.dueDate).getTime()) / 86400000
            );
            alerts.push(
                makeAlert({
                    id: `issue-overdue-${issue._id}`,
                    module: MODULE.ISSUE,
                    priority: CRITICAL,
                    title: "Issue Past Due Date",
                    message: `Issue "${issue.title}" was due on ${new Date(issue.dueDate).toDateString()} and is overdue by ${daysOverdue} day(s).`,
                    meta: { issueId: issue._id, title: issue.title, daysOverdue },
                })
            );
        }

        if (new Date(issue.createdAt) < sevenDaysAgo) {
            const daysOpen = Math.ceil(
                (today.getTime() - new Date(issue.createdAt).getTime()) / 86400000
            );
            alerts.push(
                makeAlert({
                    id: `issue-stale-${issue._id}`,
                    module: MODULE.ISSUE,
                    priority: WARNING,
                    title: "Issue Unresolved for Over a Week",
                    message: `Issue "${issue.title}" has been open for ${daysOpen} days without resolution. Please review and take action.`,
                    meta: { issueId: issue._id, title: issue.title, daysOpen },
                })
            );
        }
    });

    if (openIssues.length >= 5) {
        alerts.push(
            makeAlert({
                id: `issue-high-volume-${projectId}`,
                module: MODULE.ISSUE,
                priority: WARNING,
                title: "High Number of Open Issues",
                message: `There are ${openIssues.length} unresolved issues on this project. A backlog of issues may indicate systemic problems — please conduct a review.`,
                meta: { openIssueCount: openIssues.length },
            })
        );
    }

    return alerts;
}


// This function generates alerts for inventory. takes projectId and companyId. detects zero stock, below minimum level, low stock warning and stale inventory not restocked recently. -------------------------- Ayan
async function generateInventoryAlerts(projectId, companyId) {
    const alerts = [];
    const thirtyDaysAgo = daysAgo(30);
    const inventoryItems = await Inventory.find({
        projectId,
        companyId,
        isDeleted: false,
    })
        .select("_id name unit currentStock minimumLevel lastRestockedAt category")
        .lean();
    inventoryItems.forEach((item) => {
        const { currentStock, minimumLevel, name, unit } = item;
        if (currentStock === 0 && minimumLevel > 0) {
            alerts.push(
                makeAlert({
                    id: `inv-zero-stock-${item._id}`,
                    module: MODULE.INVENTORY,
                    priority: CRITICAL,
                    title: "Zero Stock Alert",
                    message: `"${name}" is completely out of stock (0 ${unit}). Minimum level is ${minimumLevel} ${unit}. Raise a Material Requisition immediately.`,
                    meta: { inventoryId: item._id, materialName: name, currentStock, minimumLevel, unit },
                })
            );
            return;
        }

        if (minimumLevel > 0 && currentStock < minimumLevel) {
            const shortage = minimumLevel - currentStock;
            alerts.push(
                makeAlert({
                    id: `inv-below-min-${item._id}`,
                    module: MODULE.INVENTORY,
                    priority: CRITICAL,
                    title: "Stock Below Minimum Level",
                    message: `"${name}" stock (${currentStock} ${unit}) is below the minimum level of ${minimumLevel} ${unit}. You are short by ${shortage.toFixed(2)} ${unit}. Initiate procurement immediately.`,
                    meta: { inventoryId: item._id, materialName: name, currentStock, minimumLevel, shortage: parseFloat(shortage.toFixed(2)), unit },
                })
            );
        }

        else if (minimumLevel > 0 && currentStock <= minimumLevel * 1.5) {
            const remaining = currentStock - minimumLevel;
            alerts.push(
                makeAlert({
                    id: `inv-approaching-min-${item._id}`,
                    module: MODULE.INVENTORY,
                    priority: WARNING,
                    title: "Stock Approaching Minimum Level",
                    message: `"${name}" stock (${currentStock} ${unit}) is getting low — only ${remaining.toFixed(2)} ${unit} above the minimum level of ${minimumLevel} ${unit}. Consider restocking soon.`,
                    meta: { inventoryId: item._id, materialName: name, currentStock, minimumLevel, buffer: parseFloat(remaining.toFixed(2)), unit },
                })
            );
        }

        if (
            minimumLevel > 0 &&
            item.lastRestockedAt &&
            new Date(item.lastRestockedAt) < thirtyDaysAgo &&
            currentStock > 0 &&
            currentStock <= minimumLevel * 2
        ) {
            alerts.push(
                makeAlert({
                    id: `inv-stale-${item._id}`,
                    module: MODULE.INVENTORY,
                    priority: INFO,
                    title: "Inventory Not Restocked Recently",
                    message: `"${name}" has not been restocked in over 30 days and current stock (${currentStock} ${unit}) may run out soon. Plan a restock.`,
                    meta: { inventoryId: item._id, materialName: name, currentStock, lastRestockedAt: item.lastRestockedAt },
                })
            );
        }
    });

    return alerts;
}


// This function generates alerts for material requisitions (MR). takes projectId and companyId. identifies stale pending approvals, long draft MRs and high volume of pending MRs. -------------------------- Ayan
async function generateMRAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const twoDaysAgo = daysAgo(2);
    const fiveDaysAgo = daysAgo(5);
    const [stalePendingMRs, staleDraftMRs, totalSubmitted] = await Promise.all([
        MaterialRequisition.find({
            projectId,
            companyId,
            isDeleted: false,
            status: "Submitted",
            submittedAt: { $lt: twoDaysAgo },
        })
            .select("_id mrNumber submittedAt items")
            .lean(),

        MaterialRequisition.find({
            projectId,
            companyId,
            isDeleted: false,
            status: "Draft",
            createdAt: { $lt: fiveDaysAgo },
        })
            .select("_id mrNumber createdAt")
            .lean(),

        MaterialRequisition.countDocuments({
            projectId,
            companyId,
            isDeleted: false,
            status: "Submitted",
        }),
    ]);

    stalePendingMRs.forEach((mr) => {
        const daysPending = Math.ceil(
            (today.getTime() - new Date(mr.submittedAt).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `mr-stale-approval-${mr._id}`,
                module: MODULE.MR,
                priority: WARNING,
                title: "Material Requisition Awaiting Approval",
                message: `MR #${mr.mrNumber} has been pending approval for ${daysPending} day(s). Delayed approvals can stall site operations.`,
                meta: { mrId: mr._id, mrNumber: mr.mrNumber, daysPending, itemCount: mr.items?.length || 0 },
            })
        );
    });

    staleDraftMRs.forEach((mr) => {
        const daysOld = Math.ceil(
            (today.getTime() - new Date(mr.createdAt).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `mr-stale-draft-${mr._id}`,
                module: MODULE.MR,
                priority: INFO,
                title: "Material Requisition Draft Not Submitted",
                message: `MR #${mr.mrNumber} has been in Draft state for ${daysOld} days. Submit it for approval or delete if no longer needed.`,
                meta: { mrId: mr._id, mrNumber: mr.mrNumber, daysOld },
            })
        );
    });

    if (totalSubmitted >= 3) {
        alerts.push(
            makeAlert({
                id: `mr-overload-${projectId}`,
                module: MODULE.MR,
                priority: WARNING,
                title: "High Pending MR Volume",
                message: `${totalSubmitted} Material Requisitions are awaiting approval simultaneously. This may indicate a procurement bottleneck — prioritise urgent approvals.`,
                meta: { totalSubmitted },
            })
        );
    }

    return alerts;
}


// This function generates alerts for purchase orders (PO). takes projectId and companyId. detects pending approvals, overdue deliveries, partial delivery delays and stale draft POs. -------------------------- Ayan
async function generatePOAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const twoDaysAgo = daysAgo(2);
    const fiveDaysAgo = daysAgo(5);
    const [stalePendingPOs, overdueDeliveryPOs, stalePartialPOs, staleDraftPOs] = await Promise.all([
        PurchaseOrder.find({
            projectId,
            companyId,
            isDeleted: false,
            status: "Submitted",
            submittedAt: { $lt: twoDaysAgo },
        })
            .select("_id poNumber submittedAt totalOrderValue")
            .lean(),

        PurchaseOrder.find({
            projectId,
            companyId,
            isDeleted: false,
            status: "Approved",
            expectedDeliveryDate: { $lt: today, $ne: null },
        })
            .select("_id poNumber expectedDeliveryDate vendorName totalOrderValue")
            .lean(),

        PurchaseOrder.find({
            projectId,
            companyId,
            isDeleted: false,
            status: "PartiallyDelivered",
            expectedDeliveryDate: { $lt: today, $ne: null },
        })
            .select("_id poNumber expectedDeliveryDate vendorName")
            .lean(),

        PurchaseOrder.find({
            projectId,
            companyId,
            isDeleted: false,
            status: "Draft",
            createdAt: { $lt: fiveDaysAgo },
        })
            .select("_id poNumber createdAt")
            .lean(),
    ]);

    stalePendingPOs.forEach((po) => {
        const daysPending = Math.ceil(
            (today.getTime() - new Date(po.submittedAt).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `po-stale-approval-${po._id}`,
                module: MODULE.PO,
                priority: WARNING,
                title: "Purchase Order Awaiting Approval",
                message: `PO #${po.poNumber} worth ₹${po.totalOrderValue?.toLocaleString()} has been pending approval for ${daysPending} day(s). Approve or reject to unblock procurement.`,
                meta: { poId: po._id, poNumber: po.poNumber, daysPending, totalOrderValue: po.totalOrderValue },
            })
        );
    });

    overdueDeliveryPOs.forEach((po) => {
        const daysOverdue = Math.ceil(
            (today.getTime() - new Date(po.expectedDeliveryDate).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `po-delivery-overdue-${po._id}`,
                module: MODULE.PO,
                priority: CRITICAL,
                title: "Purchase Order Delivery Overdue",
                message: `PO #${po.poNumber} from vendor "${po.vendorName}" was due for delivery on ${new Date(po.expectedDeliveryDate).toDateString()} — overdue by ${daysOverdue} day(s). Follow up with the vendor or record a GRN.`,
                meta: { poId: po._id, poNumber: po.poNumber, vendorName: po.vendorName, daysOverdue, expectedDeliveryDate: po.expectedDeliveryDate },
            })
        );
    });

    stalePartialPOs.forEach((po) => {
        const daysOverdue = Math.ceil(
            (today.getTime() - new Date(po.expectedDeliveryDate).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `po-partial-overdue-${po._id}`,
                module: MODULE.PO,
                priority: WARNING,
                title: "Partial Delivery Overdue",
                message: `PO #${po.poNumber} from "${po.vendorName}" is partially delivered but the remaining delivery is ${daysOverdue} day(s) overdue. Follow up to complete the order.`,
                meta: { poId: po._id, poNumber: po.poNumber, vendorName: po.vendorName, daysOverdue },
            })
        );
    });

    staleDraftPOs.forEach((po) => {
        const daysOld = Math.ceil(
            (today.getTime() - new Date(po.createdAt).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `po-stale-draft-${po._id}`,
                module: MODULE.PO,
                priority: INFO,
                title: "Purchase Order Draft Not Submitted",
                message: `PO #${po.poNumber} has been in Draft state for ${daysOld} days. Submit for approval or delete if no longer required.`,
                meta: { poId: po._id, poNumber: po.poNumber, daysOld },
            })
        );
    });

    return alerts;
}


// This function generates alerts for stock transfers. takes projectId and companyId. identifies pending transfers awaiting approval and stale rejected transfers needing action. -------------------------- Ayan
async function generateStockTransferAlerts(projectId, companyId) {
    const alerts = [];
    const today = todayUTC();
    const twoDaysAgo = daysAgo(2);
    const threeDaysAgo = daysAgo(3);
    const [pendingTransfers, stalePending, rejectedStale] = await Promise.all([
        StockTransfer.countDocuments({
            companyId,
            isDeleted: false,
            status: "Draft",
            $or: [{ fromProjectId: projectId }, { toProjectId: projectId }],
        }),

        StockTransfer.find({
            companyId,
            isDeleted: false,
            status: "Draft",
            createdAt: { $lt: twoDaysAgo },
            $or: [{ fromProjectId: projectId }, { toProjectId: projectId }],
        })
            .select("_id createdAt fromProjectId toProjectId reason")
            .lean(),

        StockTransfer.find({
            companyId,
            isDeleted: false,
            status: "Rejected",
            rejectedAt: { $lt: threeDaysAgo },
            $or: [{ fromProjectId: projectId }, { toProjectId: projectId }],
        })
            .select("_id rejectedAt rejectionRemarks reason")
            .lean(),
    ]);

    stalePending.forEach((transfer) => {
        const daysWaiting = Math.ceil(
            (today.getTime() - new Date(transfer.createdAt).getTime()) / 86400000
        );
        const direction =
            transfer.fromProjectId.toString() === projectId.toString()
                ? "outgoing"
                : "incoming";
        alerts.push(
            makeAlert({
                id: `transfer-pending-${transfer._id}`,
                module: MODULE.STOCK_TRANSFER,
                priority: WARNING,
                title: "Stock Transfer Pending Approval",
                message: `An ${direction} stock transfer has been waiting for approval for ${daysWaiting} day(s). Approve or reject to keep inventory accurate.`,
                meta: { transferId: transfer._id, direction, daysWaiting, reason: transfer.reason },
            })
        );
    });

    rejectedStale.forEach((transfer) => {
        const daysSinceRejection = Math.ceil(
            (today.getTime() - new Date(transfer.rejectedAt).getTime()) / 86400000
        );
        alerts.push(
            makeAlert({
                id: `transfer-rejected-stale-${transfer._id}`,
                module: MODULE.STOCK_TRANSFER,
                priority: INFO,
                title: "Rejected Stock Transfer Not Actioned",
                message: `A stock transfer was rejected ${daysSinceRejection} day(s) ago${transfer.rejectionRemarks ? ` ("${transfer.rejectionRemarks}")` : ""}. Review and re-raise if still needed.`,
                meta: { transferId: transfer._id, daysSinceRejection, rejectionRemarks: transfer.rejectionRemarks },
            })
        );
    });

    return alerts;
}


// This function generates all alerts across modules. takes projectId and companyId. aggregates alerts from all modules, filters fulfilled results and sorts them by priority and recency. -------------------------- Ayan
export async function generateAllAlerts(projectId, companyId) {
    const results = await Promise.allSettled([
        generateTaskAlerts(projectId, companyId),
        generateSubTaskAlerts(projectId, companyId),
        generatePhaseAlerts(projectId, companyId),
        generateIssueAlerts(projectId, companyId),
        generateInventoryAlerts(projectId, companyId),
        generateMRAlerts(projectId, companyId),
        generatePOAlerts(projectId, companyId),
        generateStockTransferAlerts(projectId, companyId),
    ]);

    const allAlerts = [];
    results.forEach((result) => {
        if (result.status === "fulfilled") {
            allAlerts.push(...result.value);
        }
    });

    const priorityOrder = { [CRITICAL]: 0, [WARNING]: 1, [INFO]: 2 };
    allAlerts.sort((a, b) => {
        const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (diff !== 0) return diff;
        return new Date(b.generatedAt) - new Date(a.generatedAt);
    });

    return allAlerts;
}

// This function summarizes alerts data. takes alerts array. returns total count, priority-wise distribution and module-wise breakdown of alerts. -------------------------- Ayan
export function summariseAlerts(alerts) {
    const summary = {
        total: alerts.length,
        critical: 0,
        warning: 0,
        info: 0,
        byModule: {},
    };
    alerts.forEach((alert) => {
        summary[alert.priority]++;
        if (!summary.byModule[alert.module]) {
            summary.byModule[alert.module] = { total: 0, critical: 0, warning: 0, info: 0 };
        }
        summary.byModule[alert.module].total++;
        summary.byModule[alert.module][alert.priority]++;
    });

    return summary;
}