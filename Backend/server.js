import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

import cors from "cors";
import express from "express";
import { createServer } from "http";
import connectDB from "./config/db.configs.js";
import { initSocket } from "./config/socket.config.js";
import companyRoutes from "./routes/company.routes.js";
import userRoutes from "./routes/user.routes.js";
import roleRoutes from "./routes/role.routes.js";
import projectRoutes from "./routes/project.routes.js";
import phaseRoutes from "./routes/phase.routes.js";
import taskRoutes from "./routes/task.routes.js";
import subtaskRoutes from "./routes/subtask.routes.js";
import authRoutes from "./routes/auth.routes.js";
import completionRoutes from "./routes/completion.routes.js";
import documentRoutes from "./routes/document.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import issueRoutes from "./routes/issue.route.js";
import materialMasterRoutes from "./routes/materialMaster.routes.js";
import ganttRoutes from "./routes/gantt.routes.js";
import materialConsumptionRoutes from "./routes/materialConsumption.routes.js";
import vendorRoutes from "./routes/vendors.routes.js";
import materialRequisition from "./routes/materialRequisition.routes.js";
import stockTransfer from "./routes/stockTransfer.routes.js";
import purchaseOrder from "./routes/purchaseOrder.routes.js";
import grnRoutes from "./routes/grn.routes.js";
import projectDashboardRoutes from "./routes/projectDashboard.routes.js";
import companyDashboardRoutes from "./routes/companyDashboard.routes.js";
import workOrderRoutes from "./routes/workOrder.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import dprRoutes from "./routes/dpr.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import payableRoutes from "./routes/payable.routes.js";
import vendorAdvanceRoutes from "./routes/vendorAdvance.routes.js";
import financeRoutes from "./routes/finance.routes.js";
import adjustmentRoutes from "./routes/stockAdjustment.routes.js";
import reconciliationRoutes from "./routes/reconciliation.routes.js";
import safetyRoutes from "./routes/safety.routes.js";
import importRoutes from "./routes/import.routes.js";


const app = express();
const httpServer = createServer(app);

initSocket(httpServer);

app.set("trust proxy", true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/company", companyRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/role", roleRoutes);
app.use("/api/v1/project", projectRoutes);
app.use("/api/v1/phase", phaseRoutes);
app.use("/api/v1/task", taskRoutes);
app.use("/api/v1/subtask", subtaskRoutes);
app.use("/api/v1/completion", completionRoutes);
app.use("/api/v1/document", documentRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/issue", issueRoutes);
app.use("/api/v1/material", materialMasterRoutes);
app.use("/api/v1/gantt", ganttRoutes);
app.use("/api/v1/consumption", materialConsumptionRoutes);
app.use("/api/v1/vendors", vendorRoutes);
app.use("/api/v1/requisition", materialRequisition);
app.use("/api/v1/stocktransfer", stockTransfer);
app.use("/api/v1/po", purchaseOrder);
app.use("/api/v1/grn", grnRoutes);
app.use("/api/v1/project/dashboard", projectDashboardRoutes);
app.use("/api/v1/company/dashboard", companyDashboardRoutes);
app.use("/api/v1/wo", workOrderRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/dpr", dprRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/superadmin", superAdminRoutes);
app.use("/api/v1/payables", payableRoutes);
app.use("/api/v1/vendors/advance", vendorAdvanceRoutes);
app.use("/api/v1/finance", financeRoutes);
app.use("/api/v1/adjustments", adjustmentRoutes);
app.use("/api/v1/reconciliation", reconciliationRoutes);
app.use("/api/v1/safety", safetyRoutes);
app.use("/api/v1/import", importRoutes);


app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

const PING_URL = "https://cms-h1c4.onrender.com/api/health";
const PING_INTERVAL_MS = 14 * 60 * 1000;
setInterval(async () => {
    try {
        const res = await fetch(PING_URL);
        console.log(`[keep-alive] ping ${res.status} @ ${new Date().toISOString()}`);
    } catch (err) {
        console.error(`[keep-alive] ping failed:`, err.message);
    }
}, PING_INTERVAL_MS);


httpServer.listen(5000, "0.0.0.0", () => {
    console.log(`Server running on port 5000`);
});