import mongoose from "mongoose";
import GRN from "../models/grn.models.js";
import PurchaseOrder from "../models/purchaseOrder.models.js";
import MaterialRequisition from "../models/materialRequisition.models.js";
import Inventory from "../models/inventory.models.js";
import Project from "../models/project.models.js";
import Payable from "../models/payable.models.js";
import Vendor from "../models/vendors.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import { isValidObjectId, resolveCompany, resolveUserByKeycloak, generateGRNNumber, processGRNItems, checkStockRollbackSafety, checkDuplicateChallan, uploadGRNAttachment, deleteGRNAttachment, recalculatePOAfterGRN, enrichGRNUsers, computeGRNTotal } from "../helpers/grnHelper.js";
import { createExpenseEntry, updateGRNExpenseAmount, calcGRNExpenseAmount, recalcProjectHealth, reverseExpenseEntry, reducePOCommitmentByGRN } from "../helpers/expenseHelper.js";
import Expense from "../models/expense.models.js";
import { generateGRNPdf } from "../helpers/grnPdfGenerator.js";
import { pushDprEvent } from "../helpers/dprHelper.js";
import { createPayableFromGRN, syncPayableAmountForGRN, reversePayable } from "../helpers/payableHelper.js";
import { enrichUser } from "../helpers/poHelper.js";
import NotificationService from "../services/notification.service.js";




