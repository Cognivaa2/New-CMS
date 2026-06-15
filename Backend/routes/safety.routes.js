import express from "express";
import {
    createSafetyInspection,
    getAllInspectionsByProject,
    getSingleInspection,
    editInspection,
    resolveEntry,
    deleteInspection,
    getGlobalSafetySummary,
    getAllInspectionsGlobal,
} from "../controllers/safety.controller.js";
import { uploadSafetyFields } from "../middlewares/upload.middlewares.js";

const router = express.Router();



router.get("/", getAllInspectionsGlobal);
router.get("/summary", getGlobalSafetySummary);



router.post("/:projectId",uploadSafetyFields,createSafetyInspection);
router.get("/:projectId", getAllInspectionsByProject);
router.get("/:projectId/:inspectionId", getSingleInspection);
router.patch("/:projectId/:inspectionId",uploadSafetyFields,editInspection);
router.patch("/:projectId/:inspectionId/entries/resolve/:entryId",resolveEntry);
router.delete("/:projectId/:inspectionId", deleteInspection);

export default router;