import express from "express";
import multer from "multer";
import { uploadImport, getImportStatus, getImportHistory } from "../controllers/import.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js"

const router = express.Router();

router.post("/upload", uploadDocument.single("file"), uploadImport);
router.get("/status/:jobId", getImportStatus);
router.get("/history", getImportHistory);

export default router;