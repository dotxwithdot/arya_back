import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createUniqueSlug } from "../utils/uniqueSlug.js";

function buildQuery(req) {
  const query = {};
  if (req.query.includeInactive !== "true") query.isActive = true;
  if (req.query.search) {
    const search = String(req.query.search).trim();
    query.$or = [{ name: new RegExp(search, "i") }];
  }
  return query;
}

function toBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function uploadedCategoryImageUrl(req) {
  if (!req.file) return "";
  return `${req.protocol}://${req.get("host")}/uploads/categories/${req.file.filename}`;
}

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find(buildQuery(req)).sort({ createdAt: -1 });
  return sendSuccess(res, 200, "Categories loaded", { categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new AppError("Category name is required", 422);
  const image = uploadedCategoryImageUrl(req);
  if (!image) throw new AppError("Category image is required", 422);

  const category = await Category.create({
    name,
    slug: await createUniqueSlug(Category, name),
    image,
    isActive: toBoolean(req.body.isActive, true),
    createdBy: req.user._id,
  });

  return sendSuccess(res, 201, "Category created successfully", { category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError("Category not found", 404);

  const uploadedImage = uploadedCategoryImageUrl(req);
  const fields = ["name", "isActive"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) category[field] = req.body[field];
  });
  if (uploadedImage) category.image = uploadedImage;
  if (req.body.isActive !== undefined) category.isActive = toBoolean(req.body.isActive, true);
  if (req.body.name && req.body.name !== category.name) {
    category.slug = await createUniqueSlug(Category, req.body.name, category._id);
  }
  category.updatedBy = req.user._id;
  await category.save();

  return sendSuccess(res, 200, "Category updated successfully", { category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError("Category not found", 404);

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw new AppError("Category has products. Disable it or move products before deleting", 409);
  }

  await category.deleteOne();
  return sendSuccess(res, 200, "Category deleted successfully");
});

export const getCategory = asyncHandler(async (req, res) => {
  const selector = mongoose.isValidObjectId(req.params.idOrSlug)
    ? { _id: req.params.idOrSlug }
    : { slug: req.params.idOrSlug };
  const category = await Category.findOne(selector);
  if (!category) throw new AppError("Category not found", 404);
  return sendSuccess(res, 200, "Category loaded", { category });
});
