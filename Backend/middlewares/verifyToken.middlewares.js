import keycloakService from "../services/keycloak.service.js";
import User from "../models/user.models.js";
import Role from "../models/role.models.js";
import Company from "../models/company.models.js";
import ApiErrors from "../utils/ApiErrors.js";
import logger from "../utils/logger.utils.js";
import axios from "axios";
import keycloakConfig from "../config/keycloak.configs.js";

export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json(
                new ApiErrors(401, "Unauthorized", "Access token is required")
            );
        }
        const accessToken = authHeader.split(" ")[1];
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const introspectBody = new URLSearchParams({
            token: accessToken,
            client_id: keycloakConfig.clientId,
            client_secret: keycloakConfig.clientSecret,
        });
        let introspectData;
        try {
            const { data } = await axios.post(
                `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token/introspect`,
                introspectBody.toString(),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    timeout: 10_000,
                }
            );
            introspectData = data;
        } catch (err) {
            logger.error("Keycloak introspect call failed", { error: err.message });
            return res.status(401).json(
                new ApiErrors(401, "Unauthorized", "Token validation failed")
            );
        }

        if (!introspectData.active) {
            return res.status(401).json(
                new ApiErrors(401, "Token Expired", "Your session has expired. Please log in again")
            );
        }
        const keycloakId = introspectData.sub;
        if (!keycloakId) {
            return res.status(401).json(
                new ApiErrors(401, "Unauthorized", "Invalid token payload")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false })
            .select("_id")
            .lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid companyId in headers")
            );
        }
        const mongoUser = await User.findOne({
            keycloakId,
            companyId: company._id,
            isDeleted: false,
        }).select("+status roleId isOwner companyId").lean();

        if (!mongoUser) {
            return res.status(401).json(
                new ApiErrors(401, "Unauthorized", "User not found")
            );
        }
        if (mongoUser.status === "Inactive") {
            return res.status(403).json(
                new ApiErrors(403, "Account Disabled", "Your account has been deactivated. Please contact your administrator")
            );
        }
        if (mongoUser.isOwner) {
            req.user = {
                keycloakId,
                userId: mongoUser._id,
                companyId: mongoUser.companyId,
                roleId: mongoUser.roleId,
                isOwner: true,
            };
            req.permissions = {};
            return next();
        }
        const role = await Role.findOne({
            _id: mongoUser.roleId,
            companyId: company._id,
            isDeleted: false,
            isActive: true,
        });

        if (!role) {
            return res.status(403).json(
                new ApiErrors(403, "Role Not Found", "Your assigned role is inactive or no longer exists. Please contact your administrator")
            );
        }
        req.user = {
            keycloakId,
            userId: mongoUser._id,
            companyId: mongoUser.companyId,
            roleId: mongoUser.roleId,
            isOwner: false,
        };
        req.permissions = Object.fromEntries(role.permissions);
        req.moduleStatus = Object.fromEntries(role.moduleStatus);
        logger.info("Token verified successfully", { keycloakId, roleId: mongoUser.roleId });
        return next();
    } catch (error) {
        logger.error("verifyToken failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Something went wrong during authentication")
        );
    }
};