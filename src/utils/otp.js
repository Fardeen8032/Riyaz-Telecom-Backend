import crypto from "node:crypto";

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOTP = (otp) => {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP hashing configuration is missing.");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(otp)
    .digest("hex");
};