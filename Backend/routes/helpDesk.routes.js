import express from "express";
import { raiseTicket, getMyTickets } from "../controllers/helpdesk.controller.js";
import { uploadDocument } from "../middlewares/upload.middlewares.js";

const router = express.Router();

router.post("/", uploadDocument.array("attachments", 5), raiseTicket);
router.get("/:keycloakId", getMyTickets);

export default router;
