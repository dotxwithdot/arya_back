import validator from "validator";
import User from "../models/User.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken, secureCompare } from "../utils/security.js";
import { createUniqueSlug } from "../utils/uniqueSlug.js";

function sanitizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const hasHttpsFrontend = String(process.env.FRONTEND_URL || "").includes("https://");
  const isRender = process.env.RENDER === "true";
  const secureCookie = isProduction || hasHttpsFrontend || isRender;
  return {
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function setAuthCookie(res, token) {
  res.cookie("admin_token", token, getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie("admin_token", {
    ...getCookieOptions(),
    maxAge: undefined,
  });
}

export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, gmail, email: rawEmail, password, secretAdminKey } = req.body;
  const email = sanitizeEmail(gmail || rawEmail);
  const expectedAdminKey = process.env.ADMIN_SECRET_KEY;

  if (!expectedAdminKey) {
    throw new AppError("ADMIN_SECRET_KEY is not configured", 500);
  }

  if (!secureCompare(secretAdminKey, expectedAdminKey)) {
    throw new AppError("Admin key is not valid", 403);
  }

  if (!name || !validator.isEmail(email)) {
    throw new AppError("Valid name and email are required", 422);
  }

  if (!validatePassword(password)) {
    throw new AppError("Password must be at least 8 characters", 422);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Admin already exists with this email", 409);
  }

  const user = await User.create({
    name: name.trim(),
    email,
    slug: await createUniqueSlug(User, name),
    password,
    role: "admin",
    isActive: true,
  });

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  clearAuthCookie(res);
  return sendSuccess(res, 201, "Admin created successfully. Please login to continue.", {
    user: user.toJSON(),
  });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const email = sanitizeEmail(req.body.gmail || req.body.email);
  const { password, secretAdminKey } = req.body;
  const expectedAdminKey = process.env.ADMIN_SECRET_KEY;

  if (!expectedAdminKey) {
    throw new AppError("ADMIN_SECRET_KEY is not configured", 500);
  }

  if (!validator.isEmail(email) || (!password && !secretAdminKey)) {
    throw new AppError("Valid email and password or admin key are required", 422);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid login credentials", 401);
  }

  const passwordMatches = password ? await user.comparePassword(password) : false;
  const adminKeyMatches = secretAdminKey ? secureCompare(secretAdminKey, expectedAdminKey) : false;
  if (!passwordMatches && !adminKeyMatches) {
    throw new AppError("Invalid login credentials", 401);
  }

  if (!user.isActive || user.role !== "admin") {
    throw new AppError("Admin account is not authorized", 403);
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = createToken(user);
  setAuthCookie(res, token);

  return sendSuccess(res, 200, "Login successful", {
    user: user.toJSON(),
  });
});

export const logoutAdmin = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, 200, "Logout successful");
});

export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "Admin profile loaded", { user: req.user });
});
