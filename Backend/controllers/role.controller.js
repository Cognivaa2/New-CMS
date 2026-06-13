import mongoose from "mongoose";
import Role from "../models/role.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import logger from "../utils/logger.utils.js";
import { VALID_ACTIONS, MODULES } from "../models/role.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";


const resolveCompany = async (companyId) => {
    const company = await Company.findOne({ companyId, isDeleted: false }).lean();
    if (!company) {
        return {
            errorResponse: new ApiErrors(
                404,
                "Company Not Found",
                "Please provide a valid companyId"
            ),
        };
    }
    return { company };
};



const applyPermissions = (role, sanitised) => {
    const newPermissions = new Map();
    const newModuleStatus = new Map();

    for (const mod of MODULES) {
        const acts = sanitised[mod] ?? [];
        if (acts.length > 0) {
            newPermissions.set(mod, acts);
            newModuleStatus.set(mod, true);
        } else {
            newModuleStatus.set(mod, false);
        }
    }
    role.permissions = newPermissions;
    role.moduleStatus = newModuleStatus;
    role.markModified("permissions");
    role.markModified("moduleStatus");
};


const validatePermissionsPayload = (permissions) => {
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
        return { errors: ["permissions must be a plain object: { moduleName: [actions] }"] };
    }
    const errors = [];
    const sanitised = {};
    for (const [mod, acts] of Object.entries(permissions)) {
        if (!MODULES.includes(mod)) {
            errors.push(
                `Invalid module: "${mod}". Valid modules: [${MODULES.join(", ")}]`
            );
            continue;
        }
        if (!Array.isArray(acts)) {
            errors.push(`Actions for "${mod}" must be an array`);
            continue;
        }
        const invalid = acts.filter((a) => !VALID_ACTIONS.includes(a));
        if (invalid.length > 0) {
            errors.push(
                `Invalid actions for "${mod}": [${invalid.join(", ")}]. Allowed: [${VALID_ACTIONS.join(", ")}]`
            );
            continue;
        }
        sanitised[mod] = [...new Set(acts)];
    }
    return errors.length > 0 ? { errors } : { sanitised };
};



