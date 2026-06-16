import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Role from "../models/role.models.js";
import User from "../models/user.models.js";
import Company from "../models/company.models.js";
import Project from "../models/project.models.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import MaterialMaster from "../models/materialMaster.models.js";
import Vendor from "../models/vendors.models.js";
import Inventory from "../models/inventory.models.js";
import StockTransfer from "../models/stockTransfer.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import GRN from "../models/grn.models.js";
import WorkOrder from "../models/workOrder.models.js";
import Expense from "../models/expense.models.js";
import Payable from "../models/payable.models.js";
import Issue from "../models/issue.models.js";
import Counter from "../models/counter.models.js";
import ImportJob from "../models/importJob.models.js";
import keycloakService from "../services/keycloak.service.js";
import sendEmail from "../services/email.service.js";
import { welcomeUserTemplate } from "../templates/welcomeUserTemplate.js";
import { generateCredentials } from "../utils/generateCredentials.utils.js";
import logger from "../utils/logger.utils.js";

const nextSeq = async (key) => {
    const counter = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return counter.seq;
};

const generateNumber = async (prefix, companyId) => {
    const year = new Date().getFullYear();
    const key = `${prefix}-${companyId.toString()}-${year}`;
    const seq = await nextSeq(key);
    return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
};

const generatePONumber = async (companyId) => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `PO-${yyyymm}-`;
    const last = await PurchaseOrder.findOne(
        { companyId, poNumber: { $regex: `^${prefix}` } },
        { poNumber: 1 },
        { sort: { poNumber: -1 } }
    ).lean();
    let seq = 1;
    if (last?.poNumber) {
        const parts = last.poNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
};

const resolveProject = async (projectName, companyId) => {
    return Project.findOne({
        companyId,
        projectName: { $regex: new RegExp(`^${projectName.trim()}$`, "i") },
        isDeleted: false,
    }).lean();
};

const resolvePhase = async (phaseName, projectId, companyId) => {
    return Phase.findOne({
        companyId,
        projectId,
        phaseName: { $regex: new RegExp(`^${phaseName.trim()}$`, "i") },
        isDeleted: false,
    }).lean();
};

const resolveTask = async (taskName, projectId, companyId) => {
    return Task.findOne({
        companyId,
        projectId,
        taskName: { $regex: new RegExp(`^${taskName.trim()}$`, "i") },
        isDeleted: false,
    }).lean();
};

const resolveVendor = async (vendorName, companyId) => {
    return Vendor.findOne({
        companyId,
        name: { $regex: new RegExp(`^${vendorName.trim()}$`, "i") },
        isDeleted: false,
    }).lean();
};

const resolveMaterial = async (materialName, companyId) => {
    return MaterialMaster.findOne({
        companyId,
        name: { $regex: new RegExp(`^${materialName.trim()}$`, "i") },
        isDeleted: false,
    }).lean();
};

const resolveInventory = async (materialName, projectId, companyId) => {
    const material = await resolveMaterial(materialName, companyId);
    if (!material) return { material: null, inventory: null };
    const inventory = await Inventory.findOne({
        companyId,
        projectId,
        materialMasterId: material._id,
        isDeleted: false,
    }).lean();
    return { material, inventory };
};

const resolveRole = async (roleName, companyId) => {
    return Role.findOne({
        companyId,
        roleName: { $regex: new RegExp(`^${roleName.trim()}$`, "i") },
        isDeleted: false,
        isActive: true,
    }).lean();
};

const resolvePO = async (poNumber, projectId, companyId) => {
    return PurchaseOrder.findOne({
        companyId,
        projectId,
        poNumber: poNumber.trim(),
        isDeleted: false,
    }).lean();
};

const resolveMR = async (mrNumber, projectId, companyId) => {
    return MaterialRequisition.findOne({
        companyId,
        projectId,
        mrNumber: mrNumber.trim(),
        isDeleted: false,
    }).lean();
};

const resolveWO = async (woNumber, projectId, companyId) => {
    return WorkOrder.findOne({
        companyId,
        projectId,
        woNumber: woNumber.trim(),
        isDeleted: false,
    }).lean();
};

