import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Plus, QrCode, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

const empty = { first_name: "", last_name: "", email: "", phone: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState(null);
  const [showQR, setShowQR] = useState(null);

  const load = () => api.get("/customers", { params: q ? { q } : {} }).then((r) => setCustomers(r.data));
  useEffect(() => { load(); }, [q]);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/customers", form); toast.success("Client créé"); setCreating(false); setForm(empty); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const openDetail = async (c) => {
    const { data } = await api.get(`/customers/${c.id}`);
    setDetail(data);
  };

  return (
    <div className="space-y-4" data-testid="customers-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Clients</h1>
        <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-add-customer">
          <Plus className="w-4 h-4 mr-1" /> Nouveau client
        </Button>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="bg-slate-900/60 border-violet-500/20" data-testid="input-customers-search" />

      <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
        {customers.map((c) => (
          <div key={c.id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-violet-500/10 hover:bg-slate-950/40" data-testid={`row-customer-${c.id}`}>
            <div className="col-span-4">
              <div className="font-semibold">{c.first_name} {c.last_name}</div>
              <div className="text-xs text-slate-500">{c.email || c.phone || "—"}</div>
            </div>
            <div className="col-span-3 text-sm text-slate-300">{c.phone}</div>
            <div className="col-span-2 font-mono-num text-pink-300">{c.loyalty_points} pts</div>
            <div className="col-span-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowQR(c)} data-testid={`btn-qr-${c.id}`}><QrCode className="w-3.5 h-3.5 mr-1" /> QR</Button>
              <Button size="sm" variant="outline" onClick={() => openDetail(c)} data-testid={`btn-detail-${c.id}`}>Détail</Button>
            </div>
          </div>
        ))}
        {customers.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">Aucun client</div>}
      </Card>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">Nouveau client</DialogTitle>
          <form onSubmit={submit} className="space-y-2">
            <input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input-dark" data-testid="cf-firstname" />
            <input placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input-dark" data-testid="cf-lastname" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark" data-testid="cf-email" />
            <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-dark" data-testid="cf-phone" />
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-customer">Enregistrer</Button>
            <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="bg-slate-950 border-violet-500/30 max-w-2xl">
          <DialogTitle className="font-display text-xl font-black">
            {detail?.first_name} {detail?.last_name}
          </DialogTitle>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Points" value={detail.loyalty_points} />
                <Metric label="Ventes" value={detail.recent_sales?.length || 0} />
                <Metric label="Email" value={detail.email || "—"} small />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">Historique récent</div>
                <div className="max-h-60 overflow-auto scroll-thin space-y-1">
                  {(detail.recent_sales || []).map((s) => (
                    <div key={s.id} className="flex justify-between text-sm bg-slate-900/60 border border-violet-500/10 rounded p-2">
                      <span>{s.number}</span>
                      <span className="font-mono-num text-pink-300">{s.total.toFixed(2)} €</span>
                    </div>
                  ))}
                  {(detail.recent_sales || []).length === 0 && <div className="text-sm text-slate-500">Aucune vente</div>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showQR} onOpenChange={(o) => !o && setShowQR(null)}>
        <DialogContent className="bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Token QR
          </DialogTitle>
          {showQR && (
            <div className="space-y-3 text-center">
              <div className="text-sm text-slate-400">{showQR.first_name} {showQR.last_name}</div>
              <div className="p-6 bg-white rounded-xl inline-block">
                <img alt="qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(showQR.qr_token)}`} />
              </div>
              <div className="font-mono-num text-xs break-all text-slate-400 bg-slate-900 p-2 rounded" data-testid="qr-token-value">{showQR.qr_token}</div>
              <Button className="w-full" onClick={() => setShowQR(null)}>Fermer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, small }) {
  return (
    <div className="bg-slate-900/60 border border-violet-500/15 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`font-display font-black ${small ? "text-sm" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
