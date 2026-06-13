import mongoose from "mongoose";
import Vendor from "../models/vendors.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import PaymentTransaction from "../models/paymentTransaction.models.js";
import Payable from "../models/payable.models.js";

export const normalizeLegalDetails = (input) => {
    if (!input || typeof input !== "object") return {};
    const normalized = {};
    const gstin =
        input.gstin ??
        input.GSTIN ??
        input.Gstin ??
        null;
    if (gstin !== undefined) normalized.gstin = gstin;
    const panNumber =
        input.panNumber ??
        input.pan_number ??
        input.pannumber ??
        input.PanNumber ??
        input.PAN ??
        input.pan ??
        null;
    if (panNumber !== undefined) normalized.panNumber = panNumber;
    const registrationNumber =
        input.registrationNumber ??
        input.registration_number ??
        input.regNumber ??
        input.reg_number ??
        null;
    if (registrationNumber !== undefined) normalized.registrationNumber = registrationNumber;
    return normalized;
};


export const normalizeBankDetails = (input) => {
    if (!input || typeof input !== "object") return {};
    const normalized = {};
    const accountName =
        input.accountName ??
        input.account_name ??
        null;
    if (accountName !== undefined) normalized.accountName = accountName;
    const accountNumber =
        input.accountNumber ??
        input.account_number ??
        null;
    if (accountNumber !== undefined) normalized.accountNumber = accountNumber;
    const bankName =
        input.bankName ??
        input.bank_name ??
        null;
    if (bankName !== undefined) normalized.bankName = bankName;
    const ifscCode =
        input.ifscCode ??
        input.ifsc_code ??
        input.ifsc ??
        null;
    if (ifscCode !== undefined) normalized.ifscCode = ifscCode;
    const branchName =
        input.branchName ??
        input.branch_name ??
        null;
    if (branchName !== undefined) normalized.branchName = branchName;
    return normalized;
};


const escapeRegExp = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const uploadVendorPhoto = async (file, companyId) => {
    if (!file) return null;
    const ext = file.originalname.split(".").pop();
    const key = `vendors/${companyId}/${Date.now()}.${ext}`;
    const uploaded = await uploadToR2({
        buffer: file.buffer,
        mimeType: file.mimetype,
        key,
    });
    return uploaded.url;
};

const resolveUserObjectId = async (userId, companyId) => {
    const normalizedUserId = userId ? String(userId).trim() : "";
    if (!normalizedUserId) return null;
    if (mongoose.Types.ObjectId.isValid(normalizedUserId)) {
        return normalizedUserId;
    }
    const user = await User.findOne({
        keycloakId: normalizedUserId,
        companyId,
        isDeleted: false,
    })
        .select("_id")
        .lean();
    return user?._id || null;
};

const parseJsonField = (value) => {
    if (!value) return undefined;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const resolveCompany = async (companyUUID) => {
    if (!companyUUID?.trim()) return null;
    return Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
};


// This function creates a new vendor. takes x-company-id in headers and vendor details like name, phone, email, vendorType, contactPerson, website, address, description, supplyCategories, rating, notes, legalDetails, bankDetails, isActive, isVerified and createdBy in body. validates uniqueness and uploads vendor photo if provided. -------------------------- Santam
export const addVendor = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found"));
        }
        let {
            name, phone, email, vendorType, contactPerson, website,
            address, description, supplyCategories, rating, notes,
            legalDetails, bankDetails, isActive, isVerified,
            createdBy: createdByField,
        } = req.body;
        if (!name?.trim() || !phone?.trim() || !email?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", "name, phone and email are required")
            );
        }
        name = name.trim();
        phone = phone.trim();
        email = email.trim().toLowerCase();
        const duplicate = await Vendor.findOne({
            companyId: company._id,
            name: { $regex: new RegExp(`^${escapeRegExp(name)}$`, "i") },
            isDeleted: false,
        });
        if (duplicate) {
            return res.status(409).json(new ApiErrors(409, "Duplicate Vendor"));
        }
        const parsedLegalDetails = normalizeLegalDetails(parseJsonField(legalDetails));
        const parsedBankDetails = normalizeBankDetails(parseJsonField(bankDetails));
        logger.info("addVendor nested fields", { parsedLegalDetails, parsedBankDetails });
        const createdBy = await resolveUserObjectId(
            createdByField || req.user?.keycloakId,
            company._id
        );
        const photo = await uploadVendorPhoto(req.file, company._id);
        const vendor = await Vendor.create({
            companyId: company._id,
            name,
            phone,
            email,
            vendorType: vendorType?.trim() || null,
            contactPerson: contactPerson?.trim() || null,
            website: website?.trim() || null,
            address: address?.trim() || null,
            description: description?.trim() || null,
            supplyCategories: parseJsonField(supplyCategories) || [],
            rating: rating ? Number(rating) : null,
            notes: notes?.trim() || null,
            legalDetails: parsedLegalDetails,
            bankDetails: parsedBankDetails,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            isVerified: isVerified !== undefined ? Boolean(isVerified) : false,
            photo: photo || null,
            createdBy,
        });
        return res.status(201).json(
            new ApiResponse(201, { vendor }, "Vendor Created")
        );
    } catch (error) {
        logger.error("addVendor failed", error);
        return res.status(500).json(new ApiErrors(500, "Server Error"));
    }
};