const resolveGRN = async (grnNumber, projectId, companyId) => {
    return GRN.findOne({
        companyId,
        projectId,
        grnNumber: grnNumber.trim(),
        isDeleted: false,
    }).lean();
};

const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const toNum = (val, fallback = 0) => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
};

const updateJob = async (jobId, patch) => {
    await ImportJob.findByIdAndUpdate(jobId, { $set: patch });
};

const pushResult = async (jobId, result) => {
    await ImportJob.findByIdAndUpdate(jobId, { $push: { results: result } });
};

export const processImport = async ({ jobId, module, rows, companyId, creatorUserId, company }) => {
    await updateJob(jobId, { status: "processing", totalRows: rows.length });

    const processors = {
        roles: processRoles,
        users: processUsers,
        materialMaster: processMaterialMaster,
        vendors: processVendors,
        projects: processProjects,
        phases: processPhases,
        tasks: processTasks,
        subtasks: processSubTasks,
        projectInventory: processProjectInventory,
        stockTransfers: processStockTransfers,
        materialRequisitions: processMaterialRequisitions,
        purchaseOrders: processPurchaseOrders,
        grns: processGRNs,
        workOrders: processWorkOrders,
        expenses: processExpenses,
        payables: processPayables,
        issues: processIssues,
    };

    const processor = processors[module];
    if (!processor) {
        await updateJob(jobId, {
            status: "failed",
            errorMessage: `Unknown module: ${module}`,
            completedAt: new Date(),
        });
        return;
    }

    let successCount = 0;
    let failedCount = 0;

    try {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                const identifier = await processor(row, companyId, creatorUserId, company);
                await pushResult(jobId, { row: rowNum, status: "success", identifier, error: null });
                successCount++;
            } catch (err) {
                logger.warn(`Import row ${rowNum} failed [${module}]`, { error: err.message });
                await pushResult(jobId, { row: rowNum, status: "failed", identifier: null, error: err.message });
                failedCount++;
            }
        }

        await updateJob(jobId, {
            status: "completed",
            successCount,
            failedCount,
            completedAt: new Date(),
        });
    } catch (err) {
        logger.error("processImport fatal error", { jobId, module, error: err.message });
        await updateJob(jobId, {
            status: "failed",
            errorMessage: err.message,
            successCount,
            failedCount,
            completedAt: new Date(),
        });
    }
};

const processRoles = async (row, companyId) => {
    const roleName = row["Role Name"]?.toString().trim();
    if (!roleName) throw new Error("Role Name is required");

    const exists = await Role.findOne({
        companyId,
        roleName: { $regex: new RegExp(`^${roleName}$`, "i") },
        isDeleted: false,
    }).lean();
    if (exists) throw new Error(`Role "${roleName}" already exists`);

    const role = await Role.create({
        companyId,
        roleName,
        description: row["Description"]?.toString().trim() || null,
        isActive: true,
    });
    return role.roleName;
};

const processUsers = async (row, companyId, creatorUserId, company) => {
    const name = row["Name"]?.toString().trim();
    const email = row["Email"]?.toString().trim().toLowerCase();
    const roleName = row["Role Name"]?.toString().trim();

    if (!name) throw new Error("Name is required");
    if (!email) throw new Error("Email is required");
    if (!roleName) throw new Error("Role Name is required");

    const role = await resolveRole(roleName, companyId);
    if (!role) throw new Error(`Role "${roleName}" not found or inactive`);

    const existingKcUser = await keycloakService.getUserByEmail(email);
    if (existingKcUser) throw new Error(`User with email "${email}" already exists`);

    const { username, password, passwordHash } = await generateCredentials(email);

    const keycloakId = await keycloakService.createUser({
        name,
        email,
        username,
        password,
        phone: row["Phone"]?.toString().trim() || "",
        address: row["Address"]?.toString().trim() || "",
        companyId: company.companyId,
        about: "",
        status: "Active",
        isOwner: false,
        roleId: role._id.toString(),
    });

    if (!keycloakId) throw new Error("Keycloak did not return a user ID");

    try {
        await User.create({
            keycloakId,
            companyId,
            roleId: role._id.toString(),
            name,
            isOwner: false,
            passwordHash,
            createdBy: creatorUserId || null,
        });
    } catch (mongoErr) {
        try {
            await keycloakService.deleteUser(keycloakId);
        } catch (rollbackErr) {
            logger.error("Keycloak rollback failed during user import", { keycloakId });
        }
        throw mongoErr;
    }

    const { subject, html } = welcomeUserTemplate({
        name,
        username,
        password,
        companyName: company.companyName,
    });
    sendEmail({ to: email, subject, html }).catch((err) =>
        logger.error("Welcome email failed during import", { email, error: err.message })
    );

    return email;
};

