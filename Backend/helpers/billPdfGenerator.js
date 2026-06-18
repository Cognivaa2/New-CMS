import PDFDocument from "pdfkit";
import axios from "axios";

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
const MX = 72;
const CW = PW - MX - 44;
const MT = 44;
const MB = 44;
const FZONE = 26;

async function fetchImageBuffer(url) {
    if (!url) return null;
    try {
        const r = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
        return Buffer.from(r.data);
    } catch {
        return null;
    }
}

function fmt(d) {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtN(n, dp = 2) {
    if (n === null || n === undefined || isNaN(n)) return null;
    const num = Number(n);
    const isInteger = Number.isInteger(num);
    return num.toLocaleString("en-IN", {
        minimumFractionDigits: isInteger ? 0 : dp,
        maximumFractionDigits: isInteger ? 0 : dp,
    });
}

function fmtCurrency(n) {
    if (n === null || n === undefined || isNaN(n)) return null;
    return `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    const isNA = !text || text === "—" || text === "Not Available";
    const fontStr = isNA ? F.italic : (opts.font || F.regular);
    const colorStr = isNA ? C.muted : (opts.color || C.dark);
    const opacityStr = isNA ? 0.55 : (opts.opacity || 1);
    doc.font(fontStr)
        .fontSize(opts.size || 9)
        .fillColor(colorStr)
        .fillOpacity(opacityStr);
    doc.text(isNA ? "Not Available" : String(text), x, y, {
        width: opts.width,
        align: opts.align || "left",
        lineBreak: opts.lineBreak !== false,
    });
    if (isNA) doc.fillOpacity(1);
    doc.restore();
}

function drawInitials(doc, name, x, y, size) {
    const init = (name || "CO").split(/\s+/).slice(0, 2).map((w) => (w[0] || "").toUpperCase()).join("");
    fillRect(doc, x, y, size, size, "#ffffff");
    strokeRect(doc, x, y, size, size, C.border, 0.5);
    absText(doc, init, x, y + size * 0.28, { font: F.bold, size: size * 0.34, color: C.mid, width: size, align: "center" });
}

function drawFooter(doc, ctx) {
    const fy = PH - MB + 4;
    hLine(doc, MX, MX + CW, fy - 2, C.border, 0.5);
    absText(doc, `${ctx.companyName}  ·  Payable ${ctx.payableNumber}  ·  Subject to Kolkata jurisdiction`, MX, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.6,
    });
    absText(doc, `Generated ${new Date().toLocaleString("en-IN")}`, MX + CW * 0.6, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.2, align: "center",
    });
    absText(doc, `Page ${ctx.page} / ${ctx.totalPages}`, MX + CW * 0.8, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.2, align: "right",
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
            doc.font(F.bold).fontSize(11);
            h += doc.heightOfString(item.text, { width }) + 3;
        } else if (item.type === "bigheader") {
            doc.font(F.bold).fontSize(13);
            h += doc.heightOfString(item.text, { width }) + 4;
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
        } else if (item.type === "bigheader") {
            doc.font(F.bold).fontSize(13).fillColor(C.black);
            const th = doc.heightOfString(item.text, { width });
            doc.text(item.text, x, currentY, { width });
            currentY += th + 4;
        } else if (item.type === "header") {
            doc.font(F.bold).fontSize(11).fillColor(C.black);
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

function measureFieldHeight(doc, lbl, value, width) {
    doc.save();
    doc.font(F.bold).fontSize(7.5);
    const lblH = doc.heightOfString(lbl, { width }) + 2;
    doc.font(value ? F.regular : F.italic).fontSize(8);
    const valStr = value || "Not Available";
    const valH = doc.heightOfString(valStr, { width });
    doc.restore();
    return lblH + valH + 8;
}

function drawField(doc, lbl, value, x, y, width) {
    doc.save();
    doc.font(F.bold).fontSize(7.5).fillColor(C.black);
    doc.text(lbl, x + 6, y + 4, { width: width - 12 });
    const lblH = doc.heightOfString(lbl, { width: width - 12 }) + 2;
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
    hLine(doc, x, x + width, y + height, C.border, 0.5);
    if (rightField) {
        const hw = width / 2;
        drawField(doc, leftField.lbl, leftField.val, x, y, hw);
        drawField(doc, rightField.lbl, rightField.val, x + hw, y, hw);
        vLine(doc, x + hw, y, y + height, C.border, 0.5);
    } else {
        drawField(doc, leftField.lbl, leftField.val, x, y, width);
    }
}

const TXN_COLS = [
    { k: "#",           lbl: "Sl",                 fr: 0.04, a: "center" },
    { k: "date",        lbl: "Date",               fr: 0.12, a: "center" },
    { k: "mode",        lbl: "Mode",               fr: 0.14, a: "left"   },
    { k: "ref",         lbl: "Reference",          fr: 0.18, a: "left"   },
    { k: "amount",      lbl: "Amount (Rs.)",       fr: 0.16, a: "right"  },
    { k: "advDed",      lbl: "Adv. Ded. (Rs.)",    fr: 0.17, a: "right"  },
    { k: "totalSettled",lbl: "Total Settled (Rs.)",fr: 0.19, a: "right"  },
];
TXN_COLS.forEach((c) => { c.w = Math.round(c.fr * CW * 10) / 10; });
const driftTxn = CW - TXN_COLS.reduce((s, c) => s + c.w, 0);
TXN_COLS[TXN_COLS.length - 1].w = Math.round((TXN_COLS[TXN_COLS.length - 1].w + driftTxn) * 10) / 10;

const T_H = 22;
const T_PX = 5;
const T_PY = 5;
const T_FS = 8;

function txnRowHeight(doc, txn, idx) {
    const vals = [
        String(idx + 1),
        fmt(txn.paymentDate) || "",
        txn.paymentMode === "Other" ? txn.paymentModeOther || "Other" : txn.paymentMode || "",
        txn.referenceNumber || "",
        fmtCurrency(txn.amount) || "",
        fmtCurrency(txn.advanceDeducted) || "",
        fmtCurrency(txn.totalSettled) || "",
    ];
    let maxH = 0;
    TXN_COLS.forEach((col, ci) => {
        const h = textH(doc, vals[ci], col.w - T_PX * 2, F.regular, T_FS);
        if (h > maxH) maxH = h;
    });
    return Math.max(maxH + T_PY * 2, 18);
}

function txnTableHeader(doc, y) {
    strokeRect(doc, MX, y, CW, T_H, C.border, 0.7);
    let cx = MX;
    TXN_COLS.forEach((col) => {
        absText(doc, col.lbl, cx + T_PX, y + (T_H - T_FS) / 2, {
            font: F.bold, size: T_FS, color: C.black,
            width: col.w - T_PX * 2, align: col.a, lineBreak: false,
        });
        cx += col.w;
    });
    cx = MX;
    TXN_COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + T_H, C.border, 0.7);
    });
    return y + T_H;
}

function txnTableRow(doc, y, txn, idx) {
    const rh = txnRowHeight(doc, txn, idx);
    const vals = [
        String(idx + 1),
        fmt(txn.paymentDate) || "—",
        txn.paymentMode === "Other" ? txn.paymentModeOther || "Other" : txn.paymentMode || "—",
        txn.referenceNumber || "—",
        fmtCurrency(txn.amount) || "—",
        fmtCurrency(txn.advanceDeducted) || "—",
        fmtCurrency(txn.totalSettled) || "—",
    ];
    let cx = MX;
    TXN_COLS.forEach((col, ci) => {
        absText(doc, vals[ci], cx + T_PX, y + T_PY, {
            size: T_FS, color: C.black,
            width: col.w - T_PX * 2, align: col.a, lineBreak: true,
        });
        cx += col.w;
    });
    hLine(doc, MX, MX + CW, y + rh, C.border, 0.7);
    cx = MX;
    TXN_COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + rh, C.border, 0.7);
    });
    vLine(doc, MX, y, y + rh, C.border, 0.7);
    vLine(doc, MX + CW, y, y + rh, C.border, 0.7);
    return y + rh;
}

function txnTableTotal(doc, y, transactions) {
    const totAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0);
    const totAdv = transactions.reduce((s, t) => s + (t.advanceDeducted || 0), 0);
    const totSettled = transactions.reduce((s, t) => s + (t.totalSettled || 0), 0);
    const RH = 22;
    strokeRect(doc, MX, y, CW, RH, C.border, 0.7);
    const vals = [
        "",
        "",
        "",
        "Total",
        fmtCurrency(totAmount) || "",
        fmtCurrency(totAdv) || "",
        fmtCurrency(totSettled) || "",
    ];
    let cx = MX;
    TXN_COLS.forEach((col, ci) => {
        if (vals[ci]) {
            absText(doc, vals[ci], cx + T_PX, y + (RH - T_FS) / 2, {
                font: F.bold, size: T_FS, color: C.black,
                width: col.w - T_PX * 2, align: col.a, lineBreak: false,
            });
        }
        cx += col.w;
    });
    cx = MX;
    TXN_COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + RH, C.border, 0.7);
    });
    return y + RH + 14;
}

function drawAmountSummary(doc, y, payable) {
    const RH = 22;
    const summaryWidth = 270;
    const summaryX = MX + CW - summaryWidth;
    const labelWidth = 165;
    const valueWidth = 95;

    const rows = [
        { label: "Total Amount", value: fmtCurrency(payable.totalAmount) || "Rs. 0.00", bold: false },
        { label: "Total Paid", value: fmtCurrency(payable.paidAmount) || "Rs. 0.00", bold: false },
        payable.advanceDeducted > 0
            ? { label: "Advance Deducted", value: fmtCurrency(payable.advanceDeducted) || "Rs. 0.00", bold: false }
            : null,
        { label: "Due Amount", value: fmtCurrency(payable.dueAmount) || "Rs. 0.00", bold: true },
    ].filter(Boolean);

    rows.forEach((row, i) => {
        const isLast = i === rows.length - 1;
        strokeRect(doc, summaryX, y, summaryWidth, RH, C.border, isLast ? 0.9 : 0.7);
        absText(doc, row.label, summaryX + 8, y + (RH - (row.bold ? 10 : 8)) / 2, {
            font: row.bold ? F.bold : F.regular,
            size: row.bold ? 10 : 8,
            width: labelWidth,
            align: "left",
            lineBreak: false,
        });
        absText(doc, row.value, summaryX + summaryWidth - valueWidth - 8, y + (RH - (row.bold ? 10 : 8)) / 2, {
            font: row.bold ? F.bold : F.regular,
            size: row.bold ? 10 : 8,
            width: valueWidth,
            align: "right",
            lineBreak: false,
        });
        y += RH;
    });
    return y;
}

export async function generatePayableBillPdf(res, { payable, company, project, vendor, transactions }) {
    const logoBuffer = await fetchImageBuffer(company?.logo);
    const ctx = {
        page: 1,
        totalPages: 1,
        payableNumber: payable.payableNumber,
        companyName: company?.companyName || "",
    };

    const doc = new PDFDocument({
        size: "A4",
        margins: { top: MT, bottom: 4, left: MX, right: 44 },
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

    absText(doc, "Payable Bill", MX, y, {
        font: F.bold, size: 14, color: C.black, width: CW * 0.65,
    });

    const logoSize = 40;
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, MX + CW - logoSize, y, { fit: [logoSize, logoSize] });
        } catch {
            drawInitials(doc, company?.companyName, MX + CW - logoSize, y, logoSize);
        }
    } else {
        drawInitials(doc, company?.companyName, MX + CW - logoSize, y, logoSize);
    }

    y += logoSize + 16;

    const leftWidth = CW * 0.55;
    const rightWidth = CW - leftWidth;

    const itemsL1 = [
        { type: "bigheader", text: company?.companyName || "Company Name" },
        {
            type: "text",
            text: [company?.address?.city, company?.address?.state, company?.address?.country]
                .filter(Boolean).join(", "),
        },
        {
            type: "pair",
            label: "Contact",
            value: (company?.phone || company?.email)
                ? `${company.phone || ""} ${company.email || ""}`.trim()
                : null,
        },
        { type: "pair", label: "GSTIN/UIN", value: company?.gstin },
    ];

    const itemsL2 = [
        { type: "title", text: "Consignee (Ship to) / Project Details" },
        { type: "header", text: project?.projectName || "Project Name" },
        { type: "text", text: project?.location },
        { type: "pair", label: "Client Name", value: project?.clientName },
        { type: "pair", label: "Project Code", value: project?.projectCode },
    ];

    const itemsL3 = [
        { type: "title", text: "Vendor (Supplier)" },
        { type: "bigheader", text: vendor?.name || payable.vendorName || "Vendor Name" },
        { type: "text", text: vendor?.address },
        { type: "pair", label: "Type", value: vendor?.vendorType },
        { type: "pair", label: "Contact Person", value: vendor?.contactPerson },
        { type: "pair", label: "Phone", value: vendor?.phone },
        { type: "pair", label: "Email", value: vendor?.email },
        { type: "pair", label: "GSTIN", value: vendor?.legalDetails?.gstin },
    ];

    const sourceLabel = `${payable.sourceType === "GRN" ? "GRN" : payable.sourceType === "WO" ? "Work Order" : "Manual Expense"}`;

    const rightRows = [
        { left: { lbl: "Payable Number", val: payable.payableNumber }, right: { lbl: "Dated", val: fmt(payable.createdAt) } },
        { left: { lbl: "Source Type", val: sourceLabel }, right: { lbl: "Source Number", val: payable.sourceNumber } },
        { left: { lbl: "PO Reference", val: payable.poId ? (payable.poNumber || "") : "N/A" }, right: { lbl: "Due Date", val: fmt(payable.dueDate) } },
        { left: { lbl: "Payment Status", val: payable.status } },
        { left: { lbl: "Total Amount", val: fmtCurrency(payable.totalAmount) }, right: { lbl: "Total Paid", val: fmtCurrency(payable.paidAmount) } },
        { left: { lbl: "Advance Deducted", val: fmtCurrency(payable.advanceDeducted) }, right: { lbl: "Due Amount", val: fmtCurrency(payable.dueAmount) } },
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

    strokeRect(doc, MX, y, CW, H_MAX, C.border, 0.5);
    vLine(doc, MX + leftWidth, y, y + H_MAX, C.border, 0.5);

    let curL_y = y;
    drawBlock(doc, itemsL1, MX + 6, curL_y + 6, leftWidth - 12);
    hLine(doc, MX, MX + leftWidth, curL_y + H_L1, C.border, 0.5);
    curL_y += H_L1;

    drawBlock(doc, itemsL2, MX + 6, curL_y + 6, leftWidth - 12);
    hLine(doc, MX, MX + leftWidth, curL_y + H_L2, C.border, 0.5);
    curL_y += H_L2;

    drawBlock(doc, itemsL3, MX + 6, curL_y + 6, leftWidth - 12);

    let curR_y = y;
    rightRows.forEach((row, idx) => {
        const h = rowHeights[idx];
        drawRightRow(doc, row.left, row.right, MX + leftWidth, curR_y, rightWidth, h);
        curR_y += h;
    });

    y += H_MAX + 16;

    if (transactions && transactions.length > 0) {
        y = space(doc, y, T_H + 30, ctx);
        y = sectionLabel(doc, y, "Payment Transactions");
        y = txnTableHeader(doc, y);
        transactions.forEach((txn, idx) => {
            const rh = txnRowHeight(doc, txn, idx);
            if (y + rh > PH - MB - FZONE) {
                drawFooter(doc, ctx);
                doc.addPage();
                ctx.page += 1;
                y = MT;
                y = txnTableHeader(doc, y);
            }
            y = txnTableRow(doc, y, txn, idx);
        });
        y = space(doc, y, 22, ctx);
        y = txnTableTotal(doc, y, transactions);
    }

    const summaryStartY = y;
    const summaryEndY = drawAmountSummary(doc, y, payable);
    const summaryWidth = 270;
    const leftInfoW = CW - summaryWidth - 16;
    let leftY = summaryStartY + 6;

    if (payable.notes?.trim()) {
        doc.font(F.bold).fontSize(7.5).fillColor(C.black);
        doc.text("Notes & Remarks", MX, leftY, { width: leftInfoW });
        leftY += doc.heightOfString("Notes & Remarks", { width: leftInfoW }) + 3;
        doc.font(F.regular).fontSize(8).fillColor(C.black);
        doc.text(payable.notes.trim(), MX, leftY, { width: leftInfoW });
        leftY += doc.heightOfString(payable.notes.trim(), { width: leftInfoW });
    }

    y = Math.max(summaryEndY, leftY + 8) + 16;

    const SIG_H = 72;
    const sigColW = CW / 3;
    y = space(doc, y, SIG_H + 28, ctx);
    y = sectionLabel(doc, y, "Authorisation & Signatures");
    strokeRect(doc, MX, y, CW, SIG_H, C.border, 0.5);
    ["Prepared By", "Verified By", "Authorised By"].forEach((lbl, s) => {
        const sx = MX + s * sigColW;
        if (s > 0) vLine(doc, sx, y, y + SIG_H, C.border, 0.5);
        hLine(doc, sx, sx + sigColW, y + SIG_H - 20, C.border, 0.5);
        absText(doc, lbl, sx, y + SIG_H - 13, {
            font: F.bold, size: 8, color: C.black,
            width: sigColW, align: "center",
        });
    });

    y += SIG_H + 14;

    ctx.totalPages = ctx.page;
    drawFooter(doc, ctx);
    doc.end();
}