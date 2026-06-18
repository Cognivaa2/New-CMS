import mongoose from "mongoose";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import MaterialMaster from "../models/materialMaster.models.js";
import Vendor from "../models/vendors.models.js";
import Project from "../models/project.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import {
    isValidObjectId,
    resolveCompany,
    resolveUserByKeycloak,
    generatePONumber,
    processPOItems,
    enrichPOUsers,
    shouldMarkMRAsConverted,
} from "../helpers/poHelper.js";
import { createExpenseEntry, reverseExpenseEntry, recalcProjectHealth } from "../helpers/expenseHelper.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import { enrichUser } from "../helpers/mrHelper.js";
import NotificationService from "../services/notification.service.js";
import { generatePOPdf } from "../helpers/poPdfGenerator.js"


// This function creates a new purchase order (PO). takes x-company-id in headers, projectId in params and createdBy, mrId, vendorId, items, expectedDeliveryDate, deliveryAddress, paymentTerms, specialInstructions in body. validates MR and vendor, processes items, calculates total value and creates PO in Draft state with auto MR conversion if applicable. -------------------------- Ayan
export const createPO = async (req, res) => {
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
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        const { createdBy, mrId, vendorId, items, expectedDeliveryDate, deliveryAddress, paymentTerms, specialInstructions } = req.body;
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!mrId?.trim()) missing.push("mrId");
        if (!vendorId?.trim()) missing.push("vendorId");
        if (!Array.isArray(items) || items.length === 0) missing.push("items (must be a non-empty array)");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`)
            );
        }
        const zeroUnitPriceItems = items.filter(
            (item, index) => item.unitPrice === 0 || item.unitPrice === "0" || Number(item.unitPrice) === 0
        );
        if (zeroUnitPriceItems.length > 0) {
            const names = zeroUnitPriceItems
                .map((item, i) => item.materialName || `Item at index ${items.indexOf(item)}`)
                .join(", ");
            return res.status(400).json(
                new ApiErrors(400, "Invalid Unit Price", `Unit price cannot be zero for the following item(s): ${names}`)
            );
        }
        if (!isValidObjectId(mrId.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "mrId must be a valid MongoDB ObjectId")
            );
        }
        if (!isValidObjectId(vendorId.trim())) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid MongoDB ObjectId")
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found for this company")
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId.trim(),
            projectId,
            companyId,
            isDeleted: false,
        }).lean();
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID for this project")
            );
        }
        if (mr.status !== "Approved" && mr.status !== "ConvertedToPO") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR Status", `Cannot create a PO from an MR in '${mr.status}' status. Only Approved or ConvertedToPO MRs can be used`)
            );
        }
        const vendor = await Vendor.findOne({
            _id: vendorId.trim(),
            companyId,
            isDeleted: false,
        }).lean();
        if (!vendor) {
            return res.status(404).json(
                new ApiErrors(404, "Vendor Not Found", "No active vendor found with the given ID for this company")
            );
        }
        if (!vendor.isActive) {
            return res.status(400).json(
                new ApiErrors(400, "Vendor Inactive", `Vendor "${vendor.name}" is currently inactive and cannot be assigned to a PO`)
            );
        }
        const { processedItems, error } = await processPOItems(items, projectId, companyId);
        if (error) return res.status(error.statusCode).json(error);
        const totalOrderValue = parseFloat(
            processedItems.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2)
        );
        const poNumber = await generatePONumber(companyId);
        const po = await PurchaseOrder.create({
            companyId,
            projectId,
            mrId: new mongoose.Types.ObjectId(mrId.trim()),
            vendorId: new mongoose.Types.ObjectId(vendorId.trim()),
            vendorName: vendor.name,
            poNumber,
            items: processedItems,
            totalOrderValue,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
            deliveryAddress: deliveryAddress?.trim() || null,
            paymentTerms: paymentTerms?.trim() || null,
            specialInstructions: specialInstructions?.trim() || null,
            status: "Draft",
            createdBy: creatorUser._id,
        });
        const shouldConvert = await shouldMarkMRAsConverted(mr._id, companyId);
        if (shouldConvert && mr.status === "Approved") {
            await MaterialRequisition.findByIdAndUpdate(mr._id, {
                $set: { status: "ConvertedToPO", updatedBy: creatorUser._id },
            });
            await pushDprEvent({
                companyId,
                projectId,
                actorId: creatorUser._id,
                module: "MaterialRequisition",
                action: "MRConvertedToPO",
                refId: mr._id,
                refNumber: mr.mrNumber,
                details: {
                    mrNumber: mr.mrNumber,
                    poNumber: po.poNumber,
                    poId: po._id,
                    vendorName: po.vendorName,
                },
                eventAt: new Date(),
            });
            logger.info("MR auto-marked as ConvertedToPO", { mrId: mr._id, poId: po._id });
        }
        logger.info("PO created (Draft)", { poId: po._id, poNumber, mrId: mr._id, projectId, companyId });
        await pushDprEvent({
            companyId,
            projectId: po.projectId,
            actorId: creatorUser._id,
            module: "PurchaseOrder",
            action: "POCreated",
            refId: po._id,
            refNumber: po.poNumber,
            details: {
                poNumber: po.poNumber,
                mrNumber: mr.mrNumber,
                vendorName: po.vendorName,
                itemCount: po.items.length,
                totalOrderValue: po.totalOrderValue,
                status: po.status,
                materials: po.items.map((item) => ({
                    materialName: item.materialName,
                    orderedQuantity: item.orderedQuantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });
        return res.status(201).json(
            new ApiResponse(201, { po }, "PO Created", `Purchase Order ${poNumber} created as Draft`)
        );
    } catch (error) {
        logger.error("createPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to create Purchase Order", [error.message])
        );
    }
};


// This function returns all POs for a project. takes x-company-id in headers and projectId in params. supports pagination, search (poNumber, vendorName, materialName), filtering (status, vendorId) and sorting with enriched user data. -------------------------- Ayan
export const getAllPOs = async (req, res) => {
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

        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found with the given ID")
            );
        }
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            vendorId: filterVendorId,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = ["Draft", "Submitted", "Approved", "Rejected", "PartiallyDelivered", "Completed", "Cancelled"];
        const allowedSortFields = ["createdAt", "poNumber", "totalOrderValue", "expectedDeliveryDate", "status"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, projectId, isDeleted: false };
        if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (filterVendorId && isValidObjectId(filterVendorId)) {
            filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { poNumber: searchRegex },
                { vendorName: searchRegex },
                { "items.materialName": searchRegex },
            ];
        }
        const [pos, total] = await Promise.all([
            PurchaseOrder.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            PurchaseOrder.countDocuments(filter),
        ]);
        const enrichedPOs = await Promise.all(pos.map((po) => enrichPOUsers(po)));
        logger.info("POs fetched", { total, page: pageNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    pos: enrichedPOs,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "POs Retrieved" : "No POs Found",
                `Fetched ${pos.length} purchase order(s)`
            )
        );
    } catch (error) {
        logger.error("getAllPOs failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve Purchase Orders", [error.message])
        );
    }
};


// This function fetches a specific PO by ID. takes x-company-id in headers, projectId and poId in params. returns complete PO details with enriched user information. -------------------------- Ayan
export const getSinglePO = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const po = await PurchaseOrder.findOne({
            _id: poId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted")
            .lean();

        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        const enrichedPO = await enrichPOUsers(po);
        logger.info("PO fetched", { poId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { po: enrichedPO }, "PO Retrieved", "Purchase Order fetched successfully")
        );
    } catch (error) {
        logger.error("getSinglePO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve Purchase Order", [error.message])
        );
    }
};


// This function updates a PO. takes x-company-id in headers, projectId and poId in params and editable fields like vendorId, items, expectedDeliveryDate, deliveryAddress, paymentTerms, specialInstructions and updatedBy in body. allows update only in Draft state and recalculates total order value. -------------------------- Ayan
export const editPO = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const po = await PurchaseOrder.findOne({
            _id: poId,
            projectId,
            companyId,
            isDeleted: false,
        });
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (!["Draft", "Rejected"].includes(po.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot edit a PO in '${po.status}' status. Only Draft POs can be edited`
                )
            );
        }
        const EDITABLE = ["vendorId", "items", "expectedDeliveryDate", "deliveryAddress", "paymentTerms", "specialInstructions"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field to update")
            );
        }
        const updates = { updatedBy: editorUser._id };
        if (req.body.vendorId !== undefined) {
            const newVendorId = req.body.vendorId?.trim();
            if (!newVendorId || !isValidObjectId(newVendorId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid MongoDB ObjectId")
                );
            }
            const vendor = await Vendor.findOne({ _id: newVendorId, companyId, isDeleted: false }).lean();
            if (!vendor) {
                return res.status(404).json(
                    new ApiErrors(404, "Vendor Not Found", "No active vendor found with the given ID")
                );
            }
            if (!vendor.isActive) {
                return res.status(400).json(
                    new ApiErrors(400, "Vendor Inactive", `Vendor "${vendor.name}" is currently inactive`)
                );
            }
            updates.vendorId = new mongoose.Types.ObjectId(newVendorId);
            updates.vendorName = vendor.name;
        }
        if (req.body.items !== undefined) {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "A PO must contain at least one item")
                );
            }
            const zeroUnitPriceItems = items.filter((item) => Number(item.unitPrice) === 0);
            if (zeroUnitPriceItems.length > 0) {
                const names = zeroUnitPriceItems
                    .map((item) => item.materialName || `Item at index ${items.indexOf(item)}`)
                    .join(", ");
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Unit Price", `Unit price cannot be zero for the following item(s): ${names}`)
                );
            }
            const { processedItems, error } = await processPOItems(items, projectId, companyId);
            if (error) return res.status(error.statusCode).json(error);
            updates.items = processedItems;
            updates.totalOrderValue = parseFloat(
                processedItems.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2)
            );
        }
        if (req.body.expectedDeliveryDate !== undefined) {
            updates.expectedDeliveryDate = req.body.expectedDeliveryDate
                ? new Date(req.body.expectedDeliveryDate)
                : null;
        }
        if (req.body.deliveryAddress !== undefined) updates.deliveryAddress = req.body.deliveryAddress?.trim() || null;
        if (req.body.paymentTerms !== undefined) updates.paymentTerms = req.body.paymentTerms?.trim() || null;
        if (req.body.specialInstructions !== undefined) updates.specialInstructions = req.body.specialInstructions?.trim() || null;
        const updatedPO = await PurchaseOrder.findByIdAndUpdate(
            poId,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select("-__v -isDeleted")
            .lean();

        logger.info("PO edited", { poId, projectId, companyId, updatedFields: Object.keys(updates) });
        return res.status(200).json(
            new ApiResponse(200, { po: updatedPO }, "PO Updated", `Purchase Order ${updatedPO.poNumber} updated successfully`)
        );
    } catch (error) {
        logger.error("editPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update Purchase Order", [error.message])
        );
    }
};


