import express from "express";
import { getUserNotifications, sendManualNotification } from "../controllers/notification.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";

const router = express.Router();

router.get("/", verifyToken, getUserNotifications);
router.post("/send", verifyToken, sendManualNotification);

export default router;