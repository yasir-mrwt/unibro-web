const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "email-flow-test-secret-that-is-not-used-elsewhere";
process.env.JWT_EXPIRE = "1h";
process.env.FRONTEND_URL = "http://localhost:5173";

const sentEmails = [];
const emailPath = require.resolve(path.join(__dirname, "..", "config/email.js"));
require.cache[emailPath] = {
  id: emailPath,
  filename: emailPath,
  loaded: true,
  exports: {
    sendEmail: async (options) => {
      sentEmails.push(options);
      return { success: true, messageId: `test-${sentEmails.length}` };
    },
  },
};

const { server } = require("../server");
const User = require("../models/user");

let mongo;
let baseUrl;

const jsonRequest = async (route, options = {}) => {
  const response = await fetch(`${baseUrl}${route}`, options);
  return { response, data: await response.json() };
};

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("registration verification and forgot-password preserve their email flows", async () => {
  const email = "resend-flow@integration.test";
  const registration = await jsonRequest("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Resend Flow",
      email,
      password: "Valid!Pass123",
    }),
  });

  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.emailSent, true);
  assert.equal(sentEmails[0].email, email);
  assert.equal(sentEmails[0].subject, "Verify Your Email - Unibro");
  assert.match(sentEmails[0].html, /\/verify-email\/[a-f0-9]+/);

  const forgot = await jsonRequest("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  assert.equal(forgot.response.status, 202);
  assert.equal(forgot.data.success, true);
  assert.equal(sentEmails[1].email, email);
  assert.equal(sentEmails[1].subject, "Password Reset Request - Unibro");
  assert.match(sentEmails[1].html, /\/reset-password\/[a-f0-9]+/);

  const user = await User.findOne({ email }).select(
    "+verificationToken +verificationTokenExpire +resetPasswordToken +resetPasswordExpire",
  );
  assert.ok(user.verificationToken);
  assert.ok(user.verificationTokenExpire > new Date());
  assert.ok(user.resetPasswordToken);
  assert.ok(user.resetPasswordExpire > new Date());
});