// This function returns all vendors for a company. takes x-company-id in headers. supports pagination, search (name, email, phone, contactPerson, vendorType), filtering (vendorType, isActive, isVerified) and sorting. -------------------------- Santam
export const getVendors = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found"));
        }
        const {
            search,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
            vendorType,
            isActive,
            isVerified,
        } = req.query;
        const pageNumber = Math.max(parseInt(page), 1);
        const pageSize = Math.max(parseInt(limit), 1);
        const skip = (pageNumber - 1) * pageSize;
        const filter = { companyId: company._id, isDeleted: false };
        if (search?.trim()) {
            const safe = escapeRegExp(search.trim());
            filter.$or = [
                { name: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
                { phone: { $regex: safe, $options: "i" } },
                { contactPerson: { $regex: safe, $options: "i" } },
                { vendorType: { $regex: safe, $options: "i" } },
            ];
        }
        if (vendorType) filter.vendorType = vendorType;
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (isVerified !== undefined) filter.isVerified = isVerified === "true";
        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
        const [vendors, total] = await Promise.all([
            Vendor.find(filter)
                .select(
                    "name email phone photo vendorType supplyCategories isActive isVerified createdAt description"
                )
                .sort(sort)
                .skip(skip)
                .limit(pageSize)
                .lean(),
            Vendor.countDocuments(filter),
        ]);
        return res.status(200).json(
            new ApiResponse(200, {
                vendors,
                pagination: {
                    total,
                    page: pageNumber,
                    limit: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                },
            },
                "Vendors fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getVendors failed", error);
        return res.status(500).json(new ApiErrors(500, "Server Error"));
    }
};


// This function updates vendor details. takes x-company-id in headers, vendorId in params and editable fields like name, phone, email, vendorType, contactPerson, website, address, description, supplyCategories, rating, notes, legalDetails, bankDetails, isActive, isVerified and updatedBy in body. handles duplicate check and photo upload. -------------------------- Santam
export const editVendor = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        const { vendorId } = req.params;
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found"));
        }
        const vendor = await Vendor.findOne({
            _id: vendorId,
            companyId: company._id,
            isDeleted: false,
        });
        if (!vendor) {
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found"));
        }
        const {
            name, phone, email, vendorType, contactPerson, website,
            address, description, supplyCategories, rating, notes,
            legalDetails, bankDetails, isActive, isVerified,
            updatedBy: updatedByField,
        } = req.body;
        if (name?.trim()) {
            const duplicate = await Vendor.findOne({
                companyId: company._id,
                name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, "i") },
                _id: { $ne: vendorId },
                isDeleted: false,
            });
            if (duplicate) {
                return res.status(409).json(new ApiErrors(409, "Duplicate Vendor Name"));
            }
            vendor.name = name.trim();
        }
        if (phone?.trim()) vendor.phone = phone.trim();
        if (email?.trim()) vendor.email = email.trim().toLowerCase();
        if (vendorType !== undefined) vendor.vendorType = vendorType?.trim() || null;
        if (contactPerson !== undefined) vendor.contactPerson = contactPerson?.trim() || null;
        if (website !== undefined) vendor.website = website?.trim() || null;
        if (address !== undefined) vendor.address = address?.trim() || null;
        if (description !== undefined) vendor.description = description?.trim() || null;
        if (notes !== undefined) vendor.notes = notes?.trim() || null;
        if (rating !== undefined) vendor.rating = rating ? Number(rating) : null;
        if (isActive !== undefined) vendor.isActive = Boolean(isActive);
        if (isVerified !== undefined) vendor.isVerified = Boolean(isVerified);
        if (supplyCategories !== undefined) {
            vendor.supplyCategories = parseJsonField(supplyCategories) || [];
        }
        if (legalDetails !== undefined) {
            const parsed = normalizeLegalDetails(parseJsonField(legalDetails) || {});
            logger.info("editVendor legalDetails", { raw: legalDetails, parsed });
            Object.entries(parsed).forEach(([key, value]) => {
                if (value !== undefined) {
                    vendor.legalDetails[key] = value;
                }
            });
        }
        if (bankDetails !== undefined) {
            const parsed = normalizeBankDetails(parseJsonField(bankDetails) || {});
            Object.entries(parsed).forEach(([key, value]) => {
                if (value !== undefined) {
                    vendor.bankDetails[key] = value;
                }
            });
        }
        if (req.file) {
            vendor.photo = await uploadVendorPhoto(req.file, company._id);
        }
        vendor.updatedBy = await resolveUserObjectId(
            updatedByField || req.user?.keycloakId,
            company._id
        );
        await vendor.save();
        return res.status(200).json(
            new ApiResponse(200, { vendor }, "Vendor Updated")
        );
    } catch (error) {
        logger.error("editVendor failed", error);
        return res.status(500).json(new ApiErrors(500, "Server Error"));
    }
};



