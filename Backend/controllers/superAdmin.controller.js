import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Project from "../models/project.models.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Expense from "../models/expense.models.js";
import Issue from "../models/issue.models.js";
import Document from "../models/document.models.js";
import WorkOrder from "../models/workOrder.models.js";
import Inventory from "../models/inventory.models.js";

const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 20);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// --------- Company -----------

// List all registered companies with optional filters
export const listCompanies = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, isVerified, search } = req.query;
        const filter = { isDeleted: false };
        if (status) filter.status = status;
        if (isVerified) filter.isVerified = isVerified === "true";
        if (search) {
            filter.$or = [
                { companyName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { gstin: { $regex: search, $options: "i" } },
                { "address.city": { $regex: search, $options: "i" } },
                { "address.state": { $regex: search, $options: "i" } },
            ];
        }
        const [companies, total] = await Promise.all([
            Company.find(filter)
                .select("companyId companyName companyType email phone status isVerified address logo ownerId subscriptionId createdAt")
                .populate("ownerId", "+name +email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Company.countDocuments(filter),
        ]);
        const companyIds = companies.map((c) => c._id);
        const [projectCounts, userCounts] = await Promise.all([
            Project.aggregate([
                { $match: { companyId: { $in: companyIds }, isDeleted: false } },
                { $group: { _id: "$companyId", count: { $sum: 1 } } },
            ]),
            User.aggregate([
                { $match: { companyId: { $in: companyIds }, isDeleted: false } },
                { $group: { _id: "$companyId", count: { $sum: 1 } } },
            ]),
        ]);
        const projectMap = Object.fromEntries(projectCounts.map((p) => [p._id.toString(), p.count]));
        const userMap = Object.fromEntries(userCounts.map((u) => [u._id.toString(), u.count]));
        const data = companies.map((c) => ({
            companyName: c.companyName || "",
            companyEmail: c.email || "",
            companyPhone: c.phone || "",
            companyAddress: c.address || null,
            companylogo: c.logo || "",
            totalProject: projectMap[c._id.toString()] || 0,
            totalUser: userMap[c._id.toString()] || 0,
            ownerDetail: c.ownerId || null,
        }));
        return res.status(200).json({
            success: true,
            data,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error("listCompanies:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Full company profile — name, type, GSTIN, PAN, CIN, email, phone, address, logo, owner, subscription, soft-delete info
export const getCompanyProfile = async (req, res) => {
    try {
        const { companyId } = req.params;
        const company = await Company.findOne({ companyId, isDeleted: false })
            .select("-__v")
            .populate("ownerId", "name email phone status lastLoginAt")
            .lean();
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        const [projectStats, userStats] = await Promise.all([
            Project.aggregate([
                { $match: { companyId: company._id, isDeleted: false } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalBudget: { $sum: "$budget" },
                    },
                },
            ]),
            User.aggregate([
                { $match: { companyId: company._id, isDeleted: false } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);
        const formattedProjectStats = { totalProjects: 0, totalBudget: 0, byStatus: {} };
        projectStats.forEach(p => {
            const status = p._id || "Unknown";
            formattedProjectStats.totalProjects += p.count;
            formattedProjectStats.totalBudget += (p.totalBudget || 0);
            formattedProjectStats.byStatus[status] = {
                count: p.count,
                totalBudget: p.totalBudget || 0
            };
        });
        const formattedUserStats = { totalUsers: 0, byStatus: {} };
        userStats.forEach(u => {
            const status = u._id || "Unknown";
            formattedUserStats.totalUsers += u.count;
            formattedUserStats.byStatus[status] = u.count;
        });
        return res.status(200).json({
            success: true,
            data: {
                company,
                stats: { projectStats: formattedProjectStats, userStats: formattedUserStats },
            },
        });
    } catch (err) {
        console.error("getCompanyProfile:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Return all data of a project
export const getProjectAllData = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.params.companyID;
        const projectId = req.params.projectId || req.params.projectID;
        if (!companyId || !projectId) {
            return res.status(400).json({ success: false, message: "Company ID and Project ID are required" });
        }
        const company = await Company.findOne({ companyId: companyId, isDeleted: false }).select("_id").lean();
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        const project = await Project.findOne({ _id: projectId, companyId: company._id, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        const totalUserOfProject = await User.countDocuments({ assignedProjects: project._id, isDeleted: false });
        const query = { projectId: project._id, isDeleted: false };
        const [
            phases,
            tasks,
            subTasks,
            expenses,
            issues,
            documents,
            workOrders,
            inventory
        ] = await Promise.all([
            Phase.find(query).lean(),
            Task.find(query).lean(),
            SubTask.find(query).lean(),
            Expense.find(query).lean(),
            Issue.find(query).lean(),
            Document.find(query).lean(),
            WorkOrder.find(query).lean(),
            Inventory.find(query).lean()
        ]);
        return res.status(200).json({
            success: true,
            data: {
                projectID: project._id,
                projectName: project.projectName,
                ...project,
                "totalUser of project": totalUserOfProject,
                "project budget": project.budget,
                relatedData: {
                    phases,
                    tasks,
                    subTasks,
                    expenses,
                    issues,
                    documents,
                    workOrders,
                    inventory
                }
            }
        });
    } catch (err) {
        console.error("getProjectAllData:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Company Summary Light Weight Api Returns total projects and total users of a single company
export const getCompanySummary = async (req, res) => {
    try {
        const { companyId } = req.params;
        const company = await Company.findOne({
            companyId,
            isDeleted: false,
        }).select("_id companyId companyName");
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }
        const [totalProject, totalUser] = await Promise.all([
            Project.countDocuments({
                companyId: company._id,
                isDeleted: false,
            }),
            User.countDocuments({
                companyId: company._id,
                isDeleted: false,
            }),
        ]);
        return res.status(200).json({
            success: true,
            data: {
                companyId: company.companyId,
                companyName: company.companyName,
                totalProject,
                totalUser,
            },
        });
    } catch (err) {
        console.error("getCompanySummary:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// For Change Company Status Reactive / Deactive
export const updateCompanyStatus = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status } = req.body;
        const VALID = ["Active", "Suspended", "Deactivated"];
        if (!VALID.includes(status)) {
            return res.status(400).json({ success: false, message: `status must be one of ${VALID.join(", ")}` });
        }
        const company = await Company.findOne({ companyId, isDeleted: false });
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        company.status = status;
        await company.save();
        if (req.admin?.logActivity) {
            await req.admin.logActivity({
                action: `Company status changed to ${status}`,
                targetModel: "Company",
                targetId: company._id,
                targetLabel: company.companyName,
                ipAddress: req.ip,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Company ${status.toLowerCase()} successfully`,
            data: { companyId: company.companyId, status: company.status },
        });
    } catch (err) {
        console.error("updateCompanyStatus:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Soft delete a company — sets isDeleted: true, deletedAt: now
export const softDeleteCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const company = await Company.findOne({ companyId, isDeleted: false });
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        company.isDeleted = true;
        company.deletedAt = new Date();
        await company.save();
        return res.status(200).json({
            success: true,
            message: "Company soft deleted successfully",
            data: { companyId: company.companyId, isDeleted: company.isDeleted, deletedAt: company.deletedAt },
        });
    } catch (err) {
        console.error("softDeleteCompany:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// --------- Project ----------

// List all Projects across all companies with status
export const listAllProjects = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, search, companyId } = req.query;
        const filter = { isDeleted: false };
        if (status) filter.status = status;
        if (companyId) {
            const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
            if (!company) {
                return res.status(404).json({ success: false, message: "Company not found" });
            }
            filter.companyId = company._id;
        }
        if (search) {
            filter.$or = [
                { projectName: { $regex: search, $options: "i" } },
                { projectCode: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        const [projects, total] = await Promise.all([
            Project.find(filter)
                .select("projectName projectCode description status budget startDate endDate companyId createdAt")
                .populate("companyId", "companyId companyName email logo")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Project.countDocuments(filter),
        ]);
        const statusSummary = await Project.aggregate([
            { $match: { isDeleted: false, ...(filter.companyId ? { companyId: filter.companyId } : {}) } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        const byStatus = Object.fromEntries(statusSummary.map((s) => [s._id, s.count]));
        return res.status(200).json({
            success: true,
            data: projects,
            summary: { total, byStatus },
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error("listAllProjects:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// List total users grouped by company with Keycloak companyId
export const listAllUsers = async (req, res) => {
    try {
        const { companyId } = req.query;

        const matchFilter = { isDeleted: false };

        if (companyId) {
            const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
            if (!company) {
                return res.status(404).json({ success: false, message: "Company not found" });
            }
            matchFilter.companyId = company._id;
        }

        const usersByCompany = await User.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: "$companyId",
                    totalUser: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "_id",
                    foreignField: "_id",
                    as: "company",
                },
            },
            { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } }, // ✅ fixed
            {
                $project: {
                    _id: 0,
                    companyId: { $ifNull: ["$company.companyId", null] },
                    companyName: { $ifNull: ["$company.companyName", "N/A"] },
                    totalUser: 1,
                },
            },
            { $sort: { totalUser: -1 } },
        ]);

        const totalUsers = usersByCompany.reduce((sum, c) => sum + c.totalUser, 0);

        return res.status(200).json({
            success: true,
            summary: { totalUsers },
            data: usersByCompany,
        });
    } catch (err) {
        console.error("listAllUsers:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};