const processMaterialMaster = async (row, companyId, creatorUserId) => {
    const name = row["Material Name"]?.toString().trim();
    const unit = row["Unit"]?.toString().trim();

    if (!name) throw new Error("Material Name is required");
    if (!unit) throw new Error("Unit is required");

    const exists = await MaterialMaster.findOne({
        companyId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        isDeleted: false,
    }).lean();
    if (exists) throw new Error(`Material "${name}" already exists`);

    const material = await MaterialMaster.create({
        companyId,
        name,
        unit,
        category: row["Category"]?.toString().trim() || null,
        description: row["Description"]?.toString().trim() || null,
        isActive: true,
        createdBy: creatorUserId || null,
    });
    return material.name;
};

const processVendors = async (row, companyId, creatorUserId) => {
    const name = row["Vendor Name"]?.toString().trim();
    const phone = row["Phone"]?.toString().trim();
    const email = row["Email"]?.toString().trim().toLowerCase();

    if (!name) throw new Error("Vendor Name is required");
    if (!phone) throw new Error("Phone is required");
    if (!email) throw new Error("Email is required");

    const exists = await Vendor.findOne({
        companyId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        isDeleted: false,
    }).lean();
    if (exists) throw new Error(`Vendor "${name}" already exists`);

    const vendor = await Vendor.create({
        companyId,
        name,
        phone,
        email,
        vendorType: row["Vendor Type"]?.toString().trim() || null,
        contactPerson: row["Contact Person"]?.toString().trim() || null,
        address: row["Address"]?.toString().trim() || null,
        description: row["Description"]?.toString().trim() || null,
        legalDetails: {
            gstin: row["GSTIN"]?.toString().trim() || null,
            panNumber: row["PAN"]?.toString().trim() || null,
            registrationNumber: row["Registration Number"]?.toString().trim() || null,
        },
        bankDetails: {
            accountName: row["Bank Account Name"]?.toString().trim() || null,
            accountNumber: row["Bank Account Number"]?.toString().trim() || null,
            bankName: row["Bank Name"]?.toString().trim() || null,
            ifscCode: row["IFSC Code"]?.toString().trim() || null,
            branchName: row["Branch Name"]?.toString().trim() || null,
        },
        createdBy: creatorUserId || null,
    });
    return vendor.name;
};

const processProjects = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const location = row["Location"]?.toString().trim();
    const budget = toNum(row["Budget"]);
    const startDate = parseDate(row["Start Date"]);
    const endDate = parseDate(row["End Date"]);

    if (!projectName) throw new Error("Project Name is required");
    if (!location) throw new Error("Location is required");
    if (!startDate) throw new Error("Start Date is required or invalid");
    if (!endDate) throw new Error("End Date is required or invalid");

    const VALID_STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"];
    const status = row["Status"]?.toString().trim().toLowerCase();

    const project = await Project.create({
        companyId,
        projectName,
        location,
        budget,
        startDate,
        endDate,
        projectCode: row["Project Code"]?.toString().trim() || null,
        description: row["Description"]?.toString().trim() || null,
        clientName: row["Client Name"]?.toString().trim() || null,
        status: VALID_STATUSES.includes(status) ? status : "planned",
        createdBy: creatorUserId || null,
    });
    return project.projectName;
};