// This function fetches a specific vendor by ID. takes x-company-id in headers and vendorId in params. returns complete vendor details with createdBy and updatedBy user info. -------------------------- Santam
export const getVendorById = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        const { vendorId } = req.params;
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found"));
        }
        const vendor = await Vendor.findOne({
            _id: vendorId,
            companyId: company._id,
            isDeleted: false,
        })
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email")
            .lean();
        if (!vendor) {
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found"));
        }
        return res.status(200).json(
            new ApiResponse(200, { vendor }, "Vendor fetched successfully")
        );
    } catch (error) {
        logger.error("getVendorById failed", error);
        return res.status(500).json(new ApiErrors(500, "Server Error"));
    }
};


// This function soft deletes a vendor. takes x-company-id in headers and vendorId in params. marks vendor as deleted and stores deleted timestamp with updatedBy user. -------------------------- Santam
export const deleteVendor = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        const { vendorId } = req.params;
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Vendor ID"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found"));
        }
        const vendor = await Vendor.findOne({
            _id: vendorId,
            companyId: company._id,
            isDeleted: false,
        });
        if (!vendor) {
            return res.status(404).json(new ApiErrors(404, "Vendor Not Found"));
        }
        const userId = await resolveUserObjectId(
            req.body?.updatedBy || req.user?.keycloakId,
            company._id
        );
        vendor.isDeleted = true;
        vendor.deletedAt = new Date();
        vendor.updatedBy = userId;
        await vendor.save();
        return res.status(200).json(
            new ApiResponse(200, null, "Vendor deleted successfully")
        );
    } catch (error) {
        logger.error("deleteVendor failed", error);
        return res.status(500).json(new ApiErrors(500, "Server Error"));
    }
};



