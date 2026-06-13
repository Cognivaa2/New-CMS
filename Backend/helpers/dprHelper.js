import mongoose from "mongoose";
import ExcelJS from "exceljs";
import DPR from "../models/dpr.models.js";
import User from "../models/user.models.js";
import keycloakService from "../services/keycloak.service.js";
import logger from "../utils/logger.utils.js";


export const normalizeToMidnightUTC = (date = new Date()) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};


export const resolveActorName = async (actorId) => {
    if (!actorId) return "System";
    try {
        const user = await User.findOne(
            { _id: actorId, isDeleted: false },
            { keycloakId: 1 }
        ).lean();
        if (!user?.keycloakId) return "Unknown";
        const kcUser = await keycloakService.getUserById(user.keycloakId);
        if (!kcUser) return "Unknown";
        const attrName = kcUser.attributes?.name?.[0]?.trim();
        if (attrName) return attrName;
        const fullName = `${kcUser.firstName || ""} ${kcUser.lastName || ""}`.trim();
        if (fullName) return fullName;
        return "Unknown";
    } catch (err) {
        logger.warn("[DPR] resolveActorName failed", {
            actorId: actorId?.toString(),
            error: err.message,
        });
        return "Unknown";
    }
};



export const resolveActorNameByKeycloakId = async (keycloakId) => {
    if (!keycloakId) return "System";
    try {
        const kcUser = await keycloakService.getUserById(keycloakId);
        if (!kcUser) return "Unknown";
        const attrName = kcUser.attributes?.name?.[0]?.trim();
        if (attrName) return attrName;
        const fullName = `${kcUser.firstName || ""} ${kcUser.lastName || ""}`.trim();
        if (fullName) return fullName;
        return "Unknown";
    } catch (err) {
        logger.warn("[DPR] resolveActorNameByKeycloakId failed", {
            keycloakId,
            error: err.message,
        });
        return "Unknown";
    }
};



export const recomputeSummary = (events = []) => {
    const summary = {
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
        totalEvents: events.length,
        lastActivityAt: null,
    };

    const subTaskProgressMap = new Map();
    const subTaskIdsSeen = new Set();
    const mrSeen = new Set();
    const poSeen = new Set();
    const grnSeen = new Set();
    const woSeen = new Set();

    for (const ev of events) {
        if (!summary.lastActivityAt || ev.eventAt > summary.lastActivityAt) {
            summary.lastActivityAt = ev.eventAt;
        }
        switch (ev.module) {
            case "SubTask":
                if (ev.action === "ProgressUpdated" && ev.refId) {
                    const key = ev.refId.toString();
                    subTaskIdsSeen.add(key);
                    subTaskProgressMap.set(key, ev.details?.completionPercent ?? 0);
                }
                break;
            case "Task":
                break;
            case "MaterialConsumption":
                if (ev.action === "MaterialConsumed") {
                    summary.totalConsumptionEntries += 1;
                    summary.totalMaterialCost += ev.details?.totalCost ?? 0;
                }
                if (ev.action === "MaterialConsumptionDeleted") {
                    summary.totalConsumptionEntries = Math.max(0, summary.totalConsumptionEntries - 1);
                    summary.totalMaterialCost = Math.max(0, summary.totalMaterialCost - (ev.details?.totalCost ?? 0));
                }
                break;
            case "StockTransfer":
                if (ev.action === "StockOutgoing") summary.totalOutgoingTransfers += 1;
                if (ev.action === "StockIncoming") summary.totalIncomingTransfers += 1;
                break;
            case "MaterialRequisition":
                if (ev.refId) mrSeen.add(ev.refId.toString());
                break;
            case "PurchaseOrder":
                if (ev.refId) poSeen.add(ev.refId.toString());
                break;
            case "GRN":
                if (ev.refId) grnSeen.add(ev.refId.toString());
                break;
            case "WorkOrder":
                if (ev.refId) woSeen.add(ev.refId.toString());
                break;
            case "Expense":
                if (ev.action === "ExpenseCreated") {
                    summary.totalExpenseAmount += ev.details?.amount ?? 0;
                }
                if (ev.action === "ExpenseReversed") {
                    summary.totalExpenseAmount = Math.max(0, summary.totalExpenseAmount - (ev.details?.amount ?? 0));
                }
                break;
            default:
                break;
        }
    }

    summary.totalSubTasks = subTaskIdsSeen.size;
    let completedCount = 0;
    let totalPct = 0;
    for (const pct of subTaskProgressMap.values()) {
        totalPct += pct;
        if (pct >= 100) completedCount += 1;
    }
    summary.completedSubTasks = completedCount;
    summary.overallProgressPercent = subTaskProgressMap.size > 0
        ? Math.round(totalPct / subTaskProgressMap.size)
        : 0;

    summary.mrCount = mrSeen.size;
    summary.poCount = poSeen.size;
    summary.grnCount = grnSeen.size;
    summary.woCount = woSeen.size;
    summary.totalMaterialCost = parseFloat(summary.totalMaterialCost.toFixed(2));
    summary.totalExpenseAmount = parseFloat(summary.totalExpenseAmount.toFixed(2));

    return summary;
};



