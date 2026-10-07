import Product from "../../Models/Product.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category");
  res.status(200).json({
    success: true,
    data: {
      categories,
    },
  });
});