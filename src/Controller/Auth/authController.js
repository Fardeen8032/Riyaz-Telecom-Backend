import bcrypt from "bcryptjs";
import User from "../../Models/User.js";
import { registerSchema,loginSchema } from "../../Validation/authValidation.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import verifyGoogleIdToken from "../../Service/firebaseAuthService.js";
import sendPasswordResetOTP from "../../Service/emailService.js";
import { generateOTP, hashOTP } from "../../utils/otp.js";
import PasswordReset from "../../Models/PasswordReset.js";
import {generateResetToken,hashResetToken} from "../../utils/resetToken.js";
import crypto from "node:crypto";

const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY = 10 * 60 * 1000;
const BCRYPT_SALT_ROUNDS = 12;


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

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  const googleUser = await verifyGoogleIdToken(idToken);

  let user = await User.findOne({
    email: googleUser.email,
  });

  if (user) {
    // Link the verified Google identity to an existing account.
    if (
      user.googleId &&
      user.googleId !== googleUser.googleId
    ) {
      throw new AppError(
        "This email is already linked to another Google account.",
        409
      );
    }

    user.googleId = googleUser.googleId;

    if (!user.profilePicture && googleUser.profilePicture) {
      user.profilePicture = googleUser.profilePicture;
    }

    await user.save();
  } else {
    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
      profilePicture: googleUser.profilePicture,
      authProvider: "google",
    });
  }

  const accessToken = generateAccessToken(user._id);

  res.status(200).json({
    success: true,
    message: "Google sign-in successful.",
    data: {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  // Validate email.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Please enter a valid email address.", 400);
  }

  const responseMessage = "If an account exists with this email, a verification code will be sent.";

  // Find the registered user.
  const user = await User.findOne({ email }).select("_id email");

  // Do not reveal whether an email is registered.
  if (!user) {
    return res.status(200).json({
      success: true,
      message: responseMessage,
    });
  }

  const currentTime = new Date();
  const resendCooldown = 60 * 1000;

  const existingRequest = await PasswordReset.findOne({
    user: user._id,
  });

  // Prevent repeated OTP requests within 60 seconds.
  if (
    existingRequest &&
    currentTime.getTime() - existingRequest.lastSentAt.getTime() <
      resendCooldown
  ) {
    return res.status(200).json({
      success: true,
      message: responseMessage,
    });
  }

  // Generate and hash the OTP.
  const otp = generateOTP();
  const otpHash = hashOTP(otp);

  const expiresAt = new Date(currentTime.getTime() + 5 * 60 * 1000);

  // Save the OTP hash in MongoDB.
  await PasswordReset.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        otpHash,
        expiresAt,
        lastSentAt: currentTime,
        attempts: 0,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  try {
    // Send the OTP to the user's registered email.
    await sendPasswordResetOTP(user.email, otp);
  } catch (error) {
    // Remove the newly created OTP record if email delivery fails.
    await PasswordReset.deleteOne({
      user: user._id,
      otpHash,
    });

    console.error("Password reset email delivery failed:", error);

    throw new AppError(
      "Unable to send the verification email. Please try again later.",
      503
    );
  }

  return res.status(200).json({
    success: true,
    message: responseMessage,
  });
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = String(req.body.otp ?? "").trim();

  // Validate request data.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Please enter a valid email address.", 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new AppError("Please enter a valid 6-digit OTP.", 400);
  }

  // Find the registered user.
  const user = await User.findOne({ email }).select("_id");

  if (!user) {
    throw new AppError("Invalid or expired verification code.", 400);
  }

  // Find the password reset request.
  const passwordReset = await PasswordReset.findOne({
    user: user._id,
  });

  const currentTime = new Date();

  if (
    !passwordReset ||
    !passwordReset.otpHash ||
    passwordReset.expiresAt <= currentTime
  ) {
    throw new AppError("Invalid or expired verification code.", 400);
  }

  if (passwordReset.attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(
      "Too many incorrect attempts. Please request a new OTP.",
      429
    );
  }

  // Compare OTP hashes securely.
  const submittedOTPHash = hashOTP(otp);

  const isOTPValid = crypto.timingSafeEqual(
    Buffer.from(submittedOTPHash, "hex"),
    Buffer.from(passwordReset.otpHash, "hex")
  );

  if (!isOTPValid) {
    await PasswordReset.updateOne(
      {
        _id: passwordReset._id,
        otpHash: passwordReset.otpHash,
        attempts: { $lt: MAX_OTP_ATTEMPTS },
        expiresAt: { $gt: currentTime },
      },
      {
        $inc: { attempts: 1 },
      }
    );

    throw new AppError("Invalid or expired verification code.", 400);
  }

  // Generate a short-lived reset token.
  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);

  const resetTokenExpiresAt = new Date(
    currentTime.getTime() + RESET_TOKEN_EXPIRY
  );

  // Atomically consume the OTP and save the reset token hash.
  const updatedRequest = await PasswordReset.findOneAndUpdate(
    {
      _id: passwordReset._id,
      otpHash: passwordReset.otpHash,
      attempts: { $lt: MAX_OTP_ATTEMPTS },
      expiresAt: { $gt: currentTime },
    },
    {
      $set: {
        otpHash: null,
        resetTokenHash,
        resetTokenExpiresAt,
        expiresAt: resetTokenExpiresAt,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRequest) {
    throw new AppError(
      "Verification code is invalid or has already been used.",
      400
    );
  }

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully.",
    resetToken,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const resetToken = req.body.resetToken?.trim();
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;

  // Validate required fields.
  if (!resetToken || !newPassword || !confirmPassword) {
    throw new AppError("All fields are required.", 400);
  }

  // Validate password length.
  if (newPassword.length < 8) {
    throw new AppError(
      "Password must contain at least 8 characters.",
      400
    );
  }

  // Validate password confirmation.
  if (newPassword !== confirmPassword) {
    throw new AppError("Passwords do not match.", 400);
  }

  // Hash the submitted reset token.
  const resetTokenHash = hashResetToken(resetToken);
  const currentTime = new Date();

  // Hash the new password.
  const hashedPassword = await bcrypt.hash(
    newPassword,
    BCRYPT_SALT_ROUNDS
  );

  // Atomically consume the valid reset token.
  const passwordReset = await PasswordReset.findOneAndUpdate(
    {
      resetTokenHash,
      resetTokenExpiresAt: { $gt: currentTime },
    },
    {
      $set: {
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        expiresAt: currentTime,
      },
    },
    {
      new: true,
    }
  );

  if (!passwordReset) {
    throw new AppError(
      "Invalid or expired password reset session. Please verify your OTP again.",
      400
    );
  }

  // Update the user's password.
  const updatedUser = await User.findByIdAndUpdate(
    passwordReset.user,
    {
      $set: {
        password: hashedPassword,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedUser) {
    throw new AppError("Unable to update your password.", 500);
  }

  return res.status(200).json({
    success: true,
    message: "Password reset successfully.",
  });
});