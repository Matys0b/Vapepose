import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const CustomerAuthCtx = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null); // null=loading, false=anon, obj=customer

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/customer/me");
      setCustomer(data);
    } catch { setCustomer(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/customer/login", { email, password });
    if (data.token) localStorage.setItem("vapepos_customer_token", data.token);
    setCustomer(data);
    await refresh();
    return data;
  };

  const register = async (body) => {
    const { data } = await api.post("/customer/register", body);
    if (data.token) localStorage.setItem("vapepos_customer_token", data.token);
    setCustomer(data);
    await refresh();
    return data;
  };

  const logout = async () => {
    try { await api.post("/customer/logout"); } catch (e) { void e; }
    localStorage.removeItem("vapepos_customer_token");
    setCustomer(false);
  };

  const refreshQR = async () => {
    const { data } = await api.post("/customer/qr-refresh");
    setCustomer((c) => c ? { ...c, qr_token: data.qr_token } : c);
    return data;
  };

  return (
    <CustomerAuthCtx.Provider value={{ customer, login, register, logout, refresh, refreshQR }}>
      {children}
    </CustomerAuthCtx.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthCtx);
