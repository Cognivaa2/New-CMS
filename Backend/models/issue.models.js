import mongoose from "mongoose";

const { Schema } = mongoose;

export const ISSUE_TYPES = [
    "site_hazard",
    "material_shortage",
    "task_delay",
    "quality_defect",
    "equipment_breakdown",
    "safety_concern",
    "design_change",
    "financial_exception",
    "other",
];

export const ISSUE_PRIORITIES = ["low", "medium", "high", "critical"];
export const ISSUE_STATUSES = ["submitted", "resolved", "rejected"];

const attachmentSchema = new Schema(
    {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, default: null },
        fileSize: { type: Number, default: null },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const commentSchema = new Schema(
    {
        text: { type: String, required: true, trim: true },
        image: { type: attachmentSchema, default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isDeleted: { type: Boolean, default: false },
        editedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

const issueSchema = new Schema(
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
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        subtaskId: {
            type: Schema.Types.ObjectId,
            ref: "SubTask",
            default: null,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        issueType: {
            type: String,
            enum: ISSUE_TYPES,
            required: true,
        },
        priority: {
            type: String,
            enum: ISSUE_PRIORITIES,
            default: "medium",
        },
        status: {
            type: String,
            enum: ISSUE_STATUSES,
            default: "submitted",
        },
        assignedTo: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            }
        ],
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        resolvedAt: { type: Date, default: null },
        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rejectedAt: { type: Date, default: null },
        rejectionRemark: { type: String, default: null },
        dueDate: { type: Date, default: null },
        tags: [{ type: String, trim: true }],

        attachments: [attachmentSchema],

        comments: [commentSchema],

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
    },
    { timestamps: true }
);

issueSchema.index({ companyId: 1, projectId: 1, status: 1 });
issueSchema.index({ companyId: 1, assignedTo: 1, status: 1 });
issueSchema.index({ companyId: 1, createdBy: 1 });
issueSchema.index({ companyId: 1, priority: 1, status: 1 });

const Issue = mongoose.model("Issue", issueSchema);
export default Issue;