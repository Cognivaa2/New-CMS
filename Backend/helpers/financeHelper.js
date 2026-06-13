import mongoose from "mongoose";
import Company from "../models/company.models.js";

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const resolveCompany = async (uuid) =>
    Company.findOne({ companyId: uuid?.trim(), isDeleted: false }).lean();

export const safeFixed = (value, decimals = 2) =>
    parseFloat((value ?? 0).toFixed(decimals));

export const buildDateRangeFilter = (dateFrom, dateTo) => {
    const filter = {};
    if (dateFrom) {
        const d = new Date(dateFrom);
        d.setUTCHours(0, 0, 0, 0);
        filter.$gte = d;
    }
    if (dateTo) {
        const d = new Date(dateTo);
        d.setUTCHours(23, 59, 59, 999);
        filter.$lte = d;
    }
    return filter;
};

export const getCurrentMonthBounds = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { monthStart, monthEnd };
};

export const buildPagination = (total, page, limit) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
});