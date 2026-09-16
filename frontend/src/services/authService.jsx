import { API_URL } from "./config";

const AUTH_API_URL = `${API_URL}/api/auth`;
const USER_CACHE_DURATION = 1000;
let cachedUser = null;
let lastUserCheck = 0;

const fetchJson = async (path, options, fallbackMessage) => {
  const response = await fetch(`${AUTH_API_URL}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || fallbackMessage);
  return data;
};

export const register = async (userData) => {
  const data = await fetchJson(
    "/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    },
    "Registration failed",
  );
  if (data.success && data.token) storeAuthData(data);
  return data;
};

export const login = async (email, password, rememberMe = false) => {
  const data = await fetchJson(
    "/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    },
    "Login failed",
  );
  if (data.success && data.token) storeAuthData(data);
  return data;
};

export const logout = async () => {
  const token = getStoredToken();
  try {
    if (token) {
      await fetch(`${AUTH_API_URL}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Local sign-out still completes when the API is temporarily unavailable.
  } finally {
    clearAuthData();
  }
  return { success: true };
};

export const getCurrentUser = async () => {
  const data = await fetchJson(
    "/me",
    { headers: { Authorization: `Bearer ${getStoredToken()}` } },
    "Not authenticated",
  );
  return data.user;
};

export const loginWithGoogle = () => {
  window.location.href = `${AUTH_API_URL}/google`;
};

export const forgotPassword = (email) =>
  fetchJson(
    "/forgot-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    },
    "Failed to send reset email",
  );

export const resetPassword = (token, newPassword) =>
  fetchJson(
    `/reset-password/${encodeURIComponent(token)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    },
    "Failed to reset password",
  );

export const resendVerificationEmail = () => {
  const token = getStoredToken();
  if (!token) {
    throw new Error("No authentication token found. Please log in again.");
  }
  return fetchJson(
    "/resend-verification",
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    "Failed to resend verification email",
  );
};

export const isAuthenticated = () =>
  Boolean(getStoredUser() && getStoredToken());

export const getStoredUser = () => {
  const now = Date.now();
  if (cachedUser && now - lastUserCheck < USER_CACHE_DURATION)
    return cachedUser;

  try {
    const value = localStorage.getItem("user");
    cachedUser = value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem("user");
    cachedUser = null;
  }
  lastUserCheck = now;
  return cachedUser;
};

export const getStoredToken = () => localStorage.getItem("token");
export const getUsernameFromEmail = (email) =>
  email ? email.split("@")[0] : "User";
export const getAuthToken = getStoredToken;

export const updateStoredUser = (updates) => {
  const currentUser = getStoredUser();
  if (!currentUser) return null;

  const updatedUser = { ...currentUser, ...updates };
  localStorage.setItem("user", JSON.stringify(updatedUser));
  cachedUser = updatedUser;
  lastUserCheck = Date.now();
  window.dispatchEvent(new CustomEvent("userUpdated", { detail: updatedUser }));
  return updatedUser;
};

export const storeAuthData = ({ token, user }) => {
  if (!token || !user) throw new Error("Invalid authentication response");
  const safeUser = { ...user };
  delete safeUser.token;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(safeUser));
  cachedUser = safeUser;
  lastUserCheck = Date.now();
};

export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  cachedUser = null;
  lastUserCheck = 0;
};
