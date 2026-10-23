import mongoose from "mongoose";
import Cart from "../../Models/Cart.js";
import Product from "../../Models/Product.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";

// Get the authenticated user's ID from the JWT middleware.
const getAuthenticatedUserId = (req) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  return userId;
};

// Populate products so the frontend receives current product details.
const populateCart = (query) =>
  query.populate({
    path: "items.product",
    select: "name brand price images category",
  });

// GET /api/cart
export const getCart = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);

  const cart = await populateCart(
    Cart.findOne({ user: userId })
  );

  res.status(200).json({
    success: true,
    data: cart || { items: [] },
  });
});

// POST /api/cart/items
export const addToCart = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { productId, quantity = 1 } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Invalid product ID.", 400);
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new AppError("Quantity must be between 1 and 99.", 400);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    if (existingItem.quantity + quantity > 99) {
      throw new AppError("Maximum quantity per product is 99.", 400);
    }

    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();

  cart = await populateCart(Cart.findById(cart._id));

  res.status(200).json({
    success: true,
    message: "Product added to cart.",
    data: cart,
  });
});

// PATCH /api/cart/items/:productId
export const updateCartItem = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Invalid product ID.", 400);
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new AppError("Quantity must be between 1 and 99.", 400);
  }

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new AppError("Cart not found.", 404);
  }

  const item = cart.items.find(
    (cartItem) => cartItem.product.toString() === productId
  );

  if (!item) {
    throw new AppError("Product is not in your cart.", 404);
  }

  item.quantity = quantity;
  await cart.save();

  const updatedCart = await populateCart(Cart.findById(cart._id));

  res.status(200).json({
    success: true,
    message: "Cart quantity updated.",
    data: updatedCart,
  });
});

// DELETE /api/cart/items/:productId
export const removeCartItem = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Invalid product ID.", 400);
  }

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new AppError("Cart not found.", 404);
  }

  const initialLength = cart.items.length;

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  if (cart.items.length === initialLength) {
    throw new AppError("Product is not in your cart.", 404);
  }

  await cart.save();

  const updatedCart = await populateCart(Cart.findById(cart._id));

  res.status(200).json({
    success: true,
    message: "Product removed from cart.",
    data: updatedCart,
  });
});

// DELETE /api/cart
export const clearCart = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);

  const cart = await Cart.findOne({ user: userId });

  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.status(200).json({
    success: true,
    message: "Cart cleared.",
    data: { items: [] },
  });
});