import mongoose from "mongoose";

const { Schema } = mongoose;

export const NOTIFICATION_TYPES = [
    "PROJECT_ASSIGNED",
    "TASK_ASSIGNED",
    "SUBTASK_ASSIGNED",
    "TASK_OVERDUE",
    "SUBTASK_OVERDUE",
    "PHASE_OVERDUE",
    "MR_SUBMITTED",
    "MR_APPROVED",
    "MR_REJECTED",
    "PO_APPROVED",
    "PO_REJECTED",
    "GRN_CREATED",
    "WO_APPROVED",
    "WO_REJECTED",
    "ISSUE_RAISED",
    "ISSUE_RESOLVED",
    "STOCK_TRANSFER_CREATED",
    "INVENTORY_LOW_STOCK",
    "INVENTORY_ADDED",
    "MATERIAL_ADDED",
    "MANUAL",
];

export const NOTIFICATION_REF_MODELS = [
    "Project",
    "Task",
    "SubTask",
    "Phase",
    "Inventory",
    "MaterialRequisition",
    "PurchaseOrder",
    "GRN",
    "WorkOrder",
    "Issue",
    "StockTransfer",
    "User",
];

export const NOTIFICATION_CHANNELS = ["user", "system", "manual"];

const notificationMetaSchema = new Schema(
    {
        projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
        projectName: { type: String, trim: true, default: null },
        taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
        taskName: { type: String, trim: true, default: null },
        subTaskId: { type: Schema.Types.ObjectId, ref: "SubTask", default: null },
        subTaskTitle: { type: String, trim: true, default: null },
        phaseId: { type: Schema.Types.ObjectId, ref: "Phase", default: null },
        phaseName: { type: String, trim: true, default: null },
        inventoryId: { type: Schema.Types.ObjectId, ref: "Inventory", default: null },
        materialName: { type: String, trim: true, default: null },
        currentStock: { type: Number, default: null },
        minimumLevel: { type: Number, default: null },
        unit: { type: String, trim: true, default: null },
        dueDate: { type: Date, default: null },
        daysOverdue: { type: Number, default: null },
        assignedByName: { type: String, trim: true, default: null },
        refNumber: { type: String, trim: true, default: null },
        extra: { type: Schema.Types.Mixed, default: null },
    },
    { _id: false }
);

const notificationSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        triggeredBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        channel: {
            type: String,
            enum: NOTIFICATION_CHANNELS,
            default: "system",
        },
        type: {
            type: String,
            enum: NOTIFICATION_TYPES,
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        refModel: {
            type: String,
            enum: NOTIFICATION_REF_MODELS,
            default: null,
        },
        refId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true,
        },
        metadata: {
            type: notificationMetaSchema,
            default: () => ({}),
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
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

notificationSchema.index(
    { companyId: 1, recipientId: 1, isRead: 1, isDeleted: 1, createdAt: -1 },
    { name: "inbox_unread" }
);
notificationSchema.index(
    { companyId: 1, recipientId: 1, isDeleted: 1, createdAt: -1 },
    { name: "inbox_full" }
);
notificationSchema.index(
    { companyId: 1, projectId: 1, isDeleted: 1, createdAt: -1 },
    { name: "project_notifications" }
);
notificationSchema.index(
    { companyId: 1, recipientId: 1, type: 1, refId: 1, createdAt: -1 },
    { name: "dedup_guard" }
);
notificationSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 3, name: "ttl_3_days" }
);

notificationSchema.methods.markRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
    return this;
};

notificationSchema.statics.fanOut = async function (recipientIds, commonOpts) {
    if (!recipientIds?.length) return [];
    const docs = recipientIds.map((recipientId) => ({
        companyId: commonOpts.companyId,
        recipientId,
        triggeredBy: commonOpts.triggeredBy ?? null,
        channel: commonOpts.channel ?? (commonOpts.triggeredBy ? "user" : "system"),
        type: commonOpts.type,
        title: commonOpts.title,
        message: commonOpts.message,
        refModel: commonOpts.refModel ?? null,
        refId: commonOpts.refId ?? null,
        projectId: commonOpts.projectId ?? null,
        metadata: commonOpts.metadata ?? {},
    }));
    return this.insertMany(docs, { ordered: false });
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;