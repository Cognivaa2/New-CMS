import mongoose from "mongoose";
const { Schema } = mongoose;

const contraEntrySchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        ceNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        poId: {
            type: Schema.Types.ObjectId,
            ref: "PurchaseOrder",
            required: true,
            index: true,
        },
        poNumber: {
            type: String,
            required: true,
            trim: true,
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },
        vendorName: {
            type: String,
            required: true,
            trim: true,
        },
        payableId: {
            type: Schema.Types.ObjectId,
            ref: "Payable",
            default: null,
        },
        type: {
            type: String,
            enum: [
                "QUANTITY_CORRECTION",
                "PRICE_CORRECTION",
                "OTHER",
            ],
            required: true,
            index: true,
        },
        adjustmentAmount: {
            type: Number,
            required: true,
        },
        direction: {
            type: String,
            enum: ["DEBIT_VENDOR", "CREDIT_VENDOR"],
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        remarks: {
            type: String,
            trim: true,
            default: null,
        },
        status: {
            type: String,
            enum: ["Draft", "Submitted", "Approved", "Rejected"],
            default: "Draft",
            index: true,
        },
        submittedAt: { type: Date, default: null },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectedAt: { type: Date, default: null },
        rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectionRemarks: { type: String, trim: true, default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

contraEntrySchema.index(
    { companyId: 1, ceNumber: 1 },
    { unique: true, name: "unique_ce_number_per_company" }
);
contraEntrySchema.index(
    { companyId: 1, poId: 1, isDeleted: 1 },
    { name: "ce_by_po" }
);
contraEntrySchema.index(
    { companyId: 1, vendorId: 1, isDeleted: 1 },
    { name: "ce_by_vendor" }
);
contraEntrySchema.index(
    { companyId: 1, projectId: 1, status: 1, isDeleted: 1 },
    { name: "ce_project_status" }
);

const ContraEntry = mongoose.model("ContraEntry", contraEntrySchema);
export default ContraEntry;