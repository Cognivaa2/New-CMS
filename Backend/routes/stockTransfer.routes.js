import { Router } from "express";
import {
    createTransfer,
    approveTransfer,
    rejectTransfer,
    editTransfer,
    deleteTransfer,
    getTransferById,
    getTransfersByProject,
    getAllTransfers,
    getAllStockMovements,
    getGlobalTransferSummary,
    getAllTransfersGlobal
} from "../controllers/stockTransfer.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.get("/summary", verifyToken, checkPermission("primary-stock-transfers", "view"), getGlobalTransferSummary);
router.get("/global", verifyToken, checkPermission("primary-stock-transfers", "view"), getAllTransfersGlobal);


router.get("/movements", verifyToken, checkPermission("project-stock-transfers", "view"), getAllStockMovements);
router.get("/", verifyToken, checkPermission("project-stock-transfers", "view"), getAllTransfers);
router.post("/:fromProjectId", verifyToken, checkPermission("project-stock-transfers", "create"), createTransfer);
router.get("/:fromProjectId", verifyToken, checkPermission("project-stock-transfers", "view"), getTransfersByProject);
router.get("/:fromProjectId/:transferId", verifyToken, checkPermission("project-stock-transfers", "view"), getTransferById);
router.put("/:fromProjectId/:transferId", verifyToken, checkPermission("project-stock-transfers", "edit"), editTransfer);
router.patch("/:fromProjectId/approve/:transferId", verifyToken, checkPermission("project-stock-transfers", "approve"), approveTransfer);
router.patch("/:fromProjectId/reject/:transferId", verifyToken, checkPermission("project-stock-transfers", "reject"), rejectTransfer);
router.delete("/:fromProjectId/:transferId", verifyToken, checkPermission("project-stock-transfers", "delete"), deleteTransfer);

export default router;
