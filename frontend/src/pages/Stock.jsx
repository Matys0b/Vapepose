import { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Plus, Minus, PackagePlus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import BulkStockModal from "../components/BulkStockModal";

const PAGE = 100;

export default function StockPage() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [movements, setMovements] = useState([]);
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 300);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adjust, setAdjust] = useState(null);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("reception");
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE, offset: 0 };
      if (dq) params.q = dq;
      const [{ data }, cnt] = await Promise.all([
        api.get("/products", { params }),
        api.get("/products/count", { params: { q: dq || undefined } }).catch(() => ({ data: { total: 0 } })),
      ]);
      setProducts(data);
      setTotal(cnt.data?.total ?? data.length);
    } finally { setLoading(false); }
    api.get("/stock/movements", { params: { limit: 50 } }).then((r) => setMovements(r.data)).catch(() => {});
  }, [dq]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore || products.length >= total) return;
    setLoadingMore(true);
    try {
      const params = { limit: PAGE, offset: products.length };
      if (dq) params.q = dq;
      const { data } = await api.get("/products", { params });
      setProducts((prev) => [...prev, ...data]);
    } finally { setLoadingMore(false); }
  };

  const submit = async () => {
    try {
      await api.post("/stock/adjust", { product_id: adjust.id, delta: parseInt(delta), reason });
      toast.success("Stock mis à jour");
      setAdjust(null);
      await load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-4" data-testid="stock-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-black">Stock</h1>
        <Button onClick={() => setBulkOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold" data-testid="btn-bulk-receive">
          <PackagePlus className="w-4 h-4 mr-1" /> Réception rapide (scan)
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, marque, SKU, EAN)…"
          className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900/70 border border-violet-500/20 text-sm outline-none focus:border-fuchsia-500/40"
          data-testid="stock-search"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-900/70 border-violet-500/20 p-0 lg:col-span-2 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">
            <div className="col-span-5">Produit</div>
            <div className="col-span-2">Stock</div>
            <div className="col-span-2">Seuil</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {loading && products.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Chargement…</div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Aucun produit</div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="grid grid-cols-12 px-4 py-2 items-center border-b border-violet-500/10 text-sm" data-testid={`stock-row-${p.id}`}>
                <div className="col-span-5">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.brand}</div>
                </div>
                <div className={`col-span-2 font-mono-num ${p.stock <= p.stock_alert ? "text-rose-300" : "text-slate-200"}`}>{p.stock}</div>
                <div className="col-span-2 font-mono-num text-slate-400">{p.stock_alert}</div>
                <div className="col-span-3 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setAdjust(p); setDelta(1); setReason("reception"); }} data-testid={`btn-stock-plus-${p.id}`}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAdjust(p); setDelta(-1); setReason("shrink"); }} data-testid={`btn-stock-minus-${p.id}`}>
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {products.length < total && (
            <div className="p-3 flex justify-center">
              <button onClick={loadMore} disabled={loadingMore} className="h-10 px-4 rounded-xl bg-slate-900/70 border border-violet-500/25 text-sm hover:border-fuchsia-500/40 disabled:opacity-40" data-testid="btn-load-more-stock">
                {loadingMore ? "Chargement…" : `Voir plus (${total - products.length} restants)`}
              </button>
            </div>
          )}
          <div className="text-[10px] text-slate-500 text-center py-2">{products.length} / {total} produits</div>
        </Card>

        <Card className="bg-slate-900/70 border-violet-500/20 p-0 overflow-hidden">
          <div className="px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">Mouvements récents</div>
          <div className="max-h-[540px] overflow-auto scroll-thin">
            {movements.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Aucun mouvement</div>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="px-4 py-2 border-b border-violet-500/10 text-xs">
                  <div className="flex justify-between">
                    <span className={m.delta > 0 ? "text-emerald-300 font-mono-num" : "text-rose-300 font-mono-num"}>
                      {m.delta > 0 ? "+" : ""}{m.delta}
                    </span>
                    <span className="text-slate-500">{m.reason}</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">{new Date(m.at).toLocaleString("fr-FR")}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {adjust && (
        <Dialog open onOpenChange={(o) => !o && setAdjust(null)}>
          <DialogContent className="max-w-md bg-slate-950 border-violet-500/30">
            <DialogTitle className="font-display text-xl font-black">Ajuster le stock</DialogTitle>
            <div className="text-sm text-slate-400">{adjust.name}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">Delta<input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-3 mt-1 font-mono-num" data-testid="stock-delta" /></label>
              <label className="text-xs text-slate-400">Motif<select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-3 mt-1" data-testid="stock-reason">
                <option value="reception">Réception</option>
                <option value="shrink">Casse / perte</option>
                <option value="inventory">Inventaire</option>
                <option value="transfer">Transfert</option>
              </select></label>
            </div>
            <Button onClick={submit} className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold" data-testid="btn-stock-confirm">Valider</Button>
          </DialogContent>
        </Dialog>
      )}

      {bulkOpen && <BulkStockModal onClose={() => setBulkOpen(false)} onDone={() => { setBulkOpen(false); load(); }} />}
    </div>
  );
}