// This function creates a new goods receipt note (GRN). takes x-company-id in headers, projectId and poId in params and createdBy, deliveryDate, vehicleNumber, deliveryChallanNumber, deliveryChallanDate, remarks, items and optional attachment in body. validates PO status, processes items, updates inventory stock, recalculates PO status and stores GRN within a transaction. -------------------------- Ayan
export const createGRN = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, poId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!poId || !isValidObjectId(poId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid PO ID", "Valid poId is required in params")
            );
        }
        const {
            createdBy,
            deliveryDate,
            vehicleNumber,
            deliveryChallanNumber,
            deliveryChallanDate,
            remarks,
        } = req.body;
        let items;
        try {
            items = typeof req.body.items === "string"
                ? JSON.parse(req.body.items)
                : req.body.items;
        } catch {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Items Format", "items must be a valid JSON array")
            );
        }
        const missing = [];
        if (!createdBy?.trim()) missing.push("createdBy");
        if (!deliveryDate) missing.push("deliveryDate");
        if (!Array.isArray(items) || items.length === 0) missing.push("items (must be a non-empty array)");
        if (missing.length > 0) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`)
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, companyId);
        if (!creatorUser) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        const project = await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
        if (!project) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No active project found for this company")
            );
        }
        const po = await PurchaseOrder.findOne({
            _id: poId,
            projectId,
            companyId,
            isDeleted: false,
        }).session(session).lean();
        if (!po) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID for this project")
            );
        }
        if (!["Approved", "PartiallyDelivered"].includes(po.status)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid PO Status",
                    `Cannot create a GRN against a PO in '${po.status}' status. Only Approved or PartiallyDelivered POs can receive goods`
                )
            );
        }
        const challanError = await checkDuplicateChallan(
            deliveryChallanNumber,
            companyId,
            po.vendorId
        );
        if (challanError) {
            await session.abortTransaction(); session.endSession();
            return res.status(challanError.statusCode).json(challanError);
        }
        const { processedItems, error } = await processGRNItems(
            items,
            projectId,
            companyId,
            po
        );
        if (error) {
            await session.abortTransaction(); session.endSession();
            return res.status(error.statusCode).json(error);
        }
        let attachment = null;
        if (req.file) {
            try {
                attachment = await uploadGRNAttachment(req.file, creatorUser._id);
            } catch (uploadErr) {
                await session.abortTransaction(); session.endSession();
                logger.error("GRN attachment upload failed", { message: uploadErr.message });
                return res.status(500).json(
                    new ApiErrors(500, "Upload Failed", "Failed to upload attachment. Please try again.")
                );
            }
        }
        const grnNumber = await generateGRNNumber(companyId);
        let grn;
        try {
            [grn] = await GRN.create(
                [
                    {
                        companyId,
                        projectId,
                        poId: po._id,
                        mrId: po.mrId,
                        vendorId: po.vendorId,
                        vendorName: po.vendorName,
                        grnNumber,
                        deliveryDate: new Date(deliveryDate),
                        vehicleNumber: vehicleNumber?.trim() || null,
                        deliveryChallanNumber: deliveryChallanNumber?.trim() || null,
                        deliveryChallanDate: deliveryChallanDate ? new Date(deliveryChallanDate) : null,
                        items: processedItems,
                        remarks: remarks?.trim() || null,
                        attachment,
                        createdBy: creatorUser._id,
                    },
                ],
                { session }
            );
        } catch (dbErr) {
            if (attachment) await deleteGRNAttachment(attachment);
            await session.abortTransaction(); session.endSession();
            throw dbErr;
        }
        for (const item of processedItems) {
            await Inventory.findByIdAndUpdate(
                item.inventoryId,
                {
                    $inc: {
                        currentStock: item.receivedQuantity,
                        totalReceived: item.receivedQuantity,
                    },
                    $set: { lastRestockedAt: new Date() },
                },
                { session, runValidators: false }
            );
        }
        await recalculatePOAfterGRN(po._id, companyId, session);
        const grnExpenseAmount = calcGRNExpenseAmount(processedItems, po.items);
        if (grnExpenseAmount > 0) {
            await createExpenseEntry({
                companyId,
                projectId: new mongoose.Types.ObjectId(projectId),
                type: "GRN_Actual",
                category: "Material",
                status: "Actual",
                amount: grnExpenseAmount,
                description: `GRN ${grnNumber} — materials received against PO ${po.poNumber}`,
                expenseDate: grn.deliveryDate || new Date(),
                sourceModel: "GRN",
                sourceId: grn._id,
                sourceNumber: grnNumber,
                vendorId: po.vendorId,
                vendorName: po.vendorName,
                createdBy: creatorUser._id,
            }, session);

            await reducePOCommitmentByGRN({
                poId: po._id,
                grnAmount: grnExpenseAmount,
                companyId,
                session,
            });
        }
        await session.commitTransaction();
        session.endSession();
        if (grnExpenseAmount > 0) {
            createPayableFromGRN({
                grn,
                amount: grnExpenseAmount,
                po,
            }).catch((err) =>
                logger.error("createPayableFromGRN failed (non-critical)", { grnId: grn._id, error: err.message })
            );
        }
        const projectForNotif = await Project.findById(grn.projectId).select("projectName").lean();
        NotificationService.notifyGRNCreated({
            companyId,
            projectId: grn.projectId,
            projectName: projectForNotif?.projectName || grn.grnNumber,
            grnNumber: grn.grnNumber,
            grnId: grn._id,
        }).catch(err => logger.error("notifyGRNCreated failed (non-fatal)", { error: err.message }));
        await pushDprEvent({
            companyId,
            projectId: grn.projectId,
            actorId: creatorUser._id,
            module: "GRN",
            action: "GRNCreated",
            refId: grn._id,
            refNumber: grn.grnNumber,
            details: {
                grnNumber: grn.grnNumber,
                poId: po._id,
                poNumber: po.poNumber,
                vendorName: po.vendorName,
                deliveryChallanNumber: grn.deliveryChallanNumber,
                deliveryDate: grn.deliveryDate,
                itemCount: grn.items.length,
                totalReceivedQuantity: grn.items.reduce(
                    (sum, item) => sum + item.receivedQuantity,
                    0
                ),
                totalAmount: grnExpenseAmount,
                materials: grn.items.map((item) => ({
                    materialName: item.materialName,
                    receivedQuantity: item.receivedQuantity,
                    unit: item.unit,
                })),
            },
            eventAt: new Date(),
        });
        const updatedPO = await PurchaseOrder.findById(po._id)
            .select("status poNumber")
            .lean();
        if (updatedPO?.status === "PartiallyDelivered") {
            await pushDprEvent({
                companyId,
                projectId,
                actorId: creatorUser._id,
                module: "PurchaseOrder",
                action: "POPartiallyDelivered",
                refId: po._id,
                refNumber: po.poNumber,
                details: {
                    poNumber: po.poNumber,
                    grnNumber: grn.grnNumber,
                    status: updatedPO.status,
                },
                eventAt: new Date(),
            });
        }

        if (updatedPO?.status === "Completed") {
            await pushDprEvent({
                companyId,
                projectId,
                actorId: creatorUser._id,
                module: "PurchaseOrder",
                action: "POCompleted",
                refId: po._id,
                refNumber: po.poNumber,
                details: {
                    poNumber: po.poNumber,
                    grnNumber: grn.grnNumber,
                    status: updatedPO.status,
                },
                eventAt: new Date(),
            });
        }
        recalcProjectHealth(projectId, companyId).catch(() => { });
        logger.info("GRN created", {
            grnId: grn._id,
            grnNumber,
            poId: po._id,
            projectId,
            companyId,
        });
        return res.status(201).json(
            new ApiResponse(201, { grn }, "GRN Created", `Goods Receipt Note ${grnNumber} created successfully`)
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("createGRN failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to create GRN", [error.message])
        );
    }
};


// This function returns all GRNs for a project. takes x-company-id in headers and projectId in params. supports pagination, search (grnNumber, vendorName, materialName, challanNumber), filtering (poId, vendorId) and sorting with enriched user data. -------------------------- Ayan
export const getAllGRNs = async (req, res) => {
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
            poId: filterPoId,
            vendorId: filterVendorId,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const allowedSortFields = ["createdAt", "grnNumber", "deliveryDate"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, projectId, isDeleted: false };
        if (filterPoId && isValidObjectId(filterPoId)) {
            filter.poId = new mongoose.Types.ObjectId(filterPoId);
        }
        if (filterVendorId && isValidObjectId(filterVendorId)) {
            filter.vendorId = new mongoose.Types.ObjectId(filterVendorId);
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { grnNumber: searchRegex },
                { vendorName: searchRegex },
                { "items.materialName": searchRegex },
                { deliveryChallanNumber: searchRegex },
            ];
        }
        const [grns, total] = await Promise.all([
            GRN.find(filter)
                .select("-__v -isDeleted -deletedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            GRN.countDocuments(filter),
        ]);
        const poIds = [...new Set(grns.map((g) => g.poId.toString()))];
        const relatedPOs = await PurchaseOrder.find(
            { _id: { $in: poIds }, isDeleted: false },
            { poNumber: 1, items: 1 }
        ).lean();
        const poMap = Object.fromEntries(relatedPOs.map((po) => [po._id.toString(), po]));
        const enrichedGRNs = await Promise.all(
            grns.map(async (grn) => {
                const enriched = await enrichGRNUsers(grn);
                const po = poMap[grn.poId.toString()];
                return {
                    ...enriched,
                    poNumber: po?.poNumber ?? null,
                    totalAmount: po ? computeGRNTotal(grn.items, po.items) : null,
                };
            })
        );
        logger.info("GRNs fetched", { total, page: pageNumber, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    grns: enrichedGRNs,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNext: pageNumber < Math.ceil(total / pageSize),
                        hasPrev: pageNumber > 1,
                    },
                },
                total > 0 ? "GRNs Retrieved" : "No GRNs Found",
                `Fetched ${grns.length} goods receipt note(s)`
            )
        );
    } catch (error) {
        logger.error("getAllGRNs failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve GRNs", [error.message])
        );
    }
};



// This function fetches a specific GRN by ID. takes x-company-id in headers, projectId and grnId in params. returns complete GRN details with enriched user information. -------------------------- Ayan
export const getSingleGRN = async (req, res) => {
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
        const { projectId, grnId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!grnId || !isValidObjectId(grnId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid GRN ID", "Valid grnId is required in params")
            );
        }
        const grn = await GRN.findOne({
            _id: grnId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted")
            .lean();
        if (!grn) {
            return res.status(404).json(
                new ApiErrors(404, "GRN Not Found", "No GRN found with the given ID")
            );
        }
        const enrichedGRN = await enrichGRNUsers(grn);
        const po = await PurchaseOrder.findOne(
            { _id: grn.poId, isDeleted: false },
            { poNumber: 1, items: 1 }
        ).lean();
        const enrichedGRNWithPO = {
            ...enrichedGRN,
            poNumber: po?.poNumber ?? null,
            totalAmount: po ? computeGRNTotal(grn.items, po.items) : null,
        };
        logger.info("GRN fetched", { grnId, projectId, companyId });
        return res.status(200).json(
            new ApiResponse(200, { grn: enrichedGRNWithPO }, "GRN Retrieved", "Goods Receipt Note fetched successfully")
        );
    } catch (error) {
        logger.error("getSingleGRN failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve GRN", [error.message])
        );
    }
};



// This function updates a GRN. takes x-company-id in headers, projectId and grnId in params and editable fields like deliveryDate, items, vehicleNumber, deliveryChallanNumber, deliveryChallanDate, remarks and updatedBy with optional attachment in body. handles stock rollback and re-update, validates challan uniqueness and recalculates PO within a transaction. -------------------------- Ayan
export const editGRN = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, grnId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!grnId || !isValidObjectId(grnId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid GRN ID", "Valid grnId is required in params")
            );
        }
        const { updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required in the request body")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, companyId);
        if (!editorUser) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const grn = await GRN.findOne({
            _id: grnId,
            projectId,
            companyId,
            isDeleted: false,
        }).session(session);
        if (!grn) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "GRN Not Found", "No GRN found with the given ID")
            );
        }
        const EDITABLE = ["deliveryDate", "items", "vehicleNumber", "deliveryChallanNumber", "deliveryChallanDate", "remarks"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        const hasNewFile = !!req.file;
        if (provided.length === 0 && !hasNewFile) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field or a new attachment to update")
            );
        }
        const updates = { updatedBy: editorUser._id };
        if (req.body.items !== undefined) {
            let items;
            try {
                items = typeof req.body.items === "string"
                    ? JSON.parse(req.body.items)
                    : req.body.items;
            } catch {
                await session.abortTransaction(); session.endSession();
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Items Format", "items must be a valid JSON array")
                );
            }
            if (!Array.isArray(items) || items.length === 0) {
                await session.abortTransaction(); session.endSession();
                return res.status(400).json(
                    new ApiErrors(400, "Validation Error", "A GRN must contain at least one item")
                );
            }
            const po = await PurchaseOrder.findOne({
                _id: grn.poId,
                companyId,
                isDeleted: false,
            }).session(session).lean();
            if (!po) {
                await session.abortTransaction(); session.endSession();
                return res.status(404).json(
                    new ApiErrors(404, "PO Not Found", "The Purchase Order linked to this GRN no longer exists")
                );
            }
            const rollbackError = await checkStockRollbackSafety(grn.items, companyId, session);
            if (rollbackError) {
                await session.abortTransaction(); session.endSession();
                return res.status(rollbackError.statusCode).json(rollbackError);
            }
            for (const oldItem of grn.items) {
                await Inventory.findByIdAndUpdate(
                    oldItem.inventoryId,
                    {
                        $inc: {
                            currentStock: -oldItem.receivedQuantity,
                            totalReceived: -oldItem.receivedQuantity,
                        },
                    },
                    { session, runValidators: false }
                );
            }
            const { processedItems, error } = await processGRNItems(
                items,
                projectId,
                companyId,
                po,
                grn._id
            );
            if (error) {
                await session.abortTransaction(); session.endSession();
                return res.status(error.statusCode).json(error);
            }
            for (const newItem of processedItems) {
                await Inventory.findByIdAndUpdate(
                    newItem.inventoryId,
                    {
                        $inc: {
                            currentStock: newItem.receivedQuantity,
                            totalReceived: newItem.receivedQuantity,
                        },
                        $set: { lastRestockedAt: new Date() },
                    },
                    { session, runValidators: false }
                );
            }

            updates.items = processedItems;
        }
        if (req.body.deliveryChallanNumber !== undefined) {
            const newChallan = req.body.deliveryChallanNumber?.trim() || null;
            if (newChallan && newChallan !== grn.deliveryChallanNumber) {
                const challanError = await checkDuplicateChallan(
                    newChallan,
                    companyId,
                    grn.vendorId,
                    grn._id
                );
                if (challanError) {
                    await session.abortTransaction(); session.endSession();
                    return res.status(challanError.statusCode).json(challanError);
                }
            }
            updates.deliveryChallanNumber = newChallan;
        }
        if (req.body.deliveryDate !== undefined) {
            updates.deliveryDate = new Date(req.body.deliveryDate);
        }
        if (req.body.vehicleNumber !== undefined) {
            updates.vehicleNumber = req.body.vehicleNumber?.trim() || null;
        }
        if (req.body.deliveryChallanDate !== undefined) {
            updates.deliveryChallanDate = req.body.deliveryChallanDate
                ? new Date(req.body.deliveryChallanDate)
                : null;
        }
        if (req.body.remarks !== undefined) {
            updates.remarks = req.body.remarks?.trim() || null;
        }
        let newAttachment = null;
        const oldAttachment = grn.attachment;
        if (hasNewFile) {
            try {
                newAttachment = await uploadGRNAttachment(req.file, editorUser._id);
            } catch (uploadErr) {
                await session.abortTransaction(); session.endSession();
                logger.error("GRN attachment upload failed on edit", { message: uploadErr.message });
                return res.status(500).json(
                    new ApiErrors(500, "Upload Failed", "Failed to upload attachment. Please try again.")
                );
            }
            updates.attachment = newAttachment;
        }
        let updatedGRN;
        try {
            updatedGRN = await GRN.findByIdAndUpdate(
                grnId,
                { $set: updates },
                { new: true, runValidators: true, session }
            )
                .select("-__v -isDeleted")
                .lean();
        } catch (dbErr) {
            if (newAttachment) await deleteGRNAttachment(newAttachment);
            await session.abortTransaction(); session.endSession();
            throw dbErr;
        }
        await recalculatePOAfterGRN(grn.poId, companyId, session);
        let updatedExpense = null;
        if (req.body.items !== undefined) {
            const oldExpense = await Expense.findOne(
                {
                    sourceModel: "GRN",
                    sourceId: new mongoose.Types.ObjectId(grnId),
                    status: "Actual",
                    isDeleted: false
                },
                { amountSnapshot: 1 },
                { session }
            ).lean();
            const oldAmount = oldExpense?.amountSnapshot || 0;
            updatedExpense = await updateGRNExpenseAmount({
                grnId: grnId,
                grnItems: updates.items,
                poId: grn.poId,
                companyId,
                updatedBy: editorUser._id,
                session,
            });
            const newAmount = updatedExpense?.amount || 0;
            const diff = newAmount - oldAmount;
            if (diff !== 0) {
                await reducePOCommitmentByGRN({
                    poId: grn.poId,
                    grnAmount: diff,
                    companyId,
                    session,
                });
            }
        }
        await session.commitTransaction();
        session.endSession();
        if (req.body.items !== undefined) {
            const newGrnTotal = updatedExpense?.amount ?? 0;
            if (newGrnTotal > 0) {
                syncPayableAmountForGRN({
                    grnId,
                    newAmount: newGrnTotal,
                    grnNumber: updatedGRN.grnNumber,
                }).catch((err) =>
                    logger.error("syncPayableAmountForGRN failed (non-critical)", { grnId, error: err.message })
                );
            }
        }
        recalcProjectHealth(projectId, companyId).catch(() => { });
        if (hasNewFile && oldAttachment) {
            await deleteGRNAttachment(oldAttachment);
        }
        logger.info("GRN edited", {
            grnId,
            projectId,
            companyId,
            updatedFields: Object.keys(updates),
            itemsChanged: req.body.items !== undefined,
            attachmentReplaced: hasNewFile,
        });
        return res.status(200).json(
            new ApiResponse(200, { grn: updatedGRN }, "GRN Updated", `Goods Receipt Note ${updatedGRN.grnNumber} updated successfully`)
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("editGRN failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to update GRN", [error.message])
        );
    }
};



export const deleteGRN = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "No active company found")
            );
        }
        const companyId = company._id;
        const { projectId, grnId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!grnId || !isValidObjectId(grnId)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Invalid GRN ID", "Valid grnId is required in params")
            );
        }
        const { deletedBy } = req.body;
        if (!deletedBy?.trim()) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "deletedBy (keycloakId) is required in the request body")
            );
        }
        const deleterUser = await resolveUserByKeycloak(deletedBy, companyId);
        if (!deleterUser) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${deletedBy}`)
            );
        }
        const grn = await GRN.findOne({
            _id: grnId,
            projectId,
            companyId,
            isDeleted: false,
        }).session(session);

        if (!grn) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json(
                new ApiErrors(404, "GRN Not Found", "No GRN found with the given ID")
            );
        }
        const linkedPayable = await Payable.findOne({
            sourceType: "GRN",
            sourceId: grn._id,
            status: { $in: ["Paid", "PartiallyPaid"] },
        }).lean();
        if (linkedPayable) {
            await session.abortTransaction(); session.endSession();
            const statusLabel = linkedPayable.status === "Paid" ? "fully paid" : "partially paid";
            return res.status(400).json(
                new ApiErrors(
                    400, "Deletion Not Allowed", `GRN ${grn.grnNumber} cannot be deleted because its linked payable (${linkedPayable.payableNumber}) has already been ${statusLabel}. Please reverse or adjust the payment before deleting this GRN.`
                )
            );
        }
        const rollbackError = await checkStockRollbackSafety(grn.items, companyId, session);
        if (rollbackError) {
            await session.abortTransaction(); session.endSession();
            return res.status(rollbackError.statusCode).json(rollbackError);
        }
        for (const item of grn.items) {
            await Inventory.findByIdAndUpdate(
                item.inventoryId,
                {
                    $inc: {
                        currentStock: -item.receivedQuantity,
                        totalReceived: -item.receivedQuantity,
                    },
                },
                { session, runValidators: false }
            );
        }
        grn.isDeleted = true;
        grn.deletedAt = new Date();
        grn.deletedBy = deleterUser._id;
        grn.updatedBy = deleterUser._id;
        await grn.save({ session });
        const grnExpense = await Expense.findOne(
            { sourceModel: "GRN", sourceId: grn._id, isDeleted: false },
            { amountSnapshot: 1 },
            { session }
        ).lean();
        await reverseExpenseEntry({
            sourceModel: "GRN",
            sourceId: grn._id,
            reversedBy: deleterUser._id,
            reversalReason: `GRN ${grn.grnNumber} deleted`,
        }, session);
        if (grnExpense?.amountSnapshot) {
            await reducePOCommitmentByGRN({
                poId: grn.poId,
                grnAmount: -grnExpense.amountSnapshot,
                companyId,
                session,
            });
        }
        await recalculatePOAfterGRN(grn.poId, companyId, session);
        await session.commitTransaction();
        session.endSession();
        reversePayable({
            sourceType: "GRN",
            sourceId: grn._id,
            reversalReason: `Reversed because GRN-${grn.grnNumber} has been deleted on ${new Date().toLocaleDateString("en-IN")}`,
            reversedBy: deleterUser._id,
        }).catch((err) =>
            logger.error("reversePayable (GRN) failed (non-critical)", { grnId: grn._id, error: err.message })
        );
        recalcProjectHealth(projectId, companyId).catch(() => { });
        if (grn.attachment) {
            await deleteGRNAttachment(grn.attachment);
        }
        logger.info("GRN soft-deleted", {
            grnId: grn._id,
            grnNumber: grn.grnNumber,
            poId: grn.poId,
            projectId,
            companyId,
        });
        return res.status(200).json(
            new ApiResponse(200, null, "GRN Deleted", `Goods Receipt Note ${grn.grnNumber} deleted successfully`)
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error("deleteGRN failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to delete GRN", [error.message])
        );
    }
};



