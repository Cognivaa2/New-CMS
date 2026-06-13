import mongoose from "mongoose";
const { Schema } = mongoose;

const materialConsumptionSchema = new Schema(
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

        phaseId: {
            type: Schema.Types.ObjectId,
            ref: "Phase",
            default: null,
        },

        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },

        subTaskId: {
            type: Schema.Types.ObjectId,
            ref: "SubTask",
            default: null,
            index: true,
        },

        workOrderId: {
            type: Schema.Types.ObjectId,
            ref: "WorkOrder",
            default: null,
            index: true,
        },

        isWOConsumption: {
            type: Boolean,
            default: false,
        },

        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
        },

        materialMasterId: {
            type: Schema.Types.ObjectId,
            ref: "MaterialMaster",
            default: null,
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

        quantityConsumed: {
            type: Number,
            required: true,
            min: 0.001,
        },

        pricePerUnit: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalCost: {
            type: Number,
            default: 0,
            min: 0,
        },

        source: {
            type: String,
            enum: ["StockIssue", "DPRSync"],
            default: "StockIssue",
        },

        remarks: {
            type: String,
            trim: true,
            default: null,
        },

        recordedBy: {
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

materialConsumptionSchema.index({ subTaskId: 1, isDeleted: 1 });
materialConsumptionSchema.index({ projectId: 1, isDeleted: 1 });
materialConsumptionSchema.index({ inventoryId: 1, isDeleted: 1 });
materialConsumptionSchema.index({ workOrderId: 1, isDeleted: 1 }, { name: "consumption_by_wo" });
materialConsumptionSchema.index({ isWOConsumption: 1, projectId: 1, isDeleted: 1 }, { name: "wo_consumption_by_project" });

const MaterialConsumption = mongoose.model("MaterialConsumption", materialConsumptionSchema);
export default MaterialConsumption;