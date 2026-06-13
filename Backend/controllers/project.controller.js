import mongoose from "mongoose";
import Project from "../models/project.models.js";
import Phase from "../models/phase.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import Role from "../models/role.models.js";
import Inventory from "../models/inventory.models.js";
import StockTransfer from "../models/stockTransfer.models.js";
import logger from "../utils/logger.utils.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrors from "../utils/ApiErrors.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import keycloakService from "../services/keycloak.service.js";
import NotificationService from "../services/notification.service.js";
import { buildProjectExportZip } from "../helpers/projectExportHelper.js";

// Add New Project ---------------------------------------------------------------------------------------- @Sundar
export const addProject = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const {
            projectName,
            projectCode,
            description,
            clientName,
            location,
            startDate,
            endDate,
            budget,
            status,
            completionPercent,
            assignedUsers,
            createdBy,
        } = req.body;
        const missing = [];
        if (!projectName) missing.push("projectName");
        if (!projectCode) missing.push("projectCode");
        if (!clientName) missing.push("clientName");
        if (!location) missing.push("location");
        if (!startDate) missing.push("startDate");
        if (!endDate) missing.push("endDate");
        if (budget === undefined || budget === null) missing.push("budget");
        if (!status) missing.push("status");
        if (completionPercent === undefined || completionPercent === null)
            missing.push("completionPercent");
        if (!createdBy || !createdBy.trim()) missing.push("createdBy");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const companyObjectId = company._id;
        const companyOwner = await User.findOne({
            _id: company.ownerId,
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();

        if (!companyOwner) {
            logger.warn("Company owner not found — project will be created without auto-owner", {
                companyId: companyUUID,
                ownerId: company.ownerId ?? "not set",
            });
        }
        const creatorUser = await User.findOne({
            keycloakId: createdBy.trim(),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "Invalid createdBy", `No user found with keycloakId: ${createdBy}`)
            );
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Date Format", ["startDate and endDate must be valid dates"])
            );
        }
        if (end <= start) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Date Range", ["endDate must be after startDate"])
            );
        }
        if (Number(budget) < 0) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Budget", ["budget cannot be negative"])
            );
        }
        const percent = Number(completionPercent);
        if (percent < 0 || percent > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Completion Percent", ["completionPercent must be between 0 and 100"])
            );
        }
        const validStatuses = ["planned", "active", "on_hold", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Status", [`Valid statuses: ${validStatuses.join(", ")}`])
            );
        }
        const duplicate = await Project.findOne({
            companyId: companyObjectId,
            projectCode: {
                $regex: new RegExp(`^${projectCode.trim()}$`, "i"),
            },
            isDeleted: false,
        });
        if (duplicate) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Project Code", [`Project code "${projectCode}" already exists`])
            );
        }
        let parsedAssignedUsers = assignedUsers;
        if (typeof assignedUsers === "string") {
            try {
                parsedAssignedUsers = JSON.parse(assignedUsers);
            } catch {
                parsedAssignedUsers = assignedUsers
                    .replace(/[\[\]]/g, "")
                    .split(",")
                    .map((id) => ({ userId: id.trim(), designation: null }))
                    .filter((e) => e.userId);
            }
        }
        let resolvedUserIds = [];
        let responseAssignedUsers = [];
        if (parsedAssignedUsers && parsedAssignedUsers.length > 0) {
            if (!Array.isArray(parsedAssignedUsers)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid assignedUsers", ["assignedUsers must be an array"])
                );
            }
            const keycloakIds = parsedAssignedUsers.map((e) =>
                typeof e === "string" ? e.trim() : e.userId?.trim()
            );
            const users = await User.find({
                keycloakId: { $in: keycloakIds },
                companyId: companyObjectId,
                isDeleted: false,
            })
                .lean();
            if (users.length !== keycloakIds.length) {
                return res.status(404).json(
                    new ApiErrors(404, "Invalid Assigned Users", ["Some users not found"])
                );
            }
            const kcMap = {};
            users.forEach((u) => (kcMap[u.keycloakId] = u));
            const explicitDesignationIds = parsedAssignedUsers
                .filter((e) => typeof e === "object" && e.designation?.trim())
                .map((e) => e.designation.trim());
            const validRoleIds = new Set();
            if (explicitDesignationIds.length > 0) {
                const roles = await Role.find({
                    _id: { $in: explicitDesignationIds },
                })
                    .select("_id")
                    .lean();
                roles.forEach((r) => validRoleIds.add(r._id.toString()));
            }
            const designationMap = {};
            parsedAssignedUsers.forEach((e) => {
                const kcId = typeof e === "string" ? e.trim() : e.userId?.trim();
                const matchedUser = kcMap[kcId];
                let designation = null;
                if (typeof e === "object" && e.designation?.trim()) {
                    designation = e.designation.trim();
                } else {
                    designation = matchedUser?.roleId
                        ? matchedUser.roleId.toString()
                        : null;
                }
                designationMap[kcId] = designation;
            });
            resolvedUserIds = keycloakIds.map((kcId) => ({
                userId: kcMap[kcId]._id,
                designation: designationMap[kcId] ?? null,
                assignedAt: new Date(),
            }));
            responseAssignedUsers = keycloakIds.map((kcId) => ({
                userId: kcId,
                designation: designationMap[kcId] ?? null,
            }));
        }
        let coverImageUrl = null;
        if (companyOwner) {
            const alreadyAssigned = resolvedUserIds.some(
                (u) => u.userId.toString() === companyOwner._id.toString()
            );
            if (!alreadyAssigned) {
                resolvedUserIds.unshift({
                    userId: companyOwner._id,
                    designation: companyOwner.roleId?.toString() ?? null,
                    assignedAt: new Date(),
                });
                responseAssignedUsers.unshift({
                    userId: companyOwner.keycloakId,
                    designation: companyOwner.roleId?.toString() ?? null,
                });
                logger.info("Company owner auto-assigned to project", {
                    ownerKeycloakId: companyOwner.keycloakId,
                    companyId: companyUUID,
                });
            }
        }
        const creatorAlreadyAssigned = resolvedUserIds.some(
            (u) => u.userId.toString() === creatorUser._id.toString()
        );
        if (!creatorAlreadyAssigned) {
            resolvedUserIds.push({
                userId: creatorUser._id,
                designation: creatorUser.roleId?.toString() ?? null,
                assignedAt: new Date(),
            });
            responseAssignedUsers.push({
                userId: creatorUser.keycloakId,
                designation: creatorUser.roleId?.toString() ?? null,
            });
            logger.info("Project creator auto-assigned to project", {
                creatorKeycloakId: creatorUser.keycloakId,
                companyId: companyUUID,
            });
        }
        if (req.file) {
            const ext = req.file.originalname.split(".").pop();
            const key = `projects/covers/${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}.${ext}`;
            const { url } = await uploadToR2({
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                key,
            });
            coverImageUrl = url;
        }
        const project = await Project.create({
            companyId: companyObjectId,
            projectName: projectName.trim(),
            projectCode: projectCode.trim().toUpperCase(),
            description: description?.trim() || null,
            clientName: clientName.trim(),
            location: location.trim(),
            startDate: start,
            endDate: end,
            budget: Number(budget),
            status,
            completionPercent: percent,
            coverImage: coverImageUrl,
            assignedUsers: resolvedUserIds,
            createdBy: creatorUser._id,
        });
        if (resolvedUserIds.length > 0) {
            const userIds = resolvedUserIds.map((u) => u.userId);
            await User.updateMany(
                { _id: { $in: userIds }, isDeleted: false },
                { $addToSet: { assignedProjects: project._id } }
            );
            NotificationService.notifyProjectAssigned({
                companyId: companyObjectId,
                projectId: project._id,
                projectName: project.projectName,
                recipientIds: userIds.map(id => id.toString()),
                triggeredBy: creatorUser._id,
            }).catch(err => logger.error("notifyProjectAssigned (addProject) failed (non-fatal)", { error: err.message }));
        }
        logger.info("Project created successfully", {
            projectId: project._id,
            createdBy: creatorUser._id,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    projectId: project._id,
                    projectName: project.projectName,
                    projectCode: project.projectCode,
                    clientName: project.clientName,
                    location: project.location,
                    status: project.status,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    budget: project.budget,
                    completionPercent: project.completionPercent,
                    coverImage: project.coverImage,
                    assignedUsers: responseAssignedUsers,
                    createdBy: project.createdBy,
                    createdAt: project.createdAt,
                },
                "Project Created",
                `Project "${project.projectName}" created successfully`
            )
        );
    } catch (error) {
        logger.error("addProject failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// All Projects (Pagination & Search & Filter) ------------------------------------------------------------ @Sundar
export const allProject = async (req, res) => {
    try {
        const companyId = req.headers["x-company-id"];
        const { keycloakId } = req.params;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        if (!keycloakId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Param", ["keycloakId is required in the URL"])
            );
        }
        const company = await Company.findOne({ companyId }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Please provide a valid companyId"])
            );
        }
        const requestingUser = await User.findOne({
            keycloakId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!requestingUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", ["No active user found with this keycloakId in your company"])
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid page number", ["Page must be a positive number"])
            );
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid limit", ["Limit must be between 1 and 100"])
            );
        }
        const filter = { isDeleted: false, companyId: company._id };
        if (!requestingUser.isOwner) {
            filter["assignedUsers.userId"] = requestingUser._id;
        }

        if (status) filter.status = status;

        if (search && search.trim()) {
            const regex = { $regex: search.trim(), $options: "i" };
            filter.$or = [
                { projectName: regex },
                { projectCode: regex },
                { clientName: regex },
            ];
        }
        const allowedSortFields = [
            "projectName", "projectCode", "clientName",
            "startDate", "endDate", "budget", "status", "createdAt",
        ];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const [projects, total] = await Promise.all([
            Project.find(filter)
                .select(
                    "_id projectName projectCode description location coverImage completionPercent status healthStatus assignedUsers budget startDate endDate createdAt"
                )
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Project.countDocuments(filter),
        ]);

        const allUserObjectIds = [
            ...new Set(
                projects.flatMap((p) =>
                    p.assignedUsers.map((u) => u.userId.toString())
                )
            ),
        ];
        const usersMap = {};
        if (allUserObjectIds.length > 0) {
            const users = await User.find({
                _id: { $in: allUserObjectIds },
                isDeleted: false,
            })
                .select("_id keycloakId")
                .lean();
            await Promise.all(
                users.map(async (u) => {
                    try {
                        const kcUser = await keycloakService.getUserById(u.keycloakId);
                        usersMap[u._id.toString()] = {
                            userId: u.keycloakId,
                            name: kcUser?.attributes?.name?.[0] || kcUser?.firstName || "Unknown",
                            email: kcUser?.email || null,
                            status: kcUser?.attributes?.status?.[0] || null,
                            avatar: kcUser?.attributes?.avatar?.[0] || null,
                        };
                    } catch {
                        usersMap[u._id.toString()] = {
                            userId: u.keycloakId,
                            name: "Unknown",
                            email: null,
                            status: null,
                            avatar: null,
                        };
                    }
                })
            );
        }
        const formattedProjects = projects.map((p) => ({
            projectId: p._id,
            projectName: p.projectName,
            projectCode: p.projectCode,
            description: p.description,
            clientName: p.clientName,
            location: p.location,
            coverImage: p.coverImage,
            budget: p.budget,
            startDate: p.startDate,
            endDate: p.endDate,
            completionPercent: p.completionPercent,
            status: p.status,
            healthStatus: p.healthStatus,
            startDate: p.startDate,
            endDate: p.endDate,
            budget: p.budget,
            assignedUsers: p.assignedUsers
                .map((u) => usersMap[u.userId.toString()] || null)
                .filter(Boolean),
            createdAt: p.createdAt,
        }));
        logger.info("Projects fetched successfully", {
            total,
            page: pageNumber,
            companyId,
        });
        return res.status(200).json(
            new ApiResponse(
                true,
                total > 0 ? "Projects fetched successfully" : "No projects found",
                {
                    projects: formattedProjects,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                }
            )
        );
    } catch (error) {
        logger.error("allProject failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// Get Single Project Details (With Show Phases & Tasks & Subtasks) --------------------------------------- @Sundar
export const getProjectById = async (req, res) => {
    try {
        const companyId = req.headers["x-company-id"];
        const { projectId } = req.params;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", ["projectId must be a valid MongoDB ObjectId"])
            );
        }
        const company = await Company.findOne({ companyId }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Please provide a valid companyId"])
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", ["No project found with the given ID for this company"])
            );
        }
        const enrichedAssignedUsers = await Promise.all(
            (project.assignedUsers || []).map(async (entry) => {
                try {
                    const mongoUser = await User.findOne({
                        _id: entry.userId,
                        isDeleted: false,
                    }).select("_id keycloakId roleId").lean();
                    if (!mongoUser) {
                        return {
                            userId: null,
                            username: null,
                            email: null,
                            avatar: null,
                            roleId: null,
                            roleName: entry.designation || null,
                            designation: entry.designation || null,
                            assignedAt: entry.assignedAt,
                        };
                    }
                    let kcUser = null;
                    try {
                        kcUser = await keycloakService.getUserById(mongoUser.keycloakId);
                    } catch (kcErr) {
                        logger.warn("Keycloak fetch failed for user", {
                            keycloakId: mongoUser.keycloakId,
                            error: kcErr.message,
                        });
                    }
                    let roleName = entry.designation || null;
                    if (mongoUser.roleId) {
                        const role = await Role.findOne({
                            _id: mongoUser.roleId,
                            isDeleted: false,
                        }).select("roleName").lean();
                        if (role) roleName = role.roleName;
                    }
                    return {
                        userId: mongoUser.keycloakId,
                        name: kcUser?.attributes?.name?.[0] || kcUser?.firstName || "Unknown",
                        email: kcUser?.email || null,
                        avatar: kcUser?.attributes?.avatar?.[0] || null,
                        roleId: mongoUser.roleId?.toString() || null,
                        roleName,
                        designation: entry.designation || null,
                        assignedAt: entry.assignedAt,
                    };
                } catch (err) {
                    logger.warn("enrichAssignedUser failed", { userId: entry.userId, error: err.message });
                    return {
                        userId: null,
                        name: null,
                        email: null,
                        avatar: null,
                        roleId: null,
                        roleName: null,
                        designation: entry.designation || null,
                        assignedAt: entry.assignedAt,
                    };
                }
            })
        );
        const includeDeleted = req.query.includeDeleted === "true";
        const childFilter = (extra = {}) => ({
            ...extra,
            ...(includeDeleted ? {} : { isDeleted: false }),
        });
        const phases = await Phase.find(
            childFilter({ projectId: project._id })
        ).select("_id").lean();
        const phaseIds = phases.map((p) => p._id);
        const tasks = await Task.find(childFilter({ phaseId: { $in: phaseIds } }))
            .select("_id completionPercent")
            .lean();
        const taskIds = tasks.map((t) => t._id);
        const [totalSubtasksCount, completedSubtasksCount] = await Promise.all([
            taskIds.length > 0
                ? SubTask.countDocuments(childFilter({ taskId: { $in: taskIds } }))
                : Promise.resolve(0),
            taskIds.length > 0
                ? SubTask.countDocuments({ ...childFilter({ taskId: { $in: taskIds } }), completionPercent: 100 })
                : Promise.resolve(0),
        ]);
        const stats = {
            totalPhases: phases.length,
            totalTasks: tasks.length,
            totalSubtasks: totalSubtasksCount,
            completedTasks: tasks.filter((t) => t.completionPercent === 100).length,
            completedSubtasks: completedSubtasksCount,
        };
        const inventoryItems = await Inventory.find({
            projectId: project._id,
            companyId: company._id,
            isDeleted: false,
        })
            .select("name unit category currentStock minimumLevel pricePerUnit totalReceived totalConsumed lastRestockedAt")
            .lean();
        const materialStock = inventoryItems.map((inv) => ({
            inventoryId: inv._id,
            materialName: inv.name,
            unit: inv.unit,
            category: inv.category || null,
            currentStock: inv.currentStock,
            minimumLevel: inv.minimumLevel,
            pricePerUnit: inv.pricePerUnit,
            totalReceived: inv.totalReceived,
            totalConsumed: inv.totalConsumed,
            lastRestockedAt: inv.lastRestockedAt || null,
        }));
        const transfersOut = await StockTransfer.find({
            fromProjectId: project._id,
            companyId: company._id,
            status: "Approved",
            isDeleted: false,
        })
            .select("toProjectId items approvedAt reason remarks")
            .populate("toProjectId", "projectName projectCode")
            .lean();
        const transfersIn = await StockTransfer.find({
            toProjectId: project._id,
            companyId: company._id,
            status: "Approved",
            isDeleted: false,
        })
            .select("fromProjectId items approvedAt reason remarks")
            .populate("fromProjectId", "projectName projectCode")
            .lean();
        const stockSentOut = transfersOut.map((t) => ({
            transferId: t._id,
            direction: "out",
            toProject: {
                projectId: t.toProjectId?._id || null,
                projectName: t.toProjectId?.projectName || null,
                projectCode: t.toProjectId?.projectCode || null,
            },
            items: (t.items || []).map((item) => ({
                materialName: item.materialName,
                unit: item.unit,
                quantityTransferred: item.quantity,
            })),
            reason: t.reason || null,
            remarks: t.remarks || null,
            approvedAt: t.approvedAt || null,
        }));
        const stockReceivedIn = transfersIn.map((t) => ({
            transferId: t._id,
            direction: "in",
            fromProject: {
                projectId: t.fromProjectId?._id || null,
                projectName: t.fromProjectId?.projectName || null,
                projectCode: t.fromProjectId?.projectCode || null,
            },
            items: (t.items || []).map((item) => ({
                materialName: item.materialName,
                unit: item.unit,
                quantityTransferred: item.quantity,
            })),
            reason: t.reason || null,
            remarks: t.remarks || null,
            approvedAt: t.approvedAt || null,
        }));
        logger.info("getProject fetched successfully", { projectId });
        return res.status(200).json(
            new ApiResponse(
                true,
                {
                    project: {
                        projectId: project._id,
                        projectName: project.projectName,
                        projectCode: project.projectCode,
                        description: project.description,
                        clientName: project.clientName,
                        location: project.location,
                        coverImage: project.coverImage,
                        budget: project.budget,
                        startDate: project.startDate,
                        endDate: project.endDate,
                        status: project.status,
                        healthStatus: project.healthStatus,
                        completionPercent: project.completionPercent,
                        assignedUsers: enrichedAssignedUsers,
                        createdAt: project.createdAt,
                        updatedAt: project.updatedAt,
                    },
                    stats,
                    materialStock,
                    stockTransfers: {
                        summary: {
                            totalSent: stockSentOut.length,
                            totalReceived: stockReceivedIn.length,
                        },
                        sent: stockSentOut,
                        received: stockReceivedIn,
                    },
                },
                "Project fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getProject failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// Edit Project Details ----------------------------------------------------------------------------------- @Sundar
export const editProject = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", [
                    "x-company-id header is required",
                ])
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", [
                    "projectId must be a valid MongoDB ObjectId",
                ])
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", [
                    "No active company found with the provided x-company-id",
                ])
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", [
                    "No project found with the given ID for this company",
                ])
            );
        }
        const {
            projectName,
            projectCode,
            description,
            clientName,
            location,
            startDate,
            endDate,
            budget,
        } = req.body;
        const allowedFields = [
            "projectName", "projectCode", "description", "clientName",
            "location", "startDate", "endDate", "budget",
        ];
        const provided = allowedFields.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0 && !req.file) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", [
                    "Send at least one field to update",
                ])
            );
        }
        const updates = {};
        const errors = [];
        if (projectName !== undefined) {
            if (!projectName.trim()) {
                errors.push("projectName cannot be empty");
            } else {
                updates.projectName = projectName.trim();
            }
        }
        if (projectCode !== undefined) {
            if (!projectCode.trim()) {
                errors.push("projectCode cannot be empty");
            } else {
                const normalized = projectCode.trim().toUpperCase();
                const duplicate = await Project.findOne({
                    companyId: company._id,
                    projectCode: { $regex: new RegExp(`^${normalized}$`, "i") },
                    isDeleted: false,
                    _id: { $ne: project._id },
                }).lean();
                if (duplicate) {
                    errors.push(`Project code "${normalized}" is already in use`);
                } else {
                    updates.projectCode = normalized;
                }
            }
        }
        if (description !== undefined) {
            updates.description = description === null || description === ""
                ? null
                : description.trim();
        }
        if (clientName !== undefined) {
            if (!clientName.trim()) {
                errors.push("clientName cannot be empty");
            } else {
                updates.clientName = clientName.trim();
            }
        }
        if (location !== undefined) {
            if (!location.trim()) {
                errors.push("location cannot be empty");
            } else {
                updates.location = location.trim();
            }
        }
        const resolvedStart = startDate ? new Date(startDate) : project.startDate;
        const resolvedEnd = endDate ? new Date(endDate) : project.endDate;
        if (startDate !== undefined) {
            if (isNaN(resolvedStart.getTime())) {
                errors.push("startDate must be a valid date");
            } else {
                updates.startDate = resolvedStart;
            }
        }
        if (endDate !== undefined) {
            if (isNaN(resolvedEnd.getTime())) {
                errors.push("endDate must be a valid date");
            } else {
                updates.endDate = resolvedEnd;
            }
        }
        if (!errors.length && (startDate !== undefined || endDate !== undefined)) {
            if (resolvedEnd <= resolvedStart) {
                errors.push("endDate must be after startDate");
            }
        }
        if (budget !== undefined) {
            const num = Number(budget);
            if (isNaN(num) || num < 0) {
                errors.push("budget must be a non-negative number");
            } else {
                updates.budget = num;
            }
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", errors)
            );
        }
        if (req.file) {
            const ext = req.file.originalname.split(".").pop();
            const key = `projects/covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { url } = await uploadToR2({
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                key,
            });
            updates.coverImage = url;
        }
        const updatedBy = req.user?._id ?? null;
        if (updatedBy) {
            updates.updatedBy = new mongoose.Types.ObjectId(updatedBy);
        }
        const updated = await Project.findByIdAndUpdate(
            project._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        logger.info("Project updated successfully", {
            projectId: project._id,
            updatedFields: Object.keys(updates),
        });
        return res.status(200).json(
            new ApiResponse(true, "Project updated successfully", {
                projectId: updated._id,
                projectName: updated.projectName,
                projectCode: updated.projectCode,
                description: updated.description,
                clientName: updated.clientName,
                location: updated.location,
                startDate: updated.startDate,
                endDate: updated.endDate,
                budget: updated.budget,
                coverImage: updated.coverImage,
                updatedAt: updated.updatedAt,
            })
        );
    } catch (error) {
        logger.error("editProject failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// Delete Project (Soft Delete) ---------------------------------------------------------------------------- @Sundar
export const deleteProject = async (req, res) => {
    try {
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", [
                    "x-company-id header is required",
                ])
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", [
                    "projectId must be a valid MongoDB ObjectId",
                ])
            );
        }
        const company = await Company.findOne({ companyId }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", [
                    "Please provide a valid companyId",
                ])
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", [
                    "No project found with the given ID for this company",
                ])
            );
        }
        const updatedBy = req.headers["x-user-id"] ?? null;
        await Project.findByIdAndUpdate(projectId, {
            $set: {
                isDeleted: true,
                ...(updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)
                    ? { updatedBy: new mongoose.Types.ObjectId(updatedBy) }
                    : {}),
            },
        });
        logger.info("Project soft-deleted successfully", {
            projectId: project._id,
            projectName: project.projectName,
        });
        return res.status(200).json(
            new ApiResponse(true, "Project deleted successfully", {
                projectId: project._id,
                projectName: project.projectName,
                deletedAt: new Date().toISOString(),
            })
        );
    } catch (error) {
        logger.error("deleteProject failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// Returns all assigned members of a project with their basic info from Keycloak. Also implemented search feature.  ------------------- Ayan
export const getProjectMembers = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        const { search = "" } = req.query;
        const searchTerm = search.trim().toLowerCase();
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).select("assignedUsers projectName").lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!project.assignedUsers?.length) {
            return res.status(200).json(
                new ApiResponse(true, "No members assigned to this project", {
                    projectId,
                    members: [],
                    totalMembers: 0,
                })
            );
        }
        const mongoUserIds = project.assignedUsers.map((u) => u.userId);
        const dbUsers = await User.find({
            _id: { $in: mongoUserIds },
            isDeleted: false,
        }).select("_id keycloakId roleId").lean();
        const dbUserMap = {};
        for (const u of dbUsers) dbUserMap[u._id.toString()] = u;
        const members = await Promise.all(
            project.assignedUsers.map(async (entry) => {
                const dbUser = dbUserMap[entry.userId.toString()];
                if (!dbUser) return null;

                let name = null, email = null, avatar = null;
                try {
                    const kcUser = await keycloakService.getUserById(dbUser.keycloakId);
                    const attrs = kcUser.attributes || {};
                    name = attrs.name?.[0] ?? null;
                    email = kcUser?.email ?? null;
                    avatar = attrs.avatar?.[0] ?? null;
                } catch (error) {
                    logger.error("getProjectMembers: keycloak fetch failed", {
                        keycloakId: dbUser.keycloakId,
                        error: error.message,
                    });
                    return null;
                }
                return { keycloakId: dbUser.keycloakId, mongoId: dbUser._id, name, email, avatar, designation: entry.designation ?? null, assignedAt: entry.assignedAt, };
            })
        );
        let filteredMembers = members.filter(Boolean);
        if (searchTerm) {
            filteredMembers = filteredMembers.filter((m) => {
                const nameMatch = m.name?.toLowerCase().includes(searchTerm);
                const emailMatch = m.email?.toLowerCase().includes(searchTerm);
                return nameMatch || emailMatch;
            });
        }
        logger.info("getProjectMembers: fetched", {
            projectId,
            total: members.filter(Boolean).length,
            afterSearch: filteredMembers.length,
            searchTerm: searchTerm || null,
        });
        return res.status(200).json(
            new ApiResponse(true, "Project members fetched successfully", {
                projectId,
                members: filteredMembers,
                totalMembers: filteredMembers.length,
            })
        );
    } catch (error) {
        logger.error("getProjectMembers failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// Add or Remove any user from a project. ---------------- Ayan
export const updateProjectMember = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        const { userId, action, roleId } = req.body;
        if (!userId?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "userId (keycloakId) is required")
            );
        }
        if (!["add", "remove"].includes(action)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", 'action must be either "add" or "remove"')
            );
        }
        if (roleId && !mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid roleId", "roleId must be a valid MongoDB ObjectId")
            );
        }
        const company = await Company.findOne({ companyId: companyUUID.trim(), isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        const targetUser = await User.findOne({
            keycloakId: userId.trim(),
            companyId: company._id,
            isDeleted: false,
        }).select("+name").lean();
        if (!targetUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No active user found with this keycloakId in your company")
            );
        }
        const alreadyAssigned = project.assignedUsers.some(
            (u) => u.userId.toString() === targetUser._id.toString()
        );
        if (action === "add") {
            if (alreadyAssigned) {
                return res.status(409).json(
                    new ApiErrors(409, "Already Assigned", "This user is already a member of this project")
                );
            }
            let designation = null;
            const effectiveRoleId =
                roleId ||
                (mongoose.Types.ObjectId.isValid(targetUser.roleId)
                    ? targetUser.roleId.toString()
                    : null);
            if (effectiveRoleId) {
                const role = await Role.findOne({ _id: effectiveRoleId, isDeleted: false })
                    .select("roleName")
                    .lean();
                designation = role?.roleName || null;
            }
            await Project.findByIdAndUpdate(projectId, {
                $push: {
                    assignedUsers: {
                        userId: targetUser._id,
                        designation,
                        assignedAt: new Date(),
                    },
                },
            });
            await User.findByIdAndUpdate(targetUser._id, {
                $addToSet: { assignedProjects: project._id },
            });
            // Send notification to the newly assigned user and all other project members
            NotificationService.notifyProjectAssigned({
                companyId: company._id,
                projectId: project._id,
                projectName: project.projectName,
                recipientIds: [targetUser._id.toString()],
                triggeredBy: req.user?.userId || null,
            }).catch(err => logger.error("notifyProjectAssigned (updateProjectMember) failed (non-fatal)", { error: err.message }));
            logger.info("updateProjectMember: user added", { projectId, userId });
            return res.status(200).json(
                new ApiResponse(true, "Member added successfully", {
                    projectId, action: "add",
                    member: {
                        userId: userId.trim(),
                        mongoId: targetUser._id,
                        designation,
                        assignedAt: new Date(),
                    },
                })
            );
        } else {
            if (!alreadyAssigned) {
                return res.status(404).json(
                    new ApiErrors(404, "Not a Member", "This user is not assigned to this project")
                );
            }
            await Project.findByIdAndUpdate(projectId, {
                $pull: { assignedUsers: { userId: targetUser._id } },
            });
            await User.findByIdAndUpdate(targetUser._id, {
                $pull: { assignedProjects: project._id },
            });
            logger.info("updateProjectMember: user removed", { projectId, userId });
            return res.status(200).json(
                new ApiResponse(true, "Member removed successfully", {
                    projectId,
                    action: "remove",
                    member: {
                        userId: userId.trim(),
                        mongoId: targetUser._id,
                    },
                })
            );
        }
    } catch (error) {
        logger.error("updateProjectMember failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// Change designation/role of an assigned project member. Takes the keycloak id and valid role id in the body.  ---------------------- Ayan
export const changeProjectMemberRole = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        const { userId, roleId } = req.body;
        const missing = [];
        if (!userId?.trim()) missing.push("userId (keycloakId)");
        if (!roleId?.trim()) missing.push("roleId");
        if (missing.length > 0) {
            return res.status(400).json(new ApiErrors(400, "Missing Required Fields", missing));
        }
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid roleId", "roleId must be a valid MongoDB ObjectId"));
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company"));
        }
        const targetUser = await User.findOne({
            keycloakId: userId.trim(),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!targetUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No active user found with this keycloakId in your company"));
        }
        const isAssigned = project.assignedUsers.some(
            (u) => u.userId.toString() === targetUser._id.toString()
        );
        if (!isAssigned) {
            return res.status(404).json(
                new ApiErrors(404, "Not a Member", "This user is not assigned to this project. Add them first before changing their role."));
        }
        const role = await Role.findOne({
            _id: roleId,
            isDeleted: false,
        })
            .select("_id roleName")
            .lean();
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No active role found with the provided roleId"));
        }
        const currentEntry = project.assignedUsers.find(
            (u) => u.userId.toString() === targetUser._id.toString()
        );
        if (currentEntry?.designation === role.roleName) {
            return res.status(200).json(
                new ApiResponse(true, "Designation is already set to this role", {
                    projectId: project._id,
                    member: {
                        userId: userId.trim(),
                        mongoId: targetUser._id,
                        roleId: role._id,
                        designation: role.roleName,
                    },
                })
            );
        }
        await Project.findOneAndUpdate(
            { _id: project._id, "assignedUsers.userId": targetUser._id },
            { $set: { "assignedUsers.$.designation": role.roleName } },
            { new: true }
        );
        logger.info("changeProjectMemberRole: designation updated", {
            projectId: project._id,
            userId: userId.trim(),
            roleId: role._id,
            designation: role.roleName,
            previousDesignation: currentEntry?.designation || null,
        });
        return res.status(200).json(
            new ApiResponse(true, "Member designation updated successfully", {
                projectId: project._id,
                member: {
                    userId: userId.trim(),
                    mongoId: targetUser._id,
                    roleId: role._id,
                    designation: role.roleName,
                    previousDesignation: currentEntry?.designation || null,
                },
            })
        );
    } catch (error) {
        logger.error("changeProjectMemberRole failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

//  Get Projects light weight data . it only sends the project name , project id , cover image and status . This is developed for the project switch feature in secondary sidebar.  ------------------------------------- Ayan
export const getProjectListForSidebar = async (req, res) => {
    try {
        const companyId = req.headers["x-company-id"];
        const { keycloakId } = req.params;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        if (!keycloakId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Param", ["keycloakId is required"])
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Please provide a valid companyId"])
            );
        }
        const requestingUser = await User.findOne({
            keycloakId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!requestingUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", ["No active user found with this keycloakId in your company"])
            );
        }
        const filter = {
            companyId: company._id,
            isDeleted: false,
        };
        if (!requestingUser.isOwner) {
            filter["assignedUsers.userId"] = requestingUser._id;
        }
        const projects = await Project.find(filter)
            .select("_id projectName coverImage status")
            .sort({ projectName: 1 })
            .lean();
        const formatted = projects.map((p) => ({
            projectId: p._id,
            projectName: p.projectName,
            coverImage: p.coverImage || null,
            status: p.status,
        }));
        return res.status(200).json(
            new ApiResponse(true, "Project list fetched", {
                projects: formatted,
                total: formatted.length,
            })
        );
    } catch (error) {
        logger.error("getProjectListForSidebar failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// Get Project Start & End Date -------------------------------------------------------- @Sundar
export const getProjectDates = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId } = req.params;
        if (!projectId || !projectId.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Parameter", "projectId is required")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Parameter", "projectId is not a valid ObjectId")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        })
            .select("projectName projectCode startDate endDate")
            .lean();

        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID")
            );
        }
        logger.info("Project dates fetched successfully", { projectId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    projectId: project._id,
                    projectName: project.projectName,
                    projectCode: project.projectCode,
                    startDate: project.startDate,
                    endDate: project.endDate,
                },
                "Project Dates Fetched",
                `Dates for project "${project.projectName}" fetched successfully`
            )
        );
    } catch (error) {
        logger.error("getProjectDates failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// Lightweight Project Lookup (All Projects - No User Filter) -------------------------------------------- @Ayan
export const getProjectLookup = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();

        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const projects = await Project.find({
            companyId: company._id,
            isDeleted: false,
        })
            .select("_id projectName status")
            .sort({ projectName: 1 })
            .lean();

        return res.status(200).json(
            new ApiResponse(true, "Project lookup fetched", {
                projects: projects.map((p) => ({
                    projectId: p._id,
                    projectName: p.projectName,
                    status: p.status,
                })),
                total: projects.length,
            })
        );
    } catch (error) {
        logger.error("getProjectLookup failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};



// This function exports complete project data as a downloadable ZIP package. takes x-company-id in headers and projectId in params. validates company and project ownership, gathers project-related data across all modules and generates a structured multi-file export containing project, phases, tasks, subtasks, inventory, transfers, MRs, POs, GRNs, WOs, expenses, payables and material consumption records. -------------------------- Ayan
export const exportProjectData = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        await buildProjectExportZip(project._id.toString(), company._id.toString(), res);
    } catch (error) {
        logger.error("exportProjectData failed", { error: error.message });
        if (!res.headersSent) {
            return res.status(500).json(
                new ApiErrors(500, "Internal Server Error", [error.message])
            );
        }
    }
};