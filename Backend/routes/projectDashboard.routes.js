import { Router } from "express";
import { getProjectDetails, getProjectMembers, getPhaseGrowth, getSmartAlerts, getProjectKPIs, getExecutionSummary, getTeamWorkload, getExecutionKPIs, getExecutionTrend, getBurnDownChart, getProductivityHeatmap, getDelayPrediction, getExecutionRiskScore } from "../controllers/projectDashboard.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const dashboardRouter = Router();

dashboardRouter.get("/overview/:projectId/details", verifyToken, getProjectDetails);
dashboardRouter.get("/overview/:projectId/members", verifyToken, getProjectMembers);
dashboardRouter.get("/overview/:projectId/kpis", verifyToken, getProjectKPIs);
dashboardRouter.get("/overview/:projectId/phase", verifyToken, getPhaseGrowth);
dashboardRouter.get("/overview/:projectId/alerts", verifyToken, getSmartAlerts);

dashboardRouter.get("/execution/:projectId/summary", verifyToken, getExecutionSummary);
dashboardRouter.get("/execution/:projectId/workload", verifyToken, getTeamWorkload);
dashboardRouter.get("/execution/:projectId/kpis", verifyToken, getExecutionKPIs);
dashboardRouter.get("/execution/:projectId/trend", verifyToken, getExecutionTrend);
dashboardRouter.get("/execution/:projectId/burndown", verifyToken, getBurnDownChart);
dashboardRouter.get("/execution/:projectId/heatmap", verifyToken, getProductivityHeatmap);
dashboardRouter.get("/execution/:projectId/delay", verifyToken, getDelayPrediction);
dashboardRouter.get("/execution/:projectId/risk", verifyToken, getExecutionRiskScore);


export default dashboardRouter;