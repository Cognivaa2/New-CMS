export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

export class KeycloakError extends AppError {
    constructor(message, statusCode = 500, keycloakResponse = null) {
        super(message, statusCode);
        this.name = "KeycloakError";
        this.keycloakResponse = keycloakResponse;
    }
}

export class ValidationError extends AppError {
    constructor(message, fields = []) {
        super(message, 400);
        this.name = "ValidationError";
        this.fields = fields;
    }
}

export const formatErrorResponse = (error) => {
    const response = {
        success: false,
        message: error.message || "An unexpected error occurred",
        timestamp: error.timestamp || new Date().toISOString(),
    };
    if (error instanceof ValidationError) {
        response.fields = error.fields;
    }
    if (error instanceof KeycloakError && error.keycloakResponse) {
        response.keycloakError = error.keycloakResponse;
    }
    if (process.env.NODE_ENV === "development" && error.stack) {
        response.stack = error.stack;
    }
    return response;
};

export const mapKeycloakError = (error) => {
    if (!error.response) {
        return new KeycloakError(
            "Failed to connect to Keycloak server",
            503,
            null
        );
    }
    const { status, data } = error.response;
    switch (status) {
        case 401:
            return new KeycloakError(
                "Invalid Keycloak admin credentials",
                401,
                data
            );
        case 409:
            return new KeycloakError(
                "User already exists in Keycloak",
                409,
                data
            );
        case 400:
            return new KeycloakError(
                data?.errorMessage || "Invalid request to Keycloak",
                400,
                data
            );
        case 404:
            return new KeycloakError("Resource not found in Keycloak", 404, data);
        default:
            return new KeycloakError(
                "Keycloak service error",
                status || 500,
                data
            );
    }
};
