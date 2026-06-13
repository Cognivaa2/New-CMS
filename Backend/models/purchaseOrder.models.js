import mongoose from "mongoose";

const { Schema } = mongoose;

const poItemSchema = new Schema(
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
            min: 0.001,
        },
        receivedQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        discountPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        gstPercent: {
            type: Number,
            default: 0,
            min: 0,
        },
        gstAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        remarks: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { _id: false }
);


const purchaseOrderSchema = new Schema(
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
        poNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        items: {
            type: [poItemSchema],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: "A Purchase Order must have at least one item.",
            },
        },
        totalOrderValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        expectedDeliveryDate: {
            type: Date,
            default: null,
        },
        deliveryAddress: {
            type: String,
            trim: true,
            default: null,
        },
        paymentTerms: {
            type: String,
            trim: true,
            default: null,
        },
        specialInstructions: {
            type: String,
            trim: true,
            default: null,
        },
        status: {
            type: String,
            enum: [
                "Draft",
                "Submitted",
                "Approved",
                "Rejected",
                "PartiallyDelivered",
                "Completed",
                "Cancelled",
            ],
            default: "Draft",
            index: true,
        },

        submittedAt: { type: Date, default: null },
        submittedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        approvedAt: { type: Date, default: null },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        rejectedAt: { type: Date, default: null },
        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rejectionRemarks: {
            type: String,
            trim: true,
            default: null,
        },

        cancelledAt: { type: Date, default: null },
        cancelledBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        cancellationRemarks: {
            type: String,
            trim: true,
            default: null,
        },

        firstDeliveryAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },

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
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);


purchaseOrderSchema.index(
    { companyId: 1, poNumber: 1 },
    { unique: true, name: "unique_po_number_per_company" }
);
purchaseOrderSchema.index(
    { companyId: 1, projectId: 1, status: 1, isDeleted: 1 },
    { name: "po_project_status" }
);
purchaseOrderSchema.index(
    { companyId: 1, mrId: 1, isDeleted: 1 },
    { name: "po_by_mr" }
);
purchaseOrderSchema.index(
    { companyId: 1, vendorId: 1, isDeleted: 1 },
    { name: "po_by_vendor" }
);

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
export default PurchaseOrder;