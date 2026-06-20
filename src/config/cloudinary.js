import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function assertCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are required");
  }
}

export function isCloudinaryUrl(value) {
  return typeof value === "string" && value.includes("res.cloudinary.com");
}

export function uploadImageBuffer(buffer, options = {}) {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "pehnawa/products",
        resource_type: "image",
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    stream.end(buffer);
  });
}

export async function uploadImageSource(source, options = {}) {
  assertCloudinaryConfigured();

  return cloudinary.uploader.upload(source, {
    folder: "pehnawa/products",
    resource_type: "image",
    ...options,
  });
}

export default cloudinary;