const processPhases = async (row, companyId, creatorUserId) => {
    const phaseName = row["Phase Name"]?.toString().trim();
    const projectName = row["Project Name"]?.toString().trim();
    const sequence = parseInt(row["Sequence"]);
    const startDate = parseDate(row["Start Date"]);
    const endDate = parseDate(row["End Date"]);

    if (!phaseName) throw new Error("Phase Name is required");
    if (!projectName) throw new Error("Project Name is required");
    if (isNaN(sequence) || sequence < 1) throw new Error("Sequence must be a positive integer");
    if (!startDate) throw new Error("Start Date is required or invalid");
    if (!endDate) throw new Error("End Date is required or invalid");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const phase = await Phase.create({
        companyId,
        projectId: project._id,
        phaseName,
        sequence,
        startDate,
        endDate,
        description: row["Description"]?.toString().trim() || null,
        createdBy: creatorUserId || null,
    });
    return phase.phaseName;
};

const processTasks = async (row, companyId, creatorUserId) => {
    const taskName = row["Task Name"]?.toString().trim();
    const projectName = row["Project Name"]?.toString().trim();
    const phaseName = row["Phase Name"]?.toString().trim();
    const startDate = parseDate(row["Start Date"]);
    const endDate = parseDate(row["End Date"]);

    if (!taskName) throw new Error("Task Name is required");
    if (!projectName) throw new Error("Project Name is required");
    if (!phaseName) throw new Error("Phase Name is required");
    if (!startDate) throw new Error("Start Date is required or invalid");
    if (!endDate) throw new Error("End Date is required or invalid");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const phase = await resolvePhase(phaseName, project._id, companyId);
    if (!phase) throw new Error(`Phase "${phaseName}" not found in project "${projectName}"`);

    const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];
    const VALID_STATUSES = ["NotStarted", "InProgress", "Completed", "Blocked", "OnHold"];
    const priority = row["Priority"]?.toString().trim();
    const status = row["Status"]?.toString().trim();

    const task = await Task.create({
        companyId,
        projectId: project._id,
        phaseId: phase._id,
        taskName,
        startDate,
        endDate,
        description: row["Description"]?.toString().trim() || null,
        priority: VALID_PRIORITIES.includes(priority) ? priority : "Medium",
        status: VALID_STATUSES.includes(status) ? status : "NotStarted",
        createdBy: creatorUserId || null,
    });
    return task.taskName;
};

const processSubTasks = async (row, companyId, creatorUserId) => {
    const title = row["Subtask Title"]?.toString().trim();
    const projectName = row["Project Name"]?.toString().trim();
    const phaseName = row["Phase Name"]?.toString().trim();
    const taskName = row["Task Name"]?.toString().trim();

    if (!title) throw new Error("Subtask Title is required");
    if (!projectName) throw new Error("Project Name is required");
    if (!phaseName) throw new Error("Phase Name is required");
    if (!taskName) throw new Error("Task Name is required");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const phase = await resolvePhase(phaseName, project._id, companyId);
    if (!phase) throw new Error(`Phase "${phaseName}" not found`);

    const task = await resolveTask(taskName, project._id, companyId);
    if (!task) throw new Error(`Task "${taskName}" not found in project "${projectName}"`);

    const VALID_STATUSES = ["NotStarted", "InProgress", "Completed", "Blocked"];
    const status = row["Status"]?.toString().trim();

    const subtask = await SubTask.create({
        companyId,
        projectId: project._id,
        phaseId: phase._id,
        taskId: task._id,
        title,
        description: row["Description"]?.toString().trim() || null,
        startDate: parseDate(row["Start Date"]),
        endDate: parseDate(row["End Date"]),
        status: VALID_STATUSES.includes(status) ? status : "NotStarted",
        createdBy: creatorUserId || null,
    });
    return subtask.title;
};

const processProjectInventory = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const materialName = row["Material Name"]?.toString().trim();

    if (!projectName) throw new Error("Project Name is required");
    if (!materialName) throw new Error("Material Name is required");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const material = await resolveMaterial(materialName, companyId);
    if (!material) throw new Error(`Material "${materialName}" not found in Material Master`);

    const exists = await Inventory.findOne({
        companyId,
        projectId: project._id,
        materialMasterId: material._id,
        isDeleted: false,
    }).lean();
    if (exists) throw new Error(`Inventory for "${materialName}" already exists in project "${projectName}"`);

    const inventory = await Inventory.create({
        companyId,
        projectId: project._id,
        materialMasterId: material._id,
        name: material.name,
        unit: material.unit,
        category: material.category || null,
        currentStock: toNum(row["Current Stock"]),
        minimumLevel: toNum(row["Minimum Level"]),
        pricePerUnit: toNum(row["Price Per Unit"]),
        supplierName: row["Supplier Name"]?.toString().trim() || null,
        createdBy: creatorUserId || null,
    });
    return `${project.projectName} / ${inventory.name}`;
};

