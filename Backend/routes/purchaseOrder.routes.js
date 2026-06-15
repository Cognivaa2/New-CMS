import express from "express";
import {
    createPO, getAllPOs, getSinglePO, editPO, submitPO, approvePO, rejectPO, cancelPO, deletePO, getMRsPendingForPO, getPOsByMR, getPOItems, getPOLookup, getGlobalPOSummary, getAllPOsGlobal, getGlobalPOLookup, exportPOAsPdf
} from "../controllers/purchaseOrder.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/summary", verifyToken, checkPermission("primary-purchase-orders", "view"), getGlobalPOSummary);
router.get("/lookup", verifyToken, checkPermission("primary-purchase-orders", "view"), getGlobalPOLookup);
router.get("/", verifyToken, checkPermission("primary-purchase-orders", "view"), getAllPOsGlobal);

router.get("/:projectId/lookup", getPOLookup);
router.get("/:projectId/mr/pending", verifyToken, checkPermission("project-purchase-orders", "view"), getMRsPendingForPO);
router.get("/:projectId/mr/:mrId", verifyToken, checkPermission("project-purchase-orders", "view"), getPOsByMR);
router.get("/:projectId/items/:poId", verifyToken, checkPermission("project-purchase-orders", "view"), getPOItems);

router.post("/:projectId", verifyToken, checkPermission("project-purchase-orders", "create"), createPO);
router.get("/:projectId", verifyToken, checkPermission("project-purchase-orders", "view"), getAllPOs);
router.get("/:projectId/:poId", verifyToken, checkPermission("project-purchase-orders", "view"), getSinglePO);
router.get("/:projectId/export/:poId", verifyToken, checkPermission("project-purchase-orders", "download"), exportPOAsPdf);

router.patch("/:projectId/submit/:poId", verifyToken, checkPermission("project-purchase-orders", "create"), submitPO);
router.patch("/:projectId/approve/:poId", verifyToken, checkPermission("project-purchase-orders", "approve"), approvePO);
router.patch("/:projectId/reject/:poId", verifyToken, checkPermission("project-purchase-orders", "reject"), rejectPO);
router.patch("/:projectId/cancel/:poId", verifyToken, checkPermission("project-purchase-orders", "delete"), cancelPO);
router.patch("/:projectId/:poId", verifyToken, checkPermission("project-purchase-orders", "edit"), editPO);
router.delete("/:projectId/:poId", verifyToken, checkPermission("project-purchase-orders", "delete"), deletePO);

export default router;