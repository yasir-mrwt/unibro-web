const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret-that-is-not-used-elsewhere";
process.env.JWT_EXPIRE = "1h";
process.env.FRONTEND_URL = "http://localhost:5173";

const removedStoragePaths = [];
const mockModule = (relativePath, exports) => {
  const filename = require.resolve(path.join(__dirname, "..", relativePath));
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

mockModule("config/email.js", {
  sendEmail: async () => {
    throw new Error("simulated provider outage");
  },
});
mockModule("config/supabaseConfig.js", {
  uploadResourceFile: async (_buffer, fileName) => ({
    fileUrl: `https://storage.example.test/resources/${fileName}`,
    storagePath: `resources/${fileName}`,
  }),
  deleteFileFromSupabase: async (storagePath) => {
    removedStoragePaths.push(storagePath);
    return { success: true };
  },
  uploadStaffImage: async () => ({ success: false, error: "not used" }),
  deleteStaffImage: async () => ({ success: true }),
  extractStaffImagePath: () => null,
});

const { server } = require("../server");
const User = require("../models/user");

let mongo;
let baseUrl;
let admin;
let student;
let adminToken;
let studentToken;

const jsonRequest = async (route, options = {}) => {
  const response = await fetch(`${baseUrl}${route}`, options);
  const data = await response.json();
  return { response, data };
};

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  admin = await User.create({
    fullName: "Test Admin",
    email: "admin@integration.test",
    password: "Valid!Pass123",
    role: "admin",
    isVerified: true,
  });
  student = await User.create({
    fullName: "Test Student",
    email: "student@integration.test",
    password: "Valid!Pass123",
    isVerified: true,
  });
  adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  studentToken = jwt.sign({ id: student._id }, process.env.JWT_SECRET);
});

test.after(async () => {
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("health, CORS, bearer auth, validation, and profile flow work", async () => {
  const health = await jsonRequest("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.data.success, true);

  const allowedCors = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(
    allowedCors.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );

  const blockedCors = await jsonRequest("/api/health", {
    headers: { Origin: "https://untrusted.example.test" },
  });
  assert.equal(blockedCors.response.status, 403);

  const unauthenticated = await jsonRequest("/api/auth/me");
  assert.equal(unauthenticated.response.status, 401);

  const authenticated = await jsonRequest("/api/auth/me", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(authenticated.response.status, 200);
  assert.equal(authenticated.data.user.email, student.email);

  const invalidProfile = await jsonRequest("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ fullName: "x" }),
  });
  assert.equal(invalidProfile.response.status, 400);

  const updatedProfile = await jsonRequest("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ fullName: "Updated Student" }),
  });
  assert.equal(updatedProfile.response.status, 200);

  const stillAuthenticated = await jsonRequest("/api/auth/me", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(stillAuthenticated.data.user.fullName, "Updated Student");
});

test("email failures are reported truthfully without rolling back registration", async () => {
  const registration = await jsonRequest("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Email Failure Test",
      email: "email-failure@integration.test",
      password: "Valid!Pass123",
    }),
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.emailSent, false);
  assert.equal(registration.data.user.token, undefined);
  assert.ok(registration.data.token);

  const forgot = await jsonRequest("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "email-failure@integration.test" }),
  });
  assert.equal(forgot.response.status, 503);
  assert.match(forgot.data.message, /temporarily unavailable/i);
});

