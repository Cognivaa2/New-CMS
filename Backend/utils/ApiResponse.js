class ApiResponse {
    constructor(
        statusCode,
        data,
        title = "Success",
        description = "",
        message = "Success"
    ) {
        this.statusCode = statusCode;
        this.success = true;
        this.title = title;
        this.description = description;
        this.data = data;
        this.message = message;
    }
}

export default ApiResponse;