const processStockTransfers = async (row, companyId, creatorUserId) => {
    const fromProjectName = row["From Project"]?.toString().trim();
    const toProjectName = row["To Project"]?.toString().trim();
    const materialName = row["Material Name"]?.toString().trim();
    const quantity = toNum(row["Quantity"]);

    if (!fromProjectName) throw new Error("From Project is required");
    if (!toProjectName) throw new Error("To Project is required");
    if (!materialName) throw new Error("Material Name is required");
    if (quantity <= 0) throw new Error("Quantity must be greater than 0");

    const [fromProject, toProject] = await Promise.all([
        resolveProject(fromProjectName, companyId),
        resolveProject(toProjectName, companyId),
    ]);
    if (!fromProject) throw new Error(`From Project "${fromProjectName}" not found`);
    if (!toProject) throw new Error(`To Project "${toProjectName}" not found`);
    if (fromProject._id.toString() === toProject._id.toString()) {
        throw new Error("From Project and To Project cannot be the same");
    }

    const { material, inventory } = await resolveInventory(materialName, fromProject._id, companyId);
    if (!material) throw new Error(`Material "${materialName}" not found in Material Master`);
    if (!inventory) throw new Error(`Material "${materialName}" not found in project "${fromProjectName}" inventory`);

    const VALID_STATUSES = ["Draft", "Approved", "Rejected"];
    const status = row["Status"]?.toString().trim();

    const transfer = await StockTransfer.create({
        companyId,
        fromProjectId: fromProject._id,
        toProjectId: toProject._id,
        items: [
            {
                inventoryId: inventory._id,
                materialMasterId: material._id,
                materialName: material.name,
                unit: material.unit,
                quantity,
                stockAtTimeOfTransfer: inventory.currentStock,
            },
        ],
        reason: row["Reason"]?.toString().trim() || null,
        remarks: row["Remarks"]?.toString().trim() || null,
        status: VALID_STATUSES.includes(status) ? status : "Draft",
        createdBy: creatorUserId || null,
    });
    return transfer._id.toString();
};

const processMaterialRequisitions = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const materialName = row["Material Name"]?.toString().trim();
    const requiredQty = toNum(row["Required Quantity"]);

    if (!projectName) throw new Error("Project Name is required");
    if (!materialName) throw new Error("Material Name is required");
    if (requiredQty <= 0) throw new Error("Required Quantity must be greater than 0");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const { material, inventory } = await resolveInventory(materialName, project._id, companyId);
    if (!material) throw new Error(`Material "${materialName}" not found in Material Master`);
    if (!inventory) throw new Error(`Material "${materialName}" not found in project inventory`);

    const VALID_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "ConvertedToPO"];
    const status = row["Status"]?.toString().trim();
    const mrNumber = await generateNumber("MR", companyId);

    let phaseId = null;
    const phaseName = row["Phase Name"]?.toString().trim();
    if (phaseName) {
        const phase = await resolvePhase(phaseName, project._id, companyId);
        if (phase) phaseId = phase._id;
    }

    const mr = await MaterialRequisition.create({
        companyId,
        projectId: project._id,
        phaseId,
        mrNumber,
        items: [
            {
                inventoryId: inventory._id,
                materialMasterId: material._id,
                materialName: material.name,
                unit: material.unit,
                requiredQuantity: requiredQty,
                stockAtTimeOfMR: inventory.currentStock,
            },
        ],
        requiredByDate: parseDate(row["Required By Date"]),
        reason: row["Reason"]?.toString().trim() || null,
        remarks: row["Remarks"]?.toString().trim() || null,
        status: VALID_STATUSES.includes(status) ? status : "Draft",
        createdBy: creatorUserId || null,
    });
    return mr.mrNumber;
};

