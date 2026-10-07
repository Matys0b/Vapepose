import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "../lib/storage";
import * as E from "../api/endpoints";
import { registerForPush } from "../lib/notifications";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    ready: false,
    user: null,
    type: null,   // 'staff' | 'customer'
    token: null,
  });

  const bootstrap = useCallback(async () => {
    try {
      const token = await storage.get("auth_token");
      const user = await storage.getJSON("auth_user");
      if (token && user) {
        setState({ ready: true, user, type: user.type || (user.role === "customer" ? "customer" : "staff"), token });
      } else {
        setState({ ready: true, user: null, type: null, token: null });
      }
    } catch {
      setState({ ready: true, user: null, type: null, token: null });
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const persist = useCallback(async (user, token, type) => {
    await storage.set("auth_token", token);
    await storage.set("auth_user", { ...user, type });
    setState({ ready: true, user: { ...user, type }, type, token });
    // Fire-and-forget push registration (does nothing if denied)
    registerForPush().catch(() => {});
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await E.universalLogin(email, password);
    await persist(res, res.token, res.type);
    return res;
  }, [persist]);

  const registerCustomer = useCallback(async (payload) => {
    const res = await E.customerRegister({ ...payload, accept_terms: true });
    await persist({ ...res, type: "customer" }, res.token, "customer");
    return res;
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      if (state.type === "customer") await E.logoutCustomer();
      else await E.logoutStaff();
    } catch {}
    await storage.remove("auth_token");
    await storage.remove("auth_user");
    await storage.remove("current_store");
    await storage.remove("cart_draft");
    setState({ ready: true, user: null, type: null, token: null });
  }, [state.type]);

  const refreshUser = useCallback(async (patch) => {
    const user = { ...(state.user || {}), ...(patch || {}) };
    await storage.set("auth_user", user);
    setState((s) => ({ ...s, user }));
  }, [state.user]);

  const pickStore = useCallback(async (store_id, store_name) => {
    await E.switchStore(store_id);
    const user = { ...(state.user || {}), store_id, store_name };
    await storage.set("auth_user", user);
    await storage.set("current_store", { id: store_id, name: store_name });
    setState((s) => ({ ...s, user }));
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, registerCustomer, logout, refreshUser, pickStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
