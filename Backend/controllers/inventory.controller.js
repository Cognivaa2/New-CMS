import mongoose from "mongoose";
import Inventory from "../models/inventory.models.js";
import MaterialMaster from "../models/materialMaster.models.js";
import Project from "../models/project.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import NotificationService from "../services/notification.service.js";
import { enrichUser } from "../helpers/mrHelper.js";


export const resolveCompany = async (companyUUID) => {
    return await Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
};

const computeStockStatus = (currentStock, minimumLevel) => {
    if (currentStock <= 0) return "Critical";
    if (currentStock <= minimumLevel) return "Low";
    if (currentStock <= minimumLevel * 1.5) return "Good";
    return "Excellent";
};

const formatInventoryItem = (item) => ({
    inventoryId: item._id,
    projectId: item.projectId,
    companyId: item.companyId,
    materialMasterId: item.materialMasterId,
    name: item.name,
    unit: item.unit,
    category: item.category,
    currentStock: item.currentStock,
    minimumLevel: item.minimumLevel,
    pricePerUnit: item.pricePerUnit,
    supplierName: item.supplierName,
    stockStatus: computeStockStatus(item.currentStock, item.minimumLevel),
    totalConsumed: item.totalConsumed,
    totalReceived: item.totalReceived,
    lastRestockedAt: item.lastRestockedAt,
    createdBy: item.createdBy,
    updatedBy: item.updatedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
});

// This function adds a new material to project inventory. takes x-company-id in headers, projectId in params and materialMasterId, minimumLevel, pricePerUnit, supplierName, initialStock, createdBy in body. validates company, project, material and prevents duplicate entries. -------------------------- Ayan
export const addMaterialToInventory = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        const { materialMasterId, minimumLevel, pricePerUnit, supplierName, initialStock, createdBy } = req.body;
        const missing = [];
        if (!materialMasterId || !materialMasterId.trim()) missing.push("materialMasterId");
        if (!createdBy || !createdBy.trim()) missing.push("createdBy");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        if (!mongoose.Types.ObjectId.isValid(materialMasterId.trim())) {
            return res.status(400).json(new ApiErrors(400, "Invalid materialMasterId", "materialMasterId must be a valid MongoDB ObjectId"));
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const companyObjectId = company._id;
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
            );
        }
        const materialMaster = await MaterialMaster.findOne({
            _id: new mongoose.Types.ObjectId(materialMasterId.trim()),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!materialMaster) {
            return res.status(404).json(
                new ApiErrors(404, "Material Not Found", "No active material found with the provided materialMasterId in your company")
            );
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
        const errors = [];
        const parsedInitialStock = initialStock !== undefined ? Number(initialStock) : 0;
        const parsedMinimumLevel = minimumLevel !== undefined ? Number(minimumLevel) : 0;
        const parsedPricePerUnit = pricePerUnit !== undefined ? Number(pricePerUnit) : 0;
        if (isNaN(parsedInitialStock) || parsedInitialStock < 0)
            errors.push("initialStock must be a non-negative number");
        if (isNaN(parsedMinimumLevel) || parsedMinimumLevel < 0)
            errors.push("minimumLevel must be a non-negative number");
        if (isNaN(parsedPricePerUnit) || parsedPricePerUnit < 0)
            errors.push("pricePerUnit must be a non-negative number");
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", errors)
            );
        }
        const existing = await Inventory.findOne({
            companyId: companyObjectId,
            projectId: new mongoose.Types.ObjectId(projectId),
            materialMasterId: new mongoose.Types.ObjectId(materialMasterId.trim()),
            isDeleted: false,
        }).lean();
        if (existing) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Material", `Material "${materialMaster.name}" already exists in this project's inventory`)
            );
        }
        const inventoryItem = await Inventory.create({
            companyId: companyObjectId,
            projectId: new mongoose.Types.ObjectId(projectId),
            materialMasterId: new mongoose.Types.ObjectId(materialMasterId.trim()),
            name: materialMaster.name,
            unit: materialMaster.unit,
            category: materialMaster.category || null,
            currentStock: parsedInitialStock,
            minimumLevel: parsedMinimumLevel,
            pricePerUnit: parsedPricePerUnit,
            supplierName: supplierName?.trim() || null,
            totalReceived: parsedInitialStock,
            createdBy: creatorUser._id,
        });
        NotificationService.notifyInventoryAdded({
            companyId: companyObjectId,
            projectId: project._id,
            projectName: project.projectName,
            materialName: materialMaster.name,
            triggeredBy: creatorUser._id,
            inventoryId: inventoryItem._id,
        }).catch(err => logger.error("notifyInventoryAdded (addMaterial) failed (non-fatal)", { error: err.message }));
        if (parsedInitialStock <= parsedMinimumLevel && parsedMinimumLevel > 0) {
            NotificationService.notifyLowStock({
                companyId: companyObjectId,
                projectId: project._id,
                projectName: project.projectName,
                item: inventoryItem,
            }).catch(err => logger.error("notifyLowStock (addMaterial) failed (non-fatal)", { error: err.message }));
        }

        logger.info("Material added to project inventory", {
            inventoryId: inventoryItem._id,
            projectId,
            materialMasterId: materialMasterId.trim(),
            createdBy: creatorUser._id,
        });
        return res.status(201).json(
            new ApiResponse(201, formatInventoryItem(inventoryItem), "Material Added to Inventory",
                `"${inventoryItem.name}" has been added to the project inventory`
            )
        );
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Material", "This material already exists in this project's inventory")
            );
        }
        logger.error("addMaterialToInventory failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to add material to inventory. Please try again later.", [error.message])
        );
    }
};