const processPurchaseOrders = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const vendorName = row["Vendor Name"]?.toString().trim();
    const materialName = row["Material Name"]?.toString().trim();
    const orderedQty = toNum(row["Ordered Quantity"]);
    const unitPrice = toNum(row["Unit Price"]);
    const mrNumber = row["MR Number"]?.toString().trim();

    if (!projectName) throw new Error("Project Name is required");
    if (!vendorName) throw new Error("Vendor Name is required");
    if (!materialName) throw new Error("Material Name is required");
    if (orderedQty <= 0) throw new Error("Ordered Quantity must be greater than 0");
    if (!mrNumber) throw new Error("MR Number is required");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const vendor = await resolveVendor(vendorName, companyId);
    if (!vendor) throw new Error(`Vendor "${vendorName}" not found`);

    const mr = await resolveMR(mrNumber, project._id, companyId);
    if (!mr) throw new Error(`MR "${mrNumber}" not found in project "${projectName}"`);

    const { material, inventory } = await resolveInventory(materialName, project._id, companyId);
    if (!material) throw new Error(`Material "${materialName}" not found in Material Master`);
    if (!inventory) throw new Error(`Material "${materialName}" not found in project inventory`);

    const gstPercent = toNum(row["GST Percent"]);
    const discountPercent = toNum(row["Discount Percent"]);
    const discountAmount = (orderedQty * unitPrice) * (discountPercent / 100);
    const gstAmount = (orderedQty * unitPrice - discountAmount) * (gstPercent / 100);
    const totalPrice = orderedQty * unitPrice - discountAmount + gstAmount;

    const VALID_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "PartiallyDelivered", "Completed", "Cancelled"];
    const status = row["Status"]?.toString().trim();
    const poNumber = await generatePONumber(companyId);

    const po = await PurchaseOrder.create({
        companyId,
        projectId: project._id,
        mrId: mr._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        poNumber,
        items: [
            {
                inventoryId: inventory._id,
                materialMasterId: material._id,
                materialName: material.name,
                unit: material.unit,
                orderedQuantity: orderedQty,
                unitPrice,
                discountPercent,
                discountAmount,
                gstPercent,
                gstAmount,
                totalPrice,
            },
        ],
        totalOrderValue: totalPrice,
        expectedDeliveryDate: parseDate(row["Expected Delivery Date"]),
        deliveryAddress: row["Delivery Address"]?.toString().trim() || null,
        paymentTerms: row["Payment Terms"]?.toString().trim() || null,
        status: VALID_STATUSES.includes(status) ? status : "Draft",
        createdBy: creatorUserId || null,
    });
    return po.poNumber;
};

const processGRNs = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const poNumber = row["PO Number"]?.toString().trim();
    const materialName = row["Material Name"]?.toString().trim();
    const receivedQty = toNum(row["Received Quantity"]);
    const deliveryDate = parseDate(row["Delivery Date"]);

    if (!projectName) throw new Error("Project Name is required");
    if (!poNumber) throw new Error("PO Number is required");
    if (!materialName) throw new Error("Material Name is required");
    if (receivedQty <= 0) throw new Error("Received Quantity must be greater than 0");
    if (!deliveryDate) throw new Error("Delivery Date is required or invalid");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const po = await resolvePO(poNumber, project._id, companyId);
    if (!po) throw new Error(`PO "${poNumber}" not found in project "${projectName}"`);

    const { material, inventory } = await resolveInventory(materialName, project._id, companyId);
    if (!material) throw new Error(`Material "${materialName}" not found in Material Master`);
    if (!inventory) throw new Error(`Material "${materialName}" not found in project inventory`);

    const poItem = po.items.find(
        (i) => i.inventoryId.toString() === inventory._id.toString()
    );
    if (!poItem) throw new Error(`Material "${materialName}" is not in PO "${poNumber}"`);

    const grnNumber = await generateNumber("GRN", companyId);

    const grn = await GRN.create({
        companyId,
        projectId: project._id,
        poId: po._id,
        mrId: po.mrId,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        grnNumber,
        deliveryDate,
        vehicleNumber: row["Vehicle Number"]?.toString().trim() || null,
        deliveryChallanNumber: row["Challan Number"]?.toString().trim() || null,
        deliveryChallanDate: parseDate(row["Challan Date"]),
        items: [
            {
                inventoryId: inventory._id,
                materialMasterId: material._id,
                materialName: material.name,
                unit: material.unit,
                orderedQuantity: poItem.orderedQuantity,
                previouslyReceivedQuantity: poItem.receivedQuantity || 0,
                receivedQuantity: receivedQty,
            },
        ],
        remarks: row["Remarks"]?.toString().trim() || null,
        createdBy: creatorUserId || null,
    });
    return grn.grnNumber;
};

