import { API_URL } from "./config";
import { getAuthToken } from "./authService";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Chat request failed");
  return data;
};
export const getRoomMessages = (department, semester, limit = 50) =>
  request(
    `/api/chat/messages/${encodeURIComponent(department)}/${semester}?limit=${limit}`,
  );
export const sendMessage = (department, semester, message, replyTo = null) =>
  request("/api/chat/messages", {
    method: "POST",
    body: JSON.stringify({ department, semester, message, replyTo }),
  });
export const deleteMessage = (messageId) =>
  request(`/api/chat/messages/${messageId}`, { method: "DELETE" });
export const getUnreadCount = async (department, semester) => {
  try {
    return await request(
      `/api/chat/unread/${encodeURIComponent(department)}/${semester}`,
    );
  } catch {
    return { unreadCount: 0 };
  }
};
export const markAsRead = (department, semester) =>
  request(`/api/chat/read/${encodeURIComponent(department)}/${semester}`, {
    method: "PUT",
  });
