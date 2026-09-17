const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const normalizeOrigin = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const getAllowedOrigins = (environment = process.env) =>
  new Set(
    [
      normalizeOrigin(environment.FRONTEND_URL),
      ...splitOrigins(environment.CORS_ORIGINS),
      ...splitOrigins(environment.FRONTEND_URLS),
      ...(environment.NODE_ENV === "production" ? [] : LOCAL_ORIGINS),
    ].filter(Boolean),
  );

const createCorsOptions = (environment = process.env) => {
  const allowedOrigins = getAllowedOrigins(environment);
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (normalized && allowedOrigins.has(normalized)) return callback(null, true);
      const error = new Error("Origin is not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
};

module.exports = { createCorsOptions, getAllowedOrigins, normalizeOrigin };
