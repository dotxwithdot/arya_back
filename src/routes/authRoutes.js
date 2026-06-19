import { Router } from "express";
import { getMe, loginAdmin, logoutAdmin, registerAdmin } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/logout", logoutAdmin);
router.get("/me", protect, getMe);

export default router;
