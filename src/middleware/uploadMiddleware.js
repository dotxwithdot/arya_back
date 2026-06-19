import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import AppError from "../utils/appError.js";

const productUploadRoot = path.resolve("uploads", "products");
const categoryUploadRoot = path.resolve("uploads", "categories");
fs.mkdirSync(productUploadRoot, { recursive: true });
fs.mkdirSync(categoryUploadRoot, { recursive: true });

function destinationFor(req) {
  if (req.baseUrl.includes("categories")) return categoryUploadRoot;
  return productUploadRoot;
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, destinationFor(_req));
  },
  filename(_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    callback(null, safeName);
  },
});

function fileFilter(_req, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new AppError("Only image files are allowed", 422));
    return;
  }
  callback(null, true);
}

export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
}).array("images", 6);

export const uploadCategoryImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
}).single("image");
