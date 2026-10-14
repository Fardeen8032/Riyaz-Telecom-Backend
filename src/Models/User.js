
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // Optional because Google users don't need a password
    password: {
      type: String,
      required: false,
      select: false,
    },

    // NEW: Firebase/Google user ID
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // NEW: Authentication provider
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // NEW: Google profile photo
    profilePicture: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
