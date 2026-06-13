import mongoose from "mongoose";
const { Schema } = mongoose;

export const VALID_TYPE_STATUS = {
    PO_Commitment: ["Committed", "Reversed"],
    WO_Commitment: ["Committed", "Reversed"],
    GRN_Actual: ["Actual", "Reversed"],
    Consumption_Actual: ["Actual", "Reversed"],
    Transfer_Debit: ["Actual", "Reversed"],
    Manual: ["Pending", "Approved", "Rejected", "Actual", "Reversed"],
};

const proofSchema = new Schema(
    {
        fileName: { type: String, trim: true, required: true },
        fileUrl: { type: String, trim: true, required: true },
        fileKey: { type: String, trim: true, required: true },
        fileType: { type: String, trim: true, default: null },
        fileSize: { type: Number, default: null },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        uploadedAt: { type: Date, default: null },
    },
    { _id: false }
);

const expenseSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId, ref: "Company",
            required: true, index: true,
        },
        projectId: {
            type: Schema.Types.ObjectId, ref: "Project",
            required: true, index: true,
        },
        expenseNumber: {
            type: String, required: true, trim: true, index: true,
        },
        type: {
            type: String,
            enum: ["PO_Commitment", "WO_Commitment", "GRN_Actual", "Consumption_Actual", "Transfer_Debit", "Manual"],
            required: true, index: true,
        },
        category: {
            type: String,
            enum: ["Material", "Labour", "Contractor", "Transfer", "Petty Cash", "Miscellaneous", "Other"],
            required: true, index: true,
        },
        status: {
            type: String,
            enum: ["Committed", "Actual", "Pending", "Approved", "Rejected", "Reversed"],
            required: true, default: "Committed", index: true,
        },
        amount: { type: Number, required: true, min: 0 },
        amountSnapshot: { type: Number, default: null },
        priceSnapshot: { type: Number, default: null },
        description: { type: String, trim: true, default: null },
        expenseDate: { type: Date, required: true },

        sourceModel: {
            type: String,
            enum: ["PurchaseOrder", "WorkOrder", "GRN", "MaterialConsumption", "StockTransfer", "Manual"],
            required: true,
        },
        sourceId: { type: Schema.Types.ObjectId, default: null },
        sourceNumber: { type: String, trim: true, default: null },

        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null, index: true },
        vendorName: { type: String, trim: true, default: null },

        phaseId: { type: Schema.Types.ObjectId, ref: "Phase", default: null },
        taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },

        milestoneId: { type: Schema.Types.ObjectId, default: null },
        milestoneTitle: { type: String, trim: true, default: null },

        paidAt: { type: Date, default: null },
        paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        paymentRemarks: { type: String, trim: true, default: null },

        reversedAt: { type: Date, default: null },
        reversedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        reversalReason: { type: String, trim: true, default: null },

        lastAmountUpdate: {
            previousAmount: { type: Number, default: null },
            updatedAt: { type: Date, default: null },
            updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
            reason: { type: String, trim: true, default: null },
        },

        manualEntryDetails: {
            subType: {
                type: String,
                enum: ["Petty Cash", "Miscellaneous", "Labour", "Other"],
                default: null,
            },
            paymentMode: {
                type: String,
                enum: ["Cash", "Bank Transfer", "Cheque", "UPI", "Other"],
                default: null,
            },
            referenceNumber: { type: String, trim: true, default: null },
            proof: { type: proofSchema, default: null },
        },

        submittedAt: { type: Date, default: null },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectedAt: { type: Date, default: null },
        rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectionRemarks: { type: String, trim: true, default: null },

        createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

expenseSchema.index(
    { companyId: 1, expenseNumber: 1 },
    { unique: true, name: "unique_expense_number_per_company" }
);
expenseSchema.index(
    { sourceModel: 1, sourceId: 1, isDeleted: 1 },
    { name: "expense_by_source" }
);
expenseSchema.index(
    { companyId: 1, projectId: 1, status: 1, isDeleted: 1 },
    { name: "expense_project_status" }
);
expenseSchema.index(
    { companyId: 1, projectId: 1, type: 1, isDeleted: 1 },
    { name: "expense_project_type" }
);
expenseSchema.index(
    { companyId: 1, projectId: 1, expenseDate: -1, isDeleted: 1 },
    { name: "expense_project_date" }
);
expenseSchema.index(
    { companyId: 1, projectId: 1, status: 1, type: 1, isDeleted: 1 },
    { name: "expense_committed_lookup" }
);
expenseSchema.index(
    { companyId: 1, projectId: 1, vendorId: 1, isDeleted: 1 },
    { name: "expense_by_vendor" }
);

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;