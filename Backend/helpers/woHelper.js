import mongoose from "mongoose";
import WorkOrder from "../models/workOrder.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Role from "../models/role.models.js";
import Vendor from "../models/vendors.models.js";
import SubTask from "../models/subTask.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import keycloakService from "../services/keycloak.service.js";
import PDFDocument from "pdfkit";
import axios from "axios";
// import {
//     convertMilestoneCommitmentToActual,
//     convertWOCommitmentToActual,
//     recalcProjectHealth,
// } from "./expenseHelper.js";


export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const resolveCompany = async (companyUUID) => {
    return await Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
};

export const resolveUserByKeycloak = async (keycloakId, companyId) => {
    return await User.findOne({
        keycloakId: keycloakId.trim(),
        companyId,
        isDeleted: false,
    }).lean();
};



export const generateWONumber = async (companyId) => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `WO-${yyyymm}-`;
    const last = await WorkOrder.findOne(
        { companyId, woNumber: { $regex: `^${prefix}` } },
        { woNumber: 1 },
        { sort: { woNumber: -1 } }
    ).lean();
    let seq = 1;
    if (last?.woNumber) {
        const parts = last.woNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
};



export const processWorkItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            error: new ApiErrors(400, "Validation Error", "Work Order must contain at least one work item"),
        };
    }
    const processedItems = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const idx = `workItems[${i}]`;
        if (!item.description?.trim()) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.description is required`) };
        }
        if (!item.unit?.trim()) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.unit is required`) };
        }
        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.quantity must be a positive number`) };
        }
        const rate = Number(item.unitRate);
        if (isNaN(rate) || rate < 0) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.unitRate must be a non-negative number`) };
        }
        const amount = parseFloat((qty * rate).toFixed(2));
        processedItems.push({
            description: item.description.trim(),
            unit: item.unit.trim(),
            quantity: qty,
            unitRate: rate,
            amount,
            remarks: item.remarks?.trim() || null,
        });
    }
    return { processedItems };
};



export const processMilestones = (milestones, totalContractValue) => {
    if (!Array.isArray(milestones) || milestones.length === 0) {
        return { error: new ApiErrors(400, "Validation Error", "At least one milestone is required when hasMilestones is true") };
    }
    const processedMilestones = [];
    const triggerPercents = new Set();
    let totalPaymentPercent = 0;
    for (let i = 0; i < milestones.length; i++) {
        const ms = milestones[i];
        const idx = `milestones[${i}]`;
        if (!ms.title?.trim()) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.title is required`) };
        }
        const trigger = Number(ms.triggerPercent);
        if (isNaN(trigger) || trigger < 1 || trigger > 100) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.triggerPercent must be between 1 and 100`) };
        }
        if (triggerPercents.has(trigger)) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.triggerPercent ${trigger}% is duplicated — each milestone must have a unique trigger percentage`) };
        }
        triggerPercents.add(trigger);
        const payPct = Number(ms.paymentPercent);
        if (isNaN(payPct) || payPct <= 0 || payPct > 100) {
            return { error: new ApiErrors(400, "Validation Error", `${idx}.paymentPercent must be between 0.01 and 100`) };
        }
        totalPaymentPercent += payPct;
        const paymentAmount = parseFloat(((payPct / 100) * totalContractValue).toFixed(2));
        processedMilestones.push({
            title: ms.title.trim(),
            triggerPercent: trigger,
            paymentPercent: payPct,
            paymentAmount,
            status: "Pending",
            triggeredAt: null,
        });
    }
    if (Math.abs(totalPaymentPercent - 100) > 0.01) {
        return {
            error: new ApiErrors(400, "Milestone Payment Mismatch", `The sum of all milestone paymentPercent values must equal 100%. Current total: ${totalPaymentPercent.toFixed(2)}%`),
        };
    }
    processedMilestones.sort((a, b) => a.triggerPercent - b.triggerPercent);
    return { processedMilestones };
};



// export const recalculateWOProgress = async (workOrderId, triggeredByUserId = null) => {
//     const wo = await WorkOrder.findOne({ _id: workOrderId, isDeleted: false });
//     if (!wo) return null;
//     if (!["Approved", "InProgress"].includes(wo.status)) return null;
//     const linkedSubTasks = await SubTask.find({
//         workOrderId: new mongoose.Types.ObjectId(workOrderId),
//         isDeleted: false,
//     }).select("completionPercent").lean();
//     let newPercent = 0;
//     if (linkedSubTasks.length > 0) {
//         const total = linkedSubTasks.reduce((sum, st) => sum + (st.completionPercent || 0), 0);
//         newPercent = Math.round(total / linkedSubTasks.length);
//     }
//     const updates = { completionPercent: newPercent };
//     const prevStatus = wo.status;
//     if (newPercent === 100 && wo.status === "InProgress") {
//         updates.status = "Completed";
//         updates.completedAt = new Date();
//         updates.actualEndDate = new Date();
//     }
//     let newlyTriggeredMilestones = [];
//     if (wo.hasMilestones && Array.isArray(wo.milestones) && wo.milestones.length > 0) {
//         const updatedMilestones = wo.milestones.map((ms) => {
//             if (ms.status === "Pending" && newPercent >= ms.triggerPercent) {
//                 newlyTriggeredMilestones.push(ms.toObject ? ms.toObject() : ms);
//                 return {
//                     ...(ms.toObject ? ms.toObject() : ms),
//                     status: "Triggered",
//                     triggeredAt: new Date(),
//                 };
//             }
//             return ms.toObject ? ms.toObject() : ms;
//         });
//         updates.milestones = updatedMilestones;
//     }
//     await WorkOrder.findByIdAndUpdate(workOrderId, { $set: updates });
//     for (const ms of newlyTriggeredMilestones) {
//         try {
//             await convertMilestoneCommitmentToActual({
//                 sourceId: wo._id,
//                 milestoneId: ms._id,
//                 resolvedBy: triggeredByUserId,
//                 resolvedReason: `Milestone "${ms.title}" triggered at ${newPercent}% (auto)`,
//             });
//         } catch (err) {
//             logger.error("[recalculateWOProgress] milestone expense conversion failed", {
//                 workOrderId, milestoneId: ms._id, error: err.message,
//             });
//         }
//     }
//     if (updates.status === "Completed" && !wo.hasMilestones) {
//         try {
//             await convertWOCommitmentToActual({
//                 sourceId: wo._id,
//                 resolvedBy: triggeredByUserId,
//                 resolvedReason: `WO ${wo.woNumber} auto-completed via task progress`,
//             });
//         } catch (err) {
//             logger.error("[recalculateWOProgress] WO commitment conversion failed", {
//                 workOrderId, error: err.message,
//             });
//         }
//     }
//     if (updates.status && updates.status !== prevStatus) {
//         recalcProjectHealth(wo.projectId.toString(), wo.companyId.toString()).catch(() => { });
//     }
//     return {
//         _id: wo._id,
//         _prevStatus: prevStatus,
//         status: updates.status || wo.status,
//         completionPercent: newPercent,
//     };
// };


const getKcProfile = async (keycloakId) => {
    try {
        const kc = await keycloakService.getUserById(keycloakId);
        return {
            name: kc?.attributes?.name?.[0] || kc?.firstName || "Unknown",
            email: kc?.email || null,
            avatar: kc?.attributes?.avatar?.[0] || null,
        };
    } catch {
        return { name: "Unknown", email: null, avatar: null };
    }
};


const enrichUser = async (mongoUserId) => {
    if (!mongoUserId) return null;
    try {
        const user = await User.findById(mongoUserId).select("_id keycloakId roleId").lean();
        if (!user) return null;
        const profile = await getKcProfile(user.keycloakId);
        let roleName = null;
        if (user.roleId) {
            const role = await Role.findOne({ _id: user.roleId, isDeleted: false }).lean();
            roleName = role?.roleName || null;
        }
        return {
            id: user._id,
            keycloakId: user.keycloakId,
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: roleName,
        };
    } catch {
        return null;
    }
};


export const enrichWOUsers = async (wo) => {
    if (!wo) return wo;
    const [
        createdBy, updatedBy, submittedBy, approvedBy,
        rejectedBy, cancelledBy, inProgressBy, completedBy, deletedBy,
    ] = await Promise.all([
        enrichUser(wo.createdBy),
        enrichUser(wo.updatedBy),
        enrichUser(wo.submittedBy),
        enrichUser(wo.approvedBy),
        enrichUser(wo.rejectedBy),
        enrichUser(wo.cancelledBy),
        enrichUser(wo.inProgressBy),
        enrichUser(wo.completedBy),
        enrichUser(wo.deletedBy),
    ]);
    return {
        ...wo,
        createdBy, updatedBy, submittedBy, approvedBy,
        rejectedBy, cancelledBy, inProgressBy, completedBy, deletedBy,
    };
};

const C = {
    black: "#000000",
    dark: "#000000",
    mid: "#000000",
    muted: "#444444",
    light: "#000000",
    border: "#000000",
    borderFaint: "#000000",
    rowAlt: "#FFFFFF",
    headerBg: "#FFFFFF",
    accent: "#000000",
    accentLight: "#FFFFFF",
    negative: "#000000",
    white: "#FFFFFF",
};
const F = {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
};
const PW = 595.28;
const PH = 841.89;
const MX = 44;
const CW = PW - MX * 2;
const MT = 44;
const MB = 44;
const FZONE = 26;


async function fetchImageBuffer(url) {
    if (!url) return null;
    try {
        const r = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
        return Buffer.from(r.data);
    } catch { return null; }
}

function fmt(d) {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCurrency(n) {
    if (n === null || n === undefined || isNaN(n)) return null;
    return `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtN(n, dp = 3) {
    if (n === null || n === undefined || isNaN(n)) return null;
    const num = Number(n);
    const isInteger = Number.isInteger(num);
    return num.toLocaleString("en-IN", {
        minimumFractionDigits: isInteger ? 0 : dp,
        maximumFractionDigits: isInteger ? 0 : dp,
    });
}

