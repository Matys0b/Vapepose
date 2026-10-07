import { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Plus, Edit, Trash2, Gift, Percent, Euro, PackageOpen, CheckCircle2, Pause } from "lucide-react";

const emptyTpl = {
  name: "",
  points_threshold: 100,
  kind: "percent",
  value: 10,
  product_id: "",
  expires_days: 30,
  active: true,
};

const KIND_LABEL = {
  percent: { label: "Remise %", icon: Percent, color: "from-fuchsia-500 to-pink-500" },
  amount: { label: "Remise €", icon: Euro, color: "from-amber-500 to-rose-500" },
  free_product: { label: "Produit offert", icon: PackageOpen, color: "from-emerald-500 to-teal-500" },
  custom: { label: "Personnalisé", icon: Gift, color: "from-violet-500 to-indigo-500" },
};

export default function LoyaltyPage() {
  const [tpls, setTpls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id?, ...tpl }
  const [form, setForm] = useState(emptyTpl);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/reward-templates");
      setTpls(data || []);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing({}); setForm(emptyTpl); };
  const openEdit = (t) => { setEditing(t); setForm({ ...emptyTpl, ...t }); };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      points_threshold: parseInt(form.points_threshold) || 0,
      kind: form.kind,
      value: parseFloat(form.value) || 0,
      product_id: form.product_id || null,
      expires_days: parseInt(form.expires_days) || 0,
      active: !!form.active,
    };
    if (!body.name) { toast.error("Nom requis"); return; }
    try {
      if (editing?.id) await api.put(`/admin/reward-templates/${editing.id}`, body);
      else await api.post("/admin/reward-templates", body);
      toast.success(editing?.id ? "Palier mis à jour" : "Palier créé");
      setEditing(null);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Supprimer définitivement le palier "${t.name}" ?\n\nLes récompenses déjà débloquées pour les clients ne sont pas touchées.`)) return;
    try { await api.delete(`/admin/reward-templates/${t.id}`); toast.success("Supprimé"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-fuchsia-300/80">
            <Sparkles className="w-3.5 h-3.5" /> Programme fidélité
          </div>
          <h1 className="font-display text-3xl font-black mt-1">Paliers de récompenses</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Chaque palier est débloqué automatiquement lorsqu'un client atteint le seuil de points lors d'une vente. Les récompenses apparaissent dans l'application client et sont proposées automatiquement en caisse à son prochain passage.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-new-reward">
          <Plus className="w-4 h-4 mr-1" /> Nouveau palier
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 text-center text-slate-400">Chargement…</Card>
      ) : tpls.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 mx-auto flex items-center justify-center mb-3">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <div className="font-display text-xl font-black">Aucun palier configuré</div>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Commence par créer un premier palier (ex. 100 pts → remise 10 %). Les clients le verront immédiatement dans leur app.
          </p>
          <Button onClick={openCreate} className="mt-4 bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-first-reward">
            Créer le premier palier
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tpls.map((t) => {
            const K = KIND_LABEL[t.kind] || KIND_LABEL.custom;
            return (
              <Card key={t.id} className="p-5 bg-slate-900/70 border-violet-500/20 relative overflow-hidden group" data-testid={`reward-card-${t.id}`}>
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${K.color} opacity-20 blur-2xl`} />
                <div className="flex items-center justify-between gap-2 mb-3 relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${K.color} flex items-center justify-center`}>
                    <K.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex gap-1">
                    {t.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 text-[10px] font-bold">
                        <Pause className="w-3 h-3" /> Désactivé
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-display text-lg font-black">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{K.label}</div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Seuil" value={`${t.points_threshold}`} unit="pts" />
                  <Stat label="Valeur" value={t.kind === "percent" ? `${t.value}%` : t.kind === "amount" ? `${t.value}€` : "—"} />
                  <Stat label="Expire" value={t.expires_days ? `${t.expires_days}j` : "∞"} />
                </div>

                <div className="flex gap-2 justify-end mt-4 relative">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)} data-testid={`btn-edit-reward-${t.id}`}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(t)} className="text-rose-300 border-rose-500/40 hover:bg-rose-500/10" data-testid={`btn-delete-reward-${t.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-slate-950 border-violet-500/30 max-w-xl">
          <DialogTitle className="font-display text-xl font-black">
            {editing?.id ? "Modifier le palier" : "Nouveau palier de récompense"}
          </DialogTitle>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 mt-2">
            <label className="col-span-2 block">
              <span className="text-xs uppercase tracking-widest text-slate-400">Nom affiché au client</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex. 10% sur ton prochain passage"
                className="input-dark mt-1"
                data-testid="rwd-name"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-slate-400">Seuil de points</span>
              <input
                type="number" min="0"
                value={form.points_threshold}
                onChange={(e) => setForm({ ...form, points_threshold: e.target.value })}
                className="input-dark mt-1"
                data-testid="rwd-threshold"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-slate-400">Type de récompense</span>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="input-dark mt-1"
                data-testid="rwd-kind"
              >
                <option value="percent">Remise en %</option>
                <option value="amount">Remise en €</option>
                <option value="free_product">Produit offert</option>
                <option value="custom">Personnalisé</option>
              </select>
            </label>
            {form.kind !== "free_product" && form.kind !== "custom" && (
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-slate-400">
                  Valeur {form.kind === "percent" ? "(%)" : "(€)"}
                </span>
                <input
                  type="number" step="0.01" min="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="input-dark mt-1"
                  data-testid="rwd-value"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-slate-400">Expiration (jours)</span>
              <input
                type="number" min="0"
                value={form.expires_days}
                onChange={(e) => setForm({ ...form, expires_days: e.target.value })}
                className="input-dark mt-1"
                data-testid="rwd-expires"
              />
              <span className="text-[10px] text-slate-500 block mt-1">0 = ne jamais expirer</span>
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                data-testid="rwd-active"
              />
              Actif — les nouveaux clients atteignant le seuil le débloqueront
            </label>

            <div className="col-span-2 flex gap-2 justify-end mt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-reward">
                {editing?.id ? "Enregistrer" : "Créer le palier"}
              </Button>
            </div>
            <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="rounded-xl p-2 bg-slate-950/60 border border-violet-500/15">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-display font-black text-lg text-pink-200">
        {value}{unit ? <span className="text-xs text-slate-400 ml-0.5">{unit}</span> : null}
      </div>
    </div>
  );
}
