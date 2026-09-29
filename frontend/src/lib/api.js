import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Staff tokens live in sessionStorage → cleared automatically when tab/browser closes,
// forcing a fresh login at each POS opening.
// Customer tokens live in localStorage → mobile app style, stay logged in for weeks.
export const STAFF_TOKEN_KEY = "vapepos_token";
export const CUSTOMER_TOKEN_KEY = "vapepos_customer_token";

export function getStaffToken() {
  return sessionStorage.getItem(STAFF_TOKEN_KEY);
}
export function setStaffToken(token) {
  if (token) sessionStorage.setItem(STAFF_TOKEN_KEY, token);
}
export function clearStaffToken() {
  sessionStorage.removeItem(STAFF_TOKEN_KEY);
  // Also clean any legacy token still living in localStorage
  localStorage.removeItem(STAFF_TOKEN_KEY);
}
export function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}
export function setCustomerToken(token) {
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}
export function clearCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

// Migrate any legacy staff token found in localStorage (v1) into sessionStorage once,
// so the very first load after this change doesn't kick users out mid-shift.
try {
  const legacy = localStorage.getItem(STAFF_TOKEN_KEY);
  if (legacy && !sessionStorage.getItem(STAFF_TOKEN_KEY)) {
    // Do NOT migrate — we explicitly want re-login at each POS opening.
    localStorage.removeItem(STAFF_TOKEN_KEY);
  }
} catch { /* ignore */ }

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.headers.Authorization) return config;
  const url = String(config.url || "");
  const isCustomer = url.startsWith("/customer") || url.startsWith("customer");
  const t = isCustomer ? getCustomerToken() : getStaffToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (d == null) return err?.message || "Erreur inconnue";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(d);
}
