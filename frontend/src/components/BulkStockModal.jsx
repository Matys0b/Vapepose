import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Search, Trash2, ScanLine, Package } from "lucide-react";

export default function BulkStockModal({ onClose, onDone }) {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [lines, setLines] = useState([]); // {product_id, name, delta}
  const [reason, setReason] = useState("reception");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/products", { params: q ? { q } : { limit: 40 } }).then((r) => setProducts(r.data));
  }, [q]);

  const linesMap = useMemo(() => Object.fromEntries(lines.map((l) => [l.product_id, l])), [lines]);

  const add = (p) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.product_id === p.id);
      if (idx >= 0) {
        const cp = [...prev]; cp[idx] = { ...cp[idx], delta: cp[idx].delta + 1 }; return cp;
      }
      return [...prev, { product_id: p.id, name: p.name, brand: p.brand, delta: 1 }];
    });
  };
  const setDelta = (id, v) => setLines((prev) => prev.map((l) => l.product_id === id ? { ...l, delta: parseInt(v) || 0 } : l));
  const remove = (id) => setLines((prev) => prev.filter((l) => l.product_id !== id));

  // HID scanner listener (Enter-terminated)
  useEffect(() => {
    let buf = ""; let ts = 0;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const now = Date.now();
      if (now - ts > 400) buf = "";
      ts = now;
      if (e.key === "Enter" && buf.length >= 4) {
        (async () => {
          try {
            const { data } = await api.get("/products/lookup", { params: { code: buf } });
            add(data); toast.success(`${data.name} +1`);
          } catch (err) { toast.error(formatApiError(err)); }
        })();
        buf = ""; return;
      }
      if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async () => {
    if (lines.length === 0) return;
    setBusy(true);
    try {
      const { data } = await api.post("/stock/bulk", { lines: lines.map((l) => ({ product_id: l.product_id, delta: l.delta })), reason });
      toast.success(`${data.updated} produit(s) mis à jour`);
      onDone?.();
      onClose();
    } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
  };

  const totalItems = lines.reduce((s, l) => s + l.delta, 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl bg-slate-950 border-violet-500/30">
        <DialogTitle className="font-display text-xl font-black flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-fuchsia-400" /> Réception rapide de stock
        </DialogTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher ou scanner un produit…" className="w-full pl-9 h-11 rounded-lg bg-slate-900 border border-violet-500/20 text-slate-100" data-testid="bulk-search" autoFocus />
            </div>
            <div className="max-h-96 overflow-auto scroll-thin space-y-1">
              {products.map((p) => (
                <button key={p.id} onClick={() => add(p)} className="w-full text-left p-2 rounded-lg bg-slate-900/60 border border-violet-500/10 hover:border-fuchsia-500/40 flex items-center justify-between" data-testid={`bulk-add-${p.id}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center overflow-hidden">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-violet-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.brand} · Stock {p.stock}</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono-num text-emerald-300">+1</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Réception ({lines.length} produit(s), {totalItems} unité(s))</div>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded bg-slate-900 border border-violet-500/20 text-slate-100 px-2 text-xs" data-testid="bulk-reason">
                <option value="reception">Réception fournisseur</option>
                <option value="inventory">Inventaire</option>
                <option value="transfer">Transfert magasin</option>
                <option value="shrink">Casse / Perte</option>
              </select>
            </div>
            <div className="max-h-96 overflow-auto scroll-thin space-y-1">
              {lines.length === 0 && <div className="text-center text-slate-500 text-sm py-10">Ajoutez des produits ou scannez leur code-barres.</div>}
              {lines.map((l) => (
                <div key={l.product_id} className="p-2 rounded-lg bg-slate-900/60 border border-violet-500/10 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{l.name}</div>
                    <div className="text-[10px] text-slate-500">{l.brand}</div>
                  </div>
                  <input type="number" value={l.delta} onChange={(e) => setDelta(l.product_id, e.target.value)} className="w-16 h-9 rounded bg-slate-900 border border-violet-500/20 text-center font-mono-num" data-testid={`bulk-qty-${l.product_id}`} />
                  <button onClick={() => remove(l.product_id)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <Button onClick={submit} disabled={busy || lines.length === 0} className="w-full mt-3 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold" data-testid="btn-bulk-submit">
              Valider la réception
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