// This function returns all inventory items for a project. takes x-company-id in headers and projectId in params. supports pagination, search (name, category, supplierName), stockStatus filter and sorting (name, category, stock, price, dates). -------------------------- Ayan
export const getAllInventory = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
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
        const companyObjectId = company._id;
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: companyObjectId,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            stockStatus,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(new ApiErrors(400, "Invalid Page Number", "Page must be a positive number"));
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Limit", "Limit must be between 1 and 100")
            );
        }
        const filter = {
            companyId: companyObjectId,
            projectId: new mongoose.Types.ObjectId(projectId),
            isDeleted: false,
        };
        if (search && search.trim()) {
            filter.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { category: { $regex: search.trim(), $options: "i" } },
                { supplierName: { $regex: search.trim(), $options: "i" } },
            ];
        }
        if (stockStatus) {
            const validStatuses = ["Critical", "Low", "Good", "Excellent"];
            if (!validStatuses.includes(stockStatus)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid stockStatus", `Valid values: ${validStatuses.join(", ")}`)
                );
            }
            switch (stockStatus) {
                case "Critical":
                    filter.currentStock = { $lte: 0 };
                    break;
                case "Low":
                    filter.$expr = {
                        $and: [
                            { $gt: ["$currentStock", 0] },
                            { $lte: ["$currentStock", "$minimumLevel"] },
                        ],
                    };
                    break;
                case "Good":
                    filter.$expr = {
                        $and: [
                            { $gt: ["$currentStock", "$minimumLevel"] },
                            { $lte: ["$currentStock", { $multiply: ["$minimumLevel", 1.5] }] },
                        ],
                    };
                    break;
                case "Excellent":
                    filter.$expr = {
                        $gt: ["$currentStock", { $multiply: ["$minimumLevel", 1.5] }],
                    };
                    break;
            }
        }
        const allowedSortFields = ["name", "category", "currentStock", "minimumLevel", "pricePerUnit", "createdAt", "updatedAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const [items, total] = await Promise.all([
            Inventory.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Inventory.countDocuments(filter),
        ]);
        const formatted = items.map(formatInventoryItem);
        logger.info("Inventory fetched successfully", {
            projectId,
            total,
            page: pageNumber,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    inventory: formatted,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Inventory Retrieved",
                total > 0 ? `Successfully fetched ${items.length} inventory items` : "No inventory items found for this project"
            )
        );
    } catch (error) {
        logger.error("getAllInventory failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch inventory. Please try again later.", [error.message])
        );
    }
};

