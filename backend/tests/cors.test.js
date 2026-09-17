const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCorsOptions,
  getAllowedOrigins,
  normalizeOrigin,
} = require("../config/cors");

const authorize = (options, origin) =>
  new Promise((resolve) =>
    options.origin(origin, (error, allowed) => resolve({ error, allowed })),
  );

test("CORS origins are trimmed, deduplicated, and trailing slashes are normalized", () => {
  const origins = getAllowedOrigins({
    NODE_ENV: "production",
    FRONTEND_URL: " https://unibro-frontend-one.vercel.app/ ",
    CORS_ORIGINS:
      "https://preview.example.test/, https://unibro-frontend-one.vercel.app",
  });

  assert.deepEqual([...origins], [
    "https://unibro-frontend-one.vercel.app",
    "https://preview.example.test",
  ]);
  assert.equal(
    normalizeOrigin("https://unibro-frontend-one.vercel.app/path"),
    "https://unibro-frontend-one.vercel.app",
  );
});

test("CORS accepts only configured origins and the non-browser case", async () => {
  const options = createCorsOptions({
    NODE_ENV: "production",
    FRONTEND_URL: "https://unibro-frontend-one.vercel.app/",
  });

  assert.deepEqual(
    await authorize(options, "https://unibro-frontend-one.vercel.app"),
    { error: null, allowed: true },
  );
  assert.deepEqual(await authorize(options, undefined), {
    error: null,
    allowed: true,
  });
  const blocked = await authorize(options, "https://attacker.example");
  assert.equal(blocked.allowed, undefined);
  assert.equal(blocked.error.status, 403);
});
