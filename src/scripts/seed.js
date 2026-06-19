import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import connectDB from "../config/db.js";
import { createUniqueSlug } from "../utils/uniqueSlug.js";
import { makeSlug } from "../utils/slugify.js";

dotenv.config();

const categories = [
  "Indian Kurties",
  "Earrings",
  "Ethnic Wear",
  "Accessories",
  "Bangles",
  "Dupattas",
  "Handbags",
  "Watches",
  "Beauty Gift Sets",
  "Gifts",
  "Girls Fashion",
];

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=95&dpr=2`;

const products = [
  ["Aarohi Floral Cotton Kurti", "Indian Kurties", 1199, 1899, "37% OFF", img("photo-1583391733956-6c78276477e2")],
  ["Meera Rayon A-Line Kurti", "Indian Kurties", 999, 1699, "Best Seller", img("photo-1610030469983-98e550d6193c")],
  ["Tara Kundan Drop Earrings", "Earrings", 549, 899, "39% OFF", img("photo-1515562141207-7a88fb7ce338")],
  ["Sitara Festive Anarkali", "Ethnic Wear", 2799, 3999, "30% OFF", img("photo-1603217040830-34473db521a6")],
  ["Naina Embroidered Handbag", "Handbags", 1699, 2499, "32% OFF", img("photo-1584917865442-de89df76afd3")],
  ["Ruhani Beauty Gift Set", "Beauty Gift Sets", 1299, 1999, "Gift Ready", img("photo-1596462502278-27bfdc403348")],
  ["Lavanya Potli Bag", "Handbags", 849, 1399, "39% OFF", img("photo-1605733513597-a8f8341084e6")],
  ["Ishika Modal Kurti", "Indian Kurties", 1299, 1999, "35% OFF", img("photo-1622122201714-77da0ca8e5d2")],
];

async function run() {
  await connectDB();

  const systemAdmin = await User.findOne({ role: "admin", isActive: true });

  if (!systemAdmin) {
    throw new Error("Seed admin not found. Register an admin first, then run the seed script.");
  }

  const categoryMap = new Map();
  for (const name of categories) {
    const existingCategory = await Category.findOne({ name });
    const category = await Category.findOneAndUpdate(
      { name },
      {
        name,
        slug: existingCategory?.slug || makeSlug(name),
        description: `${name} collection for AryaShop shoppers.`,
        createdBy: systemAdmin._id,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoryMap.set(name, category);
  }

  for (const [name, categoryName, price, originalPrice, offer, image] of products) {
    const category = categoryMap.get(categoryName);
    const existingProduct = await Product.findOne({ name });
    await Product.findOneAndUpdate(
      { name },
      {
        name,
        slug: existingProduct?.slug || (await createUniqueSlug(Product, name)),
        category: category._id,
        price,
        originalPrice,
        discountPercent: Math.max(Math.round(((originalPrice - price) / originalPrice) * 100), 0),
        offer,
        badgeLabel: offer || "Best Seller",
        image,
        images: [image],
        shortDescription: `Curated ${categoryName.toLowerCase()} piece for AryaShop shoppers.`,
        longDescription: `A polished ${name.toLowerCase()} selected for everyday styling, gifting, and quick WhatsApp inquiry.`,
        material: "Premium blended material",
        highlights: ["Admin seeded product", "Ready for WhatsApp inquiry", "Easy to update from admin panel"],
        stock: 20,
        isFeatured: true,
        isActive: true,
        createdBy: systemAdmin._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
