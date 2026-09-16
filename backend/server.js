require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { passport } = require("./config/passport");
const connectDB = require("./config/db");
const { validateEnvironment } = require("./config/env");
const { configureRealtime } = require("./config/realtime");
const setupChatSocket = require("./socket/chatSocket");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const staffRoutes = require("./routes/staffRoutes");
const chatRoutes = require("./routes/chatRoutes");
const app = express();
const server = http.createServer(app);
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...String(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim()),
  ...(process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
      ]),
].filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not allowed by CORS");
    error.status = 403;
    callback(error);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/chat", chatRoutes);
app.get("/api/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res
    .status(databaseConnected ? 200 : 503)
    .json({
      success: databaseConnected,
      message: databaseConnected
        ? "Server and database are healthy"
        : "Database unavailable",
      time: new Date().toISOString(),
    });
});
app.get("/", (_req, res) =>
  res.json({ greeting: "UniBro API", version: "1.0.0" }),
);
const io = new Server(server, {
  cors: corsOptions,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});
app.use((req, res) =>
  res
    .status(404)
    .json({ success: false, message: "Route not found", endpoint: req.path }),
);
app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV === "development") console.error(err);
  let message = "Internal Server Error";
  if (err.type === "entity.parse.failed") message = "Invalid JSON body";
  else if (err.status === 413) message = "Request body is too large";
  else if (err.status && err.status < 500) message = err.message;
  res.status(err.status || 500).json({ success: false, message });
});
let realtimeInitialized = false;
const initializeRealtime = async () => {
  if (realtimeInitialized) return;
  const presenceStore = await configureRealtime(io);
  setupChatSocket(io, { presenceStore });
  realtimeInitialized = true;
};
const start = async () => {
  validateEnvironment();
  await connectDB();
  await initializeRealtime();
  const port = Number(process.env.PORT) || 5001;
  await new Promise((resolve) => server.listen(port, "0.0.0.0", resolve));
  console.log(`Server running on port ${port}`);
  return server;
};
const shutdown = async (signal) => {
  console.log(`${signal} received; shutting down`);
  io.close();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
};
if (require.main === module) {
  start()
    .then(() => {
      for (const signal of ["SIGTERM", "SIGINT"])
        process.once(signal, () =>
          shutdown(signal)
            .then(() => process.exit(0))
            .catch(() => process.exit(1)),
        );
    })
    .catch((error) => {
      console.error(
        process.env.NODE_ENV === "production"
          ? "Server startup failed"
          : `Server startup failed: ${error.message}`,
      );
      process.exit(1);
    });
}
module.exports = {
  app,
  server,
  io,
  start,
  shutdown,
  corsOptions,
  initializeRealtime,
};
