import mongoose from "mongoose";
const { Schema } = mongoose;

const bankDetailsSchema = new Schema(
    {
        accountName: { type: String, trim: true, default: null },
        accountNumber: { type: String, trim: true, default: null },
        bankName: { type: String, trim: true, default: null },
        ifscCode: { type: String, trim: true, default: null },
        branchName: { type: String, trim: true, default: null },
    },
    { _id: false }
);

const legalDetailsSchema = new Schema(
    {
        gstin: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },
        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },
        registrationNumber: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { _id: false }
);

const vendorSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        vendorType: {
            type: String,
            trim: true,
            default: null,
        },
        contactPerson: {
            type: String,
            trim: true,
            default: null,
        },
        phone: {
            type: String,
            trim: true,
            required: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            required: true,
        },
        website: {
            type: String,
            trim: true,
            default: null,
        },
        photo: {
            type: String,
            default: null,
        },
        address: {
            type: String,
            trim: true,
            default: null,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        advanceBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        supplyCategories: {
            type: [String],
            default: [],
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            default: null,
        },
        legalDetails: {
            type: legalDetailsSchema,
            default: () => ({}),
        },
        bankDetails: {
            type: bankDetailsSchema,
            default: () => ({}),
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
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


vendorSchema.index(
    { companyId: 1, name: 1 },
    {
        unique: true,
        partialFilterExpression: { isDeleted: false },
        name: "unique_vendor_name_per_company",
    }
);

vendorSchema.index(
    { companyId: 1, vendorType: 1 },
    { name: "vendor_type_per_company" }
);

vendorSchema.index(
    { companyId: 1, isActive: 1 },
    { name: "vendor_active_per_company" }
);

vendorSchema.index(
    { companyId: 1, isVerified: 1 },
    { name: "vendor_verified_per_company" }
);

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;