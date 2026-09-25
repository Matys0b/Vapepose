import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { QrCode, UserPlus, Search } from "lucide-react";

export default function CustomerLinkModal({ onClose, onSelect }) {
  const [tab, setTab] = useState("search"); // search|qr|create
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [qrToken, setQrToken] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      const { data } = await api.get("/customers", { params: q ? { q } : {} });
      if (!cancel) setResults(data);
    };
    run();
    return () => { cancel = true; };
  }, [q]);

  const submitQR = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.get(`/customers/qr/${qrToken.trim()}`);
      onSelect(data);
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/customers", form);
      toast.success("Client créé");
      onSelect(data);
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl bg-slate-950 border-violet-500/30">
        <DialogTitle className="font-display text-xl font-black">Associer un client</DialogTitle>
        <div className="flex gap-2">
          <TabBtn a={tab === "search"} onClick={() => setTab("search")} testid="tab-search"><Search className="w-4 h-4 mr-1" /> Rechercher</TabBtn>
          <TabBtn a={tab === "qr"} onClick={() => setTab("qr")} testid="tab-qr"><QrCode className="w-4 h-4 mr-1" /> QR Code</TabBtn>
          <TabBtn a={tab === "create"} onClick={() => setTab("create")} testid="tab-create"><UserPlus className="w-4 h-4 mr-1" /> Nouveau</TabBtn>
        </div>

        {tab === "search" && (
          <div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, téléphone…" className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3" data-testid="input-customer-search" />
            <div className="max-h-72 overflow-auto scroll-thin mt-2 space-y-1">
              {results.map((c) => (
                <button key={c.id} onClick={() => onSelect(c)} className="w-full text-left p-3 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-violet-500/10 flex items-center justify-between" data-testid={`customer-${c.id}`}>
                  <div>
                    <div className="font-semibold">{c.first_name} {c.last_name}</div>
                    <div className="text-xs text-slate-400">{c.email || c.phone || "—"}</div>
                  </div>
                  <div className="text-xs text-pink-300 font-mono-num">{c.loyalty_points} pts</div>
                </button>
              ))}
              {results.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">Aucun client</div>}
            </div>
          </div>
        )}

        {tab === "qr" && (
          <form onSubmit={submitQR} className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-slate-400">Token QR</label>
            <input value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="Scannez ou collez le token" className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num" data-testid="input-qr-token" autoFocus />
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-qr-submit">Associer</Button>
            <div className="text-xs text-slate-500">L'app mobile client affichera un QR code contenant ce token.</div>
          </form>
        )}

        {tab === "create" && (
          <form onSubmit={submitCreate} className="space-y-2">
            <input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3" data-testid="input-new-firstname" />
            <input placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3" data-testid="input-new-lastname" />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3" data-testid="input-new-email" />
            <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3" data-testid="input-new-phone" />
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-create-customer">Créer & associer</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({ a, onClick, children, testid }) {
  return (
    <button onClick={onClick} data-testid={testid} className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center border ${a ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white" : "bg-slate-900/60 border-violet-500/20 text-slate-300"}`}>
      {children}
    </button>
  );
}
