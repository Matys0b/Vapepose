import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

const empty = { email: "", name: "", password: "", pin: "", role: "cashier" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/users", form); toast.success("Utilisateur créé"); setCreating(false); setForm(empty); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-4" data-testid="users-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Utilisateurs</h1>
        <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-add-user">
          <Plus className="w-4 h-4 mr-1" /> Nouveau
        </Button>
      </div>
      <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-violet-500/10" data-testid={`row-user-${u.id}`}>
            <div className="col-span-4">
              <div className="font-semibold">{u.name}</div>
              <div className="text-xs text-slate-500">{u.email}</div>
            </div>
            <div className="col-span-3 text-xs uppercase tracking-widest text-violet-300">{u.role}</div>
          </div>
        ))}
      </Card>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">Nouvel utilisateur</DialogTitle>
          <form onSubmit={submit} className="space-y-2">
            <input required placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dark" data-testid="uf-name" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark" data-testid="uf-email" />
            <input required type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-dark" data-testid="uf-password" />
            <input placeholder="PIN (optionnel, 4 chiffres)" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className="input-dark" data-testid="uf-pin" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-dark" data-testid="uf-role">
              <option value="cashier">Vendeur</option>
              <option value="manager">Responsable</option>
              <option value="admin">Administrateur</option>
            </select>
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-user">Enregistrer</Button>
            <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
