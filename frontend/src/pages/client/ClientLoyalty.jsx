import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { api } from "../../lib/api";
import { Sparkles, Gift, Clock, CheckCircle2, XCircle } from "lucide-react";

const LEVELS = [
  { name: "Nouveau",  min: 0,    color: "#94A3B8", gradient: "from-slate-400 to-slate-500" },
  { name: "Habitué",  min: 200,  color: "#A78BFA", gradient: "from-violet-400 to-violet-500" },
  { name: "Fidèle",   min: 500,  color: "#D946EF", gradient: "from-fuchsia-500 to-pink-500" },
  { name: "VIP",      min: 1500, color: "#F59E0B", gradient: "from-amber-400 via-pink-500 to-fuchsia-500" },
];

function currentLevel(pts) {
  let lv = LEVELS[0];
  for (const l of LEVELS) if (pts >= l.min) lv = l;
  return lv;
}
function nextLevel(pts) {
  return LEVELS.find((l) => pts < l.min) || null;
}

export default function ClientLoyalty() {
  const { customer } = useCustomerAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/customer/rewards").then((r) => setRewards(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const pts = customer.loyalty_points || 0;
  const lv = currentLevel(pts);
  const nxt = nextLevel(pts);
  const progress = nxt ? Math.min(100, ((pts - lv.min) / (nxt.min - lv.min)) * 100) : 100;

  const available = rewards.filter((r) => r.status === "available");
  const used = rewards.filter((r) => r.status === "used");
  const expired = rewards.filter((r) => r.status === "expired");

  return (
    <div className="max-w-md mx-auto p-4 space-y-4" data-testid="client-loyalty">
      {/* Level hero */}
      <Card className={`p-5 bg-gradient-to-br ${lv.gradient} border-fuchsia-500/30 relative overflow-hidden shine`}>
        <div className="absolute inset-0 grain opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/90">
            <Sparkles className="w-3.5 h-3.5" /> Niveau {lv.name}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="font-display text-6xl font-black text-white leading-none drop-shadow" data-testid="loyalty-points">{pts}</div>
            <div className="text-xs text-white/80 font-semibold">pts · 1€ = 2 pts</div>
          </div>
          {nxt ? (
            <div className="mt-5">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-white/90">Prochain niveau · {nxt.name}</span>
                <span className="font-mono-num text-white">{pts} / {nxt.min}</span>
              </div>
              <div className="h-2.5 rounded-full bg-black/25 overflow-hidden">
                <div className="h-full bg-white/90 transition-all rounded-full shadow" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[10px] text-white/80 mt-1.5">Encore <b>{nxt.min - pts}</b> pts pour devenir {nxt.name}</div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-white/90">Niveau maximum atteint · Merci de ta fidélité 💜</div>
          )}
        </div>
      </Card>

      {/* Available rewards */}
      <section>
        <div className="font-display text-xl font-black mb-2 flex items-center gap-2">
          <Gift className="w-5 h-5 text-fuchsia-400" /> Récompenses dispo
          {available.length > 0 && <span className="text-xs bg-fuchsia-500/20 text-fuchsia-200 px-2 py-0.5 rounded-full">{available.length}</span>}
        </div>
        {loading ? (
          <div className="text-sm text-slate-500 py-3">Chargement…</div>
        ) : available.length === 0 ? (
          <Card className="p-5 bg-slate-900/70 border-violet-500/20 text-center text-sm text-slate-400">
            Continue d'accumuler des points pour débloquer tes premières récompenses 💜
          </Card>
        ) : (
          <div className="space-y-2">
            {available.map((r) => <RewardCard key={r.id} r={r} />)}
          </div>
        )}
        <div className="text-[11px] text-slate-500 mt-2">Les récompenses s'appliquent automatiquement au prochain scan de ton QR en caisse.</div>
      </section>

      {used.length > 0 && (
        <section>
          <div className="font-display text-sm font-black mt-5 mb-2 text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Utilisées
          </div>
          <div className="space-y-2">{used.slice(0, 10).map((r) => <RewardCard key={r.id} r={r} />)}</div>
        </section>
      )}
      {expired.length > 0 && (
        <section>
          <div className="font-display text-sm font-black mt-5 mb-2 text-slate-500 flex items-center gap-1">
            <XCircle className="w-4 h-4 text-rose-400" /> Expirées
          </div>
          <div className="space-y-2 opacity-60">{expired.slice(0, 5).map((r) => <RewardCard key={r.id} r={r} />)}</div>
        </section>
      )}
    </div>
  );
}

function RewardCard({ r }) {
  const label = r.kind === "percent" ? `-${r.value}%`
    : r.kind === "amount" ? `-${r.value}€`
    : r.kind === "free_product" ? "Offert"
    : "Avantage";
  const color = r.status === "available" ? "border-fuchsia-500/40 bg-fuchsia-500/10"
    : r.status === "used" ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-slate-700 bg-slate-900/50";
  return (
    <Card className={`p-3 border ${color}`} data-testid={`reward-${r.id}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-white font-display font-black text-xs">
          {label}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{r.name}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            {r.status === "available" && r.expires_at && (
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> jusqu'au {new Date(r.expires_at).toLocaleDateString("fr-FR")}</span>
            )}
            {r.status === "used" && <span className="text-emerald-300">Appliquée en caisse</span>}
            {r.status === "expired" && <span className="text-rose-300">Expirée</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
