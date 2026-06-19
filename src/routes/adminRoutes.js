import { Router } from "express";
import { getDashboardStats } from "../controllers/adminController.js";
import { adminOnly } from "../middleware/adminOnly.js";

const router = Router();

router.get("/stats", adminOnly, getDashboardStats);

export default router;
