import mongoose from "mongoose";
import Company from "../models/company.models.js";
import Project from "../models/project.models.js";

const resolveCompanyAndProject = async (companyUUID, projectId) => {
    const company = await Company.findOne({
        companyId: companyUUID.trim(),
        isDeleted: false,
    }).lean();
    if (!company) return { error: "company" };

    if (!mongoose.Types.ObjectId.isValid(projectId)) return { error: "projectId" };

    const project = await Project.findOne({
        _id: projectId,
        companyId: company._id,
        isDeleted: false,
    }).lean();
    if (!project) return { error: "project" };

    return { company, project };
};

export default resolveCompanyAndProject;