// This function submits a PO for approval. takes x-company-id in headers, projectId and poId in params and updatedBy in body. allows submission only from Draft state and updates status to Submitted. -------------------------- Ayan
export const submitPO = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const po = await PurchaseOrder.findOne({ _id: poId, projectId, companyId, isDeleted: false });
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (po.status !== "Draft") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot submit a PO in '${po.status}' status. Only Draft POs can be submitted`
                )
            );
        }
        po.status = "Submitted";
        po.submittedAt = new Date();
        po.submittedBy = actionUser._id;
        po.updatedBy = actionUser._id;
        await po.save();
        await pushDprEvent({
            companyId,
            projectId: po.projectId,
            actorId: actionUser._id,
            module: "PurchaseOrder",
            action: "POSubmitted",
            refId: po._id,
            refNumber: po.poNumber,
            details: {
                poNumber: po.poNumber,
                vendorName: po.vendorName,
                totalOrderValue: po.totalOrderValue,
                submittedAt: po.submittedAt,
                itemCount: po.items.length,
                status: po.status,
            },
            eventAt: new Date(),
        });
        logger.info("PO submitted", { poId: po._id, poNumber: po.poNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { po }, "PO Submitted", `Purchase Order ${po.poNumber} submitted for approval`)
        );
    } catch (error) {
        logger.error("submitPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to submit Purchase Order", [error.message])
        );
    }
};


// This function approves a PO. takes x-company-id in headers, projectId and poId in params and actionBy in body. validates state, prevents self-approval and updates status to Approved with approval details. -------------------------- Ayan
export const approvePO = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const { actionBy } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const po = await PurchaseOrder.findOne({ _id: poId, projectId, companyId, isDeleted: false });
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (po.status !== "Submitted") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot approve a PO in '${po.status}' status. Only Submitted POs can be approved`
                )
            );
        }
        if (po.createdBy.toString() === actionUser._id.toString()) {
            return res.status(403).json(
                new ApiErrors(
                    403,
                    "Self-Approval Not Allowed",
                    "You cannot approve a Purchase Order that you created. Please ask another authorised user to approve it"
                )
            );
        }
        po.status = "Approved";
        po.approvedBy = actionUser._id;
        po.approvedAt = new Date();
        po.updatedBy = actionUser._id;
        await po.save({ session });
        await createExpenseEntry({
            companyId,
            projectId: new mongoose.Types.ObjectId(projectId),
            type: "PO_Commitment",
            category: "Material",
            status: "Committed",
            amount: po.totalOrderValue,
            description: `Purchase Order ${po.poNumber} approved — material commitment`,
            expenseDate: new Date(),
            sourceModel: "PurchaseOrder",
            sourceId: po._id,
            sourceNumber: po.poNumber,
            vendorId: po.vendorId,
            vendorName: po.vendorName,
            createdBy: actionUser._id,
        }, session);

        await session.commitTransaction();
        session.endSession();
        const projectForNotif = await Project.findById(po.projectId).select("projectName").lean();
        NotificationService.notifyPOApproved({
            companyId,
            projectId: po.projectId,
            projectName: projectForNotif?.projectName || po.poNumber,
            poNumber: po.poNumber,
            poId: po._id,
        }).catch(err => logger.error("notifyPOApproved failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: po.projectId,
            actorId: actionUser._id,
            module: "PurchaseOrder",
            action: "POApproved",
            refId: po._id,
            refNumber: po.poNumber,
            details: {
                poNumber: po.poNumber,
                vendorName: po.vendorName,
                approvedAt: po.approvedAt,
                totalOrderValue: po.totalOrderValue,
                itemCount: po.items.length,
                status: po.status,
            },
            eventAt: new Date(),
        });
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("PO approved", { poId: po._id, poNumber: po.poNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { po }, "PO Approved", `Purchase Order ${po.poNumber} has been approved`)
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("approvePO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to approve Purchase Order", [error.message]));
    }
};


