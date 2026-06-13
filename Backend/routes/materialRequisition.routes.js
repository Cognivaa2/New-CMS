import { Router } from "express";
import { createMR, submitMR, approveMR, rejectMR, editMR, getAllMRs, getSingleMR, deleteMR, getMRItems, getMRLookup, getGlobalMRSummary, getAllMRsGlobal } from "../controllers/materialRequisition.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.get("/summary", verifyToken, checkPermission("primary-materials-requisition", "view"), getGlobalMRSummary);
router.get("/", verifyToken, checkPermission("primary-materials-requisition", "view"), getAllMRsGlobal);

router.get("/:projectId/lookup", verifyToken, getMRLookup);
router.patch("/:projectId/submit/:mrId", verifyToken, checkPermission("project-material-requisitions", "create"), submitMR);
router.patch("/:projectId/approve/:mrId", verifyToken, checkPermission("project-material-requisitions", "approve"), approveMR);
router.patch("/:projectId/reject/:mrId", verifyToken, checkPermission("project-material-requisitions", "reject"), rejectMR);
router.get("/:projectId/items/:mrId", verifyToken, checkPermission("project-material-requisitions", "view"), getMRItems);
router.post("/:projectId", verifyToken, checkPermission("project-material-requisitions", "create"), createMR);
router.get("/:projectId", verifyToken, checkPermission("project-material-requisitions", "view"), getAllMRs);
router.get("/:projectId/:mrId", verifyToken, checkPermission("project-material-requisitions", "view"), getSingleMR);
router.patch("/:projectId/:mrId", verifyToken, checkPermission("project-material-requisitions", "edit"), editMR);
router.delete("/:projectId/:mrId", verifyToken, checkPermission("project-material-requisitions", "delete"), deleteMR);


export default router;
