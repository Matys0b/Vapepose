import { Navigate, Link } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { ShoppingBag, Sparkles, QrCode, TrendingUp, ArrowRight, Gift, ChevronRight } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function ClientHome() {
  const { customer } = useCustomerAuth();

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const pts = customer.loyalty_points || 0;
  const nextReward = 100 * (Math.floor(pts / 100) + 1);
  const progress = Math.min(100, (pts / nextReward) * 100);
  const lastSale = customer.recent_sales?.[0];

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Loyalty hero */}
      <Card className="p-5 bg-gradient-to-br from-violet-700/50 via-fuchsia-700/40 to-pink-600/30 border-fuchsia-500/30 relative overflow-hidden shine" data-testid="loyalty-card">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute inset-0 grain opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-100/90">
            <Sparkles className="w-3.5 h-3.5" /> Fidélité
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="font-display text-7xl font-black text-white leading-none drop-shadow-[0_4px_12px_rgba(217,70,239,0.5)]" data-testid="loyalty-points">{pts}</div>
            <div className="text-xs text-violet-100/80 font-semibold">pts</div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-slate-100">Prochaine récompense</span>
              <span className="font-mono-num text-pink-100">{pts} / {nextReward}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-950/40 overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-fuchsia-300 via-pink-300 to-rose-200 transition-all rounded-full shadow-[0_0_18px_rgba(244,114,182,0.6)]" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[10px] text-slate-100/80 mt-1.5">
              Encore <span className="font-bold text-pink-200">{Math.max(0, nextReward - pts)}</span> pts pour ta prochaine récompense
            </div>
          </div>
        </div>
      </Card>

      {/* Primary CTA — QR */}
      <Link to="/client/me/qr" className="block" data-testid="cta-qr">
        <Card className="p-4 bg-slate-900/70 border-violet-500/25 hover:border-fuchsia-500/50 transition">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-base">Afficher mon QR</div>
              <div className="text-xs text-slate-400">Montre-le au vendeur pour cumuler des points</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </div>
        </Card>
      </Link>

      {/* Stats mini */}
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

      {/* Last purchase */}
      {lastSale && (
        <Card className="p-4 bg-slate-900/70 border-violet-500/20" data-testid="last-sale-card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-fuchsia-400" /> Dernier achat
            </div>
            <Link to="/client/me/achats" className="text-xs text-fuchsia-300 flex items-center gap-1">Tout voir <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-sm font-semibold">{lastSale.store_name || "Boutique"}</div>
              <div className="text-[11px] text-slate-500">{new Date(lastSale.created_at).toLocaleDateString()} · {lastSale.items.length} article(s)</div>
            </div>
            <div className="text-right">
              <div className="font-mono-num font-bold text-pink-300">{fmt(lastSale.total)}</div>
              {lastSale.loyalty_added > 0 && <div className="text-[10px] text-emerald-300">+{lastSale.loyalty_added} pts</div>}
            </div>
          </div>
        </Card>
      )}

      {/* Subscriptions (read-only preview) */}
      <Card className="p-4 bg-slate-900/70 border-violet-500/20" data-testid="subs-card">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-fuchsia-400" />
          <div className="font-display font-bold text-sm">Abonnements — bientôt</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {["Basique", "Plus", "Premium", "Gold"].map((tier, i) => (
            <div key={tier} className={`p-2 rounded-xl text-center border ${i === 0 ? "border-slate-700 bg-slate-950/40" : "border-violet-500/10 bg-slate-950/20"}`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{tier}</div>
              <div className="text-[9px] text-slate-600 mt-1">à venir</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 mt-2">Ces formules seront activées prochainement.</div>
      </Card>

      <div className="text-center text-[10px] text-slate-500 pt-2 pb-4">
        Merci de ta fidélité 💜
      </div>
    </div>
  );
}