// This function returns the procurement history of a vendor. takes x-company-id in headers and vendorId in params. returns all POs linked to the vendor and all MRs from projects where the vendor has supplied, with pagination and module filter support. -------------------------- Ayan
export const getVendorHistory = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { vendorId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const vendor = await Vendor.findOne({
            _id: vendorId,
            companyId,
            isDeleted: false,
        })
            .select("_id name")
            .lean();
        if (!vendor) {
            return res.status(404).json(
                new ApiErrors(404, "Vendor Not Found", "No active vendor found with the given ID")
            );
        }
        const {
            page = 1,
            limit = 10,
            module,
            status,
            sortOrder = "desc",
        } = req.query;
        const pageNumber = Math.max(parseInt(page), 1);
        const pageSize = Math.min(Math.max(parseInt(limit), 1), 100);
        const skip = (pageNumber - 1) * pageSize;
        const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };
        const includePO = !module || module === "PO";
        const includeMR = !module || module === "MR";
        let poRecords = [];
        let poTotal = 0;
        if (includePO) {
            const poFilter = {
                companyId,
                vendorId: new mongoose.Types.ObjectId(vendorId),
                isDeleted: false,
            };
            if (status) poFilter.status = status;

            [poRecords, poTotal] = await Promise.all([
                PurchaseOrder.find(poFilter)
                    .select("poNumber status totalOrderValue items expectedDeliveryDate projectId createdAt updatedAt")
                    .populate("projectId", "projectName projectCode")
                    .sort(sort)
                    .lean(),
                PurchaseOrder.countDocuments(poFilter),
            ]);
        }
        let mrRecords = [];
        let mrTotal = 0;
        if (includeMR) {
            const vendorProjectIds = await PurchaseOrder.distinct("projectId", {
                companyId,
                vendorId: new mongoose.Types.ObjectId(vendorId),
                isDeleted: false,
            });
            if (vendorProjectIds.length > 0) {
                const mrFilter = {
                    companyId,
                    projectId: { $in: vendorProjectIds },
                    isDeleted: false,
                };
                if (status) mrFilter.status = status;

                [mrRecords, mrTotal] = await Promise.all([
                    MaterialRequisition.find(mrFilter)
                        .select("mrNumber status items requiredByDate reason projectId createdAt updatedAt")
                        .populate("projectId", "projectName projectCode")
                        .sort(sort)
                        .lean(),
                    MaterialRequisition.countDocuments(mrFilter),
                ]);
            }
        }
        const poEntries = poRecords.map((po) => ({
            module: "Purchase Order",
            uniqueId: po.poNumber,
            status: po.status,
            requestedFor: po.items.map((i) => i.materialName).join(", "),
            totalOrderValue: po.totalOrderValue ?? null,
            expectedDeliveryDate: po.expectedDeliveryDate ?? null,
            unit: po.items.length > 0 ? po.items[0].unit : null,
            orderedQuantity: po.items.length > 0 ? po.items[0].orderedQuantity : null,
            project: po.projectId
                ? {
                    projectId: po.projectId._id,
                    projectName: po.projectId.projectName,
                    projectCode: po.projectId.projectCode,
                }
                : null,
            refId: po._id,
            createdAt: po.createdAt,
            updatedAt: po.updatedAt,
        }));
        const mrEntries = mrRecords.map((mr) => ({
            module: "Material Requisition",
            uniqueId: mr.mrNumber,
            status: mr.status,
            requestedFor: mr.items.map((i) => i.materialName).join(", "),
            requiredByDate: mr.requiredByDate ?? null,
            reason: mr.reason ?? null,
            unit: mr.items.length > 0 ? mr.items[0].unit : null,
            orderedQuantity: mr.items.length > 0 ? mr.items[0].requiredQuantity : null,
            project: mr.projectId
                ? {
                    projectId: mr.projectId._id,
                    projectName: mr.projectId.projectName,
                    projectCode: mr.projectId.projectCode,
                }
                : null,
            refId: mr._id,
            createdAt: mr.createdAt,
            updatedAt: mr.updatedAt,
        }));
        const allEntries = [...poEntries, ...mrEntries].sort((a, b) =>
            sortOrder === "asc"
                ? new Date(a.createdAt) - new Date(b.createdAt)
                : new Date(b.createdAt) - new Date(a.createdAt)
        );
        const total = allEntries.length;
        const paginatedEntries = allEntries.slice(skip, skip + pageSize);
        logger.info("Vendor history fetched", {
            vendorId,
            companyId,
            poTotal,
            mrTotal,
            total,
            page: pageNumber,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    vendor: { vendorId: vendor._id, name: vendor.name },
                    history: paginatedEntries,
                    summary: {
                        totalPOs: poTotal,
                        totalMRs: mrTotal,
                        total,
                    },
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Vendor History Retrieved" : "No History Found",
                `Fetched ${paginatedEntries.length} procurement record(s) for vendor "${vendor.name}"`
            )
        );
    } catch (error) {
        logger.error("getVendorHistory failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve vendor history", [error.message])
        );
    }
};



// This function returns a lightweight list of vendors for lookup/dropdown use. takes x-company-id in headers. supports search (name, email, vendorType) and optional isActive filter. returns only _id, name, vendorType and email. -------------------------- Santam
export const getVendorLookup = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found"));
        }
        const { search, isActive } = req.query;
        const filter = { companyId: company._id, isDeleted: false };
        if (search?.trim()) {
            const safe = escapeRegExp(search.trim());
            filter.$or = [
                { name: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
                { vendorType: { $regex: safe, $options: "i" } },
            ];
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        } else {
            filter.isActive = true;
        }
        const vendors = await Vendor.find(filter)
            .select("_id name vendorType email")
            .sort({ name: 1 })
            .lean();
        return res.status(200).json(
            new ApiResponse(
                200,
                { vendors, total: vendors.length },
                "Vendor lookup fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getVendorLookup failed", error);
        return res.status(500).json(new ApiErrors(500, "Server Error"));
    }
};