// This function returns all GRNs linked to a specific PO. takes x-company-id in headers, projectId and poId in params. returns list of GRNs with enriched user data and material-wise delivery summary. -------------------------- Ayan
export const getGRNsByPO = async (req, res) => {
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
            .select("_id poNumber status items vendorName totalOrderValue expectedDeliveryDate firstDeliveryAt completedAt")
            .lean();
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID for this project")
            );
        }
        const grns = await GRN.find({ companyId, projectId, poId, isDeleted: false })
            .select("-__v -isDeleted -deletedAt")
            .sort({ createdAt: 1 })
            .lean();
        const enrichedGRNs = await Promise.all(grns.map((grn) => enrichGRNUsers(grn)));
        const deliverySummary = po.items.map((poItem) => {
            const totalReceived = grns.reduce((sum, grn) => {
                const match = grn.items.find(
                    (gi) => gi.inventoryId.toString() === poItem.inventoryId.toString()
                );
                return sum + (match ? match.receivedQuantity : 0);
            }, 0);
            const remaining = Math.max(poItem.orderedQuantity - totalReceived, 0);
            return {
                inventoryId: poItem.inventoryId,
                materialMasterId: poItem.materialMasterId,
                materialName: poItem.materialName,
                unit: poItem.unit,
                orderedQuantity: poItem.orderedQuantity,
                totalReceived,
                remaining,
                isFullyReceived: totalReceived >= poItem.orderedQuantity,
            };
        });
        logger.info("GRNs by PO fetched", { poId, projectId, companyId, count: grns.length });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    po: {
                        _id: po._id,
                        poNumber: po.poNumber,
                        status: po.status,
                        vendorName: po.vendorName,
                        totalOrderValue: po.totalOrderValue,
                        expectedDeliveryDate: po.expectedDeliveryDate,
                        firstDeliveryAt: po.firstDeliveryAt,
                        completedAt: po.completedAt,
                    },
                    grns: enrichedGRNs,
                    total: enrichedGRNs.length,
                    deliverySummary,
                },
                grns.length > 0 ? "GRNs Retrieved" : "No GRNs Found",
                `Fetched ${enrichedGRNs.length} GRN(s) for PO ${po.poNumber}`
            )
        );
    } catch (error) {
        logger.error("getGRNsByPO failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve GRNs for this PO", [error.message])
        );
    }
};



