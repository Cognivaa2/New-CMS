import mongoose from "mongoose";

const { Schema } = mongoose;

export const VALID_ACTIONS = [
    "create",
    "view",
    "edit",
    "delete",
    "approve",
    "reject",
    "download",
    "upload",
];


export const MODULES = [
    "primary-inventory",
    "primary-issues",
    "primary-materials",
    "primary-organization",
    "primary-projects",
    "primary-purchase-orders",
    "primary-roles",
    "primary-users",
    "primary-vendors",
    "primary-work-orders",
    "primary-finance",
    "primary-work-orders",
    "primary-materials-requisition",
    "primary-grn",
    "primary-stock-transfers",
    "primary-payables",
    "primary-contra-entry",
    "primary-three-way-match",
    "primary-reconciliation",

    "project-documents",
    "project-dpr",
    "project-expense",
    "project-gantt",
    "project-grn",
    "project-inventory",
    "project-issues",
    "project-material-requisitions",
    "project-phases",
    "project-purchase-orders",
    "project-roles",
    "project-stock-transfers",
    "project-tasks",
    "project-work-orders",
    "project-consumption",
    "project-expense",
    "project-payables",
    "project-three-way-match",
    "project-safety"
];


const roleSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        roleName: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        permissions: {
            type: Map,
            of: [
                {
                    type: String,
                    enum: VALID_ACTIONS,
                },
            ],
            default: {},
        },

        moduleStatus: {
            type: Map,
            of: Boolean,
            default: {},
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
            index: true,
        },
    },
    { timestamps: true }
);

roleSchema.index({ companyId: 1, roleName: 1, isDeleted: 1 });

const Role = mongoose.model("Role", roleSchema);

export default Role;