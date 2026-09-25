import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.headers.Authorization) return config;
  const url = String(config.url || "");
  const isCustomer = url.startsWith("/customer") || url.startsWith("customer");
  const key = isCustomer ? "vapepos_customer_token" : "vapepos_token";
  const t = localStorage.getItem(key);
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
