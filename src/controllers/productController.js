import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createUniqueSlug } from "../utils/uniqueSlug.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function uploadedImageUrls(req) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return (req.files || []).map((file) => `${baseUrl}/uploads/products/${file.filename}`);
}

function parseArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (_error) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeProductPayload(body) {
  const originalPrice = Number(body.originalPrice);
  const discountPercent = Math.min(Math.max(Number(body.discountPercent || 0), 0), 100);
  const calculatedPrice = Math.max(Math.round(originalPrice - (originalPrice * discountPercent) / 100), 0);

  return {
    name: body.name,
    sku: body.sku || undefined,
    category: body.category,
    price: Number.isFinite(calculatedPrice) ? calculatedPrice : Number(body.price),
    originalPrice,
    discountPercent,
    offer: discountPercent > 0 ? `${discountPercent}% OFF` : "",
    badgeLabel: body.badgeLabel || "Best Seller",
    image: body.image,
    images: parseArray(body.images),
    fallbackImage: body.fallbackImage || "",
    fallbackImages: parseArray(body.fallbackImages),
    shortDescription: body.shortDescription || body.description,
    longDescription: body.longDescription || "",
    material: body.material || "",
    highlights: parseArray(body.highlights),
    shipping: body.shipping || "Ships in 3-6 working days.",
    rating: body.rating === undefined ? 4.5 : Number(body.rating),
    reviews: body.reviews === undefined ? 0 : Number(body.reviews),
    reviewSummary: body.reviewSummary || "Customers love the comfort, styling, and easy WhatsApp support from AryaShop.",
    stock: body.stock === undefined ? 0 : Number(body.stock),
    in_stock: toBoolean(body.in_stock, true),
    isFeatured: toBoolean(body.isFeatured, false),
    isActive: toBoolean(body.isActive, true),
  };
}

async function buildProductQuery(req) {
  const query = {};
  if (req.query.includeInactive !== "true") query.isActive = true;

  if (req.query.search) {
    const search = String(req.query.search).trim();
    query.$or = [
      { name: new RegExp(search, "i") },
      { sku: new RegExp(search, "i") },
      { shortDescription: new RegExp(search, "i") },
      { material: new RegExp(search, "i") },
    ];
  }

  if (req.query.category) {
    if (mongoose.isValidObjectId(req.query.category)) {
      query.category = req.query.category;
    } else {
      const category = await Category.findOne({
        $or: [{ slug: req.query.category }, { name: new RegExp(`^${escapeRegex(String(req.query.category).trim())}$`, "i") }],
      });
      query.category = category?._id || new mongoose.Types.ObjectId();
    }
  }

  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }

  if (req.query.deal === "499") query.price = { $lte: 499 };
  if (req.query.featured === "true") query.isFeatured = true;

  return query;
}

function sortBy(value) {
  if (value === "low") return { price: 1 };
  if (value === "high") return { price: -1 };
  if (value === "oldest") return { createdAt: 1 };
  return { createdAt: -1 };
}

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 100);
  const skip = (page - 1) * limit;

  const query = await buildProductQuery(req);
  const [products, total, priceStats] = await Promise.all([
    Product.find(query).populate("category", "name slug").sort(sortBy(req.query.sort)).skip(skip).limit(limit),
    Product.countDocuments(query),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, highestPrice: { $max: "$price" } } }]),
  ]);

  return sendSuccess(
    res,
    200,
    "Products loaded",
    { products },
    {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      highestPrice: priceStats[0]?.highestPrice || 0,
    },
  );
});

export const getProduct = asyncHandler(async (req, res) => {
  const selector = mongoose.isValidObjectId(req.params.idOrSlug)
    ? { _id: req.params.idOrSlug }
    : { slug: req.params.idOrSlug };
  const product = await Product.findOne(selector).populate("category", "name slug");
  if (!product) throw new AppError("Product not found", 404);
  return sendSuccess(res, 200, "Product loaded", { product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = normalizeProductPayload(req.body);
  const imageUrls = uploadedImageUrls(req);
  if (imageUrls.length) {
    payload.image = imageUrls[0];
    payload.images = imageUrls;
  }

  if (!payload.name || !payload.category || !payload.image || !payload.shortDescription) {
    throw new AppError("Name, category, product image, and short description are required", 422);
  }

  const category = await Category.findById(payload.category);
  if (!category) throw new AppError("Category not found", 404);

  const product = await Product.create({
    ...payload,
    slug: await createUniqueSlug(Product, payload.name),
    createdBy: req.user._id,
  });

  await product.populate("category", "name slug");
  return sendSuccess(res, 201, "Product created successfully", { product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);

  const payload = normalizeProductPayload({ ...product.toObject(), ...req.body });
  const imageUrls = uploadedImageUrls(req);
  if (imageUrls.length) {
    payload.image = imageUrls[0];
    payload.images = imageUrls;
  }

  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) throw new AppError("Category not found", 404);
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && !(key === "sku" && value === "")) product[key] = value;
  });
  if (req.body.name && req.body.name !== product.name) {
    product.slug = await createUniqueSlug(Product, req.body.name, product._id);
  }
  product.updatedBy = req.user._id;
  await product.save();
  await product.populate("category", "name slug");

  return sendSuccess(res, 200, "Product updated successfully", { product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  await product.deleteOne();
  return sendSuccess(res, 200, "Product deleted successfully");
});
