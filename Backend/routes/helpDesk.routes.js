import express from "express";
import { raiseTicket, getMyTickets } from "../controllers/helpDesk.controller.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
const router = express.Router();

router.post("/", verifyToken, uploadDocument.array("attachments", 5), raiseTicket);
router.get("/:companyId", verifyToken, getMyTickets);

export default router;
