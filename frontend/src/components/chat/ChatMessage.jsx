import React from "react";
import { Reply, Trash2 } from "lucide-react";
import { getStoredUser } from "../../services/authService";
const getId = (value) => (typeof value === "object" ? value?._id : value);
const time = (value) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
function ChatMessage({ message, onDelete, onReply }) {
  const user = getStoredUser();
  const own = getId(message.userId) === (user?._id || user?.id);
  return (
    <article className={`chat-message${own ? " own" : ""}`}>
      <div className="chat-message-head">
        <strong>{own ? "You" : message.userName}</strong>
        <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
      </div>
      {message.replyTo && (
        <div className="chat-reply">
          <Reply size={13} />
          <span>
            {message.replyTo.userName}: {message.replyTo.message}
          </span>
        </div>
      )}
      <p className={message.isDeleted ? "muted" : ""}>{message.message}</p>
      {!message.isDeleted && user?.isVerified && (
        <div className="chat-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onReply(message)}
          >
            <Reply size={14} /> Reply
          </button>
          {own && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(message._id)}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}
export default React.memo(ChatMessage);