// This function returns inventory lookup data for quick selection. takes x-company-id in headers and projectId in params. supports search by name and optional inStock filter, returning minimal material details with stock status. -------------------------- Ayan
export const getInventoryLookup = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const { search = "", inStock } = req.query;
        const filter = {
            companyId: company._id,
            projectId: new mongoose.Types.ObjectId(projectId),
            isDeleted: false,
        };
        if (search.trim()) {
            filter.name = { $regex: search.trim(), $options: "i" };
        }
        if (inStock === "true") {
            filter.currentStock = { $gt: 0 };
        }
        const items = await Inventory.find(filter)
            .select("_id materialMasterId name unit category currentStock minimumLevel pricePerUnit")
            .sort({ name: 1 })
            .lean();
        const formatted = items.map((item) => ({
            inventoryId: item._id,
            materialMasterId: item.materialMasterId,
            name: item.name,
            unit: item.unit,
            category: item.category,
            currentStock: item.currentStock,
            stockStatus: computeStockStatus(item.currentStock, item.minimumLevel),
            pricePerUnit: item.pricePerUnit,
        }));
        logger.info("Inventory lookup fetched", {
            projectId,
            count: formatted.length,
            inStock: inStock === "true",
        });
        return res.status(200).json(
            new ApiResponse(200,
                { materials: formatted, total: formatted.length },
                "Inventory Lookup Retrieved",
                `Fetched ${formatted.length} materials`
            )
        );
    } catch (error) {
        logger.error("getInventoryLookup failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch inventory lookup. Please try again later.", [error.message])
        );
    }
};

// This function fetches details of a single inventory item. takes x-company-id in headers, projectId and inventoryId in params and returns complete inventory information with computed stock status. -------------------------- Ayan
export const getSingleInventoryItem = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId, inventoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inventory ID", "inventoryId must be a valid MongoDB ObjectId")
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
        const item = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(inventoryId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!item) {
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", `No active inventory item found with ID: ${inventoryId} under project: ${projectId}`)
            );
        }
        logger.info("Inventory item fetched successfully", { inventoryId, projectId });
        return res.status(200).json(
            new ApiResponse(200, formatInventoryItem(item), "Inventory Item Retrieved", `Inventory details for "${item.name}" fetched successfully`)
        );
    } catch (error) {
        logger.error("getSingleInventoryItem failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch inventory item. Please try again later.", [error.message])
        );
    }
};

// This function updates inventory item details. takes x-company-id in headers, projectId and inventoryId in params and allows updating minimumLevel, pricePerUnit and supplierName with validation. -------------------------- Ayan
export const editInventoryItem = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId, inventoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Inventory ID", "inventoryId must be a valid MongoDB ObjectId"));
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
        const existingItem = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(inventoryId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!existingItem) {
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", `No active inventory item found with ID: ${inventoryId} under project: ${projectId}`)
            );
        }
        const { minimumLevel, pricePerUnit, supplierName } = req.body;
        const allowedFields = ["minimumLevel", "pricePerUnit", "supplierName"];
        const provided = allowedFields.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Fields Provided", `Provide at least one field to update: ${allowedFields.join(", ")}`, allowedFields)
            );
        }
        const updateData = {};
        const errors = [];
        if (minimumLevel !== undefined) {
            const val = Number(minimumLevel);
            if (isNaN(val) || val < 0) {
                errors.push("minimumLevel must be a non-negative number");
            } else {
                updateData.minimumLevel = val;
            }
        }
        if (pricePerUnit !== undefined) {
            const val = Number(pricePerUnit);
            if (isNaN(val) || val < 0) {
                errors.push("pricePerUnit must be a non-negative number");
            } else {
                updateData.pricePerUnit = val;
            }
        }
        if (supplierName !== undefined) {
            updateData.supplierName = supplierName === null || supplierName === ""
                ? null
                : supplierName.trim();
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", errors)
            );
        }
        const updatedBy = req.user?._id ?? null;
        if (updatedBy) {
            updateData.updatedBy = new mongoose.Types.ObjectId(updatedBy);
        }
        const updated = await Inventory.findByIdAndUpdate(
            inventoryId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!updated) {
            return res.status(500).json(new ApiErrors(500, "Update Failed", "Inventory item update failed unexpectedly"));
        }
        logger.info("Inventory item updated successfully", {
            inventoryId: updated._id,
            projectId,
            updatedFields: Object.keys(updateData),
        });
        return res.status(200).json(
            new ApiResponse(200, formatInventoryItem(updated), "Inventory Item Updated", `"${updated.name}" has been updated successfully`)
        );
    } catch (error) {
        logger.error("editInventoryItem failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to update inventory item. Please try again later.", [error.message])
        );
    }
};

