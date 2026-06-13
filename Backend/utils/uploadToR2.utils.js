import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../config/r2.configs.js";
import { resolveMimeType } from "./resolveMimeType.utils.js";

export const uploadToR2 = async ({ buffer, mimeType, key }) => {
    const contentType = resolveMimeType(mimeType, key);

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await r2Client.send(command);

    return {
        key,
        url: `${process.env.R2_PUBLIC_URL}/${key}`,
    };
};
