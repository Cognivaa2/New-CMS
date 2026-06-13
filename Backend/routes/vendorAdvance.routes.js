import express from "express";
import {
    getVendorAdvanceSummary,
    addVendorAdvanceController,
    getVendorAdvanceTransactions,
    getVendorFullTransactionHistory
} from "../controllers/vendorAdvance.controller.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/:vendorId", verifyToken, checkPermission("primary-vendors", "view"), getVendorAdvanceSummary);
router.post("/:vendorId", verifyToken, checkPermission("primary-vendors", "edit"), uploadDocument.single("proof"), addVendorAdvanceController);
router.get("/transactions/:vendorId", verifyToken, checkPermission("primary-vendors", "view"), getVendorAdvanceTransactions);
router.get("/history/:vendorId", verifyToken, checkPermission("primary-vendors", "view"), getVendorFullTransactionHistory);

export default router;