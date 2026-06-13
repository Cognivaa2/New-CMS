import Notification from "../models/notification.models.js";
import User from "../models/user.models.js";
import NotificationService from "../services/notification.service.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";

function cleanNotification(notification) {
    const cleaned = { ...notification };
    if (cleaned.metadata) {
        const cleanMeta = {};
        for (const [key, val] of Object.entries(cleaned.metadata)) {
            if (val !== null && val !== undefined) cleanMeta[key] = val;
        }
        if (Object.keys(cleanMeta).length > 0) {
            cleaned.metadata = cleanMeta;
        } else {
            delete cleaned.metadata;
        }
    }
    if (!cleaned.triggeredBy) delete cleaned.triggeredBy;
    return cleaned;
}

export const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
            return res.status(401).json(new ApiErrors(401, "Unauthorized", "User or company not found"));
        }

        const {
            page = 1,
            limit = 20,
            isRead,
            type,
            search,
        } = req.query;

        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

        const filter = {
            companyId,
            recipientId: userId,
            isDeleted: false,
        };

        if (isRead !== undefined) filter.isRead = isRead === "true";
        if (type) filter.type = type;
        if (search?.trim()) {
            filter.$or = [
                { title: { $regex: search.trim(), $options: "i" } },
                { message: { $regex: search.trim(), $options: "i" } },
            ];
        }

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .populate("triggeredBy", "name email avatar")
                .select("-companyId -channel -isDeleted -deletedAt -updatedAt -__v -readAt")
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ companyId, recipientId: userId, isRead: false, isDeleted: false }),
        ]);

        const unreadIds = notifications
            .filter((n) => !n.isRead)
            .map((n) => n._id);

        if (unreadIds.length > 0) {
            await Notification.updateMany(
                { _id: { $in: unreadIds } },
                { $set: { isRead: true, readAt: new Date() } }
            );
            await NotificationService.emitUnreadCount(userId, companyId);
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    notifications: notifications.map(cleanNotification),
                    unreadCount,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Notifications retrieved successfully"
            )
        );
    } catch (error) {
        logger.error("getUserNotifications failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to retrieve notifications"));
    }
};

export const sendManualNotification = async (req, res) => {
    try {
        const senderId = req.user?.userId;
        const companyId = req.user?.companyId;

        if (!senderId || !companyId) {
            return res.status(401).json(new ApiErrors(401, "Unauthorized", "Authentication required"));
        }

        const { recipientIds, message } = req.body;

        if (!message?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Validation Error", "message is required"));
        }

        if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
            return res.status(400).json(new ApiErrors(400, "Validation Error", "recipientIds must be a non-empty array"));
        }

        const validIds = recipientIds.filter((id) => id && typeof id === "string" && id.trim());
        if (validIds.length !== recipientIds.length) {
            return res.status(400).json(new ApiErrors(400, "Validation Error", "recipientIds contains null or empty values"));
        }

        const resolvedUsers = await User.find({
            keycloakId: { $in: validIds },
            companyId,
            isDeleted: false,
        }).select("_id").lean();

        if (resolvedUsers.length === 0) {
            return res.status(400).json(new ApiErrors(400, "Invalid Recipients", "No valid users found for the provided recipient IDs"));
        }

        const resolvedMongoIds = resolvedUsers.map((u) => u._id.toString());

        await NotificationService.notifyManual({
            companyId,
            senderId,
            recipientIds: resolvedMongoIds,
            message,
        });

        logger.info("Manual notification sent", { senderId, recipientCount: resolvedMongoIds.length });

        return res.status(200).json(
            new ApiResponse(200, null, "Notification sent successfully")
        );
    } catch (error) {
        logger.error("sendManualNotification failed", { error: error.message, stack: error.stack });
        return res.status(500).json(new ApiErrors(500, "Internal Server Error", "Failed to send notification"));
    }
};