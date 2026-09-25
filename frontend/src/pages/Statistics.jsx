import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Package, Users } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;
const COLORS = ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#F43F5E"];

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Statistics() {
  const [range, setRange] = useState(30);
  const [series, setSeries] = useState([]);
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    const from = daysAgo(range - 1);
    const to = new Date().toISOString().slice(0, 10);
    const [t, s] = await Promise.all([
      api.get("/accounting/timeseries", { params: { date_from: from, date_to: to, period: range <= 31 ? "day" : range <= 120 ? "week" : "month" } }),
      api.get("/accounting/summary", { params: { date_from: from, date_to: to } }),
    ]);
    setSeries(t.data); setSummary(s.data);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  if (!summary) return <div className="text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-4" data-testid="statistics-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-black">Statistiques</h1>
        <div className="flex gap-1">
          {[7, 30, 90, 365].map((n) => (
            <button
              key={n}
              onClick={() => setRange(n)}
              className={`h-9 px-3 rounded-lg text-sm font-semibold ${range === n ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "bg-slate-900 border border-violet-500/20 text-slate-300"}`}
              data-testid={`range-${n}`}
            >
              {n === 365 ? "1 an" : `${n} j`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={TrendingUp} label="CA période" value={fmt(summary.sales.total_ttc)} />
        <Kpi icon={Package} label="Ventes" value={summary.sales.count} />
        <Kpi icon={Users} label="Panier moyen" value={fmt(summary.sales.avg_basket)} />
        <Kpi icon={TrendingUp} label="Marge est." value={fmt(summary.gross_margin_estimate)} />
      </div>

      <Card className="bg-slate-900/70 border-violet-500/20 p-4">
        <div className="font-display font-bold mb-2">Évolution du CA</div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#312658" strokeDasharray="4 4" />
              <XAxis dataKey="key" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
              <Area type="monotone" dataKey="total" stroke="#EC4899" strokeWidth={2.5} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="bg-slate-900/70 border-violet-500/20 p-4">
          <div className="font-display font-bold mb-2">Top catégories</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={summary.ca_by_category.slice(0, 8)} layout="vertical">
                <CartesianGrid stroke="#312658" strokeDasharray="4 4" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
                <Bar dataKey="total" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="bg-slate-900/70 border-violet-500/20 p-4">
          <div className="font-display font-bold mb-2">Répartition paiements</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={Object.entries(summary.payments).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" innerRadius={45} outerRadius={90} paddingAngle={4}>
                  {Object.keys(summary.payments).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1333", border: "1px solid #312658", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <Card className="bg-slate-900/70 border-violet-500/20 p-3">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-1">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="font-display text-xl font-black">{value}</div>
    </Card>
  );
}