// This function rejects a PO. takes x-company-id in headers, projectId and poId in params and actionBy with rejectionRemarks in body. validates state, prevents self-rejection and updates status to Rejected with remarks. -------------------------- Ayan
export const rejectPO = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const { actionBy, rejectionRemarks } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const po = await PurchaseOrder.findOne({ _id: poId, projectId, companyId, isDeleted: false });
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (po.status !== "Submitted") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot reject a PO in '${po.status}' status. Only Submitted POs can be rejected`
                )
            );
        }
        if (po.createdBy.toString() === actionUser._id.toString()) {
            return res.status(403).json(
                new ApiErrors(
                    403,
                    "Self-Rejection Not Allowed",
                    "You cannot reject a Purchase Order that you created. Please ask another authorised user to reject it"
                )
            );
        }
        po.status = "Rejected";
        po.rejectedBy = actionUser._id;
        po.rejectedAt = new Date();
        po.rejectionRemarks = rejectionRemarks?.trim() || null;
        po.updatedBy = actionUser._id;
        await po.save();
        const projectForNotif = await Project.findById(po.projectId).select("projectName").lean();
        NotificationService.notifyPORejected({
            companyId,
            projectId: po.projectId,
            projectName: projectForNotif?.projectName || po.poNumber,
            poNumber: po.poNumber,
            poId: po._id,
            creatorId: po.createdBy,
            triggeredBy: actionUser._id,
        }).catch(err => logger.error("notifyPORejected failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: po.projectId,
            actorId: actionUser._id,
            module: "PurchaseOrder",
            action: "PORejected",
            refId: po._id,
            refNumber: po.poNumber,
            details: {
                poNumber: po.poNumber,
                vendorName: po.vendorName,
                rejectedAt: po.rejectedAt,
                rejectionRemarks: po.rejectionRemarks || null,
                totalOrderValue: po.totalOrderValue,
                status: po.status,
            },

            eventAt: new Date(),
        });
        logger.info("PO rejected", { poId: po._id, poNumber: po.poNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { po }, "PO Rejected", `Purchase Order ${po.poNumber} has been rejected`)
        );
    } catch (error) {
        logger.error("rejectPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to reject Purchase Order", [error.message])
        );
    }
};


// This function exports a PO as a PDF document. takes x-company-id in headers, projectId and poId in params. fetches PO, project, vendor and user details and generates a formatted PDF for download. -------------------------- Ayan
export const exportPOAsPdf = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const po = await PurchaseOrder.findOne({
            _id: poId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No PO found with the given ID")
            );
        }
        const [project, vendor, enrichedPO] = await Promise.all([
            Project.findOne({ _id: projectId, companyId, isDeleted: false })
                .select("projectName projectCode location clientName status startDate endDate")
                .lean(),
            Vendor.findOne({ _id: po.vendorId, companyId, isDeleted: false })
                .select("name vendorType contactPerson phone email address legalDetails")
                .lean(),
            enrichPOUsers(po),
        ]);
        const materialIds = (enrichedPO.items || []).map((it) => it.materialMasterId).filter(Boolean);
        const materialDocs = await MaterialMaster.find(
            { _id: { $in: materialIds } },
            { _id: 1, sacNumber: 1 }
        ).lean();
        const sacMap = {};
        materialDocs.forEach((m) => { sacMap[m._id.toString()] = m.sacNumber || null; });
        enrichedPO.items = (enrichedPO.items || []).map((item) => ({
            ...item,
            sacNumber: sacMap[item.materialMasterId?.toString()] || null,
        }));
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "Project linked to this PO no longer exists")
            );
        }
        const createdByUser = enrichedPO.createdBy;
        logger.info("PO PDF export initiated", {
            poId,
            poNumber: po.poNumber,
            projectId,
            companyId,
        });
        await generatePOPdf(res, {
            po: enrichedPO,
            company,
            vendor,
            project,
            createdByUser,
        });
    } catch (error) {
        if (!res.headersSent) {
            logger.error("exportPOAsPdf failed", { message: error.message, stack: error.stack });
            return res.status(500).json(
                new ApiErrors(500, "Server Error", "Failed to generate PO PDF", [error.message])
            );
        }
        logger.error("exportPOAsPdf stream error (headers already sent)", {
            message: error.message,
        });
    }
}


// This function cancels a PO. takes x-company-id in headers, projectId and poId in params and actionBy with cancellationRemarks in body. allows cancellation only in Approved state and updates status to Cancelled. -------------------------- Ayan
export const cancelPO = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const { actionBy, cancellationRemarks } = req.body;
        if (!actionBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "actionBy (keycloakId) is required in the request body")
            );
        }
        const actionUser = await resolveUserByKeycloak(actionBy, companyId);
        if (!actionUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${actionBy}`)
            );
        }
        const po = await PurchaseOrder.findOne({ _id: poId, projectId, companyId, isDeleted: false });
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (po.status !== "Approved") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot cancel a PO in '${po.status}' status. Only Approved POs can be cancelled`
                )
            );
        }
        po.status = "Cancelled";
        po.cancelledBy = actionUser._id;
        po.cancelledAt = new Date();
        po.cancellationRemarks = cancellationRemarks?.trim() || null;
        po.updatedBy = actionUser._id;
        await po.save({ session });
        await reverseExpenseEntry({
            sourceModel: "PurchaseOrder",
            sourceId: po._id,
            reversedBy: actionUser._id,
            reversalReason: `PO ${po.poNumber} cancelled — commitment reversed`,
        }, session);
        await session.commitTransaction();
        session.endSession();
        await pushDprEvent({
            companyId,
            projectId: po.projectId,
            actorId: actionUser._id,
            module: "PurchaseOrder",
            action: "POCancelled",
            refId: po._id,
            refNumber: po.poNumber,
            details: {
                poNumber: po.poNumber,
                vendorName: po.vendorName,
                cancelledAt: po.cancelledAt,
                cancellationRemarks: po.cancellationRemarks || null,
                totalOrderValue: po.totalOrderValue,
                status: po.status,
            },
            eventAt: new Date(),
        });
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("PO cancelled", { poId: po._id, poNumber: po.poNumber });
        return res.status(200).json(
            new ApiResponse(200, { po }, "PO Cancelled", `Purchase Order ${po.poNumber} has been cancelled`)
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("cancelPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Server Error", "Failed to cancel Purchase Order", [error.message]));
    }
};


// This function soft deletes a PO. takes x-company-id in headers, projectId and poId in params and deletedBy in body. allows deletion only in Draft or Rejected state and marks PO as deleted. -------------------------- Ayan
export const deletePO = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const { deletedBy } = req.body;
        if (!deletedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "deletedBy (keycloakId) is required in the request body")
            );
        }
        const deleterUser = await resolveUserByKeycloak(deletedBy, companyId);
        if (!deleterUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${deletedBy}`)
            );
        }
        const po = await PurchaseOrder.findOne({ _id: poId, projectId, companyId, isDeleted: false });
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (!["Draft", "Rejected"].includes(po.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Action",
                    `Cannot delete a PO in '${po.status}' status. Only Draft or Rejected POs can be deleted`
                )
            );
        }
        po.isDeleted = true;
        po.deletedAt = new Date();
        po.deletedBy = deleterUser._id;
        po.updatedBy = deleterUser._id;
        await po.save();
        logger.info("PO soft-deleted", { poId: po._id, poNumber: po.poNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, null, "PO Deleted", `Purchase Order ${po.poNumber} deleted successfully`)
        );
    } catch (error) {
        logger.error("deletePO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to delete Purchase Order", [error.message])
        );
    }
};



