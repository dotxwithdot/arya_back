import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from "../controllers/categoryController.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { uploadCategoryImage } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/", listCategories);
router.get("/:idOrSlug", getCategory);
router.post("/", adminOnly, uploadCategoryImage, createCategory);
router.patch("/:id", adminOnly, uploadCategoryImage, updateCategory);
router.delete("/:id", adminOnly, deleteCategory);

export default router;
