import ExcelJS from "exceljs";
import archiver from "archiver";
import { PassThrough } from "stream";
import mongoose from "mongoose";

import Project from "../models/project.models.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Inventory from "../models/inventory.models.js";
import StockTransfer from "../models/stockTransfer.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import GRN from "../models/grn.models.js";
import WorkOrder from "../models/workOrder.models.js";
import Expense from "../models/expense.models.js";
import Payable from "../models/payable.models.js";
import MaterialConsumption from "../models/materialConsumption.models.js";
import User from "../models/user.models.js";

const NA = "Not Available";

const fmt = (date) => {
    if (!date) return NA;
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const fmtCurrency = (n) => {
    if (n == null) return NA;
    return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const userCache = new Map();

const resolveUserName = async (userId) => {
    if (!userId) return NA;
    const key = userId.toString();
    if (userCache.has(key)) return userCache.get(key);
    const user = await User.findOne({ _id: userId, isDeleted: false })
        .select("+name")
        .lean();
    const name = user?.name?.trim() || NA;
    userCache.set(key, name);
    return name;
};

const resolveUserNames = async (ids = []) => {
    if (!ids.length) return NA;
    const names = await Promise.all(ids.map(resolveUserName));
    return names.filter((n) => n !== NA).join(", ") || NA;
};

const makeWorkbook = (headers) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CMS Export";
    wb.created = new Date();
    const ws = wb.addWorksheet("Data");
    ws.columns = headers.map(({ header, key, width }) => ({
        header,
        key,
        width: width || 20,
    }));
    const headerRow = ws.getRow(1);
    headerRow.font = { name: "Arial", bold: true, size: 11 };
    headerRow.commit();
    return { wb, ws };
};

const wbToBuffer = async (wb) => {
    return wb.xlsx.writeBuffer();
};

export const buildProjectExportZip = async (projectId, companyId, res) => {
    userCache.clear();

    const pObjId = new mongoose.Types.ObjectId(projectId);
    const cObjId = new mongoose.Types.ObjectId(companyId);

    const project = await Project.findOne({
        _id: pObjId,
        companyId: cObjId,
        isDeleted: false,
    }).lean();

    if (!project) throw new Error("Project not found");

    const files = await Promise.all([
        buildProjectFile(project),
        buildPhasesFile(pObjId),
        buildTasksFile(pObjId),
        buildSubTasksFile(pObjId),
        buildInventoryFile(pObjId, cObjId),
        buildStockTransfersFile(pObjId, cObjId),
        buildMRFile(pObjId, cObjId),
        buildPOFile(pObjId, cObjId),
        buildGRNFile(pObjId, cObjId),
        buildWOFile(pObjId, cObjId),
        buildExpensesFile(pObjId, cObjId),
        buildPayablesFile(pObjId, cObjId),
        buildConsumptionsFile(pObjId, cObjId),
    ]);

    const slug = (project.projectCode || project.projectName)
        .replace(/\s+/g, "_")
        .toLowerCase();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${slug}_export.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => { throw err; });
    archive.pipe(res);

    for (const { name, buffer } of files) {
        const pass = new PassThrough();
        pass.end(buffer);
        archive.append(pass, { name });
    }

    await archive.finalize();
};