const processWorkOrders = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const vendorName = row["Vendor Name"]?.toString().trim();
    const title = row["Title"]?.toString().trim();
    const workDescription = row["Work Description"]?.toString().trim();
    const unit = row["Unit"]?.toString().trim();
    const quantity = toNum(row["Quantity"]);
    const unitRate = toNum(row["Unit Rate"]);

    if (!projectName) throw new Error("Project Name is required");
    if (!vendorName) throw new Error("Vendor Name is required");
    if (!title) throw new Error("Title is required");
    if (!workDescription) throw new Error("Work Description is required");
    if (!unit) throw new Error("Unit is required");
    if (quantity <= 0) throw new Error("Quantity must be greater than 0");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const vendor = await resolveVendor(vendorName, companyId);
    if (!vendor) throw new Error(`Vendor "${vendorName}" not found`);

    const amount = quantity * unitRate;

    const VALID_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "InProgress", "Completed", "Cancelled"];
    const status = row["Status"]?.toString().trim();
    const woNumber = await generateNumber("WO", companyId);

    const wo = await WorkOrder.create({
        companyId,
        projectId: project._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        woNumber,
        title,
        description: row["Description"]?.toString().trim() || null,
        workItems: [{ description: workDescription, unit, quantity, unitRate, amount }],
        totalContractValue: amount,
        startDate: parseDate(row["Start Date"]),
        expectedEndDate: parseDate(row["Expected End Date"]),
        paymentTerms: row["Payment Terms"]?.toString().trim() || null,
        workLocation: row["Work Location"]?.toString().trim() || null,
        status: VALID_STATUSES.includes(status) ? status : "Draft",
        createdBy: creatorUserId || null,
    });
    return wo.woNumber;
};

const processExpenses = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const amount = toNum(row["Amount"]);
    const expenseDate = parseDate(row["Expense Date"]);
    const category = row["Category"]?.toString().trim();
    const description = row["Description"]?.toString().trim();

    if (!projectName) throw new Error("Project Name is required");
    if (amount <= 0) throw new Error("Amount must be greater than 0");
    if (!expenseDate) throw new Error("Expense Date is required or invalid");
    if (!description) throw new Error("Description is required");

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const VALID_CATEGORIES = ["Material", "Labour", "Contractor", "Transfer", "Petty Cash", "Miscellaneous", "Other"];
    const VALID_STATUSES = ["Committed", "Actual", "Pending", "Approved", "Rejected", "Reversed"];
    const VALID_PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "Other"];

    const status = row["Status"]?.toString().trim();
    const paymentMode = row["Payment Mode"]?.toString().trim();
    const expenseNumber = await generateNumber("EXP", companyId);

    const expense = await Expense.create({
        companyId,
        projectId: project._id,
        expenseNumber,
        type: "Manual",
        category: VALID_CATEGORIES.includes(category) ? category : "Other",
        status: VALID_STATUSES.includes(status) ? status : "Pending",
        amount,
        description,
        expenseDate,
        sourceModel: "Manual",
        sourceId: null,
        sourceNumber: null,
        manualEntryDetails: {
            subType: row["Sub Type"]?.toString().trim() || null,
            paymentMode: VALID_PAYMENT_MODES.includes(paymentMode) ? paymentMode : null,
            referenceNumber: row["Reference Number"]?.toString().trim() || null,
        },
        createdBy: creatorUserId || null,
    });
    return expense.expenseNumber;
};

