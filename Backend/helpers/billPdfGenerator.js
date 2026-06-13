import PDFDocument from "pdfkit";
import axios from "axios";

const C = {
    black: "#111111",
    dark: "#222222",
    mid: "#555555",
    muted: "#888888",
    light: "#BBBBBB",
    border: "#CCCCCC",
    borderFaint: "#E0E0E0",
    rowAlt: "#F7F7F7",
    headerBg: "#EFEFEF",
    negative: "#B91C1C",
    positive: "#047857",
    white: "#FFFFFF",
};

const F = { regular: "Helvetica", bold: "Helvetica-Bold" };

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
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtN(n, dp = 2) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const num = Number(n);
    const isInteger = Number.isInteger(num);
    return num.toLocaleString("en-IN", {
        minimumFractionDigits: isInteger ? 0 : dp,
        maximumFractionDigits: isInteger ? 0 : dp,
    });
}

function textH(doc, text, w, font, size) {
    doc.save();
    doc.font(font).fontSize(size);
    const h = doc.heightOfString(String(text ?? ""), { width: w });
    doc.restore();
    return h;
}

function fillRect(doc, x, y, w, h, color) {
    doc.save().rect(x, y, w, h).fill(color).restore();
}

function strokeRect(doc, x, y, w, h, color = C.border, lw = 0.5) {
    doc.save().rect(x, y, w, h).lineWidth(lw).stroke(color).restore();
}

function hLine(doc, x1, x2, y, color = C.border, lw = 0.5) {
    doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
}

function vLine(doc, x, y1, y2, color = C.border, lw = 0.5) {
    doc.save().moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke(color).restore();
}

function absText(doc, text, x, y, opts = {}) {
    doc.save();
    doc.font(opts.font || F.regular)
        .fontSize(opts.size || 9)
        .fillColor(opts.color || C.dark);
    doc.text(String(text ?? "—"), x, y, {
        width: opts.width,
        align: opts.align || "left",
        lineBreak: opts.lineBreak !== false,
    });
    doc.restore();
}

function drawFooter(doc, ctx) {
    const fy = PH - MB + 4;
    hLine(doc, MX, MX + CW, fy - 2, C.border, 0.4);
    absText(doc, `${ctx.companyName}  ·  Payable ${ctx.payableNumber}`, MX, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.55,
    });
    absText(doc, `Generated ${new Date().toLocaleString("en-IN")}`, MX + CW * 0.55, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.27, align: "center",
    });
    absText(doc, `Page ${ctx.page}`, MX + CW * 0.82, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.18, align: "right",
    });
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

function label(doc, y, text) {
    absText(doc, text.toUpperCase(), MX, y, {
        font: F.bold, size: 7, color: C.muted,
    });
    y += 11;
    hLine(doc, MX, MX + CW, y, C.borderFaint, 0.4);
    return y + 7;
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
        strokeRect(doc, ox, y, COL_W, gridH, C.border, 0.4);
        let currentY = y;
        side.forEach(([lbl, val], i) => {
            const rh = rowHeights[i];
            if (i % 2 !== 0) fillRect(doc, ox, currentY, COL_W, rh, C.rowAlt);
            if (i > 0) hLine(doc, ox, ox + COL_W, currentY, C.borderFaint, 0.3);
            absText(doc, lbl, ox + PAD_X, currentY + PAD_Y, {
                font: F.bold, size: 7.5, color: C.muted, width: LBL_W,
            });
            absText(doc, val || "—", ox + PAD_X + LBL_W, currentY + PAD_Y, {
                size: 8, color: C.dark, width: VAL_W,
            });
            currentY += rh;
        });
    });
    vLine(doc, MX + COL_W, y, y + gridH, C.border, 0.4);
    return y + gridH + 12;
}


