import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Plus, Minus, PackagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import BulkStockModal from "../components/BulkStockModal";

export default function StockPage() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [adjust, setAdjust] = useState(null);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("reception");
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = () => {
    api.get("/products", { params: { limit: 500 } }).then((r) => setProducts(r.data));
    api.get("/stock/movements", { params: { limit: 50 } }).then((r) => setMovements(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await api.post("/stock/adjust", { product_id: adjust.id, delta: parseInt(delta), reason });
      toast.success("Stock mis à jour");
      setAdjust(null); load();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-900/70 border-violet-500/20 p-0 lg:col-span-2 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">
            <div className="col-span-5">Produit</div>
            <div className="col-span-2">Stock</div>
            <div className="col-span-2">Seuil</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {products.map((p) => (
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
          ))}
        </Card>

        <Card className="bg-slate-900/70 border-violet-500/20 p-4">
          <div className="font-display font-bold mb-2">Mouvements récents</div>
          <div className="space-y-1 max-h-96 overflow-auto scroll-thin">
            {movements.map((m) => (
              <div key={m.id} className="text-xs bg-slate-950/50 rounded p-2 flex justify-between">
                <span className="text-slate-400">{new Date(m.at).toLocaleString()}</span>
                <span className={m.delta > 0 ? "text-emerald-300" : "text-rose-300"}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
                <span className="text-slate-500">{m.reason}</span>
              </div>
            ))}
            {movements.length === 0 && <div className="text-xs text-slate-500 text-center py-4">Aucun mouvement</div>}
          </div>
        </Card>
      </div>

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent className="bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">Ajuster le stock</DialogTitle>
          {adjust && (
            <div className="space-y-2">
              <div className="text-sm text-slate-300">{adjust.name}</div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400">Delta (+ / −)</label>
                <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className="input-dark" data-testid="sa-delta" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400">Motif</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-dark" data-testid="sa-reason">
                  <option value="reception">Réception fournisseur</option>
                  <option value="shrink">Perte / Casse</option>
                  <option value="inventory">Inventaire</option>
                  <option value="transfer">Transfert magasin</option>
                </select>
              </div>
              <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" onClick={submit} data-testid="btn-adjust-stock">Enregistrer</Button>
              <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {bulkOpen && <BulkStockModal onClose={() => setBulkOpen(false)} onDone={load} />}
    </div>
  );
}
