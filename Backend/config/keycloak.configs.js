import dotenv from "dotenv";
dotenv.config();
const keycloakConfig = {
    url: process.env.KEYCLOAK_URL || "http://localhost:8080",
    realm: process.env.KEYCLOAK_REALM || "Test_Cms",
    clientId: process.env.KEYCLOAK_CLIENT_ID || "cms-backend",
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
};
export const validateKeycloakConfig = () => {
    const requiredFields = [
        "adminUsername",
        "adminPassword",
        "url",
        "realm",
        "clientId",
    ];
    const missingFields = requiredFields.filter(
        (field) => !keycloakConfig[field]
    );
    if (missingFields.length > 0) {
        throw new Error(
            `Missing required Keycloak configuration: ${missingFields.join(", ")}`
        );
    }
    return true;
};

export default keycloakConfig;