// This function checks stock availability for a material. takes x-company-id in headers, projectId in params and materialMasterId with requiredQuantity in query. returns availability status, shortage and stock condition. -------------------------- Ayan
export const checkStockAvailability = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
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
        const { materialMasterId, requiredQuantity } = req.query;
        const missing = [];
        if (!materialMasterId || !materialMasterId.trim()) missing.push("materialMasterId");
        if (requiredQuantity === undefined || requiredQuantity === "") missing.push("requiredQuantity");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Query Params", `Required query params: ${missing.join(", ")}`, missing)
            );
        }
        if (!mongoose.Types.ObjectId.isValid(materialMasterId.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid materialMasterId", "materialMasterId must be a valid MongoDB ObjectId")
            );
        }
        const parsedRequired = Number(requiredQuantity);
        if (isNaN(parsedRequired) || parsedRequired <= 0) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid requiredQuantity", "requiredQuantity must be a positive number")
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
        const item = await Inventory.findOne({
            companyId: company._id,
            projectId: new mongoose.Types.ObjectId(projectId),
            materialMasterId: new mongoose.Types.ObjectId(materialMasterId.trim()),
            isDeleted: false,
        })
            .select("name unit currentStock minimumLevel")
            .lean();
        if (!item) {
            return res.status(404).json(
                new ApiErrors(404, "Material Not in Inventory", "This material has not been added to this project's inventory")
            );
        }
        const isAvailable = item.currentStock >= parsedRequired;
        const shortage = isAvailable ? 0 : parsedRequired - item.currentStock;
        logger.info("Stock availability checked", {
            projectId,
            materialMasterId: materialMasterId.trim(),
            required: parsedRequired,
            available: item.currentStock,
            isAvailable,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    materialName: item.name,
                    unit: item.unit,
                    currentStock: item.currentStock,
                    requiredQuantity: parsedRequired,
                    isAvailable,
                    shortage,
                    stockStatus: computeStockStatus(item.currentStock, item.minimumLevel),
                },
                "Stock Availability Checked",
                isAvailable ? `Sufficient stock available for "${item.name}"` : `Insufficient stock for "${item.name}". Shortage: ${shortage} ${item.unit}`
            )
        );
    } catch (error) {
        logger.error("checkStockAvailability failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to check stock availability. Please try again later.", [error.message])
        );
    }
};