// This function returns MRs eligible for PO creation. takes x-company-id in headers and projectId in params. supports pagination and search (mrNumber, materialName) and returns MR items with PO coverage status. -------------------------- Ayan
export const getMRsPendingForPO = async (req, res) => {
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
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found with the given ID")
            );
        }
        const { page = 1, limit = 10, search = "" } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const mrFilter = {
            companyId,
            projectId,
            isDeleted: false,
            status: { $in: ["Approved", "ConvertedToPO"] },
        };
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");
            mrFilter.$or = [
                { mrNumber: regex },
                { "items.materialName": regex },
            ];
        }
        const [mrs, total] = await Promise.all([
            MaterialRequisition.find(mrFilter)
                .select("_id mrNumber status items requiredByDate reason createdAt")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            MaterialRequisition.countDocuments(mrFilter),
        ]);
        if (mrs.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { mrs: [], pagination: { total: 0, page: pageNumber, limit: pageSize, totalPages: 0, hasNext: false, hasPrev: false } },
                    "No MRs Found",
                    "No approved MRs available for PO creation in this project"
                )
            );
        }
        const mrIds = mrs.map((m) => m._id);
        const existingPOs = await PurchaseOrder.find(
            { companyId, mrId: { $in: mrIds }, isDeleted: false },
            { mrId: 1, "items.materialMasterId": 1 }
        ).lean();
        const coveredMap = {};
        existingPOs.forEach((po) => {
            const key = po.mrId.toString();
            if (!coveredMap[key]) coveredMap[key] = new Set();
            po.items.forEach((it) => coveredMap[key].add(it.materialMasterId.toString()));
        });
        const enrichedMRs = mrs.map((mr) => {
            const covered = coveredMap[mr._id.toString()] ?? new Set();
            const annotatedItems = (mr.items || []).map((item) => ({
                ...item,
                hasPO: covered.has(item.materialMasterId.toString()),
            }));
            const uncoveredCount = annotatedItems.filter((it) => !it.hasPO).length;
            return {
                ...mr,
                items: annotatedItems,
                uncoveredItemCount: uncoveredCount,
                allItemsCovered: uncoveredCount === 0,
            };
        });
        logger.info("MRs pending for PO fetched", { total, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mrs: enrichedMRs,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                "MRs Retrieved",
                `Fetched ${mrs.length} MR(s) available for PO creation`
            )
        );
    } catch (error) {
        logger.error("getMRsPendingForPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve MRs for PO creation", [error.message])
        );
    }
};


