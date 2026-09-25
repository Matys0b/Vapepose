import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

const empty = { name: "", contact_name: "", email: "", phone: "", address: "", note: "" };

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const load = () => api.get("/suppliers").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/suppliers", form); toast.success("Fournisseur créé"); setCreating(false); setForm(empty); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-4" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Fournisseurs</h1>
        <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-add-supplier">
          <Plus className="w-4 h-4 mr-1" /> Nouveau
        </Button>
      </div>
      <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
        {items.map((s) => (
          <div key={s.id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-violet-500/10" data-testid={`row-supplier-${s.id}`}>
            <div className="col-span-4 font-semibold">{s.name}</div>
            <div className="col-span-3 text-sm text-slate-300">{s.contact_name || "—"}</div>
            <div className="col-span-3 text-sm text-slate-400">{s.email || s.phone || "—"}</div>
            <div className="col-span-2 text-xs text-slate-500 truncate">{s.address}</div>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">Aucun fournisseur</div>}
      </Card>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">Nouveau fournisseur</DialogTitle>
          <form onSubmit={submit} className="space-y-2">
            <input required placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dark" data-testid="sf-name" />
            <input placeholder="Contact" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="input-dark" data-testid="sf-contact" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark" data-testid="sf-email" />
            <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-dark" data-testid="sf-phone" />
            <input placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-dark" data-testid="sf-address" />
            <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-dark h-20 py-2" data-testid="sf-note" />
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-supplier">Enregistrer</Button>
            <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
