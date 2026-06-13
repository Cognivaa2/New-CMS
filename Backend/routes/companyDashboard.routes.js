import express from "express";
import {
    getCompanyDashboardKPIs,
    getProjectCompletionChart,
    getInventoryPieChart,
    getProjectExpenseChart,
    getCompanyTasksFlow,
} from "../controllers/companyDashboard.controller.js";

const router = express.Router();

router.get("/kpis", getCompanyDashboardKPIs);
router.get("/projects", getProjectCompletionChart);
router.get("/inventory", getInventoryPieChart);
router.get("/expense", getProjectExpenseChart);
router.get("/tasks", getCompanyTasksFlow);

export default router;