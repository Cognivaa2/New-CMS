import { Router } from "express";
import { addVendor, getVendors, editVendor, getVendorById, deleteVendor, getVendorHistory, getVendorLookup, getVendorBills } from "../controllers/vendors.controller.js";
import { upload } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.post("/", verifyToken, checkPermission("primary-vendors", "create"), upload.single("photo"), addVendor);
router.get("/", verifyToken, checkPermission("primary-vendors", "view"), getVendors);
router.get("/lookup", verifyToken, getVendorLookup);
router.get("/history/:vendorId", verifyToken, checkPermission("primary-vendors", "view"), getVendorHistory);
router.get("/bills/:vendorId", verifyToken, checkPermission("primary-vendors", "view"), getVendorBills);
router.put("/:vendorId", verifyToken, checkPermission("primary-vendors", "edit"), upload.single("photo"), editVendor);
router.get("/:vendorId", verifyToken, checkPermission("primary-vendors", "view"), getVendorById)
router.delete("/:vendorId", verifyToken, checkPermission("primary-vendors", "delete"), deleteVendor);


export default router;
