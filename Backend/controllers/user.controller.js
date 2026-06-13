import User from "../models/user.models.js";
import Company from "../models/company.models.js";
import Role from "../models/role.models.js";
import Project from "../models/project.models.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import keycloakService from "../services/keycloak.service.js";
import { KeycloakError } from "../utils/errorHandler.utils.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import logger from "../utils/logger.utils.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrors from "../utils/ApiErrors.js";
import sendEmail from "../services/email.service.js";
import { generateCredentials } from "../utils/generateCredentials.utils.js";
import { welcomeUserTemplate } from "../templates/welcomeUserTemplate.js";
import { calculateProfileCompletion } from "../utils/userProfileCompletion.utils.js";


// User Register --------------------------------- @Sundar
export const registerUser = async (req, res) => {
    let keycloakId = null;
    try {
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { name, email, phone, address, about, roleId, createdBy } = req.body;
        if (!name || !email || !roleId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "name, email and roleId are required")
            );
        }
        const normalizedEmail = email.toLowerCase().trim();
        const existingKcUser = await keycloakService.getUserByEmail(normalizedEmail);
        if (existingKcUser) {
            return res.status(409).json(
                new ApiErrors(409, "User Already Exists", "A user with this email is already registered")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false });
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Role", "roleId must be a valid MongoDB ObjectId")
            );
        }
        const role = await Role.findOne({
            _id: roleId,
            companyId: company._id,
            isDeleted: false,
            isActive: true,
        }).lean();
        if (!role) {
            return res.status(404).json(
                new ApiErrors(404, "Role Not Found", "No active role found with the provided roleId for this company")
            );
        }
        const { username, password, passwordHash } = await generateCredentials(normalizedEmail);
        keycloakId = await keycloakService.createUser({
            name,
            email: normalizedEmail,
            username,
            password,
            phone: phone || "",
            address: address || "",
            companyId: String(companyId),
            about: about || "",
            status: "Active",
            isOwner: false,
            roleId,
        });
        if (!keycloakId) throw new Error("Keycloak did not return a user ID");
        const user = await User.create({
            keycloakId,
            companyId: company._id,
            roleId,
            name,
            isOwner: false,
            passwordHash,
            createdBy: createdBy || null,
        });
        const { subject, html } = welcomeUserTemplate({ name, username, password, companyName: company.companyName });
        sendEmail({ to: normalizedEmail, subject, html }).catch((mailErr) =>
            logger.error("Welcome email failed", { email: normalizedEmail, error: mailErr.message })
        );
        logger.info("User registered successfully", { email: normalizedEmail, keycloakId });
        return res.status(201).json(
            new ApiResponse(
                201,
                { keycloakId, companyId, roleId, createdAt: user.createdAt },
                "User Created Successfully",
                `Login credentials have been sent to ${normalizedEmail}`
            )
        );
    } catch (error) {
        if (keycloakId) {
            try {
                await keycloakService.deleteUser(keycloakId);
                logger.warn("Rolled back Keycloak user after MongoDB failure", { keycloakId });
            } catch (rollbackError) {
                logger.error("Rollback failed — Keycloak user may be orphaned", { keycloakId, error: rollbackError.message });
            }
        }
        logger.error("registerUser failed", { error: error.message });
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication Service Error", error.message)
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong. Please try again")
        );
    }
};


