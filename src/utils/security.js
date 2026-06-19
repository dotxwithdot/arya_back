import crypto from "crypto";
import jwt from "jsonwebtoken";

export function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

export function secureCompare(value, expected) {
  const left = Buffer.from(String(value || ""));
  const right = Buffer.from(String(expected || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
