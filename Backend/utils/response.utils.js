// ─── Standard HTTP Status Codes
const STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ─── Success Responses 
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
  };
  if (data !== null) response.data = data;
  if (meta !== null) response.pagination = meta;
  return res.status(statusCode).json(response);
};

// 200 - OK
export const ok = (res, message = "Success", data = null, meta = null) => {
  return sendSuccess(res, STATUS_CODES.OK, message, data, meta);
};

// 201 - Created
export const created = (res, message = "Resource created successfully", data = null) => {
  return sendSuccess(res, STATUS_CODES.CREATED, message, data);
};

// 204 - No Content
export const noContent = (res) => {
  return res.status(STATUS_CODES.NO_CONTENT).end();
};

// ─── Error Responses
const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

// 400 - Bad Request
export const badRequest = (res, message = "Bad request", errors = null) => {
  return sendError(res, STATUS_CODES.BAD_REQUEST, message, errors);
};

// 401 - Unauthorized
export const unauthorized = (res, message = "Unauthorized access") => {
  return sendError(res, STATUS_CODES.UNAUTHORIZED, message);
};

// 403 - Forbidden
export const forbidden = (res, message = "Access forbidden") => {
  return sendError(res, STATUS_CODES.FORBIDDEN, message);
};

// 404 - Not Found
export const notFound = (res, message = "Resource not found") => {
  return sendError(res, STATUS_CODES.NOT_FOUND, message);
};

// 409 - Conflict
export const conflict = (res, message = "Resource already exists") => {
  return sendError(res, STATUS_CODES.CONFLICT, message);
};

// 422 - Unprocessable Entity
export const unprocessable = (res, message = "Validation failed", errors = null) => {
  return sendError(res, STATUS_CODES.UNPROCESSABLE_ENTITY, message, errors);
};

// 429 - Too Many Requests
export const tooManyRequests = (res, message = "Too many requests, please try again later") => {
  return sendError(res, STATUS_CODES.TOO_MANY_REQUESTS, message);
};

// 500 - Internal Server Error
export const serverError = (res, message = "Internal server error") => {
  return sendError(res, STATUS_CODES.INTERNAL_SERVER_ERROR, message);
};

// 503 - Service Unavailable
export const serviceUnavailable = (res, message = "Service temporarily unavailable") => {
  return sendError(res, STATUS_CODES.SERVICE_UNAVAILABLE, message);
};

// ─── Missing Fields Helper
export const missingFields = (res, fields = []) => {
  return badRequest(res, `Missing required fields: ${fields.join(", ")}`);
};

// ─── Validation Helper
export const invalidValue = (res, field, validValues = []) => {
  return badRequest(
    res,
    `Invalid ${field}. Valid values: ${validValues.join(", ")}`
  );
};

// ─── Catch Error Handler (for catch blocks) 
export const handleCatchError = (res, error, duplicateMessage = "Duplicate field value") => {
  console.error(error);
  if (error.code === 11000) {
    return sendError(res, STATUS_CODES.CONFLICT, duplicateMessage);
  }
  return sendError(res, STATUS_CODES.INTERNAL_SERVER_ERROR, "Internal server error");
};

export default {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  tooManyRequests,
  serverError,
  serviceUnavailable,
  handleCatchError,
  missingFields,
  invalidValue
};