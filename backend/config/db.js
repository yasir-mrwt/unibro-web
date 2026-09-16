const mongoose = require("mongoose");

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10_000,
    })
    .then(() => {
      console.log("MongoDB connected");
      return mongoose.connection;
    })
    .catch((error) => {
      connectionPromise = null;
      throw new Error(`MongoDB connection failed: ${error.message}`);
    });

  try {
    return await connectionPromise;
  } finally {
    if (mongoose.connection.readyState !== 1) connectionPromise = null;
  }
};

module.exports = connectDB;
