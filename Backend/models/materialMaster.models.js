import mongoose from "mongoose";

const { Schema } = mongoose;
const materialMasterSchema = new Schema(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            trim: true,
            default: null,
        },
        unit: {
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

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

materialMasterSchema.index(
    { companyId: 1, name: 1 },
    {
        unique: true,
        partialFilterExpression: { isDeleted: false },
        name: "unique_material_name_per_company",
    }
);

const MaterialMaster = mongoose.model("MaterialMaster", materialMasterSchema);

export default MaterialMaster;