const processPayables = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const totalAmount = toNum(row["Total Amount"]);
    const vendorName = row["Vendor Name"]?.toString().trim();
    const sourceType = row["Source Type"]?.toString().trim();

    if (!projectName) throw new Error("Project Name is required");
    if (totalAmount <= 0) throw new Error("Total Amount must be greater than 0");
    if (!sourceType) throw new Error("Source Type is required");

    const VALID_SOURCE_TYPES = ["GRN", "WO", "ManualExpense"];
    if (!VALID_SOURCE_TYPES.includes(sourceType)) {
        throw new Error(`Source Type must be one of: ${VALID_SOURCE_TYPES.join(", ")}`);
    }

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    let vendorId = null;
    let resolvedVendorName = null;
    if (vendorName) {
        const vendor = await resolveVendor(vendorName, companyId);
        if (vendor) {
            vendorId = vendor._id;
            resolvedVendorName = vendor.name;
        }
    }

    let sourceId = new mongoose.Types.ObjectId();
    let sourceNumber = null;
    const sourceRef = row["Source Number"]?.toString().trim();

    if (sourceRef) {
        if (sourceType === "GRN") {
            const grn = await resolveGRN(sourceRef, project._id, companyId);
            if (grn) { sourceId = grn._id; sourceNumber = grn.grnNumber; }
        } else if (sourceType === "WO") {
            const wo = await resolveWO(sourceRef, project._id, companyId);
            if (wo) { sourceId = wo._id; sourceNumber = wo.woNumber; }
        }
    }

    const VALID_STATUSES = ["Unpaid", "PartiallyPaid", "Paid", "Reversed"];
    const status = row["Status"]?.toString().trim();
    const paidAmount = toNum(row["Paid Amount"]);
    const payableNumber = await generateNumber("PAY", companyId);

    const payable = await Payable.create({
        companyId,
        projectId: project._id,
        payableNumber,
        sourceType,
        sourceId,
        sourceNumber,
        vendorId,
        vendorName: resolvedVendorName,
        totalAmount,
        paidAmount,
        dueAmount: Math.max(totalAmount - paidAmount, 0),
        status: VALID_STATUSES.includes(status) ? status : "Unpaid",
        dueDate: parseDate(row["Due Date"]),
        notes: row["Notes"]?.toString().trim() || null,
        createdBy: creatorUserId || null,
    });
    return payable.payableNumber;
};

const processIssues = async (row, companyId, creatorUserId) => {
    const projectName = row["Project Name"]?.toString().trim();
    const title = row["Title"]?.toString().trim();
    const description = row["Description"]?.toString().trim();
    const issueType = row["Issue Type"]?.toString().trim().toLowerCase().replace(/ /g, "_");

    if (!projectName) throw new Error("Project Name is required");
    if (!title) throw new Error("Title is required");
    if (!description) throw new Error("Description is required");
    if (!issueType) throw new Error("Issue Type is required");

    const VALID_TYPES = [
        "site_hazard", "material_shortage", "task_delay", "quality_defect",
        "equipment_breakdown", "safety_concern", "design_change", "financial_exception", "other",
    ];
    const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
    const VALID_STATUSES = ["submitted", "resolved", "rejected"];

    if (!VALID_TYPES.includes(issueType)) {
        throw new Error(`Issue Type must be one of: ${VALID_TYPES.join(", ")}`);
    }

    const project = await resolveProject(projectName, companyId);
    if (!project) throw new Error(`Project "${projectName}" not found`);

    const priority = row["Priority"]?.toString().trim().toLowerCase();
    const status = row["Status"]?.toString().trim().toLowerCase();

    const issue = await Issue.create({
        companyId,
        projectId: project._id,
        title,
        description,
        issueType,
        priority: VALID_PRIORITIES.includes(priority) ? priority : "medium",
        status: VALID_STATUSES.includes(status) ? status : "submitted",
        dueDate: parseDate(row["Due Date"]),
        tags: row["Tags"]
            ? row["Tags"].toString().split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        createdBy: creatorUserId || null,
    });
    return issue.title;
};