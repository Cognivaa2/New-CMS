import { Router } from "express";
import { updateSubTaskCompletion, getProjectCompletionSnapshot } from "../controllers/completion.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.patch("/subtask/:subTaskId",verifyToken, checkPermission("project-tasks", "edit"), updateSubTaskCompletion);
router.get("/project/snapshot/:projectId",verifyToken, checkPermission("project-tasks", "view"), getProjectCompletionSnapshot);

export default router;
