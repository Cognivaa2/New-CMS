import mongoose from "mongoose";
import MaterialMaster from "../models/materialMaster.models.js";
import Company from "../models/company.models.js";
import Inventory from "../models/inventory.models.js";
import User from "../models/user.models.js";
import logger from "../utils/logger.utils.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrors from "../utils/ApiErrors.js";
import { enrichUser } from "../helpers/mrHelper.js";



const resolveCompany = async (companyUUID) => {
    return await Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
};

const resolveUser = async (keycloakId, companyObjectId) => {
    return await User.findOne({
        keycloakId: keycloakId.trim(),
        companyId: companyObjectId,
        isDeleted: false,
    }).lean();
};

// 1. Create Material ─────────────────────────────────────────────────────────── @Sundar
export const createMaterial = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const { name, category, unit, description, sacNumber, createdBy } = req.body;
        const missing = [];
        if (!name?.trim()) missing.push("name");
        if (!unit?.trim()) missing.push("unit");
        if (!createdBy?.trim()) missing.push("createdBy");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", [`The following fields are required: ${missing.join(", ")}`], missing)
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Invalid x-company-id header"])
            );
        }
        const creatorUser = await resolveUser(createdBy, company._id);
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", [`No active user found with keycloakId: ${createdBy}`])
            );
        }
        const material = await MaterialMaster.create({
            companyId: company._id,
            name: name.trim(),
            sacNumber: sacNumber?.trim() || null,
            category: category?.trim() || null,
            unit: unit.trim(),
            description: description?.trim() || null,
            createdBy: creatorUser._id,
            updatedBy: creatorUser._id,
        });
        logger.info("Material created successfully", {
            materialId: material._id,
            createdBy: creatorUser._id,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    materialId: material._id,
                    name: material.name,
                    category: material.category,
                    unit: material.unit,
                    sacNumber: material.sacNumber,
                    description: material.description,
                    isActive: material.isActive,
                    createdBy: material.createdBy,
                    createdAt: material.createdAt,
                },
                "Material Created",
                `Material "${material.name}" created successfully`
            )
        );
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Material", ["A material with this name already exists for your company."])
            );
        }
        logger.error("createMaterial failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// 2. Get All Materials (List + Search + Pagination + Filter + Sort) ──────────── @Sundar
export const getAllMaterials = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Invalid x-company-id header"])
            );
        }
        const {
            search = "",
            category = "",
            isActive,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        if (isNaN(pageNum)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid page number", ["page must be a positive number"])
            );
        }
        if (isNaN(limitNum)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid limit", ["limit must be between 1 and 100"])
            );
        }
        const skip = (pageNum - 1) * limitNum;
        const filter = { companyId: company._id, isDeleted: false };
        if (search.trim()) {
            filter.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { description: { $regex: search.trim(), $options: "i" } },
                { category: { $regex: search.trim(), $options: "i" } },
            ];
        }
        if (category.trim()) {
            filter.category = { $regex: category.trim(), $options: "i" };
        }
        if (isActive !== undefined && isActive !== "") {
            filter.isActive = isActive === "true";
        }
        const allowedSortFields = ["name", "category", "unit", "createdAt", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortDir = sortOrder === "asc" ? 1 : -1;
        const [materials, total] = await Promise.all([
            MaterialMaster.find(filter)
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            MaterialMaster.countDocuments(filter),
        ]);
        const enrichedMaterials = await Promise.all(
            materials.map(async (mat) => {
                const [createdBy, updatedBy] = await Promise.all([
                    enrichUser(mat.createdBy),
                    enrichUser(mat.updatedBy),
                ]);

                return {
                    ...mat,
                    createdBy,
                    updatedBy,
                };
            })
        );
        logger.info("Materials fetched successfully", {
            total,
            page: pageNum,
            companyId: companyUUID,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    materials: enrichedMaterials,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                        hasNext: pageNum < Math.ceil(total / limitNum),
                        hasPrev: pageNum > 1,
                    },
                },
                total > 0 ? "Materials fetched successfully" : "No materials found"
            )
        );
    } catch (error) {
        logger.error("getAllMaterials failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// 3. Get All Materials — Lookup / Dropdown (lightweight list) ────────────────── @Sundar
export const getMaterialsLookup = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Invalid x-company-id header"])
            );
        }
        const { search = "" } = req.query;
        const filter = { companyId: company._id, isDeleted: false, isActive: true };
        if (search.trim()) {
            filter.name = { $regex: search.trim(), $options: "i" };
        }
        const materials = await MaterialMaster.find(filter)
            .select("_id name unit category sacNumber")
            .sort({ name: 1 })
            .limit(200)
            .lean();
        logger.info("Materials lookup fetched", {
            count: materials.length,
            companyId: companyUUID,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                { materials },
                materials.length > 0 ? "Materials lookup fetched successfully" : "No active materials found"
            )
        );
    } catch (error) {
        logger.error("getMaterialsLookup failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// 4. Get Single Material ─────────────────────────────────────────────────────── @Sundar
export const getMaterialById = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const { materialId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Material ID", ["materialId must be a valid MongoDB ObjectId"])
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Invalid x-company-id header"])
            );
        }
        const material = await MaterialMaster.findOne({
            _id: materialId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!material) {
            return res.status(404).json(
                new ApiErrors(404, "Material Not Found", ["No material found with the given ID for this company"])
            );
        }
        logger.info("Material fetched successfully", { materialId });
        return res.status(200).json(
            new ApiResponse(
                200,
                { material },
                "Material fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getMaterialById failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// 5. Edit Material ───────────────────────────────────────────────────────────── @Sundar
export const editMaterial = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const { materialId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Material ID", ["materialId must be a valid MongoDB ObjectId"])
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Invalid x-company-id header"])
            );
        }
        const material = await MaterialMaster.findOne({
            _id: materialId,
            companyId: company._id,
            isDeleted: false,
        }).lean();

        if (!material) {
            return res.status(404).json(
                new ApiErrors(404, "Material Not Found", ["No material found with the given ID for this company"])
            );
        }
        const { name, category, unit, description, updatedBy, sacNumber } = req.body;
        const allowedFields = ["name", "category", "unit", "description", "sacNumber"];
        const provided = allowedFields.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", ["Send at least one field to update"])
            );
        }
        const errors = [];
        const updates = {};
        if (name !== undefined) {
            if (!name.trim()) {
                errors.push("name cannot be empty");
            } else {
                const duplicate = await MaterialMaster.findOne({
                    companyId: company._id,
                    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
                    isDeleted: false,
                    _id: { $ne: material._id },
                }).lean();
                if (duplicate) {
                    errors.push(`Material name "${name.trim()}" already exists for this company`);
                } else {
                    updates.name = name.trim();
                }
            }
        }
        if (category !== undefined) {
            updates.category = category === null || category === "" ? null : category.trim();
        }
        if (unit !== undefined) {
            if (!unit.trim()) {
                errors.push("unit cannot be empty");
            } else {
                updates.unit = unit.trim();
            }
        }
        if (description !== undefined) {
            updates.description = description === null || description === "" ? null : description.trim();
        }
        if (sacNumber !== undefined) {
            updates.sacNumber = sacNumber === null || sacNumber === "" ? null : sacNumber.trim();
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", errors)
            );
        }
        if (updatedBy?.trim()) {
            const updaterUser = await resolveUser(updatedBy, company._id);
            if (!updaterUser) {
                return res.status(404).json(
                    new ApiErrors(404, "User Not Found", [`No active user found with keycloakId: ${updatedBy}`])
                );
            }
            updates.updatedBy = updaterUser._id;
        }
        const updated = await MaterialMaster.findByIdAndUpdate(
            material._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        logger.info("Material updated successfully", {
            materialId: material._id,
            updatedFields: Object.keys(updates),
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    materialId: updated._id,
                    name: updated.name,
                    category: updated.category,
                    unit: updated.unit,
                    sacNumber: updated.sacNumber,
                    description: updated.description,
                    isActive: updated.isActive,
                    updatedAt: updated.updatedAt,
                },
                "Material updated successfully"
            )
        );
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Material", ["A material with this name already exists for your company."])
            );
        }
        logger.error("editMaterial failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// 6. Toggle Active Status ────────────────────────────────────────────────────── @Sundar
export const toggleMaterialStatus = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", ["x-company-id header is required"])
            );
        }
        const { materialId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Material ID", ["materialId must be a valid MongoDB ObjectId"])
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", ["Invalid x-company-id header"])
            );
        }
        const material = await MaterialMaster.findOne({
            _id: materialId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!material) {
            return res.status(404).json(
                new ApiErrors(404, "Material Not Found", ["No material found with the given ID for this company"])
            );
        }
        const { updatedBy } = req.body;
        const updates = { isActive: !material.isActive };
        if (updatedBy?.trim()) {
            const updaterUser = await resolveUser(updatedBy, company._id);
            if (!updaterUser) {
                return res.status(404).json(
                    new ApiErrors(404, "User Not Found", [`No active user found with keycloakId: ${updatedBy}`])
                );
            }
            updates.updatedBy = updaterUser._id;
        }
        const updated = await MaterialMaster.findByIdAndUpdate(
            material._id,
            { $set: updates },
            { new: true }
        ).lean();
        logger.info("Material status toggled", {
            materialId: material._id,
            isActive: updated.isActive,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    materialId: updated._id,
                    name: updated.name,
                    isActive: updated.isActive,
                    updatedAt: updated.updatedAt,
                },
                `Material "${updated.name}" is now ${updated.isActive ? "active" : "inactive"}`
            )
        );
    } catch (error) {
        logger.error("toggleMaterialStatus failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// 7. Delete Material (Soft Delete by default, Hard Delete if ?hard=true) ─────── @Sundar
export const deleteMaterial = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", [
                    "x-company-id header is required",
                ])
            );
        }
        const { materialId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Material ID", [
                    "materialId must be a valid MongoDB ObjectId",
                ])
            );
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", [
                    "Invalid x-company-id header",
                ])
            );
        }
        const material = await MaterialMaster.findOne({
            _id: materialId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!material) {
            return res.status(404).json(
                new ApiErrors(404, "Material Not Found", [
                    "No material found with the given ID for this company",
                ])
            );
        }
        const activeInventory = await Inventory.findOne({
            materialMasterId: material._id,
            companyId: company._id,
            isDeleted: false,
            currentStock: { $gt: 0 },
        }).lean();
        if (activeInventory) {
            return res.status(400).json(
                new ApiErrors(400, "Material In Use", [
                    `"${material.name}" has active stock in one or more project inventories. Deplete or remove all stock before deleting this material.`,
                ])
            );
        }
        const anyInventoryEntry = await Inventory.findOne({
            materialMasterId: material._id,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (anyInventoryEntry) {
            return res.status(400).json(
                new ApiErrors(400, "Material Allocated to Projects", [
                    `"${material.name}" is allocated to one or more project inventories. Remove it from all project inventories before deleting.`,
                ])
            );
        }
        const { updatedBy } = req.body;
        const softUpdates = {
            isDeleted: true,
            deletedAt: new Date(),
        };
        if (updatedBy?.trim()) {
            const updaterUser = await User.findOne({
                keycloakId: updatedBy.trim(),
                companyId: company._id,
                isDeleted: false,
            }).lean();
            if (!updaterUser) {
                return res.status(404).json(
                    new ApiErrors(404, "User Not Found", [
                        `No active user found with keycloakId: ${updatedBy}`,
                    ])
                );
            }
            softUpdates.updatedBy = updaterUser._id;
        }
        await MaterialMaster.findByIdAndUpdate(material._id, {
            $set: softUpdates,
        });
        logger.info("Material soft-deleted successfully", {
            materialId: material._id,
            name: material.name,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    materialId: material._id,
                    name: material.name,
                    deletedAt: softUpdates.deletedAt.toISOString(),
                },
                `Material "${material.name}" deleted successfully`
            )
        );
    } catch (error) {
        logger.error("deleteMaterial failed", {
            error: error.message,
        });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [
                error.message,
            ])
        );
    }
};