function fillRect(doc, x, y, w, h, color) {
    doc.save().rect(x, y, w, h).fill(color).restore();
}

function strokeRect(doc, x, y, w, h, color = C.border, lw = 0.3) {
    doc.save().rect(x, y, w, h).lineWidth(lw).stroke(color).restore();
}

function hLine(doc, x1, x2, y, color = C.border, lw = 0.3) {
    doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
}

function vLine(doc, x, y1, y2, color = C.border, lw = 0.3) {
    doc.save().moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke(color).restore();
}

function absText(doc, text, x, y, opts = {}) {
    doc.save();
    const isNA = !text || text === "—" || text === "Not Available";
    const fontStr = isNA ? F.italic : (opts.font || F.regular);
    const colorStr = isNA ? C.muted : (opts.color || C.dark);
    const opacityStr = isNA ? 0.55 : (opts.opacity || 1);

    doc.font(fontStr)
        .fontSize(opts.size || 9)
        .fillColor(colorStr)
        .fillOpacity(opacityStr);

    doc.text(isNA ? "Not Available" : String(text), x, y, {
        width: opts.width, align: opts.align || "left", lineBreak: opts.lineBreak !== false,
    });
    if (isNA) {
        doc.fillOpacity(1);
    }
    doc.restore();
}

function drawInitials(doc, name, x, y, size) {
    const init = (name || "CO").split(/\s+/).slice(0, 2).map((w) => (w[0] || "").toUpperCase()).join("");
    fillRect(doc, x, y, size, size, C.headerBg);
    strokeRect(doc, x, y, size, size, C.border, 0.3);
    absText(doc, init, x, y + size * 0.28, { font: F.bold, size: size * 0.34, color: C.mid, width: size, align: "center" });
}

function textH(doc, text, w, font, size) {
    doc.save();
    const isNA = !text || text === "—" || text === "Not Available";
    const fontStr = isNA ? F.italic : font;
    doc.font(fontStr).fontSize(size);
    const h = doc.heightOfString(isNA ? "Not Available" : String(text), { width: w });
    doc.restore();
    return h;
}

function space(doc, y, needed, ctx) {
    if (y + needed > PH - MB - FZONE) {
        drawFooter(doc, ctx);
        doc.addPage();
        ctx.page += 1;
        return MT;
    }
    return y;
}

function drawFooter(doc, ctx) {
    const fy = PH - MB + 4;
    hLine(doc, MX, MX + CW, fy - 2, C.border, 0.3);
    absText(doc, `${ctx.companyName}  ·  ${ctx.docLabel}  ·  Subject to Kolkata jurisdiction`, MX, fy + 4, { size: 7, color: C.muted, width: CW * 0.65 });
    absText(doc, `Generated ${new Date().toLocaleString("en-IN")}`, MX + CW * 0.65, fy + 4, { size: 7, color: C.muted, width: CW * 0.17, align: "center" });
    absText(doc, `Page ${ctx.page}`, MX + CW * 0.82, fy + 4, { size: 7, color: C.muted, width: CW * 0.18, align: "right" });
}

