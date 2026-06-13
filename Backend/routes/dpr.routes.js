import express from "express";
import {
    getDpr,
    getDprSummary,
    getDprHistory,
    exportDpr,
} from "../controllers/dpr.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/summary/:projectId", verifyToken, checkPermission("project-dpr", "view"), getDprSummary);
router.get("/history/:projectId", verifyToken, checkPermission("project-dpr", "view"), getDprHistory);
router.get("/export/:projectId", verifyToken, checkPermission("project-dpr", "download"), exportDpr);
router.get("/:projectId", verifyToken, checkPermission("project-dpr", "view"), getDpr);


export default router;