const requirePublicEnv = (name) => {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required frontend environment variable: ${name}`);
  }

  return value;
};

const normalizeOrigin = (value, name) => {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
};

export const API_URL = normalizeOrigin(
  requirePublicEnv("VITE_API_URL"),
  "VITE_API_URL",
);
