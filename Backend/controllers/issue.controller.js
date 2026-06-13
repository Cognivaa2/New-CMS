import mongoose from "mongoose";
import Issue from "../models/issue.models.js";
import Project from "../models/project.models.js";
import Task from "../models/task.models.js";
import SubTask from "../models/subTask.models.js";
import { ISSUE_TYPES, ISSUE_PRIORITIES, ISSUE_STATUSES } from "../models/issue.models.js";
import logger from "../utils/logger.utils.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiErrors from "../utils/ApiErrors.js";
import { resolveCompany, resolveUserByKeycloak, enrichUser, parseTags, parseAttachments } from "../helpers/issueHelper.js";
import NotificationService from "../services/notification.service.js";


// This function creates a new issue under a project. takes x-company-id in headers and issue details like title, description, issueType, priority, projectId, taskId, subtaskId, dueDate, tags and createdBy in body. validates all relations, parses tags & attachments, and stores the issue  -------------------------- Ayan
export const createIssue = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { title, description, issueType, priority, projectId, taskId, subtaskId, dueDate, tags, createdBy, } = req.body;
        const missing = [];
        if (!title?.trim()) missing.push("title");
        if (!description?.trim()) missing.push("description");
        if (!issueType) missing.push("issueType");
        if (!projectId) missing.push("projectId");
        if (!createdBy?.trim()) missing.push("createdBy");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid projectId", "projectId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const creatorUser = await resolveUserByKeycloak(createdBy, company._id);
        if (!creatorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${createdBy}`)
            );
        }
        const project = await Project.findOne({
            _id: projectId,
            companyId: company._id,
            isDeleted: false,
        }).select("_id").lean();
        if (!project) {
            return res.status(404).json(
                new ApiErrors(404, "Project Not Found", "No project found with the given ID for this company")
            );
        }
        if (!ISSUE_TYPES.includes(issueType)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid issueType", `Valid types: ${ISSUE_TYPES.join(", ")}`)
            );
        }
        if (priority && !ISSUE_PRIORITIES.includes(priority)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid priority", `Valid priorities: ${ISSUE_PRIORITIES.join(", ")}`)
            );
        }
        if (taskId) {
            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid taskId", "taskId must be a valid MongoDB ObjectId")
                );
            }
            const task = await Task.findOne({
                _id: taskId,
                projectId: project._id,
                isDeleted: false,
            }).lean();
            if (!task) {
                return res.status(404).json(
                    new ApiErrors(404, "Task Not Found", "No task found with this ID under the given project")
                );
            }
        }
        if (subtaskId) {
            if (!taskId) {
                return res.status(400).json(
                    new ApiErrors(400, "Missing taskId", "taskId is required when subtaskId is provided")
                );
            }
            if (!mongoose.Types.ObjectId.isValid(subtaskId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid subtaskId", "subtaskId must be a valid MongoDB ObjectId")
                );
            }
            const subtask = await SubTask.findOne({
                _id: subtaskId,
                taskId,
                isDeleted: false,
            }).lean();
            if (!subtask) {
                return res.status(404).json(
                    new ApiErrors(404, "Subtask Not Found", "No subtask found with this ID under the given task")
                );
            }
        }
        let parsedDueDate = null;
        if (dueDate) {
            parsedDueDate = new Date(dueDate);
            if (isNaN(parsedDueDate.getTime())) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid dueDate", "dueDate must be a valid date string")
                );
            }
        }
        const parsedTags = parseTags(tags);
        const attachments = await parseAttachments(req, "issues/attachments", creatorUser._id);
        const issue = await Issue.create({
            companyId: company._id,
            projectId: project._id,
            taskId: taskId ? new mongoose.Types.ObjectId(taskId) : null,
            subtaskId: subtaskId ? new mongoose.Types.ObjectId(subtaskId) : null,
            title: title.trim(),
            description: description.trim(),
            issueType,
            priority: priority || "medium",
            status: "submitted",
            dueDate: parsedDueDate,
            tags: parsedTags,
            attachments,
            createdBy: creatorUser._id,
        });
        const enrichedCreator = await enrichUser(issue.createdBy);
        logger.info("Issue created", {
            issueId: issue._id,
            projectId: project._id,
            createdBy: creatorUser._id,
        });
        const projectForNotif = await Project.findById(issue.projectId).select("projectName").lean();
        NotificationService.notifyIssueRaised({
            companyId: company._id,
            projectId: issue.projectId,
            projectName: projectForNotif?.projectName || "",
            issueId: issue._id,
            issueTitle: issue.title,
        }).catch(err => logger.error("notifyIssueRaised failed (non-fatal)", { error: err.message }));
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    issueId: issue._id,
                    title: issue.title,
                    description: issue.description,
                    issueType: issue.issueType,
                    priority: issue.priority,
                    status: issue.status,
                    projectId: issue.projectId,
                    taskId: issue.taskId || null,
                    subtaskId: issue.subtaskId || null,
                    dueDate: issue.dueDate || null,
                    tags: issue.tags,
                    attachments: issue.attachments,
                    createdBy: enrichedCreator,
                    createdAt: issue.createdAt,
                },
                "Issue Created",
                `Issue "${issue.title}" submitted successfully`
            )
        );
    } catch (error) {
        logger.error("createIssue failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function returns all issues for a company. takes x-company-id in headers and supports pagination, search (title, description, tags), filtering (status, priority, issueType, projectId, taskId, assignedTo, date range) and sorting (createdAt, updatedAt, priority, status, dueDate, title). -------------------------- Ayan
export const getAllIssues = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Please provide a valid companyId")
            );
        }
        const {
            page = 1, limit = 10, search = "",
            status, priority, issueType,
            projectId, taskId, assignedTo,
            dateFrom, dateTo,
            sortBy = "createdAt", order = "desc",
        } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid page", "page must be a positive integer")
            );
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid limit", "limit must be between 1 and 100")
            );
        }
        const filter = { companyId: company._id, isDeleted: false };
        if (status) {
            if (!ISSUE_STATUSES.includes(status)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid status", `Valid statuses: ${ISSUE_STATUSES.join(", ")}`)
                );
            }
            filter.status = status;
        }
        if (priority) {
            if (!ISSUE_PRIORITIES.includes(priority)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid priority", `Valid priorities: ${ISSUE_PRIORITIES.join(", ")}`)
                );
            }
            filter.priority = priority;
        }
        if (issueType) {
            if (!ISSUE_TYPES.includes(issueType)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid issueType", `Valid types: ${ISSUE_TYPES.join(", ")}`)
                );
            }
            filter.issueType = issueType;
        }
        if (projectId) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid projectId", "projectId must be a valid MongoDB ObjectId")
                );
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (taskId) {
            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                return res.status(400).json(
                    new ApiErrors(400, "Invalid taskId", "taskId must be a valid MongoDB ObjectId")
                );
            }
            filter.taskId = new mongoose.Types.ObjectId(taskId);
        }
        if (assignedTo) {
            const assignedUser = await resolveUserByKeycloak(assignedTo, company._id);
            if (!assignedUser) {
                return res.status(404).json(
                    new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${assignedTo}`)
                );
            }
            filter.assignedTo = assignedUser._id;
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (isNaN(from.getTime())) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid dateFrom", "dateFrom must be a valid date string")
                    );
                }
                filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (isNaN(to.getTime())) {
                    return res.status(400).json(
                        new ApiErrors(400, "Invalid dateTo", "dateTo must be a valid date string")
                    );
                }
                filter.createdAt.$lte = to;
            }
        }
        if (search?.trim()) {
            const regex = { $regex: search.trim(), $options: "i" };
            filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
        }
        const ALLOWED_SORT = ["createdAt", "updatedAt", "priority", "status", "dueDate", "title"];
        const sortField = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;
        const [issues, total] = await Promise.all([
            Issue.find(filter)
                .select("_id title issueType priority status projectId taskId subtaskId assignedTo dueDate tags attachments createdBy resolvedBy resolvedAt rejectedBy rejectedAt rejectionRemark createdAt updatedAt")
                .sort({ [sortField]: sortOrder })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Issue.countDocuments(filter),
        ]);
        const formattedIssues = await Promise.all(
            issues.map(async (issue) => {
                const assignedToArray = !issue.assignedTo
                    ? []
                    : Array.isArray(issue.assignedTo)
                        ? issue.assignedTo
                        : [issue.assignedTo];

                const [enrichedCreator, enrichedResolver, enrichedRejector, ...enrichedAssignees] = await Promise.all([
                    enrichUser(issue.createdBy),
                    enrichUser(issue.resolvedBy ?? null),
                    enrichUser(issue.rejectedBy ?? null),
                    ...assignedToArray.map((id) => enrichUser(id)),
                ]);
                return {
                    issueId: issue._id,
                    title: issue.title,
                    issueType: issue.issueType,
                    priority: issue.priority,
                    status: issue.status,
                    projectId: issue.projectId,
                    taskId: issue.taskId || null,
                    subtaskId: issue.subtaskId || null,
                    dueDate: issue.dueDate || null,
                    tags: issue.tags,
                    attachments: issue.attachments,
                    createdBy: enrichedCreator,
                    assignedTo: enrichedAssignees,
                    resolvedBy: enrichedResolver,
                    resolvedAt: issue.resolvedAt || null,
                    rejectedBy: enrichedRejector,
                    rejectedAt: issue.rejectedAt || null,
                    rejectionRemark: issue.rejectionRemark || null,
                    createdAt: issue.createdAt,
                    updatedAt: issue.updatedAt,
                };
            })
        );
        logger.info("getAllIssues fetched", { total, page: pageNumber, companyId: companyUUID });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issues: formattedIssues,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                total > 0 ? "Issues fetched successfully" : "No issues found"
            )
        );
    } catch (error) {
        logger.error("getAllIssues failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};


// This function fetches details of a specific issue using issueId from params and x-company-id in headers. returns full issue info including creator, assignees, resolver, rejector and latest 5 comments preview with enriched user data. -------------------------- Ayan
export const getIssueById = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Please provide a valid companyId")
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        const [enrichedCreator, enrichedResolver, enrichedRejector] = await Promise.all([
            enrichUser(issue.createdBy),
            enrichUser(issue.resolvedBy ?? null),
            enrichUser(issue.rejectedBy ?? null),
        ]);
        const assignees = await Promise.all((issue.assignedTo || []).map((id) => enrichUser(id)));
        const activeComments = (issue.comments || []).filter((c) => !c.isDeleted);
        const recentComments = activeComments.slice(-5).reverse();
        const enrichedComments = await Promise.all(
            recentComments.map(async (c) => ({
                commentId: c._id,
                text: c.text,
                image: c.image || null,
                createdBy: await enrichUser(c.createdBy),
                editedAt: c.editedAt || null,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }))
        );
        logger.info("getIssueById fetched", { issueId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issueId: issue._id,
                    title: issue.title,
                    description: issue.description,
                    issueType: issue.issueType,
                    priority: issue.priority,
                    status: issue.status,
                    projectId: issue.projectId,
                    taskId: issue.taskId || null,
                    subtaskId: issue.subtaskId || null,
                    dueDate: issue.dueDate || null,
                    tags: issue.tags,
                    attachments: issue.attachments,
                    createdBy: enrichedCreator,
                    assignedTo: assignees,
                    resolvedBy: enrichedResolver,
                    resolvedAt: issue.resolvedAt || null,
                    rejectedBy: enrichedRejector,
                    rejectedAt: issue.rejectedAt || null,
                    rejectionRemark: issue.rejectionRemark || null,
                    commentPreview: enrichedComments,
                    totalComments: activeComments.length,
                    createdAt: issue.createdAt,
                    updatedAt: issue.updatedAt,
                },
                "Issue fetched successfully"
            )
        );
    } catch (error) {
        logger.error("getIssueById failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function updates an existing issue. takes x-company-id in headers, issueId in params and editable fields like title, description, issueType, priority, taskId, subtaskId, dueDate, tags and updatedBy in body. validates inputs, handles attachments and resets rejected issues if edited. -------------------------- Ayan
export const editIssue = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        console.log("BODY:", req.body);
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        if (issue.status === "resolved") {
            return res.status(400).json(
                new ApiErrors(400, "Cannot Edit", "Resolved issues cannot be edited")
            );
        }
        const { updatedBy, title, description, issueType, priority, taskId, subtaskId, dueDate, tags } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, company._id);
        if (!editorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const EDITABLE = ["title", "description", "issueType", "priority", "taskId", "subtaskId", "dueDate", "tags"];
        const provided = EDITABLE.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0 && !req.file && !req.files?.length) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field to update")
            );
        }
        const updates = {};
        const errors = [];
        if (title !== undefined) {
            if (!title.trim()) errors.push("title cannot be empty");
            else updates.title = title.trim();
        }
        if (description !== undefined) {
            if (!description.trim()) errors.push("description cannot be empty");
            else updates.description = description.trim();
        }
        if (issueType !== undefined) {
            if (!ISSUE_TYPES.includes(issueType)) errors.push(`Invalid issueType. Valid: ${ISSUE_TYPES.join(", ")}`);
            else updates.issueType = issueType;
        }
        if (priority !== undefined) {
            if (!ISSUE_PRIORITIES.includes(priority)) errors.push(`Invalid priority. Valid: ${ISSUE_PRIORITIES.join(", ")}`);
            else updates.priority = priority;
        }
        if (taskId !== undefined) {
            if (taskId === null || taskId === "") {
                updates.taskId = null;
                updates.subtaskId = null;
            } else if (!mongoose.Types.ObjectId.isValid(taskId)) {
                errors.push("taskId must be a valid MongoDB ObjectId");
            } else {
                const task = await Task.findOne({ _id: taskId, projectId: issue.projectId, isDeleted: false }).lean();
                if (!task) errors.push("No task found with this ID under the issue's project");
                else updates.taskId = new mongoose.Types.ObjectId(taskId);
            }
        }
        if (subtaskId !== undefined) {
            if (subtaskId === null || subtaskId === "") {
                updates.subtaskId = null;
            } else {
                const effectiveTaskId = updates.taskId ?? issue.taskId;
                if (!effectiveTaskId) {
                    errors.push("taskId is required when subtaskId is provided");
                } else if (!mongoose.Types.ObjectId.isValid(subtaskId)) {
                    errors.push("subtaskId must be a valid MongoDB ObjectId");
                } else {
                    const sub = await SubTask.findOne({ _id: subtaskId, taskId: effectiveTaskId, isDeleted: false }).lean();
                    if (!sub) errors.push("No subtask found with this ID under the given task");
                    else updates.subtaskId = new mongoose.Types.ObjectId(subtaskId);
                }
            }
        }
        if (dueDate !== undefined) {
            if (dueDate === null || dueDate === "") {
                updates.dueDate = null;
            } else {
                const parsed = new Date(dueDate);
                if (isNaN(parsed.getTime())) errors.push("dueDate must be a valid date string");
                else updates.dueDate = parsed;
            }
        }
        if (tags !== undefined) {
            updates.tags = parseTags(tags);
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", errors)
            );
        }
        if (issue.status === "rejected") {
            updates.status = "submitted";
            updates.rejectedBy = null;
            updates.rejectedAt = null;
            updates.rejectionRemark = null;
        }
        updates.updatedBy = editorUser._id;
        const newAttachments = await parseAttachments(req, "issues/attachments", editorUser._id);
        const updateOp = { $set: updates };
        if (newAttachments.length > 0) {
            updateOp.$push = { attachments: { $each: newAttachments } };
        }
        const updated = await Issue.findByIdAndUpdate(
            issue._id,
            updateOp,
            { new: true, runValidators: true }
        ).lean();
        logger.info("Issue updated", {
            issueId: issue._id,
            updatedFields: Object.keys(updates),
            wasRejected: issue.status === "rejected",
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issueId: updated._id,
                    title: updated.title,
                    description: updated.description,
                    issueType: updated.issueType,
                    priority: updated.priority,
                    status: updated.status,
                    taskId: updated.taskId || null,
                    subtaskId: updated.subtaskId || null,
                    dueDate: updated.dueDate || null,
                    tags: updated.tags,
                    attachments: updated.attachments,
                    updatedAt: updated.updatedAt,
                },
                "Issue updated successfully"
            )
        );

    } catch (error) {
        logger.error("editIssue failed", { error: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function soft deletes an issue. takes x-company-id in headers and issueId in params, optionally deletedBy from body or headers. prevents deletion of resolved issues and marks issue as isDeleted. -------------------------- Ayan
export const deleteIssue = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Please provide a valid companyId")
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        if (issue.status === "resolved") {
            return res.status(400).json(
                new ApiErrors(400, "Cannot Delete", "Resolved issues cannot be deleted. They are part of the permanent audit record.")
            );
        }
        const deletedByKc =
            req.body?.deletedBy?.trim() ||
            req.headers["x-user-id"]?.trim();

        let deletedByObjectId = null;
        if (deletedByKc) {
            const deleterUser = await resolveUserByKeycloak(deletedByKc, company._id);
            if (deleterUser) deletedByObjectId = deleterUser._id;
        }
        await Issue.findByIdAndUpdate(issueId, {
            $set: {
                isDeleted: true,
                ...(deletedByObjectId ? { updatedBy: deletedByObjectId } : {}),
            },
        });
        logger.info("Issue soft-deleted", { issueId: issue._id, title: issue.title });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issueId: issue._id,
                    title: issue.title,
                    deletedAt: new Date().toISOString(),
                },
                "Issue deleted successfully"
            )
        );
    } catch (error) {
        logger.error("deleteIssue failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function resolves an issue. takes x-company-id in headers, issueId in params and approvedBy in body. validates user, ensures issue is in submitted state and updates status to resolved with resolver details. -------------------------- Ayan
export const resolveIssue = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Header", "x-company-id header is required")
            );
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId")
            );
        }
        const { approvedBy } = req.body;
        if (!approvedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "approvedBy (keycloakId) is required")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const approverUser = await resolveUserByKeycloak(approvedBy, company._id);
        if (!approverUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${approvedBy}`)
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        if (issue.createdBy.toString() === approverUser._id.toString()) {
            return res.status(403).json(
                new ApiErrors(403, "Forbidden", "You cannot approve an issue you created")
            );
        }
        if (issue.status !== "submitted") {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Status", `Only submitted issues can be approved. Current status: "${issue.status}"`)
            );
        }
        const now = new Date();
        await Issue.findByIdAndUpdate(issueId, {
            $set: {
                status: "resolved",
                resolvedBy: approverUser._id,
                resolvedAt: now,
                updatedBy: approverUser._id,
            },
        });
        const projectForNotif = await Project.findById(issue.projectId).select("projectName").lean();
        NotificationService.notifyIssueResolved({
            companyId: company._id,
            projectId: issue.projectId,
            projectName: projectForNotif?.projectName || "",
            issueId: issue._id,
            issueTitle: issue.title,
            creatorId: issue.createdBy,
            triggeredBy: approverUser._id,
        }).catch(err => logger.error("notifyIssueResolved failed (non-fatal)", { error: err.message }));
        logger.info("Issue resolved", { issueId: issue._id, resolvedBy: approverUser._id });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issueId: issue._id,
                    title: issue.title,
                    status: "resolved",
                    resolvedBy: approvedBy,
                    resolvedAt: now,
                },
                "Issue resolved successfully"
            )
        );
    } catch (error) {
        logger.error("approveIssue failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function rejects an issue. takes x-company-id in headers, issueId in params and rejectedBy with remark in body. validates input and updates issue status to rejected with rejection details. -------------------------- Ayan
export const rejectIssue = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId"));
        }
        const { rejectedBy, remark } = req.body;
        const missing = [];
        if (!rejectedBy?.trim()) missing.push("rejectedBy (keycloakId)");
        if (!remark?.trim()) missing.push("remark");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const rejectorUser = await resolveUserByKeycloak(rejectedBy, company._id);
        if (!rejectorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${rejectedBy}`)
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        if (issue.status !== "submitted") {
            return res.status(400).json(
                new ApiErrors(
                    400,
                    "Invalid Status",
                    `Only submitted issues can be rejected. Current status: "${issue.status}"`
                )
            );
        }
        const now = new Date();
        await Issue.findByIdAndUpdate(issueId, {
            $set: {
                status: "rejected",
                rejectedBy: rejectorUser._id,
                rejectedAt: now,
                rejectionRemark: remark.trim(),
                updatedBy: rejectorUser._id,
            },
        });
        logger.info("Issue rejected", { issueId: issue._id, rejectedBy: rejectorUser._id });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issueId: issue._id,
                    title: issue.title,
                    status: "rejected",
                    rejectedBy: rejectedBy,
                    rejectedAt: now,
                    rejectionRemark: remark.trim(),
                },
                "Issue rejected"
            )
        );
    } catch (error) {
        logger.error("rejectIssue failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function fetches assigned users of an issue. takes x-company-id in headers and issueId in params. supports pagination and returns enriched user details of all assigned users. -------------------------- Ayan
export const getAssignedUsers = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "Please provide a valid companyId"));
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).select("assignedTo").lean();
        if (!issue) {
            return res.status(404).json(new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company"));
        }
        if (!issue.assignedTo || issue.assignedTo.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, {
                    assignedUsers: [],
                    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
                }, "No users assigned to this issue")
            );
        }
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid page", "page must be a positive integer")
            );
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid limit", "limit must be between 1 and 100")
            );
        }
        const assignedToArray = !issue.assignedTo
            ? []
            : Array.isArray(issue.assignedTo)
                ? issue.assignedTo
                : [issue.assignedTo];
        const total = assignedToArray.length;
        const sliced = assignedToArray.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        const assignedUsers = await Promise.all(sliced.map((id) => enrichUser(id)));
        logger.info("getAssignedUsers fetched", { issueId, total });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    assignedUsers,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize) || 0,
                    },
                },
                total > 0 ? "Assigned users fetched successfully" : "No user assigned to this issue"
            )
        );
    } catch (error) {
        logger.error("getAssignedUsers failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function adds or removes assigned users from an issue. takes x-company-id in headers, issueId in params and userId with action (add/remove) in body. validates user and updates assignment accordingly. -------------------------- Ayan
export const editAssignedUsers = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId"));
        }
        const { userId, action } = req.body;
        const missing = [];
        if (!userId?.trim()) missing.push("userId (keycloakId)");
        if (!action?.trim()) missing.push("action");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        if (!["add", "remove"].includes(action)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Action", 'action must be either "assign" or "unassign"')
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        if (issue.status === "resolved") {
            return res.status(400).json(
                new ApiErrors(400, "Cannot Modify", "Cannot assign or unassign users on a resolved issue")
            );
        }
        const targetUser = await resolveUserByKeycloak(userId, company._id);
        if (!targetUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${userId}`)
            );
        }
        if (action === "add") {
            const alreadyAssigned = issue.assignedTo.some(
                (id) => id.toString() === targetUser._id.toString()
            );
            if (alreadyAssigned) {
                return res.status(200).json(
                    new ApiResponse(200, { issueId: issue._id, assignedTo: userId }, "User is already assigned to this issue")
                );
            }
            await Issue.findByIdAndUpdate(issueId, {
                $addToSet: { assignedTo: targetUser._id },
                $set: { updatedBy: targetUser._id },
            });
            return res.status(200).json(
                new ApiResponse(200, { issueId: issue._id, title: issue.title, action: "add", assignedTo: userId }, "User assigned successfully")
            );
        } else {
            const isAssigned = issue.assignedTo.some(
                (id) => id.toString() === targetUser._id.toString()
            );
            if (!isAssigned) {
                return res.status(400).json(
                    new ApiErrors(400, "Not Assigned", "This user is not assigned to this issue")
                );
            }
            await Issue.findByIdAndUpdate(issueId, {
                $pull: { assignedTo: targetUser._id },
                $set: { updatedBy: targetUser._id },
            });
            return res.status(200).json(
                new ApiResponse(200, { issueId: issue._id, title: issue.title, action: "remove", assignedTo: userId }, "User unassigned successfully")
            );
        }
    } catch (error) {
        logger.error("assignIssue failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function adds a new comment to an issue. takes x-company-id in headers, issueId in params and text with commentedBy in body. supports optional image upload and stores comment with metadata. -------------------------- Ayan
export const addComment = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId")
            );
        }
        const { text, commentedBy } = req.body;
        const missing = [];
        if (!text?.trim()) missing.push("text");
        if (!commentedBy?.trim()) missing.push("commentedBy (keycloakId)");
        if (missing.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Required Fields", `The following fields are required: ${missing.join(", ")}`, missing)
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const commenterUser = await resolveUserByKeycloak(commentedBy, company._id);
        if (!commenterUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${commentedBy}`)
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        let commentImage = null;
        if (req.file) {
            const uploaded = await parseAttachments(req, "issues/comments", commenterUser._id);
            commentImage = uploaded[0] ?? null;
        }
        const now = new Date();
        const newComment = {
            _id: new mongoose.Types.ObjectId(),
            text: text.trim(),
            image: commentImage,
            createdBy: commenterUser._id,
            isDeleted: false,
            editedAt: null,
            createdAt: now,
            updatedAt: now,
        };
        await Issue.findByIdAndUpdate(issueId, {
            $push: { comments: newComment },
        });
        logger.info("Comment added", { issueId: issue._id, commentId: newComment._id });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    commentId: newComment._id,
                    text: newComment.text,
                    image: newComment.image,
                    commentedBy,
                    createdAt: newComment.createdAt,
                },
                "Comment added successfully"
            )
        );
    } catch (error) {
        logger.error("addComment failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function returns all comments of an issue. takes x-company-id in headers and issueId in params. supports pagination and search on comment text and returns enriched user details. -------------------------- Ayan
export const getAllComments = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Please provide a valid companyId")
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).select("comments").lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        const { page = 1, limit = 20, search = "" } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json(new ApiErrors(400, "Invalid page", "page must be a positive integer"));
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid limit", "limit must be between 1 and 100")
            );
        }
        let activeComments = (issue.comments || []).filter((c) => !c.isDeleted);
        if (search?.trim()) {
            const searchLower = search.trim().toLowerCase();
            activeComments = activeComments.filter((c) =>
                c.text.toLowerCase().includes(searchLower)
            );
        }
        activeComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const total = activeComments.length;
        const sliced = activeComments.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        const enrichedComments = await Promise.all(
            sliced.map(async (c) => ({
                commentId: c._id,
                text: c.text,
                image: c.image || null,
                createdBy: await enrichUser(c.createdBy),
                editedAt: c.editedAt || null,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }))
        );
        logger.info("getComments fetched", { issueId, total, page: pageNumber });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    comments: enrichedComments,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                    },
                },
                total > 0 ? "Comments fetched successfully" : "No comments found"
            )
        );
    } catch (error) {
        logger.error("getComments failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function edits a specific comment. takes x-company-id in headers, issueId and commentId in params and updatedBy with new text or image in body. ensures only comment owner can edit. -------------------------- Ayan
export const editComment = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId, commentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId"));
        }
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Comment ID", "commentId must be a valid MongoDB ObjectId")
            );
        }
        const { text, updatedBy } = req.body;
        if (!updatedBy?.trim()) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "updatedBy (keycloakId) is required")
            );
        }
        if (!text?.trim() && !req.file) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Provide at least a new text or a new image")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Company Not Found", "Invalid company")
            );
        }
        const editorUser = await resolveUserByKeycloak(updatedBy, company._id);
        if (!editorUser) {
            return res.status(404).json(
                new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${updatedBy}`)
            );
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company"));
        }
        const comment = (issue.comments || []).find(
            (c) => c._id.toString() === commentId && !c.isDeleted
        );
        if (!comment) {
            return res.status(404).json(new ApiErrors(404, "Comment Not Found", "No active comment found with the given ID"));
        }
        if (comment.createdBy.toString() !== editorUser._id.toString()) {
            return res.status(403).json(
                new ApiErrors(403, "Forbidden", "You can only edit your own comments")
            );
        }
        const now = new Date();
        const setFields = { "comments.$.editedAt": now, "comments.$.updatedAt": now };
        if (text?.trim()) {
            setFields["comments.$.text"] = text.trim();
        }
        if (req.file) {
            const uploaded = await parseAttachments(req, "issues/comments", editorUser._id);
            setFields["comments.$.image"] = uploaded[0] ?? null;
        }
        await Issue.findOneAndUpdate(
            {
                _id: issueId,
                "comments._id": new mongoose.Types.ObjectId(commentId),
            },
            { $set: setFields },
            { new: true }
        );
        logger.info("Comment edited", { issueId, commentId, editedBy: editorUser._id });
        return res.status(200).json(
            new ApiResponse(
                200,
                { commentId, text: text?.trim() || comment.text, editedAt: now },
                "Comment updated successfully"
            )
        );
    } catch (error) {
        logger.error("editComment failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function soft deletes a comment. takes x-company-id in headers, issueId and commentId in params and deletedBy in body or headers. allows deletion by owner or authorized user. -------------------------- Ayan
export const deleteComment = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const { issueId, commentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(issueId)) {
            return res.status(400).json(new ApiErrors(400, "Invalid Issue ID", "issueId must be a valid MongoDB ObjectId"));
        }
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Comment ID", "commentId must be a valid MongoDB ObjectId")
            );
        }
        const deletedByKc = req.body?.deletedBy?.trim() || req.headers["x-user-keycloak-id"]?.trim();
        if (!deletedByKc) {
            return res.status(400).json(
                new ApiErrors(400, "Missing Field", "deletedBy (keycloakId) is required in body or x-user-keycloak-id header")
            );
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "Invalid company"));
        }
        const deleterUser = await resolveUserByKeycloak(deletedByKc, company._id);
        if (!deleterUser) {
            return res.status(404).json(new ApiErrors(404, "User Not Found", `No active user found with keycloakId: ${deletedByKc}`));
        }
        const issue = await Issue.findOne({
            _id: issueId,
            companyId: company._id,
            isDeleted: false,
        }).lean();
        if (!issue) {
            return res.status(404).json(
                new ApiErrors(404, "Issue Not Found", "No issue found with the given ID for this company")
            );
        }
        const comment = (issue.comments || []).find(
            (c) => c._id.toString() === commentId && !c.isDeleted
        );
        if (!comment) {
            return res.status(404).json(
                new ApiErrors(404, "Comment Not Found", "No active comment found with the given ID")
            );
        }
        const isCommentOwner = comment.createdBy.toString() === deleterUser._id.toString();
        const hasDeletePerm = req.hasDeletePermission === true;
        if (!isCommentOwner && !hasDeletePerm) {
            return res.status(403).json(
                new ApiErrors(403, "Forbidden", "You can only delete your own comments")
            );
        }
        await Issue.findOneAndUpdate(
            { _id: issueId, "comments._id": new mongoose.Types.ObjectId(commentId) },
            { $set: { "comments.$.isDeleted": true } }
        );
        logger.info("Comment soft-deleted", { issueId, commentId, deletedBy: deleterUser._id });
        return res.status(200).json(
            new ApiResponse(
                200,
                { commentId, deletedAt: new Date().toISOString() },
                "Comment deleted successfully"
            )
        );
    } catch (error) {
        logger.error("deleteComment failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

// This function returns issue analytics summary. takes x-company-id in headers and optional projectId in query. provides counts, priority breakdown, activity stats, resolution rate, avg resolution time and monthly trends. -------------------------- Ayan
export const getIssueSummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "Please provide a valid companyId"));
        }
        const { projectId } = req.query;
        const baseFilter = { companyId: company._id, isDeleted: false };
        if (projectId) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json(new ApiErrors(400, "Invalid projectId", "projectId must be a valid MongoDB ObjectId"));
            }
            const project = await Project.findOne({
                _id: projectId,
                companyId: company._id,
                isDeleted: false,
            }).select("_id").lean();
            if (!project) {
                return res.status(404).json(new ApiErrors(404, "Project Not Found", "No project found with this ID for the company"));
            }
            baseFilter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() + diffToMonday);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const last30Days = new Date(now);
        last30Days.setDate(now.getDate() - 30);
        const [
            total,
            submitted,
            resolved,
            rejected,
            critical,
            high,
            medium,
            low,
            openCritical,
            openHigh,
            overdue,
            unassigned,
            createdThisWeek,
            createdThisMonth,
            createdLast30Days,
            resolvedThisWeek,
            resolvedThisMonth,
            resolvedLast30Days,] = await Promise.all([
                Issue.countDocuments(baseFilter),
                Issue.countDocuments({ ...baseFilter, status: "submitted" }),
                Issue.countDocuments({ ...baseFilter, status: "resolved" }),
                Issue.countDocuments({ ...baseFilter, status: "rejected" }),
                Issue.countDocuments({ ...baseFilter, priority: "critical" }),
                Issue.countDocuments({ ...baseFilter, priority: "high" }),
                Issue.countDocuments({ ...baseFilter, priority: "medium" }),
                Issue.countDocuments({ ...baseFilter, priority: "low" }),
                Issue.countDocuments({ ...baseFilter, status: "submitted", priority: "critical" }),
                Issue.countDocuments({ ...baseFilter, status: "submitted", priority: "high" }),
                Issue.countDocuments({ ...baseFilter, status: "submitted", dueDate: { $lt: now } }),
                Issue.countDocuments({ ...baseFilter, status: "submitted", assignedTo: null }),
                Issue.countDocuments({ ...baseFilter, createdAt: { $gte: startOfWeek } }),
                Issue.countDocuments({ ...baseFilter, createdAt: { $gte: startOfMonth } }),
                Issue.countDocuments({ ...baseFilter, createdAt: { $gte: last30Days } }),
                Issue.countDocuments({ ...baseFilter, status: "resolved", resolvedAt: { $gte: startOfWeek } }),
                Issue.countDocuments({ ...baseFilter, status: "resolved", resolvedAt: { $gte: startOfMonth } }),
                Issue.countDocuments({ ...baseFilter, status: "resolved", resolvedAt: { $gte: last30Days } }),
            ]);
        const openPriorityAgg = await Issue.aggregate([
            { $match: { ...baseFilter, status: "submitted" } },
            { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]);
        const openByPriority = { low: 0, medium: 0, high: 0, critical: 0 };
        openPriorityAgg.forEach((p) => { openByPriority[p._id] = p.count; });
        const typeAgg = await Issue.aggregate([
            { $match: baseFilter },
            { $group: { _id: "$issueType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        const openTypeAgg = await Issue.aggregate([
            { $match: { ...baseFilter, status: "submitted" } },
            { $group: { _id: "$issueType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const monthlyTrendAgg = await Issue.aggregate([
            {
                $match: {
                    ...baseFilter,
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    created: { $sum: 1 },
                    resolved: {
                        $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
                    },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);
        const monthlyTrend = monthlyTrendAgg.map((m) => ({
            year: m._id.year,
            month: m._id.month,
            created: m.created,
            resolved: m.resolved,
        }));
        const resolutionRate = total > 0
            ? parseFloat(((resolved / total) * 100).toFixed(1))
            : 0;
        const avgResolutionMs = await Issue.aggregate([
            {
                $match: {
                    ...baseFilter,
                    status: "resolved",
                    resolvedAt: { $ne: null },
                },
            },
            {
                $group: {
                    _id: null,
                    avg: {
                        $avg: { $subtract: ["$resolvedAt", "$createdAt"] },
                    },
                },
            },
        ]);
        const avgResolutionHours = avgResolutionMs.length > 0 && avgResolutionMs[0].avg
            ? parseFloat((avgResolutionMs[0].avg / (1000 * 60 * 60)).toFixed(1))
            : null;
        logger.info("getIssueSummary fetched", {
            companyId: companyUUID,
            projectId: projectId || "company-wide",
            total,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    scope: projectId ? "project" : "company",
                    overview: {
                        total,
                        submitted,
                        resolved,
                        rejected,
                        overdue,
                        unassigned,
                        resolutionRate,
                        avgResolutionHours,
                    },
                    priority: {
                        all: { critical, high, medium, low },
                        open: openByPriority,
                        openCritical,
                        openHigh,
                    },
                    activity: {
                        createdThisWeek,
                        createdThisMonth,
                        createdLast30Days,
                        resolvedThisWeek,
                        resolvedThisMonth,
                        resolvedLast30Days,
                    },
                    breakdowns: {
                        byType: typeAgg.map((t) => ({ type: t._id, count: t.count })),
                        openByType: openTypeAgg.map((t) => ({ type: t._id, count: t.count })),
                    },
                    monthlyTrend,
                },
                "Issue summary fetched successfully"
            )
        );

    } catch (error) {
        logger.error("getIssueSummary failed", { error: error.message });
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", [error.message])
        );
    }
};

export const getGlobalIssueSummary = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const activeProjectDocs = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjectDocs.map((p) => p._id);
        const agg = await Issue.aggregate([
            { $match: { companyId, isDeleted: false, projectId: { $in: activeProjectIds } } },
            {
                $facet: {
                    statusCounts: [
                        { $group: { _id: "$status", count: { $sum: 1 } } }
                    ],
                    priorityCounts: [
                        { $group: { _id: "$priority", count: { $sum: 1 } } }
                    ],
                    activeProjects: [
                        { $group: { _id: "$projectId" } },
                        { $count: "count" }
                    ],
                    overdueIssues: [
                        {
                            $match: {
                                status: "submitted",
                                dueDate: { $lt: new Date() }
                            }
                        },
                        { $count: "count" }
                    ],
                    avgResolutionTime: [
                        {
                            $match: {
                                status: "resolved",
                                resolvedAt: { $ne: null },
                                createdAt: { $ne: null }
                            }
                        },
                        {
                            $project: {
                                diffMs: { $subtract: ["$resolvedAt", "$createdAt"] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgMs: { $avg: "$diffMs" }
                            }
                        }
                    ]
                }
            }
        ]);

        const statusMap = {};
        (agg[0]?.statusCounts || []).forEach(({ _id, count }) => {
            statusMap[_id] = count;
        });

        const priorityMap = {};
        (agg[0]?.priorityCounts || []).forEach(({ _id, count }) => {
            priorityMap[_id] = count;
        });

        const totalIssues = (statusMap["submitted"] || 0) + (statusMap["resolved"] || 0) + (statusMap["rejected"] || 0);
        const openIssues = statusMap["submitted"] || 0;
        const resolvedIssues = statusMap["resolved"] || 0;
        const rejectedIssues = statusMap["rejected"] || 0;

        const activeProjects = agg[0]?.activeProjects?.[0]?.count ?? 0;
        const overdueIssues = agg[0]?.overdueIssues?.[0]?.count ?? 0;

        const avgMs = agg[0]?.avgResolutionTime?.[0]?.avgMs ?? null;
        const avgResolutionTimeDays = avgMs !== null ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10 : null;

        logger.info("Global Issue summary fetched", { companyId, totalIssues });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    summary: {
                        totalIssues,
                        openIssues,
                        resolvedIssues,
                        rejectedIssues,
                        priority: {
                            critical: priorityMap["critical"] || 0,
                            high: priorityMap["high"] || 0,
                            medium: priorityMap["medium"] || 0,
                            low: priorityMap["low"] || 0,
                        },
                        activeProjects,
                        overdueIssues,
                        avgResolutionTimeDays
                    }
                },
                "Global Issue Summary",
                "KPI summary fetched across all projects"
            )
        );
    } catch (error) {
        logger.error("getGlobalIssueSummary failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to fetch global issue summary", [error.message])
        );
    }
};

export const getAllIssuesGlobal = async (req, res) => {
    try {
        const companyUUID = req.headers["x-company-id"];
        if (!companyUUID?.trim()) {
            return res.status(400).json(new ApiErrors(400, "Missing Header", "x-company-id header is required"));
        }
        const company = await resolveCompany(companyUUID);
        if (!company) {
            return res.status(404).json(new ApiErrors(404, "Company Not Found", "No active company found"));
        }
        const companyId = company._id;
        const activeProjectDocs = await Project.find({ companyId, isDeleted: false }, { _id: 1 }).lean();
        const activeProjectIds = activeProjectDocs.map((p) => p._id);
        const {
            page = 1, limit = 10, search = "",
            status, priority, issueType,
            projectId, taskId, assignedTo,
            dateFrom, dateTo,
            sortBy = "createdAt", order = "desc",
            lastId
        } = req.query;
        const pageNumber = Math.max(Number(page), 1);
        const pageSize = Math.min(Math.max(Number(limit), 1), 100);
        const filter = { companyId, isDeleted: false, projectId: { $in: activeProjectIds } }; if (status) {
            if (!ISSUE_STATUSES.includes(status)) {
                return res.status(400).json(new ApiErrors(400, "Invalid status", `Valid statuses: ${ISSUE_STATUSES.join(", ")}`));
            }
            filter.status = status;
        }
        if (priority) {
            if (!ISSUE_PRIORITIES.includes(priority)) {
                return res.status(400).json(new ApiErrors(400, "Invalid priority", `Valid priorities: ${ISSUE_PRIORITIES.join(", ")}`));
            }
            filter.priority = priority;
        }
        if (issueType) {
            if (!ISSUE_TYPES.includes(issueType)) {
                return res.status(400).json(new ApiErrors(400, "Invalid issueType", `Valid types: ${ISSUE_TYPES.join(", ")}`));
            }
            filter.issueType = issueType;
        }
        if (projectId) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json(new ApiErrors(400, "Invalid projectId", "projectId must be a valid MongoDB ObjectId"));
            }
            filter.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (taskId) {
            if (!mongoose.Types.ObjectId.isValid(taskId)) {
                return res.status(400).json(new ApiErrors(400, "Invalid taskId", "taskId must be a valid MongoDB ObjectId"));
            }
            filter.taskId = new mongoose.Types.ObjectId(taskId);
        }
        if (assignedTo) {
            const assignedUser = await resolveUserByKeycloak(assignedTo, companyId);
            if (assignedUser) {
                filter.assignedTo = assignedUser._id;
            }
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                const from = new Date(dateFrom);
                if (!isNaN(from)) filter.createdAt.$gte = from;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                if (!isNaN(to)) {
                    to.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = to;
                }
            }
        }
        if (search?.trim()) {
            const regex = { $regex: search.trim(), $options: "i" };
            filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
        }

        const ALLOWED_SORT = ["createdAt", "updatedAt", "priority", "status", "dueDate", "title"];
        const sortField = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const countFilter = { ...filter };
        const useCursor = lastId && mongoose.Types.ObjectId.isValid(lastId) && sortField === "createdAt";

        if (useCursor) {
            const cursorObjectId = new mongoose.Types.ObjectId(lastId);
            filter._id = sortOrder === -1 ? { $lt: cursorObjectId } : { $gt: cursorObjectId };
        }

        const issueQuery = Issue.find(filter)
            .select("_id title issueType priority status projectId taskId subtaskId assignedTo dueDate tags attachments createdBy resolvedBy resolvedAt rejectedBy rejectedAt rejectionRemark createdAt updatedAt")
            .sort({ [sortField]: sortOrder })
            .limit(pageSize);

        if (!useCursor) {
            issueQuery.skip((pageNumber - 1) * pageSize);
        }

        const [issues, total] = await Promise.all([
            issueQuery.lean(),
            Issue.countDocuments(countFilter)
        ]);

        if (issues.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        issues: [],
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageSize,
                            totalPages: Math.ceil(total / pageSize),
                            hasNextPage: false,
                            nextCursor: null
                        }
                    },
                    "No Issues Found",
                    "No issues matched the given filters"
                )
            );
        }

        const uniqueProjectIds = [...new Set(issues.map((i) => i.projectId?.toString()).filter(Boolean))];
        const projects = await Project.find(
            { _id: { $in: uniqueProjectIds }, isDeleted: false },
            { _id: 1, projectName: 1 }
        ).lean();
        const projectMap = {};
        projects.forEach((p) => {
            projectMap[p._id.toString()] = p.projectName || "Unknown Project";
        });

        const formattedIssues = await Promise.all(
            issues.map(async (issue) => {
                const assignedToArray = !issue.assignedTo ? [] : Array.isArray(issue.assignedTo) ? issue.assignedTo : [issue.assignedTo];

                const [enrichedCreator, enrichedResolver, enrichedRejector, ...enrichedAssignees] = await Promise.all([
                    enrichUser(issue.createdBy),
                    enrichUser(issue.resolvedBy ?? null),
                    enrichUser(issue.rejectedBy ?? null),
                    ...assignedToArray.map((id) => enrichUser(id)),
                ]);

                return {
                    issueId: issue._id,
                    title: issue.title,
                    issueType: issue.issueType,
                    priority: issue.priority,
                    status: issue.status,
                    projectId: issue.projectId,
                    projectName: projectMap[issue.projectId?.toString()] ?? "Unknown Project",
                    taskId: issue.taskId || null,
                    subtaskId: issue.subtaskId || null,
                    dueDate: issue.dueDate || null,
                    tags: issue.tags,
                    attachments: issue.attachments,
                    createdBy: enrichedCreator,
                    assignedTo: enrichedAssignees,
                    resolvedBy: enrichedResolver,
                    resolvedAt: issue.resolvedAt || null,
                    rejectedBy: enrichedRejector,
                    rejectedAt: issue.rejectedAt || null,
                    rejectionRemark: issue.rejectionRemark || null,
                    createdAt: issue.createdAt,
                    updatedAt: issue.updatedAt,
                };
            })
        );

        const hasNextPage = issues.length === pageSize;
        const nextCursor = hasNextPage ? issues[issues.length - 1]._id : null;

        logger.info("Global Issues fetched", {
            companyId, total, returned: issues.length, page: pageNumber, filters: { status, projectId, search, dateFrom, dateTo }
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    issues: formattedIssues,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: Math.ceil(total / pageSize),
                        hasNextPage,
                        nextCursor
                    }
                },
                "Global Issues Retrieved",
                `Fetched ${formattedIssues.length} issue(s) across all projects`
            )
        );

    } catch (error) {
        logger.error("getAllIssuesGlobal failed", { message: error.message, stack: error.stack });
        return res.status(500).json(
            new ApiErrors(500, "Server Error", "Failed to retrieve global issues", [error.message])
        );
    }
};