import Category from "../models/Category.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { sendSuccess } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getDashboardStats = asyncHandler(async (_req, res) => {
  const [products, categories, activeProducts, featuredProducts, admins, lowStock, latestProducts] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isFeatured: true }),
    User.countDocuments({ role: "admin", isActive: true }),
    Product.countDocuments({ $or: [{ stock: { $lte: 5 } }, { in_stock: false }], isActive: true }),
    Product.find().populate("category", "name slug").sort({ createdAt: -1 }).limit(6),
  ]);

  return sendSuccess(res, 200, "Dashboard stats loaded", {
    stats: {
      products,
      categories,
      activeProducts,
      featuredProducts,
      admins,
      lowStock,
    },
    latestProducts,
  });
});
