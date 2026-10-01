import express from "express";
import { registerUser,loginUser, refreshAccessToken, getProfile } from "../Controller/Auth/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/profile", authMiddleware, getProfile);

export default router;