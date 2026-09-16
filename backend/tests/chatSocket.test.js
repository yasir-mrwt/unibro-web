const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const setupChatSocket = require("../socket/chatSocket");
const {
  createSocketAuthenticator,
  isValidRoom,
  publicMessage,
} = require("../socket/chatSocket");

process.env.JWT_SECRET = "unit-test-secret-that-is-not-used-outside-tests";

const user = {
  _id: "507f1f77bcf86cd799439011",
  fullName: "Authenticated User",
  email: "authenticated@example.test",
  role: "student",
  isVerified: true,
};

const userModel = {
  findById(id) {
    return {
      select: async () => (id === user._id ? user : null),
    };
  },
  findByIdAndUpdate: async () => ({}),
};

const authenticate = (socket, authenticator) =>
  new Promise((resolve) => authenticator(socket, (error) => resolve(error)));

const createPresenceStore = () => {
  const entries = [];
  return {
    async touch(socketId, roomId, currentUser) {
      const existing = entries.findIndex((item) => item.socketId === socketId);
      const entry = {
        socketId,
        roomId,
        userId: currentUser._id.toString(),
        userName: currentUser.fullName,
      };
      if (existing === -1) entries.push(entry);
      else entries[existing] = entry;
    },
    async remove(socketId) {
      const existing = entries.findIndex((item) => item.socketId === socketId);
      if (existing !== -1) entries.splice(existing, 1);
    },
    async list(roomId) {
      return entries
        .filter((item) => item.roomId === roomId)
        .map(({ userId, userName }) => ({ userId, userName }));
    },
  };
};

test("socket authentication accepts a valid JWT and attaches server-side identity", async () => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  const socket = { handshake: { auth: { token } } };

  const error = await authenticate(socket, createSocketAuthenticator(userModel));

  assert.equal(error, undefined);
  assert.equal(socket.user, user);
});

test("socket authentication rejects invalid and missing tokens", async () => {
  const authenticator = createSocketAuthenticator(userModel);
  const invalid = await authenticate(
    { handshake: { auth: { token: "not-a-jwt" } } },
    authenticator
  );
  const missing = await authenticate({ handshake: { auth: {} } }, authenticator);

  assert.match(invalid.message, /Authentication failed/);
  assert.match(missing.message, /Authentication required/);
});

test("room validation only accepts configured departments and semesters", () => {
  assert.equal(isValidRoom("Computer Science", 1), true);
  assert.equal(isValidRoom("General", 1), false);
  assert.equal(isValidRoom("Computer Science", 9), false);
});

test("messages use authenticated identity and foreign messages cannot be deleted", async () => {
  const handlers = new Map();
  const emitted = [];
  const broadcasts = [];
  let createdData;
  let foreignSaveCalled = false;

  const messageModel = {
    async create(data) {
      createdData = data;
      return {
        ...data,
        _id: "507f191e810c19729de860ea",
        async populate() {},
        toObject() {
          return { ...this };
        },
      };
    },
    async findById() {
      return {
        _id: "507f191e810c19729de860eb",
        roomId: "Computer Science_1",
        userId: { toString: () => "507f1f77bcf86cd799439012" },
        async save() {
          foreignSaveCalled = true;
        },
      };
    },
  };

  const io = {
    use(fn) {
      this.middleware = fn;
    },
    on(event, fn) {
      if (event === "connection") this.connectionHandler = fn;
    },
    to(roomId) {
      return {
        emit(event, payload) {
          broadcasts.push({ roomId, event, payload });
        },
      };
    },
  };

  const socket = {
    user,
    on(event, fn) {
      handlers.set(event, fn);
    },
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    join() {},
    leave() {},
    to() {
      return { emit() {} };
    },
  };

  setupChatSocket(io, {
    UserModel: userModel,
    ChatMessageModel: messageModel,
    presenceStore: createPresenceStore(),
  });
  io.connectionHandler(socket);

  await handlers.get("join_room")({
    department: "Computer Science",
    semester: 1,
    userId: "attacker-controlled-id",
  });
  await handlers.get("send_message")({
    department: "Computer Science",
    semester: 1,
    message: "hello",
    userId: "attacker-controlled-id",
    userName: "Impostor",
    userEmail: "impostor@example.test",
  });

  assert.equal(createdData.userId, user._id);
  assert.equal(createdData.userName, user.fullName);
  assert.equal(createdData.userEmail, undefined);
  const delivered = broadcasts.find((item) => item.event === "receive_message");
  assert.equal(delivered.payload.userEmail, undefined);

  let deleteResult;
  await handlers.get("delete_message")(
    {
      messageId: "507f191e810c19729de860eb",
      roomId: "Computer Science_1",
    },
    (result) => {
      deleteResult = result;
    }
  );

  assert.equal(deleteResult.success, false);
  assert.match(deleteResult.message, /Not authorized/);
  assert.equal(foreignSaveCalled, false);
  assert.ok(emitted.some((item) => item.event === "chat_error"));
});

test("public chat payloads do not expose email addresses", () => {
  const safe = publicMessage({
    message: "hello",
    userEmail: "private@example.test",
    replyTo: { message: "reply", userEmail: "also-private@example.test" },
  });

  assert.equal(safe.userEmail, undefined);
  assert.equal(safe.replyTo.userEmail, undefined);
});
