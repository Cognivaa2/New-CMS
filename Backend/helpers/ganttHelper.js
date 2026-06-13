import mongoose from "mongoose";
import ExcelJS from "exceljs";
import Project from "../models/project.models.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Company from "../models/company.models.js";
import ApiErrors from "../utils/ApiErrors.js";


export const resolveCompany = async (companyUUID) => {
    if (!companyUUID) {
        throw new ApiErrors(400, "x-company-id header is required");
    }
    const company = await Company.findOne({
        companyId: companyUUID,
        isDeleted: false,
    }).lean();
    if (!company) {
        throw new ApiErrors(404, "Company not found");
    }
    return company;
};


export const resolveProject = async (projectId, companyId) => {
    if (!projectId) {
        throw new ApiErrors(400, "projectId is required");
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiErrors(400, "Invalid projectId format");
    }
    const project = await Project.findOne({
        _id: projectId,
        companyId,
        isDeleted: false,
    }).lean();
    if (!project) {
        throw new ApiErrors(404, "Project not found");
    }
    return project;
};


export const buildGanttPayload = async (project) => {
    const projectId = project._id;
    const phases = await Phase.find({ projectId, isDeleted: false })
        .sort({ sequence: 1 })
        .lean();
    if (!phases.length) {
        return {
            project: formatProject(project),
            phases: [],
        };
    }
    const phaseIds = phases.map((p) => p._id);
    const tasks = await Task.find({
        projectId,
        phaseId: { $in: phaseIds },
        isDeleted: false,
    })
        .sort({ createdAt: 1 })
        .lean();
    const taskIds = tasks.map((t) => t._id);
    const subTasks = await SubTask.find({
        projectId,
        taskId: { $in: taskIds },
        isDeleted: false,
    })
        .sort({ createdAt: 1 })
        .lean();
    const tasksByPhase = tasks.reduce((acc, task) => {
        const key = task.phaseId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {});
    const subTasksByTask = subTasks.reduce((acc, sub) => {
        const key = sub.taskId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(sub);
        return acc;
    }, {});
    const formattedPhases = phases.map((phase) => {
        const phaseTasks = (tasksByPhase[phase._id.toString()] || []).map((task) => {
            const taskSubTasks = (
                subTasksByTask[task._id.toString()] || []
            ).map(formatSubTask);

            return {
                ...formatTask(task),
                subTasks: taskSubTasks,
            };
        });
        return {
            ...formatPhase(phase),
            tasks: phaseTasks,
        };
    });
    return {
        project: formatProject(project),
        phases: formattedPhases,
    };
};



const formatProject = (p) => ({
    _id: p._id,
    projectName: p.projectName,
    startDate: p.startDate || null,
    endDate: p.endDate || null,
    completionPercent: p.completionPercent ?? 0,
    status: p.status || null,
});

const formatPhase = (p) => ({
    _id: p._id,
    phaseName: p.phaseName,
    sequence: p.sequence,
    startDate: p.startDate || null,
    endDate: p.endDate || null,
    completionPercent: p.completionPercent ?? 0,
    status: p.status || null,
});

const formatTask = (t) => ({
    _id: t._id,
    taskName: t.taskName,
    phaseId: t.phaseId,
    startDate: t.startDate || null,
    endDate: t.endDate || null,
    completionPercent: t.completionPercent ?? 0,
    status: t.status || null,
    priority: t.priority || null,
});

const formatSubTask = (s) => ({
    _id: s._id,
    subTaskName: s.title,
    taskId: s.taskId,
    startDate: s.startDate || null,
    endDate: s.endDate || null,
    completionPercent: s.completionPercent ?? 0,
    status: s.status || null,
    priority: s.priority || null,
});


const COLORS = {
    headerBg: "FF0F172A",
    headerFg: "FFFFFFFF",
    weekendHdrBg: "FF1E293B",
    weekendHdrFg: "FF64748B",

    weekendBarBg: "FFF8FAFC",
    projectBg: "FFE0F2FE",
    projectFg: "FF075985",
    projectAccent: "FF0EA5E9",

    phaseBg: "FFEDE9FE",
    phaseFg: "FF3730A3",
    phaseAccent: "FF6366F1",

    taskBg: "FFFFF1F2",
    taskFg: "FF9F1239",
    taskAccent: "FFF43F5E",

    subTaskBg: "FFFFFBEB",
    subTaskFg: "FF92400E",
    subTaskAccent: "FFF59E0B",

    projectBar: "FF0EA5E9",
    phaseBar: "FF6366F1",
    taskBar: "FFF43F5E",
    subTaskBar: "FFF59E0B",

    border: "FFE2E8F0",
    headerBorder: "FF1E293B",
};


const toDay = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
};


