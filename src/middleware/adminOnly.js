import { protect } from "./authMiddleware.js";

export const adminOnly = [protect];
