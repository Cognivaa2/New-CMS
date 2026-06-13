import mongoose from "mongoose";
const { Schema } = mongoose;

const stockMovementSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        transferId: {
            type: Schema.Types.ObjectId,
            ref: "StockTransfer",
            required: true,
            index: true,
        },
        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
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
        quantity: {
            type: Number,
            required: true,
            min: 0.001,
        },
        movementType: {
            type: String,
            enum: ["Outgoing", "Incoming"],
            required: true,
            index: true,
        },
        counterpartProjectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        stockSnapshot: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["Draft", "Approved", "Rejected"],
            default: "Draft",
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
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

stockMovementSchema.index({ companyId: 1, projectId: 1, movementType: 1, status: 1, isDeleted: 1 });
stockMovementSchema.index({ companyId: 1, transferId: 1, isDeleted: 1 });

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
export default StockMovement;