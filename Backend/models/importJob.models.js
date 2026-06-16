import mongoose from "mongoose";
const { Schema } = mongoose;

const rowResultSchema = new Schema(
    {
        row: { type: Number, required: true },
        status: { type: String, enum: ["success", "failed"], required: true },
        identifier: { type: String, default: null },
        error: { type: String, default: null },
    },
    { _id: false }
);

const importJobSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        module: {
            type: String,
            enum: [
                "roles",
                "users",
                "materialMaster",
                "vendors",
                "projects",
                "phases",
                "tasks",
                "subtasks",
                "projectInventory",
                "stockTransfers",
                "materialRequisitions",
                "purchaseOrders",
                "grns",
                "workOrders",
                "expenses",
                "payables",
                "issues",
            ],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
            index: true,
        },
        totalRows: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        skippedCount: { type: Number, default: 0 },
        results: { type: [rowResultSchema], default: [] },
        errorMessage: { type: String, default: null },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

importJobSchema.index({ companyId: 1, module: 1, createdAt: -1 });

const ImportJob = mongoose.model("ImportJob", importJobSchema);
export default ImportJob;