test("staff create, edit, list, filter, and delete work with one department list", async () => {
  const createForm = new FormData();
  Object.entries({
    name: "Integration Lecturer",
    email: "lecturer@integration.test",
    department: "Computer Science",
    qualification: "MS Computer Science",
    office: "Room 101",
    counsellingHours: "Monday 10:00-12:00",
    courses: JSON.stringify(["Algorithms"]),
    specialization: JSON.stringify(["Systems"]),
    yearsOfExperience: "5",
  }).forEach(([key, value]) => createForm.append(key, value));

  const created = await jsonRequest("/api/staff", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: createForm,
  });
  assert.equal(created.response.status, 201);
  const staffId = created.data.data._id;

  const listed = await jsonRequest(
    "/api/staff?department=Computer%20Science&search=Integration&limit=10"
  );
  assert.equal(listed.response.status, 200);
  assert.equal(listed.data.data.length, 1);

  const updateForm = new FormData();
  Object.entries({
    name: "Updated Lecturer",
    email: "lecturer@integration.test",
    department: "Computer Science",
    qualification: "PhD Computer Science",
    office: "Room 102",
    counsellingHours: "Tuesday 10:00-12:00",
    courses: JSON.stringify(["Algorithms", "Databases"]),
    specialization: JSON.stringify(["Systems"]),
    yearsOfExperience: "6",
  }).forEach(([key, value]) => updateForm.append(key, value));

  const updated = await jsonRequest(`/api/staff/${staffId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: updateForm,
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.data.name, "Updated Lecturer");

  const deleted = await jsonRequest(`/api/staff/${staffId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(deleted.response.status, 200);
});

test("resource upload persists storage path and authorized deletion cleans storage", async () => {
  const form = new FormData();
  Object.entries({
    courseName: "Integration Testing",
    title: "Upload Flow",
    description: "A resource used to verify the complete upload flow.",
    resourceType: "Notes",
    department: "Computer Science",
    semester: "1",
    section: "A",
    batch: "2024",
    year: String(new Date().getFullYear()),
    pages: "1",
  }).forEach(([key, value]) => form.append(key, value));
  form.append("file", new Blob(["integration file"], { type: "text/plain" }), "flow.txt");

  const uploaded = await jsonRequest("/api/resources/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
    body: form,
  });
  assert.equal(uploaded.response.status, 201);
  assert.equal(uploaded.data.resource.status, "pending");
  assert.equal(uploaded.data.resource.storagePath, "resources/flow.txt");
  assert.equal(uploaded.data.notificationsSent, 0);

  const resourceId = uploaded.data.resource._id;
  const foreignDelete = await jsonRequest(`/api/resources/${resourceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${jwt.sign(
        { id: (await User.create({
          fullName: "Other User",
          email: "other@integration.test",
          password: "Valid!Pass123",
          isVerified: true,
        }))._id },
        process.env.JWT_SECRET
      )}`,
    },
  });
  assert.equal(foreignDelete.response.status, 403);

  const deleted = await jsonRequest(`/api/resources/${resourceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(deleted.response.status, 200);
  assert.ok(removedStoragePaths.includes("resources/flow.txt"));
});

test("chat REST uses bearer identity, hides emails, and enforces ownership", async () => {
  const sent = await jsonRequest("/api/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      department: "Computer Science",
      semester: 1,
      message: "Integration message",
      userId: admin._id,
      userName: "Impostor",
    }),
  });
  assert.equal(sent.response.status, 201);
  assert.equal(String(sent.data.message.userId._id), String(student._id));
  assert.equal(sent.data.message.userEmail, undefined);

  const listed = await jsonRequest(
    "/api/chat/messages/Computer%20Science/1?limit=10",
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );
  assert.equal(listed.response.status, 200);
  assert.equal(listed.data.messages[0].userEmail, undefined);

  const unauthorizedDelete = await jsonRequest(
    `/api/chat/messages/${sent.data.message._id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } }
  );
  assert.equal(unauthorizedDelete.response.status, 403);

  const ownerDelete = await jsonRequest(
    `/api/chat/messages/${sent.data.message._id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${studentToken}` } }
  );
  assert.equal(ownerDelete.response.status, 200);
});

test("login rate limiting activates on excessive requests", async () => {
  let lastResponse;
  for (let index = 0; index < 11; index += 1) {
    lastResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email", password: "bad" }),
    });
  }
  assert.equal(lastResponse.status, 429);
});
