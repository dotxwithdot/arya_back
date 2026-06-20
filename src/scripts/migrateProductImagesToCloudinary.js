import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { isCloudinaryUrl, uploadImageSource } from "../config/cloudinary.js";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";

const uploadsRoot = path.resolve("uploads");
const backupRoot = path.resolve("backups");
const dryRun = process.argv.includes("--dry-run");

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function localPathFromUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const marker = "/uploads/";
    if (!url.pathname.includes(marker)) return "";
    return path.join(uploadsRoot, decodeURIComponent(url.pathname.split(marker)[1]));
  } catch (_error) {
    if (value.startsWith("/uploads/")) return path.join(uploadsRoot, value.replace(/^\/uploads\//, ""));
    return "";
  }
}

function sourceForImage(value) {
  const localPath = localPathFromUrl(value);
  if (localPath && fs.existsSync(localPath)) return localPath;
  return value;
}

async function migrateImage(value, cache) {
  if (!value || isCloudinaryUrl(value)) return value;
  if (cache.has(value)) return cache.get(value);

  const source = sourceForImage(value);
  const result = await uploadImageSource(source, {
    folder: "pehnawa/products/migrated",
    context: {
      original_source: value,
    },
  });

  cache.set(value, result.secure_url);
  return result.secure_url;
}

async function main() {
  await connectDB();

  const products = await Product.find({
    $or: [{ image: { $exists: true, $ne: "" } }, { images: { $exists: true, $ne: [] } }],
  });
  const productsToMigrate = products.filter((product) => {
    const images = unique([product.image, ...(product.images || [])]);
    return images.some((image) => image && !isCloudinaryUrl(image));
  });

  if (!dryRun && productsToMigrate.length) {
    fs.mkdirSync(backupRoot, { recursive: true });
    const backupPath = path.join(backupRoot, `product-images-${Date.now()}.json`);
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        productsToMigrate.map((product) => ({
          id: product.id,
          name: product.name,
          image: product.image,
          images: product.images,
        })),
        null,
        2,
      ),
    );
    console.log(`Backup written to ${backupPath}`);
  }

  const cache = new Map();
  let migratedCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const product of products) {
    const originalImage = product.image;
    const originalImages = unique(product.images?.length ? product.images : [product.image]);
    const needsMigration = unique([originalImage, ...originalImages]).some((image) => image && !isCloudinaryUrl(image));

    if (!needsMigration) {
      skippedCount += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${product.name}: ${unique([originalImage, ...originalImages]).length} image(s)`);
      migratedCount += 1;
      continue;
    }

    let migratedMainImage;
    let migratedImages;
    try {
      migratedMainImage = await migrateImage(originalImage, cache);
      migratedImages = await Promise.all(originalImages.map((image) => migrateImage(image, cache)));
    } catch (error) {
      failures.push({
        id: product.id,
        name: product.name,
        message: error.message,
      });
      console.error(`Failed ${product.name}: ${error.message}`);
      continue;
    }

    product.image = migratedMainImage || migratedImages[0];
    product.images = unique(migratedImages);
    await product.save();

    migratedCount += 1;
    console.log(`Migrated ${product.name}`);
  }

  if (failures.length) {
    const failurePath = path.join(backupRoot, `product-image-migration-failures-${Date.now()}.json`);
    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(failurePath, JSON.stringify(failures, null, 2));
    console.log(`Failures written to ${failurePath}`);
  }

  console.log(`Done. Migrated: ${migratedCount}. Skipped: ${skippedCount}. Failed: ${failures.length}.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