// This function performs stock adjustment for an inventory item. takes x-company-id in headers, projectId and inventoryId in params and adjustmentType (add/subtract), quantity, reason, remarks in body. updates stock with validation and logs adjustment. -------------------------- Ayan
export const stockAdjustment = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId, inventoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Inventory ID", "inventoryId must be a valid MongoDB ObjectId"));
        }
        const { adjustmentType, quantity, reason, remarks } = req.body;
        const missing = [];
        if (!adjustmentType || !adjustmentType.trim()) missing.push("adjustmentType");
        if (quantity === undefined || quantity === null || quantity === "") missing.push("quantity");
        if (!reason || !reason.trim()) missing.push("reason");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        const validTypes = ["add", "subtract"];
        if (!validTypes.includes(adjustmentType.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid adjustmentType", `adjustmentType must be one of: ${validTypes.join(", ")}`)
            );
        }
        const validReasons = ["Damage", "Wastage", "Correction", "OpeningBalance", "Other"];
        if (!validReasons.includes(reason.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Reason", `reason must be one of: ${validReasons.join(", ")}`)
            );
        }
        const parsedQty = Number(quantity);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Quantity", "quantity must be a positive number")
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
        const companyObjectId = company._id;
        const item = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(inventoryId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!item) {
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", `No active inventory item found with ID: ${inventoryId} under project: ${projectId}`)
            );
        }
        if (adjustmentType === "subtract" && item.currentStock < parsedQty) {
            return res.status(400).json(
                new ApiErrors(400,
                    "Insufficient Stock",
                    `Cannot subtract ${parsedQty} ${item.unit}. Current stock is only ${item.currentStock} ${item.unit}`
                )
            );
        }
        const stockDelta = adjustmentType === "add" ? parsedQty : -parsedQty;
        const updatedBy = req.user?._id ?? null;
        const updated = await Inventory.findByIdAndUpdate(
            inventoryId,
            {
                $inc: { currentStock: stockDelta },
                $set: {
                    ...(updatedBy ? { updatedBy: new mongoose.Types.ObjectId(updatedBy) } : {}),
                },
            },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted -deletedAt")
            .lean();
        logger.info("Stock adjusted successfully", {
            inventoryId,
            projectId,
            adjustmentType,
            quantity: parsedQty,
            reason,
            previousStock: item.currentStock,
            newStock: updated.currentStock,
        });
        if (adjustmentType === "add") {
            const projForNotif = await Project.findById(item.projectId).select("projectName").lean();
            NotificationService.notifyInventoryAdded({
                companyId: companyObjectId,
                projectId: item.projectId,
                projectName: projForNotif?.projectName || "",
                materialName: item.name,
                triggeredBy: updatedBy,
                inventoryId: item._id,
            }).catch(err => logger.error("notifyInventoryAdded (stockAdjustment) failed (non-fatal)", { error: err.message }));
        }

        if (updated.currentStock <= updated.minimumLevel && updated.minimumLevel > 0) {
            const projForNotif = await Project.findById(item.projectId).select("projectName").lean();
            NotificationService.notifyLowStock({
                companyId: companyObjectId,
                projectId: item.projectId,
                projectName: projForNotif?.projectName || "",
                item: updated,
            }).catch(err => logger.error("notifyLowStock (stockAdjustment) failed (non-fatal)", { error: err.message }));
        }
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    ...formatInventoryItem(updated),
                    adjustment: {
                        type: adjustmentType,
                        quantity: parsedQty,
                        reason,
                        remarks: remarks?.trim() || null,
                        previousStock: item.currentStock,
                        newStock: updated.currentStock,
                    },
                },
                "Stock Adjusted",
                `Stock for "${item.name}" has been ${adjustmentType === "add" ? "increased" : "decreased"} by ${parsedQty} ${item.unit}`
            )
        );
    } catch (error) {
        logger.error("stockAdjustment failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to adjust stock. Please try again later.", [error.message])
        );
    }
};

// This function soft deletes an inventory item. takes x-company-id in headers, projectId and inventoryId in params. prevents deletion if stock exists and marks item as deleted. -------------------------- Ayan
export const deleteInventoryItem = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId, inventoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Inventory ID", "inventoryId must be a valid MongoDB ObjectId")
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
        const item = await Inventory.findOne({
            _id: new mongoose.Types.ObjectId(inventoryId),
            projectId: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!item) {
            return res.status(404).json(
                new ApiErrors(404, "Inventory Item Not Found", `No active inventory item found with ID: ${inventoryId} under project: ${projectId}`)
            );
        }
        if (item.currentStock > 0) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Cannot Delete Item With Stock",
                    `"${item.name}" has ${item.currentStock} ${item.unit} remaining. Adjust stock to 0 before deleting.`
                )
            );
        }
        const deletedBy = req.user?._id ?? null;
        await Inventory.findByIdAndUpdate(inventoryId, {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                ...(deletedBy ? { updatedBy: new mongoose.Types.ObjectId(deletedBy) } : {}),
            },
        });
        logger.info("Inventory item soft-deleted successfully", {
            inventoryId: item._id,
            name: item.name,
            projectId,
        });
        return res.status(200).json(
            new ApiResponse(200,
                {
                    inventoryId: item._id,
                    name: item.name,
                    deletedAt: new Date().toISOString(),
                },
                "Inventory Item Deleted",
                `"${item.name}" has been removed from the project inventory`
            )
        );
    } catch (error) {
        logger.error("deleteInventoryItem failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to delete inventory item. Please try again later.", [error.message])
        );
    }
};

