import mongoose from "mongoose";
import Company from "../models/company.models.js";
import ApiErrors from "../utils/ApiErrors.js";

export const resolveCompany = async (req, res) => {
    const uuid = req.headers["x-company-id"]?.trim();
    if (!uuid) {
        res.status(400).json(
            new ApiErrors(400, "Missing Header", "x-company-id header is required")
        );
        return null;
    }
    const company = await Company
        .findOne({ companyId: uuid, isDeleted: false })
        .select("_id")
        .lean();
    if (!company) {
        res.status(404).json(
            new ApiErrors(404, "Company Not Found", "No active company found with the provided x-company-id")
        );
        return null;
    }
    return company;
};

export const parsePercent = (value, res) => {
    if (value === undefined || value === null) {
        res.status(400).json(
            new ApiErrors(400, "Missing Field", "completionPercent is required")
        );
        return null;
    }
    const pct = Number(value);
    if (isNaN(pct) || pct < 0 || pct > 100) {
        res.status(400).json(
            new ApiErrors(400, "Validation Failed", "completionPercent must be a number between 0 and 100")
        );
        return null;
    }
    return pct;
};

export const resolveObjectId = (value, label, res) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        res.status(400).json(
            new ApiErrors(400, `Invalid ${label}`, `Provide a valid MongoDB ObjectId for ${label}`)
        );
        return null;
    }
    return value;
};