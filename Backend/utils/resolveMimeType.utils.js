export function resolveMimeType(contentType, key) {
    if (contentType && contentType !== "application/octet-stream") {
        return contentType;
    }
    const ext = key.split(".").pop()?.toLowerCase();
    const mimeMap = {
        png:  "image/png",
        jpg:  "image/jpeg",
        jpeg: "image/jpeg",
        gif:  "image/gif",
        webp: "image/webp",

        pdf:  "application/pdf",
        doc:  "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls:  "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        dwg:  "image/vnd.dwg",
        dxf:  "application/dxf",
        dwf:  "application/x-dwf",
    };
    return mimeMap[ext] ?? "application/octet-stream";
}