async function buildProjectFile(project) {
    const createdBy = await resolveUserName(project.createdBy);

    const { wb, ws } = makeWorkbook([
        { header: "Project Name", key: "projectName", width: 30 },
        { header: "Project Code", key: "projectCode", width: 16 },
        { header: "Client Name", key: "clientName", width: 24 },
        { header: "Location", key: "location", width: 28 },
        { header: "Budget (₹)", key: "budget", width: 18 },
        { header: "Start Date", key: "startDate", width: 16 },
        { header: "End Date", key: "endDate", width: 16 },
        { header: "Status", key: "status", width: 14 },
        { header: "Health Status", key: "healthStatus", width: 16 },
        { header: "Completion %", key: "completionPercent", width: 14 },
        { header: "Description", key: "description", width: 40 },
        { header: "Created By", key: "createdBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    ws.addRow({
        projectName: project.projectName || NA,
        projectCode: project.projectCode || NA,
        clientName: project.clientName || NA,
        location: project.location || NA,
        budget: fmtCurrency(project.budget),
        startDate: fmt(project.startDate),
        endDate: fmt(project.endDate),
        status: project.status || NA,
        healthStatus: project.healthStatus || NA,
        completionPercent: project.completionPercent ?? 0,
        description: project.description || NA,
        createdBy,
        createdAt: fmt(project.createdAt),
    });

    return { name: "01_project.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildPhasesFile(projectId) {
    const phases = await Phase.find({ projectId, isDeleted: false })
        .sort({ sequence: 1 })
        .lean();

    const { wb, ws } = makeWorkbook([
        { header: "Phase Name", key: "phaseName", width: 28 },
        { header: "Sequence", key: "sequence", width: 12 },
        { header: "Description", key: "description", width: 40 },
        { header: "Start Date", key: "startDate", width: 16 },
        { header: "End Date", key: "endDate", width: 16 },
        { header: "Completion %", key: "completionPercent", width: 14 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const p of phases) {
        ws.addRow({
            phaseName: p.phaseName || NA,
            sequence: p.sequence ?? NA,
            description: p.description || NA,
            startDate: fmt(p.startDate),
            endDate: fmt(p.endDate),
            completionPercent: p.completionPercent ?? 0,
            createdAt: fmt(p.createdAt),
        });
    }

    return { name: "02_phases.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildTasksFile(projectId) {
    const [tasks, phases] = await Promise.all([
        Task.find({ projectId, isDeleted: false }).lean(),
        Phase.find({ projectId, isDeleted: false }).select("_id phaseName").lean(),
    ]);

    const phaseMap = {};
    for (const ph of phases) phaseMap[ph._id.toString()] = ph.phaseName;

    const { wb, ws } = makeWorkbook([
        { header: "Task Name", key: "taskName", width: 30 },
        { header: "Phase", key: "phaseName", width: 24 },
        { header: "Priority", key: "priority", width: 12 },
        { header: "Status", key: "status", width: 16 },
        { header: "Start Date", key: "startDate", width: 16 },
        { header: "End Date", key: "endDate", width: 16 },
        { header: "Completion %", key: "completionPercent", width: 14 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const t of tasks) {
        ws.addRow({
            taskName: t.taskName || NA,
            phaseName: phaseMap[t.phaseId?.toString()] || NA,
            priority: t.priority || NA,
            status: t.status || NA,
            startDate: fmt(t.startDate),
            endDate: fmt(t.endDate),
            completionPercent: t.completionPercent ?? 0,
            createdAt: fmt(t.createdAt),
        });
    }

    return { name: "03_tasks.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildSubTasksFile(projectId) {
    const [subtasks, tasks, phases] = await Promise.all([
        SubTask.find({ projectId, isDeleted: false }).lean(),
        Task.find({ projectId, isDeleted: false }).select("_id taskName phaseId").lean(),
        Phase.find({ projectId, isDeleted: false }).select("_id phaseName").lean(),
    ]);

    const taskMap = {};
    for (const t of tasks) taskMap[t._id.toString()] = t;
    const phaseMap = {};
    for (const ph of phases) phaseMap[ph._id.toString()] = ph.phaseName;

    const { wb, ws } = makeWorkbook([
        { header: "Sub-Task Title", key: "title", width: 30 },
        { header: "Task", key: "taskName", width: 28 },
        { header: "Phase", key: "phaseName", width: 24 },
        { header: "Status", key: "status", width: 16 },
        { header: "Start Date", key: "startDate", width: 16 },
        { header: "End Date", key: "endDate", width: 16 },
        { header: "Completion %", key: "completionPercent", width: 14 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const s of subtasks) {
        const task = taskMap[s.taskId?.toString()];
        ws.addRow({
            title: s.title || NA,
            taskName: task?.taskName || NA,
            phaseName: phaseMap[task?.phaseId?.toString()] || NA,
            status: s.status || NA,
            startDate: fmt(s.startDate),
            endDate: fmt(s.endDate),
            completionPercent: s.completionPercent ?? 0,
            createdAt: fmt(s.createdAt),
        });
    }

    return { name: "04_subtasks.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildInventoryFile(projectId, companyId) {
    const items = await Inventory.find({ projectId, companyId, isDeleted: false }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "Material Name", key: "name", width: 30 },
        { header: "Category", key: "category", width: 18 },
        { header: "Unit", key: "unit", width: 12 },
        { header: "Current Stock", key: "currentStock", width: 16 },
        { header: "Minimum Level", key: "minimumLevel", width: 16 },
        { header: "Price Per Unit (₹)", key: "pricePerUnit", width: 20 },
        { header: "Total Received", key: "totalReceived", width: 16 },
        { header: "Total Consumed", key: "totalConsumed", width: 16 },
        { header: "Supplier", key: "supplierName", width: 24 },
        { header: "Last Restocked At", key: "lastRestockedAt", width: 20 },
    ]);

    for (const inv of items) {
        ws.addRow({
            name: inv.name || NA,
            category: inv.category || NA,
            unit: inv.unit || NA,
            currentStock: inv.currentStock ?? 0,
            minimumLevel: inv.minimumLevel ?? 0,
            pricePerUnit: fmtCurrency(inv.pricePerUnit),
            totalReceived: inv.totalReceived ?? 0,
            totalConsumed: inv.totalConsumed ?? 0,
            supplierName: inv.supplierName || NA,
            lastRestockedAt: fmt(inv.lastRestockedAt),
        });
    }

    return { name: "05_inventory.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildStockTransfersFile(projectId, companyId) {
    const [outgoing, incoming] = await Promise.all([
        StockTransfer.find({ fromProjectId: projectId, companyId, isDeleted: false })
            .populate("toProjectId", "projectName")
            .lean(),
        StockTransfer.find({ toProjectId: projectId, companyId, isDeleted: false })
            .populate("fromProjectId", "projectName")
            .lean(),
    ]);

    const { wb, ws } = makeWorkbook([
        { header: "Direction", key: "direction", width: 14 },
        { header: "Counterpart Project", key: "counterpartProject", width: 28 },
        { header: "Materials", key: "materials", width: 40 },
        { header: "Status", key: "status", width: 14 },
        { header: "Reason", key: "reason", width: 30 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Approved By", key: "approvedBy", width: 22 },
        { header: "Approved At", key: "approvedAt", width: 18 },
        { header: "Created By", key: "createdBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    const addRows = async (transfers, direction) => {
        for (const t of transfers) {
            const counterpart =
                direction === "Outgoing"
                    ? t.toProjectId?.projectName || NA
                    : t.fromProjectId?.projectName || NA;

            const materials =
                t.items?.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(", ") || NA;

            const [approvedBy, createdBy] = await Promise.all([
                resolveUserName(t.approvedBy),
                resolveUserName(t.createdBy),
            ]);

            ws.addRow({
                direction,
                counterpartProject: counterpart,
                materials,
                status: t.status || NA,
                reason: t.reason || NA,
                remarks: t.remarks || NA,
                approvedBy,
                approvedAt: fmt(t.approvedAt),
                createdBy,
                createdAt: fmt(t.createdAt),
            });
        }
    };

    await addRows(outgoing, "Outgoing");
    await addRows(incoming, "Incoming");

    return { name: "06_stock_transfers.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildMRFile(projectId, companyId) {
    const mrs = await MaterialRequisition.find({
        projectId,
        companyId,
        isDeleted: false,
    }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "MR Number", key: "mrNumber", width: 18 },
        { header: "Materials", key: "materials", width: 50 },
        { header: "Reason", key: "reason", width: 30 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Required By", key: "requiredByDate", width: 16 },
        { header: "Status", key: "status", width: 16 },
        { header: "Submitted At", key: "submittedAt", width: 18 },
        { header: "Approved By", key: "approvedBy", width: 22 },
        { header: "Approved At", key: "approvedAt", width: 18 },
        { header: "Rejected By", key: "rejectedBy", width: 22 },
        { header: "Rejection Remarks", key: "rejectionRemarks", width: 30 },
        { header: "Created By", key: "createdBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const mr of mrs) {
        const materials =
            mr.items?.map((i) => `${i.materialName} (${i.requiredQuantity} ${i.unit})`).join(", ") || NA;

        const [approvedBy, rejectedBy, createdBy] = await Promise.all([
            resolveUserName(mr.approvedBy),
            resolveUserName(mr.rejectedBy),
            resolveUserName(mr.createdBy),
        ]);

        ws.addRow({
            mrNumber: mr.mrNumber || NA,
            materials,
            reason: mr.reason || NA,
            remarks: mr.remarks || NA,
            requiredByDate: fmt(mr.requiredByDate),
            status: mr.status || NA,
            submittedAt: fmt(mr.submittedAt),
            approvedBy,
            approvedAt: fmt(mr.approvedAt),
            rejectedBy,
            rejectionRemarks: mr.rejectionRemarks || NA,
            createdBy,
            createdAt: fmt(mr.createdAt),
        });
    }

    return { name: "07_material_requisitions.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildPOFile(projectId, companyId) {
    const pos = await PurchaseOrder.find({
        projectId,
        companyId,
        isDeleted: false,
    }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "PO Number", key: "poNumber", width: 18 },
        { header: "Vendor", key: "vendorName", width: 24 },
        { header: "Items", key: "items", width: 60 },
        { header: "Total Order Value (₹)", key: "totalOrderValue", width: 22 },
        { header: "Expected Delivery", key: "expectedDeliveryDate", width: 20 },
        { header: "Payment Terms", key: "paymentTerms", width: 24 },
        { header: "Status", key: "status", width: 16 },
        { header: "Approved By", key: "approvedBy", width: 22 },
        { header: "Approved At", key: "approvedAt", width: 18 },
        { header: "Rejection Remarks", key: "rejectionRemarks", width: 30 },
        { header: "Created By", key: "createdBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const po of pos) {
        const items =
            po.items
                ?.map((i) => `${i.materialName} (${i.orderedQuantity} ${i.unit} @ ₹${i.unitPrice})`)
                .join(", ") || NA;

        const [approvedBy, createdBy] = await Promise.all([
            resolveUserName(po.approvedBy),
            resolveUserName(po.createdBy),
        ]);

        ws.addRow({
            poNumber: po.poNumber || NA,
            vendorName: po.vendorName || NA,
            items,
            totalOrderValue: fmtCurrency(po.totalOrderValue),
            expectedDeliveryDate: fmt(po.expectedDeliveryDate),
            paymentTerms: po.paymentTerms || NA,
            status: po.status || NA,
            approvedBy,
            approvedAt: fmt(po.approvedAt),
            rejectionRemarks: po.rejectionRemarks || NA,
            createdBy,
            createdAt: fmt(po.createdAt),
        });
    }

    return { name: "08_purchase_orders.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildGRNFile(projectId, companyId) {
    const grns = await GRN.find({ projectId, companyId, isDeleted: false }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "GRN Number", key: "grnNumber", width: 18 },
        { header: "Vendor", key: "vendorName", width: 24 },
        { header: "Delivery Date", key: "deliveryDate", width: 16 },
        { header: "Items Received", key: "items", width: 60 },
        { header: "Challan Number", key: "deliveryChallanNumber", width: 20 },
        { header: "Challan Date", key: "deliveryChallanDate", width: 16 },
        { header: "Vehicle Number", key: "vehicleNumber", width: 16 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Created By", key: "createdBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const grn of grns) {
        const items =
            grn.items
                ?.map((i) => `${i.materialName} (${i.receivedQuantity} ${i.unit})`)
                .join(", ") || NA;

        const createdBy = await resolveUserName(grn.createdBy);

        ws.addRow({
            grnNumber: grn.grnNumber || NA,
            vendorName: grn.vendorName || NA,
            deliveryDate: fmt(grn.deliveryDate),
            items,
            deliveryChallanNumber: grn.deliveryChallanNumber || NA,
            deliveryChallanDate: fmt(grn.deliveryChallanDate),
            vehicleNumber: grn.vehicleNumber || NA,
            remarks: grn.remarks || NA,
            createdBy,
            createdAt: fmt(grn.createdAt),
        });
    }

    return { name: "09_grns.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildWOFile(projectId, companyId) {
    const wos = await WorkOrder.find({ projectId, companyId, isDeleted: false }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "WO Number", key: "woNumber", width: 18 },
        { header: "Title", key: "title", width: 30 },
        { header: "Vendor", key: "vendorName", width: 24 },
        { header: "Work Items", key: "workItems", width: 60 },
        { header: "Total Contract Value (₹)", key: "totalContractValue", width: 24 },
        { header: "Start Date", key: "startDate", width: 16 },
        { header: "Expected End Date", key: "expectedEndDate", width: 20 },
        { header: "Completion %", key: "completionPercent", width: 14 },
        { header: "Status", key: "status", width: 16 },
        { header: "Payment Terms", key: "paymentTerms", width: 24 },
        { header: "Approved By", key: "approvedBy", width: 22 },
        { header: "Approved At", key: "approvedAt", width: 18 },
        { header: "Rejection Remarks", key: "rejectionRemarks", width: 30 },
        { header: "Created By", key: "createdBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const wo of wos) {
        const workItems =
            wo.workItems
                ?.map((wi) => `${wi.description} (${wi.quantity} ${wi.unit} @ ₹${wi.unitRate})`)
                .join(", ") || NA;

        const [approvedBy, createdBy] = await Promise.all([
            resolveUserName(wo.approvedBy),
            resolveUserName(wo.createdBy),
        ]);

        ws.addRow({
            woNumber: wo.woNumber || NA,
            title: wo.title || NA,
            vendorName: wo.vendorName || NA,
            workItems,
            totalContractValue: fmtCurrency(wo.totalContractValue),
            startDate: fmt(wo.startDate),
            expectedEndDate: fmt(wo.expectedEndDate),
            completionPercent: wo.completionPercent ?? 0,
            status: wo.status || NA,
            paymentTerms: wo.paymentTerms || NA,
            approvedBy,
            approvedAt: fmt(wo.approvedAt),
            rejectionRemarks: wo.rejectionRemarks || NA,
            createdBy,
            createdAt: fmt(wo.createdAt),
        });
    }

    return { name: "10_work_orders.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildExpensesFile(projectId, companyId) {
    const expenses = await Expense.find({
        projectId,
        companyId,
        isDeleted: false,
    }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "Expense Number", key: "expenseNumber", width: 20 },
        { header: "Type", key: "type", width: 22 },
        { header: "Category", key: "category", width: 18 },
        { header: "Status", key: "status", width: 14 },
        { header: "Amount (₹)", key: "amount", width: 18 },
        { header: "Expense Date", key: "expenseDate", width: 16 },
        { header: "Vendor", key: "vendorName", width: 24 },
        { header: "Description", key: "description", width: 36 },
        { header: "Payment Mode", key: "paymentMode", width: 18 },
        { header: "Submitted By", key: "submittedBy", width: 22 },
        { header: "Approved By", key: "approvedBy", width: 22 },
        { header: "Rejection Remarks", key: "rejectionRemarks", width: 30 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const exp of expenses) {
        const [submittedBy, approvedBy] = await Promise.all([
            resolveUserName(exp.submittedBy),
            resolveUserName(exp.approvedBy),
        ]);

        ws.addRow({
            expenseNumber: exp.expenseNumber || NA,
            type: (exp.type || NA).replace(/_/g, " "),
            category: exp.category || NA,
            status: exp.status || NA,
            amount: fmtCurrency(exp.amount),
            expenseDate: fmt(exp.expenseDate),
            vendorName: exp.vendorName || NA,
            description: exp.description || NA,
            paymentMode: exp.manualEntryDetails?.paymentMode || NA,
            submittedBy,
            approvedBy,
            rejectionRemarks: exp.rejectionRemarks || NA,
            createdAt: fmt(exp.createdAt),
        });
    }

    return { name: "11_expenses.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildPayablesFile(projectId, companyId) {
    const payables = await Payable.find({ projectId, companyId }).lean();

    const { wb, ws } = makeWorkbook([
        { header: "Payable Number", key: "payableNumber", width: 20 },
        { header: "Source Type", key: "sourceType", width: 18 },
        { header: "Source Number", key: "sourceNumber", width: 18 },
        { header: "Vendor", key: "vendorName", width: 24 },
        { header: "Total Amount (₹)", key: "totalAmount", width: 20 },
        { header: "Paid Amount (₹)", key: "paidAmount", width: 20 },
        { header: "Advance Deducted (₹)", key: "advanceDeducted", width: 22 },
        { header: "Due Amount (₹)", key: "dueAmount", width: 20 },
        { header: "Status", key: "status", width: 16 },
        { header: "Due Date", key: "dueDate", width: 16 },
        { header: "Notes", key: "notes", width: 30 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const p of payables) {
        ws.addRow({
            payableNumber: p.payableNumber || NA,
            sourceType: p.sourceType || NA,
            sourceNumber: p.sourceNumber || NA,
            vendorName: p.vendorName || NA,
            totalAmount: fmtCurrency(p.totalAmount),
            paidAmount: fmtCurrency(p.paidAmount),
            advanceDeducted: fmtCurrency(p.advanceDeducted),
            dueAmount: fmtCurrency(p.dueAmount),
            status: p.status || NA,
            dueDate: fmt(p.dueDate),
            notes: p.notes || NA,
            createdAt: fmt(p.createdAt),
        });
    }

    return { name: "12_payables.xlsx", buffer: await wbToBuffer(wb) };
}


async function buildConsumptionsFile(projectId, companyId) {
    const consumptions = await MaterialConsumption.find({
        projectId,
        companyId,
        isDeleted: false,
    }).lean();

    const [tasks, phases, subtasks] = await Promise.all([
        Task.find({ projectId, isDeleted: false }).select("_id taskName").lean(),
        Phase.find({ projectId, isDeleted: false }).select("_id phaseName").lean(),
        SubTask.find({ projectId, isDeleted: false }).select("_id title").lean(),
    ]);

    const taskMap = {};
    for (const t of tasks) taskMap[t._id.toString()] = t.taskName;
    const phaseMap = {};
    for (const ph of phases) phaseMap[ph._id.toString()] = ph.phaseName;
    const subTaskMap = {};
    for (const s of subtasks) subTaskMap[s._id.toString()] = s.title;

    const { wb, ws } = makeWorkbook([
        { header: "Material Name", key: "materialName", width: 30 },
        { header: "Unit", key: "unit", width: 12 },
        { header: "Quantity Consumed", key: "quantityConsumed", width: 20 },
        { header: "Price Per Unit (₹)", key: "pricePerUnit", width: 20 },
        { header: "Total Cost (₹)", key: "totalCost", width: 18 },
        { header: "Phase", key: "phaseName", width: 24 },
        { header: "Task", key: "taskName", width: 28 },
        { header: "Sub-Task", key: "subTaskName", width: 28 },
        { header: "Source", key: "source", width: 14 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Recorded By", key: "recordedBy", width: 22 },
        { header: "Created At", key: "createdAt", width: 18 },
    ]);

    for (const c of consumptions) {
        const recordedBy = await resolveUserName(c.recordedBy);

        ws.addRow({
            materialName: c.materialName || NA,
            unit: c.unit || NA,
            quantityConsumed: c.quantityConsumed ?? NA,
            pricePerUnit: fmtCurrency(c.pricePerUnit),
            totalCost: fmtCurrency(c.totalCost),
            phaseName: phaseMap[c.phaseId?.toString()] || NA,
            taskName: taskMap[c.taskId?.toString()] || NA,
            subTaskName: subTaskMap[c.subTaskId?.toString()] || NA,
            source: c.source || NA,
            remarks: c.remarks || NA,
            recordedBy,
            createdAt: fmt(c.createdAt),
        });
    }

    return { name: "13_consumptions.xlsx", buffer: await wbToBuffer(wb) };
}