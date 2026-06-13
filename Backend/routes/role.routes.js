import express from "express";
import {
    addRole,
    allRoleList,
    getRoleById,
    editRole,
    hardDeleteRole,
    softDeleteRole,
    updateRoleStatus,
    setRolePermissions,
    patchRolePermissions,
    toggleAllPermissions,
    getRoleSchema,
    getUsersByRole,
    cloneRole,
    lightweightRoleList
} from "../controllers/role.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();


router.get("/meta/schema", verifyToken, getRoleSchema);
router.post("/add", verifyToken, checkPermission("primary-roles", "create"), addRole);
router.get("/all", verifyToken, checkPermission("primary-roles", "view"), allRoleList);
router.get("/lookup", verifyToken, lightweightRoleList);
router.get("/:roleId", verifyToken, getRoleById);
router.put("/edit/:roleId", verifyToken, checkPermission("primary-roles", "edit"), editRole);
router.delete("/delete/:roleId", verifyToken, checkPermission("primary-roles", "delete"), hardDeleteRole);
router.patch("/softDelete/:roleId", verifyToken, checkPermission("primary-roles", "delete"), softDeleteRole);
router.patch("/status/:roleId", verifyToken, checkPermission("primary-roles", "edit"), updateRoleStatus);
router.put("/setPermissions/:roleId", verifyToken, checkPermission("primary-roles", "edit"), setRolePermissions);
router.patch("/permissions/:roleId", verifyToken, checkPermission("primary-roles", "edit"), patchRolePermissions);
router.patch("/toggle/permissions/:roleId", verifyToken, checkPermission("primary-roles", "edit"), toggleAllPermissions);
router.get("/users/:roleId", verifyToken, checkPermission("primary-roles", "view"), getUsersByRole);
router.post("/clone/:roleId", verifyToken, checkPermission("primary-roles", "create"), cloneRole);

export default router;