// User Profile Update --------------------------- @Sundar
export const updateUserProfile = async (req, res) => {
    try {
        const { keycloakId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const { name, phone, address, about } = req.body;
        const mongoUser = await User.findOne({ keycloakId, companyId: company._id, isDeleted: false })
            .select("+avatar +profileCompletion");
        if (!mongoUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No user found with the provided keycloakId")
            );
        }
        let avatarUrl = undefined;
        if (req.file) {
            const ext = req.file.originalname.split(".").pop();
            const key = `avatars/${keycloakId}-${Date.now()}.${ext}`;
            const uploaded = await uploadToR2({ buffer: req.file.buffer, mimeType: req.file.mimetype, key });
            avatarUrl = uploaded.url;
            logger.info("Avatar uploaded to R2", { keycloakId, key });
        }
        const kcAttrUpdates = {};
        if (name !== undefined) kcAttrUpdates.name = name;
        if (phone !== undefined) kcAttrUpdates.phone = phone;
        if (address !== undefined) kcAttrUpdates.address = address;
        if (about !== undefined) kcAttrUpdates.about = about;
        if (avatarUrl !== undefined) kcAttrUpdates.avatar = avatarUrl;
        const freshKcUser = await keycloakService.getUserById(keycloakId);
        const kcAttributes = freshKcUser?.attributes || {};
        const mergedKcAttributes = {
            ...kcAttributes,
            ...(name !== undefined && { name: [name] }),
            ...(phone !== undefined && { phone: [phone] }),
            ...(address !== undefined && { address: [address] }),
            ...(about !== undefined && { about: [about] }),
        };
        const mergedMongoDoc = {
            avatar: avatarUrl ?? mongoUser.avatar,
            email: (freshKcUser?.email) ?? null,
        };
        const profileCompletion = calculateProfileCompletion(mergedKcAttributes, mergedMongoDoc);
        kcAttrUpdates.profileCompletion = String(profileCompletion);
        console.log("avatarUrl:", avatarUrl);
        console.log("kcAttrUpdates:", kcAttrUpdates);
        await keycloakService.updateUser(keycloakId, { attributes: kcAttrUpdates }, freshKcUser);
        logger.info("Keycloak attributes updated", { keycloakId, fields: Object.keys(kcAttrUpdates) });
        const mongoUpdates = { updatedBy: mongoUser._id };
        if (name !== undefined) mongoUpdates.name = name.trim();
        if (phone !== undefined) mongoUpdates.phone = phone.trim();
        if (address !== undefined) mongoUpdates.address = address.trim();
        if (about !== undefined) mongoUpdates.about = about.trim();
        if (avatarUrl !== undefined) mongoUpdates.avatar = avatarUrl;
        mongoUpdates.profileCompletion = profileCompletion;
        const updatedUser = await User.findOneAndUpdate(
            { keycloakId, companyId: company._id, isDeleted: false },
            { $set: mongoUpdates },
            { new: true }
        );
        logger.info("User profile updated", { keycloakId, profileCompletion });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    keycloakId,
                    name: kcAttributes.name?.[0] ?? null,
                    phone: kcAttributes.phone?.[0] ?? null,
                    address: kcAttributes.address?.[0] ?? null,
                    about: kcAttributes.about?.[0] ?? null,
                    avatar: updatedUser.avatar ?? null,
                    profileCompletion: updatedUser.profileCompletion,
                },
                "Profile Updated",
                "Your profile information has been saved successfully"
            )
        );
    } catch (error) {
        logger.error("updateUserProfile failed", { error: error.message });
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication Service Error", error.message)
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong while updating your profile. Please try again")
        );
    }
};


// Returns the user profile , need to send the keycloack id in params and company id in headers  ----------- Ayan
export const getUserProfile = async (req, res) => {
    try {
        const { keycloakId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const [kcUser, mongoUser] = await Promise.all([
            keycloakService.getUserById(keycloakId),
            User.findOne({ keycloakId, companyId: company._id, isDeleted: false })
                .select("+avatar +profileCompletion +status"),
        ]);
        if (!kcUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No Keycloak user found with the provided keycloakId")
            );
        }
        if (!mongoUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No database user found with the provided keycloakId")
            );
        }
        const role = mongoose.Types.ObjectId.isValid(mongoUser.roleId)
            ? await Role.findById(mongoUser.roleId).select("roleName description isActive").lean()
            : null;
        const attrs = kcUser.attributes || {};
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    keycloakId: kcUser.id,
                    name: attrs.name?.[0] ?? null,
                    email: kcUser.email ?? null,
                    phone: attrs.phone?.[0] ?? null,
                    address: attrs.address?.[0] ?? null,
                    about: attrs.about?.[0] ?? null,
                    avatar: attrs.avatar?.[0] ?? null,
                    companyId: attrs.companyId?.[0] ?? null,
                    role: role
                        ? { roleId: role._id, roleName: role.roleName, isActive: role.isActive }
                        : { roleId: mongoUser.roleId, roleName: mongoUser.roleId, isActive: null },
                    isOwner: attrs.isOwner?.[0] === "true",
                    status: attrs.status?.[0] ?? "Active",
                    profileCompletion: parseInt(attrs.profileCompletion?.[0] ?? "0"),
                    emailVerified: kcUser.emailVerified ?? false,
                    enabled: kcUser.enabled ?? true,
                },
                "User Profile",
                "User profile fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getUserProfile failed", { error: error.message });
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication Service Error", error.message)
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong while fetching the user profile. Please try again")
        );
    }
};


