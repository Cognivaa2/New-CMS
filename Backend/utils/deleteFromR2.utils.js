import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../config/r2.configs.js";
export const deleteFromR2 = async (key) => {
    try {
        await r2Client.send(
            new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
            })
        );
    } catch (err) {
        console.error(`[R2] Failed to delete key "${key}":`, err.message);
    }
};