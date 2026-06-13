import express from "express";
import { loginUser, refreshAccessToken, logoutUser ,forgotPassword , verifyOtp , resetPassword } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/refresh",refreshAccessToken)
router.post("/logout",logoutUser)
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;