//This function returns vendor billing summary and paginated payable list for the bills tab.takes x-company-id in headers and vendorId in params. returns KPI summary (total amount, paid, due, PO/GRN/WO counts) and a paginated list of payables (GRN and WO only) with source details. supports filtering by status and sourceType, and sorting by createdAt, totalAmount, dueAmount, dueDate or status. -------------------------- Ayan
export const getVendorBills = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { vendorId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
            );
        }
        const companyId = company._id;
        const vendor = await Vendor.findOne({
            _id: vendorId,
            companyId,
            isDeleted: false,
        })
            .select("_id name vendorType")
            .lean();
        if (!vendor) {
            return res.status(404).json(
                new ApiErrors(404, "Vendor Not Found", "No active vendor found with the given ID")
            );
        }
        const {
            page = 1,
            limit = 10,
            status,
            sourceType,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(parseInt(page), 1);
        const pageSize = Math.min(Math.max(parseInt(limit), 1), 100);
        const allowedSortFields = ["createdAt", "totalAmount", "dueAmount", "dueDate", "status"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const validStatuses = ["Unpaid", "PartiallyPaid", "Paid", "Reversed"];
        const validSourceTypes = ["GRN", "WO"];
        const baseFilter = {
            companyId,
            vendorId: new mongoose.Types.ObjectId(vendorId),
            sourceType: { $in: ["GRN", "WO"] },
        };
        const listFilter = { ...baseFilter };
        if (status && validStatuses.includes(status)) listFilter.status = status;
        if (sourceType && validSourceTypes.includes(sourceType)) listFilter.sourceType = sourceType;
        const [kpi, payables, total] = await Promise.all([
            Payable.aggregate([
                { $match: baseFilter },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" },
                        totalPaid: { $sum: { $add: ["$paidAmount", "$advanceDeducted"] } },
                        totalDue: { $sum: "$dueAmount" },
                        totalGRN: {
                            $sum: { $cond: [{ $eq: ["$sourceType", "GRN"] }, 1, 0] },
                        },
                        totalWO: {
                            $sum: { $cond: [{ $eq: ["$sourceType", "WO"] }, 1, 0] },
                        },
                    },
                },
            ]),
            Payable.find(listFilter)
                .select("payableNumber sourceType sourceNumber poId totalAmount paidAmount advanceDeducted dueAmount status dueDate createdAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Payable.countDocuments(listFilter),
        ]);
        const kpiData = kpi[0] ?? {
            totalAmount: 0,
            totalPaid: 0,
            totalDue: 0,
            totalGRN: 0,
            totalWO: 0,
        };
        const poCount = await PurchaseOrder.countDocuments({
            companyId,
            vendorId: new mongoose.Types.ObjectId(vendorId),
            isDeleted: false,
        });
        const bills = payables.map((p) => ({
            payableId: p._id,
            payableNumber: p.payableNumber,
            sourceType: p.sourceType,
            sourceNumber: p.sourceNumber ?? null,
            poId: p.poId ?? null,
            totalAmount: p.totalAmount,
            paidAmount: parseFloat((p.paidAmount + p.advanceDeducted).toFixed(2)),
            dueAmount: p.dueAmount,
            status: p.status,
            dueDate: p.dueDate ?? null,
            isOverdue:
                ["Unpaid", "PartiallyPaid"].includes(p.status) &&
                p.dueDate != null &&
                new Date(p.dueDate) < new Date(),
            createdAt: p.createdAt,
        }));
        logger.info("getVendorBills fetched", {
            vendorId,
            companyId,
            total,
            page: pageNumber,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    vendor: {
                        vendorId: vendor._id,
                        name: vendor.name,
                        vendorType: vendor.vendorType ?? null,
                    },
                    kpi: {
                        totalAmount: parseFloat(kpiData.totalAmount.toFixed(2)),
                        totalPaid: parseFloat(kpiData.totalPaid.toFixed(2)),
                        totalDue: parseFloat(kpiData.totalDue.toFixed(2)),
                        totalGRNs: kpiData.totalGRN,
                        totalWOs: kpiData.totalWO,
                        totalPOs: poCount,
                    },
                    bills,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "Vendor Bills Retrieved" : "No Bills Found",
                `Fetched ${bills.length} bill(s) for vendor "${vendor.name}"`
            )
        );
    } catch (error) {
        logger.error("getVendorBills failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve vendor bills", [error.message])
        );
    }
};