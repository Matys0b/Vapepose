import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = () => api.get("/sales", { params: { limit: 100 } }).then((r) => setSales(r.data));
  useEffect(() => { load(); }, []);

  const refund = async (sid) => {
    if (!window.confirm("Rembourser cette vente ? Le stock sera réintégré.")) return;
    try { await api.post(`/sales/${sid}/refund`); toast.success("Vente remboursée"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-4" data-testid="sales-page">
      <h1 className="font-display text-3xl font-black">Ventes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-900/70 border-violet-500/20 p-0 lg:col-span-2 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">
            <div className="col-span-3">N°</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Vendeur</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-2 text-right">Statut</div>
          </div>
          {sales.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="w-full grid grid-cols-12 px-4 py-2 text-left border-b border-violet-500/10 hover:bg-slate-950/40 text-sm"
              data-testid={`sale-row-${s.id}`}
            >
              <div className="col-span-3 font-mono-num">{s.number}</div>
              <div className="col-span-3 text-slate-400 text-xs">{new Date(s.created_at).toLocaleString()}</div>
              <div className="col-span-2 text-slate-300">{s.user_name}</div>
              <div className="col-span-2 font-mono-num text-pink-300">{fmt(s.total)}</div>
              <div className="col-span-2 text-right text-xs">
                <span className={s.status === "refunded" ? "text-amber-300" : "text-emerald-300"}>{s.status}</span>
              </div>
            </button>
          ))}
          {sales.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">Aucune vente</div>}
        </Card>

        <Card className="bg-slate-900/70 border-violet-500/20 p-4">
          {selected ? (
            <div className="space-y-3" data-testid="sale-detail">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400">Ticket</div>
                <div className="font-display text-2xl font-black">{selected.number}</div>
              </div>
              <div className="space-y-1 text-sm">
                {selected.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.name} ×{it.quantity}</span>
                    <span className="font-mono-num">{fmt(it.unit_price * it.quantity - (it.discount || 0))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-500/15 pt-2 space-y-1 text-sm">
                <Row label="Sous-total" v={fmt(selected.subtotal)} />
                <Row label="TVA" v={fmt(selected.vat_total)} />
                <Row label="Total" v={fmt(selected.total)} bold />
              </div>
              {selected.status !== "refunded" && (
                <Button variant="outline" onClick={() => refund(selected.id)} className="w-full text-rose-300 border-rose-500/40" data-testid="btn-refund-sale">
                  <RotateCcw className="w-4 h-4 mr-1" /> Rembourser
                </Button>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-10">Sélectionnez une vente pour voir le détail</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, v, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base" : ""}`}>
      <span>{label}</span><span className="font-mono-num">{v}</span>
    </div>
  );
}