function sectionLabel(doc, y, text) {
    absText(doc, text, MX, y, { font: F.bold, size: 7.5, color: C.black });
    y += 11;
    return y + 7;
}

function measureBlockHeight(doc, items, width) {
    let h = 0;
    doc.save();
    items.forEach(item => {
        if (item.type === "title") {
            doc.font(F.bold).fontSize(7.5);
            h += doc.heightOfString(item.text, { width }) + 2;
        } else if (item.type === "header") {
            doc.font(F.bold).fontSize(9.5);
            h += doc.heightOfString(item.text, { width }) + 3;
        } else if (item.type === "pair") {
            const valStr = item.value || "Not Available";
            const LBL_MAX_W = 85;
            const valW = width - LBL_MAX_W;
            const isNA = !item.value;
            doc.font(isNA ? F.italic : F.regular).fontSize(8);
            const valH = doc.heightOfString(valStr, { width: valW });
            h += Math.max(10, valH) + 2;
        } else if (item.type === "text") {
            const textStr = item.text || "Not Available";
            const isNA = !item.text;
            doc.font(isNA ? F.italic : (item.bold ? F.bold : F.regular)).fontSize(item.size || 8);
            h += doc.heightOfString(textStr, { width }) + 2;
        }
    });
    doc.restore();
    return h;
}

function drawBlock(doc, items, x, y, width) {
    let currentY = y;
    doc.save();
    items.forEach(item => {
        if (item.type === "title") {
            doc.font(F.bold).fontSize(7.5).fillColor(C.black);
            const th = doc.heightOfString(item.text, { width });
            doc.text(item.text, x, currentY, { width });
            currentY += th + 2;
        } else if (item.type === "header") {
            doc.font(F.bold).fontSize(9.5).fillColor(C.black);
            const th = doc.heightOfString(item.text, { width });
            doc.text(item.text, x, currentY, { width });
            currentY += th + 3;
        } else if (item.type === "pair") {
            const labelStr = item.label;
            const valStr = item.value || "Not Available";
            const LBL_MAX_W = 85;

            doc.font(F.bold).fontSize(8).fillColor(C.black);
            doc.text(labelStr, x, currentY, { width: LBL_MAX_W - 10 });
            doc.text(":", x + LBL_MAX_W - 8, currentY);

            if (item.value) {
                doc.font(F.regular).fontSize(8).fillColor(C.black);
                const valH = doc.heightOfString(valStr, { width: width - LBL_MAX_W });
                doc.text(valStr, x + LBL_MAX_W, currentY, { width: width - LBL_MAX_W });
                currentY += Math.max(10, valH) + 2;
            } else {
                doc.font(F.italic).fontSize(8).fillColor(C.muted).fillOpacity(0.55);
                const valH = doc.heightOfString(valStr, { width: width - LBL_MAX_W });
                doc.text(valStr, x + LBL_MAX_W, currentY, { width: width - LBL_MAX_W });
                doc.fillOpacity(1);
                currentY += Math.max(10, valH) + 2;
            }
        } else if (item.type === "text") {
            const textStr = item.text || "Not Available";
            if (item.text) {
                doc.font(item.bold ? F.bold : F.regular).fontSize(item.size || 8).fillColor(C.black);
                const th = doc.heightOfString(textStr, { width });
                doc.text(textStr, x, currentY, { width });
                currentY += th + 2;
            } else {
                doc.font(F.italic).fontSize(item.size || 8).fillColor(C.muted).fillOpacity(0.55);
                const th = doc.heightOfString(textStr, { width });
                doc.text(textStr, x, currentY, { width });
                doc.fillOpacity(1);
                currentY += th + 2;
            }
        }
    });
    doc.restore();
}

function measureFieldHeight(doc, label, value, width) {
    doc.save();
    doc.font(F.bold).fontSize(7.5);
    const lblH = doc.heightOfString(label, { width }) + 2;
    doc.font(value ? F.regular : F.italic).fontSize(8);
    const valStr = value || "Not Available";
    const valH = doc.heightOfString(valStr, { width });
    doc.restore();
    return lblH + valH + 8;
}

function drawField(doc, label, value, x, y, width, height) {
    doc.save();
    doc.font(F.bold).fontSize(7.5).fillColor(C.black);
    doc.text(label, x + 6, y + 4, { width: width - 12 });
    const lblH = doc.heightOfString(label, { width: width - 12 }) + 2;

    const valStr = value || "Not Available";
    if (value) {
        doc.font(F.regular).fontSize(8).fillColor(C.black);
        doc.text(valStr, x + 6, y + 4 + lblH, { width: width - 12 });
    } else {
        doc.font(F.italic).fontSize(8).fillColor(C.muted).fillOpacity(0.55);
        doc.text(valStr, x + 6, y + 4 + lblH, { width: width - 12 });
        doc.fillOpacity(1);
    }
    doc.restore();
}

function drawRightRow(doc, leftField, rightField, x, y, width, height) {
    hLine(doc, x, x + width, y + height, C.border, 0.3);

    if (rightField) {
        const hw = width / 2;
        drawField(doc, leftField.lbl, leftField.val, x, y, hw, height);
        drawField(doc, rightField.lbl, rightField.val, x + hw, y, hw, height);
        vLine(doc, x + hw, y, y + height, C.border, 0.3);
    } else {
        drawField(doc, leftField.lbl, leftField.val, x, y, width, height);
    }
}

function twoColGrid(doc, y, left, right, ctx) {
    const PAD_X = 7;
    const PAD_Y = 5;
    const COL_W = CW / 2;
    const LBL_W = COL_W * 0.36;
    const VAL_W = COL_W - LBL_W - PAD_X * 2;
    const rows = Math.max(left.length, right.length);
    const rowHeights = [];
    for (let i = 0; i < rows; i++) {
        const leftVal = left[i]?.[1] || "—";
        const rightVal = right[i]?.[1] || "—";
        const leftHeight = textH(doc, leftVal, VAL_W, F.regular, 8);
        const rightHeight = textH(doc, rightVal, VAL_W, F.regular, 8);
        rowHeights.push(Math.max(leftHeight, rightHeight, 10) + PAD_Y * 2);
    }
    const gridH = rowHeights.reduce((a, b) => a + b, 0);
    y = space(doc, y, gridH + 10, ctx);
    [left, right].forEach((side, s) => {
        const ox = MX + s * COL_W;
        strokeRect(doc, ox, y, COL_W, gridH, C.border, 0.3);
        let currentY = y;
        side.forEach(([lbl, val], i) => {
            const rh = rowHeights[i];
            if (i > 0) {
                hLine(doc, ox, ox + COL_W, currentY, C.border, 0.3);
            }
            absText(doc, lbl, ox + PAD_X, currentY + PAD_Y, { font: F.bold, size: 7.5, color: C.black, width: LBL_W });
            absText(doc, val, ox + PAD_X + LBL_W, currentY + PAD_Y, { size: 8, color: C.black, width: VAL_W });
            currentY += rh;
        });
    });
    vLine(doc, MX + COL_W, y, y + gridH, C.border, 0.3);
    return y + gridH + 12;
}

