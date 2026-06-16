import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();

const VALID_ACTIONS = ["create", "view", "edit", "delete", "approve", "reject", "download", "upload"];

const MODULES = [
    "primary-inventory", "primary-issues", "primary-materials", "primary-organization",
    "primary-projects", "primary-purchase-orders", "primary-roles", "primary-users",
    "primary-vendors", "primary-work-orders", "primary-finance", "primary-materials-requisition",
    "primary-grn", "primary-stock-transfers", "primary-payables", "primary-contra-entry",
    "primary-three-way-match", "primary-reconciliation", "project-documents", "project-dpr",
    "project-expense", "project-gantt", "project-grn", "project-inventory", "project-issues",
    "project-material-requisitions", "project-phases", "project-purchase-orders", "project-roles",
    "project-stock-transfers", "project-tasks", "project-work-orders", "project-consumption",
    "project-payables", "project-three-way-match", "project-safety",
];

await mongoose.connect(process.env.MONGO_URL);
console.log("Connected to MongoDB");

const Role = mongoose.model("Role", new mongoose.Schema({
    companyId: mongoose.Schema.Types.ObjectId,
    roleName: String,
    isDeleted: Boolean,
    permissions: { type: Map, of: [String], default: {} },
    moduleStatus: { type: Map, of: Boolean, default: {} },
}, { timestamps: true }));

const ownerRoles = await Role.find({ roleName: { $regex: /^owner$/i }, isDeleted: false });

if (ownerRoles.length === 0) {
    console.log("No Owner roles found.");
    process.exit(0);
}

console.log(`Found ${ownerRoles.length} Owner role(s). Migrating...\n`);

for (const role of ownerRoles) {
    const existing = [...(role.permissions?.keys() ?? [])];
    const missing = MODULES.filter(m => !existing.includes(m));

    if (missing.length === 0) {
        console.log(`SKIP  [${role.companyId}] already has all modules`);
        continue;
    }

    const permissions = new Map();
    const moduleStatus = new Map();
    for (const mod of MODULES) {
        permissions.set(mod, [...VALID_ACTIONS]);
        moduleStatus.set(mod, true);
    }

    role.permissions = permissions;
    role.moduleStatus = moduleStatus;
    role.markModified("permissions");
    role.markModified("moduleStatus");
    await role.save();

    console.log(`DONE  [${role.companyId}] added: [${missing.join(", ")}]`);
}

console.log("\nMigration complete.");
await mongoose.disconnect();