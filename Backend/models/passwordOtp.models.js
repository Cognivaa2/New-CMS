import mongoose from "mongoose";

const { Schema } = mongoose;

const passwordOtpSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        otp: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        isUsed: {
            type: Boolean,
            default: false,
        },

        isOtpVerified: {
            type: Boolean,
            default: false,
        },

        resetGrantedAt: {
            type: Date,
            default: null,
        },

        attempts: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

passwordOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const PasswordOtp = mongoose.model("PasswordOtp", passwordOtpSchema);

export default PasswordOtp;