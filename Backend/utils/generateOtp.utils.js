import crypto from "crypto";

export const generateOtp = () => {
  const otp = crypto.randomInt(1000, 9999);
  console.log(otp)
  return otp.toString();
};