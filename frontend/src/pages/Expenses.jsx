import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;
const CATS = ["Loyer", "Achat marchandises", "Salaires", "Fournitures", "Marketing", "Assurance", "Énergie", "Transport", "Général"];

const empty = { label: "", amount: 0, vat_rate: 20, category: "Général", payment_method: "card", at: new Date().toISOString().slice(0, 10), note: "" };

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const load = () => api.get("/expenses").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/expenses", { ...form, amount: parseFloat(form.amount), vat_rate: parseFloat(form.vat_rate), at: form.at });
      toast.success("Dépense enregistrée");
      setCreating(false); setForm(empty); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (id) => {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    try { await api.delete(`/expenses/${id}`); load(); } catch (e) { toast.error(formatApiError(e)); }
  };

  const total = items.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4" data-testid="expenses-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black">Dépenses</h1>
          <p className="text-sm text-slate-400">Total : <span className="text-pink-300 font-mono-num">{fmt(total)}</span></p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-add-expense">
          <Plus className="w-4 h-4 mr-1" /> Nouvelle dépense
        </Button>
      </div>

      <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">
          <div className="col-span-2">Date</div>
          <div className="col-span-4">Libellé</div>
          <div className="col-span-2">Catégorie</div>
          <div className="col-span-2">Paiement</div>
          <div className="col-span-1 text-right">Montant</div>
          <div className="col-span-1"></div>
        </div>
        {items.map((e) => (
          <div key={e.id} className="grid grid-cols-12 px-4 py-2 items-center border-b border-violet-500/10 text-sm" data-testid={`row-expense-${e.id}`}>
            <div className="col-span-2 text-xs text-slate-400">{new Date(e.at).toLocaleDateString()}</div>
            <div className="col-span-4">
              <div className="font-semibold">{e.label}</div>
              <div className="text-[10px] text-slate-500">TVA {e.vat_rate}% ({fmt(e.vat_amount || 0)})</div>
            </div>
            <div className="col-span-2 text-slate-300">{e.category}</div>
            <div className="col-span-2 text-slate-300 capitalize">{e.payment_method === "cash" ? "Espèces" : e.payment_method === "card" ? "Carte" : e.payment_method}</div>
            <div className="col-span-1 text-right font-mono-num text-pink-300">{fmt(e.amount)}</div>
            <div className="col-span-1 text-right">
              <button onClick={() => del(e.id)} className="text-rose-400 hover:text-rose-300" data-testid={`btn-del-expense-${e.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Aucune dépense</div>}
      </Card>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">Nouvelle dépense</DialogTitle>
          <form onSubmit={submit} className="grid grid-cols-2 gap-2">
            <input required placeholder="Libellé" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-dark col-span-2" data-testid="ef-label" />
            <input required type="number" step="0.01" placeholder="Montant TTC" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-dark" data-testid="ef-amount" />
            <input type="number" step="0.1" placeholder="TVA %" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} className="input-dark" data-testid="ef-vat" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-dark" data-testid="ef-cat">
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input-dark" data-testid="ef-method">
              <option value="card">Carte</option>
              <option value="cash">Espèces</option>
              <option value="transfer">Virement</option>
              <option value="other">Autre</option>
            </select>
            <input type="date" value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} className="input-dark col-span-2" data-testid="ef-date" />
            <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-dark h-16 py-2 col-span-2" />
            <Button type="submit" className="col-span-2 bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-expense">Enregistrer</Button>
            <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
