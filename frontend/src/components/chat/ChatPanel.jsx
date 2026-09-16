import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, MessageCircle, Send, Users, X } from "lucide-react";
import socketService from "../../services/socketService";
import { getRoomMessages, markAsRead } from "../../services/chatService";
import { getStoredUser } from "../../services/authService";
import ChatMessage from "./ChatMessage";
import { LoadingState } from "../ui/States";
import { mergeMessages } from "../../utils/messages";
export default function ChatPanel({ department, semester }) {
  const name = department?.name || department;
  const user = getStoredUser();
  const [status, setStatus] = useState("connecting");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState([]);
  const [typing, setTyping] = useState("");
  const [text, setText] = useState("");
  const [reply, setReply] = useState(null);
  const bottom = useRef(null);
  const timer = useRef(null);
  const typingTimer = useRef(null);
  const connectedOnce = useRef(false);
  const load = useCallback(async ({ preserve = false, busy = true } = {}) => {
    if (busy) setLoading(true);
    setError("");
    try {
      const data = await getRoomMessages(name, semester);
      setMessages((current) =>
        preserve
          ? mergeMessages(data.messages || [], current)
          : data.messages || [],
      );
      await markAsRead(name, semester);
    } catch (error) {
      setError(error.message || "Unable to load messages.");
    } finally {
      if (busy) setLoading(false);
    }
  }, [name, semester]);
  useEffect(() => {
    const socket = socketService.connect();
    const offs = [
      socketService.on("connect", () => {
        setStatus("connected");
        setError("");
        if (connectedOnce.current) load({ preserve: true, busy: false });
        connectedOnce.current = true;
      }),
      socketService.on("disconnect", () => {
        setStatus("reconnecting");
        setActive([]);
      }),
      socketService.on("connect_error", () => setStatus("offline")),
      socketService.on("receive_message", (item) =>
        setMessages((items) => mergeMessages(items, [item])),
      ),
      socketService.on("active_users", (data) => setActive(data.users || [])),
      socketService.on("user_typing", (data) => {
        setTyping(data.userName);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(""), 2600);
      }),
      socketService.on("user_stop_typing", () => setTyping("")),
      socketService.on("message_deleted", (data) =>
        setMessages((items) =>
          items.map((item) =>
            item._id === data.messageId ? data.deletedMessage : item,
          ),
        ),
      ),
      socketService.on("chat_error", (data) =>
        setError(data.message || "Chat action failed."),
      ),
    ];
    socketService.joinRoom(name, semester);
    if (socket.connected) {
      setStatus("connected");
      connectedOnce.current = true;
    }
    load();
    return () => {
      offs.forEach((off) => off());
      socketService.disconnect();
      if (timer.current) clearTimeout(timer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      connectedOnce.current = false;
    };
  }, [name, semester, load]);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [messages],
  );
  const change = (e) => {
    setText(e.target.value);
    if (!user?.isVerified) return;
    socketService.startTyping(user.fullName);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => socketService.stopTyping(), 1000);
  };
  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !user?.isVerified || status !== "connected") return;
    socketService.sendMessage(name, semester, text.trim(), reply?._id);
    setText("");
    setReply(null);
    socketService.stopTyping();
  };
  return (
    <div className="chat card">
      <header className="chat-head">
        <div className="cluster">
          <span className="icon-box">
            <MessageCircle size={20} />
          </span>
          <div>
            <strong>Semester room</strong>
            <div className="resource-meta">
              <span className={`connection-dot ${status}`} />
              <span>{status}</span>
              <span>
                <Users size={13} />
                {active.length} online
              </span>
            </div>
          </div>
        </div>
      </header>
      {error && (
        <div className="notice notice-error" style={{ margin: "12px 14px 0" }}>
          <AlertCircle size={17} />
          {error}
          <button className="btn btn-ghost btn-sm" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      <div className="chat-log" aria-live="polite">
        {loading ? (
          <LoadingState rows={4} />
        ) : messages.length ? (
          messages.map((message) => (
            <ChatMessage
              key={message._id}
              message={message}
              onDelete={(id) => socketService.deleteMessage(id)}
              onReply={setReply}
            />
          ))
        ) : (
          <div className="state">
            <div>
              <MessageCircle size={34} className="muted" />
              <h3>No messages yet</h3>
              <p>Start with a clear question or useful study update.</p>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>
      {typing && <div className="chat-typing">{typing} is typing…</div>}
      {reply && (
        <div className="chat-replying">
          <span>
            Replying to <strong>{reply.userName}</strong>: {reply.message}
          </span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setReply(null)}
            aria-label="Cancel reply"
          >
            <X size={15} />
          </button>
        </div>
      )}
      <form className="chat-compose" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-message">
          Message
        </label>
        <textarea
          id="chat-message"
          className="textarea"
          rows="2"
          maxLength="2000"
          placeholder={
            user?.isVerified
              ? "Write a helpful message…"
              : "Verify your email to send messages"
          }
          value={text}
          onChange={change}
          disabled={!user?.isVerified}
        />
        <button
          className="btn btn-primary btn-icon"
          disabled={!text.trim() || status !== "connected" || !user?.isVerified}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
