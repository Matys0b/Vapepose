import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { LogOut, RefreshCw, ShoppingBag, Sparkles, QrCode, TrendingUp, Zap } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function ClientHome() {
  const { customer, logout, refreshQR } = useCustomerAuth();

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const pts = customer.loyalty_points || 0;
  const nextReward = 100 * (Math.floor(pts / 100) + 1);
  const progress = Math.min(100, (pts / nextReward) * 100);

  const doRefreshQR = async () => {
    if (!window.confirm("Régénérer un nouveau QR ? L'ancien deviendra inactif.")) return;
    try { await refreshQR(); toast.success("QR régénéré"); } catch (e) { toast.error("Impossible"); void e; }
  };

  return (
    <div className="min-h-screen p-4 pb-24 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-violet-300/70">VapePOS</div>
            <div className="font-display font-black">{customer.first_name}</div>
          </div>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-slate-200 p-2" data-testid="btn-client-logout">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Loyalty card */}
      <Card className="p-5 bg-gradient-to-br from-violet-700/40 via-fuchsia-700/30 to-pink-600/20 border-fuchsia-500/30 relative overflow-hidden" data-testid="loyalty-card">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-fuchsia-500/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-200/80">
            <Sparkles className="w-3.5 h-3.5" /> Fidélité
          </div>
          <div className="font-display text-6xl font-black text-white mt-1" data-testid="loyalty-points">{pts}</div>
          <div className="text-xs text-violet-200/80">points cumulés</div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-200">Prochaine récompense</span>
              <span className="font-mono-num text-pink-200">{pts} / {nextReward}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950/50 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-fuchsia-400 to-pink-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[10px] text-slate-300/80 mt-1">
              Encore {Math.max(0, nextReward - pts)} pts pour un bon de {fmt((nextReward - pts) * (customer.loyalty_settings?.point_value_euro || 0.05) + 5)}
            </div>
          </div>
        </div>
      </Card>

      {/* QR card */}
      <Card className="p-5 bg-slate-900/70 border-violet-500/20" data-testid="qr-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-300/80">
            <QrCode className="w-3.5 h-3.5" /> Ton QR fidélité
          </div>
          <button onClick={doRefreshQR} className="text-slate-400 hover:text-fuchsia-300 flex items-center gap-1 text-xs" data-testid="btn-refresh-qr">
            <RefreshCw className="w-3.5 h-3.5" /> Régénérer
          </button>
        </div>
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl">
            <img
              alt="QR code fidélité"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=6&data=${encodeURIComponent(customer.qr_token)}`}
              className="w-64 h-64"
              data-testid="qr-image"
            />
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-slate-400">
          Montre ce QR au vendeur avant de payer pour cumuler tes points.
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-slate-900/70 border-violet-500/20">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Total dépensé</div>
          <div className="font-display text-xl font-black">{fmt(customer.total_spent || 0)}</div>
        </Card>
        <Card className="p-3 bg-slate-900/70 border-violet-500/20">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-1">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Visites</div>
          <div className="font-display text-xl font-black">{(customer.recent_sales || []).length}</div>
        </Card>
      </div>

      {/* Recent sales */}
      <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden" data-testid="history-card">
        <div className="px-4 py-3 border-b border-violet-500/15 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-fuchsia-400" />
          <div className="font-display font-bold">Historique</div>
        </div>
        {(customer.recent_sales || []).length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Aucun achat encore. Ton premier ticket t'attend en boutique 💜
          </div>
        ) : (
          customer.recent_sales.map((s) => (
            <div key={s.id} className="px-4 py-2 border-b border-violet-500/10 flex justify-between items-center" data-testid={`sale-${s.id}`}>
              <div>
                <div className="text-sm font-semibold">{s.store_name || "Boutique"}</div>
                <div className="text-[11px] text-slate-500">{new Date(s.created_at).toLocaleDateString()} · {s.items.length} article(s)</div>
              </div>
              <div className="text-right">
                <div className="font-mono-num font-bold text-pink-300">{fmt(s.total)}</div>
                {s.loyalty_added > 0 && <div className="text-[10px] text-emerald-300">+{s.loyalty_added} pts</div>}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Loyalty transactions */}
      {(customer.loyalty_txns || []).length > 0 && (
        <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-violet-500/15 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <div className="font-display font-bold">Mouvements de points</div>
          </div>
          <div className="max-h-64 overflow-auto scroll-thin">
            {customer.loyalty_txns.slice(0, 15).map((t) => (
              <div key={t.id} className="px-4 py-1.5 flex justify-between text-xs border-b border-violet-500/5">
                <span className="text-slate-400">{new Date(t.at).toLocaleDateString()} · {t.reason}</span>
                <span className={t.delta > 0 ? "text-emerald-300 font-mono-num" : "text-rose-300 font-mono-num"}>
                  {t.delta > 0 ? "+" : ""}{t.delta}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center text-[10px] text-slate-500 pt-2">
        VapePOS · Cha Va'Pote — merci de ta fidélité 💜
      </div>
    </div>
  );
}
