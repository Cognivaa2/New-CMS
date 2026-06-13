import { resolveCompany, resolveProject, buildGanttPayload, buildGanttWorkbook } from "../helpers/ganttHelper.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import logger from "../utils/logger.utils.js";



const getGanttDataService = async (req) => {
    const companyUUID = req.headers["x-company-id"];
    const { projectId } = req.params;
    const company = await resolveCompany(companyUUID);
    const project = await resolveProject(projectId, company._id);
    const ganttPayload = await buildGanttPayload(project);
    return { ganttPayload, project };
};


// This function returns Gantt chart data for a project. takes x-company-id in headers and projectId in params. calls service layer to fetch structured Gantt payload and returns it in API response. -------------------------- Ayan
export const getGanttData = async (req, res) => {
    try {
        const { ganttPayload, project } = await getGanttDataService(req);
        return res.status(200).json(
            new ApiResponse(
                200,
                ganttPayload,
                "Gantt Data Retrieved",
                `Gantt chart data for "${project.projectName}" fetched successfully`
            )
        );
    } catch (error) {
        logger.error("getGanttData failed", {
            error: error.message,
            projectId: req.params.projectId,
        });
        const status = error.statusCode || error.status || 500;
        return res.status(status).json(
            new ApiErrors(status, error.message || "Failed to fetch Gantt data")
        );
    }
};


// This function exports Gantt chart data as an Excel file. takes x-company-id in headers and projectId in params. builds Gantt payload, converts it into Excel workbook and streams it as downloadable file. -------------------------- Ayan
export const exportGanttExcel = async (req, res) => {
    try {
        const { ganttPayload, project } = await getGanttDataService(req);
        const workbook = await buildGanttWorkbook(ganttPayload);
        const safeName = project.projectName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
        const filename = `Gantt_${safeName}_${Date.now()}.xlsx`;
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        logger.error("exportGanttExcel failed", {
            error: error.message,
            projectId: req.params.projectId,
        });
        if (!res.headersSent) {
            const status = error.statusCode || error.status || 500;
            return res.status(status).json(
                new ApiErrors(status, error.message || "Failed to export Gantt Excel")
            );
        }
    }
};