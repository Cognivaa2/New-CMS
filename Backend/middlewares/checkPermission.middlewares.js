import ApiErrors from "../utils/ApiErrors.js";
import logger from "../utils/logger.utils.js";

export const checkPermission = (module, action) => {
    return (req, res, next) => {
        try {
            if (req.user?.isOwner) {
                return next();
            }

            const permissions = req.permissions;
            const moduleStatus = req.moduleStatus;

            if (!permissions) {
                return res.status(403).json(
                    new ApiErrors(403, "Forbidden", "Permission data not found. Please log in again")
                );
            }

            if (moduleStatus && moduleStatus[module] === false) {
                logger.warn("Module disabled", {
                    keycloakId: req.user?.keycloakId,
                    module,
                });
                return res.status(403).json(
                    new ApiErrors(403, "Access Denied", `The ${module} module is currently disabled`)
                );
            }

            const modulePermissions = permissions[module];
            if (!modulePermissions || !modulePermissions.includes(action)) {
                logger.warn("Permission denied", {
                    keycloakId: req.user?.keycloakId,
                    module,
                    action,
                });
                return res.status(403).json(
                    new ApiErrors(403, "Access Denied", `You do not have permission to ${action} in the ${module} module`)
                );
            }

            return next();
        } catch (error) {
            logger.error("checkPermission failed", { error: error.message });
            return res.status(500).json(
                new ApiErrors(500, "Internal Server Error", "Something went wrong during authorization")
            );
        }
    };
};