// This function returns all GRNs linked to a specific MR. takes x-company-id in headers, projectId and mrId in params. returns list of GRNs with enriched user data. -------------------------- Ayan
export const getGRNsByMR = async (req, res) => {
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
            _id: mrId, projectId, companyId, isDeleted: false,
        })
            .select("_id mrNumber status")
            .lean();

        if (!mr) {
            return res.status(404).json(
                new ApiErrors(404, "MR Not Found", "No MR found with the given ID for this project")
            );
        }
        const grns = await GRN.find({ companyId, projectId, mrId, isDeleted: false })
            .select("-__v -isDeleted -deletedAt")
            .sort({ createdAt: 1 })
            .lean();

        const enrichedGRNs = await Promise.all(grns.map((grn) => enrichGRNUsers(grn)));
        logger.info("GRNs by MR fetched", { mrId, projectId, companyId, count: grns.length });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mr: { _id: mr._id, mrNumber: mr.mrNumber, status: mr.status },
                    grns: enrichedGRNs,
                    total: enrichedGRNs.length,
                },
                grns.length > 0 ? "GRNs Retrieved" : "No GRNs Found",
                `Fetched ${enrichedGRNs.length} GRN(s) for MR ${mr.mrNumber}`
            )
        );
    } catch (error) {
        logger.error("getGRNsByMR failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve GRNs for this MR", [error.message])
        );
    }
};


