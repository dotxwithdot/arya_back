import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/productController.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { uploadProductImages } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/", listProducts);
router.get("/:idOrSlug", getProduct);
router.post("/", adminOnly, uploadProductImages, createProduct);
router.patch("/:id", adminOnly, uploadProductImages, updateProduct);
router.delete("/:id", adminOnly, deleteProduct);

export default router;