// Change passowrd api. Takes the user keycloak id in params and takes the current password, new password in body.  ------------- Ayan
export const changePassword = async (req, res) => {
    try {
        const { keycloakId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Fields", "currentPassword, newPassword and confirmPassword are all required")
            );
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json(
                new ApiErrors(400, "Password Mismatch", "newPassword and confirmPassword do not match")
            );
        }
        if (newPassword.length < 8) {
            return res.status(400).json(
                new ApiErrors(400, "Weak Password", "New password must be at least 8 characters long")
            );
        }
        if (currentPassword === newPassword) {
            return res.status(400).json(
                new ApiErrors(400, "Same Password", "New password must be different from the current password")
            );
        }
        const mongoUser = await User.findOne({ keycloakId, companyId: company._id, isDeleted: false })
            .select("_id").lean();
        if (!mongoUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No user found with the provided keycloakId")
            );
        }
        try {
            const kcUser = await keycloakService.getUserById(keycloakId);
            await keycloakService.generateToken(kcUser.username, currentPassword);
        } catch {
            return res.status(401).json(
                new ApiErrors(401, "Incorrect Password", "The current password you entered is incorrect")
            );
        }
        await keycloakService.resetPassword(keycloakId, newPassword);
        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        await User.findOneAndUpdate(
            { keycloakId, companyId: company._id, isDeleted: false },
            { $set: { passwordHash: newPasswordHash } }
        );
        logger.info("Password changed successfully", { keycloakId });
        return res.status(200).json(
            new ApiResponse(200, null, "Password Changed", "Your password has been updated successfully. Please log in again with your new password")
        );
    } catch (error) {
        logger.error("changePassword failed", { error: error.message });
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication Service Error", error.message)
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong while changing your password. Please try again")
        );
    }
};


