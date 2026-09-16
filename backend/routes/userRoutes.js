const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllUsers,
  updateProfile,
  changePassword,
} = require("../controllers/userController");
const {
  profileValidation,
  changePasswordValidation,
  validate,
} = require("../middleware/validation");

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get("/", protect, authorize("admin"), getAllUsers);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put("/profile", protect, profileValidation, validate, updateProfile);

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
router.put(
  "/change-password",
  protect,
  changePasswordValidation,
  validate,
  changePassword
);

module.exports = router;
