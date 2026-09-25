import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Package, Receipt, TrendingUp, Users, AlertTriangle } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/dashboard/stats").then((r) => setStats(r.data)); }, []);
  if (!stats) return <div className="text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="font-display text-3xl font-black">Tableau de bord</h1>
        <p className="text-sm text-slate-400">Vue synthétique du jour et des indicateurs clés</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label="CA du jour" value={fmt(stats.day_total)} accent="from-emerald-500 to-teal-500" testid="stat-day-total" />
        <Stat icon={Receipt} label="Ventes" value={stats.day_count} accent="from-violet-600 to-fuchsia-600" testid="stat-day-count" />
        <Stat icon={Package} label="Panier moyen" value={fmt(stats.day_avg)} accent="from-pink-500 to-rose-500" testid="stat-day-avg" />
        <Stat icon={Users} label="Clients total" value={stats.total_customers} accent="from-amber-400 to-orange-500" testid="stat-customers" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/70 border-violet-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <div className="font-display font-bold">Stock faible</div>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-auto scroll-thin">
            {stats.low_stock.length === 0 && <div className="text-sm text-slate-500">Aucun produit sous seuil</div>}
            {stats.low_stock.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50">
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.brand}</div>
                </div>
                <div className="text-sm font-mono-num text-rose-300">{p.stock} / {p.stock_alert}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-slate-900/70 border-violet-500/20 p-4">
          <div className="font-display font-bold mb-3">Top produits</div>
          <div className="space-y-1.5 max-h-80 overflow-auto scroll-thin">
            {stats.top_products.length === 0 && <div className="text-sm text-slate-500">Aucune vente</div>}
            {stats.top_products.map(({ product, qty }) => (
              <div key={product.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50">
                <div>
                  <div className="text-sm font-semibold">{product.name}</div>
                  <div className="text-xs text-slate-400">{product.brand}</div>
                </div>
                <div className="text-sm font-mono-num text-emerald-300">×{qty}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent, testid }) {
  return (
    <Card className="bg-slate-900/70 border-violet-500/20 p-4" data-testid={testid}>
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center mb-2`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-xs uppercase tracking-widest text-slate-400">{label}</div>
      <div className="font-display text-2xl font-black">{value}</div>
    </Card>
  );
}
