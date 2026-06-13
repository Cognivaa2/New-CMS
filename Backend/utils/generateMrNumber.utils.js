import Counter from "../models/counter.models.js";

const generateMrNumber = async (companyId) => {
    const year = new Date().getFullYear();
    const counterKey = `MR-${companyId.toString()}-${year}`;
    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    ).lean();

    const seq = counter.seq;
    return `MR-${year}-${String(seq).padStart(4, "0")}`;
};

export default generateMrNumber;