// This function returns low stock alerts for a project. takes x-company-id in headers, projectId in params and optional statusFilter (Critical, Low, all) in query. returns items with low or critical stock levels. -------------------------- Ayan
export const getLowStockAlerts = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID || !companyUUID.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Project ID", "projectId must be a valid MongoDB ObjectId"));
        }
        const { statusFilter = "all" } = req.query;
        const validFilters = ["Critical", "Low", "all"];
        if (!validFilters.includes(statusFilter)) {
            return res.status(400).json(new ApiErrors(400, "Invalid statusFilter", `Valid values: ${validFilters.join(", ")}`));
        }
        const company = await Company.findOne({
            companyId: companyUUID.trim(),
            isDeleted: false,
        }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id"));
        }
        const project = await Project.findOne({
            _id: new mongoose.Types.ObjectId(projectId),
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", `No active project found with ID: ${projectId}`)
            );
        }
        const baseFilter = {
            companyId: company._id,
            projectId: new mongoose.Types.ObjectId(projectId),
            isDeleted: false,
        };
        let stockFilter;
        if (statusFilter === "Critical") {
            stockFilter = { currentStock: { $lte: 0 } };
        } else if (statusFilter === "Low") {
            stockFilter = {
                $expr: {
                    $and: [
                        { $gt: ["$currentStock", 0] },
                        { $lte: ["$currentStock", "$minimumLevel"] },
                    ],
                },
            };
        } else {
            stockFilter = {
                $expr: { $lte: ["$currentStock", "$minimumLevel"] },
            };
        }
        const items = await Inventory.find({ ...baseFilter, ...stockFilter })
            .select("-__v -isDeleted -deletedAt")
            .sort({ currentStock: 1 })
            .lean();

        const formatted = items.map(formatInventoryItem);

        logger.info("Low stock alerts fetched", {
            projectId,
            statusFilter,
            count: items.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    alerts: formatted,
                    total: formatted.length,
                    projectId,
                    projectName: project.projectName,
                },
                "Low Stock Alerts Retrieved",
                formatted.length > 0
                    ? `${formatted.length} item(s) require attention`
                    : "All inventory items are sufficiently stocked"
            )
        );
    } catch (error) {
        logger.error("getLowStockAlerts failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch low stock alerts. Please try again later.", [error.message])
        );
    }
};

