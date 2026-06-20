import fs from "node:fs";
import path from "node:path";
import multer from "multer";

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

const memoryStorage = multer.memoryStorage();

export const uploadProductImages = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 6,
  },
}).array("images", 6);

export const uploadCategoryImage = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
}).single("image");
