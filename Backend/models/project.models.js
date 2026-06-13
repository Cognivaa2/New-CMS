import mongoose from "mongoose";

const { Schema } = mongoose;

const assignedUserSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        designation: {
            type: String,
            trim: true,
            default: null,
        },

        assignedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const projectSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },

        projectName: {
            type: String,
            required: true,
            trim: true,
        },

        projectCode: {
            type: String,
            trim: true,
            default: null,
        },

        description: {
            type: String,
            trim: true,
            default: null,
        },

        location: {
            type: String,
            required: true,
            trim: true,
        },

        clientName: {
            type: String,
            trim: true,
            default: null,
        },

        coverImage: {
            type: String,
            default: null,
        },

        budget: {
            type: Number,
            required: true,
            min: 0,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["planned", "active", "on_hold", "completed", "cancelled"],
            default: "planned",
        },

        healthStatus: {
            type: String,
            enum: ["on_track", "delayed", "over_budget"],
            default: "on_track",
        },

        completionPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        assignedUsers: {
            type: [assignedUserSchema],
            default: [],
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
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

projectSchema.index(
    { companyId: 1, projectCode: 1 },
    { unique: true, sparse: true, name: "unique_projectCode_per_company" }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;