const TXN_COLS = [
    { k: "#", lbl: "#", fr: 0.04, a: "center" },
    { k: "date", lbl: "Date", fr: 0.12, a: "center" },
    { k: "mode", lbl: "Mode", fr: 0.14, a: "left" },
    { k: "ref", lbl: "Reference", fr: 0.18, a: "left" },
    { k: "amount", lbl: "Amount (Rs. )", fr: 0.16, a: "right" },
    { k: "advDed", lbl: "Adv. Ded. (Rs. )", fr: 0.16, a: "right" },
    { k: "totalSettled", lbl: "Total Settled (Rs. )", fr: 0.20, a: "right" },
];
TXN_COLS.forEach((c) => { c.w = Math.round(c.fr * CW * 10) / 10; });
const driftTxn = CW - TXN_COLS.reduce((s, c) => s + c.w, 0);
TXN_COLS[TXN_COLS.length - 1].w = Math.round((TXN_COLS[TXN_COLS.length - 1].w + driftTxn) * 10) / 10;

const T_H = 19;
const T_PX = 5;
const T_PY = 5;
const T_FS = 8;

function txnRowHeight(doc, txn) {
    const vals = [ "1", fmt(txn.paymentDate), txn.paymentMode === "Other" ? txn.paymentModeOther || "Other" : txn.paymentMode,
        txn.referenceNumber || "—", fmtN(txn.amount), fmtN(txn.advanceDeducted), fmtN(txn.totalSettled)];
    let maxH = 0;
    TXN_COLS.forEach((col, ci) => {
        const h = textH(doc, vals[ci], col.w - T_PX * 2, F.regular, T_FS);
        if (h > maxH) maxH = h;
    });
    return Math.max(maxH + T_PY * 2, 16);
}


function txnTableHeader(doc, y) {
    fillRect(doc, MX, y, CW, T_H, C.headerBg);
    strokeRect(doc, MX, y, CW, T_H, C.border, 0.4);
    let cx = MX;
    TXN_COLS.forEach((col) => {
        absText(doc, col.lbl, cx + T_PX, y + T_PY, {
            font: F.bold, size: T_FS, color: C.mid,
            width: col.w - T_PX * 2, align: col.a, lineBreak: false,
        });
        cx += col.w;
    });
    cx = MX;
    TXN_COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + T_H, C.borderFaint, 0.4);
    });
    return y + T_H;
}


function txnTableRow(doc, y, txn, idx) {
    const rh = txnRowHeight(doc, txn);
    const vals = [
        String(idx + 1), fmt(txn.paymentDate),
        txn.paymentMode === "Other" ? txn.paymentModeOther || "Other" : txn.paymentMode,
        txn.referenceNumber || "—", fmtN(txn.amount), fmtN(txn.advanceDeducted), fmtN(txn.totalSettled),
    ];
    if (idx % 2 !== 0) fillRect(doc, MX, y, CW, rh, C.rowAlt);
    let cx = MX;
    TXN_COLS.forEach((col, ci) => {
        absText(doc, vals[ci], cx + T_PX, y + T_PY, {
            size: T_FS, color: C.dark,
            width: col.w - T_PX * 2, align: col.a, lineBreak: true,
        });
        cx += col.w;
    });
    hLine(doc, MX, MX + CW, y + rh, C.borderFaint, 0.3);
    cx = MX;
    TXN_COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + rh, C.borderFaint, 0.3);
    });
    vLine(doc, MX, y, y + rh, C.border, 0.4);
    vLine(doc, MX + CW, y, y + rh, C.border, 0.4);
    return y + rh;
}