const daysBetween = (a, b) =>
    Math.round((b - a) / 86_400_000);


const addDays = (d, n) =>
    new Date(d.getTime() + n * 86_400_000);


const monthShort = (d) =>
    d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });


const isWeekend = (d) => {
    const wd = d.getUTCDay();
    return wd === 0 || wd === 6;
};


const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB");
};


const collectTimelineRange = (ganttPayload) => {
    const dates = [];
    const push = (d) => { const t = toDay(d); if (t) dates.push(t); };
    const { project, phases } = ganttPayload;
    push(project.startDate);
    push(project.endDate);
    phases.forEach((ph) => {
        push(ph.startDate); push(ph.endDate);
        ph.tasks.forEach((tk) => {
            push(tk.startDate); push(tk.endDate);
            tk.subTasks.forEach((st) => {
                push(st.startDate); push(st.endDate);
            });
        });
    });
    if (!dates.length) return { start: toDay(new Date()), days: [] };
    const minMs = Math.min(...dates.map((d) => d.getTime()));
    const maxMs = Math.max(...dates.map((d) => d.getTime()));
    const paddedStart = addDays(new Date(minMs), -3);
    const paddedEnd = addDays(new Date(maxMs), 3);
    const totalDays = daysBetween(paddedStart, paddedEnd) + 1;
    const days = Array.from({ length: totalDays }, (_, i) =>
        addDays(paddedStart, i)
    );
    return { start: paddedStart, days };
};


const solidFill = (argb) => ({
    type: "pattern", pattern: "solid", fgColor: { argb },
});


