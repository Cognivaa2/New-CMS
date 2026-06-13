import mongoose from "mongoose";

const companyOtpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        otp: {
            type: String,
            required: true,
        },

        companyData: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        attempts: {
            type: Number,
            default: 0,
        },

        lastSentAt: {
            type: Date,
            default: Date.now,
        },

        expiresAt: {
            type: Date,
            required: true,
            expires: 0,
        },

    },
    
    { timestamps: true }
);

export default mongoose.model("CompanyOtp", companyOtpSchema);