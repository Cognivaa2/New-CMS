import mongoose from "mongoose";
const { Schema } = mongoose;

const taskSchema = new Schema(
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
            required: true,
            index: true,
        },

        workOrderId: {
            type: Schema.Types.ObjectId,
            ref: "WorkOrder",
            default: null,
            index: true,
        },

        taskName: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: null,
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },

        status: {
            type: String,
            enum: ["NotStarted", "InProgress", "Completed", "Blocked", "OnHold"],
            default: "NotStarted",
        },

        assignedTo: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        completionPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        dependencies: [
            {
                type: Schema.Types.ObjectId,
                ref: "Task",
            },
        ],

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
    },
    { timestamps: true }
);

taskSchema.index({ companyId: 1, workOrderId: 1, isDeleted: 1 }, { name: "task_by_wo" });
taskSchema.index({ phaseId: 1, isDeleted: 1 }, { name: "task_by_phase" });

const Task = mongoose.model("Task", taskSchema);
export default Task;