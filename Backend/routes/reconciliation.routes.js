import express from "express";
import {
    getThreeWayMatchList,
    getThreeWayMatchByPO,
    getVendorReconciliation,
    getProjectReconciliation,
    createContraEntry,
    submitContraEntry,
    approveContraEntry,
    rejectContraEntry,
    getAllContraEntries,
    getMaterialReconciliation,
    getInventoryReconciliation,
    getPurchaseReconciliation,
    getFinancialReconciliation,
} from "../controllers/reconciliation.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/twm", verifyToken, checkPermission("project-three-way-match", "view"), getThreeWayMatchList);
router.get("/twm/:poId", verifyToken, checkPermission("project-three-way-match", "view"), getThreeWayMatchByPO);

router.get("/vendor/:vendorId", verifyToken, checkPermission("project-three-way-match", "view"), getVendorReconciliation);
router.get("/project/:projectId", verifyToken, checkPermission("project-three-way-match", "view"), getProjectReconciliation);

router.get("/contra", verifyToken, checkPermission("primary-contra-entry", "view"), getAllContraEntries);
router.post("/contra", verifyToken, checkPermission("primary-contra-entry", "create"), createContraEntry);
router.patch("/contra/submit/:ceId", verifyToken, checkPermission("primary-contra-entry", "create"), submitContraEntry);
router.patch("/contra/approve/:ceId", verifyToken, checkPermission("primary-contra-entry", "approve"), approveContraEntry);
router.patch("/contra/reject/:ceId", verifyToken, checkPermission("primary-contra-entry", "reject"), rejectContraEntry);

router.get("/material", getMaterialReconciliation);
router.get("/inventory", getInventoryReconciliation);
router.get("/purchase", getPurchaseReconciliation);
router.get("/financial", getFinancialReconciliation);

export default router;