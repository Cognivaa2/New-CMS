import mongoose from "mongoose";
const { Schema } = mongoose;

export const HELPDESK_CATEGORIES = [
    "Bug Report",
    "Feature Request",
    "Billing",
    "Account",
    "Technical Support",
    "General Inquiry",
    "Other",
];

export const HELPDESK_PRIORITIES = ["Low", "Medium", "High", "Critical"];

export const HELPDESK_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

// ─── Sub-schema: Reply / Thread ───────────────────────────────────────────────
const replySchema = new Schema(
    {
        repliedBy: {
            type: Schema.Types.ObjectId,
            refPath: "replies.repliedByModel",
            required: true,
        },

        repliedByModel: {
            type: String,
            enum: ["User", "SuperAdmin"],
            required: true,
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        attachments: {
            type: [String],
            default: [],
        },
    },
    { _id: true, timestamps: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────
const helpdeskSchema = new Schema(
    {
        ticketNumber: {
            type: String,
            unique: true,
            index: true,
        },

        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },

        raisedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        category: {
            type: String,
            enum: HELPDESK_CATEGORIES,
            required: true,
        },

        priority: {
            type: String,
            enum: HELPDESK_PRIORITIES,
            default: "Medium",
        },

        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },

        attachments: {
            type: [String],
            default: [],
        },

        status: {
            type: String,
            enum: HELPDESK_STATUSES,
            default: "Open",
            index: true,
        },

        // SuperAdmin who is handling this ticket
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "SuperAdmin",
            default: null,
        },

        // Conversation thread between company and super admin
        replies: {
            type: [replySchema],
            default: [],
        },

        // Timestamps for lifecycle tracking
        resolvedAt: {
            type: Date,
            default: null,
        },

        closedAt: {
            type: Date,
            default: null,
        },

        // Email notification tracking
        emailNotifiedAt: {
            type: Date,
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

// ─── Indexes ──────────────────────────────────────────────────────────────────
helpdeskSchema.index(
    { companyId: 1, status: 1, createdAt: -1 },
    { name: "company_tickets" }
);
helpdeskSchema.index(
    { status: 1, priority: 1, createdAt: -1 },
    { name: "admin_dashboard" }
);

// ─── Auto-generate ticket number before save ──────────────────────────────────
helpdeskSchema.pre("save", async function (next) {
    if (this.isNew && !this.ticketNumber) {
        const count = await mongoose.model("Helpdesk").countDocuments();
        this.ticketNumber = `TKT-${String(count + 1).padStart(5, "0")}`;
    }
    next();
});

// ─── Instance method: resolve ticket ─────────────────────────────────────────
helpdeskSchema.methods.resolve = async function () {
    this.status = "Resolved";
    this.resolvedAt = new Date();
    return this.save();
};

// ─── Instance method: close ticket ───────────────────────────────────────────
helpdeskSchema.methods.close = async function () {
    this.status = "Closed";
    this.closedAt = new Date();
    return this.save();
};

const Helpdesk = mongoose.model("Helpdesk", helpdeskSchema);

export default Helpdesk;
