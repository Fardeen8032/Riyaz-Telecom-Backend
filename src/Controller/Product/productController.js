import Product from "../../Models/Product.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../utils/logger.js";
import {createProductSchema,productQuerySchema, productIdSchema,updateProductSchema} from "../../Validation/productValidation.js";
import uploadToCloudinary from "../../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../../utils/deleteFromCloudinary.js";

export const createProduct = asyncHandler(async (req, res, next) => {
  const validationResult = createProductSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(
      new AppError("Product validation failed", 400, errors)
    );
  }

  const imageUrls = [];

  if (req.files?.length) {
    try {
      const uploadResults = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );

      uploadResults.forEach((result) => {
        imageUrls.push(result.secure_url);
      });
    } catch (error) {
      logger.error(
        `Cloudinary upload failed: ${error.message}`
      );

      return next(
        new AppError("Failed to upload product images", 500)
      );
    }
  }

  const product = await Product.create({
    ...validationResult.data,
    images: imageUrls,
  });

  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`
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

export const getProductById = asyncHandler(async (req, res, next) => {
  const validationResult = productIdSchema.safeParse(req.params);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(
      new AppError("Invalid product ID", 400, errors)
    );
  }

  const { id } = validationResult.data;

  const product = await Product.findById(id).lean();

  if (!product) {
    return next(
      new AppError("Product not found", 404)
    );
  }

  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );

  return res.status(200).json({
    success: true,
    message: "Product fetched successfully",
    data: product,
  });
});

export const getRelatedProducts = asyncHandler(async (req, res, next) => {
  const validationResult = productIdSchema.safeParse(req.params);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(
      new AppError("Invalid product ID", 400, errors)
    );
  }

  const { id } = validationResult.data;

  const product = await Product.findById(id)
    .select("category")
    .lean();

  if (!product) {
    return next(
      new AppError("Product not found", 404)
    );
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
  })
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();

  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl} - ${relatedProducts.length} related products`
  );

  return res.status(200).json({
    success: true,
    message: "Related products fetched successfully",
    data: relatedProducts,
  });
});

export const updateProduct = asyncHandler(async (req, res, next) => {
  const idValidation = productIdSchema.safeParse(req.params);

  if (!idValidation.success) {
    const errors = idValidation.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(
      new AppError("Invalid product ID", 400, errors)
    );
  }

  const validationResult = updateProductSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(
      new AppError("Product validation failed", 400, errors)
    );
  }

  const { id } = idValidation.data;

  const product = await Product.findById(id);

  if (!product) {
    return next(
      new AppError("Product not found", 404)
    );
  }

  const updateData = {
    ...validationResult.data,
  };

  if (req.files?.length) {
    try {
      const uploadResults = await Promise.all(
        req.files.map((file) =>
          uploadToCloudinary(file.buffer)
        )
      );

      updateData.images = uploadResults.map(
        (result) => result.secure_url
      );
    } catch (error) {
      logger.error(
        `Cloudinary upload failed: ${error.message}`
      );

      return next(
        new AppError("Failed to upload product images", 500)
      );
    }
  }

  Object.assign(product, updateData);

  await product.save();

  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );

  return res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

export const deleteProduct = asyncHandler(async (req, res, next) => {
  const validationResult = productIdSchema.safeParse(req.params);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(
      new AppError("Invalid product ID", 400, errors)
    );
  }

  const { id } = validationResult.data;

  const product = await Product.findById(id);

  if (!product) {
    return next(
      new AppError("Product not found", 404)
    );
  }

  if (product.images?.length) {
    try {
      await Promise.all(
        product.images.map((imageUrl) =>
          deleteFromCloudinary(imageUrl)
        )
      );
    } catch (error) {
      logger.error(
        `Cloudinary image deletion failed: ${error.message}`
      );

      return next(
        new AppError(
          "Failed to delete product images",
          500
        )
      );
    }
  }

  await Product.findByIdAndDelete(id);

  logger.info(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl} - Product deleted`
  );

  return res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});