import mongoose from "mongoose";

const { Schema } = mongoose;


const grnItemSchema = new Schema(
    {
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
        },
        materialMasterId: {
            type: Schema.Types.ObjectId,
            ref: "MaterialMaster",
            required: true,
        },
        materialName: {
            type: String,
            required: true,
            trim: true,
        },
        unit: {
            type: String,
            required: true,
            trim: true,
        },
        orderedQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        previouslyReceivedQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        receivedQuantity: {
            type: Number,
            required: true,
            min: 0.001,
        },
        remarks: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { _id: false }
);


const attachmentSchema = new Schema(
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


const grnSchema = new Schema(
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
        poId: {
            type: Schema.Types.ObjectId,
            ref: "PurchaseOrder",
            required: true,
            index: true,
        },
        mrId: {
            type: Schema.Types.ObjectId,
            ref: "MaterialRequisition",
            required: true,
            index: true,
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
        grnNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        deliveryDate: {
            type: Date,
            required: true,
        },
        vehicleNumber: {
            type: String,
            trim: true,
            default: null,
        },
        deliveryChallanNumber: {
            type: String,
            trim: true,
            default: null,
        },
        deliveryChallanDate: {
            type: Date,
            default: null,
        },
        items: {
            type: [grnItemSchema],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: "A GRN must have at least one item.",
            },
        },

        remarks: {
            type: String,
            trim: true,
            default: null,
        },
        attachment: {
            type: attachmentSchema,
            default: null,
        },
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



grnSchema.index(
    { companyId: 1, grnNumber: 1 },
    { unique: true, name: "unique_grn_number_per_company" }
);
grnSchema.index(
    { companyId: 1, poId: 1, isDeleted: 1 },
    { name: "grn_by_po" }
);
grnSchema.index(
    { companyId: 1, mrId: 1, isDeleted: 1 },
    { name: "grn_by_mr" }
);
grnSchema.index(
    { companyId: 1, projectId: 1, isDeleted: 1, createdAt: -1 },
    { name: "grn_project_list" }
);
grnSchema.index(
    { companyId: 1, vendorId: 1, isDeleted: 1 },
    { name: "grn_by_vendor" }
);
grnSchema.index(
    { companyId: 1, vendorId: 1, deliveryChallanNumber: 1, isDeleted: 1 },
    { name: "grn_challan_vendor_company" }
);

const GRN = mongoose.model("GRN", grnSchema);
export default GRN;