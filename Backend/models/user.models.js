import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
    {
        keycloakId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },

        roleId: {
            type: String,
            required: true,
            trim: true,
        },

        assignedProjects: [
            {
                type: Schema.Types.ObjectId,
                ref: "Project",
            },
        ],

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        isOwner: {
            type: Boolean,
            default: false,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        name: {
            type: String,
            trim: true,
            select: false,
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
            select: false,
        },

        phone: {
            type: String,
            trim: true,
            select: false,
        },

        address: {
            type: String,
            trim: true,
            select: false,
        },

        passwordHash: {
            type: String,
            select: false,
        },

        avatar: {
            type: String,
            select: false,
        },

        about: {
            type: String,
            select: false,
        },

        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
            select: false,
        },

        profileCompletion: {
            type: Number,
            default: 0,
            select: false,
        },

        lastLoginAt: {
            type: Date,
            select: false,
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;