import mongoose from "mongoose";
const { Schema } = mongoose;

const inventorySchema = new Schema(
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
        materialMasterId: {
            type: Schema.Types.ObjectId,
            ref: "MaterialMaster",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        unit: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            trim: true,
            default: null,
        },
        currentStock: {
            type: Number,
            default: 0,
            min: 0,
        },
        minimumLevel: {
            type: Number,
            default: 0,
            min: 0,
        },
        pricePerUnit: {
            type: Number,
            default: 0,
            min: 0,
        },
        supplierName: {
            type: String,
            trim: true,
            default: null,
        },
        totalConsumed: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalReceived: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastRestockedAt: {
            type: Date,
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

inventorySchema.index(
    { companyId: 1, projectId: 1, materialMasterId: 1, isDeleted: 1 }
);

inventorySchema.index(
    { companyId: 1, projectId: 1, materialMasterId: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false }, name: "unique_material_per_project" }
);

inventorySchema.index(
    { companyId: 1, projectId: 1, isDeleted: 1, currentStock: 1 }
);

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;