export const pushDprEvent = async ({
    companyId,
    projectId,
    actorId = null,
    actorName = null,
    module,
    action,
    refId = null,
    refNumber = null,
    details = {},
    eventAt = new Date(),
}) => {
    try {
        const reportDate = normalizeToMidnightUTC(eventAt);
        const cId = new mongoose.Types.ObjectId(companyId);
        const pId = new mongoose.Types.ObjectId(projectId);
        const resolvedActorName = actorName
            ? actorName
            : await resolveActorName(actorId);
        const newEvent = {
            _id: new mongoose.Types.ObjectId(),
            actorId: actorId ? new mongoose.Types.ObjectId(actorId) : null,
            actorName: resolvedActorName,
            module,
            action,
            refId: refId ? new mongoose.Types.ObjectId(refId) : null,
            refNumber: refNumber || null,
            details,
            eventAt,
        };
        const dpr = await DPR.findOneAndUpdate(
            { companyId: cId, projectId: pId, reportDate, isDeleted: false },
            {
                $push: { events: newEvent },
                $setOnInsert: {
                    companyId: cId,
                    projectId: pId,
                    reportDate,
                    isDeleted: false,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const freshSummary = recomputeSummary(dpr.events);
        await DPR.updateOne({ _id: dpr._id }, { $set: { summary: freshSummary } });
        logger.info("[DPR] Event pushed", {
            dprId: dpr._id,
            projectId: pId,
            module,
            action,
            actorName: resolvedActorName,
            reportDate,
        });
    } catch (error) {
        logger.error("[DPR] pushDprEvent failed", {
            companyId: companyId?.toString(),
            projectId: projectId?.toString(),
            module,
            action,
            error: error.message,
        });
    }
};



export const MODULE_LABELS = {
    Task: "Task",
    SubTask: "Sub-Task",
    MaterialConsumption: "Material",
    StockTransfer: "Stock Transfer",
    MaterialRequisition: "MR",
    PurchaseOrder: "PO",
    GRN: "GRN",
    WorkOrder: "Work Order",
    Expense: "Expense",
};


export const VALID_MODULES = Object.keys(MODULE_LABELS);

export const ACTION_LABELS = {
    TaskCreated: "Task created",
    TaskUpdated: "Task updated",
    TaskDeleted: "Task deleted",
    SubTaskCreated: "Sub-task created",
    SubTaskUpdated: "Sub-task updated",
    SubTaskDeleted: "Sub-task deleted",
    ProgressUpdated: "Progress updated",
    MaterialConsumed: "Material consumed",
    MaterialConsumptionDeleted: "Consumption reversed",
    StockOutgoing: "Stock outgoing",
    StockIncoming: "Stock incoming",
    StockTransferApproved: "Transfer approved",
    StockTransferRejected: "Transfer rejected",
    MRCreated: "MR created",
    MRSubmitted: "MR submitted",
    MRApproved: "MR approved",
    MRRejected: "MR rejected",
    MRConvertedToPO: "MR converted to PO",
    POCreated: "PO created",
    POSubmitted: "PO submitted",
    POApproved: "PO approved",
    PORejected: "PO rejected",
    POPartiallyDelivered: "PO partially delivered",
    POCompleted: "PO completed",
    POCancelled: "PO cancelled",
    GRNCreated: "GRN created",
    WOCreated: "WO created",
    WOSubmitted: "WO submitted",
    WOApproved: "WO approved",
    WORejected: "WO rejected",
    WOInProgress: "WO in progress",
    WOCompleted: "WO completed",
    WOCancelled: "WO cancelled",
    ExpenseCreated: "Expense recorded",
    ExpenseApproved: "Expense approved",
    ExpenseRejected: "Expense rejected",
    ExpenseReversed: "Expense reversed",
};


const fmtCurrencyInline = (n) =>
    typeof n === "number"
        ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "₹0.00";

export const buildEventDescription = (event) => {
    const d = event.details || {};
    switch (event.action) {
        case "TaskCreated":
            return `Task "${d.taskName || event.refNumber || "—"}" created`;
        case "TaskUpdated":
            return `Task "${d.taskName || event.refNumber || "—"}" updated`;
        case "TaskDeleted":
            return `Task "${d.taskName || event.refNumber || "—"}" deleted`;
        case "SubTaskCreated":
            return `Sub-task "${d.subTaskTitle || event.refNumber || "—"}" created under task "${d.taskName || "—"}"`;
        case "SubTaskUpdated":
            return `Sub-task "${d.subTaskTitle || event.refNumber || "—"}" updated`;
        case "SubTaskDeleted":
            return `Sub-task "${d.subTaskTitle || event.refNumber || "—"}" deleted`;
        case "ProgressUpdated":
            return `Progress of "${d.subTaskTitle || event.refNumber || "—"}" updated to ${d.completionPercent ?? "—"}%${d.previousPercent != null ? ` (was ${d.previousPercent}%)` : ""}`;
        case "MaterialConsumed":
            return `${d.quantityConsumed} ${d.unit} of "${d.materialName || "—"}" consumed${d.totalCost ? ` — ${fmtCurrencyInline(d.totalCost)}` : ""}`;
        case "MaterialConsumptionDeleted":
            return `Consumption of "${d.materialName || "—"}" reversed`;
        case "StockOutgoing":
            return `${d.quantity} ${d.unit} of "${d.materialName || "—"}" transferred out to ${d.counterpartProjectName || "another project"}`;
        case "StockIncoming":
            return `${d.quantity} ${d.unit} of "${d.materialName || "—"}" received from ${d.counterpartProjectName || "another project"}`;
        case "StockTransferApproved":
            return `Stock transfer (${event.refNumber || event.refId}) approved`;
        case "StockTransferRejected":
            return `Stock transfer (${event.refNumber || event.refId}) rejected`;
        case "MRCreated":
            return `MR ${event.refNumber || "—"} created with ${d.itemCount ?? "—"} item(s)`;
        case "MRSubmitted":
            return `MR ${event.refNumber || "—"} submitted for approval`;
        case "MRApproved":
            return `MR ${event.refNumber || "—"} approved`;
        case "MRRejected":
            return `MR ${event.refNumber || "—"} rejected${d.rejectionRemarks ? `: ${d.rejectionRemarks}` : ""}`;
        case "MRConvertedToPO":
            return `MR ${event.refNumber || "—"} converted to PO`;
        case "POCreated":
            return `PO ${event.refNumber || "—"} created for vendor "${d.vendorName || "—"}" — ${fmtCurrencyInline(d.totalOrderValue)}`;
        case "POSubmitted":
            return `PO ${event.refNumber || "—"} submitted for approval`;
        case "POApproved":
            return `PO ${event.refNumber || "—"} approved — ${fmtCurrencyInline(d.totalOrderValue)}`;
        case "PORejected":
            return `PO ${event.refNumber || "—"} rejected`;
        case "POPartiallyDelivered":
            return `PO ${event.refNumber || "—"} partially delivered`;
        case "POCompleted":
            return `PO ${event.refNumber || "—"} completed`;
        case "POCancelled":
            return `PO ${event.refNumber || "—"} cancelled`;
        case "GRNCreated":
            return `GRN ${event.refNumber || "—"} — ${d.itemCount ?? "—"} item(s) received from "${d.vendorName || "—"}"`;
        case "WOCreated":
            return `Work Order ${event.refNumber || "—"} created for "${d.vendorName || "—"}" — ${fmtCurrencyInline(d.totalContractValue)}`;
        case "WOSubmitted":
            return `Work Order ${event.refNumber || "—"} submitted for approval`;
        case "WOApproved":
            return `Work Order ${event.refNumber || "—"} approved — ${fmtCurrencyInline(d.totalContractValue)}`;
        case "WORejected":
            return `Work Order ${event.refNumber || "—"} rejected`;
        case "WOInProgress":
            return `Work Order ${event.refNumber || "—"} marked as In Progress`;
        case "WOCompleted":
            return `Work Order ${event.refNumber || "—"} completed`;
        case "WOCancelled":
            return `Work Order ${event.refNumber || "—"} cancelled`;
        case "ExpenseCreated":
            return `Expense recorded — ${d.category || "—"} — ${fmtCurrencyInline(d.amount)} (${d.type || "—"})`;
        case "ExpenseApproved":
            return `Expense ${event.refNumber || "—"} approved — ${fmtCurrencyInline(d.amount)}`;
        case "ExpenseRejected":
            return `Expense ${event.refNumber || "—"} rejected`;
        case "ExpenseReversed":
            return `Expense reversed — ${d.sourceModel || "—"} ${event.refNumber || ""}${d.reversalReason ? ` — ${d.reversalReason}` : ""}`;
        default:
            return `${ACTION_LABELS[event.action] || event.action}${event.refNumber ? ` — ${event.refNumber}` : ""}`;
    }
};



const C = {
    headerDark: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } },
    headerMid: { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } },
    accent: { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } },
    accentLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } },
    greenLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } },
    amberLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } },
    blueLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } },
    redLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } },
    tealLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } },
    rowAlt: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
    white: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } },
    border: {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    },
};

