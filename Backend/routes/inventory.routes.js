import express from "express";
import { addMaterialToInventory, getAllInventory, getSingleInventoryItem, editInventoryItem, checkStockAvailability, getInventoryLookup, stockAdjustment, deleteInventoryItem, getLowStockAlerts, getGlobalInventorySummary, getAllInventoryGlobal } from "../controllers/inventory.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router({ mergeParams: true });

router.get("/summary", verifyToken, checkPermission("primary-inventory", "view"), getGlobalInventorySummary);
router.get("/", verifyToken, checkPermission("primary-inventory", "view"), getAllInventoryGlobal)

router.post("/:projectId", verifyToken, checkPermission("project-inventory", "create"), addMaterialToInventory);
router.get("/:projectId", verifyToken, checkPermission("project-inventory", "view"), getAllInventory);
router.get("/:projectId/lookup", verifyToken, getInventoryLookup);
router.get("/:projectId/stock", verifyToken, checkPermission("project-inventory", "view"), checkStockAvailability);
router.get("/:projectId/low", verifyToken, checkPermission("project-inventory", "view"), getLowStockAlerts);
router.get("/:projectId/:inventoryId", verifyToken, checkPermission("project-inventory", "view"), getSingleInventoryItem);
router.patch("/:projectId/:inventoryId", verifyToken, checkPermission("project-inventory", "edit"), editInventoryItem);
router.patch("/:projectId/adjust/:inventoryId", verifyToken, checkPermission("project-inventory", "edit"), stockAdjustment);
router.delete("/:projectId/:inventoryId", verifyToken, checkPermission("project-inventory", "delete"), deleteInventoryItem);

export default router;