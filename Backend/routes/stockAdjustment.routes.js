import { Router } from "express";
import {
    createStockAdjustment,
    submitStockAdjustment,
    approveStockAdjustment,
    rejectStockAdjustment,
    editStockAdjustment,
    getAllStockAdjustments,
    getSingleStockAdjustment,
    deleteStockAdjustment,
} from "../controllers/stockAdjustment.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.post("/:projectId", verifyToken, checkPermission("project-inventory", "create"), createStockAdjustment);
router.get("/:projectId", verifyToken, checkPermission("project-inventory", "view"), getAllStockAdjustments);
router.patch("/:projectId/submit/:adjustmentId", verifyToken, checkPermission("project-inventory", "edit"), submitStockAdjustment);
router.patch("/:projectId/approve/:adjustmentId", verifyToken, checkPermission("project-inventory", "approve"), approveStockAdjustment);
router.patch("/:projectId/reject/:adjustmentId", verifyToken, checkPermission("project-inventory", "reject"), rejectStockAdjustment);
router.get("/:projectId/:adjustmentId", verifyToken, checkPermission("project-inventory", "view"), getSingleStockAdjustment);
router.patch("/:projectId/:adjustmentId", verifyToken, checkPermission("project-inventory", "edit"), editStockAdjustment);
router.delete("/:projectId/:adjustmentId", verifyToken, checkPermission("project-inventory", "delete"), deleteStockAdjustment);

export default router;