// This function returns all POs linked to a specific MR. takes x-company-id in headers, projectId and mrId in params. returns list of POs with enriched user data and material-wise ordered summary. -------------------------- Ayan
export const getPOsByMR = async (req, res) => {
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
        const { projectId, mrId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!mrId || !isValidObjectId(mrId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid MR ID", "Valid mrId is required in params")
            );
        }
        const mr = await MaterialRequisition.findOne({
            _id: mrId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("_id mrNumber status items")
            .lean();
        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID for this project")
            );
        }
        const pos = await PurchaseOrder.find({
            companyId,
            projectId,
            mrId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .sort({ createdAt: -1 })
            .lean();

        const enrichedPOs = await Promise.all(pos.map((po) => enrichPOUsers(po)));
        const materialSummary = {};
        enrichedPOs.forEach((po) => {
            po.items.forEach((item) => {
                const key = item.materialMasterId.toString();
                if (!materialSummary[key]) {
                    materialSummary[key] = {
                        materialMasterId: item.materialMasterId,
                        materialName: item.materialName,
                        unit: item.unit,
                        totalOrdered: 0,
                    };
                }
                materialSummary[key].totalOrdered += item.orderedQuantity;
            });
        });
        logger.info("POs by MR fetched", { mrId, projectId, companyId, count: pos.length });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mr: { _id: mr._id, mrNumber: mr.mrNumber, status: mr.status },
                    pos: enrichedPOs,
                    total: enrichedPOs.length,
                    materialSummary: Object.values(materialSummary),
                },
                pos.length > 0 ? "POs Retrieved" : "No POs Found",
                `Fetched ${enrichedPOs.length} Purchase Order(s) for MR ${mr.mrNumber}`
            )
        );
    } catch (error) {
        logger.error("getPOsByMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve Purchase Orders for this MR", [error.message])
        );
    }
};



