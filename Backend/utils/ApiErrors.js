class ApiErrors {
    constructor(
        statusCode,
        title = "Something went wrong",
        description = "An unexpected error occurred",
        errors = [],
        stack = ""
    ) {
        this.statusCode = statusCode;
        this.success = false;
        this.title = title;
        this.description = description;
        this.errors = errors;
        this.stack = stack;
    }
}

export default ApiErrors;