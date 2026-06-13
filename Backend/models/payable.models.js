import mongoose from "mongoose";
const { Schema } = mongoose;


const payableSchema = new Schema(
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
        payableNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        sourceType: {
            type: String,
            enum: ["GRN", "WO", "ManualExpense"],
            required: true,
            index: true,
        },
        sourceId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        sourceNumber: {
            type: String,
            trim: true,
            default: null,
        },
        poId: {
            type: Schema.Types.ObjectId,
            ref: "PurchaseOrder",
            default: null,
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            default: null,
            index: true,
        },
        vendorName: {
            type: String,
            trim: true,
            default: null,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        advanceDeducted: {
            type: Number,
            default: 0,
            min: 0,
        },
        dueAmount: {
            type: Number,
            default: function () {
                return this.totalAmount;
            },
            min: 0,
        },
        status: {
            type: String,
            enum: ["Unpaid", "PartiallyPaid", "Paid", "Reversed"],
            default: "Unpaid",
            index: true,
        },
        dueDate: {
            type: Date,
            default: null,
        },
        reversalReason: {
            type: String,
            trim: true,
            default: null,
        },
        reversedAt: {
            type: Date,
            default: null,
        },
        reversedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            default: null,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);



payableSchema.index(
    { sourceType: 1, sourceId: 1 },
    { unique: true, name: "unique_payable_per_source" }
);

payableSchema.index(
    { companyId: 1, payableNumber: 1 },
    { unique: true, name: "unique_payable_number_per_company" }
);

payableSchema.index(
    { companyId: 1, projectId: 1, status: 1 },
    { name: "payable_project_status" }
);

payableSchema.index(
    { companyId: 1, projectId: 1, sourceType: 1, status: 1 },
    { name: "payable_project_source_status" }
);

payableSchema.index(
    { companyId: 1, vendorId: 1, status: 1 },
    { name: "payable_vendor_status" }
);

payableSchema.index(
    { companyId: 1, dueDate: 1, status: 1 },
    { name: "payable_overdue_lookup" }
);

const Payable = mongoose.model("Payable", payableSchema);
export default Payable;