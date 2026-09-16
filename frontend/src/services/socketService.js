import { io } from "socket.io-client";
import { API_URL } from "./config";
import { getAuthToken } from "./authService";

class SocketService {
  socket = null;
  currentRoom = null;

  emitCurrentRoom() {
    if (this.socket?.connected && this.currentRoom) {
      const { department, semester } = this.currentRoom;
      this.socket.emit("join_room", { department, semester });
    }
  }

  connect() {
    if (!this.socket) {
      this.socket = io(API_URL, {
        auth: (callback) => callback({ token: getAuthToken() }),
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        randomizationFactor: 0.4,
        reconnectionAttempts: Infinity,
      });
      this.socket.on("connect", () => this.emitCurrentRoom());
      this.socket.io.on("reconnect_attempt", () => {
        this.socket.auth = (callback) => callback({ token: getAuthToken() });
      });
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
    return this.socket;
  }
  on(event, callback) {
    this.socket?.on(event, callback);
    return () => this.socket?.off(event, callback);
  }
  joinRoom(department, semester) {
    const nextRoom = `${department}_${semester}`;
    if (this.currentRoom?.id !== nextRoom && this.currentRoom) this.leaveRoom();
    this.currentRoom = { id: nextRoom, department, semester };
    this.emitCurrentRoom();
  }
  leaveRoom() {
    if (this.currentRoom)
      this.socket?.emit("leave_room", { roomId: this.currentRoom.id });
    this.currentRoom = null;
  }
  sendMessage(department, semester, message, replyTo = null) {
    this.socket?.emit("send_message", {
      department,
      semester,
      message,
      replyTo,
    });
  }
  startTyping(userName) {
    if (this.currentRoom)
      this.socket?.emit("typing", { roomId: this.currentRoom.id, userName });
  }
  stopTyping() {
    if (this.currentRoom)
      this.socket?.emit("stop_typing", { roomId: this.currentRoom.id });
  }
  deleteMessage(messageId) {
    if (this.currentRoom)
      this.socket?.emit("delete_message", {
        messageId,
        roomId: this.currentRoom.id,
      });
  }
  disconnect() {
    this.leaveRoom();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}
export default new SocketService();
