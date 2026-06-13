import Company from "../models/company.models.js";
import CompanyOtp from "../models/companyOtp.models.js";
import User from "../models/user.models.js";
import Project from "../models/project.models.js";
import Role from "../models/role.models.js";
import Vendor from "../models/vendors.models.js";
import { VALID_ACTIONS, MODULES } from "../models/role.models.js";
import { uploadToR2 } from "../utils/uploadToR2.utils.js";
import { generateOtp } from "../utils/generateOtp.utils.js";
import sendEmail from "../services/email.service.js";
import bcrypt from "bcrypt";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import keycloakService from "../services/keycloak.service.js";
import { generateCredentials } from "../utils/generateCredentials.utils.js";
import logger from "../utils/logger.utils.js";
import { KeycloakError } from "../utils/errorHandler.utils.js";
import { welcomeUserTemplate } from "../templates/welcomeUserTemplate.js";

// Register New Company ------------------------------------- @Sundar
export const registerCompany = async (req, res) => {
    try {
        const {
            companyName,
            email,
            companyType,
            gstin,
            pan,
            cin,
            laborLicenseNo,
            phone,
            website,
            tags,
            address: addressBody,
        } = req.body;
        if (!companyName || !email) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", "companyName and email are required")
            );
        }
        const errors = [];
        let normalizedGstin = null;
        if (gstin !== undefined && gstin !== "") {
            normalizedGstin = gstin.toUpperCase().replace(/\s/g, "");
            if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(normalizedGstin)) {
                errors.push(
                    `gstin must be a valid 15-character GST number (e.g. 22ABCDE1234F1Z5) — received length: ${normalizedGstin.length}`
                );
            }
        }
        let normalizedPan = null;
        if (pan !== undefined && pan !== "") {
            normalizedPan = pan.toUpperCase().replace(/\s/g, "");
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalizedPan)) {
                errors.push("pan must be a valid 10-character PAN (e.g. ABCDE1234F)");
            }
        }
        if (phone !== undefined && phone !== "") {
            if (!/^\+?[0-9]{7,15}$/.test(phone.trim())) {
                errors.push("phone must be a valid number (7–15 digits, optional leading +)");
            }
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "One or more fields have invalid values", errors)
            );
        }
        const normalizedEmail = email.toLowerCase().trim();
        const existingCompany = await Company.findOne({ email: normalizedEmail });
        if (existingCompany) {
            return res.status(409).json(
                new ApiErrors(409, "Conflict", "Company already exists with this email")
            );
        }
        let logoUrl = null;
        if (req.file) {
            const ext = req.file.mimetype.split("/")[1];
            const key = `logos/${Date.now()}.${ext}`;
            const result = await uploadToR2({
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                key,
            });
            logoUrl = result.url;
        }
        const address = {
            street: addressBody?.street || null,
            city: addressBody?.city || null,
            state: addressBody?.state || null,
            country: addressBody?.country || "India",
            pincode: addressBody?.pincode || null,
        };
        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);
        await CompanyOtp.findOneAndUpdate(
            { email: normalizedEmail },
            {
                otp: hashedOtp,
                companyData: {
                    companyName,
                    email: normalizedEmail,
                    companyType,
                    gstin: normalizedGstin,
                    pan: normalizedPan,
                    cin: cin ? cin.toUpperCase().replace(/\s/g, "") : null,
                    laborLicenseNo: laborLicenseNo?.trim() || null,
                    phone: phone?.trim() || null,
                    website: website?.trim() || null,
                    address,
                    tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
                    logo: logoUrl,
                },
                attempts: 0,
                expiresAt: new Date(Date.now() + 3 * 60 * 1000),
            },
            { upsert: true, new: true }
        );
        // Print OTP to terminal for local testing
        console.log(`\n================================`);
        console.log(`[TESTING] OTP for ${normalizedEmail}: ${otp}`);
        console.log(`================================\n`);

        try {
            await sendEmail({
                to: normalizedEmail,
                subject: "Verify Your Company",
                html: `<h3>Your OTP is: ${otp}</h3><p>Valid for 3 minutes</p>`,
            });
        } catch (emailErr) {
            // Log but don't crash, allowing the developer to use the printed OTP
            console.error("Warning: sendEmail failed (SendGrid credits maxed out). Check terminal for OTP.");
        }
        return res.status(200).json(
            new ApiResponse(200, null, "OTP Sent", "OTP has been sent to your email. Please verify to complete registration.")
        );
    } catch (error) {
        console.error("registerCompany error:", error);
        if (error.code === 11000) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Entry", "A company with this information already exists")
            );
        }
        const errorMessage = error.message.includes("Email sending failed")
            ? error.message
            : "An unexpected error occurred";
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", errorMessage, [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Verify OTP & Register Company & Owner. Now this will verify the otp , then create the owner role , then creates a user with the given credentials and owner role . The flow is : Validate OTP (check expiry, attempts, bcrypt match) -> Create Company document in MongoDB -> Create "Owner" role with all permissions for that company ->  Generate username & password → create user in Keycloak -> Save Owner user in MongoDB with roleId (ObjectId) & passwordHash -> Link ownerId back to the Company document -> Delete OTP record (cleanup) -> Send welcome email with credentials (non-blocking) -------------------- @Sundar
export const verifyCompanyOtp = async (req, res) => {
    let createdCompany = null;
    let createdRoleId = null;
    let createdKeycloakId = null;
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", "email and otp are required")
            );
        }
        const normalizedEmail = email.toLowerCase().trim();
        const otpRecord = await CompanyOtp.findOne({ email: normalizedEmail });
        if (!otpRecord) {
            return res.status(400).json(
                new ApiErrors(400, "Invalid Request", "OTP expired or not found")
            );
        }
        if (otpRecord.attempts >= 5) {
            await CompanyOtp.deleteOne({ email: normalizedEmail });
            return res.status(429).json(
                new ApiErrors(429, "Too Many Attempts", "Maximum OTP attempts exceeded. Please request a new OTP.")
            );
        }
        const isMatch = await bcrypt.compare(otp, otpRecord.otp);
        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json(
                new ApiErrors(400, "Invalid OTP", `Incorrect OTP. ${5 - otpRecord.attempts} attempts remaining.`)
            );
        }
        createdCompany = await Company.create({
            ...otpRecord.companyData,
            isVerified: true,
            status: "Active",
        });
        logger.info("Company created", { companyId: createdCompany.companyId });
        const fullPermissions = new Map();
        const fullModuleStatus = new Map();
        for (const mod of MODULES) {
            fullPermissions.set(mod, [...VALID_ACTIONS]);
            fullModuleStatus.set(mod, true);
        }
        const ownerRole = await Role.create({
            companyId: createdCompany._id,
            roleName: "Owner",
            description: "Company owner with full system access",
            isActive: true,
            permissions: fullPermissions,
            moduleStatus: fullModuleStatus,
        });
        createdRoleId = ownerRole._id;
        logger.info("Owner role created", { roleId: createdRoleId, companyId: createdCompany._id });
        const { username, password, passwordHash } = await generateCredentials(normalizedEmail);
        const addressStr = [
            createdCompany.address?.street,
            createdCompany.address?.city,
            createdCompany.address?.state,
            createdCompany.address?.country,
        ].filter(Boolean).join(", ");
        createdKeycloakId = await keycloakService.createUser({
            name: createdCompany.companyName,
            email: normalizedEmail,
            username,
            password,
            phone: createdCompany.phone || "",
            address: addressStr || "",
            companyId: String(createdCompany.companyId),
            about: "",
            status: "Active",
            isOwner: true,
            roleId: String(ownerRole._id),
        });
        if (!createdKeycloakId) {
            throw new Error("Keycloak did not return a user ID for the owner");
        }
        logger.info("Keycloak owner user created", { keycloakId: createdKeycloakId });
        const ownerUser = await User.create({
            keycloakId: createdKeycloakId,
            companyId: createdCompany._id,
            roleId: ownerRole._id,
            isOwner: true,
            passwordHash,
            createdBy: null,
        });
        createdCompany.ownerId = ownerUser._id;
        await createdCompany.save();
        await CompanyOtp.deleteOne({ email: normalizedEmail });
        const { subject, html } = welcomeUserTemplate({
            name: createdCompany.companyName,
            username,
            password,
            companyName: createdCompany.companyName,
        });
        sendEmail({ to: normalizedEmail, subject, html }).catch((mailErr) => {
            logger.error("Owner welcome email failed to send", {
                email: normalizedEmail,
                error: mailErr.message,
            });
        });
        logger.info("Company and owner registered successfully", {
            companyId: createdCompany.companyId,
            ownerKeycloakId: createdKeycloakId,
            username,
        });
        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    companyId: createdCompany.companyId,
                    ownerKeycloakId: createdKeycloakId,
                    roleId: ownerRole._id,
                    username,
                },
                "Company & Owner Registered",
                `Company created and login credentials sent to ${normalizedEmail}`
            )
        );
    } catch (error) {
        logger.error("verifyCompanyOtp failed — beginning rollback", { error: error.message });
        if (createdKeycloakId) {
            try {
                await keycloakService.deleteUser(createdKeycloakId);
                logger.warn("Rolled back Keycloak owner", { keycloakId: createdKeycloakId });
            } catch (rbErr) {
                logger.error("Keycloak rollback failed — user may be orphaned", {
                    keycloakId: createdKeycloakId,
                    error: rbErr.message,
                });
            }
        }
        if (createdRoleId) {
            try {
                await Role.findByIdAndDelete(createdRoleId);
                logger.warn("Rolled back Owner role", { roleId: createdRoleId });
            } catch (rbErr) {
                logger.error("Role rollback failed", { roleId: createdRoleId, error: rbErr.message });
            }
        }
        if (createdCompany) {
            try {
                await Company.findByIdAndDelete(createdCompany._id);
                logger.warn("Rolled back Company", { companyId: createdCompany._id });
            } catch (rbErr) {
                logger.error("Company rollback failed", { companyId: createdCompany._id, error: rbErr.message });
            }
        }
        if (error instanceof KeycloakError) {
            return res.status(error.statusCode).json(
                new ApiErrors(error.statusCode, "Authentication service error", error.message)
            );
        }
        if (error.code === 11000) {
            return res.status(409).json(
                new ApiErrors(409, "Conflict", "Company already exists")
            );
        }
        return res.status(500).json(
            new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while verifying OTP", [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// Update Company ------------------------------------------- @Sundar
export const editCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", "companyId is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false });
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Not Found", "Company not found with the provided ID")
            );
        }
        if (req.body.email !== undefined) {
            return res.status(400).json(
                new ApiErrors(400, "Forbidden Action", "Email cannot be updated")
            );
        }
        const {
            companyName,
            companyType,
            gstin,
            pan,
            cin,
            laborLicenseNo,
            phone,
            website,
            tags,
            address: addressBody,
        } = req.body;

        const allowedFields = [
            "companyName", "companyType", "gstin", "pan", "cin",
            "laborLicenseNo", "phone", "website", "tags", "address",
        ];
        const provided = allowedFields.filter((f) => req.body[f] !== undefined);
        if (provided.length === 0 && !req.file) {
            return res.status(400).json(
                new ApiErrors(400, "No Updates Provided", "Send at least one field to update")
            );
        }
        const errors = [];
        if (companyName !== undefined) {
            if (!companyName.trim()) {
                errors.push("companyName cannot be empty");
            } else {
                company.companyName = companyName.trim();
            }
        }
        if (companyType !== undefined) {
            company.companyType = companyType.trim() || null;
        }
        if (gstin !== undefined) {
            company.gstin = gstin ? gstin.trim() || null : null;
        }
        if (pan !== undefined) {
            company.pan = pan ? pan.trim() || null : null;
        }
        if (cin !== undefined) {
            company.cin = cin ? cin.toUpperCase().replace(/\s/g, '') : null;
        }
        if (laborLicenseNo !== undefined) {
            company.laborLicenseNo = laborLicenseNo.trim() || null;
        }
        if (phone !== undefined) {
            if (phone && !/^\+?[0-9]{7,15}$/.test(phone.trim())) {
                errors.push("phone must be a valid phone number (7-15 digits)");
            } else {
                company.phone = phone.trim() || null;
            }
        }
        if (website !== undefined) {
            company.website = website.trim() || null;
        }
        if (tags !== undefined) {
            company.tags = Array.isArray(tags)
                ? tags.map((t) => t.trim()).filter(Boolean)
                : typeof tags === "string"
                    ? tags.split(",").map((t) => t.trim()).filter(Boolean)
                    : [];
        }
        if (addressBody !== undefined) {
            if (typeof addressBody !== "object" || Array.isArray(addressBody)) {
                errors.push("address must be an object with fields: street, city, state, country, pincode");
            } else {
                company.address = {
                    street: addressBody.street !== undefined ? addressBody.street.trim() || null : company.address?.street,
                    city: addressBody.city !== undefined ? addressBody.city.trim() || null : company.address?.city,
                    state: addressBody.state !== undefined ? addressBody.state.trim() || null : company.address?.state,
                    country: addressBody.country !== undefined ? addressBody.country.trim() || "India" : company.address?.country,
                    pincode: addressBody.pincode !== undefined ? addressBody.pincode.trim() || null : company.address?.pincode,
                };
            }
        }
        if (errors.length > 0) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Failed", "One or more fields have invalid values", errors)
            );
        }
        if (req.file) {
            const ext = req.file.mimetype.split("/")[1];
            const key = `logos/${Date.now()}.${ext}`;
            const result = await uploadToR2({
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                key,
            });
            company.logo = result.url;
        }
        await company.save();
        logger.info("Company updated successfully", { companyId });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    companyId: company.companyId,
                    companyName: company.companyName,
                    companyType: company.companyType,
                    email: company.email,
                    phone: company.phone,
                    website: company.website,
                    gstin: company.gstin,
                    pan: company.pan,
                    cin: company.cin,
                    laborLicenseNo: company.laborLicenseNo,
                    address: company.address,
                    tags: company.tags,
                    logo: company.logo,
                    updatedAt: company.updatedAt,
                },
                "Company Updated",
                "Company information has been successfully updated."
            )
        );
    } catch (error) {
        logger.error("editCompany error", { error: error.message, stack: error.stack });
        if (error.code === 11000) {
            return res.status(409).json(
                new ApiErrors(409, "Duplicate Entry", "A company with this information already exists")
            );
        }
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "An unexpected error occurred while updating company",
                [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};

// All Company List ----------------------------------------- @Sundar
export const allCompanyList = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            companyType,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const filter = { isDeleted: false };
        if (status) filter.status = status;
        if (companyType) filter.companyType = companyType;
        if (search) {
            filter.$or = [
                { companyName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        const sortOrder = order === "asc" ? 1 : -1;
        const companies = await Company.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .lean();
        const total = await Company.countDocuments(filter);
        const responseData = {
            companies,
            pagination: {
                total,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        };
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    responseData,
                    "Companies Retrieved",
                    `Successfully fetched ${companies.length} companies.`
                )
            );
    } catch (error) {
        console.error("allCompanyList error:", error);
        return res
            .status(500)
            .json(
                new ApiErrors(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred while fetching companies",
                    [],
                    process.env.NODE_ENV === "development" ? error.stack : ""
                )
            );
    }
};

// Status Toggle -------------------------------------------- @Sundar
export const statusChange = async (req, res) => {
    try {
        const { companyId } = req.params;
        const company = await Company.findById(companyId);
        if (!company) {
            return res
                .status(404)
                .json(
                    new ApiErrors(404, "Not Found", "Company not found with the provided ID")
                );
        }
        const newStatus = company.status === "Active" ? "Deactivated" : "Active";
        company.status = newStatus;
        await company.save();
        return res
            .status(200)
            .json(
                new ApiResponse(200, { companyId: company._id, status: newStatus }, "Status Updated", `Company status has been changed to ${newStatus}.`)
            );
    } catch (error) {
        console.error("statusChange error:", error);
        return res
            .status(500)
            .json(
                new ApiErrors(500, "Internal Server Error", "An unexpected error occurred while updating status", [], process.env.NODE_ENV === "development" ? error.stack : "")
            );
    }
};

// Get Particular Company ----------------------------------- @Sundar
export const getCompanyById = async (req, res) => {
    try {
        const { companyId } = req.params;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", "companyId is required")
            );
        }
        const company = await Company.findOne({ companyId, isDeleted: false })
            .populate("ownerId", "keycloakId roleId isOwner")
            .lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Not Found", "Company not found with the provided ID")
            );
        }
        const [totalUsers, totalVendors, totalRoles, totalProjects] = await Promise.all([
            User.countDocuments({ companyId: company._id, isDeleted: false }),
            Vendor.countDocuments({ companyId: company._id, isDeleted: false }),
            Role.countDocuments({ companyId: company._id, isDeleted: false }),
            Project.countDocuments({ companyId: company._id, isDeleted: false }),
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    ...company,
                    stats: { totalUsers, totalVendors, totalRoles, totalProjects },
                },
                "Company Retrieved",
                "Company details fetched successfully."
            )
        );
    } catch (error) {
        console.error("getCompanyById error:", error);
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "An unexpected error occurred while fetching company details",
                [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};




// Company Lookup (Lightweight Public Info) ----------------- @Ayan
export const companyLookup = async (req, res) => {
    try {
        const { companyId } = req.params;
        if (!companyId) {
            return res.status(400).json(
                new ApiErrors(400, "Validation Error", "companyId is required")
            );
        }
        const company = await Company.findOne(
            {
                companyId,
                isDeleted: false,
                status: "Active",
            },
            {
                companyId: 1,
                companyName: 1,
                logo: 1,
                companyType: 1,
                email: 1,
                phone: 1,
                website: 1,
                tags: 1,
                address: 1,
                status: 1,
                createdAt: 1,
                _id: 0,
            }
        ).lean();
        if (!company) {
            return res.status(404).json(
                new ApiErrors(404, "Not Found", "Company not found or is inactive")
            );
        }
        const [totalProjects, totalUsers] = await Promise.all([
            Project.countDocuments({
                companyId: company._id,
                isDeleted: false,
            }),
            User.countDocuments({
                companyId: company._id,
                isDeleted: false,
            }),
        ]);
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    companyId: company.companyId,
                    companyName: company.companyName,
                    logo: company.logo || null,
                    companyType: company.companyType || null,
                    email: company.email,
                    phone: company.phone || null,
                    website: company.website || null,
                    tags: company.tags || [],
                    address: {
                        city: company.address?.city || null,
                        state: company.address?.state || null,
                        country: company.address?.country || null,
                    },
                    status: company.status,
                    memberSince: company.createdAt,
                    stats: {
                        totalProjects,
                        totalMembers: totalUsers,
                    },
                },
                "Company Lookup",
                "Company details fetched successfully."
            )
        );
    } catch (error) {
        logger.error("companyLookup error", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json(
            new ApiErrors(
                500,
                "Internal Server Error",
                "An unexpected error occurred during company lookup",
                [],
                process.env.NODE_ENV === "development" ? error.stack : ""
            )
        );
    }
};