import { Router } from "express";
import { createIssue, getAllIssues, getIssueById, editIssue, deleteIssue, resolveIssue, rejectIssue, getAssignedUsers, editAssignedUsers, addComment, getAllComments, editComment, deleteComment, getIssueSummary, getGlobalIssueSummary, getAllIssuesGlobal } from "../controllers/issue.controller.js";
import { upload } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.get("/glabal/summary", verifyToken, checkPermission("primary-issues", "view"), getGlobalIssueSummary);
router.get("/global", verifyToken, checkPermission("primary-issues", "view"), getAllIssuesGlobal);

router.get("/summary", verifyToken, checkPermission("project-issues", "view"), getIssueSummary)
router.post("/", upload.array("attachments", 5), verifyToken, checkPermission("project-issues", "create"), createIssue);
router.get("/", verifyToken, checkPermission("project-issues", "view"), getAllIssues);
router.get("/:issueId", verifyToken, checkPermission("project-issues", "view"), getIssueById);
router.put("/:issueId", upload.array("attachments", 5), verifyToken, checkPermission("project-issues", "edit"), editIssue);
router.delete("/:issueId", verifyToken, checkPermission("project-issues", "delete"), deleteIssue);
router.patch("/resolve/:issueId", verifyToken, checkPermission("project-issues", "approve"), resolveIssue);
router.patch("/reject/:issueId", verifyToken, checkPermission("project-issues", "reject"), rejectIssue);
router.get("/members/:issueId", verifyToken, checkPermission("project-issues", "view"), getAssignedUsers)
router.patch("/members/:issueId", verifyToken, checkPermission("project-issues", "edit"), editAssignedUsers);
router.post("/comments/:issueId", upload.single("image"), verifyToken, addComment);
router.get("/comments/:issueId", verifyToken, getAllComments);
router.put("/comments/:issueId/:commentId", upload.single("image"), verifyToken, editComment);
router.delete("/comments/:issueId/:commentId", verifyToken, deleteComment);

export default router;
