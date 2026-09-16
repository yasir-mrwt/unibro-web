const multer = require("multer");
const path = require("path");

const RESOURCE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
]);

const STAFF_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const RESOURCE_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".zip",
  ".rar",
  ".7z",
]);
const STAFF_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const createUpload = ({ maxSize, allowedTypes, allowedExtensions }) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (
        !allowedTypes.has(file.mimetype) ||
        !allowedExtensions.has(extension)
      ) {
        return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
      }
      callback(null, true);
    },
  });

const resourceUpload = createUpload({
  maxSize: 50 * 1024 * 1024,
  allowedTypes: RESOURCE_MIME_TYPES,
  allowedExtensions: RESOURCE_EXTENSIONS,
});

const staffImageUpload = createUpload({
  maxSize: 5 * 1024 * 1024,
  allowedTypes: STAFF_IMAGE_MIME_TYPES,
  allowedExtensions: STAFF_IMAGE_EXTENSIONS,
});

const handleUploadError = (error, _req, res, next) => {
  if (!(error instanceof multer.MulterError)) return next(error);

  const message =
    error.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file exceeds the allowed size"
      : "Uploaded file type or field is not allowed";

  return res.status(400).json({ success: false, message });
};

module.exports = {
  resourceUpload,
  staffImageUpload,
  handleUploadError,
  RESOURCE_MIME_TYPES,
  STAFF_IMAGE_MIME_TYPES,
};
