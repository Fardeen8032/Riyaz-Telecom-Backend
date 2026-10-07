import Product from "../../Models/Product.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../utils/logger.js";
import {createProductSchema,productQuerySchema} from "../../Validation/productValidation.js";
import cloudinary from "../../config/cloudinary.js";


const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "mobile-shop/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const createProduct = asyncHandler(async (req, res, next) => {
  const validationResult = createProductSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(new AppError("Product validation failed", 400, errors));
  }

  let imageUrl = "";

  if (req.file) {
    try {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
    } catch (error) {
      logger.error(`Cloudinary upload failed: ${error.message}`);

      return next(
        new AppError("Failed to upload product image", 500)
      );
    }
  }

  const product = await Product.create({
    ...validationResult.data,
    image: imageUrl,
  });

  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`,
  );

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

export const getProducts = asyncHandler(async (req, res, next) => {
  const validationResult = productQuerySchema.safeParse(req.query);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return next(new AppError("Invalid query parameters", 400, errors));
  }
  const { page, limit, category, search } = validationResult.data;
  const skip = (page - 1) * limit;
  const filter = {};
  if (category) {
    filter.category = category;
  }
  if (search) {
    filter.$text = { $search: search };
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl} - ${products.length} products`,
  );
  return res
    .status(200)
    .json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});
