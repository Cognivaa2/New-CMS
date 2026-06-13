import express from "express";
import { recordConsumption, getConsumptionBySubTask, getConsumptionByProject, deleteConsumptionRecord, getConsumptionByWorkOrder } from "../controllers/materialConsumption.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router({ mergeParams: true });

router.post("/:projectId", verifyToken, checkPermission("project-consumption", "create"), recordConsumption);
router.get("/:projectId", verifyToken, checkPermission("project-consumption", "view"), getConsumptionByProject);
router.get("/:projectId/subtask/:subTaskId", verifyToken, checkPermission("project-consumption", "view"), getConsumptionBySubTask);
router.delete("/:projectId/:consumptionId", verifyToken, checkPermission("project-consumption", "delete"), deleteConsumptionRecord);


router.get("/projects/:projectId/work-orders/:woId/consumption", verifyToken, checkPermission("project-consumption", "view"), getConsumptionByWorkOrder);

export default router;