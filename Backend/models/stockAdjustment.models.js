import mongoose from "mongoose";
const { Schema } = mongoose;

const stockAdjustmentSchema = new Schema(
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
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
            index: true,
        },
        materialMasterId: {
            type: Schema.Types.ObjectId,
            ref: "MaterialMaster",
            required: true,
        },
        materialName: {
            type: String,
            required: true,
            trim: true,
        },
        unit: {
            type: String,
            required: true,
            trim: true,
        },
        saNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        adjustmentType: {
            type: String,
            enum: ["add", "subtract"],
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0.001,
        },
        stockBefore: {
            type: Number,
            required: true,
            min: 0,
        },
        stockAfter: {
            type: Number,
            default: null,
        },
        reason: {
            type: String,
            enum: ["Damage", "Wastage", "Correction", "OpeningBalance", "Other"],
            required: true,
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
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

stockAdjustmentSchema.index(
    { companyId: 1, saNumber: 1 },
    { unique: true, name: "unique_sa_number_per_company" }
);
stockAdjustmentSchema.index(
    { companyId: 1, projectId: 1, status: 1, isDeleted: 1 },
    { name: "sa_project_status" }
);
stockAdjustmentSchema.index(
    { companyId: 1, inventoryId: 1, isDeleted: 1 },
    { name: "sa_by_inventory" }
);

const StockAdjustment = mongoose.model("StockAdjustment", stockAdjustmentSchema);
export default StockAdjustment;