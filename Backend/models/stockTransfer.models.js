import mongoose from "mongoose";

const { Schema } = mongoose;

const transferItemSchema = new Schema(
    {
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
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

        quantity: {
            type: Number,
            required: true,
            min: 0.001,
        },

        stockAtTimeOfTransfer: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const stockTransferSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },

        fromProjectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        toProjectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        items: [transferItemSchema],

        reason: {
            type: String,
            trim: true,
            default: null,
        },

        remarks: {
            type: String,
            trim: true,
            default: null,
        },

        status: {
            type: String,
            enum: ["Draft", "Approved", "Rejected"],
            default: "Draft",
            index: true,
        },

        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        rejectedAt: {
            type: Date,
            default: null,
        },

        rejectionRemarks: {
            type: String,
            trim: true,
            default: null,
        },

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

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

stockTransferSchema.index({ companyId: 1, fromProjectId: 1, status: 1, isDeleted: 1 });
stockTransferSchema.index({ companyId: 1, toProjectId: 1, status: 1, isDeleted: 1 });
stockTransferSchema.index({ companyId: 1, status: 1, isDeleted: 1 });

const StockTransfer = mongoose.model("StockTransfer", stockTransferSchema);
export default StockTransfer;