// This function returns pending delivery items for a PO. takes x-company-id in headers, projectId and poId in params. returns items with remaining quantities along with PO summary details. -------------------------- Ayan
export const getPOPendingItems = async (req, res) => {
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
            .select("_id poNumber status items vendorName vendorId expectedDeliveryDate")
            .lean();
        if (!po) {
            return res.status(404).json(
                new ApiErrors(404, "PO Not Found", "No Purchase Order found with the given ID for this project")
            );
        }
        if (!["Approved", "PartiallyDelivered"].includes(po.status)) {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid PO Status",
                    `Cannot fetch pending items for a PO in '${po.status}' status. Only Approved or PartiallyDelivered POs have pending items`
                )
            );
        }
        const pendingItems = po.items
            .map((item) => ({
                inventoryId: item.inventoryId,
                materialMasterId: item.materialMasterId,
                materialName: item.materialName,
                unit: item.unit,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.receivedQuantity,
                remainingQuantity: parseFloat(
                    (item.orderedQuantity - item.receivedQuantity).toFixed(3)
                ),
                unitPrice: item.unitPrice,
                remarks: item.remarks,
            }))
            .filter((item) => item.remainingQuantity > 0);
        logger.info("PO pending items fetched", {
            poId,
            projectId,
            companyId,
            pendingCount: pendingItems.length,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    po: {
                        _id: po._id,
                        poNumber: po.poNumber,
                        status: po.status,
                        vendorId: po.vendorId,
                        vendorName: po.vendorName,
                        expectedDeliveryDate: po.expectedDeliveryDate,
                    },
                    pendingItems,
                    totalPendingItems: pendingItems.length,
                },
                pendingItems.length > 0 ? "Pending Items Retrieved" : "No Pending Items",
                pendingItems.length > 0
                    ? `${pendingItems.length} item(s) still pending delivery for PO ${po.poNumber}`
                    : `All items have been fully received for PO ${po.poNumber}`
            )
        );
    } catch (error) {
        logger.error("getPOPendingItems failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve pending items for this PO", [error.message])
        );
    }
};