// This function returns aggregated inventory KPI summary across all projects for a company. takes x-company-id in headers. provides total items, stock status breakdown, total stock value, low/critical item counts and active project count. -------------------------- Ayan
export const getGlobalInventorySummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const activeProjectDocs = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjectDocs.map((p) => p._id);
        const [agg] = await Inventory.aggregate([
            { $match: { companyId, isDeleted: false, projectId: { $in: activeProjectIds } } },
            {
                $facet: {
                    totalItems: [
                        { $count: "count" }
                    ],
                    activeProjects: [
                        { $group: { _id: "$projectId" } },
                        { $count: "count" }
                    ],
                    totalStockValue: [
                        {
                            $group: {
                                _id: null,
                                value: {
                                    $sum: { $multiply: ["$currentStock", "$pricePerUnit"] },
                                },
                            },
                        },
                    ],
                    totalCurrentStock: [
                        {
                            $group: { _id: null, total: { $sum: "$currentStock" } }
                        }
                    ],
                    totalConsumed: [
                        {
                            $group: { _id: null, total: { $sum: "$totalConsumed" } }
                        }
                    ],
                    totalReceived: [
                        {
                            $group: { _id: null, total: { $sum: "$totalReceived" } }
                        }
                    ],
                    criticalItems: [
                        { $match: { currentStock: { $lte: 0 } } },
                        { $count: "count" }
                    ],
                    lowStockItems: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $gt: ["$currentStock", 0] },
                                        { $lte: ["$currentStock", "$minimumLevel"] },
                                    ],
                                },
                            },
                        },
                        { $count: "count" }
                    ],
                    goodStockItems: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $gt: ["$currentStock", "$minimumLevel"] },
                                        {
                                            $lte: [
                                                "$currentStock",
                                                { $multiply: ["$minimumLevel", 1.5] },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        { $count: "count" }
                    ],
                    excellentStockItems: [
                        {
                            $match: {
                                $expr: {
                                    $gt: [
                                        "$currentStock",
                                        { $multiply: ["$minimumLevel", 1.5] },
                                    ],
                                },
                            },
                        },
                        { $count: "count" }
                    ],
                    categoryBreakdown: [
                        { $group: { _id: "$category", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                },
            },
        ]);
        const totalItems = agg?.totalItems?.[0]?.count ?? 0;
        const activeProjects = agg?.activeProjects?.[0]?.count ?? 0;
        const totalStockValue = Math.round((agg?.totalStockValue?.[0]?.value ?? 0) * 100) / 100;
        const totalCurrentStock = Math.round((agg?.totalCurrentStock?.[0]?.total ?? 0) * 1000) / 1000;
        const totalConsumed = Math.round((agg?.totalConsumed?.[0]?.total ?? 0) * 1000) / 1000;
        const totalReceived = Math.round((agg?.totalReceived?.[0]?.total ?? 0) * 1000) / 1000;
        const criticalItems = agg?.criticalItems?.[0]?.count ?? 0;
        const lowStockItems = agg?.lowStockItems?.[0]?.count ?? 0;
        const goodStockItems = agg?.goodStockItems?.[0]?.count ?? 0;
        const excellentStockItems = agg?.excellentStockItems?.[0]?.count ?? 0;
        const categoryBreakdown = (agg?.categoryBreakdown || []).map((c) => ({
            category: c._id || "Uncategorized",
            count: c.count,
        }));
        logger.info("Global Inventory summary fetched", { companyId, totalItems });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalItems,
                        activeProjects,
                        totalStockValue,
                        totalCurrentStock,
                        totalConsumed,
                        totalReceived,
                        stockStatusBreakdown: {
                            critical: criticalItems,        // stock <= 0
                            low: lowStockItems,        // 0 < stock <= minimumLevel
                            good: goodStockItems,       // minimumLevel < stock <= minimumLevel * 1.5
                            excellent: excellentStockItems,  // stock > minimumLevel * 1.5
                        },
                        alertCounts: {
                            criticalItems,
                            lowStockItems,
                            totalAlerts: criticalItems + lowStockItems,
                        },
                        categoryBreakdown,
                    },
                },
                "Global Inventory Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalInventorySummary failed", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "Failed to fetch global inventory summary",
                [error.message]
            )
        );
    }
};