const WI_COLS = [
    { k: "no", lbl: "Sl", fr: 0.04, a: "center" },
    { k: "desc", lbl: "Description", fr: 0.35, a: "left" },
    { k: "unit", lbl: "Unit", fr: 0.08, a: "center" },
    { k: "qty", lbl: "Quantity", fr: 0.11, a: "right" },
    { k: "rate", lbl: "Unit Rate", fr: 0.14, a: "right" },
    { k: "amt", lbl: "Amount", fr: 0.14, a: "right" },
    { k: "rmk", lbl: "Remarks", fr: 0.14, a: "left" },
];
WI_COLS.forEach((c) => { c.w = Math.round(c.fr * CW * 10) / 10; });
const drift = CW - WI_COLS.reduce((s, c) => s + c.w, 0);
WI_COLS[WI_COLS.length - 1].w = Math.round((WI_COLS[WI_COLS.length - 1].w + drift) * 10) / 10;

const TH = 19;
const TPX = 5;
const TPY = 5;
const TFS = 8;

function wiRowHeight(doc, item, i) {
    const vals = [String(i + 1), item.description || "", item.unit || "", fmtN(item.quantity), fmtCurrency(item.unitRate), fmtCurrency(item.amount), item.remarks || ""];
    let maxH = 0;
    WI_COLS.forEach((col, ci) => {
        const h = textH(doc, vals[ci], col.w - TPX * 2, F.regular, TFS);
        if (h > maxH) maxH = h;
    });
    return Math.max(maxH + TPY * 2, 16);
}

function wiTableHeader(doc, y) {
    fillRect(doc, MX, y, CW, TH, C.headerBg);
    strokeRect(doc, MX, y, CW, TH, C.border, 0.4);
    let cx = MX;
    WI_COLS.forEach((col) => {
        absText(doc, col.lbl, cx + TPX, y + TPY, { font: F.bold, size: TFS, color: C.mid, width: col.w - TPX * 2, align: col.a, lineBreak: false });
        cx += col.w;
    });
    cx = MX;
    WI_COLS.slice(0, -1).forEach((col) => { cx += col.w; vLine(doc, cx, y, y + TH, C.borderFaint, 0.4); });
    return y + TH;
}

function wiTableRow(doc, y, item, i) {
    const rh = wiRowHeight(doc, item, i);
    if (i % 2 !== 0) fillRect(doc, MX, y, CW, rh, C.rowAlt);
    const vals = [String(i + 1), item.description || "—", item.unit || "—", fmtN(item.quantity), fmtCurrency(item.unitRate), fmtCurrency(item.amount), item.remarks || "—"];
    let cx = MX;
    WI_COLS.forEach((col, ci) => {
        absText(doc, vals[ci], cx + TPX, y + TPY, { size: TFS, color: C.dark, width: col.w - TPX * 2, align: col.a, lineBreak: true });
        cx += col.w;
    });
    hLine(doc, MX, MX + CW, y + rh, C.borderFaint, 0.3);
    cx = MX;
    WI_COLS.slice(0, -1).forEach((col) => { cx += col.w; vLine(doc, cx, y, y + rh, C.borderFaint, 0.3); });
    vLine(doc, MX, y, y + rh, C.border, 0.4);
    vLine(doc, MX + CW, y, y + rh, C.border, 0.4);
    return y + rh;
}

function wiTableTotals(doc, y, items, totalContractValue) {
    const RH = 20;
    fillRect(doc, MX, y, CW, RH, C.headerBg);
    strokeRect(doc, MX, y, CW, RH, C.border, 0.4);
    absText(doc, `TOTAL CONTRACT VALUE`, MX + TPX, y + (RH - TFS) / 2, { font: F.bold, size: TFS, color: C.dark, width: CW * 0.7, lineBreak: false });
    absText(doc, fmtCurrency(totalContractValue), MX + CW - 120, y + (RH - TFS) / 2, { font: F.bold, size: TFS + 1, color: C.accent, width: 110, align: "right", lineBreak: false });
    return y + RH;
}

function wiTableAmountBreakdown(doc, y, {
    totalContractValue,
    gst,
    discount,
    gstAmount,
    discountAmount,
    finalAmount,
}) {
    const RH = 22;
    const summaryWidth = 260;
    const summaryX = MX + CW - summaryWidth;
    const labelWidth = 160;
    const valueWidth = 90;
    const rows = [
        {
            label: "Sub Total (Contract Value)",
            value: fmtCurrency(totalContractValue),
            bold: false,
        },
        discount > 0
            ? {
                label: `Discount (${discount}%)`,
                value: `- ${fmtCurrency(discountAmount)}`,
                bold: false,
            }
            : null,
        gst > 0
            ? {
                label: `GST (${gst}%)`,
                value: `+ ${fmtCurrency(gstAmount)}`,
                bold: false,
            }
            : null,
        {
            label: "Final Payable Amount",
            value: fmtCurrency(finalAmount),
            bold: true,
        },
    ].filter(Boolean);
    rows.forEach((row, i) => {
        const isLast = i === rows.length - 1;
        if (isLast) {
            fillRect(doc, summaryX, y, summaryWidth, RH, "#f9f9f9");
        }
        strokeRect(
            doc,
            summaryX,
            y,
            summaryWidth,
            RH,
            C.border,
            isLast ? 0.6 : 0.3
        );
        absText(
            doc,
            row.label,
            summaryX + 8,
            y + 6,
            {
                font: row.bold ? F.bold : F.regular,
                size: row.bold ? 10 : 8,
                width: labelWidth,
                align: "left",
                lineBreak: false,
            }
        );
        absText(
            doc,
            row.value,
            summaryX + summaryWidth - valueWidth - 8,
            y + 6,
            {
                font: row.bold ? F.bold : F.regular,
                size: row.bold ? 10 : 8,
                width: valueWidth,
                align: "right",
                lineBreak: false,
            }
        );
        y += RH;
    });
    return y;
}


