import { Router } from "express";
import { addSubTask, allSubTasks, getSubTask, editSubTask, deleteSubTask, updateSubTaskMember, updateSubTaskProgress, getSubTaskDocuments, getAllUniqueAssignedUsers, getSubTasksByUser, lightweightSubTaskList } from "../controllers/subTask.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.get("/unique/:taskId", verifyToken, checkPermission("project-tasks", "view"), getAllUniqueAssignedUsers);
router.get("/all/lookup", verifyToken, lightweightSubTaskList);
router.post("/:taskId", verifyToken, checkPermission("project-tasks", "create"), addSubTask);
router.get("/:taskId", verifyToken, checkPermission("project-tasks", "view"), allSubTasks);
router.get("/:taskId/:subTaskId", verifyToken, checkPermission("project-tasks", "view"), getSubTask);
router.patch("/:taskId/edit/:subTaskId", verifyToken, checkPermission("project-tasks", "edit"), editSubTask);
router.delete("/:taskId/delete/:subTaskId", verifyToken, checkPermission("project-tasks", "delete"), deleteSubTask);
router.patch("/:taskId/members/:subTaskId", verifyToken, checkPermission("project-tasks", "edit"), updateSubTaskMember);
router.patch("/:taskId/progress/:subTaskId", verifyToken, checkPermission("project-tasks", "edit"), updateSubTaskProgress);
router.get("/:taskId/documents/:subTaskId", verifyToken, checkPermission("project-tasks", "view"), getSubTaskDocuments);
router.get("/:taskId/user/:keycloakId", verifyToken, checkPermission("project-tasks", "view"), getSubTasksByUser);

export default router;