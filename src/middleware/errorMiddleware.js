import { sendError } from "../utils/apiResponse.js";

export function notFound(req, res) {
  return sendError(res, 404, `Route not found: ${req.originalUrl}`);
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((item) => item.message);
    return sendError(res, 422, "Validation failed", errors);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return sendError(res, 409, `${field} already exists`);
  }

  if (error.name === "CastError") {
    return sendError(res, 400, "Invalid resource id");
  }

  return sendError(res, statusCode, error.isOperational ? error.message : "Server error", error.errors);
}