// This function creates a new role for a company. takes x-company-id in headers and roleName with optional description in body. validates uniqueness and creates active role entry. -------------------------- Ayan
export const addRole = async (req, res) => {
    try {
        const { roleName, description } = req.body;
        const companyId = req.headers["x-company-id"];
        if (!roleName || !companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "roleName and x-company-id header are required")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const existingRole = await Role.findOne({
            companyId: company._id,
            roleName: { $regex: new RegExp(`^${roleName.trim()}$`, "i") },
            isDeleted: false,
        });
        if (existingRole) {
            return res.status(409).json(
                new ApiErrors(409, "Role Already Exists", `A role named "${roleName}" already exists in this company`)
            );
        }
        const role = await Role.create({
            companyId: company._id,
            roleName: roleName.trim(),
            description: description?.trim() || null,
            createdBy: req.user?.userId || null,
        });
        logger.info("Role created", { roleId: role._id, roleName: role.roleName, companyId });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    roleId: role._id,
                    roleName: role.roleName,
                    description: role.description,
                    isActive: role.isActive,
                    createdAt: role.createdAt,
                },
                "Role Created",
                "Role has been created successfully"
            )
        );
    } catch (error) {
        logger.error("addRole failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while creating the role", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function returns all roles for a company. takes x-company-id in headers. supports pagination, search (roleName, description), filtering (isActive) and sorting. -------------------------- Ayan
export const allRoleList = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            isActive,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
        const sortOrder = order === "asc" ? 1 : -1;
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const filter = { isDeleted: false, companyId: company._id };
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (search) {
            filter.$or = [
                { roleName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        const [roles, total] = await Promise.all([
            Role.find(filter)
                .sort({ [sortBy]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Role.countDocuments(filter),
        ]);
        logger.info("Role list fetched", { total, page: pageNumber, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roles,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Roles Retrieved",
                `Successfully fetched ${roles.length} role(s)`
            )
        );
    } catch (error) {
        logger.error("allRoleList failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while fetching roles", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function fetches a specific role by ID. takes x-company-id in headers and roleId in params. returns complete role details including permissions and module status mappings. -------------------------- Ayan
export const getRoleById = async (req, res) => {
    try {
        const { roleId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!roleId || !companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "roleId param and x-company-id header are required")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Role ID", "The provided roleId is not a valid MongoDB ObjectId")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({
            _id: roleId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No active role found with the provided roleId for this company")
            );
        }
        const formatted = {
            ...role,
            permissions: role.permissions || {},
            moduleStatus: role.moduleStatus || {},
        };
        logger.info("Role fetched by ID", { roleId: role._id, roleName: role.roleName, companyId });
        return res.status(200).json(
            new ApiResponse(200, formatted, "Role Retrieved", `Role "${role.roleName}" fetched successfully`)
        );
    } catch (error) {
        logger.error("getRoleById failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while fetching the role", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function updates role details. takes x-company-id in headers, roleId in params and editable fields like roleName, description and isActive in body. validates duplicate role names before update. -------------------------- Ayan
export const editRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { roleName, description, isActive } = req.body;
        const companyId = req.headers["x-company-id"];
        if (!roleId || !companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "roleId param and x-company-id header are required")
            );
        }
        if (roleName === undefined && description === undefined && isActive === undefined) {
            return res.status(400).json(
                new ApiErrors(400, "No Fields To Update", "Provide at least one field: roleName, description, or isActive")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No active role found with the provided roleId for this company")
            );
        }
        if (roleName && roleName.trim().toLowerCase() !== role.roleName.toLowerCase()) {
            const duplicate = await Role.findOne({
                companyId: company._id,
                roleName: { $regex: new RegExp(`^${roleName.trim()}$`, "i") },
                isDeleted: false,
                _id: { $ne: roleId },
            });
            if (duplicate) {
                return res.status(409).json(
                    new ApiErrors(409, "Role Already Exists", `A role named "${roleName}" already exists in this company`)
                );
            }
        }
        if (roleName !== undefined) role.roleName = roleName.trim();
        if (description !== undefined) role.description = description?.trim() || null;
        if (isActive !== undefined) role.isActive = isActive;
        role.updatedBy = req.user?.userId || null;
        await role.save();
        logger.info("Role updated", { roleId: role._id, roleName: role.roleName, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roleId: role._id,
                    roleName: role.roleName,
                    description: role.description,
                    isActive: role.isActive,
                    updatedAt: role.updatedAt,
                },
                "Role Updated",
                "Role has been updated successfully"
            )
        );
    } catch (error) {
        logger.error("editRole failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while updating the role", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function permanently deletes a role. takes x-company-id in headers and roleId in params. prevents deletion if users are assigned to the role and removes role permanently from database. -------------------------- Ayan
export const hardDeleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!roleId || !companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "roleId param and x-company-id header are required")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No role found with the provided roleId for this company")
            );
        }
        const assignedUserCount = await User.countDocuments({ roleId: role._id, isDeleted: false });
        if (assignedUserCount > 0) {
            return res.status(409).json(
                new ApiErrors(
                    409,
                    "Role In Use",
                    `Cannot delete this role — ${assignedUserCount} user(s) are currently assigned to it. Reassign them first.`
                )
            );
        }
        await Role.deleteOne({ _id: role._id });
        logger.info("Role permanently deleted", { roleId: role._id, roleName: role.roleName, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { roleId: role._id, roleName: role.roleName },
                "Role Deleted",
                `Role "${role.roleName}" has been permanently deleted`
            )
        );
    } catch (error) {
        logger.error("hardDeleteRole failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while deleting the role", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function soft deletes a role. takes x-company-id in headers and roleId in params. prevents deletion if users are assigned, clears permissions and marks role as inactive and deleted. -------------------------- Ayan
export const softDeleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!roleId || !companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "roleId param and x-company-id header are required")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No active role found with the provided roleId for this company")
            );
        }
        const assignedUserCount = await User.countDocuments({ roleId: role._id, isDeleted: false });
        if (assignedUserCount > 0) {
            return res.status(409).json(
                new ApiErrors(
                    409,
                    "Role In Use",
                    `Cannot delete this role — ${assignedUserCount} user(s) are assigned to it. Reassign them first.`
                )
            );
        }
        role.isDeleted = true;
        role.isActive = false;
        role.updatedBy = req.user?.userId || null;
        applyPermissions(role, {});
        await role.save();
        logger.info("Role soft-deleted", { roleId: role._id, roleName: role.roleName, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { roleId: role._id, roleName: role.roleName },
                "Role Deleted",
                `Role "${role.roleName}" has been soft-deleted`
            )
        );
    } catch (error) {
        logger.error("softDeleteRole failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while soft-deleting the role", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function updates role active status. takes x-company-id in headers, roleId in params and isActive in body. updates role state and clears permissions automatically when role is deactivated. -------------------------- Ayan
export const updateRoleStatus = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { isActive } = req.body;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        if (typeof isActive !== "boolean") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Value", "isActive must be a boolean (true or false)")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No role found with the provided roleId")
            );
        }
        role.isActive = isActive;
        role.updatedBy = req.user?.userId || null;
        if (!isActive) {
            applyPermissions(role, {});
        }
        await role.save();
        logger.info("Role status updated", { roleId, isActive, permissionsCleared: !isActive });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roleId: role._id,
                    roleName: role.roleName,
                    isActive: role.isActive,
                    permissions: Object.fromEntries(role.permissions),
                },
                "Role Status Updated",
                `Role is now ${isActive ? "Active" : "Inactive"}${!isActive ? ". All permissions have been cleared." : ""}`
            )
        );
    } catch (error) {
        logger.error("updateRoleStatus failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while updating the role status", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function fully replaces permissions for a role. takes x-company-id in headers, roleId in params and permissions object in body. validates modules and actions, blocks Owner role modification and updates permission mappings. -------------------------- Ayan
export const setRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No role found with the provided roleId")
            );
        }
        if (!role.isActive) {
            return res.status(403).json(
                new ApiErrors(
                    403,
                    "Role Inactive",
                    `Permissions cannot be assigned to an inactive role. Activate it first.`
                )
            );
        }
        if (role.roleName.trim().toLowerCase() === "owner") {
            logger.warn("Attempt to modify Owner role permissions blocked", { roleId, companyId });
            return res.status(403).json(
                new ApiErrors(
                    403,
                    "Permission Change Not Allowed",
                    "Owner role permissions cannot be changed. The Owner has full access to all modules by default."
                )
            );
        }
        const { sanitised, errors } = validatePermissionsPayload(permissions);
        if (errors) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "One or more permissions are invalid", errors)
            );
        }
        applyPermissions(role, sanitised);
        role.updatedBy = req.user?.userId || null;
        await role.save();
        logger.info("Role permissions set (full replace)", { roleId, modules: Object.keys(sanitised) });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roleId: role._id,
                    roleName: role.roleName,
                    permissions: Object.fromEntries(role.permissions),
                    moduleStatus: Object.fromEntries(role.moduleStatus),
                },
                "Permissions Updated",
                "Role permissions have been fully replaced"
            )
        );
    } catch (error) {
        logger.error("setRolePermissions failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while setting role permissions", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};


// This function partially updates role permissions. takes x-company-id in headers, roleId in params and permissions object in body. validates modules and actions, updates selected module permissions and preserves remaining mappings. -------------------------- Ayan
export const patchRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No role found with the provided roleId")
            );
        }
        if (!role.isActive) {
            return res.status(403).json(
                new ApiErrors(403, "Role Inactive", "Activate the role before modifying permissions.")
            );
        }
        if (role.roleName.trim().toLowerCase() === "owner") {
            return res.status(403).json(
                new ApiErrors(403, "Permission Change Not Allowed", "Owner role permissions cannot be changed.")
            );
        }
        const { sanitised, errors } = validatePermissionsPayload(permissions);
        if (errors) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "One or more permissions are invalid", errors)
            );
        }
        for (const [mod, acts] of Object.entries(sanitised)) {
            if (acts.length > 0) {
                role.permissions.set(mod, acts);
                role.moduleStatus.set(mod, true);
            } else {
                role.permissions.delete(mod);
                role.moduleStatus.set(mod, false);
            }
        }
        role.markModified("permissions");
        role.markModified("moduleStatus");
        role.updatedBy = req.user?.userId || null;
        await role.save();
        logger.info("Role permissions patched (partial update)", { roleId, modules: Object.keys(sanitised) });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roleId: role._id,
                    roleName: role.roleName,
                    permissions: Object.fromEntries(role.permissions),
                    moduleStatus: Object.fromEntries(role.moduleStatus),
                },
                "Permissions Patched",
                "Selected module permissions have been updated"
            )
        );
    } catch (error) {
        logger.error("patchRolePermissions failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while patching role permissions", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function grants or clears all permissions for a role. takes x-company-id in headers, roleId in params and enable boolean in body. prevents modification of Owner or inactive roles and updates all module permissions and statuses accordingly. -------------------------- Ayan
export const toggleAllPermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { enable } = req.body;
        const companyId = req.headers["x-company-id"];

        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        if (typeof enable !== "boolean") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Value", "enable must be a boolean (true or false)")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false });
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No role found with the provided roleId")
            );
        }
        if (role.roleName.trim().toLowerCase() === "owner") {
            return res.status(403).json(
                new ApiErrors(403, "Not Allowed", "Owner role permissions cannot be modified.")
            );
        }
        if (!role.isActive) {
            return res.status(403).json(
                new ApiErrors(403, "Role Inactive", "Activate the role before modifying permissions.")
            );
        }
        if (enable) {
            const fullPermissions = {};
            for (const mod of MODULES) {
                fullPermissions[mod] = [...VALID_ACTIONS];
            }
            applyPermissions(role, fullPermissions);
        } else {
            applyPermissions(role, {});
        }
        role.updatedBy = req.user?.userId || null;
        await role.save();
        logger.info(`All permissions ${enable ? "granted" : "cleared"} for role`, { roleId, companyId, enable });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roleId: role._id,
                    roleName: role.roleName,
                    permissions: Object.fromEntries(role.permissions),
                    moduleStatus: Object.fromEntries(role.moduleStatus),
                },
                enable ? "All Permissions Granted" : "All Permissions Cleared",
                enable
                    ? `All powers have been enabled for role "${role.roleName}"`
                    : `All powers have been removed from role "${role.roleName}"`
            )
        );
    } catch (error) {
        logger.error("toggleAllPermissions failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function returns role schema metadata. provides all valid modules, actions, primary modules and project modules supported in the permission system. -------------------------- Ayan
export const getRoleSchema = async (req, res) => {
    try {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    modules: MODULES,
                    actions: VALID_ACTIONS,
                    primaryModules: MODULES.filter((m) => m.startsWith("primary-")),
                    projectModules: MODULES.filter((m) => m.startsWith("project-")),
                },
                "Schema Retrieved",
                "Role schema (modules and actions) fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getRoleSchema failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred")
        );
    }
};


