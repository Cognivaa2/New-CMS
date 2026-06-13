import express from "express";
import {
    listCompanies,
    getCompanyProfile,
    updateCompanyStatus,
    softDeleteCompany,
    listAllProjects,
    listAllUsers,
    getCompanySummary,
    getProjectAllData
} from "../controllers/superAdmin.controller.js";

const router = express.Router();

router.get("/companies", listCompanies);
router.get("/companies/:companyId", getCompanyProfile);
router.get("/companies/:companyId/lookup", getCompanySummary);
router.get("/companies/:companyId/:projectId", getProjectAllData);
router.patch("/companies/:companyId/status", updateCompanyStatus);
router.delete("/companies/:companyId", softDeleteCompany);
router.get("/projects", listAllProjects);
router.get("/users", listAllUsers);

export default router;