const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const fmtCurrency = (n) =>
    typeof n === "number"
        ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "₹0.00";

const setCell = (ws, row, col, value, opts = {}) => {
    const cell = ws.getCell(row, col);
    cell.value = value ?? "—";
    cell.font = { name: "Calibri", size: opts.size ?? 10, bold: opts.bold ?? false, color: { argb: opts.color ?? "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: opts.align ?? "left", wrapText: opts.wrap ?? false };
    if (opts.fill) cell.fill = opts.fill;
    if (opts.border) cell.border = opts.border;
};

const mergeHeader = (ws, row, sc, ec, text, fill, color, size = 11) => {
    ws.mergeCells(row, sc, row, ec);
    setCell(ws, row, sc, text, { fill, color, size, bold: true, border: C.border });
};

const addSheetHeader = (ws, title, subTitle, cols) => {
    ws.getRow(1).height = 28;
    mergeHeader(ws, 1, 1, cols, `  ${title}`, C.headerDark, "FFFFFFFF", 13);
    ws.getRow(2).height = 16;
    mergeHeader(ws, 2, 1, cols, `  ${subTitle}`, C.headerMid, "FFCBD5E1", 9);
    return 4;
};

const addTableHeader = (ws, row, colDefs) => {
    ws.getRow(row).height = 16;
    colDefs.forEach(({ label, col, width }) => {
        ws.getColumn(col).width = width || 18;
        setCell(ws, row, col, label, { fill: C.headerMid, bold: true, color: "FFFFFFFF", size: 9, align: "center", border: C.border });
    });
    return row + 1;
};

const noDataRow = (ws, row, colSpan, msg) => {
    ws.mergeCells(row, 1, row, colSpan);
    setCell(ws, row, 1, msg, { fill: C.rowAlt, color: "FF94A3B8", align: "center", border: C.border });
};


export const buildDprWorkbook = async ({ dpr, projectName, projectCode, reportDate }) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CMS - DPR Export";
    wb.created = new Date();
    const summary = dpr.summary || {};
    const events = dpr.events || [];
    const dateLabel = fmtDate(reportDate);
    const subTitle = `Project Code: ${projectCode || "—"}   |   Date: ${dateLabel}   |   Generated: ${new Date().toLocaleString("en-IN")}`;
    {
        const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: "FF6366F1" } } });
        [22, 22, 18, 18, 18, 18, 18, 18].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
        let r = addSheetHeader(ws, `DAILY PROGRESS REPORT — ${projectName}`, subTitle, 8);
        const metrics = [
            { label: "Overall Progress", value: `${summary.overallProgressPercent ?? 0}%`, fill: C.accentLight, color: "FF4F46E5" },
            { label: "Sub-Tasks Touched", value: `${summary.totalSubTasks ?? 0} (${summary.completedSubTasks ?? 0} done)`, fill: C.greenLight, color: "FF059669" },
            { label: "Material Cost", value: fmtCurrency(summary.totalMaterialCost), fill: C.amberLight, color: "FFD97706" },
            { label: "Total Expenses", value: fmtCurrency(summary.totalExpenseAmount), fill: C.redLight, color: "FFDC2626" },
            { label: "MRs Today", value: String(summary.mrCount ?? 0), fill: C.blueLight, color: "FF2563EB" },
            { label: "POs Today", value: String(summary.poCount ?? 0), fill: C.blueLight, color: "FF2563EB" },
            { label: "GRNs Today", value: String(summary.grnCount ?? 0), fill: C.greenLight, color: "FF059669" },
            { label: "Work Orders Today", value: String(summary.woCount ?? 0), fill: C.amberLight, color: "FFD97706" },
        ];
        ws.getRow(r).height = 15;
        metrics.forEach((m, i) => setCell(ws, r, i + 1, m.label, { fill: m.fill, bold: true, color: m.color, size: 8, align: "center", border: C.border }));
        r++;
        ws.getRow(r).height = 24;
        metrics.forEach((m, i) => setCell(ws, r, i + 1, m.value, { fill: m.fill, bold: true, color: m.color, size: 13, align: "center", border: C.border }));
        r += 2;
        mergeHeader(ws, r, 1, 8, "  STOCK MOVEMENTS", C.accent, "FFFFFFFF", 10);
        r++;
        ws.getRow(r).height = 15;
        setCell(ws, r, 1, "Outgoing Transfers", { fill: C.rowAlt, bold: true, size: 9, border: C.border });
        setCell(ws, r, 2, String(summary.totalOutgoingTransfers ?? 0), { fill: C.rowAlt, size: 9, align: "center", border: C.border });
        setCell(ws, r, 3, "Incoming Transfers", { fill: C.rowAlt, bold: true, size: 9, border: C.border });
        setCell(ws, r, 4, String(summary.totalIncomingTransfers ?? 0), { fill: C.rowAlt, size: 9, align: "center", border: C.border });
        r += 2;

        mergeHeader(ws, r, 1, 8,
            `  Total events today: ${summary.totalEvents ?? 0}   |   Consumption entries: ${summary.totalConsumptionEntries ?? 0}   |   Last activity: ${summary.lastActivityAt ? `${fmtDate(summary.lastActivityAt)} ${fmtTime(summary.lastActivityAt)}` : "—"}`,
            C.headerMid, "FFCBD5E1", 9
        );
    }

    {
        const ws = wb.addWorksheet("Event Log", { properties: { tabColor: { argb: "FF334155" } } });
        const COLS = 8;
        let r = addSheetHeader(ws, "FULL EVENT LOG", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "#", col: 1, width: 5 },
            { label: "Time", col: 2, width: 12 },
            { label: "Module", col: 3, width: 16 },
            { label: "Action", col: 4, width: 22 },
            { label: "By", col: 5, width: 20 },
            { label: "Reference", col: 6, width: 20 },
            { label: "Description", col: 7, width: 55 },
            { label: "Event ID", col: 8, width: 26 },
        ]);
        const sorted = [...events].sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        if (!sorted.length) {
            noDataRow(ws, r, COLS, "No events recorded for this date");
        } else {
            sorted.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const alt = idx % 2 === 0 ? C.white : C.rowAlt;
                setCell(ws, r, 1, idx + 1, { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, fmtTime(ev.eventAt), { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 3, MODULE_LABELS[ev.module] || ev.module, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 4, ACTION_LABELS[ev.action] || ev.action, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 5, ev.actorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 6, ev.refNumber || ev.refId?.toString() || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 7, buildEventDescription(ev), { fill: alt, size: 8, wrap: true, border: C.border });
                setCell(ws, r, 8, ev._id?.toString() || "—", { fill: alt, size: 7, color: "FF94A3B8", border: C.border });
                r++;
            });
        }
    }

    {
        const ws = wb.addWorksheet("Task Progress", { properties: { tabColor: { argb: "FF059669" } } });
        const taskEvents = events
            .filter((e) => e.module === "Task" || e.module === "SubTask")
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const COLS = 8;
        let r = addSheetHeader(ws, "TASK & SUB-TASK ACTIVITY", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "Time", col: 1, width: 12 },
            { label: "Action", col: 2, width: 22 },
            { label: "By", col: 3, width: 20 },
            { label: "Task", col: 4, width: 30 },
            { label: "Sub-Task", col: 5, width: 30 },
            { label: "Progress %", col: 6, width: 12 },
            { label: "Previous %", col: 7, width: 12 },
            { label: "Status", col: 8, width: 14 },
        ]);
        if (!taskEvents.length) {
            noDataRow(ws, r, COLS, "No task activity recorded for this date");
        } else {
            taskEvents.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const alt = idx % 2 === 0 ? C.white : C.rowAlt;
                const d = ev.details || {};
                setCell(ws, r, 1, fmtTime(ev.eventAt), { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, ACTION_LABELS[ev.action] || ev.action, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 3, ev.actorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 4, d.taskName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 5, d.subTaskTitle || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 6, d.completionPercent != null ? `${d.completionPercent}%` : "—", { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 7, d.previousPercent != null ? `${d.previousPercent}%` : "—", { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 8, d.status || "—", { fill: alt, size: 8, align: "center", border: C.border });
                r++;
            });
        }
    }

    {
        const ws = wb.addWorksheet("Material", { properties: { tabColor: { argb: "FFD97706" } } });
        const matEvents = events
            .filter((e) => e.module === "MaterialConsumption")
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const COLS = 8;
        let r = addSheetHeader(ws, "MATERIAL CONSUMPTION", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "Time", col: 1, width: 12 },
            { label: "Action", col: 2, width: 22 },
            { label: "By", col: 3, width: 20 },
            { label: "Material", col: 4, width: 30 },
            { label: "Qty", col: 5, width: 10 },
            { label: "Unit", col: 6, width: 10 },
            { label: "Rate (₹)", col: 7, width: 14 },
            { label: "Cost (₹)", col: 8, width: 16 },
        ]);
        let totalCost = 0;
        if (!matEvents.length) {
            noDataRow(ws, r, COLS, "No material consumption recorded for this date");
            r++;
        } else {
            matEvents.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const alt = idx % 2 === 0 ? C.white : C.rowAlt;
                const d = ev.details || {};
                setCell(ws, r, 1, fmtTime(ev.eventAt), { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, ACTION_LABELS[ev.action] || ev.action, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 3, ev.actorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 4, d.materialName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 5, d.quantityConsumed ?? "—", { fill: alt, size: 8, align: "right", border: C.border });
                setCell(ws, r, 6, d.unit || "—", { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 7, d.pricePerUnit != null ? fmtCurrency(d.pricePerUnit) : "—", { fill: alt, size: 8, align: "right", border: C.border });
                setCell(ws, r, 8, d.totalCost != null ? fmtCurrency(d.totalCost) : "—", { fill: alt, size: 8, align: "right", border: C.border });
                if (ev.action === "MaterialConsumed") totalCost += d.totalCost ?? 0;
                r++;
            });
        }
        ws.getRow(r).height = 16;
        ws.mergeCells(r, 1, r, 7);
        setCell(ws, r, 1, "  TOTAL MATERIAL COST", { fill: C.headerDark, bold: true, color: "FFFFFFFF", size: 10, align: "right", border: C.border });
        setCell(ws, r, 8, fmtCurrency(totalCost), { fill: C.headerDark, bold: true, color: "FFFFFFFF", size: 10, align: "right", border: C.border });
    }

    {
        const ws = wb.addWorksheet("Stock Movements", { properties: { tabColor: { argb: "FF0891B2" } } });
        const stockEvents = events
            .filter((e) => e.module === "StockTransfer")
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const COLS = 8;
        let r = addSheetHeader(ws, "STOCK TRANSFER MOVEMENTS", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "Time", col: 1, width: 12 },
            { label: "Direction", col: 2, width: 14 },
            { label: "Material", col: 3, width: 30 },
            { label: "Qty", col: 4, width: 10 },
            { label: "Unit", col: 5, width: 10 },
            { label: "Counterpart Proj", col: 6, width: 28 },
            { label: "By", col: 7, width: 20 },
            { label: "Transfer Ref", col: 8, width: 20 },
        ]);
        if (!stockEvents.length) {
            noDataRow(ws, r, COLS, "No stock movements for this date");
        } else {
            stockEvents.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const isOut = ev.action === "StockOutgoing";
                const fill = isOut ? C.amberLight : C.greenLight;
                const d = ev.details || {};
                setCell(ws, r, 1, fmtTime(ev.eventAt), { fill, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, isOut ? "⬆ Outgoing" : "⬇ Incoming", { fill, size: 8, bold: true, color: isOut ? "FFD97706" : "FF059669", align: "center", border: C.border });
                setCell(ws, r, 3, d.materialName || "—", { fill, size: 8, border: C.border });
                setCell(ws, r, 4, d.quantity ?? "—", { fill, size: 8, align: "right", border: C.border });
                setCell(ws, r, 5, d.unit || "—", { fill, size: 8, align: "center", border: C.border });
                setCell(ws, r, 6, d.counterpartProjectName || "—", { fill, size: 8, border: C.border });
                setCell(ws, r, 7, ev.actorName || "—", { fill, size: 8, border: C.border });
                setCell(ws, r, 8, ev.refNumber || ev.refId?.toString() || "—", { fill, size: 8, border: C.border });
                r++;
            });
        }
    }

    {
        const ws = wb.addWorksheet("Procurement", { properties: { tabColor: { argb: "FF2563EB" } } });
        const procEvents = events
            .filter((e) => ["MaterialRequisition", "PurchaseOrder", "GRN"].includes(e.module))
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const COLS = 8;
        let r = addSheetHeader(ws, "PROCUREMENT ACTIVITY (MR · PO · GRN)", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "Time", col: 1, width: 12 },
            { label: "Module", col: 2, width: 12 },
            { label: "Action", col: 3, width: 22 },
            { label: "Reference #", col: 4, width: 20 },
            { label: "By", col: 5, width: 20 },
            { label: "Vendor", col: 6, width: 22 },
            { label: "Amount (₹)", col: 7, width: 16 },
            { label: "Notes", col: 8, width: 40 },
        ]);
        if (!procEvents.length) {
            noDataRow(ws, r, COLS, "No procurement activity for this date");
        } else {
            procEvents.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const alt = idx % 2 === 0 ? C.white : C.rowAlt;
                const d = ev.details || {};
                const amt = d.totalOrderValue ?? d.amount ?? null;
                setCell(ws, r, 1, fmtTime(ev.eventAt), { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, MODULE_LABELS[ev.module] || ev.module, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 3, ACTION_LABELS[ev.action] || ev.action, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 4, ev.refNumber || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 5, ev.actorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 6, d.vendorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 7, amt != null ? fmtCurrency(amt) : "—", { fill: alt, size: 8, align: "right", border: C.border });
                setCell(ws, r, 8, buildEventDescription(ev), { fill: alt, size: 8, wrap: true, border: C.border });
                r++;
            });
        }
    }

    {
        const ws = wb.addWorksheet("Work Orders", { properties: { tabColor: { argb: "FF7C3AED" } } });
        const woEvents = events
            .filter((e) => e.module === "WorkOrder")
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const COLS = 8;
        let r = addSheetHeader(ws, "WORK ORDER ACTIVITY", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "Time", col: 1, width: 12 },
            { label: "Action", col: 2, width: 22 },
            { label: "WO Number", col: 3, width: 18 },
            { label: "Title", col: 4, width: 28 },
            { label: "Vendor", col: 5, width: 22 },
            { label: "Contract Value", col: 6, width: 16 },
            { label: "By", col: 7, width: 20 },
            { label: "Status", col: 8, width: 14 },
        ]);
        if (!woEvents.length) {
            noDataRow(ws, r, COLS, "No work order activity for this date");
        } else {
            woEvents.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const alt = idx % 2 === 0 ? C.white : C.rowAlt;
                const d = ev.details || {};
                setCell(ws, r, 1, fmtTime(ev.eventAt), { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, ACTION_LABELS[ev.action] || ev.action, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 3, ev.refNumber || d.woNumber || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 4, d.title || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 5, d.vendorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 6, d.totalContractValue != null ? fmtCurrency(d.totalContractValue) : "—", { fill: alt, size: 8, align: "right", border: C.border });
                setCell(ws, r, 7, ev.actorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 8, d.status || "—", { fill: alt, size: 8, align: "center", border: C.border });
                r++;
            });
        }
    }

    {
        const ws = wb.addWorksheet("Expenses", { properties: { tabColor: { argb: "FFDC2626" } } });
        const expEvents = events
            .filter((e) => e.module === "Expense")
            .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
        const COLS = 8;
        let r = addSheetHeader(ws, "EXPENSE ACTIVITY", `${projectName} — ${dateLabel}`, COLS);
        r = addTableHeader(ws, r, [
            { label: "Time", col: 1, width: 12 },
            { label: "Action", col: 2, width: 20 },
            { label: "Reference #", col: 3, width: 20 },
            { label: "Type", col: 4, width: 20 },
            { label: "Category", col: 5, width: 16 },
            { label: "Vendor", col: 6, width: 22 },
            { label: "Amount (₹)", col: 7, width: 16 },
            { label: "By", col: 8, width: 20 },
        ]);
        let totalExpense = 0;
        if (!expEvents.length) {
            noDataRow(ws, r, COLS, "No expense activity for this date");
            r++;
        } else {
            expEvents.forEach((ev, idx) => {
                ws.getRow(r).height = 15;
                const alt = idx % 2 === 0 ? C.white : C.rowAlt;
                const d = ev.details || {};
                setCell(ws, r, 1, fmtTime(ev.eventAt), { fill: alt, size: 8, align: "center", border: C.border });
                setCell(ws, r, 2, ACTION_LABELS[ev.action] || ev.action, { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 3, ev.refNumber || d.expenseNumber || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 4, (d.type || "—").replace(/_/g, " "), { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 5, d.category || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 6, d.vendorName || "—", { fill: alt, size: 8, border: C.border });
                setCell(ws, r, 7, d.amount != null ? fmtCurrency(d.amount) : "—", { fill: alt, size: 8, align: "right", border: C.border });
                setCell(ws, r, 8, ev.actorName || "—", { fill: alt, size: 8, border: C.border });
                if (ev.action === "ExpenseCreated") totalExpense += d.amount ?? 0;
                r++;
            });
        }
        ws.getRow(r).height = 16;
        ws.mergeCells(r, 1, r, 6);
        setCell(ws, r, 1, "  TOTAL EXPENSES RECORDED TODAY", { fill: C.headerDark, bold: true, color: "FFFFFFFF", size: 10, align: "right", border: C.border });
        setCell(ws, r, 7, fmtCurrency(totalExpense), { fill: C.headerDark, bold: true, color: "FFFFFFFF", size: 10, align: "right", border: C.border });
    }

    return wb;
};