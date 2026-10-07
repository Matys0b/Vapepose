import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "../lib/storage";

const CartContext = createContext(null);

const empty = {
  items: [],
  customer: null,
  availableRewards: [],
  appliedRewardId: null,
  global_discount: 0,
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(empty);

  useEffect(() => {
    (async () => {
      const draft = await storage.getJSON("cart_draft");
      if (draft && Array.isArray(draft.items)) setCart({ ...empty, ...draft });
    })();
  }, []);

  useEffect(() => {
    storage.set("cart_draft", cart).catch(() => {});
  }, [cart]);

  const addProduct = useCallback((p) => {
    setCart((c) => {
      const existing = c.items.find((it) => it.product_id === p.id);
      if (existing) {
        return {
          ...c,
          items: c.items.map((it) =>
            it.product_id === p.id ? { ...it, quantity: it.quantity + 1 } : it
          ),
        };
      }
      return {
        ...c,
        items: [
          ...c.items,
          {
            product_id: p.id,
            name: p.name + (p.variant ? ` · ${p.variant}` : ""),
            unit_price: Number(p.price) || 0,
            quantity: 1,
            discount: 0,
            vat_rate: Number(p.vat_rate) || 20.0,
            image: p.image_url || null,
          },
        ],
      };
    });
  }, []);

  const setQty = useCallback((product_id, qty) => {
    setCart((c) => ({
      ...c,
      items:
        qty <= 0
          ? c.items.filter((it) => it.product_id !== product_id)
          : c.items.map((it) => (it.product_id === product_id ? { ...it, quantity: qty } : it)),
    }));
  }, []);

  const removeLine = useCallback((product_id) => {
    setCart((c) => ({ ...c, items: c.items.filter((it) => it.product_id !== product_id) }));
  }, []);

  const setLineDiscount = useCallback((product_id, discount) => {
    setCart((c) => ({
      ...c,
      items: c.items.map((it) =>
        it.product_id === product_id ? { ...it, discount: Math.max(0, Number(discount) || 0) } : it
      ),
    }));
  }, []);

  const setGlobalDiscount = useCallback((v) => {
    setCart((c) => ({ ...c, global_discount: Math.max(0, Number(v) || 0) }));
  }, []);

  const attachCustomer = useCallback((customer, availableRewards = []) => {
    setCart((c) => ({ ...c, customer, availableRewards, appliedRewardId: null }));
  }, []);

  const detachCustomer = useCallback(() => {
    setCart((c) => ({ ...c, customer: null, availableRewards: [], appliedRewardId: null }));
  }, []);

  const applyReward = useCallback((rewardId) => {
    setCart((c) => ({ ...c, appliedRewardId: rewardId }));
  }, []);

  const clear = useCallback(() => setCart(empty), []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let vat_total = 0;
    for (const it of cart.items) {
      const line = it.unit_price * it.quantity - (it.discount || 0);
      subtotal += line;
      const rate = (it.vat_rate || 0) / 100;
      vat_total += line - line / (1 + rate);
    }
    let total = Math.max(0, subtotal - (cart.global_discount || 0));
    // Apply reward
    if (cart.appliedRewardId && cart.availableRewards?.length) {
      const r = cart.availableRewards.find((x) => x.id === cart.appliedRewardId);
      if (r) {
        if (r.kind === "percent") total = total * (1 - (Number(r.value) || 0) / 100);
        else if (r.kind === "amount") total = Math.max(0, total - (Number(r.value) || 0));
      }
    }
    return {
      count: cart.items.reduce((n, it) => n + it.quantity, 0),
      subtotal: round2(subtotal),
      vat_total: round2(vat_total),
      total: round2(total),
    };
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        totals,
        addProduct,
        setQty,
        removeLine,
        setLineDiscount,
        setGlobalDiscount,
        attachCustomer,
        detachCustomer,
        applyReward,
        clear,
        hydrate: setCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const round2 = (n) => Math.round(n * 100) / 100;

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