// Returns all the user data with pagination. Also has the search , sort and filter features. fields includes in Search are : name , email and phone number. Fields includes in Filter are : status, is Owner and roles. Fields includes in Sort are : created by , name , email , status and profile completion. ----------- Ayan
export const allUserList = async (req, res) => {
    try {
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { page = 1, limit = 10, search = "", status, roleId, isOwner, sortBy = "createdAt", order = "desc" } = req.query;
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const mongoUsers = await User.find({ companyId: company._id, isDeleted: false })
            .select("keycloakId roleId")
            .lean();
        if (!mongoUsers.length) {
            return res.status(200).json(
                new ApiResponse(200, {
                    users: [],
                    pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNextPage: false, hasPrevPage: false },
                }, "Users Retrieved", "No users found for this company.")
            );
        }
        const roleIdByKcId = {};
        mongoUsers.forEach(u => {
            roleIdByKcId[u.keycloakId] = u.roleId;
        });
        const uniqueRoleIds = [...new Set(
            Object.values(roleIdByKcId).filter(id => id && mongoose.Types.ObjectId.isValid(id))
        )];
        const roles = await Role.find({
            _id: { $in: uniqueRoleIds },
            isDeleted: false,
        }).select("roleName description isActive").lean();
        const roleMap = {};
        roles.forEach(r => {
            roleMap[r._id.toString()] = r;
        });
        const kcResults = await Promise.allSettled(
            mongoUsers.map((u) => keycloakService.getUserById(u.keycloakId))
        );

        let users = kcResults
            .filter((r) => r.status === "fulfilled" && r.value)
            .map((r) => {
                const kc = r.value;
                const attrs = kc.attributes || {};
                const userRoleId = roleIdByKcId[kc.id];
                const role = userRoleId && mongoose.Types.ObjectId.isValid(userRoleId)
                    ? roleMap[userRoleId] ?? null
                    : null;
                return {
                    keycloakId: kc.id,
                    username: kc.username ?? null,
                    email: kc.email ?? null,
                    name: attrs.name?.[0] ?? null,
                    phone: attrs.phone?.[0] ?? null,
                    address: attrs.address?.[0] ?? null,
                    about: attrs.about?.[0] ?? null,
                    avatar: attrs.avatar?.[0] ?? null,
                    companyId: attrs.companyId?.[0] ?? null,
                    role: role
                        ? { roleId: userRoleId, roleName: role.roleName, description: role.description, isActive: role.isActive }
                        : { roleId: userRoleId, roleName: userRoleId, isActive: null },
                    isOwner: attrs.isOwner?.[0] === "true",
                    status: attrs.status?.[0] ?? "Active",
                    profileCompletion: parseInt(attrs.profileCompletion?.[0] ?? "0"),
                    enabled: kc.enabled ?? true,
                    createdAt: kc.createdTimestamp ? new Date(kc.createdTimestamp) : null,
                };
            });

        if (status) {
            users = users.filter((u) => u.status === status);
        }
        if (roleId) {
            users = users.filter((u) => u.role?.roleId === roleId);
        }
        if (isOwner !== undefined && isOwner !== "") {
            users = users.filter((u) => u.isOwner === (isOwner === "true"));
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            users = users.filter(
                (u) =>
                    u.name?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.phone?.toLowerCase().includes(q)
            );
        }
        const allowedSortFields = ["createdAt", "name", "email", "status", "profileCompletion"];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        users.sort((a, b) => {
            const valA = a[safeSortBy] ?? "";
            const valB = b[safeSortBy] ?? "";
            if (valA instanceof Date) return order === "asc" ? valA - valB : valB - valA;
            return order === "asc"
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });
        const total = users.length;
        const totalPages = Math.ceil(total / pageSize);
        const paginated = users.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    users: paginated,
                    pagination: { total, page: pageNumber, limit: pageSize, totalPages, hasNextPage: pageNumber < totalPages, hasPrevPage: pageNumber > 1 },
                },
                "Users Retrieved",
                `Successfully fetched ${paginated.length} users.`
            )
        );
    } catch (error) {
        logger.error("allUserList error", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while fetching users", [], process.env.NODE_ENV === "development" ? error.stack : "")
        );
    }
};


// Change the user status by taking the keycloack id in params ----------------- Ayan
export const changeUserStatus = async (req, res) => {
    const { keycloakId } = req.params;
    const { status, updatedBy } = req.body;
    const companyId = req.headers["x-company-id"];
    try {
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        if (!["Active", "Inactive"].includes(status)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Status", "status must be Active or Inactive")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        if (!company) return res.status(404).json(
            new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
        );
        const mongoUser = await User.findOne({ keycloakId, companyId: company._id, isDeleted: false })
            .select("+status isOwner")
            .lean();
        if (!mongoUser) return res.status(404).json(
            new ApiErrors(404, "User Not Found", "No user found with the provided keycloakId")
        );
        if (mongoUser.isOwner) return res.status(403).json(
            new ApiErrors(403, "Forbidden", "Company owner status cannot be changed")
        );
        if (mongoUser.status === status) return res.status(400).json(
            new ApiErrors(400, "No Change", `User status is already ${status}`)
        );
        await Promise.all([
            keycloakService.updateUser(keycloakId, {
                attributes: { status },
                enabled: status === "Active",
            }),
            User.findOneAndUpdate(
                { keycloakId, companyId: company._id, isDeleted: false },
                { $set: { status, ...(updatedBy && { updatedBy }) } }
            ),
        ]);
        logger.info("User status changed", { keycloakId, status });
        return res.status(200).json(
            new ApiResponse(200, { keycloakId, status }, "Status Updated", `User has been ${status === "Active" ? "activated" : "deactivated"} successfully`)
        );
    } catch (error) {
        logger.error("changeUserStatus failed", { error: error.message });
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication Service Error", error.message)
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong while changing user status")
        );
    }
};


