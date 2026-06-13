import mongoose from "mongoose";

const { Schema } = mongoose;

const documentSchema = new Schema(
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
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        fileKey: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            enum: ["PDF", "IMAGE", "EXCEL", "WORD", "CAD", "OTHER"],
            required: true,
        },
        category: {
            type: String,
            enum: ["drawing", "specification","report","contract","safety","financial","other"],
            default: "other",
        },
        tags: {
            type: [String],
            default: [],
        },
        linkedTo: {
            refModel: {
                type: String,
                enum: ["Phase", "Task", "SubTask"],
                default: null,
            },
            refId: {
                type: Schema.Types.ObjectId,
                default: null,
            },
        },
        uploadedBy: {
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
    },
    { timestamps: true }
);
documentSchema.index({ projectId: 1, isDeleted: 1 });
documentSchema.index({ companyId: 1, projectId: 1 });
documentSchema.index({ projectId: 1, category: 1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;