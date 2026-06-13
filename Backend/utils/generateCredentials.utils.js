import crypto from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

const generateSecurePassword = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const symbols = "!@#$%^&*";
    const all = upper + lower + digits + symbols;
    const getRandom = (chars) => chars[crypto.randomInt(0, chars.length)];
    const required = [
        getRandom(upper),
        getRandom(lower),
        getRandom(digits),
        getRandom(symbols),
    ];
    const rest = Array.from({ length: 6 }, () => getRandom(all));
    return [...required, ...rest]
        .sort(() => crypto.randomInt(0, 3) - 1)
        .join("");
};
export const generateCredentials = async (email) => {
    const username = `user_${email.toLowerCase().trim()}`;
    const password = generateSecurePassword();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return { username, password, passwordHash };
};