function drawMilestonesTable(doc, y, milestones, ctx) {
    if (!milestones || milestones.length === 0) return y;
    y = space(doc, y, TH + milestones.length * 20 + 30, ctx);
    y = sectionLabel(doc, y, "Payment Milestones");

    const MS_COLS = [
        { lbl: "#", w: 30, a: "center" },
        { lbl: "Milestone", w: 200, a: "left" },
        { lbl: "Trigger %", w: 80, a: "center" },
        { lbl: "Payment %", w: 80, a: "center" },
        { lbl: "Amount", w: CW - 30 - 200 - 80 - 80, a: "right" },
    ];

    fillRect(doc, MX, y, CW, TH, C.headerBg);
    strokeRect(doc, MX, y, CW, TH, C.border, 0.4);
    let cx = MX;
    MS_COLS.forEach((col) => {
        absText(doc, col.lbl, cx + TPX, y + TPY, { font: F.bold, size: TFS, color: C.mid, width: col.w - TPX * 2, align: col.a, lineBreak: false });
        cx += col.w;
    });
    y += TH;

    milestones.forEach((ms, i) => {
        const rh = 20;
        if (i % 2 !== 0) fillRect(doc, MX, y, CW, rh, C.rowAlt);
        hLine(doc, MX, MX + CW, y + rh, C.borderFaint, 0.3);
        cx = MX;
        const vals = [String(i + 1), ms.title || "—", `${ms.triggerPercent}%`, `${ms.paymentPercent}%`, fmtCurrency(ms.paymentAmount)];
        MS_COLS.forEach((col, ci) => {
            absText(doc, vals[ci], cx + TPX, y + (rh - TFS) / 2, { size: TFS, color: C.dark, width: col.w - TPX * 2, align: col.a, lineBreak: false });
            cx += col.w;
        });
        cx = MX;
        MS_COLS.slice(0, -1).forEach((col) => { cx += col.w; vLine(doc, cx, y, y + rh, C.borderFaint, 0.3); });
        vLine(doc, MX, y, y + rh, C.border, 0.4);
        vLine(doc, MX + CW, y, y + rh, C.border, 0.4);
        y += rh;
    });
    strokeRect(doc, MX, y - milestones.length * 20 - TH, CW, milestones.length * 20 + TH, C.border, 0.4);
    return y + 12;
}


function drawPdfHeader(doc, company, logoBuffer, docTitle, docNumber, y) {
    const LOGO = 46;
    if (logoBuffer) {
        try { doc.image(logoBuffer, MX, y, { fit: [LOGO, LOGO] }); }
        catch { drawInitials(doc, company?.companyName, MX, y, LOGO); }
    } else {
        drawInitials(doc, company?.companyName, MX, y, LOGO);
    }
    const infoX = MX + LOGO + 11;
    const infoW = CW - LOGO - 11;
    absText(doc, company?.companyName || "Company Name", infoX, y + 1, { font: F.bold, size: 13, color: C.dark, width: infoW });
    const addr = [
        company?.address?.city,
        company?.address?.state,
        company?.address?.country,
    ].filter(Boolean).join(", ");
    const contact = [
        company?.phone && `Ph: ${company.phone}`,
        company?.email && `Email: ${company.email}`,
        company?.gstin && `GSTIN: ${company.gstin}`,
    ].filter(Boolean).join("   ·   ");
    if (addr) {
        absText(doc, addr, infoX, y + 20, {
            size: 8,
            color: C.mid,
            width: infoW,
            lineBreak: false,
        });
    }
    if (contact) {
        absText(doc, contact, infoX, y + 34, {
            size: 8,
            color: C.mid,
            width: infoW,
            lineBreak: false,
        });
    }
    y += LOGO + 14;
    hLine(doc, MX, MX + CW, y, C.border, 0.6);
    y += 10;
    absText(doc, docTitle, MX, y, { font: F.bold, size: 15, color: C.dark, width: CW * 0.6 });
    absText(doc, docNumber, MX + CW * 0.6, y + 2, { font: F.bold, size: 12, color: C.mid, width: CW * 0.4, align: "right" });
    y += 22;
    hLine(doc, MX, MX + CW, y, C.dark, 0.8);
    return y + 13;
}


