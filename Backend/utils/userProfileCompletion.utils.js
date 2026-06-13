
const PROFILE_FIELDS = ["name", "email", "phone", "address", "about", "avatar"];

const resolveFieldValue = (field, kcAttributes = {}, mongoDoc = {}) => {
    if (field === "avatar") {
        const val = mongoDoc.avatar;
        return val && String(val).trim() !== "" ? val : null;
    }
    if (field === "email") {
        const val = mongoDoc.email ?? kcAttributes[field]?.[0];
        return val && String(val).trim() !== "" ? val : null;
    }
    const val = kcAttributes[field]?.[0];
    return val && String(val).trim() !== "" ? val : null;
};


export const calculateProfileCompletion = (kcAttributes = {}, mongoDoc = {}) => {
    const filledCount = PROFILE_FIELDS.filter(
        (field) => resolveFieldValue(field, kcAttributes, mongoDoc) !== null
    ).length;
    return Math.round((filledCount / PROFILE_FIELDS.length) * 100);
};