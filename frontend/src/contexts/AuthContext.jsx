import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError, setStaffToken, clearStaffToken } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=anon, obj=user
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) setStaffToken(data.token);
      setUser(data);
      return data;
    } catch (e) {
      setError(formatApiError(e));
      throw e;
    }
  };

  const universalLogin = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/universal-login", { email, password });
      if (data.type === "staff" && data.token) {
        setStaffToken(data.token);
        setUser(data);
      } else if (data.type === "customer" && data.token) {
        // Customer token handled by CustomerAuthContext (localStorage)
        localStorage.setItem("vapepos_customer_token", data.token);
      }
      return data;
    } catch (e) {
      setError(formatApiError(e));
      throw e;
    }
  };

  const pinLogin = async (pin) => {
    setError("");
    try {
      const { data } = await api.post("/auth/pin-login", { pin });
      if (data.token) setStaffToken(data.token);
      setUser(data);
      return data;
    } catch (e) {
      setError(formatApiError(e));
      throw e;
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { void e; }
    clearStaffToken();
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, error, login, pinLogin, universalLogin, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
