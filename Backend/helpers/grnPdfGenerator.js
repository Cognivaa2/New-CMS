
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

function fmtN(n, dp = 3) {
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
    absText(doc, `${ctx.companyName}  ·  GRN ${ctx.grnNumber}`, MX, fy + 4, {
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
        const leftHeight = textH(
            doc,
            leftVal,
            VAL_W,
            F.regular,
            8
        );
        const rightHeight = textH(
            doc,
            rightVal,
            VAL_W,
            F.regular,
            8
        );
        rowHeights.push(
            Math.max(leftHeight, rightHeight, 10) + PAD_Y * 2
        );
    }
    const gridH = rowHeights.reduce((a, b) => a + b, 0);
    y = space(doc, y, gridH + 10, ctx);
    [left, right].forEach((side, s) => {
        const ox = MX + s * COL_W;
        strokeRect(doc, ox, y, COL_W, gridH, C.border, 0.4);
        let currentY = y;
        side.forEach(([lbl, val], i) => {
            const rh = rowHeights[i];
            if (i % 2 !== 0) {
                fillRect(doc, ox, currentY, COL_W, rh, C.rowAlt);
            }
            if (i > 0) {
                hLine(doc, ox, ox + COL_W, currentY, C.borderFaint, 0.3);
            }
            absText(doc, lbl, ox + PAD_X, currentY + PAD_Y, {
                font: F.bold,
                size: 7.5,
                color: C.muted,
                width: LBL_W,
            });
            absText(doc, val || "—", ox + PAD_X + LBL_W, currentY + PAD_Y, {
                size: 8,
                color: C.dark,
                width: VAL_W,
            });
            currentY += rh;
        });
    });
    vLine(doc, MX + COL_W, y, y + gridH, C.border, 0.4);
    return y + gridH + 12;
}


const COLS = [
    { k: "no", lbl: "#", fr: 0.04, a: "center" },
    { k: "name", lbl: "Material", fr: 0.27, a: "left" },
    { k: "unit", lbl: "Unit", fr: 0.07, a: "center" },
    { k: "ord", lbl: "Ordered", fr: 0.12, a: "right" },
    { k: "prev", lbl: "Prev. Rcvd", fr: 0.12, a: "right" },
    { k: "this", lbl: "This GRN", fr: 0.12, a: "right" },
    { k: "bal", lbl: "Balance", fr: 0.12, a: "right" },
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
    const bal = (item.orderedQuantity || 0) - (item.previouslyReceivedQuantity || 0) - (item.receivedQuantity || 0);
    const vals = [
        String(i + 1),
        String(item.materialName || ""),
        String(item.unit || ""),
        fmtN(item.orderedQuantity),
        fmtN(item.previouslyReceivedQuantity),
        fmtN(item.receivedQuantity),
        fmtN(bal),
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
    fillRect(doc, MX, y, CW, TH, C.headerBg);
    strokeRect(doc, MX, y, CW, TH, C.border, 0.4);

    let cx = MX;
    COLS.forEach((col) => {
        absText(doc, col.lbl, cx + TPX, y + TPY, {
            font: F.bold, size: TFS, color: C.mid,
            width: col.w - TPX * 2, align: col.a, lineBreak: false,
        });
        cx += col.w;
    });
    cx = MX;
    COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + TH, C.borderFaint, 0.4);
    });

    return y + TH;
}


function tableRow(doc, y, item, i) {
    const rh = rowHeight(doc, item, i);
    const bal = (item.orderedQuantity || 0) - (item.previouslyReceivedQuantity || 0) - (item.receivedQuantity || 0);
    if (i % 2 !== 0) fillRect(doc, MX, y, CW, rh, C.rowAlt);
    const vals = [
        String(i + 1),
        String(item.materialName || "—"),
        String(item.unit || "—"),
        fmtN(item.orderedQuantity),
        fmtN(item.previouslyReceivedQuantity),
        fmtN(item.receivedQuantity),
        fmtN(bal),
        String(item.remarks || "—"),
    ];

    let cx = MX;
    COLS.forEach((col, ci) => {
        const color = (col.k === "bal" && bal < 0) ? C.negative : C.dark;
        absText(doc, vals[ci], cx + TPX, y + TPY, {
            size: TFS, color,
            width: col.w - TPX * 2, align: col.a, lineBreak: true,
        });
        cx += col.w;
    });
    hLine(doc, MX, MX + CW, y + rh, C.borderFaint, 0.3);
    cx = MX;
    COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + rh, C.borderFaint, 0.3);
    });
    vLine(doc, MX, y, y + rh, C.border, 0.4);
    vLine(doc, MX + CW, y, y + rh, C.border, 0.4);

    return y + rh;
}


