import mongoose from "mongoose";

const { Schema } = mongoose;

const dprEventSchema = new Schema(
    {
        actorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        actorName: {
            type: String,
            trim: true,
            default: "System",
        },
        module: {
            type: String,
            enum: [
                "Task",
                "SubTask",
                "MaterialConsumption",
                "StockTransfer",
                "MaterialRequisition",
                "PurchaseOrder",
                "GRN",
                "WorkOrder",
                "Expense",
            ],
            required: true,
        },
        action: {
            type: String,
            enum: [
                "TaskCreated",
                "TaskUpdated",
                "TaskDeleted",
                "SubTaskCreated",
                "SubTaskUpdated",
                "SubTaskDeleted",
                "ProgressUpdated",
                "MaterialConsumed",
                "MaterialConsumptionDeleted",
                "StockOutgoing",
                "StockIncoming",
                "StockTransferApproved",
                "StockTransferRejected",
                "MRCreated",
                "MRSubmitted",
                "MRApproved",
                "MRRejected",
                "MRConvertedToPO",
                "POCreated",
                "POSubmitted",
                "POApproved",
                "PORejected",
                "POPartiallyDelivered",
                "POCompleted",
                "POCancelled",
                "GRNCreated",
                "WOCreated",
                "WOSubmitted",
                "WOApproved",
                "WORejected",
                "WOInProgress",
                "WOCompleted",
                "WOCancelled",
                "ExpenseCreated",
                "ExpenseApproved",
                "ExpenseRejected",
                "ExpenseReversed",
            ],
            required: true,
        },
        refId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        refNumber: {
            type: String,
            trim: true,
            default: null,
        },

        details: {
            type: Schema.Types.Mixed,
            default: {},
        },
        eventAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { _id: true }
);


const dprSchema = new Schema(
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
        reportDate: {
            type: Date,
            required: true,
            index: true,
        },
        events: {
            type: [dprEventSchema],
            default: [],
        },
        summary: {
            totalSubTasks: { type: Number, default: 0 },
            completedSubTasks: { type: Number, default: 0 },
            overallProgressPercent: { type: Number, default: 0 },
            totalConsumptionEntries: { type: Number, default: 0 },
            totalMaterialCost: { type: Number, default: 0 },
            totalOutgoingTransfers: { type: Number, default: 0 },
            totalIncomingTransfers: { type: Number, default: 0 },
            mrCount: { type: Number, default: 0 },
            poCount: { type: Number, default: 0 },
            grnCount: { type: Number, default: 0 },
            woCount: { type: Number, default: 0 },
            totalExpenseAmount: { type: Number, default: 0 },
            totalEvents: { type: Number, default: 0 },
            lastActivityAt: { type: Date, default: null },
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

dprSchema.index(
    { companyId: 1, projectId: 1, reportDate: 1 },
    { unique: true, name: "unique_dpr_per_project_per_day" }
);

dprSchema.index(
    { companyId: 1, projectId: 1, isDeleted: 1, reportDate: -1 },
    { name: "dpr_project_date_list" }
);

const DPR = mongoose.model("DPR", dprSchema);
export default DPR;