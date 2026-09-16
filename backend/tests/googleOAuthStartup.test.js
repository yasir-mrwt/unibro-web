const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("missing Google OAuth configuration does not crash API initialization", () => {
  const backendDirectory = path.join(__dirname, "..");
  const result = spawnSync(
    process.execPath,
    ["-e", "require('./server'); process.stdout.write('initialized')"],
    {
      cwd: backendDirectory,
      env: {
        ...process.env,
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        GOOGLE_CALLBACK_URL: "",
      },
      encoding: "utf8",
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /initialized/);
});