function txnTableTotal(doc, y, transactions) {
    const totAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0);
    const totAdv = transactions.reduce((s, t) => s + (t.advanceDeducted || 0), 0);
    const totSettled = transactions.reduce((s, t) => s + (t.totalSettled || 0), 0);
    const RH = 19;
    fillRect(doc, MX, y, CW, RH, C.headerBg);
    strokeRect(doc, MX, y, CW, RH, C.border, 0.4);
    const vals = [
        "", "", "", "TOTAL",
        fmtN(totAmount), fmtN(totAdv), fmtN(totSettled),
    ];
    let cx = MX;
    TXN_COLS.forEach((col, ci) => {
        if (vals[ci]) {
            absText(doc, vals[ci], cx + T_PX, y + (RH - T_FS) / 2, {
                font: F.bold, size: T_FS, color: C.dark,
                width: col.w - T_PX * 2, align: col.a, lineBreak: false,
            });
        }
        cx += col.w;
    });
    cx = MX;
    TXN_COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + RH, C.borderFaint, 0.4);
    });
    return y + RH + 12;
}


function drawInitials(doc, name, x, y, size) {
    const init = (name || "CO")
        .split(/\s+/).slice(0, 2)
        .map((w) => (w[0] || "").toUpperCase()).join("");
    fillRect(doc, x, y, size, size, C.headerBg);
    strokeRect(doc, x, y, size, size, C.border, 0.4);
    absText(doc, init, x, y + size * 0.28, {
        font: F.bold, size: size * 0.34, color: C.mid,
        width: size, align: "center",
    });
}


