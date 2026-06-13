import express from "express";
import multer from "multer";

import {
    createManualExpense,
    approveManualExpense,
    rejectManualExpense,
    markExpenseAsPaid,
    getAllExpenses,
    getSingleExpense,
    getProjectDashboard,
    getCommittedCosts,
    exportExpenseReport,
    getExpenseTrend
} from "../controllers/expense.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router({ mergeParams: true });

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});


router.get("/:projectId/dashboard", verifyToken, checkPermission("project-expense", "view"), getProjectDashboard);
router.get("/:projectId/committed", verifyToken, checkPermission("project-expense", "view"), getCommittedCosts);
router.get("/:projectId/export", verifyToken, checkPermission("project-expense", "download"), exportExpenseReport);
router.get("/:projectId/trend", verifyToken, checkPermission("project-expense", "view"), getExpenseTrend);


router.post("/:projectId", upload.single("proof"), verifyToken, checkPermission("project-expense", "create"), createManualExpense);
router.get("/:projectId", verifyToken, checkPermission("project-expense", "view"), getAllExpenses);
router.get("/:projectId/:expenseId", verifyToken, checkPermission("project-expense", "view"), getSingleExpense);
router.patch("/:projectId/approve/:expenseId", verifyToken, checkPermission("project-expense", "approve"), approveManualExpense);
router.patch("/:projectId/reject/:expenseId", verifyToken, checkPermission("project-expense", "reject"), rejectManualExpense);
router.patch("/:projectId/paid/:expenseId", verifyToken, checkPermission("project-expense", "edit"), markExpenseAsPaid);



export default router;