// This function returns all inventory items across all projects for a company. takes x-company-id in headers. supports pagination, search (name, category, supplierName), filtering (stockStatus, projectId, category) and sorting. -------------------------- Ayan
export const getAllInventoryGlobal = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const activeProjectDocs = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjectDocs.map((p) => p._id);
        const {
            page = 1,
            limit = 10,
            search = "",
            stockStatus,
            projectId,
            category,
            sortBy = "createdAt",
            order = "desc",
            lastId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        if (projectId) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Project ID",
                        "projectId query param must be a valid MongoDB ObjectId"
                    )
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (category?.trim()) {
            filter.category = { $regex: category.trim(), $options: "i" };
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { name: searchRegex },
                { category: searchRegex },
                { supplierName: searchRegex },
            ];
        }
        if (stockStatus) {
            const validStatuses = ["Critical", "Low", "Good", "Excellent"];
            if (!validStatuses.includes(stockStatus)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid stockStatus",
                        `Valid values: ${validStatuses.join(", ")}`
                    )
                );
            }
            switch (stockStatus) {
                case "Critical":
                    filter.currentStock = { $lte: 0 };
                    break;
                case "Low":
                    filter.$expr = {
                        $and: [
                            { $gt: ["$currentStock", 0] },
                            { $lte: ["$currentStock", "$minimumLevel"] },
                        ],
                    };
                    break;
                case "Good":
                    filter.$expr = {
                        $and: [
                            { $gt: ["$currentStock", "$minimumLevel"] },
                            { $lte: ["$currentStock", { $multiply: ["$minimumLevel", 1.5] }] },
                        ],
                    };
                    break;
                case "Excellent":
                    filter.$expr = {
                        $gt: ["$currentStock", { $multiply: ["$minimumLevel", 1.5] }],
                    };
                    break;
            }
        }
        const allowedSortFields = [
            "name", "category", "currentStock",
            "minimumLevel", "pricePerUnit", "createdAt", "updatedAt",
        ];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const countFilter = { ...filter };
        const useCursor =
            lastId &&
            mongoose.Types.ObjectId.isValid(lastId) &&
            sortField === "createdAt";
        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id =
                sortOrder === -1
                    ? { $lt: cursorObjectId }
                    : { $gt: cursorObjectId };
        }
        const itemQuery = Inventory.find(filter)
            .select("-__v -isDeleted -deletedAt")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);
        if (!useCursor) {
            itemQuery.skip((pageNumber - 1) * pageSize);
        }
        const [items, total] = await Promise.all([
            itemQuery.lean(),
            Inventory.countDocuments(countFilter),
        ]);
        if (items.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        inventory: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false,
                            nextCursor: null,
                        },
                    },
                    "No Inventory Found",
                    "No inventory items matched the given filters"
                )
            );
        }
        const uniqueProjectIds = [
            ...new Set(items.map((i) => i.projectId?.toString()).filter(Boolean)),
        ];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });
        const uniqueUserIds = [
            ...new Set(items.map((i) => i.createdBy?.toString()).filter(Boolean)),
        ];
        const userEnrichmentMap = {};
        await Promise.all(
            uniqueUserIds.map(async (uid) => {
                userEnrichmentMap[uid] = await enrichUser(
                    new mongoose.Types.ObjectId(uid)
                );
            })
        );
        const computeStockStatus = (item) => {
            if (item.currentStock <= 0) return "Critical";
            if (item.currentStock <= item.minimumLevel) return "Low";
            if (item.currentStock <= item.minimumLevel * 1.5) return "Good";
            return "Excellent";
        };
        const formatted = items.map((item) => ({
            inventoryId: item._id,
            materialMasterId: item.materialMasterId,
            projectId: item.projectId,
            projectName: projectMap[item.projectId?.toString()] ?? "Unknown Project",
            name: item.name,
            unit: item.unit,
            category: item.category ?? null,
            currentStock: item.currentStock,
            minimumLevel: item.minimumLevel,
            pricePerUnit: item.pricePerUnit,
            stockValue: Math.round(item.currentStock * item.pricePerUnit * 100) / 100,
            stockStatus: computeStockStatus(item),
            supplierName: item.supplierName ?? null,
            totalConsumed: item.totalConsumed,
            totalReceived: item.totalReceived,
            lastRestockedAt: item.lastRestockedAt ?? null,
            createdBy: userEnrichmentMap[item.createdBy?.toString()] ?? null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }));
        const hasNextPage = items.length === pageSize;
        const nextCursor = hasNextPage ? items[items.length - 1]._id : null;
        logger.info("Global Inventory fetched", {
            companyId,
            total,
            returned: items.length,
            page: pageNumber,
            filters: { stockStatus, projectId, category, search },
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    inventory: formatted,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                "Global Inventory Retrieved",
                `Fetched ${formatted.length} inventory item(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllInventoryGlobal failed", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "Failed to fetch global inventory",
                [error.message]
            )
        );
    }
};