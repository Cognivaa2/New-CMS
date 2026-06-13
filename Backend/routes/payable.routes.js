import express from "express";
import {
    getPayables,
    getPayablesSummary,
    getSinglePayable,
    getPayablePayments,
    recordPaymentController,
    exportPayableAsPdf,
    getGlobalPayablesSummary,
    getAllPayablesGlobal
} from "../controllers/payable.controller.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/", verifyToken, checkPermission("primary-payables", "view"), getAllPayablesGlobal);
router.get("/summary", verifyToken, checkPermission("primary-payables", "view"), getGlobalPayablesSummary);

router.get("/summary/:projectId", verifyToken, checkPermission("project-payables", "view"), getPayablesSummary);
router.get("/:projectId", verifyToken, checkPermission("project-payables", "view"), getPayables);
router.get("/:projectId/:payableId", verifyToken, checkPermission("project-payables", "view"), getSinglePayable);
router.get("/payments/:projectId/:payableId", verifyToken, checkPermission("project-payables", "view"), getPayablePayments);
router.post("/payments/:projectId/:payableId", uploadDocument.single("proof"), verifyToken, checkPermission("project-payables", "create"), recordPaymentController);
router.get("/pdf/:projectId/:payableId", verifyToken, checkPermission("project-payables", "download"), exportPayableAsPdf);

export default router;