// This function returns items of a specific PO. takes x-company-id in headers, projectId and poId in params. returns only the items array with material and quantity details, useful for item selection while creating a GRN. -------------------------- Ayan
export const getPOItems = async (req, res) => {
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
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const po = await PurchaseOrder.findOne({
            _id: poId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("poNumber status vendorId vendorName items totalOrderValue expectedDeliveryDate")
            .lean();
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID")
            );
        }
        if (!["Approved", "PartiallyDelivered"].includes(po.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid PO Status",
                    `Cannot fetch items from a PO in '${po.status}' status. Only Approved or PartiallyDelivered POs are eligible for GRN creation`
                )
            );
        }
        logger.info("PO items fetched", { poId, projectId, companyId, itemCount: po.items.length });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    poId: po._id,
                    poNumber: po.poNumber,
                    status: po.status,
                    vendorId: po.vendorId,
                    vendorName: po.vendorName,
                    expectedDeliveryDate: po.expectedDeliveryDate,
                    items: po.items,
                    totalItems: po.items.length,
                    totalOrderValue: po.totalOrderValue,
                },
                "PO Items Retrieved",
                `Fetched ${po.items.length} item(s) from PO ${po.poNumber}`
            )
        );
    } catch (error) {
        logger.error("getPOItems failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve PO items", [error.message])
        );
    }
};


// Lightweight PO Lookup  -------------------------------------------- @Ayan
export const getPOLookup = async (req, res) => {
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
        const { projectId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        const { search = "" } = req.query;
        const filter = {
            companyId,
            projectId,
            isDeleted: false,
            status: { $in: ["Approved", "PartiallyDelivered"] },
        };
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { poNumber: searchRegex },
                { vendorName: searchRegex },
                { "items.materialName": searchRegex },
            ];
        }
        const pos = await PurchaseOrder.find(filter)
            .select("_id poNumber status vendorId vendorName expectedDeliveryDate items totalOrderValue")
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    pos: pos.map((po) => ({
                        poId: po._id,
                        poNumber: po.poNumber,
                        status: po.status,
                        vendorId: po.vendorId,
                        vendorName: po.vendorName,
                        expectedDeliveryDate: po.expectedDeliveryDate,
                        itemCount: po.items?.length ?? 0,
                        totalOrderValue: po.totalOrderValue,
                    })),
                    total: pos.length,
                },
                "PO Lookup Retrieved",
                `Fetched ${pos.length} PO(s) available for GRN creation`
            )
        );
    } catch (error) {
        logger.error("getPOLookup failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve PO lookup", [error.message])
        );
    }
};

// This function calculates and returns the global PO summary for the company. -------------------------- Sundar
export const getGlobalPOSummary = async (req, res) => {
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
        const baseFilter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        const now = new Date();
        const [agg] = await PurchaseOrder.aggregate([
            { $match: baseFilter },
            {
                $facet: {
                    statusCounts: [
                        {
                            $group: {
                                _id: "$status",
                                count: { $sum: 1 },
                            },
                        },
                    ],
                    totalOrderValue: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$totalOrderValue" },
                            },
                        },
                    ],
                    totalOrderedQty: [
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$items.orderedQuantity" },
                            },
                        },
                    ],
                    totalReceivedQty: [
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$items.receivedQuantity" },
                            },
                        },
                    ],
                    activeProjects: [
                        {
                            $group: { _id: "$projectId" },
                        },
                        { $count: "count" },
                    ],
                    delayedOrders: [
                        {
                            $match: {
                                status: {
                                    $in: ["Submitted", "Approved", "PartiallyDelivered"],
                                },
                                expectedDeliveryDate: { $ne: null, $lt: now },
                            },
                        },
                        { $count: "count" },
                    ],
                    avgApprovalTime: [
                        {
                            $match: {
                                status: {
                                    $in: ["Approved", "PartiallyDelivered", "Completed"],
                                },
                                submittedAt: { $ne: null },
                                approvedAt: { $ne: null },
                            },
                        },
                        {
                            $project: {
                                diffMs: {
                                    $subtract: ["$approvedAt", "$submittedAt"],
                                },
                            },
                        },
                        {
                            $match: { diffMs: { $gt: 0 } },
                        },
                        {
                            $group: {
                                _id: null,
                                avgMs: { $avg: "$diffMs" },
                            },
                        },
                    ],
                    totalVendors: [
                        {
                            $group: { _id: "$vendorId" },
                        },
                        { $count: "count" },
                    ],
                },
            },
        ]);
        const statusMap = {};
        (agg?.statusCounts || []).forEach(({ _id, count }) => {
            statusMap[_id] = count;
        });
        const draftPOs = statusMap["Draft"] || 0;
        const pendingPOs = statusMap["Submitted"] || 0;
        const approvedPOs = statusMap["Approved"] || 0;
        const rejectedPOs = statusMap["Rejected"] || 0;
        const cancelledPOs = statusMap["Cancelled"] || 0;
        const partiallyDeliveredPOs = statusMap["PartiallyDelivered"] || 0;
        const completedPOs = statusMap["Completed"] || 0;
        const totalPOs =
            draftPOs +
            pendingPOs +
            approvedPOs +
            rejectedPOs +
            cancelledPOs +
            partiallyDeliveredPOs +
            completedPOs;
        const totalOrderValue = agg?.totalOrderValue?.[0]?.total ?? 0;
        const totalOrderedQty = agg?.totalOrderedQty?.[0]?.total ?? 0;
        const totalReceivedQty = agg?.totalReceivedQty?.[0]?.total ?? 0;
        const activeProjects = agg?.activeProjects?.[0]?.count ?? 0;
        const delayedOrders = agg?.delayedOrders?.[0]?.count ?? 0;
        const totalVendors = agg?.totalVendors?.[0]?.count ?? 0;
        const fulfilmentRate =
            totalOrderedQty > 0
                ? Math.round((totalReceivedQty / totalOrderedQty) * 1000) / 10
                : 0;
        const avgMs = agg?.avgApprovalTime?.[0]?.avgMs ?? null;
        const avgApprovalTimeDays =
            avgMs !== null
                ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
                : null;
        logger.info("Global PO summary fetched", { companyId, totalPOs });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalPOs,
                        draftPOs,
                        pendingPOs,
                        approvedPOs,
                        rejectedPOs,
                        cancelledPOs,
                        partiallyDeliveredPOs,
                        completedPOs,
                        totalOrderValue: Math.round(totalOrderValue * 100) / 100,
                        totalOrderedQty: Math.round(totalOrderedQty * 1000) / 1000,
                        totalReceivedQty: Math.round(totalReceivedQty * 1000) / 1000,
                        fulfilmentRate,
                        activeProjects,
                        delayedOrders,
                        totalVendors,
                        avgApprovalTimeDays,
                    },
                },
                "Global PO Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalPOSummary failed", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to fetch global PO summary",
                [error.message]
            )
        );
    }
};


