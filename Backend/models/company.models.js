import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const companySchema = new mongoose.Schema(
    {

        companyId: {
            type: String,
            default: uuidv4,
            unique: true,
        },

        companyName: {
            type: String,
            required: true,
            trim: true,
        },

        companyType: {
            type: String,
            trim: true,
            default: null,
        },

        gstin: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },

        pan: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },

        cin: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },

        laborLicenseNo: {
            type: String,
            trim: true,
            default: null,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        website: {
            type: String,
            trim: true,
            default: null,
        },

        address: {
            street: String,
            city: String,
            state: String,
            country: {
                type: String,
                default: "India",
            },
            pincode: String,
        },

        logo: {
            type: String,
            default: null,
        },

        tags: {
            type: [String],
            default: [],
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription",
            default: null,
        },

        status: {
            type: String,
            enum: ["Active", "Suspended", "Deactivated"],
            default: "Active",
        },
        
        isDeleted: {
            type: Boolean,
            default: false,
        },

        deletedAt: {
            type: Date,
            default: null,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

    },

    { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);

export default Company;