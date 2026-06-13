import express from "express";
import { getGanttData, exportGanttExcel } from "../controllers/gantt.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/:projectId", verifyToken, checkPermission("project-gantt", "view"), getGanttData);
router.get("/export/:projectId", verifyToken, checkPermission("project-gantt", "download"), exportGanttExcel);

export default router;