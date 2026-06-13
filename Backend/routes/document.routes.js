import express from "express";
import {
    uploadDocument,
    getAllDocuments,
    getSingleDocument,
    editDocument,
    deleteDocument,
    linkDocument,
    unlinkDocument,
    downloadDocument
} from "../controllers/document.controller.js";
import { uploadDocument as uploadDocumentMiddleware } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router({ mergeParams: true });

router.post("/:projectId", uploadDocumentMiddleware.single("file"), verifyToken, checkPermission("project-documents", "upload"), uploadDocument);
router.get("/:projectId", verifyToken, checkPermission("project-documents", "view"), getAllDocuments);
router.get("/:projectId/download/:documentId", verifyToken, checkPermission("project-documents", "download"), downloadDocument);
router.patch("/:projectId/link/:documentId", verifyToken, checkPermission("project-documents", "edit"), linkDocument);
router.patch("/:projectId/unlink/:documentId", verifyToken, checkPermission("project-documents", "edit"), unlinkDocument);
router.get("/:projectId/:documentId", verifyToken, checkPermission("project-documents", "view"), getSingleDocument);
router.patch("/:projectId/:documentId", verifyToken, checkPermission("project-documents", "edit"), editDocument);
router.delete("/:projectId/:documentId", verifyToken, checkPermission("project-documents", "delete"), deleteDocument);

export default router;