const styleNameCell = (cell, bg, fg, accent, bold = false) => {
    cell.fill = solidFill(bg);
    cell.font = { color: { argb: fg }, bold, size: 10, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
    cell.border = {
        left: { style: "medium", color: { argb: accent } },
        right: { style: "thin", color: { argb: COLORS.border } },
        bottom: { style: "thin", color: { argb: COLORS.border } },
        top: { style: "thin", color: { argb: COLORS.border } },
    };
};


const styleDataCell = (cell, bg, fg, bold = false, align = "center") => {
    cell.fill = solidFill(bg);
    cell.font = { color: { argb: fg }, bold, size: 9, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: align, wrapText: false };
    cell.border = {
        right: { style: "thin", color: { argb: COLORS.border } },
        bottom: { style: "thin", color: { argb: COLORS.border } },
        top: { style: "thin", color: { argb: COLORS.border } },
    };
};


const styleBarCell = (cell, barArgb, inRange, weekend) => {
    cell.fill = solidFill(
        inRange ? barArgb : weekend ? COLORS.weekendBarBg : "FFFFFFFF"
    );
    cell.border = {
        bottom: { style: "hair", color: { argb: COLORS.border } },
        right: { style: "hair", color: { argb: COLORS.border } },
    };
};


const LEFT_COLS = 5;
const LEFT_WIDTHS = [32, 10, 13, 13, 7];
const DAY_WIDTH = 2.6;


export const buildGanttWorkbook = async (ganttPayload) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "CMS – Gantt Export";
    wb.created = new Date();
    const ws = wb.addWorksheet("Gantt Chart", {
        views: [{
            state: "frozen",
            xSplit: LEFT_COLS,
            ySplit: 2,
        }],
        properties: { tabColor: { argb: "FF6366F1" } },
    });


    LEFT_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const { start: tlStart, days } = collectTimelineRange(ganttPayload);

    if (!days.length) {
        ws.addRow(["No date information available for this project."]);
        return wb;
    }

    days.forEach((_, i) => { ws.getColumn(LEFT_COLS + 1 + i).width = DAY_WIDTH; });


    const monthRow = ws.getRow(1);
    monthRow.height = 20;
    ["Name", "Type", "Start", "End", "%"].forEach((label, i) => {
        const cell = monthRow.getCell(i + 1);
        cell.value = label;
        cell.fill = solidFill(COLORS.headerBg);
        cell.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11, name: "Calibri" };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            right: { style: "thin", color: { argb: COLORS.headerBorder } },
            bottom: { style: "medium", color: { argb: COLORS.headerBorder } },
        };
    });

    let mGroupStart = LEFT_COLS + 1;
    let mGroupRefIdx = 0;
    let curMonth = days[0].getUTCMonth();
    let curYear = days[0].getUTCFullYear();

    const flushMonth = (endCol, refIdx) => {
        const label = `${monthShort(days[refIdx])} ${days[refIdx].getUTCFullYear()}`;
        const cell = monthRow.getCell(mGroupStart);
        cell.value = label;
        cell.fill = solidFill(COLORS.headerBg);
        cell.font = { color: { argb: COLORS.headerFg }, bold: true, size: 10, name: "Calibri" };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            left: { style: "medium", color: { argb: COLORS.headerBorder } },
            right: { style: "medium", color: { argb: COLORS.headerBorder } },
            bottom: { style: "thin", color: { argb: COLORS.headerBorder } },
        };
        if (endCol > mGroupStart) {
            ws.mergeCells(1, mGroupStart, 1, endCol);
        }
    };

    days.forEach((day, i) => {
        const col = LEFT_COLS + 1 + i;
        const mon = day.getUTCMonth();
        const yr = day.getUTCFullYear();
        if (mon !== curMonth || yr !== curYear) {
            flushMonth(col - 1, mGroupRefIdx);
            mGroupStart = col;
            mGroupRefIdx = i;
            curMonth = mon;
            curYear = yr;
        }
        if (i === days.length - 1) {
            flushMonth(col, mGroupRefIdx);
        }
    });


    const dayRow = ws.getRow(2);
    dayRow.height = 15;
    ["Name", "Type", "Start", "End", "%"].forEach((_, i) => {
        const cell = dayRow.getCell(i + 1);
        cell.value = "";
        cell.fill = solidFill(COLORS.headerBg);
        cell.border = {
            right: { style: "thin", color: { argb: COLORS.headerBorder } },
            bottom: { style: "medium", color: { argb: COLORS.headerBorder } },
        };
    });

    days.forEach((day, i) => {
        const col = LEFT_COLS + 1 + i;
        const cell = dayRow.getCell(col);
        const wknd = isWeekend(day);
        cell.value = day.getUTCDate();
        cell.fill = solidFill(wknd ? COLORS.weekendHdrBg : COLORS.headerBg);
        cell.font = {
            color: { argb: wknd ? COLORS.weekendHdrFg : COLORS.headerFg },
            size: 7, bold: false, name: "Calibri",
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            right: { style: "hair", color: { argb: COLORS.headerBorder } },
            bottom: { style: "medium", color: { argb: COLORS.headerBorder } },
        };
    });


    const addGanttRow = ({
        label, type, startDate, endDate, pct,
        bg, fg, accent, barColor,
        bold, rowHeight, indent,
    }) => {
        const row = ws.addRow([]);
        row.height = rowHeight;
        const nameCell = row.getCell(1);
        nameCell.value = `${"  ".repeat(indent)}${label}`;
        styleNameCell(nameCell, bg, fg, accent, bold);

        const typeCell = row.getCell(2);
        typeCell.value = type;
        styleDataCell(typeCell, bg, fg);

        const startCell = row.getCell(3);
        startCell.value = fmtDate(startDate);
        styleDataCell(startCell, bg, fg);

        const endCell = row.getCell(4);
        endCell.value = fmtDate(endDate);
        styleDataCell(endCell, bg, fg);

        const pctCell = row.getCell(5);
        pctCell.value = `${pct}%`;
        styleDataCell(pctCell, bg, fg, true);

        let barStartIdx = -1;
        let barEndIdx = -1;

        if (startDate && endDate) {
            const s = toDay(startDate);
            const e = toDay(endDate);
            if (s && e) {
                barStartIdx = daysBetween(tlStart, s);
                barEndIdx = daysBetween(tlStart, e);
                barStartIdx = Math.max(0, barStartIdx);
                barEndIdx = Math.min(days.length - 1, barEndIdx);
            }
        }

        days.forEach((day, i) => {
            const col = LEFT_COLS + 1 + i;
            const cell = row.getCell(col);
            const inRange = barStartIdx >= 0 && i >= barStartIdx && i <= barEndIdx;
            const wknd = isWeekend(day);

            styleBarCell(cell, barColor, inRange, wknd);

            if (inRange && i === barStartIdx) {
                cell.value = `  ${label}  ${pct}%`;
                cell.font = {
                    color: { argb: "FFFFFFFF" },
                    bold: true, size: 8, name: "Calibri",
                };
                cell.alignment = { vertical: "middle", horizontal: "left" };
            }
        });
    };


    const { project, phases } = ganttPayload;

    addGanttRow({
        label: project.projectName,
        type: "Project",
        startDate: project.startDate,
        endDate: project.endDate,
        pct: project.completionPercent ?? 0,
        bg: COLORS.projectBg,
        fg: COLORS.projectFg,
        accent: COLORS.projectAccent,
        barColor: COLORS.projectBar,
        bold: true,
        rowHeight: 22,
        indent: 0,
    });

    phases.forEach((phase) => {
        addGanttRow({
            label: phase.phaseName,
            type: "Phase",
            startDate: phase.startDate,
            endDate: phase.endDate,
            pct: phase.completionPercent ?? 0,
            bg: COLORS.phaseBg,
            fg: COLORS.phaseFg,
            accent: COLORS.phaseAccent,
            barColor: COLORS.phaseBar,
            bold: true,
            rowHeight: 20,
            indent: 1,
        });

        phase.tasks.forEach((task) => {
            addGanttRow({
                label: task.taskName,
                type: "Task",
                startDate: task.startDate,
                endDate: task.endDate,
                pct: task.completionPercent ?? 0,
                bg: COLORS.taskBg,
                fg: COLORS.taskFg,
                accent: COLORS.taskAccent,
                barColor: COLORS.taskBar,
                bold: false,
                rowHeight: 18,
                indent: 2,
            });

            task.subTasks.forEach((sub) => {
                const subLabel = sub.subTaskName
                addGanttRow({
                    label: subLabel,
                    type: "SubTask",
                    startDate: sub.startDate,
                    endDate: sub.endDate,
                    pct: sub.completionPercent ?? 0,
                    bg: COLORS.subTaskBg,
                    fg: COLORS.subTaskFg,
                    accent: COLORS.subTaskAccent,
                    barColor: COLORS.subTaskBar,
                    bold: false,
                    rowHeight: 16,
                    indent: 3,
                });
            });
        });
    });

    ws.autoFilter = {
        from: { row: 2, column: 1 },
        to: { row: 2, column: LEFT_COLS },
    };

    return wb;
};