const jwt = require("jsonwebtoken");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/user");
const { DEPARTMENTS } = require("../constants/departments");

const PRESENCE_HEARTBEAT_MS = 20_000;

const exposedError = (message) => Object.assign(new Error(message), { exposed: true });
const clientErrorMessage = (error, fallback) =>
  error.exposed ? error.message : fallback;

const isValidRoom = (department, semester) =>
  DEPARTMENTS.includes(department) && /^[1-8]$/.test(String(semester));

const publicMessage = (message) => {
  const value = message.toObject ? message.toObject() : { ...message };
  delete value.userEmail;
  if (value.replyTo && typeof value.replyTo === "object") {
    delete value.replyTo.userEmail;
  }
  return value;
};

const createSocketAuthenticator = (UserModel = User) => async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id).select(
      "fullName email role isVerified"
    );
    if (!user) return next(new Error("Authentication failed"));

    socket.user = user;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
};

const setupChatSocket = (
  io,
  { UserModel = User, ChatMessageModel = ChatMessage, presenceStore } = {},
) => {
  if (!presenceStore) throw new Error("A shared presence store is required");
  io.use(createSocketAuthenticator(UserModel));

  io.on("connection", (socket) => {
    const authenticatedUserId = socket.user._id.toString();
    let heartbeatTimer;

    const emitPresence = async (roomId) => {
      const users = await presenceStore.list(roomId);
      io.to(roomId).emit("active_users", { count: users.length, users });
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      heartbeatTimer = setInterval(async () => {
        if (!socket.roomId) return;
        try {
          await presenceStore.touch(socket.id, socket.roomId, socket.user);
          await emitPresence(socket.roomId);
        } catch {
          // The next heartbeat or reconnect will retry without crashing a socket.
        }
      }, PRESENCE_HEARTBEAT_MS);
      heartbeatTimer.unref?.();
    };

    const leaveCurrentRoom = async () => {
      if (!socket.roomId) return;
      const roomId = socket.roomId;
      socket.roomId = null;
      stopHeartbeat();
      socket.leave(roomId);
      await presenceStore.remove(socket.id);
      await emitPresence(roomId);
    };

    socket.on("join_room", async ({ department, semester } = {}, callback) => {
      try {
        if (!isValidRoom(department, semester)) {
          throw exposedError("Invalid chat room");
        }

        const roomId = `${department}_${semester}`;
        if (socket.roomId && socket.roomId !== roomId) {
          await leaveCurrentRoom();
        }

        if (socket.roomId !== roomId) {
          socket.join(roomId);
        }

        socket.roomId = roomId;
        await presenceStore.touch(socket.id, roomId, socket.user);
        startHeartbeat();
        await UserModel.findByIdAndUpdate(authenticatedUserId, {
          lastActive: Date.now(),
        });

        await emitPresence(roomId);

        if (typeof callback === "function") callback({ success: true, roomId });
      } catch (error) {
        const message = clientErrorMessage(error, "Failed to join room");
        socket.emit("chat_error", { message });
        if (typeof callback === "function") callback({ success: false, message });
      }
    });

    socket.on("send_message", async (data = {}, callback) => {
      try {
        const { department, semester, message, replyTo } = data;
        const roomId = `${department}_${semester}`;

        if (!socket.user.isVerified) {
          throw exposedError("Verify your email before sending messages");
        }
        if (!isValidRoom(department, semester) || socket.roomId !== roomId) {
          throw exposedError("Join the chat room before sending messages");
        }
        if (typeof message !== "string" || !message.trim()) {
          throw exposedError("Message is required");
        }
        if (message.trim().length > 2000) {
          throw exposedError("Message cannot exceed 2000 characters");
        }
        if (replyTo && !/^[a-f\d]{24}$/i.test(String(replyTo))) {
          throw exposedError("Invalid reply target");
        }

        const newMessage = await ChatMessageModel.create({
          roomId,
          department,
          semester: String(semester),
          message: message.trim(),
          messageType: "text",
          userId: socket.user._id,
          userName: socket.user.fullName,
          replyTo: replyTo || null,
        });

        await newMessage.populate("userId", "fullName");
        if (replyTo) {
          await newMessage.populate({ path: "replyTo", select: "-userEmail" });
        }

        const safeMessage = publicMessage(newMessage);
        io.to(roomId).emit("receive_message", safeMessage);
        if (typeof callback === "function") {
          callback({ success: true, message: safeMessage });
        }
      } catch (error) {
        const message = clientErrorMessage(error, "Failed to send message");
        socket.emit("chat_error", { message });
        if (typeof callback === "function") callback({ success: false, message });
      }
    });

    socket.on("typing", ({ roomId } = {}) => {
      if (roomId === socket.roomId) {
        socket.to(roomId).emit("user_typing", {
          userName: socket.user.fullName,
        });
      }
    });

    socket.on("stop_typing", ({ roomId } = {}) => {
      if (roomId === socket.roomId) socket.to(roomId).emit("user_stop_typing");
    });

    socket.on("delete_message", async ({ messageId, roomId } = {}, callback) => {
      try {
        if (!messageId || roomId !== socket.roomId) {
          throw exposedError("Invalid delete request");
        }

        const message = await ChatMessageModel.findById(messageId);
        if (!message || message.roomId !== roomId) {
          throw exposedError("Message not found");
        }
        if (message.userId.toString() !== authenticatedUserId) {
          throw exposedError("Not authorized to delete this message");
        }

        message.isDeleted = true;
        message.deletedAt = Date.now();
        message.message = "This message was deleted";
        await message.save();

        io.to(roomId).emit("message_deleted", {
          messageId,
          deletedMessage: publicMessage(message),
        });
        if (typeof callback === "function") callback({ success: true });
      } catch (error) {
        const message = clientErrorMessage(error, "Failed to delete message");
        socket.emit("chat_error", { message });
        if (typeof callback === "function") callback({ success: false, message });
      }
    });

    socket.on("leave_room", async ({ roomId } = {}) => {
      if (roomId === socket.roomId) await leaveCurrentRoom();
    });

    socket.on("disconnect", async () => {
      try {
        await leaveCurrentRoom();
      } catch {
        stopHeartbeat();
      }
    });
  });
};

module.exports = setupChatSocket;
module.exports.createSocketAuthenticator = createSocketAuthenticator;
module.exports.isValidRoom = isValidRoom;
module.exports.publicMessage = publicMessage;
module.exports.PRESENCE_HEARTBEAT_MS = PRESENCE_HEARTBEAT_MS;