// Returns all assigned projects of an user with pagination  ----------- Ayan
export const getUserAssignedProjects = async (req, res) => {
    try {
        const { keycloakId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const mongoUser = await User.findOne({
            keycloakId,
            companyId: company._id,
            isDeleted: false,
        }).select("_id roleId").lean();
        if (!mongoUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No user found with the provided keycloakId")
            );
        }
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || "";
        const matchStage = {
            companyId: company._id,
            isDeleted: false,
            "assignedUsers.userId": mongoUser._id,
            ...(search && {
                $or: [
                    { projectName: { $regex: search, $options: "i" } },
                    { projectCode: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            }),
        };
        const [total, projects] = await Promise.all([
            Project.countDocuments(matchStage),
            Project.find(matchStage)
                .select("projectName projectCode description coverImage status healthStatus completionPercent assignedUsers startDate endDate")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const role = mongoose.Types.ObjectId.isValid(mongoUser.roleId)
            ? await Role.findOne({ _id: mongoUser.roleId, isDeleted: false }).select("roleName").lean()
            : null;
        const result = projects.map((project) => {
            const assignment = project.assignedUsers.find(
                (u) => u.userId.toString() === mongoUser._id.toString()
            );
            return {
                projectId: project._id,
                projectName: project.projectName,
                projectCode: project.projectCode ?? null,
                description: project.description ?? null,
                coverImage: project.coverImage ?? null,
                status: project.status,
                healthStatus: project.healthStatus,
                completionPercent: project.completionPercent,
                startDate: project.startDate,
                endDate: project.endDate,
                assignedAs: role?.roleName ?? null,
                assignedAt: assignment?.assignedAt ?? null,
            };
        });
        const totalPages = Math.ceil(total / limit);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    projects: result, pagination: {
                        total,
                        page,
                        limit,
                        totalPages,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1,
                    },
                },
                "Assigned Projects",
                `Fetched ${result.length} assigned project(s) for user`
            )
        );
    } catch (error) {
        logger.error("getUserAssignedProjects failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong while fetching assigned projects. Please try again")
        );
    }
};


// Takes the user keycloak id and perform hard delete from the keycloak and mongo db . -------------- Ayan
export const deleteUser = async (req, res) => {
    try {
        const { keycloakId } = req.params;
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false }).select("_id").lean();
        console.log("company found:", company);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const mongoUser = await User.findOne({
            keycloakId,
            companyId: company._id,
            isDeleted: false,
        }).select("_id isOwner").lean();

        console.log("keycloakId from params:", keycloakId);
        console.log("company._id:", company._id);
        console.log("mongoUser result:", mongoUser);

        // Also run a relaxed query to debug
        const userWithoutCompany = await User.findOne({ keycloakId }).lean();
        console.log("user ignoring companyId:", userWithoutCompany);
        if (!mongoUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", "No user found with the provided keycloakId")
            );
        }
        if (mongoUser.isOwner) {
            return res.status(403).json(
                new ApiErrors(403, "Forbidden", "Company owner cannot be deleted")
            );
        }
        await Project.updateMany(
            { companyId: company._id, "assignedUsers.userId": mongoUser._id },
            { $pull: { assignedUsers: { userId: mongoUser._id } } }
        );
        await Promise.all([
            User.findOneAndDelete({ keycloakId, companyId: company._id }),
            keycloakService.deleteUser(keycloakId),
        ]);
        logger.info("User hard deleted", { keycloakId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { keycloakId }, "User Deleted", "User has been permanently deleted")
        );
    } catch (error) {
        logger.error("deleteUser failed", { error: error.message });
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication Service Error", error.message)
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong while deleting the user. Please try again")
        );
    }
};