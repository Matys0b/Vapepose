import { api } from "./client";

// --- Auth ---
export const universalLogin = (email, password) =>
  api.post("/auth/universal-login", { email, password }, { auth: false });

export const customerRegister = (payload) =>
  api.post("/customer/register", payload, { auth: false });

export const logoutStaff = () => api.post("/auth/logout", {});
export const logoutCustomer = () => api.post("/customer/logout", {});

export const me = () => api.get("/auth/me");
export const switchStore = (store_id) => api.post("/auth/switch-store", { store_id });

// --- Stores ---
export const storesPublic = () => api.get("/stores/public", { auth: false });
export const storesPublicFull = () => api.get("/stores/public-full", { auth: false });
export const stores = () => api.get("/stores");

// --- Categories ---
export const categoryTree = () => api.get("/categories/tree");
export const listCategories = (parent_id) => {
  const p = parent_id === null ? "root" : parent_id;
  return api.get(`/categories${p ? `?parent_id=${encodeURIComponent(p)}` : ""}`);
};

// --- Products ---
export const listProducts = ({ q, category_id, favorite, limit = 60, offset = 0, store_id } = {}) => {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (category_id) qs.set("category_id", category_id);
  if (favorite != null) qs.set("favorite", String(favorite));
  if (store_id) qs.set("store_id", store_id);
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  return api.get(`/products?${qs.toString()}`);
};
export const lookupBarcode = (code) =>
  api.get(`/products/lookup?code=${encodeURIComponent(code)}`);

// --- Customer self ---
export const customerMe = () => api.get("/customer/me");
export const customerYearRecap = (year) => api.get(`/customer/year-recap${year ? `?year=${year}` : ""}`);
export const customerQRRefresh = () => api.post("/customer/qr-refresh", {});
export const customerProfile = (payload) => api.put("/customer/profile", payload);
export const customerDeleteAccount = () => api.del("/customer/account");
export const customerStats = () => api.get("/customer/stats");
export const customerRewards = () => api.get("/customer/rewards");
export const customerFavorites = () => api.get("/customer/favorites");
export const addFavorite = (product_id) => api.post("/customer/favorites", { product_id });
export const removeFavorite = (pid) => api.del(`/customer/favorites/${pid}`);

// --- Customer messaging ---
export const customerConversation = () => api.get("/customer/conversation");
export const customerSendMessage = (body) => api.post("/customer/messages", { body });

// --- Staff messaging ---
export const staffConversations = () => api.get("/staff/conversations");
export const staffConversation = (cid) => api.get(`/staff/conversations/${cid}`);
export const staffSendMessage = (cid, body) => api.post(`/staff/conversations/${cid}/messages`, { body });

// --- Customer lookup (staff) ---
export const customerByQR = (token) => api.get(`/customers/qr/${encodeURIComponent(token)}`);
export const customerAvailableRewards = (cid) => api.get(`/customers/${cid}/available-rewards`);

// --- Content ---
export const events = () => api.get("/events");
export const news = () => api.get("/news");
export const notifications = () => api.get("/notifications");
export const markNotificationsRead = (ids) => api.post("/notifications/mark-read", { ids });

// --- Cash sessions ---
export const cashCurrent = () => api.get("/cash-sessions/current");
export const cashOpen = (opening_amount) => api.post("/cash-sessions/open", { opening_amount });
export const cashClose = (counted_amount, note) =>
  api.post("/cash-sessions/close", { counted_amount, note });

// --- Sales ---
export const createSale = (payload) => api.post("/sales", payload);
export const listSales = (q = {}) => {
  const p = new URLSearchParams();
  if (q.customer_id) p.set("customer_id", q.customer_id);
  if (q.store_id) p.set("store_id", q.store_id);
  if (q.limit) p.set("limit", String(q.limit));
  return api.get(`/sales?${p.toString()}`);
};

// --- Suspended carts ---
export const listSuspended = () => api.get("/suspended-carts");
export const suspendCart = (payload) => api.post("/suspended-carts", payload);
export const dropSuspended = (cid) => api.del(`/suspended-carts/${cid}`);
