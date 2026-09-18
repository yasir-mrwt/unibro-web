const BASE_REQUIRED_ENV = [
  "FRONTEND_URL",
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRE",
];
const PRODUCTION_REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "RESEND_API_KEY",
  "MAIL_FROM",
  "MAIL_FROM_NAME",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
];
const validateEnvironment = () => {
  const required =
    process.env.NODE_ENV === "production"
      ? [...BASE_REQUIRED_ENV, ...PRODUCTION_REQUIRED_ENV]
      : BASE_REQUIRED_ENV;
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length)
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  const urlVariables = [
    ["FRONTEND_URL", process.env.FRONTEND_URL],
    ["SUPABASE_URL", process.env.SUPABASE_URL],
    ["GOOGLE_CALLBACK_URL", process.env.GOOGLE_CALLBACK_URL],
    ...["CORS_ORIGINS", "FRONTEND_URLS"].flatMap((variable) =>
      String(process.env[variable] || "")
        .split(",")
        .map((value, index) => [`${variable}[${index}]`, value.trim()])
        .filter(([, value]) => value),
    ),
  ];
  for (const [name, value] of urlVariables) {
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      throw new Error(`${name} must be a valid HTTP(S) URL`);
    }
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.JWT_SECRET.length < 32
  )
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  if (process.env.MAIL_FROM) {
    const formattedAddress = process.env.MAIL_FROM.trim().match(/<([^<>]+)>$/);
    const senderEmail = (formattedAddress?.[1] || process.env.MAIL_FROM).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      throw new Error("MAIL_FROM must contain a valid email address");
    }
  }
};
module.exports = { validateEnvironment };