// This function exports a GRN as a PDF document. takes x-company-id in headers, projectId and grnId in params. fetches GRN, project, vendor and user details and generates a formatted PDF for download. -------------------------- Ayan
export const exportGRNAsPdf = async (req, res) => {
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
        const { projectId, grnId } = req.params;
        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Project ID", "Valid projectId is required in params")
            );
        }
        if (!grnId || !isValidObjectId(grnId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid GRN ID", "Valid grnId is required in params")
            );
        }
        const grn = await GRN.findOne({
            _id: grnId,
            projectId,
            companyId,
            isDeleted: false,
        })
            .select("-__v -isDeleted -deletedAt")
            .lean();
        if (!grn) {
            return res.status(404).json(
                new ApiErrors(404, "GRN Not Found", "No GRN found with the given ID")
            );
        }
        const [project, vendor, enrichedGRN] = await Promise.all([
            Project.findOne({
                _id: projectId,
                companyId,
                isDeleted: false,
            })
                .select("projectName projectCode location clientName status startDate endDate")
                .lean(),

            Vendor.findOne({
                _id: grn.vendorId,
                companyId,
                isDeleted: false,
            })
                .select("name vendorType contactPerson phone email address legalDetails")
                .lean(),

            enrichGRNUsers(grn),
        ]);
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "Project linked to this GRN no longer exists")
            );
        }
        const createdByUser = enrichedGRN.createdBy;
        const po = await PurchaseOrder.findOne(
            { _id: grn.poId, companyId, isDeleted: false },
            { poNumber: 1, items: 1 }
        ).lean();
        const grnForPdf = {
            ...enrichedGRN,
            poNumber: po?.poNumber || null,
            totalAmount: po ? computeGRNTotal(grn.items, po.items) : 0,
        };
        logger.info("GRN PDF export initiated", {
            grnId,
            grnNumber: grn.grnNumber,
            projectId,
            companyId,
        });
        await generateGRNPdf(res, {
            grn: grnForPdf,
            company,
            vendor,
            project,
            createdByUser,
        });
    } catch (error) {
        if (!res.headersSent) {
            logger.error("exportGRNAsPdf failed", { message: error.message, stack: error.stack });
            return res.status(500).json(
                new ApiErrors(500, "Server Error", "Failed to generate GRN PDF", [error.message])
            );
        }
        logger.error("exportGRNAsPdf stream error (headers already sent)", {
            message: error.message,
        });
    }
};