export const getAllPOsGlobal = async (req, res) => {
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
            status,
            projectId,
            vendorId,
            mrId,
            sortBy = "createdAt",
            order = "desc",
            dateFrom,
            dateTo,
            lastId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const validStatuses = [
            "Draft",
            "Submitted",
            "Approved",
            "Rejected",
            "PartiallyDelivered",
            "Completed",
            "Cancelled",
        ];
        const allowedSortFields = ["createdAt", "poNumber", "expectedDeliveryDate", "totalOrderValue"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        if (status && validStatuses.includes(status)) {
            filter.status = status;
        }
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Project ID",
                        "projectId query param must be a valid ObjectId"
                    )
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (vendorId) {
            if (!isValidObjectId(vendorId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid Vendor ID",
                        "vendorId query param must be a valid ObjectId"
                    )
                );
            }
            filter.vendorId = new mongoose.Types.ObjectId(vendorId);
        }
        if (mrId) {
            if (!isValidObjectId(mrId)) {
                return res.status(400).json(
                    new ApiErrors(
                        400,
                        "Invalid MR ID",
                        "mrId query param must be a valid ObjectId"
                    )
                );
            }
            filter.mrId = new mongoose.Types.ObjectId(mrId);
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (isNaN(from)) {
                    return res.status(400).json(
                        new ApiErrors(
                            400,
                            "Invalid Date",
                            "dateFrom must be a valid ISO date string"
                        )
                    );
                }
                filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (isNaN(to)) {
                    return res.status(400).json(
                        new ApiErrors(
                            400,
                            "Invalid Date",
                            "dateTo must be a valid ISO date string"
                        )
                    );
                }
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }

        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { poNumber: searchRegex },
                { "items.materialName": searchRegex },
            ];
        }
        const useCursor =
            lastId && isValidObjectId(lastId) && sortField === "createdAt";
        const countFilter = { ...filter };
        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id =
                sortOrder === -1
                    ? { $lt: cursorObjectId }
                    : { $gt: cursorObjectId };
        }
        const poQuery = PurchaseOrder.find(filter)
            .select("-__v -isDeleted")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);
        if (!useCursor) {
            poQuery.skip((pageNumber - 1) * pageSize);
        }
        const [pos, total] = await Promise.all([
            poQuery.lean(),
            PurchaseOrder.countDocuments(countFilter),
        ]);
        if (pos.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        pos: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false,
                            nextCursor: null,
                        },
                    },
                    "No POs Found",
                    "No purchase orders matched the given filters"
                )
            );
        }
        const uniqueProjectIds = [
            ...new Set(pos.map((p) => p.projectId?.toString()).filter(Boolean)),
        ];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });
        const uniqueVendorIds = [
            ...new Set(pos.map((p) => p.vendorId?.toString()).filter(Boolean)),
        ];
        const vendors = await Vendor.find(
            { _id: { $in: uniqueVendorIds }, isDeleted: false },
            { _id: 1, name: 1, contactPerson: 1, phone: 1 }
        ).lean();
        const vendorMap = {};
        vendors.forEach((v) => {
            vendorMap[v._id.toString()] = {
                vendorId: v._id,
                name: v.name || "Unknown Vendor",
                contactPerson: v.contactPerson ?? null,
                phone: v.phone ?? null,
            };
        });
        const uniqueUserIds = [
            ...new Set(pos.map((p) => p.createdBy?.toString()).filter(Boolean)),
        ];
        const userEnrichmentMap = {};
        await Promise.all(
            uniqueUserIds.map(async (uid) => {
                userEnrichmentMap[uid] = await enrichUser(
                    new mongoose.Types.ObjectId(uid)
                );
            })
        );
        const now = new Date();
        const shaped = pos.map((po) => {
            const materials = (po.items || []).map((it) => it.materialName);
            const totalItems = po.items?.length ?? 0;
            const totalOrderedQty =
                Math.round(
                    (po.items || []).reduce((sum, it) => sum + (it.orderedQuantity || 0), 0) * 1000
                ) / 1000;
            const totalReceivedQty =
                Math.round(
                    (po.items || []).reduce((sum, it) => sum + (it.receivedQuantity || 0), 0) * 1000
                ) / 1000;
            const totalOrderValue =
                Math.round(
                    (po.items || []).reduce((sum, it) => sum + (it.totalPrice || 0), 0) * 100
                ) / 100;
            const fulfilmentRate =
                totalOrderedQty > 0
                    ? Math.round((totalReceivedQty / totalOrderedQty) * 1000) / 10
                    : 0;
            const isDelayed =
                po.expectedDeliveryDate != null &&
                new Date(po.expectedDeliveryDate) < now &&
                ["Submitted", "Approved", "PartiallyDelivered"].includes(po.status);
            let grnStatus;
            switch (po.status) {
                case "Completed":
                    grnStatus = "GRN Completed";
                    break;
                case "PartiallyDelivered":
                    grnStatus = "GRN Partial";
                    break;
                case "Approved":
                    grnStatus = "GRN Pending";
                    break;
                case "Cancelled":
                    grnStatus = "GRN Cancelled";
                    break;
                default:
                    grnStatus = "Not Applicable";
            }
            const requestedBy = userEnrichmentMap[po.createdBy?.toString()] ?? null;
            return {
                poId: po._id,
                poNumber: po.poNumber,
                projectId: po.projectId,
                projectName: projectMap[po.projectId?.toString()] ?? "Unknown Project",
                mrId: po.mrId ?? null,
                vendor: vendorMap[po.vendorId?.toString()] ?? null,
                materials,
                totalItems,
                totalOrderedQty,
                totalReceivedQty,
                totalOrderValue,
                fulfilmentRate,
                status: po.status,
                grnStatus,
                isDelayed,
                expectedDeliveryDate: po.expectedDeliveryDate ?? null,
                requestedBy,
                paymentTerms: po.paymentTerms ?? null,
                specialInstructions: po.specialInstructions ?? null,
                rejectionRemarks: po.rejectionRemarks ?? null,
                cancellationRemarks: po.cancellationRemarks ?? null,
                createdAt: po.createdAt,
                submittedAt: po.submittedAt ?? null,
                approvedAt: po.approvedAt ?? null,
                cancelledAt: po.cancelledAt ?? null,
                completedAt: po.completedAt ?? null,
            };
        });
        const hasNextPage = pos.length === pageSize;
        const nextCursor = hasNextPage ? pos[pos.length - 1]._id : null;
        logger.info("Global POs fetched", {
            companyId,
            total,
            returned: pos.length,
            page: pageNumber,
            filters: { status, projectId, vendorId, mrId, search, dateFrom, dateTo },
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    pos: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                "Global POs Retrieved",
                `Fetched ${shaped.length} purchase order(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllPOsGlobal failed", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Server Error",
                "Failed to retrieve global POs",
                [error.message]
            )
        );
    }
};




export const getGlobalPOLookup = async (req, res) => {
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
        const { search = "", projectId, vendorId } = req.query;
        const filter = {
            companyId,
            isDeleted: false,
            status: { $in: ["Approved", "PartiallyDelivered"] },
        };
        if (projectId && isValidObjectId(projectId)) {
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (vendorId && isValidObjectId(vendorId)) {
            filter.vendorId = new mongoose.Types.ObjectId(vendorId);
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { poNumber: searchRegex },
                { vendorName: searchRegex },
                { "items.materialName": searchRegex },
            ];
        }
        const pos = await PurchaseOrder.find(filter)
            .select("_id poNumber status vendorId vendorName projectId expectedDeliveryDate items totalOrderValue")
            .sort({ createdAt: -1 })
            .lean();
        const uniqueProjectIds = [...new Set(pos.map((p) => p.projectId?.toString()).filter(Boolean))];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => { projectMap[p._id.toString()] = p.projectName; });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    pos: pos.map((po) => ({
                        poId: po._id,
                        poNumber: po.poNumber,
                        status: po.status,
                        vendorId: po.vendorId,
                        vendorName: po.vendorName,
                        projectId: po.projectId,
                        projectName: projectMap[po.projectId?.toString()] || null,
                        expectedDeliveryDate: po.expectedDeliveryDate,
                        itemCount: po.items?.length ?? 0,
                        totalOrderValue: po.totalOrderValue,
                    })),
                    total: pos.length,
                },
                "Global PO Lookup Retrieved",
                `Fetched ${pos.length} PO(s) available across all projects`
            )
        );
    } catch (error) {
        logger.error("getGlobalPOLookup failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global PO lookup", [error.message])
        );
    }
};