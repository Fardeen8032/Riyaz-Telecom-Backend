import express from "express";
import { registerUser,loginUser, refreshAccessToken, getProfile, googleLogin } from "../Controller/Auth/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/profile", authMiddleware, getProfile);
router.post("/google", googleLogin);

export default router;