// This function returns global goods receipt note (GRN) summary analytics across all projects. takes x-company-id in headers. computes GRN counts, received quantity, received amount, active projects, active vendors, linked POs, linked MRs, daily/monthly GRN activity and average items per GRN KPIs. -------------------------- Ayan
export const getGlobalGRNSummary = async (req, res) => {
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
        const activeProjects = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
        const [agg] = await GRN.aggregate([
            { $match: { companyId, isDeleted: false, projectId: { $in: activeProjectIds } } },
            {
                $facet: {
                    totalGRNs: [
                        { $count: "count" },
                    ],
                    totalReceivedQuantity: [
                        { $unwind: "$items" },
                        { $group: { _id: null, total: { $sum: "$items.receivedQuantity" } } },
                    ],
                    activeProjects: [
                        { $group: { _id: "$projectId" } },
                        { $count: "count" },
                    ],
                    activeVendors: [
                        { $group: { _id: "$vendorId" } },
                        { $count: "count" },
                    ],
                    linkedPOs: [
                        { $match: { poId: { $ne: null } } },
                        { $group: { _id: "$poId" } },
                        { $count: "count" },
                    ],
                    linkedMRs: [
                        { $match: { mrId: { $ne: null } } },
                        { $group: { _id: "$mrId" } },
                        { $count: "count" },
                    ],
                    grnsToday: [
                        { $match: { createdAt: { $gte: startOfToday } } },
                        { $count: "count" },
                    ],
                    grnsThisMonth: [
                        { $match: { createdAt: { $gte: startOfMonth } } },
                        { $count: "count" },
                    ],
                    avgItemsPerGRN: [
                        {
                            $project: {
                                itemCount: { $size: { $ifNull: ["$items", []] } },
                            },
                        },
                        { $group: { _id: null, avg: { $avg: "$itemCount" } } },
                    ],
                },
            },
        ]);
        let totalReceivedAmount = 0;
        const grnsForAmount = await GRN.find(
            { companyId, isDeleted: false, poId: { $ne: null }, projectId: { $in: activeProjectIds } },
            { poId: 1, items: 1 }
        ).lean();
        if (grnsForAmount.length > 0) {
            const poIds = [...new Set(grnsForAmount.map((g) => g.poId.toString()))];
            const pos = await PurchaseOrder.find(
                { _id: { $in: poIds }, isDeleted: false },
                { _id: 1, items: 1 }
            ).lean();
            const poMap = {};
            pos.forEach((po) => {
                poMap[po._id.toString()] = po;
            });
            totalReceivedAmount = grnsForAmount.reduce((sum, grn) => {
                const po = poMap[grn.poId.toString()];
                return sum + (po ? computeGRNTotal(grn.items, po.items) : 0);
            }, 0);
        }
        const summary = {
            totalGRNs: agg?.totalGRNs?.[0]?.count ?? 0,
            totalReceivedQuantity: Math.round((agg?.totalReceivedQuantity?.[0]?.total ?? 0) * 1000) / 1000,
            totalReceivedAmount: Math.round(totalReceivedAmount * 100) / 100,
            activeProjects: agg?.activeProjects?.[0]?.count ?? 0,
            activeVendors: agg?.activeVendors?.[0]?.count ?? 0,
            linkedPOs: agg?.linkedPOs?.[0]?.count ?? 0,
            linkedMRs: agg?.linkedMRs?.[0]?.count ?? 0,
            grnsToday: agg?.grnsToday?.[0]?.count ?? 0,
            grnsThisMonth: agg?.grnsThisMonth?.[0]?.count ?? 0,
            avgItemsPerGRN: Math.round((agg?.avgItemsPerGRN?.[0]?.avg ?? 0) * 10) / 10,
        };
        logger.info("Global GRN summary fetched", { companyId, totalGRNs: summary.totalGRNs });
        return res.status(200).json(
            new ApiResponse(200, { summary }, "Global GRN Summary", "KPI summary fetched across all projects")
        );
    } catch (error) {
        logger.error("getGlobalGRNSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch global GRN summary", [error.message])
        );
    }
};



