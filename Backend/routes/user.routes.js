import express from "express";
import { upload } from "../middlewares/upload.middlewares.js";
import { registerUser, getUserProfile, updateUserProfile, changePassword, allUserList, changeUserStatus, getUserAssignedProjects, deleteUser } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();



router.post("/register", verifyToken, checkPermission("primary-users", "create"), registerUser);
router.put("/update/:keycloakId", upload.single("avatar"), verifyToken, updateUserProfile);
router.get("/profile/:keycloakId", verifyToken, getUserProfile);
router.put("/change/:keycloakId", verifyToken, changePassword);
router.get("/all/:companyId", verifyToken, checkPermission("primary-users", "view"), allUserList);
router.patch("/status/:keycloakId", verifyToken, checkPermission("primary-users", "edit"), changeUserStatus);
router.get("/projects/:keycloakId", verifyToken, getUserAssignedProjects);
router.delete("/delete/:keycloakId", verifyToken, checkPermission("primary-users", "delete"), deleteUser);

export default router;
