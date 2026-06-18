import Helpdesk, { HELPDESK_CATEGORIES, HELPDESK_PRIORITIES } from "../models/helpdesk.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import sendEmail from "../services/email.service.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";
import buildHelpdeskEmailHtml from "../helpers/helpDeskEmail.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { v4 as uuidv4 } from "uuid";

// ─── POST /helpdesk — Raise a new ticket ──────────────────────────────────────
export const raiseTicket = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
            return res.status(401).json(new ApiErrors(401, "Unauthorized", "Authentication required"));
        }

        const { category, priority, subject, description, attachments } = req.body;

        // Validation
        if (!category || !HELPDESK_CATEGORIES.includes(category)) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", `category must be one of: ${HELPDESK_CATEGORIES.join(", ")}`)
            );
        }
        if (!subject?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Validation Error", "subject is required"));
        }
        if (!description?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Validation Error", "description is required"));
        }
        if (priority && !HELPDESK_PRIORITIES.includes(priority)) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", `priority must be one of: ${HELPDESK_PRIORITIES.join(", ")}`)
            );
        }

        // Fetch company and user info for the email
        const [company, user] = await Promise.all([
            Company.findById(companyId).select("companyName email phone").lean(),
            User.findById(userId).select("name email phone").lean(),
        ]);

        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Not Found", "Company not found"));
        }
        if (!user) {
            return res.status(404).json(new ApiErrors(404, "Not Found", "User not found"));
        }

        // Handle file uploads
        const uploadedAttachments = [];
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const ext = file.originalname.split(".").pop();
                const key = `helpdesk/${companyId}/${uuidv4()}.${ext}`;
                const result = await uploadToR2({
                    buffer: file.buffer,
                    mimeType: file.mimetype,
                    key,
                });
                uploadedAttachments.push(result.url);
            }
        }

        // Also merge any text-based attachment URLs sent in the body if needed
        if (Array.isArray(attachments)) {
            uploadedAttachments.push(...attachments);
        }

        // Create ticket
        const ticket = await Helpdesk.create({
            companyId,
            raisedBy: userId,
            category,
            priority: priority || "Medium",
            subject: subject.trim(),
            description: description.trim(),
            attachments: uploadedAttachments,
        });

        // Send email to super admin (non-blocking — failure won't reject the ticket creation)
        const superAdminEmail = process.env.SENDGRID_FROM_EMAIL;
        try {
            await sendEmail({
                to: superAdminEmail,
                subject: `[${ticket.priority}] New Helpdesk Ticket ${ticket.ticketNumber} — ${company.companyName}`,
                html: buildHelpdeskEmailHtml({ ticket, company, user }),
            });

            // Track that the email was sent
            ticket.emailNotifiedAt = new Date();
            await ticket.save();
        } catch (emailErr) {
            logger.error("Helpdesk email notification failed", {
                ticketId: ticket._id,
                error: emailErr.message,
            });
            // Continue — ticket is already saved, email is best-effort
        }

        logger.info("Helpdesk ticket raised", {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            companyId,
            userId,
        });

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    ticketNumber: ticket.ticketNumber,
                    ticketId: ticket._id,
                    status: ticket.status,
                    priority: ticket.priority,
                    category: ticket.category,
                    subject: ticket.subject,
                    createdAt: ticket.createdAt,
                },
                "Ticket raised successfully. Our team will get back to you shortly."
            )
        );
    } catch (error) {
        logger.error("raiseTicket failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to raise ticket"));
    }
};

// ─── GET /helpdesk — Fetch tickets for the logged-in company ─────────────────
export const getMyTickets = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
            return res.status(401).json(new ApiErrors(401, "Unauthorized", "Authentication required"));
        }

        const {
            page = 1,
            limit = 20,
            status,
            priority,
            category,
        } = req.query;

        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

        const filter = { companyId, isDeleted: false };
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;

        const [tickets, total] = await Promise.all([
            Helpdesk.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .populate("raisedBy", "name email")
                .select("-isDeleted -deletedAt -__v -replies")
                .lean(),
            Helpdesk.countDocuments(filter),
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    tickets,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Tickets retrieved successfully"
            )
        );
    } catch (error) {
        logger.error("getMyTickets failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to fetch tickets"));
    }
};
