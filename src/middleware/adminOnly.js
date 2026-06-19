import { protect, requireAdmin } from "./authMiddleware.js";

export const adminOnly = [protect, requireAdmin];