function tableTotals(doc, y, items, totalAmount) {
    const tot = (f) => items.reduce((s, it) => s + (it[f] || 0), 0);
    const ord = tot("orderedQuantity");
    const prev = tot("previouslyReceivedQuantity");
    const rcv = tot("receivedQuantity");
    const bal = ord - prev - rcv;
    const RH = 19;
    fillRect(doc, MX, y, CW, RH, C.headerBg);
    strokeRect(doc, MX, y, CW, RH, C.border, 0.4);
    const vals = [
        "",
        `TOTAL (${items.length} item${items.length !== 1 ? "s" : ""})`,
        "",
        fmtN(ord),
        fmtN(prev),
        fmtN(rcv),
        fmtN(bal),
        "",
    ];

    let cx = MX;
    COLS.forEach((col, ci) => {
        if (vals[ci]) {
            absText(doc, vals[ci], cx + TPX, y + (RH - TFS) / 2, {
                font: F.bold,
                size: TFS,
                color: C.dark,
                width: col.w - TPX * 2,
                align: col.a,
                lineBreak: false,
            });
        }

        cx += col.w;
    });
    cx = MX;
    COLS.slice(0, -1).forEach((col) => {
        cx += col.w;
        vLine(doc, cx, y, y + RH, C.borderFaint, 0.4);
    });
    absText(
        doc,
        `GRN Amount : ₹ ${fmtN(totalAmount || 0, 2)} Rs.`,
        MX + CW - 180,
        y + RH + 8,
        {
            font: F.bold,
            size: 9,
            color: C.dark,
            width: 180,
            align: "right",
        }
    );

    return y + RH + 22;
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



export async function generateGRNPdf(res, { grn, company, vendor, project, createdByUser }) {
    const logoBuffer = await fetchImageBuffer(company?.logo);
    const ctx = {
        page: 1,
        grnNumber: grn.grnNumber,
        companyName: company?.companyName || "",
    };

    const doc = new PDFDocument({
        size: "A4",
        margins: { top: MT, bottom: 4, left: MX, right: MX },
        info: {
            Title: `GRN ${grn.grnNumber}`,
            Author: company?.companyName || "System",
            Subject: "Goods Receipt Note",
            Creator: "Procurement Management System",
        },
        compress: true,
        autoFirstPage: false,
    });

    const safeName = grn.grnNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="GRN_${safeName}.pdf"`);
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
    absText(doc, "GOODS RECEIPT NOTE", MX, y, {
        font: F.bold, size: 15, color: C.dark, width: CW * 0.6,
    });
    absText(doc, grn.grnNumber, MX + CW * 0.6, y + 2, {
        font: F.bold, size: 12, color: C.mid,
        width: CW * 0.4, align: "right",
    });

    y += 22;
    hLine(doc, MX, MX + CW, y, C.dark, 0.8);
    y += 13;

    y = label(doc, y, "Delivery Information");
    y = twoColGrid(doc, y, [
        ["Delivery Date", fmt(grn.deliveryDate)],
        ["Challan Number", grn.deliveryChallanNumber || "—"],
        ["Challan Date", fmt(grn.deliveryChallanDate)],
        ["Vehicle Number", grn.vehicleNumber || "—"],
        ["PO Reference", grn.poNumber || "—"],
    ], [
        ["Created By", createdByUser?.name || "—"],
        ["Email", createdByUser?.email || "—"],
        ["Role", createdByUser?.role || createdByUser?.designation || "—"],
        ["Created On", fmt(grn.createdAt)],
        ["Status", "RECEIVED"],
    ], ctx);


    y = space(doc, y, 50, ctx);
    y = label(doc, y, "Project & Vendor Details");

    const projectRows = [
        ["Project Name", project?.projectName],
        ["Project Code", project?.projectCode],
        ["Location", project?.location],
        ["Client", project?.clientName],
        ["Status", project?.status?.replace(/_/g, " ")],
        ["Start Date", fmt(project?.startDate)],
        ["End Date", fmt(project?.endDate)],
    ].filter(([, v]) => v != null && v !== "");

    const vendorRows = [
        ["Vendor Name", vendor?.name],
        ["Type", vendor?.vendorType],
        ["Contact Person", vendor?.contactPerson],
        ["Phone", vendor?.phone],
        ["Email", vendor?.email],
        ["Address", vendor?.address],
        ["GSTIN", vendor?.legalDetails?.gstin],
        ["PAN", vendor?.legalDetails?.panNumber],
    ].filter(([, v]) => v != null && v !== "");

    y = twoColGrid(doc, y, projectRows, vendorRows, ctx);

    y = space(doc, y, TH + 30, ctx);
    y = label(doc, y, "Received Items");
    y = tableHeader(doc, y);

    grn.items.forEach((item, i) => {
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
    y = tableTotals(doc, y, grn.items, grn.totalAmount);
    y += 14;

    if (grn.remarks?.trim()) {
        const rmkW = CW - 14;
        const rmkH = textH(doc, grn.remarks, rmkW, F.regular, 9) + 16;

        y = space(doc, y, rmkH + 30, ctx);
        y = label(doc, y, "Remarks & Notes");

        strokeRect(doc, MX, y, CW, rmkH, C.border, 0.4);
        absText(doc, grn.remarks, MX + 7, y + 8, {
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