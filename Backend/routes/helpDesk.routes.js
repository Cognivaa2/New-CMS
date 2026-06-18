import express from "express";
import { raiseTicket, getMyTickets } from "../controllers/helpdesk.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js";

const router = express.Router();

router.post("/", verifyToken, uploadDocument.array("attachments", 5), raiseTicket);
router.get("/", verifyToken, getMyTickets);

export default router;
