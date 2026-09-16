const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { Server } = require("socket.io");
const { io: createClient } = require("socket.io-client");
const { configureRealtime } = require("../config/realtime");
const setupChatSocket = require("../socket/chatSocket");

process.env.JWT_SECRET = "cluster-test-secret-that-is-not-used-elsewhere";

const testUser = {
  _id: "507f1f77bcf86cd799439011",
  fullName: "Cluster Test User",
  email: "cluster@example.test",
  role: "student",
  isVerified: true,
};

const userModel = {
  findById(id) {
    return { select: async () => (String(id) === testUser._id ? testUser : null) };
  },
  findByIdAndUpdate: async () => ({}),
};

const messageModel = {
  async create(data) {
    return {
      ...data,
      _id: "507f191e810c19729de860ea",
      async populate() {},
      toObject() {
        return { ...data, _id: this._id };
      },
    };
  },
};

const waitForEvent = (emitter, event, timeoutMs = 10_000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      timeoutMs,
    );
    emitter.once(event, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });

const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );

const closeIo = (io) =>
  new Promise((resolve) => io.close(() => resolve()));

test("two Socket.IO instances exchange authenticated room events through MongoDB", async () => {
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const mongoClient = new MongoClient(replicaSet.getUri());
  const httpServers = [http.createServer(), http.createServer()];
  const ioServers = httpServers.map(
    (server) =>
      new Server(server, {
        transports: ["websocket"],
        connectionStateRecovery: {
          maxDisconnectionDuration: 60_000,
          skipMiddlewares: false,
        },
      }),
  );
  const clients = [];

  try {
    await mongoClient.connect();
    const database = mongoClient.db("unibro_socket_cluster_test");

    for (const io of ioServers) {
      const presenceStore = await configureRealtime(io, database);
      setupChatSocket(io, {
        UserModel: userModel,
        ChatMessageModel: messageModel,
        presenceStore,
      });
    }

    const ports = await Promise.all(httpServers.map(listen));
    const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET);
    for (const port of ports) {
      clients.push(
        createClient(`http://127.0.0.1:${port}`, {
          auth: { token },
          transports: ["websocket"],
          forceNew: true,
        }),
      );
    }
    await Promise.all(clients.map((client) => waitForEvent(client, "connect")));

    await Promise.all(
      clients.map(
        (client) =>
          new Promise((resolve, reject) => {
            client.emit(
              "join_room",
              { department: "Computer Science", semester: 1 },
              (result) =>
                result.success
                  ? resolve()
                  : reject(new Error(result.message || "Room join failed")),
            );
          }),
      ),
    );

    const receivedMessage = waitForEvent(clients[1], "receive_message");
    clients[0].emit("send_message", {
      department: "Computer Science",
      semester: 1,
      message: "cross-instance message",
    });

    const message = await receivedMessage;
    assert.equal(message.message, "cross-instance message");
    assert.equal(String(message.userId), testUser._id);

    const typing = waitForEvent(clients[1], "user_typing");
    clients[0].emit("typing", { roomId: "Computer Science_1" });
    assert.equal((await typing).userName, testUser.fullName);
  } finally {
    clients.forEach((client) => client.close());
    await Promise.all(ioServers.map(closeIo));
    await mongoClient.close();
    await replicaSet.stop();
  }
});
