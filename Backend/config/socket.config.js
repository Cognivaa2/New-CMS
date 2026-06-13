import { Server } from "socket.io";
import logger from "../utils/logger.utils.js";

let io = null;

export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
        const { userId, companyId } = socket.handshake.auth;

        if (!userId || !companyId) {
            socket.disconnect(true);
            return;
        }

        socket.join(`user:${userId}`);
        socket.join(`company:${companyId}`);

        logger.info("[Socket] Client connected", { socketId: socket.id, userId, companyId });

        socket.on("disconnect", (reason) => {
            logger.info("[Socket] Client disconnected", { socketId: socket.id, userId, reason });
        });
    });

    return io;
}

export function getIO() {
    if (!io) throw new Error("Socket.io not initialized. Call initSocket(httpServer) first.");
    return io;
}

export function emitToUser(userId, event, data) {
    try {
        getIO().to(`user:${userId}`).emit(event, data);
    } catch (err) {
        logger.error("[Socket] emitToUser failed", { userId, event, error: err.message });
    }
}

export function emitToCompany(companyId, event, data) {
    try {
        getIO().to(`company:${companyId}`).emit(event, data);
    } catch (err) {
        logger.error("[Socket] emitToCompany failed", { companyId, event, error: err.message });
    }
}

export function emitToUsers(userIds, event, data) {
    try {
        const ioInstance = getIO();
        userIds.forEach((uid) => ioInstance.to(`user:${uid.toString()}`).emit(event, data));
    } catch (err) {
        logger.error("[Socket] emitToUsers failed", { event, error: err.message });
    }
}