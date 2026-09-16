const { body, param, query, validationResult } = require("express-validator");
const { DEPARTMENTS } = require("../constants/departments");

const RESOURCE_TYPES = [
  "Assignments",
  "Quizzes",
  "Projects",
  "Presentations",
  "Notes",
  "Past Papers",
];

const emailRule = () =>
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail();

const strongPasswordRule = (field = "password") =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/\d/)
    .withMessage("Password must contain a number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain a special character");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }
  next();
};

const registerValidation = [
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  emailRule(),
  strongPasswordRule(),
];

const loginValidation = [emailRule(), body("password").isString().notEmpty()];
const forgotPasswordValidation = [emailRule()];
const resetPasswordValidation = [strongPasswordRule()];
const tokenValidation = [
  param("token")
    .isHexadecimal()
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid token"),
];

const profileValidation = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  body("email").optional().trim().isEmail().normalizeEmail(),
  body().custom((value) => {
    if (!value.fullName && !value.email) throw new Error("No profile changes provided");
    return true;
  }),
];

const changePasswordValidation = [
  body("currentPassword").isString().notEmpty(),
  strongPasswordRule("newPassword"),
];

const resourceUploadValidation = [
  body("courseName").trim().isLength({ min: 2, max: 150 }),
  body("title").trim().isLength({ min: 2, max: 200 }),
  body("description").trim().isLength({ min: 10, max: 3000 }),
  body("resourceType").isIn(RESOURCE_TYPES),
  body("department").isIn(DEPARTMENTS),
  body("semester").isInt({ min: 1, max: 8 }).toInt(),
  body("section").trim().isLength({ min: 1, max: 30 }),
  body("batch").trim().isLength({ min: 1, max: 30 }),
  body("year")
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .toInt(),
  body("pages").optional({ values: "falsy" }).isInt({ min: 0, max: 100000 }).toInt(),
  body("thumbnailUrl")
    .optional({ values: "falsy" })
    .isURL({ protocols: ["http", "https"], require_protocol: true }),
];

const jsonStringArray = (field, maxItems) =>
  body(field)
    .optional({ values: "falsy" })
    .custom((value) => {
      const parsed = Array.isArray(value) ? value : JSON.parse(value);
      if (!Array.isArray(parsed) || parsed.length > maxItems) return false;
      return parsed.every(
        (item) => typeof item === "string" && item.trim().length <= 150
      );
    })
    .withMessage(`${field} must be a valid string list`);

const staffValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }),
  emailRule(),
  body("department").isIn(DEPARTMENTS),
  body("qualification").trim().isLength({ min: 2, max: 200 }),
  body("office").trim().isLength({ min: 1, max: 100 }),
  body("counsellingHours").trim().isLength({ min: 1, max: 150 }),
  body("phoneNumber").optional({ values: "falsy" }).trim().isLength({ max: 30 }),
  body("bio").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
  body("yearsOfExperience")
    .optional({ values: "falsy" })
    .isInt({ min: 0, max: 80 }),
  jsonStringArray("courses", 30),
  jsonStringArray("specialization", 30),
];

const chatMessageValidation = [
  body("department").isIn(DEPARTMENTS),
  body("semester").isInt({ min: 1, max: 8 }).toInt(),
  body("message").trim().isLength({ min: 1, max: 2000 }),
  body("replyTo").optional({ values: "falsy" }).isMongoId(),
];

const chatRoomValidation = [
  param("department").customSanitizer(decodeURIComponent).isIn(DEPARTMENTS),
  param("semester").isInt({ min: 1, max: 8 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("before").optional().isISO8601().toDate(),
];

const mongoIdValidation = (field = "id") => [param(field).isMongoId()];

const staffQueryValidation = [
  query("page").optional().isInt({ min: 1, max: 100000 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
  query("search").optional().trim().isLength({ max: 100 }),
  query("department").optional({ values: "falsy" }).isIn(DEPARTMENTS),
  query("sortBy").optional().isIn(["name", "department", "createdAt"]),
];

const resourceQueryValidation = [
  query("search").optional().trim().isLength({ max: 100 }),
  query("year")
    .optional()
    .custom((value) => value === "All" || /^\d{4}$/.test(String(value))),
  query("resourceType")
    .optional()
    .custom((value) => value === "All" || RESOURCE_TYPES.includes(value)),
  query("department")
    .optional()
    .custom((value) => value === "All" || DEPARTMENTS.includes(value)),
  query("semester")
    .optional()
    .custom((value) => value === "All" || /^[1-8]$/.test(String(value))),
  query("section").optional().trim().isLength({ max: 30 }),
  query("batch").optional().trim().isLength({ max: 30 }),
];

const resourceCountValidation = [
  query("department").isIn(DEPARTMENTS),
  query("semester").isInt({ min: 1, max: 8 }).toInt(),
];

const adminResourceQueryValidation = [
  query("status").optional().isIn(["all", "pending", "approved", "rejected"]),
];

const resourceRejectionValidation = [
  body("reason").trim().isLength({ min: 3, max: 1000 }),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  tokenValidation,
  profileValidation,
  changePasswordValidation,
  resourceUploadValidation,
  staffValidation,
  chatMessageValidation,
  chatRoomValidation,
  mongoIdValidation,
  staffQueryValidation,
  resourceQueryValidation,
  resourceCountValidation,
  adminResourceQueryValidation,
  resourceRejectionValidation,
};
