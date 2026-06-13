import mongoose from "mongoose";
const { Schema } = mongoose;

const subTaskSchema = new Schema(
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

        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },
        workOrderId: {
            type: Schema.Types.ObjectId,
            ref: "WorkOrder",
            default: null,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: null,
        },

        assignedTo: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        startDate: {
            type: Date,
            default: null,
        },

        endDate: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: ["NotStarted", "InProgress", "Completed", "Blocked"],
            default: "NotStarted",
        },

        completionPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
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
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

subTaskSchema.index({ companyId: 1, workOrderId: 1, isDeleted: 1 }, { name: "subtask_by_wo" });
subTaskSchema.index({ taskId: 1, isDeleted: 1 }, { name: "subtask_by_task" });

const SubTask = mongoose.model("SubTask", subTaskSchema);
export default SubTask;