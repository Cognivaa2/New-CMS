import express from "express";
import { upload } from "../middlewares/upload.middlewares.js";
import { registerCompany, verifyCompanyOtp, editCompany, allCompanyList, statusChange, getCompanyById, companyLookup } from "../controllers/company.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.post("/register", upload.single("logo"), registerCompany);
router.post("/verifyOtp", verifyCompanyOtp);
router.get("/all", allCompanyList);
router.get("/lookup/:companyId", verifyToken, companyLookup);
router.get("/:companyId", verifyToken, checkPermission("primary-organization", "view"), getCompanyById);
router.put("/update/:companyId", upload.single("logo"), verifyToken, checkPermission("primary-organization", "edit"), editCompany);
router.patch("/status/:companyId",verifyToken, checkPermission("primary-organization", "edit"), statusChange);

export default router;
