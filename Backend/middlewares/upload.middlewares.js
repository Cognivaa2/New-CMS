import multer from "multer";
import ApiErrors from "../utils/ApiErrors.js";

const IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

const DOCUMENT_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "image/vnd.dwg",
    "application/dxf",
    "application/x-dwf",
    "application/octet-stream",
];

const IMAGE_ONLY_TYPES = [...IMAGE_MIME_TYPES];
const ALL_ALLOWED_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES];

const MAX_SIZE_IMAGE = 5 * 1024 * 1024;
const MAX_SIZE_DOC = 50 * 1024 * 1024;

const createMulterInstance = (allowedTypes, maxSize) =>
    multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSize },
        fileFilter: (_req, file, cb) => {
            allowedTypes.includes(file.mimetype)
                ? cb(null, true)
                : cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
        },
    });

const imageMulter = createMulterInstance(IMAGE_ONLY_TYPES, MAX_SIZE_IMAGE);
const documentMulter = createMulterInstance(ALL_ALLOWED_TYPES, MAX_SIZE_DOC);

const ERROR_MESSAGES = {
    LIMIT_FILE_SIZE: {
        status: 413,
        title: "File Too Large",
        desc: "File exceeds the allowed size limit.",
    },
    LIMIT_UNEXPECTED_FILE: {
        status: 400,
        title: "Invalid File Type",
        desc: "This file type is not allowed.",
    },
};

const wrap = (middleware) => (req, res, next) => {
    middleware(req, res, (err) => {
        if (!err) return next();
        if (res.headersSent) return;
        const { status, title, desc } = ERROR_MESSAGES[err.code] ?? {
            status: 500,
            title: "Upload Failed",
            desc: "An unexpected error occurred during file upload.",
        };
        res.status(status).json(new ApiErrors(status, title, desc));
    });
};

export const upload = {
    single: (field) => wrap(imageMulter.single(field)),
    array: (field, max) => wrap(imageMulter.array(field, max)),
    fields: (fields) => wrap(imageMulter.fields(fields)),
    none: () => wrap(imageMulter.none()),
};

export const uploadDocument = {
    single: (field) => wrap(documentMulter.single(field)),
    array: (field, max) => wrap(documentMulter.array(field, max)),
    fields: (fields) => wrap(documentMulter.fields(fields)),
};


export const uploadSafetyFields = wrap(
    documentMulter.any()
);