import express from "express";
import {
  signup,
  verifySignupOtp,
  login,
  requestLoginOtp,
  verifyLoginOtp,
  forgotPassword,
  resetPassword,
  logout,
  onboard,
  updateProfile,
  updateOnlineStatus,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Signup with OTP
router.post("/signup", signup);                    // Sends OTP
router.post("/verify-signup", verifySignupOtp);    // Verifies OTP + creates account

// Login (password OR OTP)
router.post("/login", login);                      // Password login
router.post("/login-otp", requestLoginOtp);        // Send login OTP
router.post("/verify-login-otp", verifyLoginOtp);  // Verify login OTP

// Forgot password
router.post("/forgot-password", forgotPassword);   // Send reset OTP
router.post("/reset-password", resetPassword);     // Verify OTP + set new pass

router.post("/logout", logout);
router.post("/onboarding", protectRoute, onboard);
router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-status", protectRoute, updateOnlineStatus);

router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;