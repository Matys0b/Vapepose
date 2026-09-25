import { useEffect, useState, useCallback } from "react";
import { api, API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Download, TrendingUp, PieChart as PieIcon, Receipt, Wallet } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;
const COLORS = ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#F43F5E", "#3B82F6", "#A855F7"];

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today() { return new Date().toISOString().slice(0, 10); }

export default function Accounting() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [period, setPeriod] = useState("day");
  const [storeId, setStoreId] = useState("all");
  const [stores, setStores] = useState([]);

  useEffect(() => { api.get("/stores").then((r) => setStores(r.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    const params = { date_from: from, date_to: to, store_id: storeId };
    const [s, t] = await Promise.all([
      api.get("/accounting/summary", { params }),
      api.get("/accounting/timeseries", { params: { ...params, period } }),
    ]);
    setSummary(s.data); setSeries(t.data);
  }, [from, to, period, storeId]);
  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const t = localStorage.getItem("vapepos_token");
    const url = `${API}/accounting/export.csv?date_from=${from}&date_to=${to}&store_id=${storeId}`;
    fetch(url, { credentials: "include", headers: t ? { Authorization: `Bearer ${t}` } : {} })
      .then((r) => r.blob())
      .then((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `ventes_${from}_${to}.csv`;
        a.click();
      });
  };

  if (!summary) return <div className="text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-4" data-testid="accounting-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">Comptabilité</h1>
          <p className="text-sm text-slate-400">CA, TVA, dépenses, moyens de paiement — {summary.range.from} → {summary.range.to}</p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-xs uppercase tracking-widest text-slate-400">
            Magasin
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="block h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-2 mt-1 text-slate-100" data-testid="acc-store">
              <option value="all">Tous les magasins</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-xs uppercase tracking-widest text-slate-400">
            Du
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-2 mt-1 text-slate-100" data-testid="acc-from" />
          </label>
          <label className="text-xs uppercase tracking-widest text-slate-400">
            Au
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-2 mt-1 text-slate-100" data-testid="acc-to" />
          </label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-2 text-slate-100" data-testid="acc-period">
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>
          <Button onClick={exportCsv} className="h-10 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950" data-testid="btn-export-csv">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={TrendingUp} label="CA TTC" value={fmt(summary.sales.total_ttc)} tint="from-emerald-500 to-teal-500" testid="kpi-ca-ttc" />
        <Kpi icon={Receipt} label="CA HT" value={fmt(summary.sales.total_ht)} tint="from-violet-500 to-fuchsia-500" testid="kpi-ca-ht" />
        <Kpi icon={PieIcon} label="TVA collectée" value={fmt(summary.sales.total_vat_collected)} tint="from-pink-500 to-rose-500" testid="kpi-vat" />
        <Kpi icon={Wallet} label="Dépenses" value={fmt(summary.expenses.total)} tint="from-amber-500 to-orange-500" testid="kpi-expenses" />
        <Kpi icon={TrendingUp} label="Marge brute est." value={fmt(summary.gross_margin_estimate)} tint="from-cyan-500 to-sky-500" testid="kpi-margin" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-900/60 border border-violet-500/20">
          <TabsTrigger value="overview" data-testid="tab-overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="vat" data-testid="tab-vat">TVA</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Paiements</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Équipe & Catégories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card className="bg-slate-900/70 border-violet-500/20 p-4">
            <div className="font-display font-bold mb-2">Chiffre d'affaires ({period})</div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid stroke="#312658" strokeDasharray="4 4" />
                  <XAxis dataKey="key" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="total" stroke="#EC4899" strokeWidth={2.5} dot={{ r: 3, fill: "#EC4899" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi icon={Receipt} label="Nb ventes" value={summary.sales.count} tint="from-violet-500 to-fuchsia-500" />
            <Kpi icon={TrendingUp} label="Panier moyen" value={fmt(summary.sales.avg_basket)} tint="from-pink-500 to-rose-500" />
            <Kpi icon={Wallet} label="TVA due (est.)" value={fmt(summary.vat_due)} tint="from-amber-500 to-orange-500" />
          </div>
        </TabsContent>

        <TabsContent value="vat" className="space-y-3">
          <Card className="bg-slate-900/70 border-violet-500/20 p-4">
            <div className="font-display font-bold mb-2">TVA par taux</div>
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs uppercase tracking-widest">
                <tr><th className="text-left py-1">Taux</th><th className="text-right">Base HT</th><th className="text-right">TVA</th><th className="text-right">TTC</th></tr>
              </thead>
              <tbody>
                {summary.vat_by_rate.map((v) => (
                  <tr key={v.rate} className="border-t border-violet-500/10" data-testid={`vat-row-${v.rate}`}>
                    <td className="py-2">{v.rate}%</td>
                    <td className="text-right font-mono-num">{fmt(v.ht)}</td>
                    <td className="text-right font-mono-num text-pink-300">{fmt(v.vat)}</td>
                    <td className="text-right font-mono-num">{fmt(v.ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-violet-500/10">
              <span className="text-slate-300 font-semibold">TVA due (collectée − déductible)</span>
              <span className="font-mono-num text-2xl font-black text-emerald-300" data-testid="vat-due">{fmt(summary.vat_due)}</span>
            </div>
            <div className="mt-1 text-xs text-amber-300/80">
              ⚠️ Estimation indicative — non-officielle. Consultez votre expert-comptable pour toute déclaration.
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="bg-slate-900/70 border-violet-500/20 p-4">
            <div className="font-display font-bold mb-2">Répartition des moyens de paiement</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={Object.entries(summary.payments).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={4}>
                      {Object.keys(summary.payments).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {Object.entries(summary.payments).map(([k, v], i) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="capitalize">{k === "cash" ? "Espèces" : k === "card" ? "Carte" : "Autre"}</span>
                    </div>
                    <span className="font-mono-num font-semibold">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-3">
          <Card className="bg-slate-900/70 border-violet-500/20 p-4">
            <div className="font-display font-bold mb-2">CA par vendeur</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={summary.ca_by_user}>
                  <CartesianGrid stroke="#312658" strokeDasharray="4 4" />
                  <XAxis dataKey="user" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="bg-slate-900/70 border-violet-500/20 p-4">
            <div className="font-display font-bold mb-2">CA par catégorie</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={summary.ca_by_category} layout="vertical">
                  <CartesianGrid stroke="#312658" strokeDasharray="4 4" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={11} width={110} />
                  <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#EC4899" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint, testid }) {
  return (
    <Card className="bg-slate-900/70 border-violet-500/20 p-3" data-testid={testid}>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tint} flex items-center justify-center mb-1`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="font-display text-xl font-black">{value}</div>
    </Card>
  );
}
