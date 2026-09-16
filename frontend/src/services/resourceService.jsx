import { API_URL } from "./config";
import { getAuthToken } from "./authService";

const RESOURCE_API_URL = `${API_URL}/api/resources`;

const authHeaders = (json = true) => ({
  ...(json && { "Content-Type": "application/json" }),
  ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
});

const requireToken = (message) => {
  if (!getAuthToken()) throw new Error(message);
};

const requestJson = async (path, options, fallbackMessage) => {
  const response = await fetch(`${RESOURCE_API_URL}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || fallbackMessage);
  return data;
};

export const uploadResource = (resourceData, file) => {
  requireToken("Please login to upload resources");
  const formData = new FormData();
  Object.entries(resourceData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  formData.append("file", file);
  return requestJson(
    "/upload",
    { method: "POST", headers: authHeaders(false), body: formData },
    "Failed to upload resource",
  );
};

export const getResources = (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return requestJson(
    query ? `?${query}` : "",
    { headers: authHeaders() },
    "Failed to fetch resources",
  );
};

export const getMyResources = () => {
  requireToken("Please login to view your posts");
  return requestJson(
    "/my-posts",
    { headers: authHeaders() },
    "Failed to fetch your resources",
  );
};

export const deleteResource = (resourceId) => {
  requireToken("Please login to delete resources");
  return requestJson(
    `/${encodeURIComponent(resourceId)}`,
    { method: "DELETE", headers: authHeaders() },
    "Failed to delete resource",
  );
};

const incrementCounter = async (resourceId, counter) => {
  try {
    const response = await fetch(
      `${RESOURCE_API_URL}/${encodeURIComponent(resourceId)}/${counter}`,
      { method: "PUT", headers: authHeaders() },
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const incrementDownload = (resourceId) =>
  incrementCounter(resourceId, "download");
export const incrementView = (resourceId) =>
  incrementCounter(resourceId, "view");

export const getPendingResources = () => {
  requireToken("Admin authentication required");
  return requestJson(
    "/pending",
    { headers: authHeaders() },
    "Failed to fetch pending resources",
  );
};

export const approveResource = (resourceId) => {
  requireToken("Admin authentication required");
  return requestJson(
    `/${encodeURIComponent(resourceId)}/approve`,
    { method: "PUT", headers: authHeaders() },
    "Failed to approve resource",
  );
};

export const rejectResource = (resourceId, reason) => {
  requireToken("Admin authentication required");
  return requestJson(
    `/${encodeURIComponent(resourceId)}/reject`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    },
    "Failed to reject resource",
  );
};

export const getAllResourcesAdmin = (status = "all") => {
  requireToken("Admin authentication required");
  return requestJson(
    `/admin/all?status=${encodeURIComponent(status)}`,
    { headers: authHeaders() },
    "Failed to fetch resources",
  );
};
