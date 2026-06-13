import mongoose from "mongoose";

const { Schema } = mongoose;

const workItemSchema = new Schema(
    {
        description: {
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
        unitRate: {
            type: Number,
            required: true,
            min: 0,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        remarks: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { _id: false }
);

const milestoneSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        triggerPercent: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
        },
        paymentPercent: {
            type: Number,
            required: true,
            min: 0.01,
            max: 100,
        },
        paymentAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["Pending", "Triggered", "Paid"],
            default: "Pending",
        },
        triggeredAt: {
            type: Date,
            default: null,
        },
    },
    { _id: true }
);


const workOrderSchema = new Schema(
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
        woNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        workItems: {
            type: [workItemSchema],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: "A Work Order must have at least one work item.",
            },
        },
        totalContractValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        hasMilestones: {
            type: Boolean,
            default: false,
        },
        milestones: {
            type: [milestoneSchema],
            default: [],
        },
        completionPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        startDate: {
            type: Date,
            default: null,
        },
        expectedEndDate: {
            type: Date,
            default: null,
        },
        actualEndDate: {
            type: Date,
            default: null,
        },
        paymentTerms: {
            type: String,
            trim: true,
            default: null,
        },
        specialInstructions: {
            type: String,
            trim: true,
            default: null,
        },
        workLocation: {
            type: String,
            trim: true,
            default: null,
        },
        status: {
            type: String,
            enum: [
                "Draft",
                "Submitted",
                "Approved",
                "Rejected",
                "InProgress",
                "Completed",
                "Cancelled",
            ],
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
        cancelledAt: { type: Date, default: null },
        cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        cancellationRemarks: { type: String, trim: true, default: null },
        inProgressAt: { type: Date, default: null },
        inProgressBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        completedAt: { type: Date, default: null },
        completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        completionRemarks: { type: String, trim: true, default: null },

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
        deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

workOrderSchema.index(
    { companyId: 1, woNumber: 1 },
    { unique: true, name: "unique_wo_number_per_company" }
);
workOrderSchema.index(
    { companyId: 1, projectId: 1, status: 1, isDeleted: 1 },
    { name: "wo_project_status" }
);
workOrderSchema.index(
    { companyId: 1, vendorId: 1, isDeleted: 1 },
    { name: "wo_by_vendor" }
);
workOrderSchema.index(
    { companyId: 1, projectId: 1, isDeleted: 1, createdAt: -1 },
    { name: "wo_project_list" }
);

const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
export default WorkOrder;