// This function returns all users assigned to a specific role. takes x-company-id in headers and roleId in params. supports pagination and returns minimal user details with role information. -------------------------- Ayan
export const getUsersByRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const companyId = req.headers["x-company-id"];
        const { page = 1, limit = 10 } = req.query;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Role ID", "The provided roleId is not a valid MongoDB ObjectId")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);

        const role = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false }).lean();
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No active role found with the provided roleId")
            );
        }
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
        const [users, total] = await Promise.all([
            User.find({ roleId: role._id, companyId: company._id, isDeleted: false })
                .select("name email status createdAt")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            User.countDocuments({ roleId: role._id, companyId: company._id, isDeleted: false }),
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    role: { roleId: role._id, roleName: role.roleName },
                    users,
                    pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
                },
                "Users Retrieved",
                `Found ${total} user(s) assigned to role "${role.roleName}"`
            )
        );
    } catch (error) {
        logger.error("getUsersByRole failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};


// This function clones an existing role. takes x-company-id in headers, roleId in params and newRoleName with optional description in body. duplicates permissions and module mappings into a new active role. -------------------------- Ayan
export const cloneRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { newRoleName, description } = req.body;
        const companyId = req.headers["x-company-id"];
        if (!newRoleName || !companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "newRoleName and x-company-id header are required")
            );
        }
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) return res.status(errorResponse.statusCode).json(errorResponse);
        const sourceRole = await Role.findOne({ _id: roleId, companyId: company._id, isDeleted: false }).lean();
        if (!sourceRole) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "Source role not found")
            );
        }
        const duplicate = await Role.findOne({
            companyId: company._id,
            roleName: { $regex: new RegExp(`^${newRoleName.trim()}$`, "i") },
            isDeleted: false,
        });
        if (duplicate) {
            return res.status(409).json(
                new ApiErrors(409, "Role Already Exists", `A role named "${newRoleName}" already exists in this company`)
            );
        }
        const newRole = await Role.create({
            companyId: company._id,
            roleName: newRoleName.trim(),
            description: description?.trim() || `Cloned from "${sourceRole.roleName}"`,
            isActive: true,
            permissions: new Map(Object.entries(sourceRole.permissions || {})),
            moduleStatus: new Map(Object.entries(sourceRole.moduleStatus || {})),
            createdBy: req.user?.userId || null,
        });
        logger.info("Role cloned", { sourceRoleId: roleId, newRoleId: newRole._id, companyId });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    roleId: newRole._id,
                    roleName: newRole.roleName,
                    description: newRole.description,
                    permissions: Object.fromEntries(newRole.permissions),
                    moduleStatus: Object.fromEntries(newRole.moduleStatus),
                    clonedFrom: { roleId: sourceRole._id, roleName: sourceRole.roleName },
                },
                "Role Cloned",
                `Role "${sourceRole.roleName}" has been cloned as "${newRole.roleName}"`
            )
        );
    } catch (error) {
        logger.error("cloneRole failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while cloning the role", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};



// This function returns lightweight role data only. takes x-company-id in headers. supports pagination, search, filtering and sorting without permissions/module mappings. -------------------------- Ayan
export const lightweightRoleList = async (req, res) => {
    try {
        const {page = 1, limit = 10, search = "", isActive, sortBy = "createdAt", order = "desc"} = req.query;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400,"Missing Header", "x-company-id header is required")
            );
        }
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
        const sortOrder = order === "asc" ? 1 : -1;
        const { company, errorResponse } = await resolveCompany(companyId);
        if (errorResponse) {
            return res.status(errorResponse.statusCode).json(errorResponse);
        }
        const filter = {
            companyId: company._id,
            isDeleted: false,
        };
        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }
        if (search) {
            filter.$or = [
                {
                    roleName: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }
        const [roles, total] = await Promise.all([
            Role.find(filter)
                .select("_id roleName description isActive createdAt updatedAt")
                .sort({ [sortBy]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),

            Role.countDocuments(filter),
        ]);
        const formattedRoles = roles.map((role) => ({
            roleId: role._id,
            roleName: role.roleName,
            description: role.description,
            isActive: role.isActive,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        }));
        logger.info("Lightweight role list fetched", {
            total,
            page: pageNumber,
            companyId,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    roles: formattedRoles,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Roles Retrieved",
                `Successfully fetched ${formattedRoles.length} lightweight role(s)`
            )
        );
    } catch (error) {
        logger.error("lightweightRoleList failed", {
            error: error.message,
        });
        return res.status(500).json(
            new ApiErrors( 500, "Internal Server Error","An unexpected error occurred while fetching lightweight roles",
                [], process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};