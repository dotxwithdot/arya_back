import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [140, "Product name cannot exceed 140 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      required: [true, "Original price is required"],
      min: [0, "Original price cannot be negative"],
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100"],
    },
    offer: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Offer cannot exceed 80 characters"],
    },
    badgeLabel: {
      type: String,
      trim: true,
      default: "Best Seller",
      maxlength: [80, "Badge label cannot exceed 80 characters"],
    },
    image: {
      type: String,
      required: [true, "Main image URL is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    fallbackImage: {
      type: String,
      trim: true,
      default: "",
    },
    fallbackImages: {
      type: [String],
      default: [],
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      maxlength: [360, "Short description cannot exceed 360 characters"],
    },
    longDescription: {
      type: String,
      trim: true,
      maxlength: [2500, "Long description cannot exceed 2500 characters"],
      default: "",
    },
    material: {
      type: String,
      trim: true,
      default: "",
    },
    highlights: {
      type: [String],
      default: [],
    },
    shipping: {
      type: String,
      trim: true,
      default: "Ships in 3-6 working days.",
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviewSummary: {
      type: String,
      trim: true,
      default: "Customers love the comfort, styling, and easy WhatsApp support from AryaShop.",
      maxlength: [420, "Review summary cannot exceed 420 characters"],
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    in_stock: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", shortDescription: "text", longDescription: "text", material: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });

productSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("Product", productSchema);
