const express = require("express");
const router = express.Router();
const {
  passport,
  googleAuthEnabled,
} = require("../config/passport");
const {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  getMe,
  googleCallback,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  tokenValidation,
  validate,
} = require("../middleware/validation");
const {
  loginLimiter,
  registrationLimiter,
  emailLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimits");

// @route   POST /api/auth/register
router.post(
  "/register",
  registrationLimiter,
  registerValidation,
  validate,
  register
);

// @route   POST /api/auth/login
router.post("/login", loginLimiter, loginValidation, validate, login);

// @route   POST /api/auth/logout
router.post("/logout", protect, logout);

// @route   GET /api/auth/verify-email/:token
router.get("/verify-email/:token", tokenValidation, validate, verifyEmail);

// @route   POST /api/auth/verify-email/:token
router.post("/resend-verification", emailLimiter, protect, resendVerification);

// @route   GET /api/auth/me
router.get("/me", protect, getMe);

// @route   POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  emailLimiter,
  forgotPasswordValidation,
  validate,
  forgotPassword
);

// @route   PUT /api/auth/reset-password/:token
router.put(
  "/reset-password/:token",
  passwordResetLimiter,
  tokenValidation,
  resetPasswordValidation,
  validate,
  resetPassword
);

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
if (googleAuthEnabled) {
  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
  router.get(
    "/google/callback",
    passport.authenticate("google", {
      failureRedirect: `${process.env.FRONTEND_URL}/auth/error`,
      session: false,
    }),
    googleCallback
  );
} else {
  router.get(["/google", "/google/callback"], (_req, res) => {
    res.status(503).json({
      success: false,
      message: "Google sign-in is not configured",
    });
  });
}

module.exports = router;
