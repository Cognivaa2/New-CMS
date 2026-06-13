import express from "express";
import { addProject, allProject, getProjectById, editProject, deleteProject, getProjectMembers, updateProjectMember, changeProjectMemberRole, getProjectListForSidebar, getProjectDates, getProjectLookup, exportProjectData } from "../controllers/project.controller.js";
import { upload } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.post("/add", upload.single("coverImage"), verifyToken, checkPermission("primary-projects", "create"), addProject);
router.get("/all/:keycloakId", verifyToken, checkPermission("primary-projects", "view"), allProject);
router.get("/lookup", verifyToken, getProjectLookup);
router.get("/:projectId", verifyToken, checkPermission("primary-projects", "view"), getProjectById);
router.put("/edit/:projectId", upload.single("coverImage"), verifyToken, checkPermission("primary-projects", "edit"), editProject);
router.delete("/delete/:projectId", verifyToken, checkPermission("primary-projects", "delete"), deleteProject);
router.get("/export/:projectId", verifyToken, checkPermission("primary-projects", "download"), exportProjectData);
router.get("/members/:projectId", verifyToken, checkPermission("primary-projects", "view"), getProjectMembers);
router.patch("/members/:projectId", verifyToken, checkPermission("primary-projects", "edit"), updateProjectMember);
router.patch("/role/:projectId", verifyToken, checkPermission("primary-projects", "edit"), changeProjectMemberRole);
router.get("/list/:keycloakId", verifyToken, getProjectListForSidebar);
router.get("/:projectId/dates", verifyToken, checkPermission("primary-projects", "view"), getProjectDates);

export default router;