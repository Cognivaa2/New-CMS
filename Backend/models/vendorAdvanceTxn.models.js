import mongoose from "mongoose";
const { Schema } = mongoose;



const vendorAdvanceTxnSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },
        txnType: {
            type: String,
            enum: ["Credit", "Debit", "Refund"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        paymentTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "PaymentTransaction",
            default: null,
        },
        payableId: {
            type: Schema.Types.ObjectId,
            ref: "Payable",
            default: null,
        },
        payableNumber: {
            type: String,
            trim: true,
            default: null,
        },
        paymentDate: {
            type: Date,
            default: null,
        },
        paymentMode: {
            type: String,
            enum: ["Cash", "BankTransfer", "Cheque", "UPI", "NEFT", "RTGS", "DD", "Other", null],
            default: null,
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

vendorAdvanceTxnSchema.index(
    { vendorId: 1, createdAt: -1 },
    { name: "advance_txn_by_vendor" }
);

vendorAdvanceTxnSchema.index(
    { companyId: 1, vendorId: 1, txnType: 1 },
    { name: "advance_txn_company_vendor_type" }
);

const VendorAdvanceTxn = mongoose.model("VendorAdvanceTxn", vendorAdvanceTxnSchema);
export default VendorAdvanceTxn;