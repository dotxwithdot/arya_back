import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/appError.js";
import asyncHandler from "../utils/asyncHandler.js";

function getCookieValue(cookieHeader, name) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, bearerToken] = authHeader.split(" ");
  const cookieToken = getCookieValue(req.headers.cookie, "admin_token");
  const token = cookieToken || (scheme === "Bearer" ? bearerToken : "");

  if (!token) {
    throw new AppError("Authentication token is required", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    throw new AppError("Invalid or expired authentication token", 401);
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw new AppError("Admin account is not authorized", 401);
  }

  req.user = user;
  next();
});

export function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== "admin") {
    throw new AppError("Admin authorization required", 403);
  }
  next();
}