export async function generateWOPdf(res, { wo, company, vendor, project, createdByUser }) {
    const logoBuffer = await fetchImageBuffer(company?.logo);
    const ctx = { page: 1, companyName: company?.companyName || "", docLabel: `WO ${wo.woNumber}` };

    const doc = new PDFDocument({
        size: "A4",
        margins: { top: MT, bottom: 4, left: MX, right: MX },
        info: { Title: `WO ${wo.woNumber}`, Author: company?.companyName || "System", Subject: "Work Order", Creator: "Project Management System" },
        compress: true,
        autoFirstPage: false,
    });

    const safeName = wo.woNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="WO_${safeName}.pdf"`);
    doc.pipe(res);
    doc.addPage();
    let y = MT;

    absText(doc, "Work Order", MX, y, {
        font: F.bold, size: 12, color: C.black, width: CW * 0.6,
    });

    const logoSize = 34;
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, MX + CW - logoSize, y, { fit: [logoSize, logoSize] });
        } catch { drawInitials(doc, company?.companyName, MX + CW - logoSize, y, logoSize); }
    } else {
        drawInitials(doc, company?.companyName, MX + CW - logoSize, y, logoSize);
    }

    // absText(doc, `Original Copy`, MX + CW * 0.6, y + 2, {
    //     font: F.regular, size: 8, color: C.muted,
    //     width: CW * 0.4 - logoSize - 6, align: "right",
    // });

    y += logoSize + 14;

    const leftWidth = CW * 0.55;
    const rightWidth = CW - leftWidth;

    const itemsL1 = [
        { type: "header", text: company?.companyName || "Company Name" },
        { type: "text", text: [company?.address?.city, company?.address?.state, company?.address?.country].filter(Boolean).join(", ") },
        { type: "pair", label: "Contact", value: (company?.phone || company?.email) ? `${company.phone || ""} ${company.email || ""}`.trim() : null },
        { type: "pair", label: "GSTIN/UIN", value: company?.gstin },
    ];

    const itemsL2 = [
        { type: "title", text: "Consignee (Ship to) / Project details" },
        { type: "header", text: project?.projectName || "Project Name" },
        { type: "text", text: project?.location },
        { type: "pair", label: "Client Name", value: project?.clientName },
        { type: "pair", label: "Project Code", value: project?.projectCode },
        { type: "pair", label: "Start Date", value: fmt(project?.startDate) },
        { type: "pair", label: "End Date", value: fmt(project?.endDate) },
    ];

    const itemsL3 = [
        { type: "title", text: "Contractor Details" },
        { type: "header", text: vendor?.name || "Contractor Name" },
        { type: "text", text: vendor?.address },
        { type: "pair", label: "Type", value: vendor?.vendorType },
        { type: "pair", label: "Contact Person", value: vendor?.contactPerson },
        { type: "pair", label: "Phone", value: vendor?.phone },
        { type: "pair", label: "Email", value: vendor?.email },
        { type: "pair", label: "GSTIN", value: vendor?.legalDetails?.gstin },
        { type: "pair", label: "PAN", value: vendor?.legalDetails?.panNumber },
        { type: "pair", label: "Reg. No.", value: vendor?.legalDetails?.registrationNumber },
    ];

    const rightRows = [
        { left: { lbl: "WO Number", val: wo.woNumber }, right: { lbl: "Dated", val: fmt(wo.createdAt) } },
        { left: { lbl: "Title", val: wo.title }, right: { lbl: "Status", val: "Approved" } },
        { left: { lbl: "Start Date", val: fmt(wo.startDate) }, right: { lbl: "End Date", val: fmt(wo.expectedEndDate) } },
        { left: { lbl: "Payment Terms", val: wo.paymentTerms } },
        { left: { lbl: "Contract Value", val: fmtCurrency(wo.totalContractValue) } },
        { left: { lbl: "Work Location", val: wo.workLocation } },
        { left: { lbl: "Created by", val: createdByUser?.name }, right: { lbl: "Milestones", val: wo.hasMilestones ? "Yes" : "No" } },
    ];

    const paddingOffset = 12;
    const H_L1 = measureBlockHeight(doc, itemsL1, leftWidth - paddingOffset) + 12;
    const H_L2 = measureBlockHeight(doc, itemsL2, leftWidth - paddingOffset) + 12;
    const H_L3 = measureBlockHeight(doc, itemsL3, leftWidth - paddingOffset) + 12;
    const H_LEFT = H_L1 + H_L2 + H_L3;

    const rowHeights = rightRows.map(row => {
        if (row.right) {
            const hw = rightWidth / 2;
            return Math.max(
                measureFieldHeight(doc, row.left.lbl, row.left.val, hw - paddingOffset),
                measureFieldHeight(doc, row.right.lbl, row.right.val, hw - paddingOffset)
            );
        } else {
            return measureFieldHeight(doc, row.left.lbl, row.left.val, rightWidth - paddingOffset);
        }
    });

    const H_RIGHT = rowHeights.reduce((sum, h) => sum + h, 0);
    const H_MAX = Math.max(H_LEFT, H_RIGHT);

    if (H_MAX > H_RIGHT) {
        rowHeights[rowHeights.length - 1] += (H_MAX - H_RIGHT);
    }

    strokeRect(doc, MX, y, CW, H_MAX, C.border, 0.3);
    vLine(doc, MX + leftWidth, y, y + H_MAX, C.border, 0.3);

    let curL_y = y;

    let logoDrawWidth = 0;
    drawBlock(doc, itemsL1, MX + 6 + logoDrawWidth, curL_y + 6, leftWidth - 12 - logoDrawWidth);
    hLine(doc, MX, MX + leftWidth, curL_y + H_L1, C.border, 0.3);
    curL_y += H_L1;

    drawBlock(doc, itemsL2, MX + 6, curL_y + 6, leftWidth - 12);
    hLine(doc, MX, MX + leftWidth, curL_y + H_L2, C.border, 0.3);
    curL_y += H_L2;

    drawBlock(doc, itemsL3, MX + 6, curL_y + 6, leftWidth - 12);

    let curR_y = y;
    rightRows.forEach((row, idx) => {
        const h = rowHeights[idx];
        drawRightRow(doc, row.left, row.right, MX + leftWidth, curR_y, rightWidth, h);
        curR_y += h;
    });

    y += H_MAX + 16;

    if (wo.description?.trim()) {
        const descW = CW - 12;
        const descH = textH(doc, wo.description, descW, F.regular, 8) + 12;
        y = space(doc, y, descH + 20, ctx);
        y = sectionLabel(doc, y, "Scope of Work");
        // strokeRect(doc, MX, y, CW, descH, C.border, 0.3);
        absText(doc, wo.description, MX, y + 6, { size: 8, color: C.black, width: descW });
        y += descH + 12;
    }

    y = space(doc, y, TH + 30, ctx);
    y = sectionLabel(doc, y, "Work Items");
    y = wiTableHeader(doc, y);
    wo.workItems.forEach((item, i) => {
        const rh = wiRowHeight(doc, item, i);
        if (y + rh > PH - MB - FZONE) {
            drawFooter(doc, ctx);
            doc.addPage();
            ctx.page += 1;
            y = MT;
            y = wiTableHeader(doc, y);
        }
        y = wiTableRow(doc, y, item, i);
    });
    y = space(doc, y, 20, ctx);
    y = wiTableTotals(doc, y, wo.workItems, wo.totalContractValue);
    y = wiTableAmountBreakdown(doc, y, {
        totalContractValue: wo.totalContractValue,
        gst: wo.gst || 0,
        discount: wo.discount || 0,
        gstAmount: wo.gstAmount || 0,
        discountAmount: wo.discountAmount || 0,
        finalAmount: wo.finalAmount || wo.totalContractValue,
    });
    y += 14;

    if (wo.hasMilestones && wo.milestones?.length > 0) {
        y = drawMilestonesTable(doc, y, wo.milestones, ctx);
    }

    if (wo.specialInstructions?.trim()) {
        const siW = CW - 12;
        const siH = textH(doc, wo.specialInstructions, siW, F.regular, 8) + 12;
        y = space(doc, y, siH + 20, ctx);
        y = sectionLabel(doc, y, "Special Instructions");
        absText(doc, wo.specialInstructions, MX + 6, y + 6, { size: 8, color: C.black, width: siW });
        y += siH + 12;
    }

    const SIG_H = 68;
    const sigColW = CW / 3;

    y = space(doc, y, SIG_H + 25, ctx);
    y = sectionLabel(doc, y, "Authorisation & Signatures");

    strokeRect(doc, MX, y, CW, SIG_H, C.border, 0.3);

    ["Prepared by", "Contractor Acceptance", "Authorized Signatory"].forEach((lbl, s) => {
        const sx = MX + s * sigColW;
        if (s > 0) vLine(doc, sx, y, y + SIG_H, C.border, 0.3);
        hLine(doc, sx, sx + sigColW, y + SIG_H - 18, C.border, 0.3);
        absText(doc, lbl, sx, y + SIG_H - 12, {
            font: F.bold, size: 8, color: C.black,
            width: sigColW, align: "center",
        });
    });

    y += SIG_H + 12;

    drawFooter(doc, ctx);
    doc.end();
}



export async function generateWCCPdf(res, { wo, company, vendor, project, completedByUser }) {
    const logoBuffer = await fetchImageBuffer(company?.logo);
    const ctx = { page: 1, companyName: company?.companyName || "", docLabel: `WCC for WO ${wo.woNumber}` };
    const doc = new PDFDocument({
        size: "A4",
        margins: { top: MT, bottom: 4, left: MX, right: MX },
        info: { Title: `WCC - WO ${wo.woNumber}`, Author: company?.companyName || "System", Subject: "Work Completion Certificate", Creator: "Project Management System" },
        compress: true,
        autoFirstPage: false,
    });
    const safeName = wo.woNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="WCC_${safeName}.pdf"`);
    doc.pipe(res);
    doc.addPage();
    let y = MT;

    absText(doc, "Work Completion Certificate", MX, y, {
        font: F.bold, size: 12, color: C.black, width: CW * 0.6,
    });

    const logoSize = 34;
    const headerBottomGap = 12;
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, MX + CW - logoSize, y, { fit: [logoSize, logoSize] });
            y += logoSize + headerBottomGap;
        } catch { drawInitials(doc, company?.companyName, MX + CW - logoSize, y, logoSize); }
    } else {
        drawInitials(doc, company?.companyName, MX + CW - logoSize, y, logoSize);
    }

    // absText(doc, `Original Copy`, MX + CW * 0.6, y + 2, {
    //     font: F.regular, size: 8, color: C.muted,
    //     width: CW * 0.4 - logoSize - 6, align: "right",
    // });
    y += logoSize + 14;
    const leftWidth = CW * 0.55;
    const rightWidth = CW - leftWidth;
    const itemsL1 = [
        { type: "header", text: company?.companyName || "Company Name" },
        { type: "text", text: [company?.address?.city, company?.address?.state, company?.address?.country].filter(Boolean).join(", ") },
        { type: "pair", label: "Contact", value: (company?.phone || company?.email) ? `${company.phone || ""} ${company.email || ""}`.trim() : null },
        { type: "pair", label: "GSTIN/UIN", value: company?.gstin },
    ];
    const itemsL2 = [
        { type: "title", text: "Consignee (Ship to) / Project details" },
        { type: "header", text: project?.projectName || "Project Name" },
        { type: "text", text: project?.location },
        { type: "pair", label: "Client Name", value: project?.clientName },
        { type: "pair", label: "Project Code", value: project?.projectCode },
    ];
    const itemsL3 = [
        { type: "title", text: "Contractor Details" },
        { type: "header", text: vendor?.name || "Contractor Name" },
        { type: "text", text: vendor?.address },
        { type: "pair", label: "Type", value: vendor?.vendorType },
        { type: "pair", label: "Contact Person", value: vendor?.contactPerson },
        { type: "pair", label: "Phone", value: vendor?.phone },
        { type: "pair", label: "Email", value: vendor?.email },
        { type: "pair", label: "GSTIN", value: vendor?.legalDetails?.gstin },
        { type: "pair", label: "PAN", value: vendor?.legalDetails?.panNumber },
        { type: "pair", label: "Reg. No.", value: vendor?.legalDetails?.registrationNumber },
    ];
    const rightRows = [
        { left: { lbl: "WO Number", val: wo.woNumber }, right: { lbl: "Dated", val: fmt(wo.createdAt) } },
        { left: { lbl: "Title", val: wo.title }, right: { lbl: "WCC Ref", val: `WCC / ${wo.woNumber}` } },
        { left: { lbl: "Contract Value", val: fmtCurrency(wo.totalContractValue) }, right: { lbl: "Completed On", val: fmt(wo.completedAt) } },
        { left: { lbl: "Start Date", val: fmt(wo.startDate) }, right: { lbl: "Expected End", val: fmt(wo.expectedEndDate) } },
        { left: { lbl: "Actual End Date", val: fmt(wo.actualEndDate || wo.completedAt) } },
        { left: { lbl: "Completed by", val: completedByUser?.name }, right: { lbl: "Email", val: completedByUser?.email } },
        { left: { lbl: "Location", val: project?.location } },
    ];
    const paddingOffset = 12;
    const H_L1 = measureBlockHeight(doc, itemsL1, leftWidth - paddingOffset) + 12;
    const H_L2 = measureBlockHeight(doc, itemsL2, leftWidth - paddingOffset) + 12;
    const H_L3 = measureBlockHeight(doc, itemsL3, leftWidth - paddingOffset) + 12;
    const H_LEFT = H_L1 + H_L2 + H_L3;
    const rowHeights = rightRows.map(row => {
        if (row.right) {
            const hw = rightWidth / 2;
            return Math.max(
                measureFieldHeight(doc, row.left.lbl, row.left.val, hw - paddingOffset),
                measureFieldHeight(doc, row.right.lbl, row.right.val, hw - paddingOffset)
            );
        } else {
            return measureFieldHeight(doc, row.left.lbl, row.left.val, rightWidth - paddingOffset);
        }
    });

    const H_RIGHT = rowHeights.reduce((sum, h) => sum + h, 0);
    const H_MAX = Math.max(H_LEFT, H_RIGHT);

    if (H_MAX > H_RIGHT) {
        rowHeights[rowHeights.length - 1] += (H_MAX - H_RIGHT);
    }
    strokeRect(doc, MX, y, CW, H_MAX, C.border, 0.3);
    vLine(doc, MX + leftWidth, y, y + H_MAX, C.border, 0.3);
    let curL_y = y;
    drawBlock(doc, itemsL1, MX + 6, curL_y + 6, leftWidth - 12);
    hLine(doc, MX, MX + leftWidth, curL_y + H_L1, C.border, 0.3);
    curL_y += H_L1;
    drawBlock(doc, itemsL2, MX + 6, curL_y + 6, leftWidth - 12);
    hLine(doc, MX, MX + leftWidth, curL_y + H_L2, C.border, 0.3);
    curL_y += H_L2;
    drawBlock(doc, itemsL3, MX + 6, curL_y + 6, leftWidth - 12);
    let curR_y = y;
    rightRows.forEach((row, idx) => {
        const h = rowHeights[idx];
        drawRightRow(doc, row.left, row.right, MX + leftWidth, curR_y, rightWidth, h);
        curR_y += h;
    });
    y += H_MAX + 16;

    if (wo.completionRemarks?.trim()) {
        const rmkW = CW - 12;
        const rmkH = textH(doc, wo.completionRemarks, rmkW, F.regular, 8) + 12;
        y = space(doc, y, rmkH + 20, ctx);
        y = sectionLabel(doc, y, "Completion Remarks");
        strokeRect(doc, MX, y, CW, rmkH, C.border, 0.3);
        absText(doc, wo.completionRemarks, MX + 6, y + 6, { size: 8, color: C.black, width: rmkW });
        y += rmkH + 12;
    }

    y = space(doc, y, TH + 30, ctx);
    y = sectionLabel(doc, y, "Completed Work Items");
    y = wiTableHeader(doc, y);
    wo.workItems.forEach((item, i) => {
        const rh = wiRowHeight(doc, item, i);
        if (y + rh > PH - MB - FZONE) {
            drawFooter(doc, ctx);
            doc.addPage();
            ctx.page += 1;
            y = MT;
            y = wiTableHeader(doc, y);
        }
        y = wiTableRow(doc, y, item, i);
    });
    y = wiTableTotals(doc, y, wo.workItems, wo.totalContractValue);
    y = wiTableAmountBreakdown(doc, y, {
        totalContractValue: wo.totalContractValue,
        gst: wo.gst || 0,
        discount: wo.discount || 0,
        gstAmount: wo.gstAmount || 0,
        discountAmount: wo.discountAmount || 0,
        finalAmount: wo.finalAmount || wo.totalContractValue,
    });
    y += 14;

    if (wo.hasMilestones && wo.milestones?.length > 0) {
        y = space(doc, y, 50, ctx);
        y = sectionLabel(doc, y, "Milestone Payment Summary");
        const MS_COLS2 = [
            { lbl: "#", w: 30, a: "center" },
            { lbl: "Milestone", w: 180, a: "left" },
            { lbl: "Trigger %", w: 70, a: "center" },
            { lbl: "Payment %", w: 70, a: "center" },
            { lbl: "Amount", w: 100, a: "right" },
            { lbl: "Status", w: CW - 30 - 180 - 70 - 70 - 100, a: "center" },
        ];
        strokeRect(doc, MX, y, CW, TH, C.border, 0.3);
        let cx = MX;
        MS_COLS2.forEach((col) => {
            absText(doc, col.lbl, cx + TPX, y + TPY, { font: F.bold, size: TFS, color: C.black, width: col.w - TPX * 2, align: col.a, lineBreak: false });
            cx += col.w;
        });
        y += TH;
        wo.milestones.forEach((ms, i) => {
            const vals2 = [
                String(i + 1),
                ms.title || "",
                `${ms.triggerPercent}%`,
                `${ms.paymentPercent}%`,
                fmtCurrency(ms.paymentAmount),
                ms.status,
            ];
            let maxH = 0;
            MS_COLS2.forEach((col, ci) => {
                const h = textH(doc, vals2[ci], col.w - TPX * 2, F.regular, TFS);
                if (h > maxH) maxH = h;
            });
            const rh = Math.max(maxH + TPY * 2, 20);
            cx = MX;
            const statusColor = ms.status === "Paid" ? "#166534" : (ms.status === "Triggered" ? C.black : C.muted);
            MS_COLS2.forEach((col, ci) => {
                const color = ci === 5 ? statusColor : C.black;
                absText(doc, vals2[ci], cx + TPX, y + (rh - TFS) / 2, {
                    size: TFS, color, width: col.w - TPX * 2, align: col.a,
                });
                cx += col.w;
            });
            hLine(doc, MX, MX + CW, y + rh, C.border, 0.3);
            vLine(doc, MX, y, y + rh, C.border, 0.3);
            vLine(doc, MX + CW, y, y + rh, C.border, 0.3);
            y += rh;
        });
        strokeRect(doc, MX, y - wo.milestones.length * 20 - TH, CW, wo.milestones.length * 20 + TH, C.border, 0.3);
        y += 12;
    }

    y = space(doc, y, 60, ctx);
    y = sectionLabel(doc, y, "Certificate Declaration");
    const declaration = `This is to certify that the work described in Work Order ${wo.woNumber} — "${wo.title}" — has been satisfactorily completed by ${vendor?.name || "the contractor"} as per the agreed terms and specifications. The work has been inspected and found to be in compliance with the required standards.`;
    const declW = CW - 12;
    const declH = textH(doc, declaration, declW, F.regular, 8) + 12;
    strokeRect(doc, MX, y, CW, declH, C.border, 0.3);
    absText(doc, declaration, MX + 6, y + 6, { size: 8, color: C.black, width: declW });
    y += declH + 16;
    const SIG_H = 68;
    const sigColW = CW / 3;
    y = space(doc, y, SIG_H + 25, ctx);
    y = sectionLabel(doc, y, "Acceptance Signatures");
    strokeRect(doc, MX, y, CW, SIG_H, C.border, 0.3);
    ["Site Engineer", "Contractor Acceptance", "Authorized Signatory"].forEach((lbl, s) => {
        const sx = MX + s * sigColW;
        if (s > 0) vLine(doc, sx, y, y + SIG_H, C.border, 0.3);
        hLine(doc, sx, sx + sigColW, y + SIG_H - 18, C.border, 0.3);
        absText(doc, lbl, sx, y + SIG_H - 12, {
            font: F.bold, size: 8, color: C.black,
            width: sigColW, align: "center",
        });
    });

    drawFooter(doc, ctx);
    doc.end();
}



// export const propagateFromWOTaskLink = async (workOrderId, triggeredByUserId = null) => {
//     try {
//         return await recalculateWOProgress(workOrderId, triggeredByUserId);
//     } catch (err) {
//         logger.error("[woHelper] propagateFromWOTaskLink failed", {
//             workOrderId, error: err.message,
//         });
//         return null;
//     }
// };