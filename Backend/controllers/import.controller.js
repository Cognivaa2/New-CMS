// controllers/import.controller.js
import xlsx from "xlsx";
import ImportJob from "../models/importJob.models.js";
import Company from "../models/company.models.js";
import User from "../models/user.models.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrors from "../utils/ApiErrors.js";
import logger from "../utils/logger.utils.js";
import { processImport } from "../helpers/importHelper.js";

const VALID_MODULES = [
    "roles", "users", "materialMaster", "vendors", "projects", "phases",
    "tasks", "subtasks", "projectInventory", "stockTransfers",
    "materialRequisitions", "purchaseOrders", "grns", "workOrders",
    "expenses", "payables", "issues",
];

const resolveCompanyAndUser = async (companyUUID, keycloakId) => {
    const company = await Company.findOne({ companyId: companyUUID, isDeleted: false }).lean();
    if (!company) return { error: "Company not found" };

    const user = keycloakId
        ? await User.findOne({ keycloakId, companyId: company._id, isDeleted: false }).lean()
        : null;

    return { company, user };
};

export const uploadImport = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }

        const { module, uploadedBy } = req.body;

        if (!module || !VALID_MODULES.includes(module)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Module", `module must be one of: ${VALID_MODULES.join(", ")}`)
            );
        }

        if (!req.file) {
            return res.status(400).json(
                new ApiErrors(400, "No File", "Please upload an Excel (.xlsx) or CSV file")
            );
        }

        const { company, error } = await resolveCompanyAndUser(companyUUID, uploadedBy);
        if (error) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", error));
        }

        let rows;
        try {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        } catch {
            return res.status(400).json(
                new ApiErrors(400, "Invalid File", "Could not parse file. Ensure it is a valid .xlsx or .csv file")
            );
        }

        if (!rows || rows.length === 0) {
            return res.status(400).json(
                new ApiErrors(400, "Empty File", "The uploaded file has no data rows")
            );
        }

        const user = uploadedBy
            ? await User.findOne({ keycloakId: uploadedBy, companyId: company._id, isDeleted: false }).lean()
            : null;

        const job = await ImportJob.create({
            companyId: company._id,
            module,
            status: "pending",
            totalRows: rows.length,
            createdBy: user?._id || null,
        });

        setImmediate(() => {
            processImport({
                jobId: job._id,
                module,
                rows,
                companyId: company._id,
                creatorUserId: user?._id || null,
                company,
            }).catch((err) =>
                logger.error("processImport unhandled error", { jobId: job._id, error: err.message })
            );
        });

        logger.info("Import job created", { jobId: job._id, module, rows: rows.length });

        return res.status(202).json(
            new ApiResponse(
                202,
                { jobId: job._id, module, totalRows: rows.length, status: "pending" },
                "Import Started",
                `Import job created for ${rows.length} row(s). Poll /import/status/${job._id} for progress.`
            )
        );
    } catch (error) {
        logger.error("uploadImport failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to start import job")
        );
    }
};

export const getImportStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const companyUUID = req.headers["x-company-id"];

        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }

        const company = await Company.findOne({ companyId: companyUUID, isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "Invalid companyId"));
        }

        const job = await ImportJob.findOne({ _id: jobId, companyId: company._id }).lean();
        if (!job) {
            return res.status(404).json(
                new ApiErrors(404, "Job Not Found", "No import job found with the provided jobId")
            );
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    jobId: job._id,
                    module: job.module,
                    status: job.status,
                    totalRows: job.totalRows,
                    successCount: job.successCount,
                    failedCount: job.failedCount,
                    results: job.results,
                    errorMessage: job.errorMessage,
                    createdAt: job.createdAt,
                    completedAt: job.completedAt,
                },
                "Job Status",
                `Import job is ${job.status}`
            )
        );
    } catch (error) {
        logger.error("getImportStatus failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch import job status")
        );
    }
};

export const getImportHistory = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }

        const company = await Company.findOne({ companyId: companyUUID, isDeleted: false }).lean();
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "Invalid companyId"));
        }

        const { page = 1, limit = 20, module, status } = req.query;
        const pageNumber = Math.max(1, parseInt(page));
        const pageSize = Math.min(50, Math.max(1, parseInt(limit)));

        const filter = { companyId: company._id };
        if (module && VALID_MODULES.includes(module)) filter.module = module;
        if (status) filter.status = status;

        const [jobs, total] = await Promise.all([
            ImportJob.find(filter)
                .select("-results")
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            ImportJob.countDocuments(filter),
        ]);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    jobs,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                "Import History",
                `Fetched ${jobs.length} import job(s)`
            )
        );
    } catch (error) {
        logger.error("getImportHistory failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "Failed to fetch import history")
        );
    }
};