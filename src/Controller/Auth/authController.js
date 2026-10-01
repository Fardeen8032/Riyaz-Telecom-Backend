import bcrypt from "bcryptjs";
import User from "../../Models/User.js";
import { registerSchema,loginSchema } from "../../Validation/authValidation.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const registerUser = asyncHandler(async (req, res) => {
  // 1. Validate request body
  const validationResult = registerSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path[0],
      message: issue.message,
    }));

    throw new AppError("Validation failed", 400, errors);
  }

  const { name, email, phone, password } = validationResult.data;

  // 2. Check whether user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("An account with this email already exists", 409);
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 4. Create user
  const user = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
  });

  // 5. Send safe response
  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    },
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  // 1. Validate request
  const validationResult = loginSchema.safeParse(req.body);

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((issue) => ({
      field: issue.path[0],
      message: issue.message,
    }));

    throw new AppError("Validation failed", 400, errors);
  }

  const { email, password } = validationResult.data;

  // 2. Find user and explicitly include password
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // 3. Check whether account is active
  if (!user.isActive) {
    throw new AppError("Your account is inactive", 403);
  }

  // 4. Compare entered password with hashed password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // 5. Generate JWT
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 6. Return token + safe user information
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    },
  });
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new AppError("User not found", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account is inactive", 403);
  }

  const accessToken = generateAccessToken(user);

  res.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    data: {
      accessToken,
    },
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    },
  });
});