// This function returns all goods receipt notes (GRNs) across the company. takes x-company-id in headers. supports pagination, cursor pagination, search (grnNumber, vendorName, materialName, deliveryChallanNumber), filtering (projectId, vendorId, poId, mrId, date range) and sorting with enriched project, MR, PO, user and receipt amount details. -------------------------- Ayan
export const getAllGRNsGlobal = async (req, res) => {
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
        const activeProjects = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjects.map((p) => p._id);
        const {
            page = 1,
            limit = 10,
            search = "",
            projectId,
            vendorId,
            poId,
            mrId,
            sortBy = "createdAt",
            order = "desc",
            dateFrom,
            dateTo,
            lastId,
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const allowedSortFields = ["createdAt", "grnNumber", "deliveryDate"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } };
        if (projectId) {
            if (!isValidObjectId(projectId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Project ID", "projectId query param must be a valid ObjectId")
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (vendorId) {
            if (!isValidObjectId(vendorId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid Vendor ID", "vendorId must be a valid ObjectId")
                );
            }
            filter.vendorId = new mongoose.Types.ObjectId(vendorId);
        }
        if (poId) {
            if (!isValidObjectId(poId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid PO ID", "poId must be a valid ObjectId")
                );
            }
            filter.poId = new mongoose.Types.ObjectId(poId);
        }
        if (mrId) {
            if (!isValidObjectId(mrId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid MR ID", "mrId must be a valid ObjectId")
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
                        new ApiErrors(400, "Invalid Date", "dateFrom must be a valid ISO date string")
                    );
                }
                filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (isNaN(to)) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid Date", "dateTo must be a valid ISO date string")
                    );
                }
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }
        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { grnNumber: searchRegex },
                { vendorName: searchRegex },
                { "items.materialName": searchRegex },
                { deliveryChallanNumber: searchRegex },
            ];
        }
        const useCursor = lastId && isValidObjectId(lastId) && sortField === "createdAt";
        const countFilter = { ...filter };
        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id = sortOrder === -1 ? { $lt: cursorObjectId } : { $gt: cursorObjectId };
        }
        const grnQuery = GRN.find(filter)
            .select("-__v -isDeleted")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);
        if (!useCursor) {
            grnQuery.skip((pageNumber - 1) * pageSize);
        }
        const [grns, total] = await Promise.all([
            grnQuery.lean(),
            GRN.countDocuments(countFilter),
        ]);
        if (grns.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        grns: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false,
                            nextCursor: null,
                        },
                    },
                    "No GRNs Found",
                    "No goods receipt notes matched the given filters"
                )
            );
        }
        const uniqueProjectIds = [...new Set(grns.map((g) => g.projectId?.toString()).filter(Boolean))];
        const uniquePoIds = [...new Set(grns.map((g) => g.poId?.toString()).filter(Boolean))];
        const uniqueMrIds = [...new Set(grns.map((g) => g.mrId?.toString()).filter(Boolean))];
        const uniqueUserIds = [...new Set(grns.map((g) => g.createdBy?.toString()).filter(Boolean))];
        const [projects, pos, mrs] = await Promise.all([
            Project.find(
                { _id: { $in: uniqueProjectIds }, isDeleted: false },
                { _id: 1, projectName: 1 }
            ).lean(),
            uniquePoIds.length > 0
                ? PurchaseOrder.find(
                    { _id: { $in: uniquePoIds }, isDeleted: false },
                    { _id: 1, poNumber: 1, items: 1 }
                ).lean()
                : Promise.resolve([]),
            uniqueMrIds.length > 0
                ? MaterialRequisition.find(
                    { _id: { $in: uniqueMrIds }, isDeleted: false },
                    { _id: 1, mrNumber: 1 }
                ).lean()
                : Promise.resolve([]),
        ]);
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });
        const poMap = {};
        pos.forEach((po) => {
            poMap[po._id.toString()] = po;
        });
        const mrMap = {};
        mrs.forEach((mr) => {
            mrMap[mr._id.toString()] = mr.mrNumber;
        });
        const userEnrichmentMap = {};
        await Promise.all(
            uniqueUserIds.map(async (uid) => {
                userEnrichmentMap[uid] = await enrichUser(new mongoose.Types.ObjectId(uid));
            })
        );
        const shaped = grns.map((grn) => {
            const po = grn.poId ? poMap[grn.poId.toString()] : null;
            const totalQuantity =
                Math.round((grn.items || []).reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) * 1000) / 1000;
            const totalAmount = po ? computeGRNTotal(grn.items, po.items) : 0;
            return {
                grnId: grn._id,
                grnNumber: grn.grnNumber,
                projectId: grn.projectId,
                projectName: projectMap[grn.projectId?.toString()] ?? "Unknown Project",
                poId: grn.poId ?? null,
                poNumber: po?.poNumber ?? null,
                mrId: grn.mrId ?? null,
                mrNumber: grn.mrId ? (mrMap[grn.mrId.toString()] ?? null) : null,
                vendorId: grn.vendorId ?? null,
                vendorName: grn.vendorName ?? null,
                totalItems: grn.items?.length ?? 0,
                totalQuantity,
                totalAmount,
                deliveryDate: grn.deliveryDate ?? null,
                deliveryChallanNumber: grn.deliveryChallanNumber ?? null,
                requestedBy: userEnrichmentMap[grn.createdBy?.toString()] ?? null,
                remarks: grn.remarks ?? null,
                createdAt: grn.createdAt,
            };
        });
        const hasNextPage = grns.length === pageSize;
        const nextCursor = hasNextPage ? grns[grns.length - 1]._id : null;
        logger.info("Global GRNs fetched", {
            companyId,
            total,
            returned: grns.length,
            page: pageNumber,
            filters: { projectId, vendorId, poId, mrId, search, dateFrom, dateTo },
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    grns: shaped,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor,
                    },
                },
                "Global GRNs Retrieved",
                `Fetched ${shaped.length} goods receipt note(s) across all projects`
            )
        );
    } catch (error) {
        logger.error("getAllGRNsGlobal failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global GRNs", [error.message])
        );
    }
};