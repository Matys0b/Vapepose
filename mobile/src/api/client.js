import Constants from "expo-constants";
import { storage } from "../lib/storage";

const envUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  Constants?.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  "";

export const BACKEND_URL = (envUrl || "").replace(/\/$/, "");
export const API_BASE = `${BACKEND_URL}/api`;

if (!BACKEND_URL) {
  // Fail-fast: an empty URL would send requests to /api on the device itself
  console.warn("[api] EXPO_PUBLIC_BACKEND_URL is not set; API calls will fail.");
}

class ApiError extends Error {
  constructor(status, message, body) {
    super(message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = "GET", body, auth = true, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await storage.get("auth_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  const ct = res.headers.get("content-type") || "";
  let payload = null;
  if (ct.includes("application/json")) {
    try { payload = await res.json(); } catch { payload = null; }
  } else {
    try { payload = await res.text(); } catch { payload = null; }
  }
  if (!res.ok) {
    const detail = (payload && (payload.detail || payload.message)) || res.statusText;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail), payload);
  }
  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...(opts || {}), method: "GET" }),
  post: (path, body, opts) => request(path, { ...(opts || {}), method: "POST", body }),
  put: (path, body, opts) => request(path, { ...(opts || {}), method: "PUT", body }),
  del: (path, opts) => request(path, { ...(opts || {}), method: "DELETE" }),
};

export { ApiError };
