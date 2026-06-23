import { Router } from "express";
import { addTask, allTasks, getTask, editTask, deleteTask, updateTaskMember, getTaskDocuments, getAllUniqueAssignedUsers, getTaskDates, getTasksByUser, getAllTasksByUser } from "../controllers/task.controller.js";
import { linkTaskToWO } from "../controllers/linkTaskToWo.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.get("/unique/:phaseId", verifyToken, checkPermission("project-tasks", "view"), getAllUniqueAssignedUsers);
router.post("/:phaseId", verifyToken, checkPermission("project-tasks", "create"), addTask);
router.get("/:phaseId", verifyToken, checkPermission("project-tasks", "view"), allTasks);
router.get("/:phaseId/users/unique-assigned", verifyToken, checkPermission("project-tasks", "view"), getAllUniqueAssignedUsers);
router.get("/:phaseId/user/:keycloakId", verifyToken, checkPermission("project-tasks", "view"), getTasksByUser);
router.get("/:phaseId/:taskId", verifyToken, checkPermission("project-tasks", "view"), getTask);
router.put("/:phaseId/edit/:taskId", verifyToken, checkPermission("project-tasks", "edit"), editTask);
router.delete("/:phaseId/delete/:taskId", verifyToken, checkPermission("project-tasks", "delete"), deleteTask);
router.patch("/:phaseId/members/:taskId", verifyToken, checkPermission("project-tasks", "edit"), updateTaskMember);
router.get("/:phaseId/documents/:taskId", verifyToken, checkPermission("project-tasks", "view"), getTaskDocuments);
router.get("/:phaseId/:taskId/dates", verifyToken, checkPermission("project-tasks", "view"), getTaskDates);
router.get("/project/:projectId/user/:keycloakId", verifyToken, checkPermission("project-tasks", "view"), getAllTasksByUser);


router.patch("/projects/:projectId/phases/:phaseId/tasks/:taskId/linkToWo", verifyToken, checkPermission("project-tasks", "edit"), linkTaskToWO);
export default router;
