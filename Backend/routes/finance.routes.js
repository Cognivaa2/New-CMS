import express from "express";
import {
    getFinanceOverview,
    getCashFlow,
    getExpenseBreakdown,
    getFinanceAlerts,
    getProjectFinancialOverview,
    getRecentTransactions,
    getAllPayables,
    getTopVendors,
    getVendorAdvanceSummary,
    getOverduePayables,
    getVendorFinancialList,
    getVendorFinancialProfile,
} from "../controllers/finance.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = express.Router();

router.get("/overview", verifyToken, checkPermission("primary-finance", "view"), getFinanceOverview);
router.get("/cashflow", verifyToken, checkPermission("primary-finance", "view"), getCashFlow);
router.get("/expense-breakdown", verifyToken, checkPermission("primary-finance", "view"), getExpenseBreakdown);
router.get("/alerts", verifyToken, checkPermission("primary-finance", "view"), getFinanceAlerts);
router.get("/projects", verifyToken, checkPermission("primary-finance", "view"), getProjectFinancialOverview);
router.get("/transactions", verifyToken, checkPermission("primary-finance", "view"), getRecentTransactions);
router.get("/payables", verifyToken, checkPermission("primary-finance", "view"), getAllPayables);
router.get("/top-vendors", verifyToken, checkPermission("primary-finance", "view"), getTopVendors);
router.get("/vendor-advances", verifyToken, checkPermission("primary-finance", "view"), getVendorAdvanceSummary);
router.get("/overdue", verifyToken, checkPermission("primary-finance", "view"), getOverduePayables);
router.get("/vendors", verifyToken, checkPermission("primary-finance", "view"), getVendorFinancialList);
router.get("/vendors/:vendorId", verifyToken, checkPermission("primary-finance", "view"), getVendorFinancialProfile);

export default router;