import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { ShoppingBag, Store, Sparkles } from "lucide-react";
import { useState } from "react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function ClientOrders() {
  const { customer } = useCustomerAuth();
  const [expanded, setExpanded] = useState(null);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const sales = customer.recent_sales || [];
  const txns = customer.loyalty_txns || [];

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div>
        <div className="font-display text-xl font-black mb-3">Mes achats</div>
        {sales.length === 0 ? (
          <Card className="p-6 bg-slate-900/70 border-violet-500/20 text-center text-sm text-slate-500">
            Aucun achat encore. Ton premier ticket t'attend en boutique 💜
          </Card>
        ) : (
          <div className="space-y-2">
            {sales.map((s) => (
              <Card key={s.id} className="bg-slate-900/70 border-violet-500/20 overflow-hidden" data-testid={`sale-${s.id}`}>
                <button
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center">
                      <Store className="w-4 h-4 text-fuchsia-300" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.store_name || "Boutique"}</div>
                      <div className="text-[11px] text-slate-500">{new Date(s.created_at).toLocaleString("fr-FR")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-num font-bold text-pink-300">{fmt(s.total)}</div>
                    {s.loyalty_added > 0 && <div className="text-[10px] text-emerald-300">+{s.loyalty_added} pts</div>}
                  </div>
                </button>
                {expanded === s.id && (
                  <div className="px-3 pb-3 border-t border-violet-500/10 pt-2 space-y-1">
                    {s.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-300">{it.quantity}× {it.name}</span>
                        <span className="font-mono-num text-slate-400">{fmt(it.unit_price * it.quantity - (it.discount || 0))}</span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-violet-500/10 flex justify-between text-[11px] text-slate-400">
                      <span>Numéro</span><span className="font-mono-num">{s.number}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {txns.length > 0 && (
        <div>
          <div className="font-display text-xl font-black mt-6 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" /> Mouvements de points
          </div>
          <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
            <div className="max-h-72 overflow-auto scroll-thin">
              {txns.slice(0, 30).map((t) => (
                <div key={t.id} className="px-4 py-2 flex justify-between text-xs border-b border-violet-500/5 last:border-none">
                  <span className="text-slate-400">{new Date(t.at).toLocaleDateString("fr-FR")} · {t.reason}</span>
                  <span className={t.delta > 0 ? "text-emerald-300 font-mono-num" : "text-rose-300 font-mono-num"}>
                    {t.delta > 0 ? "+" : ""}{t.delta}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center pt-2 pb-2">
        <ShoppingBag className="w-3.5 h-3.5" /> Les 20 derniers achats sont affichés.
      </div>
    </div>
  );
}
