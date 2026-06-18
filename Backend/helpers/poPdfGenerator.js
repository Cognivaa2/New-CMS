import PDFDocument from "pdfkit";
import axios from "axios";

const C = {
    black: "#000000",
    dark: "#000000",
    mid: "#000000",
    muted: "#444444",
    light: "#000000",
    border: "#efefef",
    borderFaint: "#efefef",
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
        width: opts.width,
        align: opts.align || "left",
        lineBreak: opts.lineBreak !== false,
    });
    doc.restore();
}

function drawFooter(doc, ctx) {
    const fy = PH - MB + 4;
    hLine(doc, MX, MX + CW, fy - 2, C.border, 0.3);
    absText(doc, `${ctx.companyName}  ·  PO ${ctx.poNumber}  ·  Subject to Kolkata jurisdiction`, MX, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.65,
    });
    absText(doc, `Generated ${new Date().toLocaleString("en-IN")}`, MX + CW * 0.65, fy + 4, {
        size: 7, color: C.muted, width: CW * 0.17, align: "center",
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
    absText(doc, text, MX, y, {
        font: F.bold, size: 7.5, color: C.black,
    });
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

const COLS = [
    { k: "no", lbl: "Sl", fr: 0.04, a: "center" },
    { k: "name", lbl: "Material", fr: 0.24, a: "left" },
    { k: "sac", lbl: "SAC", fr: 0.08, a: "center" },
    { k: "unit", lbl: "Unit", fr: 0.07, a: "center" },
    { k: "qty", lbl: "Qty", fr: 0.07, a: "right" },
    { k: "price", lbl: "Price", fr: 0.11, a: "right" },
    { k: "gst", lbl: "GST %", fr: 0.07, a: "right" },
    { k: "disc", lbl: "Disc %", fr: 0.07, a: "right" },
    { k: "total", lbl: "Total", fr: 0.11, a: "right" },
    { k: "rmk", lbl: "Remarks", fr: 0.14, a: "left" },
];
COLS.forEach((c) => { c.w = Math.round(c.fr * CW * 10) / 10; });
const drift = CW - COLS.reduce((s, c) => s + c.w, 0);
COLS[COLS.length - 1].w = Math.round((COLS[COLS.length - 1].w + drift) * 10) / 10;

const TH = 19;
const TPX = 5;
const TPY = 5;
const TFS = 8;

function rowHeight(doc, item, i) {
    const vals = [
        String(i + 1),
        String(item.materialName || ""),
        String(item.sacNumber || ""),
        String(item.unit || ""),
        fmtN(item.orderedQuantity),
        fmtN(item.unitPrice),
        fmtN(item.gstPercent),
        fmtN(item.discountPercent),
        fmtN(item.totalPrice),
        String(item.remarks || ""),
    ];
    let maxH = 0;
    COLS.forEach((col, ci) => {
        const h = textH(doc, vals[ci], col.w - TPX * 2, F.regular, TFS);
        if (h > maxH) maxH = h;
    });
    return Math.max(maxH + TPY * 2, 16);
}

function tableHeader(doc, y) {
    strokeRect(doc, MX, y, CW, TH, C.border, 0.3);
    let cx = MX;
    COLS.forEach((col) => {
        absText(doc, col.lbl, cx + TPX, y + TPY, {
            font: F.bold, size: TFS, color: C.black,
            width: col.w - TPX * 2, align: col.a, lineBreak: false,
        });
        cx += col.w;
    });
    cx = MX;
    COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + TH, C.border, 0.3);
    });
    return y + TH;
}

function tableRow(doc, y, item, i) {
    const rh = rowHeight(doc, item, i);
    const vals = [
        String(i + 1),
        String(item.materialName || ""),
        String(item.sacNumber || ""),
        String(item.unit || ""),
        fmtN(item.orderedQuantity),
        fmtN(item.unitPrice),
        fmtN(item.gstPercent),
        fmtN(item.discountPercent),
        fmtN(item.totalPrice),
        String(item.remarks || ""),
    ];
    let cx = MX;
    COLS.forEach((col, ci) => {
        absText(doc, vals[ci], cx + TPX, y + TPY, {
            size: TFS, color: C.black,
            width: col.w - TPX * 2, align: col.a, lineBreak: true,
        });
        cx += col.w;
    });
    hLine(doc, MX, MX + CW, y + rh, C.border, 0.3);
    cx = MX;
    COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + rh, C.border, 0.3);
    });
    vLine(doc, MX, y, y + rh, C.border, 0.3);
    vLine(doc, MX + CW, y, y + rh, C.border, 0.3);
    return y + rh;
}

function tableTotals(doc, y, items) {
    const qty = items.reduce((s, it) => s + (it.orderedQuantity || 0), 0);
    const totalP = items.reduce((s, it) => s + (it.totalPrice || 0), 0);
    const RH = 19;
    strokeRect(doc, MX, y, CW, RH, C.border, 0.3);
    const vals = ["", `Total (${items.length} item${items.length !== 1 ? "s" : ""})`, "", "", fmtN(qty), "", "", "", fmtN(totalP), ""];
    let cx = MX;
    COLS.forEach((col, ci) => {
        if (vals[ci]) {
            absText(doc, vals[ci], cx + TPX, y + (RH - TFS) / 2, {
                font: F.bold, size: TFS, color: C.black,
                width: col.w - TPX * 2, align: col.a, lineBreak: false,
            });
        }
        cx += col.w;
    });
    cx = MX;
    COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + RH, C.border, 0.3);
    });
    return y + RH;
}

