import mongoose from "mongoose";

const { Schema } = mongoose;
const safetyAttachmentSchema = new Schema(
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


const safetyEntrySchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: ["Safety", "Quality"],
        },
        status: {
            type: String,
            required: true,
            enum: ["Pass", "Fail", "Observation"],
        },
        inspectionDate: {
            type: Date,
            required: true,
        },
        inspectedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        location: {
            type: String,
            trim: true,
            default: null,
        },
        severity: {
            type: String,
            enum: ["Low", "Medium", "High", null],
            default: null,
        },
        remarks: {
            type: String,
            trim: true,
            default: null,
        },
        attachment: {
            type: safetyAttachmentSchema,
            default: null,
        },
        isResolved: {
            type: Boolean,
            default: false,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        resolutionNote: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { _id: true }
);


const safetySchema = new Schema(
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
        inspectionNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        entries: {
            type: [safetyEntrySchema],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: "A safety inspection must have at least one entry.",
            },
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


safetySchema.index(
    { companyId: 1, inspectionNumber: 1 },
    { unique: true, name: "unique_inspection_number_per_company" }
);
safetySchema.index(
    { companyId: 1, projectId: 1, isDeleted: 1, createdAt: -1 },
    { name: "safety_project_list" }
);
safetySchema.index(
    { companyId: 1, isDeleted: 1, createdAt: -1 },
    { name: "safety_company_list" }
);
safetySchema.index(
    { companyId: 1, projectId: 1, "entries.status": 1, isDeleted: 1 },
    { name: "safety_by_status" }
);
safetySchema.index(
    { companyId: 1, projectId: 1, "entries.category": 1, isDeleted: 1 },
    { name: "safety_by_category" }
);

const Safety = mongoose.model("Safety", safetySchema);
export default Safety;