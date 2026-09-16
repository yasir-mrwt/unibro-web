const { rateLimit } = require("express-rate-limit");

const createLimiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ success: false, message }),
  });

const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again later."
);
const registrationLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later."
);
const emailLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  "Too many email requests. Please try again later."
);
const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  "Too many password reset attempts. Please try again later."
);

module.exports = {
  loginLimiter,
  registrationLimiter,
  emailLimiter,
  passwordResetLimiter,
};