function tableAmountBreakdown(doc, y, items) {
    const subtotal = items.reduce((s, it) => s + (it.totalPrice || 0), 0);
    const totalGst = items.reduce((s, it) => s + (it.gstAmount || 0), 0);
    const totalDiscount = items.reduce((s, it) => s + (it.discountAmount || 0), 0);
    const finalAmount = subtotal;

    const RH = 22;
    const summaryWidth = 260;
    const summaryX = MX + CW - summaryWidth;
    const labelWidth = 160;
    const valueWidth = 90;

    const rows = [
        { label: "Sub Total (Before Tax)", value: `Rs. ${fmtN(subtotal + totalDiscount - totalGst, 2)}`, bold: false },
        totalDiscount > 0 ? { label: "Total Discount", value: `- Rs. ${fmtN(totalDiscount, 2)}`, bold: false } : null,
        totalGst > 0 ? { label: "Total GST", value: `+ Rs. ${fmtN(totalGst, 2)}`, bold: false } : null,
        { label: "Final Payable Amount", value: `Rs. ${fmtN(finalAmount, 2)}`, bold: true },
    ].filter(Boolean);

    rows.forEach((row, i) => {
        const isLast = i === rows.length - 1;
        if (isLast) fillRect(doc, summaryX, y, summaryWidth, RH, "#f9f9f9");
        strokeRect(doc, summaryX, y, summaryWidth, RH, C.border, isLast ? 0.6 : 0.3);
        absText(doc, row.label, summaryX + 8, y + 6, {
            font: row.bold ? F.bold : F.regular,
            size: row.bold ? 10 : 8,
            width: labelWidth,
            align: "left",
            lineBreak: false,
        });
        absText(doc, row.value, summaryX + summaryWidth - valueWidth - 8, y + 6, {
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

export async function generatePOPdf(res, { po, company, vendor, project, createdByUser }) {
    const logoBuffer = await fetchImageBuffer(company?.logo);
    const ctx = { page: 1, poNumber: po.poNumber, companyName: company?.companyName || "" };

    const doc = new PDFDocument({
        size: "A4",
        margins: { top: MT, bottom: 4, left: MX, right: MX },
        info: {
            Title: `PO ${po.poNumber}`,
            Author: company?.companyName || "System",
            Subject: "Purchase Order",
            Creator: "Procurement Management System",
        },
        compress: true,
        autoFirstPage: false,
    });

    const safeName = po.poNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="PO_${safeName}.pdf"`);
    doc.pipe(res);
    doc.addPage();
    let y = MT;

    absText(doc, "Purchase Order", MX, y, {
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

    absText(doc, "Original Copy", MX + CW * 0.6, y + 2, {
        font: F.regular, size: 8, color: C.muted,
        width: CW * 0.4 - logoSize - 6, align: "right",
    });

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
        { type: "title", text: "Vendor (Supplier)" },
        { type: "header", text: vendor?.name || "Vendor Name" },
        { type: "text", text: vendor?.address },
        { type: "pair", label: "Contact Person", value: vendor?.contactPerson },
        { type: "pair", label: "Phone", value: vendor?.phone },
        { type: "pair", label: "Email", value: vendor?.email },
        { type: "pair", label: "GSTIN", value: vendor?.legalDetails?.gstin },
        { type: "pair", label: "PAN", value: vendor?.legalDetails?.panNumber },
    ];

    const rightRows = [
        { left: { lbl: "PO Number", val: po.poNumber }, right: { lbl: "Dated", val: fmt(po.createdAt) } },
        { left: { lbl: "Expected Delivery", val: fmt(po.expectedDeliveryDate) }, right: { lbl: "Status", val: po.status } },
        { left: { lbl: "Payment Terms", val: po.paymentTerms } },
        { left: { lbl: "Special Instructions", val: po.specialInstructions } },
        { left: { lbl: "Delivery Address", val: po.deliveryAddress } },
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

    y = space(doc, y, TH + 30, ctx);
    y = label(doc, y, "Order Items");
    y = tableHeader(doc, y);

    po.items.forEach((item, i) => {
        const rh = rowHeight(doc, item, i);
        if (y + rh > PH - MB - FZONE) {
            drawFooter(doc, ctx);
            doc.addPage();
            ctx.page += 1;
            y = MT;
            y = tableHeader(doc, y);
        }
        y = tableRow(doc, y, item, i);
    });

    y = space(doc, y, 19, ctx);
    y = tableTotals(doc, y, po.items);
    y = tableAmountBreakdown(doc, y, po.items);
    y += 14;

    const SIG_H = 68;
    const sigColW = CW / 3;

    y = space(doc, y, SIG_H + 25, ctx);
    y = label(doc, y, "Authorisation & Signatures");

    strokeRect(doc, MX, y, CW, SIG_H, C.border, 0.3);

    ["Prepared by", "Verified by", "Authorized Signatory"].forEach((lbl, s) => {
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