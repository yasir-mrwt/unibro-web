const mongoose = require("mongoose");
const { createAdapter } = require("@socket.io/mongo-adapter");

const ADAPTER_COLLECTION = "socket_io_adapter_events";
const PRESENCE_COLLECTION = "socket_io_presence";
const ADAPTER_TTL_SECONDS = 3600;
const PRESENCE_TTL_MS = 60_000;

class MongoPresenceStore {
  constructor(collection, { ttlMs = PRESENCE_TTL_MS } = {}) {
    this.collection = collection;
    this.ttlMs = ttlMs;
  }

  async initialize() {
    await Promise.all([
      this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, background: true },
      ),
      this.collection.createIndex(
        { socketId: 1 },
        { unique: true, background: true },
      ),
      this.collection.createIndex(
        { roomId: 1, expiresAt: 1 },
        { background: true },
      ),
    ]);
  }

  async touch(socketId, roomId, user) {
    const now = new Date();
    await this.collection.updateOne(
      { socketId },
      {
        $set: {
          roomId,
          userId: user._id.toString(),
          userName: user.fullName,
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + this.ttlMs),
        },
      },
      { upsert: true },
    );
  }

  async remove(socketId) {
    await this.collection.deleteOne({ socketId });
  }

  async list(roomId) {
    return this.collection
      .aggregate([
        { $match: { roomId, expiresAt: { $gt: new Date() } } },
        { $sort: { lastSeenAt: -1 } },
        {
          $group: {
            _id: "$userId",
            userName: { $first: "$userName" },
          },
        },
        { $project: { _id: 0, userId: "$_id", userName: 1 } },
        { $sort: { userName: 1 } },
      ])
      .toArray();
  }
}

const configureRealtime = async (io, database = mongoose.connection.db) => {
  if (!database) throw new Error("MongoDB must be connected before realtime setup");

  const adapterCollection = database.collection(ADAPTER_COLLECTION);
  await adapterCollection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: ADAPTER_TTL_SECONDS, background: true },
  );
  io.adapter(
    createAdapter(adapterCollection, {
      addCreatedAtField: true,
    }),
  );

  const presenceStore = new MongoPresenceStore(
    database.collection(PRESENCE_COLLECTION),
  );
  await presenceStore.initialize();
  return presenceStore;
};

module.exports = {
  ADAPTER_COLLECTION,
  PRESENCE_COLLECTION,
  PRESENCE_TTL_MS,
  MongoPresenceStore,
  configureRealtime,
};
