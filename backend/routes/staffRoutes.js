const express = require("express");
const router = express.Router();
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDepartments,
} = require("../controllers/staffController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { staffImageUpload, handleUploadError } = require("../middleware/upload");
const {
  staffValidation,
  staffQueryValidation,
  mongoIdValidation,
  validate,
} = require("../middleware/validation");

// Public routes
router.get("/", staffQueryValidation, validate, getAllStaff);
router.get("/departments", getDepartments);
router.get("/:id", mongoIdValidation(), validate, getStaffById);

// Admin only routes
router.post(
  "/",
  protect,
  authorize("admin"),
  staffImageUpload.single("image"),
  handleUploadError,
  staffValidation,
  validate,
  createStaff
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  staffImageUpload.single("image"),
  handleUploadError,
  staffValidation,
  validate,
  updateStaff
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  mongoIdValidation(),
  validate,
  deleteStaff
);

module.exports = router;