export async function generatePayableBillPdf(res, { payable, company, project, vendor, transactions }) {
    const logoBuffer = await fetchImageBuffer(company?.logo);
    const ctx = {
        page: 1,
        payableNumber: payable.payableNumber,
        companyName: company?.companyName || "",
    };
    const doc = new PDFDocument({
        size: "A4",
        margins: { top: MT, bottom: 4, left: MX, right: MX },
        info: {
            Title: `Payable ${payable.payableNumber}`,
            Author: company?.companyName || "System",
            Subject: "Payable Bill",
            Creator: "Procurement Management System",
        },
        compress: true,
        autoFirstPage: false,
    });
    const safeName = payable.payableNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Payable_${safeName}.pdf"`);
    doc.pipe(res);
    doc.addPage();
    let y = MT;
    const LOGO = 46;
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, MX, y, { fit: [LOGO, LOGO] });
        } catch {
            drawInitials(doc, company?.companyName, MX, y, LOGO);
        }
    } else {
        drawInitials(doc, company?.companyName, MX, y, LOGO);
    }
    const infoX = MX + LOGO + 11;
    const infoW = CW - LOGO - 11;
    absText(doc, company?.companyName || "Company Name", infoX, y + 1, {
        font: F.bold, size: 13, color: C.dark, width: infoW,
    });
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
    if (addr) absText(doc, addr, infoX, y + 20, { size: 8, color: C.mid, width: infoW, lineBreak: false });
    if (contact) absText(doc, contact, infoX, y + 34, { size: 8, color: C.mid, width: infoW, lineBreak: false });
    y += LOGO + 14;
    hLine(doc, MX, MX + CW, y, C.border, 0.6);
    y += 10;
    absText(doc, "PAYABLE BILL", MX, y, {
        font: F.bold, size: 15, color: C.dark, width: CW * 0.6,
    });
    absText(doc, payable.payableNumber, MX + CW * 0.6, y + 2, {
        font: F.bold, size: 12, color: C.mid,
        width: CW * 0.4, align: "right",
    });
    y += 22;
    hLine(doc, MX, MX + CW, y, C.dark, 0.8);
    y += 13;
    y = label(doc, y, "Vendor & Source Details");
    const sourceLabel = `${payable.sourceType === "GRN" ? "GRN" : payable.sourceType === "WO" ? "Work Order" : "Manual Expense"}`;
    y = twoColGrid(doc, y, [
        ["Source Type", sourceLabel],
        ["Source Number", payable.sourceNumber || "—"],
        ["PO Reference", payable.poId ? (payable.poNumber || "—") : "N/A"],
        ["Due Date", fmt(payable.dueDate)],
        ["Status", payable.status],
    ], [
        ["Vendor Name", vendor?.name || payable.vendorName || "—"],
        ["Type", vendor?.vendorType || "—"],
        ["Contact", vendor?.contactPerson || "—"],
        ["Phone", vendor?.phone || "—"],
        ["Email", vendor?.email || "—"],
    ], ctx);
    if (project) {
        y = space(doc, y, 50, ctx);
        y = label(doc, y, "Project Information");
        const projectRows = [
            ["Project Name", project.projectName],
            ["Project Code", project.projectCode],
            ["Location", project.location],
            ["Client", project.clientName],
            ["Status", project.status?.replace(/_/g, " ")],
            ["Start Date", fmt(project.startDate)],
            ["End Date", fmt(project.endDate)],
        ].filter(([, v]) => v != null && v !== "");
        const projectRight = [
            ["Total Payable", `Rs.  ${fmtN(payable.totalAmount)}`],
            ["Total Paid", `Rs.  ${fmtN(payable.paidAmount)}`],
            ["Advance Deducted", `Rs.  ${fmtN(payable.advanceDeducted)}`],
            ["Due Amount", `Rs.  ${fmtN(payable.dueAmount)}`],
            ["Payment Status", payable.status],
        ];
        y = twoColGrid(doc, y, projectRows, projectRight, ctx);
    } else {
        y = space(doc, y, 50, ctx);
        y = label(doc, y, "Payment Summary");
        const left = [
            ["Total Payable", `Rs.  ${fmtN(payable.totalAmount)}`],
            ["Total Paid", `Rs.  ${fmtN(payable.paidAmount)}`],
            ["Advance Deducted", `Rs.  ${fmtN(payable.advanceDeducted)}`],
            ["Due Amount", `Rs.  ${fmtN(payable.dueAmount)}`],
            ["Status", payable.status],
        ];
        y = twoColGrid(doc, y, left, [], ctx);
    }
    if (transactions && transactions.length > 0) {
        y = space(doc, y, T_H + 30, ctx);
        y = label(doc, y, "Payment Transactions");
        y = txnTableHeader(doc, y);
        transactions.forEach((txn, idx) => {
            const rh = txnRowHeight(doc, txn);
            if (y + rh > PH - MB - FZONE) {
                drawFooter(doc, ctx);
                doc.addPage();
                ctx.page += 1;
                y = MT;
                y = txnTableHeader(doc, y);
            }
            y = txnTableRow(doc, y, txn, idx);
        });
        y = space(doc, y, 19, ctx);
        y = txnTableTotal(doc, y, transactions);
    }
    if (payable.notes?.trim()) {
        const rmkW = CW - 14;
        const rmkH = textH(doc, payable.notes, rmkW, F.regular, 9) + 16;
        y = space(doc, y, rmkH + 30, ctx);
        y = label(doc, y, "Notes & Remarks");
        strokeRect(doc, MX, y, CW, rmkH, C.border, 0.4);
        absText(doc, payable.notes, MX + 7, y + 8, {
            size: 9, color: C.dark, width: rmkW,
        });
        y += rmkH + 12;
    }
    const SIG_H = 58;
    const sigColW = CW / 3;
    y = space(doc, y, SIG_H + 25, ctx);
    y = label(doc, y, "Authorisation");
    ["Prepared By", "Verified By", "Authorised By"].forEach((lbl, s) => {
        const sx = MX + s * sigColW;
        strokeRect(doc, sx, y, sigColW, SIG_H, C.border, 0.4);
        fillRect(doc, sx, y + SIG_H - 17, sigColW, 17, C.rowAlt);
        hLine(doc, sx, sx + sigColW, y + SIG_H - 17, C.borderFaint, 0.4);
        absText(doc, lbl, sx, y + SIG_H - 11, {
            font: F.bold, size: 7.5, color: C.muted,
            width: sigColW, align: "center",
        });
    });
    y += SIG_H + 8;
    drawFooter(doc, ctx);
    doc.end();
}