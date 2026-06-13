import express from "express";
import {
    createGRN,
    getAllGRNs,
    getSingleGRN,
    editGRN,
    deleteGRN,
    getGRNsByPO,
    getGRNsByMR,
    getPOPendingItems,
    exportGRNAsPdf,
    getAllGRNsGlobal,
    getGlobalGRNSummary
} from "../controllers/grn.controller.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js"
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/", verifyToken, checkPermission("primary-grn", "view"), getAllGRNsGlobal);
router.get("/summary", verifyToken, checkPermission("primary-grn", "view"), getGlobalGRNSummary);

router.get("/:projectId/po/:poId", verifyToken, checkPermission("project-grn", "view"), getGRNsByPO);
router.get("/:projectId/mr/:mrId", verifyToken, checkPermission("project-grn", "view"), getGRNsByMR);
router.get("/:projectId/:poId/pending", verifyToken, checkPermission("project-grn", "view"), getPOPendingItems);
router.post("/:projectId/:poId", uploadDocument.single("attachment"), verifyToken, checkPermission("project-grn", "create"), createGRN);
router.get("/:projectId", verifyToken, checkPermission("project-grn", "view"), getAllGRNs);
router.get("/:projectId/export/:grnId", verifyToken, checkPermission("project-grn", "download"), exportGRNAsPdf);
router.get("/:projectId/:grnId", verifyToken, checkPermission("project-grn", "view"), getSingleGRN);
router.patch("/:projectId/:grnId", uploadDocument.single("attachment"), verifyToken, checkPermission("project-grn", "edit"), editGRN);
router.delete("/:projectId/:grnId", verifyToken, checkPermission("project-grn", "delete"), deleteGRN);

export default router;