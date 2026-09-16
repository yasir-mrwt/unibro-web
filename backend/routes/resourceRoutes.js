const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  resourceUpload,
  handleUploadError,
} = require("../middleware/upload");
const {
  resourceUploadValidation,
  mongoIdValidation,
  resourceQueryValidation,
  resourceCountValidation,
  adminResourceQueryValidation,
  resourceRejectionValidation,
  validate,
} = require("../middleware/validation");
const {
  uploadResource,
  getResources,
  getMyResources,
  deleteResource,
  getPendingResources,
  approveResource,
  rejectResource,
  incrementDownload,
  incrementView,
  getAllResourcesAdmin,
  getResourceCounts,
} = require("../controllers/resourceController");

// Public routes
router.get("/", resourceQueryValidation, validate, getResources); // Get all approved resources
router.get("/counts", resourceCountValidation, validate, getResourceCounts); // Get resource counts for dashboard
router.put("/:id/download", mongoIdValidation(), validate, incrementDownload);
router.put("/:id/view", mongoIdValidation(), validate, incrementView);

// User routes (protected)
router.post(
  "/upload",
  protect,
  resourceUpload.single("file"),
  handleUploadError,
  resourceUploadValidation,
  validate,
  uploadResource
); // Upload new resource
router.get("/my-posts", protect, getMyResources); // Get user's resources
router.delete("/:id", protect, mongoIdValidation(), validate, deleteResource);

// Admin routes
router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  adminResourceQueryValidation,
  validate,
  getAllResourcesAdmin
); // All resources
router.get("/pending", protect, authorize("admin"), getPendingResources); // Pending approval
router.put(
  "/:id/approve",
  protect,
  authorize("admin"),
  mongoIdValidation(),
  validate,
  approveResource
);
router.put(
  "/:id/reject",
  protect,
  authorize("admin"),
  mongoIdValidation(),
  resourceRejectionValidation,
  validate,
  rejectResource
);

module.exports = router;
