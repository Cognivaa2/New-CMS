import express from "express";
import { createMaterial, getAllMaterials, getMaterialsLookup, getMaterialById, editMaterial, toggleMaterialStatus, deleteMaterial } from "../controllers/materialMaster.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.post("/", verifyToken, checkPermission("primary-materials", "create"), createMaterial);
router.get("/", verifyToken, checkPermission("primary-materials", "view"), getAllMaterials);
router.get("/lookup", verifyToken, getMaterialsLookup);
router.get("/:materialId", verifyToken, checkPermission("primary-materials", "view"), getMaterialById);
router.patch("/:materialId", verifyToken, checkPermission("primary-materials", "edit"), editMaterial);
router.patch("/status/:materialId", verifyToken, checkPermission("primary-materials", "edit"), toggleMaterialStatus);
router.delete("/:materialId", verifyToken, checkPermission("primary-materials", "delete"), deleteMaterial);

export default router;