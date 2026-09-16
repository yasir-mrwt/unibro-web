require("dotenv").config();
const dns = require("node:dns/promises");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const {
  getSupabase,
  uploadResourceFile,
  deleteFileFromSupabase,
} = require("../config/supabaseConfig");

const results = [];
const record = (name, success, detail) => {
  results.push({ name, success, detail });
  console.log(`${success ? "PASS" : "FAIL"} ${name}: ${detail}`);
};

const requireValues = (names) => {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`);
};

const checkMongo = async () => {
  requireValues(["MONGO_URI"]);
  const host = new URL(process.env.MONGO_URI.replace("mongodb+srv:", "https:"))
    .hostname;
  await dns.resolve(host);
  const client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    record("MongoDB", true, "DNS, authentication, and ping succeeded");
  } finally {
    await client.close();
  }
};

const checkSupabase = async () => {
  requireValues(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const client = getSupabase();
  const bucket = process.env.SUPABASE_BUCKET || "unibro-files";
  await dns.resolve(new URL(process.env.SUPABASE_URL).hostname);

  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  if (bucketError) throw new Error("Storage authentication failed");
  if (!buckets.some((item) => item.name === bucket)) {
    throw new Error("Configured bucket was not found");
  }

  const { data: existing, error: listError } = await client.storage
    .from(bucket)
    .list("resources", { limit: 1, sortBy: { column: "created_at", order: "desc" } });
  if (listError) throw new Error("Existing object listing failed");
  if (existing[0]?.name) {
    const { error: existingReadError } = await client.storage
      .from(bucket)
      .download(`resources/${existing[0].name}`);
    if (existingReadError) throw new Error("Existing object read failed");
  }

  const marker = `unibro-disposable-${crypto.randomUUID()}`;
  let storagePath;
  try {
    const uploaded = await uploadResourceFile(
      Buffer.from(marker),
      "connectivity-check.txt",
      "text/plain",
    );
    storagePath = uploaded.storagePath;

    const { data: downloaded, error: downloadError } = await client.storage
      .from(bucket)
      .download(storagePath);
    if (downloadError || (await downloaded.text()) !== marker) {
      throw new Error("Disposable object download failed");
    }

    const publicResponse = await fetch(uploaded.fileUrl);
    if (!publicResponse.ok || (await publicResponse.text()) !== marker) {
      throw new Error("Disposable public read failed");
    }
  } finally {
    if (storagePath) {
      const removed = await deleteFileFromSupabase(storagePath);
      if (!removed.success) throw new Error("Disposable object cleanup failed");
    }
  }

  record(
    "Supabase",
    true,
    `DNS, service authentication, bucket, read, upload, download, and cleanup succeeded${
      existing[0]?.name ? "; an existing object was read" : ""
    }`,
  );
};

const checkMailjet = async () => {
  requireValues([
    "MAILJET_API_KEY",
    "MAILJET_SECRET_KEY",
    "MAILJET_SENDER_EMAIL",
  ]);
  const credentials = Buffer.from(
    `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`,
  ).toString("base64");
  const response = await fetch("https://api.mailjet.com/v3/REST/sender?Limit=100", {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!response.ok) throw new Error("Mailjet authentication failed");
  const body = await response.json();
  const sender = body.Data?.find(
    (item) => item.Email?.toLowerCase() === process.env.MAILJET_SENDER_EMAIL.toLowerCase(),
  );
  record(
    "Mailjet",
    Boolean(sender && sender.Status === "Active"),
    sender && sender.Status === "Active"
      ? "API authentication and active sender verification succeeded"
      : "API authentication succeeded, but the configured sender is not active",
  );
};

const checkLocalSecurityConfiguration = async () => {
  requireValues([
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
  ]);
  if (process.env.JWT_SECRET.length < 32) throw new Error("JWT secret is too short");
  const token = jwt.sign({ purpose: "configuration-check" }, process.env.JWT_SECRET, {
    expiresIn: "1m",
  });
  if (jwt.verify(token, process.env.JWT_SECRET).purpose !== "configuration-check") {
    throw new Error("JWT verification failed");
  }
  const callback = new URL(process.env.GOOGLE_CALLBACK_URL);
  if (!["http:", "https:"].includes(callback.protocol)) {
    throw new Error("Google callback URL is invalid");
  }
  record("JWT", true, "secret strength and sign/verify succeeded");
  record("Google OAuth", true, "credentials and absolute callback URL are configured");
};

const run = async () => {
  const checks = [
    ["MongoDB", checkMongo],
    ["Supabase", checkSupabase],
    ["Mailjet", checkMailjet],
    ["JWT / Google OAuth", checkLocalSecurityConfiguration],
  ];
  for (const [name, check] of checks) {
    try {
      await check();
    } catch {
      record(name, false, "verification failed; inspect provider configuration and access rules");
    }
  }
  if (results.some((result) => !result.success)) process.exitCode = 1;
};

run();
