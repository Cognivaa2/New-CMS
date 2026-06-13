import mongoose from "mongoose";
const { Schema } = mongoose;

const paymentTransactionSchema = new Schema(
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
        payableId: {
            type: Schema.Types.ObjectId,
            ref: "Payable",
            required: true,
            index: true,
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            default: null,
            index: true,
        },
        paymentDate: {
            type: Date,
            required: true,
        },
        paymentMode: {
            type: String,
            enum: ["Cash", "BankTransfer", "Cheque", "UPI", "NEFT", "RTGS", "DD", "Other"],
            required: true,
        },
        paymentModeOther: {
            type: String,
            trim: true,
            default: null,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        advanceDeducted: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalSettled: {
            type: Number,
            required: true,
            min: 0,
        },
        referenceNumber: {
            type: String,
            trim: true,
            default: null,
        },
        proofImage: {
            type: String,
            trim: true,
            default: null,
        },
        proofKey: {
            type: String,
            trim: true,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            default: null,
        },
        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);


paymentTransactionSchema.index(
    { payableId: 1, createdAt: -1 },
    { name: "txn_by_payable" }
);

paymentTransactionSchema.index(
    { companyId: 1, vendorId: 1, paymentDate: -1 },
    { name: "txn_vendor_date" }
);

paymentTransactionSchema.index(
    { companyId: 1, projectId: 1, paymentDate: -1 },
    { name: "txn_project_date" }
);

paymentTransactionSchema.index(
    { companyId: 1, paymentDate: -1 },
    { name: "txn_company_date" }
);

const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);
export default PaymentTransaction;