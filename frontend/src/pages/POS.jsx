import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Search, ScanLine, Zap, User as UserIcon, QrCode, Percent, Pause, RotateCcw, X,
  CreditCard, LayoutDashboard, LogOut, Trash2, Plus, Minus, Package, Coins, Star
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import PaymentModal from "../components/PaymentModal";
import CashSessionModal from "../components/CashSessionModal";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import CustomerLinkModal from "../components/CustomerLinkModal";
import SuspendedCartsDrawer from "../components/SuspendedCartsDrawer";
import ReceiptModal from "../components/ReceiptModal";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function POS() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("favorites");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]); // {product_id,name,unit_price,quantity,discount,vat_rate,image_url,variant,brand}
  const [customer, setCustomer] = useState(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [session, setSession] = useState(null);
  const [showSession, setShowSession] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const scanBufferRef = useRef({ buf: "", ts: 0 });

  const loadProducts = useCallback(async () => {
    const params = {};
    if (q) params.q = q;
    else if (activeCat && activeCat !== "favorites" && activeCat !== "all") params.category_id = activeCat;
    else if (activeCat === "favorites") params.favorite = true;
    const { data } = await api.get("/products", { params });
    setProducts(data);
  }, [q, activeCat]);

  const loadCategories = useCallback(async () => {
    const { data } = await api.get("/categories");
    setCategories(data);
  }, []);

  const loadSession = useCallback(async () => {
    const { data } = await api.get("/cash-sessions/current");
    setSession(data);
  }, []);

  const loadSuspended = useCallback(async () => {
    const { data } = await api.get("/suspended-carts");
    setSuspendedCount(data.length);
  }, []);

  useEffect(() => { loadCategories(); loadSession(); loadSuspended(); }, [loadCategories, loadSession, loadSuspended]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  // HID barcode scanner listener (fast-typing input outside form fields)
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const now = Date.now();
      const state = scanBufferRef.current;
      if (now - state.ts > 400) state.buf = "";
      state.ts = now;
      if (e.key === "Enter") {
        if (state.buf.length >= 4) {
          handleBarcodeCode(state.buf);
        }
        state.buf = "";
        return;
      }
      if (e.key.length === 1) state.buf += e.key;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [session]);

  const handleBarcodeCode = async (code) => {
    try {
      const { data } = await api.get("/products/lookup", { params: { code } });
      addToCart(data);
      toast.success(`${data.name} ajouté`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addToCart = (p) => {
    if (!session) { toast.error("Ouvrez la caisse d'abord"); setShowSession(true); return; }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product_id === p.id);
      if (idx >= 0) {
        const cp = [...prev];
        cp[idx] = { ...cp[idx], quantity: cp[idx].quantity + 1 };
        return cp;
      }
      return [...prev, {
        product_id: p.id, name: p.name, brand: p.brand, variant: p.variant, image_url: p.image_url,
        unit_price: p.price, quantity: 1, discount: 0, vat_rate: p.vat_rate || 20,
      }];
    });
  };

  const changeQty = (i, d) => setCart((prev) => {
    const cp = [...prev];
    cp[i] = { ...cp[i], quantity: Math.max(1, cp[i].quantity + d) };
    return cp;
  });
  const removeLine = (i) => setCart((prev) => prev.filter((_, idx) => idx !== i));
  const setLineDiscount = (i, v) => setCart((prev) => {
    const cp = [...prev]; cp[i] = { ...cp[i], discount: Math.max(0, v) }; return cp;
  });

  const totals = useMemo(() => {
    let subtotal = 0;
    let vatTotal = 0;
    cart.forEach((it) => {
      const line = it.unit_price * it.quantity - it.discount;
      subtotal += line;
      vatTotal += line - line / (1 + it.vat_rate / 100);
    });
    const total = Math.max(0, subtotal - globalDiscount);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vat: Math.round(vatTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [cart, globalDiscount]);

  const submitSale = async (payments) => {
    try {
      const body = {
        items: cart.map((it) => ({
          product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price,
          discount: it.discount, name: it.name, vat_rate: it.vat_rate,
        })),
        payments,
        global_discount: globalDiscount,
        customer_id: customer?.id || null,
      };
      const { data } = await api.post("/sales", body);
      setLastSale({ ...data, customer });
      setShowPayment(false);
      setCart([]); setGlobalDiscount(0); setCustomer(null);
      await loadSession();
      await loadProducts();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const suspendCart = async () => {
    if (cart.length === 0) return;
    try {
      await api.post("/suspended-carts", {
        items: cart, customer_id: customer?.id || null, global_discount: globalDiscount,
        label: customer ? `${customer.first_name} ${customer.last_name || ""}`.trim() : `Panier ${new Date().toLocaleTimeString()}`,
      });
      setCart([]); setGlobalDiscount(0); setCustomer(null);
      await loadSuspended();
      toast.success("Panier mis en attente");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const resumeCart = async (sc) => {
    setCart(sc.items);
    setGlobalDiscount(sc.global_discount || 0);
    if (sc.customer_id) {
      try { const { data } = await api.get(`/customers/${sc.customer_id}`); setCustomer(data); } catch (e) { void e; }
    }
    await api.delete(`/suspended-carts/${sc.id}`);
    await loadSuspended();
    setShowSuspended(false);
  };

  const applyGlobalDiscount = () => {
    const raw = window.prompt("Remise globale en € (ex: 5.00)");
    if (raw == null) return;
    const v = parseFloat(raw.replace(",", "."));
    if (!isNaN(v)) setGlobalDiscount(Math.max(0, v));
  };

  const canPay = cart.length > 0 && session;

  return (
    <div className="pos-shell flex flex-col bg-[#0f0b1e] text-slate-100">
      {/* Top bar */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-violet-500/15 bg-slate-950/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-black text-lg leading-tight">VapePOS</div>
            <div className="text-[10px] uppercase tracking-widest text-violet-300/70">Cha Va'Pote</div>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-4">
            {session ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" data-testid="badge-session-open">
                Caisse ouverte · Fond {fmt(session.opening_amount)}
              </Badge>
            ) : (
              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-400/30" data-testid="badge-session-closed">
                Caisse fermée
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-violet-500/15">
            <UserIcon className="w-4 h-4 text-violet-300" />
            <span className="text-sm">{user?.name}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">{user?.role}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowSession(true)} data-testid="btn-cash-session">
            <Coins className="w-4 h-4 mr-1" /> Caisse
          </Button>
          {(user?.role === "admin" || user?.role === "manager") && (
            <Button variant="ghost" size="sm" onClick={() => nav("/admin")} data-testid="btn-backoffice">
              <LayoutDashboard className="w-4 h-4 mr-1" /> Gestion
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={logout} data-testid="btn-logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left / Center */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 overflow-hidden">
          {/* Search + Scan */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (nom, marque, SKU, EAN)…"
                className="pl-10 h-12 bg-slate-900/60 border-violet-500/20 text-base"
                data-testid="input-search-product"
              />
            </div>
            <Button
              size="lg"
              className="h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95"
              onClick={() => setShowScanner(true)}
              data-testid="btn-open-scanner"
            >
              <ScanLine className="w-5 h-5 mr-2" /> Scanner
            </Button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
            <CatPill active={activeCat === "favorites"} onClick={() => { setActiveCat("favorites"); setQ(""); }} testid="cat-favorites">
              <Star className="w-3.5 h-3.5 mr-1" /> Favoris
            </CatPill>
            <CatPill active={activeCat === "all"} onClick={() => { setActiveCat("all"); setQ(""); }} testid="cat-all">
              Tous
            </CatPill>
            {categories.map((c) => (
              <CatPill
                key={c.id}
                active={activeCat === c.id}
                onClick={() => { setActiveCat(c.id); setQ(""); }}
                color={c.color}
                testid={`cat-${c.name.toLowerCase().replace(/\s|\//g, "-")}`}
              >
                {c.name}
              </CatPill>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto scroll-thin pr-1">
            {products.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm" data-testid="no-products">
                Aucun produit
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="tile-glow text-left rounded-2xl overflow-hidden bg-slate-900/60 border border-violet-500/15 hover:border-fuchsia-500/40"
                    data-testid={`pos-product-card-${p.id}`}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-violet-800/30 to-fuchsia-700/20 relative overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-violet-400/40" />
                        </div>
                      )}
                      {p.is_favorite && (
                        <div className="absolute top-2 left-2 text-amber-300"><Star className="w-4 h-4 fill-amber-300" /></div>
                      )}
                      <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded ${p.stock <= p.stock_alert ? "bg-rose-500/80 text-white" : "bg-emerald-500/80 text-slate-950"}`}>
                        {p.stock}
                      </div>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-violet-300/80 truncate">{p.brand || " "}</div>
                      <div className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{p.variant || ""}</span>
                        <span className="font-mono-num font-bold text-pink-300">{fmt(p.price)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right cart */}
        <div className="col-span-12 lg:col-span-4 flex flex-col rounded-2xl bg-slate-900/70 border border-violet-500/20 overflow-hidden">
          {/* Customer bar */}
          <div className="p-3 border-b border-violet-500/15 flex items-center gap-2">
            {customer ? (
              <div className="flex-1 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center font-bold">
                  {customer.first_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{customer.first_name} {customer.last_name}</div>
                  <div className="text-[11px] text-violet-300">{customer.loyalty_points} pts</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setCustomer(null)} data-testid="btn-unlink-customer">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" className="flex-1 h-10" onClick={() => setShowCustomer(true)} data-testid="btn-open-customer">
                  <UserIcon className="w-4 h-4 mr-2" /> Client
                </Button>
                <Button variant="outline" className="h-10" onClick={() => setShowCustomer(true)} data-testid="btn-open-customer-qr">
                  <QrCode className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Cart lines */}
          <div className="flex-1 overflow-auto scroll-thin" data-testid="cart-list">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
                <ScanLine className="w-10 h-10 text-violet-500/40" />
                <div className="text-sm">Scannez un produit ou touchez une carte pour commencer.</div>
              </div>
            ) : cart.map((it, i) => (
              <div key={`${it.product_id}-${i}`} className="p-3 border-b border-violet-500/10" data-testid={`cart-line-${i}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight line-clamp-2">{it.name}</div>
                    <div className="text-[11px] text-slate-400">{it.brand} {it.variant ? `· ${it.variant}` : ""}</div>
                  </div>
                  <button className="text-slate-500 hover:text-rose-400" onClick={() => removeLine(i)} data-testid={`btn-remove-line-${i}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeQty(i, -1)} data-testid={`btn-qty-minus-${i}`}>
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <div className="w-8 text-center font-mono-num font-bold" data-testid={`line-qty-${i}`}>{it.quantity}</div>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeQty(i, +1)} data-testid={`btn-qty-plus-${i}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <button
                      onClick={() => {
                        const raw = window.prompt("Remise sur la ligne (€)", it.discount || 0);
                        if (raw == null) return;
                        const v = parseFloat(String(raw).replace(",", "."));
                        if (!isNaN(v)) setLineDiscount(i, v);
                      }}
                      className="ml-1 text-[10px] px-2 py-1 rounded bg-slate-800 border border-violet-500/20 text-violet-200"
                      data-testid={`btn-line-discount-${i}`}
                    >
                      Remise {it.discount ? `-${fmt(it.discount)}` : "-"}
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-mono-num">{fmt(it.unit_price)} x{it.quantity}</div>
                    <div className="font-mono-num font-bold text-pink-300" data-testid={`line-total-${i}`}>
                      {fmt(it.unit_price * it.quantity - it.discount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-3 border-t border-violet-500/15 bg-slate-950/40">
            <div className="flex justify-between text-xs text-slate-400"><span>Sous-total TTC</span><span className="font-mono-num">{fmt(totals.subtotal)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Remise globale</span><span className="font-mono-num">-{fmt(globalDiscount)}</span></div>
            <div className="flex justify-between text-xs text-slate-500"><span>Dont TVA 20%</span><span className="font-mono-num">{fmt(totals.vat)}</span></div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-slate-400">Total</span>
              <span className="font-mono-num font-black text-3xl text-emerald-400" data-testid="cart-grand-total">{fmt(totals.total)}</span>
            </div>
          </div>

          {/* Action bar */}
          <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-950/60 border-t border-violet-500/15">
            <ActionBtn onClick={applyGlobalDiscount} testid="btn-global-discount"><Percent className="w-4 h-4" /><span>Remise</span></ActionBtn>
            <ActionBtn onClick={suspendCart} testid="btn-suspend-cart"><Pause className="w-4 h-4" /><span>Suspendre</span></ActionBtn>
            <ActionBtn onClick={() => setShowSuspended(true)} testid="btn-open-suspended">
              <RotateCcw className="w-4 h-4" /><span>En attente {suspendedCount ? `(${suspendedCount})` : ""}</span>
            </ActionBtn>
            <ActionBtn onClick={() => { setCart([]); setGlobalDiscount(0); setCustomer(null); }} testid="btn-clear-cart">
              <X className="w-4 h-4" /><span>Annuler</span>
            </ActionBtn>
            <button
              disabled={!canPay}
              onClick={() => setShowPayment(true)}
              className="col-span-4 h-16 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xl tracking-tight flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="btn-open-payment"
            >
              <CreditCard className="w-6 h-6" />
              PAIEMENT · {fmt(totals.total)}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSession && (
        <CashSessionModal session={session} onClose={() => setShowSession(false)} onChanged={loadSession} />
      )}
      {showPayment && (
        <PaymentModal
          total={totals.total}
          onCancel={() => setShowPayment(false)}
          onConfirm={submitSale}
          customer={customer}
        />
      )}
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onCode={(c) => { setShowScanner(false); handleBarcodeCode(c); }}
        />
      )}
      {showCustomer && (
        <CustomerLinkModal
          onClose={() => setShowCustomer(false)}
          onSelect={(c) => { setCustomer(c); setShowCustomer(false); toast.success(`Client ${c.first_name} associé`); }}
        />
      )}
      {showSuspended && (
        <SuspendedCartsDrawer
          onClose={() => setShowSuspended(false)}
          onResume={resumeCart}
        />
      )}
      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}
    </div>
  );
}

function CatPill({ active, onClick, children, color, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`px-3.5 h-10 rounded-full text-sm font-semibold whitespace-nowrap border transition ${
        active
          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-lg shadow-fuchsia-900/30"
          : "bg-slate-900/60 text-slate-300 border-violet-500/15 hover:border-fuchsia-500/40"
      }`}
      style={active && color ? { boxShadow: `0 6px 20px -6px ${color}55` } : undefined}
    >
      {children}
    </button>
  );
}

function ActionBtn({ children, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="h-14 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-violet-500/15 text-slate-200 text-xs font-semibold flex flex-col items-center justify-center gap-1"
    >
      {children}
    </button>
  );
}
