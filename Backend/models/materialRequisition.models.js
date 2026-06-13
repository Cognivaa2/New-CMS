import mongoose from "mongoose";

const { Schema } = mongoose;

const itemSchema = new Schema(
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
        requiredQuantity: {
            type: Number,
            required: true,
            min: 0.001,
        },
        stockAtTimeOfMR: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const materialRequisitionSchema = new Schema(
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
        phaseId: {
            type: Schema.Types.ObjectId,
            ref: "Phase",
            default: null,
        },
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        subTaskId: {
            type: Schema.Types.ObjectId,
            ref: "SubTask",
            default: null,
        },
        mrNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        items: [itemSchema],
        requiredByDate: {
            type: Date,
            default: null,
        },
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
            enum: ["Draft", "Submitted", "Approved", "Rejected", "ConvertedToPO"],
            default: "Draft",
            index: true,
        },
        submittedAt: {
            type: Date,
            default: null,
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
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

materialRequisitionSchema.index(
    { companyId: 1, mrNumber: 1 },
    { unique: true }
);

materialRequisitionSchema.index({ projectId: 1, status: 1, isDeleted: 1 });

const MaterialRequisition = mongoose.model(
    "MaterialRequisition",
    materialRequisitionSchema
);

export default MaterialRequisition;