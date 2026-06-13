import { Router } from "express";

import {
    createWO,
    getAllWOs,
    getSingleWO,
    editWO,
    submitWO,
    approveWO,
    rejectWO,
    cancelWO,
    markWOInProgress,
    markWOComplete,
    deleteWO,
    exportWOAsPdf,
    exportWCCAsPdf,
    getVendorLookupForWO,
    getWOLookup,
    getGlobalWOSummary,
    getAllWOsGlobal
} from "../controllers/workOrder.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const woRouter = Router();

woRouter.get("/summary", verifyToken, checkPermission("primary-work-orders", "view"), getGlobalWOSummary);
woRouter.get("/", verifyToken, checkPermission("primary-work-orders", "view"), getAllWOsGlobal)

woRouter.get("/:projectId/lookup", verifyToken, getWOLookup);
woRouter.post("/:projectId", verifyToken, checkPermission("project-work-orders", "create"), createWO);
woRouter.get("/:projectId", verifyToken, checkPermission("project-work-orders", "view"), getAllWOs);
woRouter.get("/:projectId/:woId", verifyToken, checkPermission("project-work-orders", "view"), getSingleWO);
woRouter.patch("/:projectId/:woId", verifyToken, checkPermission("project-work-orders", "edit"), editWO);
woRouter.delete("/:projectId/:woId", verifyToken, checkPermission("project-work-orders", "delete"), deleteWO);
woRouter.patch("/:projectId/submit/:woId", verifyToken, checkPermission("project-work-orders", "create"), submitWO);
woRouter.patch("/:projectId/approve/:woId", verifyToken, checkPermission("project-work-orders", "approve"), approveWO);
woRouter.patch("/:projectId/reject/:woId", verifyToken, checkPermission("project-work-orders", "reject"), rejectWO);
woRouter.patch("/:projectId/cancel/:woId", verifyToken, checkPermission("project-work-orders", "delete"), cancelWO);
woRouter.patch("/:projectId/start/:woId", verifyToken, checkPermission("project-work-orders", "edit"), markWOInProgress);
woRouter.patch("/:projectId/complete/:woId", verifyToken, checkPermission("project-work-orders", "edit"), markWOComplete);

woRouter.get("/:projectId/:woId/export/pdf", verifyToken, checkPermission("project-work-orders", "download"), exportWOAsPdf);
woRouter.get("/:projectId/:woId/export/wcc", verifyToken, checkPermission("project-work-orders", "download"), exportWCCAsPdf);

woRouter.get("/lookup/vendors", verifyToken, getVendorLookupForWO);


export default woRouter;